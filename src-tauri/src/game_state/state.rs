use std::collections::{BTreeMap, HashMap, HashSet};
use std::sync::OnceLock;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;

use super::balance::{balance_catalog_data, BalanceCatalogData};
use super::crew::{CrewData, PendingHire, STARTING_CREW};
use super::deals::{utc_day_index, DealData, DealsData, DAY_MS};
use super::modules::{module_anchor_at, ModuleData, COMMAND_MODULE_TYPE, PRODUCTION_TICK_MS};
use super::persistence::{normalize_player_name, PersistentPlayerV1, PersistentSystemV1};
use super::resources::ResourceCounts;
use super::world::{
    plan_outer_band_spawn, seed_asteroids, AsteroidData, MapWindow, MothershipData,
    VesselMoveEventData, SYSTEM_SEED,
};

#[derive(Serialize, serde::Deserialize, Clone, Debug)]
pub struct PlayerIdentity {
    pub id: String,
    pub name: String,
}

/// Maximum event-feed entries retained; the oldest are dropped past this,
/// keeping the snapshot bounded over a long session.
const MAX_NOTIFICATIONS: usize = 100;

/// One entry in the player's event feed (ROADMAP P1.5), created server-side
/// when something the player should hear about happens — a build or level-up
/// completing, a vessel arriving or returning. Rides the load_game_state
/// snapshot (so the feed and its unread state survive a reload) and is also
/// pushed live (`ServerPush::Notification`). Mirrors the TS
/// `NotificationData` in `src/state/game-state-types.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub enum NotificationPayload {
    ModuleCompleted {
        #[serde(rename = "moduleId", alias = "module_id")]
        module_id: String,
        #[serde(rename = "moduleType", alias = "module_type")]
        module_type: String,
        level: u32,
        operation: ModuleCompletionOperation,
    },
    CrewHired {
        crew: u32,
    },
    MiningStarted {
        vessel_id: String,
        asteroid_id: String,
        col: i64,
        row: i64,
    },
    AsteroidDepleted {
        asteroid_id: String,
        tier: String,
        resource: super::resources::ResourceKind,
        col: i64,
        row: i64,
    },
    VesselReturned {
        vessel_id: String,
        cargo: Option<NotificationCargo>,
    },
    MothershipWarped {
        mothership_id: String,
        from_col: i64,
        from_row: i64,
        to_col: i64,
        to_row: i64,
    },
    DealsRefreshed {
        day_index: u64,
    },
}

impl NotificationPayload {
    #[cfg(test)]
    pub(super) fn kind(&self) -> &'static str {
        match self {
            Self::ModuleCompleted { .. } => "module-completed",
            Self::CrewHired { .. } => "crew-hired",
            Self::MiningStarted { .. } => "mining-started",
            Self::AsteroidDepleted { .. } => "asteroid-depleted",
            Self::VesselReturned { .. } => "vessel-returned",
            Self::MothershipWarped { .. } => "mothership-warped",
            Self::DealsRefreshed { .. } => "deals-refreshed",
        }
    }
}

#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "kebab-case")]
pub enum ModuleCompletionOperation {
    Build,
    Levelup,
}

#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NotificationCargo {
    pub resource: super::resources::ResourceKind,
    pub accepted: u64,
    pub lost: u64,
}

#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NotificationData {
    pub notification_id: String,
    /// Immutable ID of the authorized action or scheduler transition this
    /// feed entry reports. Feed retention never controls idempotency.
    pub source_event_id: String,
    #[serde(flatten)]
    pub payload: NotificationPayload,
    /// Server epoch ms when the notification was created.
    pub created_at: u64,
    /// Cleared by the mark_notifications_read command; the Mail HUD badge
    /// shows the unread count.
    pub read: bool,
}

/// The Tauri event channel carrying `ServerPush` messages to the webview.
/// Mirrors SERVER_PUSH_EVENT in `src/state/game-state-types.ts` — keep the two in sync.
pub const SERVER_PUSH_EVENT: &str = "server-push";

/// An authoritative payload stamped at the state-lock boundary that produced
/// it. Revisions are global and monotonically increasing; clients use them per
/// state slice/entity so a late response cannot overwrite a newer push while
/// unrelated newer pushes do not suppress still-useful response data.
/// Mirrors `Revisioned<T>` in `src/state/game-state-types.ts`.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Revisioned<T> {
    pub revision: u64,
    pub data: T,
}

impl<T> Revisioned<T> {
    pub(super) fn new(revision: u64, data: T) -> Self {
        Self { revision, data }
    }
}

/// A server-initiated state push — the in-process stand-in for the phase-4
/// WebSocket event bus (SERVER.md § append + broadcast). Mutations queue
/// pushes into the ServerState outbox; whichever boundary ran the mutation —
/// the scheduler thread for time-based settlement, a command handler for
/// request-triggered settlement — drains the outbox and emits each entry as a
/// SERVER_PUSH_EVENT. The client routes every variant into the matching
/// `gameState` apply/sync entry point (`applyServerPush` in
/// `src/state/game-state.ts`) — the same entry points a phase-4 socket handler will
/// call. Mirrors the TS `ServerPush` union in `src/state/game-state-types.ts` — keep the
/// two in sync.
#[derive(Serialize, Clone, Debug)]
#[serde(tag = "type", content = "data", rename_all = "camelCase")]
pub enum ServerPush {
    /// Authoritative resource counts after production accrual or a spend.
    Resources(ResourceCounts),
    /// A module changed server-side (its build/level-up timer completed).
    Module(ModuleData),
    /// A vessel finished a return onto a dock tile and despawned.
    #[serde(rename_all = "camelCase")]
    VesselRemoved { vessel_id: String },
    /// A server-initiated vessel move — today the auto-return when mining
    /// completes; phase 4 adds other players' moves.
    Vessel(VesselMoveEventData),
    /// An asteroid changed server-side (mining started/stopped, deposit
    /// reduced by a harvest).
    Asteroid(AsteroidData),
    /// An asteroid was mined out and left the map.
    #[serde(rename_all = "camelCase")]
    AsteroidRemoved { asteroid_id: String },
    /// A new entry for the player's event feed.
    Notification(NotificationData),
    /// The crew state changed server-side (a recruitment completed).
    Crew(CrewData),
    /// The Trading Post deal shop changed server-side (the daily reset
    /// rolled new deals).
    Deals(DealsData),
}

/// Game state pushed to the client. Mirrors the TS `GameStateData` in
/// `src/state/game-state-types.ts` — keep the two in sync.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameStateData {
    /// Versioned balance/catalog data for client-side previews only. Rust
    /// remains the sole authority that applies these rules.
    pub balance: BalanceCatalogData,
    pub player: PlayerIdentity,
    pub resources: ResourceCounts,
    /// The interest-area window the world slices below were filtered to
    /// (ROADMAP P1.13) — re-centered on the player's mothership at load; the
    /// client re-centers it via request_map_window as the camera pans.
    pub map_window: MapWindow,
    /// Every mothership on the space map — placement is server-owned, so the
    /// client builds its map actors from this list (and picks up moved ships
    /// or newly joined players from later snapshots the same way).
    pub motherships: Vec<MothershipData>,
    /// Every vessel currently in flight or parked on the map, in dispatch
    /// order — the snapshot half of SERVER.md's snapshot + replay. The client
    /// reconciles these through `VesselSync.sync()`, so vessels dispatched
    /// before it connected (or while it was in another scene) land at their
    /// correct in-progress position.
    pub vessels: Vec<VesselMoveEventData>,
    /// Every asteroid still holding resources (ROADMAP P1.6) — placement and
    /// deposits are server-owned; MapLevel builds its asteroid actors from
    /// this list, and depleted asteroids simply leave it.
    pub asteroids: Vec<AsteroidData>,
    /// Every module in the ship, built or under construction, including the
    /// Command Module — placement and level are server-owned, so ShipLevel
    /// builds its actors from this list with no hardcoded layout.
    pub modules: Vec<ModuleData>,
    /// The player's event feed (ROADMAP P1.5), oldest first — restores the
    /// Mail badge unread count across reloads.
    pub notifications: Vec<NotificationData>,
    /// The ship's crew state (ROADMAP P1.10) — head count plus any
    /// recruitment in flight; capacity derives from the module list.
    pub crew: CrewData,
    /// The Trading Post deal shop (ROADMAP P1.12) — the current day's deal
    /// slots and refresh state; server-generated, so acceptance state and
    /// the daily cycle survive scene switches and reloads.
    pub deals: DealsData,
}

/// Space-map bounds — the single source `map.rs::generate_space_map` serves
/// to the client (geometry only since ROADMAP P1.9: no per-tile content at
/// this size, the scene renders a plain background).
pub(crate) const MAP_COLS: i64 = 1000;

pub(crate) const MAP_ROWS: i64 = 1000;

/// Map-scene tile size in world px — also served by
/// `map.rs::generate_space_map`.
pub(crate) const MAP_TILE_PX: f64 = 32.0;

/// The local player. Hardcoded until a login flow exists (phase 4).
pub(super) fn player_identity() -> PlayerIdentity {
    PlayerIdentity {
        id: "player-1".to_string(),
        name: "Player 1".to_string(),
    }
}

pub(crate) fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| u64::try_from(d.as_millis()).unwrap_or(u64::MAX))
        .unwrap_or(0)
}

/// Convert a duration into an absolute timestamp without wrapping. This is
/// the single path for authoritative timer construction: a valid timestamp
/// near `u64::MAX` (including one restored from a future save) clamps at the
/// largest representable epoch instead of becoming an already-due deadline.
pub(crate) fn deadline_after(start_ms: u64, duration_ms: u64) -> u64 {
    start_ms.saturating_add(duration_ms)
}

static TIME_SCALE: OnceLock<f64> = OnceLock::new();

pub(crate) fn configure_time_scale(scale: f64) -> Result<(), String> {
    TIME_SCALE
        .set(scale)
        .map_err(|_| "time scale was configured more than once".to_string())
}

/// Dev-speed multiplier (ROADMAP P0.13), configured once from the startup
/// `--time-scale` argument. The normal `deno task tauri dev` passes 1.0;
/// `deno task dev:fast` passes 5 so build/hire/mine timers and the production
/// tick complete N* faster for core-loop playtests. The environment read below
/// remains a fallback only if an embedding path reads this before startup
/// configuration.
pub(crate) fn time_scale() -> f64 {
    *TIME_SCALE.get_or_init(|| {
        std::env::var("VOIDBOUND_TIME_SCALE")
            .ok()
            .and_then(|v| v.parse::<f64>().ok())
            .filter(|v| *v > 0.0)
            .unwrap_or(1.0)
    })
}

/// Scale a gameplay duration (ms) down by the dev-speed multiplier — apply at
/// every point a duration becomes a deadline or tick interval (build/hire
/// completion, production tick, mining duration, vessel travel time). A
/// no-op at the default scale of 1.0.
pub(crate) fn scaled_ms(ms: u64) -> u64 {
    ((ms as f64 / time_scale()).round() as u64).max(1)
}

/// Inverse of `scaled_ms`: scale an elapsed real duration (ms) back up to the
/// equivalent un-scaled duration — needed wherever a rate (units per ms) is
/// applied to real elapsed time instead of to a precomputed deadline, so the
/// two stay consistent (e.g. `mined_amount`'s proportional early-harvest math
/// against `mine_duration_ms`'s scaled completion deadline).
pub(crate) fn unscaled_ms(ms: u64) -> u64 {
    ((ms as f64) * time_scale()).round() as u64
}

/// Tiny deterministic PRNG (xorshift64) for world seeding — the starter
/// field must be reproducible run-to-run until persistence (P2) stores the
/// world, and a rand dependency isn't worth it for this.
pub(super) struct SeedRng(pub(super) u64);

impl SeedRng {
    pub(super) fn next(&mut self) -> u64 {
        let mut x = self.0;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.0 = x;
        x
    }

    /// Roughly uniform value in [lo, hi] (inclusive). Fine for seeding.
    pub(super) fn range(&mut self, lo: u64, hi: u64) -> u64 {
        lo + self.next() % (hi - lo + 1)
    }
}

/// One queued push plus the world footprint it concerns, if any. The drain
/// boundary filters entity pushes against the client's interest area
/// (ROADMAP P1.13); footprint-less pushes — global state (resources,
/// notifications) and the player's own entities (modules, own vessels) —
/// always go out.
pub(super) struct OutboxEntry {
    footprint: Option<(i64, i64, i64)>,
    push: ServerPush,
}

/// Authoritative per-player state, held in memory for the app's lifetime.
/// Phase 2 serializes it to a save file; the phase-4 server owns it remotely.
pub struct ServerState {
    /// The immutable launch-time session identity. It is runtime context, not
    /// a field in the persistent system snapshot.
    pub(super) player: PlayerIdentity,
    pub(super) system_id: String,
    pub(super) system_seed: u64,
    /// Durable profiles other than the launch-selected player. They are not
    /// projected to this client, but remain part of the one local system.
    pub(super) parked_players: BTreeMap<String, PersistentPlayerV1>,
    /// Global authoritative ordering token. It advances once per command
    /// boundary and once per scheduler batch that emits pushes.
    pub(super) revision: u64,
    pub(super) resources: ResourceCounts,
    /// Epoch ms of the last applied production-interval boundary. Production
    /// accrues lazily in whole intervals whenever state is read or mutated,
    /// so no background timer thread is needed.
    pub(super) last_production_at: u64,
    /// Every module in the ship, built or under construction, keyed by module
    /// id — the single source of truth for the ship's catalog state (the
    /// client renders the snapshot, Command Module included).
    pub(super) modules: HashMap<String, ModuleData>,
    /// Monotonic sequence mixed into module ids for uniqueness.
    pub(super) next_module_seq: u64,
    /// Every mothership on the map, keyed by mothership id — the single
    /// source of truth for placement (the client renders the snapshot).
    pub(super) motherships: HashMap<String, MothershipData>,
    /// Every vessel in flight or parked, keyed by vessel id, each holding its
    /// latest authorized move. Time-based state is implicit in the event
    /// timestamps, so nothing ticks: vessels that finish a return onto a dock
    /// tile are pruned lazily on read/mutation (like production accrual).
    pub(super) vessels: HashMap<String, VesselMoveEventData>,
    /// Monotonic sequence mixed into vessel ids for uniqueness.
    pub(super) next_vessel_seq: u64,
    /// Every asteroid still holding resources, keyed by asteroid id — the
    /// single source of truth for the field (the client renders the
    /// snapshot). Mined-out asteroids are removed outright.
    pub(super) asteroids: HashMap<String, AsteroidData>,
    /// A monotonic source for every authorized action and scheduler-created
    /// transition. P2.1 persists this counter with the durable player state.
    pub(super) next_event_seq: u64,
    /// Ship's crew head count (ROADMAP P1.10). Capacity derives from the
    /// module table (crew_capacity). P2.8 assigns those heads explicitly to
    /// crew-demanding modules before production accrues.
    pub(super) crew: u32,
    /// Assigned heads by module id. Missing entries mean zero assigned; the
    /// persistent profile validates that every stored entry names a current
    /// crew-demanding module and that the total never exceeds `crew`.
    pub(super) crew_assignments: HashMap<String, u32>,
    /// The one crew recruitment in flight, if any — same timer shape as a
    /// module's pending build, settled by settle_hire.
    pub(super) pending_hire: Option<PendingHire>,
    /// The player's event feed (ROADMAP P1.5), oldest first, capped at
    /// MAX_NOTIFICATIONS. Server-owned like everything else: it rides the
    /// snapshot, so a reload restores the feed and its unread state.
    pub(super) notifications: Vec<NotificationData>,
    /// Monotonic sequence mixed into notification ids for uniqueness.
    pub(super) next_notification_seq: u64,
    /// The Trading Post deal shop (ROADMAP P1.12): the current day's deal
    /// slots. Regenerated at every UTC-day boundary (settle_deals) and by
    /// refreshes; deterministic per (player, day, slot, generation).
    pub(super) deals: Vec<DealData>,
    /// UTC day index the current deal batch belongs to — settle_deals rolls
    /// the shop over when a later day starts.
    pub(super) deals_day_index: u64,
    /// Refreshes used since the daily reset — indexes the doubling cost
    /// table, hard-capped at its length.
    pub(super) deal_refreshes_used: u32,
    /// The client's interest-area window (ROADMAP P1.13) — snapshot slices
    /// and entity pushes are filtered against it, own entities exempt.
    /// Single-client today; the phase-4 server keeps one per connection.
    pub(super) aoi: MapWindow,
    /// Pushes queued by mutations since the last drain. Mutations queue,
    /// boundaries (scheduler wake / command return) drain and emit — so every
    /// settlement path broadcasts identically, whoever triggered it.
    pub(super) outbox: Vec<OutboxEntry>,
    /// True when resource counts changed since the last drain; drain_pushes
    /// appends one Resources push carrying the final counts, so several
    /// accruals/spends inside one mutation collapse into a single push.
    pub(super) resources_dirty: bool,
    /// Sub-unit production carried between accruals, in "units * ticks"
    /// numerator space (see `accrue_production_until`), keyed by normalized
    /// player name. Per profile because `for_each_profile` swaps the active
    /// profile mid-settlement — carry earned under one player must never land
    /// in another's counts. Runtime-only and deliberately not persisted: it is
    /// worth strictly less than one unit per resource, so a restart that drops
    /// it costs the player nothing measurable, and keeping it out of the save
    /// avoids a schema change for a rounding detail.
    pub(super) production_carry: HashMap<String, ResourceCounts>,
}

/// FNV-1a over a normalized player name — the per-player half of every
/// deterministic plan derived for that profile (spawn placement today). Kept
/// in one place so a created profile and the system's first player are
/// seeded by the same rule.
fn player_seed_hash(name: &str) -> u64 {
    let mut hash = 0xcbf2_9ce4_8422_2325u64;
    for byte in normalize_player_name(name).bytes() {
        hash ^= u64::from(byte);
        hash = hash.wrapping_mul(0x100_0000_01b3);
    }
    hash
}

impl ServerState {
    pub fn new(now_ms: u64) -> Self {
        let player = player_identity();
        // The Command Module pre-exists, centered on the map at (18, 18) —
        // one entry in `modules` like everything else (ROADMAP P1.4), just
        // pre-built at level 1 instead of player-constructed.
        let (command_col, command_row) = module_anchor_at(18, 18).expect("command module room");
        let mut modules = HashMap::new();
        modules.insert(
            "module-command".to_string(),
            ModuleData {
                module_id: "module-command".to_string(),
                owner_id: player.id.clone(),
                owner_name: player.name.clone(),
                module_type: COMMAND_MODULE_TYPE.to_string(),
                col: command_col,
                row: command_row,
                level: 1,
                pending: None,
            },
        );
        // A new local system starts with its selected developer player's
        // mothership. Other ships are real local profiles created at a later
        // launch, never a display-only placeholder enemy. Its spawn is
        // planned exactly like a later profile's — deterministically, in the
        // outer resource band — so the very first player is not the one
        // account that starts somewhere the rules would never place anyone.
        let mut spawn_rng = SeedRng(SYSTEM_SEED ^ player_seed_hash(&player.name));
        let (spawn_col, spawn_row) = plan_outer_band_spawn(&mut spawn_rng, 4, |_, _| true)
            .expect("outer-band spawn exists in an empty system");
        let motherships = HashMap::from([(
            player.id.clone(),
            MothershipData {
                mothership_id: player.id.clone(),
                owner_id: player.id.clone(),
                owner_name: player.name.clone(),
                ship_type: "mothership-1".to_string(),
                damaged: false,
                col: spawn_col,
                row: spawn_row,
                span: 4,
            },
        )]);
        // A fresh local system receives its deterministic balanced field.
        let asteroids = seed_asteroids(&motherships);
        let mut state = Self {
            player: player.clone(),
            system_id: "local-system-1".to_string(),
            system_seed: SYSTEM_SEED,
            parked_players: BTreeMap::new(),
            revision: 0,
            resources: ResourceCounts {
                construction: 100,
                high_tech: 100,
                biological: 100,
                fuel: 100,
                credits: 0,
            },
            last_production_at: now_ms,
            modules,
            next_module_seq: 0,
            motherships,
            vessels: HashMap::new(),
            next_vessel_seq: 0,
            asteroids,
            next_event_seq: 0,
            crew: STARTING_CREW,
            crew_assignments: HashMap::new(),
            pending_hire: None,
            notifications: Vec::new(),
            next_notification_seq: 0,
            deals: Vec::new(),
            deals_day_index: utc_day_index(now_ms),
            deal_refreshes_used: 0,
            aoi: MapWindow::centered_at(spawn_col + 2, spawn_row + 2),
            outbox: Vec::new(),
            resources_dirty: false,
            production_carry: HashMap::new(),
        };
        // The interest area starts centered on the player's mothership —
        // matching the camera's home position (ROADMAP P1.13).
        state.recenter_aoi_on_player();
        // Today's deal batch, freebie included (ROADMAP P1.12) — generated
        // whether or not a Trading Post exists yet, so the shop is stocked
        // the moment one settles; deterministic like the asteroid field.
        state.regenerate_deals(state.deals_day_index, 0, true);
        debug_assert!(state.validate_timestamps().is_ok());
        state
    }

    pub(super) fn from_persistent(
        mut system: PersistentSystemV1,
        selected_name: &str,
    ) -> Result<Self, String> {
        system.validate()?;
        let key = normalize_player_name(selected_name);
        let player = system
            .players
            .remove(&key)
            .ok_or_else(|| format!("no saved profile for {selected_name:?}"))?;
        let state = Self {
            player: player.identity,
            system_id: system.system_id,
            system_seed: system.system_seed,
            parked_players: system.players,
            revision: system.state_revision,
            resources: player.resources,
            last_production_at: player.last_production_at,
            modules: player.modules.into_iter().collect(),
            next_module_seq: player.next_module_seq,
            motherships: system.world.motherships.into_iter().collect(),
            vessels: system.world.vessels.into_iter().collect(),
            next_vessel_seq: player.next_vessel_seq,
            asteroids: system.world.asteroids.into_iter().collect(),
            next_event_seq: player.next_event_seq,
            crew: player.crew,
            crew_assignments: player.crew_assignments.into_iter().collect(),
            pending_hire: player.pending_hire,
            notifications: player.notifications,
            next_notification_seq: player.next_notification_seq,
            deals: player.deals,
            deals_day_index: player.deals_day_index,
            deal_refreshes_used: player.deal_refreshes_used,
            aoi: MapWindow::centered_at(MAP_COLS / 2, MAP_ROWS / 2),
            outbox: Vec::new(),
            resources_dirty: false,
            production_carry: HashMap::new(),
        };
        state.validate_timestamps()?;
        Ok(state)
    }

    pub(super) fn persistent_system(&self) -> PersistentSystemV1 {
        let mut system = PersistentSystemV1::from_state(self);
        system.system_id = self.system_id.clone();
        system.system_seed = self.system_seed;
        system.players.extend(self.parked_players.clone());
        system
    }

    /// Run a player-local operation over every durable profile, in stable
    /// name order. World tables remain shared; world helpers filter to the
    /// active profile's owner before applying player-owned effects.
    fn for_each_profile(&mut self, mut operation: impl FnMut(&mut Self)) {
        operation(self);
        let selected_profile = PersistentPlayerV1::from_state(self);
        let keys: Vec<String> = self.parked_players.keys().cloned().collect();
        for key in keys {
            let Some(profile) = self.parked_players.remove(&key) else {
                continue;
            };
            self.load_active_profile(profile);
            operation(self);
            let settled = PersistentPlayerV1::from_state(self);
            self.parked_players.insert(key, settled);
        }
        self.load_active_profile(selected_profile);
    }

    pub(super) fn create_player_profile(
        &mut self,
        display_name: String,
        now_ms: u64,
    ) -> Result<(), String> {
        let normalized = normalize_player_name(&display_name);
        if normalized.is_empty() {
            return Err("--player must not be empty".to_string());
        }
        if self.parked_players.contains_key(&normalized)
            || normalize_player_name(&self.player.name) == normalized
        {
            return Err(format!("player {display_name:?} already exists"));
        }

        let current = PersistentPlayerV1::from_state(self);
        self.parked_players
            .insert(normalize_player_name(&self.player.name), current);

        let (identity, profile) = Self::fresh_player_profile(display_name, now_ms);
        let (col, row) = self.place_mothership(&identity)?;
        self.load_active_profile(profile);
        self.aoi = MapWindow::centered_at(col + 2, row + 2);
        Ok(())
    }

    /// Discard the selected profile and every world entity it owns, then
    /// recreate that same identity in the unchanged shared system. This is a
    /// startup-only developer operation (P2.10), not a gameplay action.
    pub(super) fn reset_active_player_profile(&mut self, now_ms: u64) -> Result<(), String> {
        let identity = self.player.clone();
        let removed_vessels: HashSet<String> = self
            .vessels
            .values()
            .filter(|vessel| vessel.owner_id == identity.id)
            .map(|vessel| vessel.vessel_id.clone())
            .collect();
        self.motherships.remove(&identity.id);
        self.vessels
            .retain(|_, vessel| vessel.owner_id != identity.id);
        for asteroid in self.asteroids.values_mut() {
            if asteroid
                .mining
                .as_ref()
                .is_some_and(|mining| removed_vessels.contains(&mining.vessel_id))
            {
                asteroid.mining = None;
            }
        }

        let (fresh_identity, profile) = Self::fresh_player_profile(identity.name.clone(), now_ms);
        let (col, row) = self.place_mothership(&fresh_identity)?;
        self.load_active_profile(profile);
        self.aoi = MapWindow::centered_at(col + 2, row + 2);
        Ok(())
    }

    fn fresh_player_profile(
        display_name: String,
        now_ms: u64,
    ) -> (PlayerIdentity, PersistentPlayerV1) {
        let normalized = normalize_player_name(&display_name);
        let identity_hash = player_seed_hash(&normalized);
        let identity = PlayerIdentity {
            id: format!("player-{identity_hash:016x}"),
            name: display_name,
        };
        let mut template = Self::new(now_ms);
        template.player = identity.clone();
        for module in template.modules.values_mut() {
            module.owner_id = identity.id.clone();
            module.owner_name = identity.name.clone();
        }
        template.regenerate_deals(template.deals_day_index, 0, true);
        let profile = PersistentPlayerV1::from_state(&template);
        (identity, profile)
    }

    fn place_mothership(&mut self, identity: &PlayerIdentity) -> Result<(i64, i64), String> {
        let identity_hash = player_seed_hash(&normalize_player_name(&identity.name));
        let mut rng = SeedRng(self.system_seed ^ identity_hash);
        let spawn = plan_outer_band_spawn(&mut rng, 4, |col, row| {
            self.motherships
                .values()
                .all(|ship| footprints_separated((col, row, 4), (ship.col, ship.row, ship.span), 1))
                && self.asteroids.values().all(|asteroid| {
                    footprints_separated(
                        (col, row, 4),
                        (asteroid.col, asteroid.row, asteroid.span),
                        1,
                    )
                })
        });
        let Some((col, row)) = spawn else {
            return Err("no clear deterministic mothership spawn remains".to_string());
        };
        self.motherships.insert(
            identity.id.clone(),
            MothershipData {
                mothership_id: identity.id.clone(),
                owner_id: identity.id.clone(),
                owner_name: identity.name.clone(),
                ship_type: "mothership-1".to_string(),
                damaged: false,
                col,
                row,
                span: 4,
            },
        );
        Ok((col, row))
    }

    fn load_active_profile(&mut self, profile: PersistentPlayerV1) {
        self.player = profile.identity;
        self.resources = profile.resources;
        self.last_production_at = profile.last_production_at;
        self.modules = profile.modules.into_iter().collect();
        self.next_module_seq = profile.next_module_seq;
        self.next_vessel_seq = profile.next_vessel_seq;
        self.next_event_seq = profile.next_event_seq;
        self.crew = profile.crew;
        self.crew_assignments = profile.crew_assignments.into_iter().collect();
        self.pending_hire = profile.pending_hire;
        self.notifications = profile.notifications;
        self.next_notification_seq = profile.next_notification_seq;
        self.deals = profile.deals;
        self.deals_day_index = profile.deals_day_index;
        self.deal_refreshes_used = profile.deal_refreshes_used;
    }

    /// Reject timer pairs that could only come from a corrupt/unsupported
    /// persisted snapshot. Past deadlines are valid — offline catch-up must
    /// settle them — and saturated timers may have equal endpoints at
    /// `u64::MAX`; only a deadline earlier than its start is invalid. P2.1's
    /// load path must call this before accepting a deserialized state.
    pub(crate) fn validate_timestamps(&self) -> Result<(), String> {
        if let Some(pending) = &self.pending_hire {
            validate_timestamp_pair(
                "pending crew hire",
                pending.dispatched_at,
                pending.completes_at,
            )?;
        }
        for module in self.modules.values() {
            if let Some(pending) = &module.pending {
                validate_timestamp_pair(
                    &format!("module {:?}", module.module_id),
                    pending.dispatched_at,
                    pending.completes_at,
                )?;
            }
        }
        for vessel in self.vessels.values() {
            validate_timestamp_pair(
                &format!("vessel {:?}", vessel.vessel_id),
                vessel.dispatched_at,
                vessel.arrival_at,
            )?;
        }
        for asteroid in self.asteroids.values() {
            if let Some(mining) = &asteroid.mining {
                validate_timestamp_pair(
                    &format!("asteroid {:?} mining job", asteroid.asteroid_id),
                    mining.started_at,
                    mining.completes_at,
                )?;
            }
        }
        Ok(())
    }

    /// Center the interest area on the player's mothership — the camera's
    /// home position after a (re)load. No-op if the ship somehow doesn't
    /// exist; the window just stays where it was.
    fn recenter_aoi_on_player(&mut self) {
        if let Ok(ship) = self.player_mothership() {
            let (center_col, center_row) = (ship.col + ship.span / 2, ship.row + ship.span / 2);
            self.aoi = MapWindow::centered_at(center_col, center_row);
        }
    }

    /// Queue a push that always reaches the client — global state (resources,
    /// notifications) or the player's own entities (modules, own vessels),
    /// which are exempt from interest-area filtering (ROADMAP P1.13).
    pub(super) fn queue_push(&mut self, push: ServerPush) {
        self.outbox.push(OutboxEntry {
            footprint: None,
            push,
        });
    }

    /// Queue a push about a world entity at the given (col, row, span)
    /// footprint — dropped at drain time when the footprint lies outside the
    /// client's interest area (ROADMAP P1.13).
    pub(super) fn queue_entity_push(&mut self, footprint: (i64, i64, i64), push: ServerPush) {
        self.outbox.push(OutboxEntry {
            footprint: Some(footprint),
            push,
        });
    }

    /// Allocate an immutable, system-wide action/event ID. The sequence is
    /// durable per player, so the owner prefix is required to keep IDs unique
    /// across the local multi-account system and to make P2.5 tie-breaking
    /// unambiguous.
    pub(super) fn next_event_id(&mut self) -> String {
        self.next_event_seq = self.next_event_seq.saturating_add(1);
        format!("{}:event-{}", self.player.id, self.next_event_seq)
    }

    /// Append a notification to the feed (dropping the oldest past the cap)
    /// and queue its live push.
    pub(super) fn push_notification(
        &mut self,
        source_event_id: String,
        payload: NotificationPayload,
        now_ms: u64,
    ) {
        self.next_notification_seq += 1;
        let notification = NotificationData {
            notification_id: format!("notif-{}-{}", now_ms, self.next_notification_seq),
            source_event_id,
            payload,
            created_at: now_ms,
            read: false,
        };
        self.notifications.push(notification.clone());
        if self.notifications.len() > MAX_NOTIFICATIONS {
            let excess = self.notifications.len() - MAX_NOTIFICATIONS;
            self.notifications.drain(..excess);
        }
        // Notifications are global — never interest-area filtered.
        self.queue_push(ServerPush::Notification(notification));
    }

    /// Deterministically advance the complete local system through `now_ms`.
    /// Production is accrued once for each interval between meaningful state
    /// transitions; replaying every 5-second live cadence during a day-long
    /// startup recovery would do identical work thousands of times.
    pub(super) fn advance_to(&mut self, now_ms: u64) {
        loop {
            let mut next = u64::MAX;
            self.for_each_profile(|state| {
                next = next.min(state.next_transition_deadline());
            });
            // `u64::MAX` is both the sentinel for "no transition" and the
            // saturated form of a real deadline. It can therefore be due when
            // `now_ms` is also MAX. Advance once to settle that terminal work,
            // then stop instead of selecting the same non-progressing deadline
            // forever.
            if next == u64::MAX || next > now_ms {
                self.advance_at(now_ms);
                break;
            }
            self.advance_at(next);
        }
    }

    fn advance_at(&mut self, at_ms: u64) {
        // The documented P2.5 causal order. Player-local passes are stable
        // because profiles live in a BTreeMap; entity helpers sort their IDs.
        self.for_each_profile(|state| state.accrue_production_until(at_ms));
        self.for_each_profile(|state| state.settle_modules(at_ms));
        self.for_each_profile(|state| state.settle_hire(at_ms));
        self.for_each_profile(|state| state.settle_vessel_arrivals_kind(at_ms, false));
        self.for_each_profile(|state| state.settle_mining(at_ms));
        self.for_each_profile(|state| state.settle_vessel_arrivals_kind(at_ms, true));
        self.for_each_profile(|state| state.settle_deals(at_ms));
    }

    /// Startup-only recovery. The saved envelope timestamp controls the cap,
    /// not any individual timer cursor, so restarting repeatedly cannot turn
    /// a long absence into repeated 24-hour grants.
    pub(super) fn recover_to(&mut self, saved_at: u64, now_ms: u64) {
        const OFFLINE_CAP_MS: u64 = 24 * 60 * 60 * 1000;
        let capped_at = saved_at.saturating_add(OFFLINE_CAP_MS).min(now_ms);
        self.advance_to(capped_at);
        if now_ms <= capped_at {
            return;
        }
        let skipped = now_ms - capped_at;
        eprintln!("offline recovery capped at 24 hours; re-anchoring {skipped} ms");
        self.for_each_profile(|state| {
            state.last_production_at = now_ms;
            if let Some(pending) = &mut state.pending_hire {
                pending.dispatched_at = pending.dispatched_at.saturating_add(skipped);
                pending.completes_at = pending.completes_at.saturating_add(skipped);
            }
            for module in state.modules.values_mut() {
                if let Some(pending) = &mut module.pending {
                    pending.dispatched_at = pending.dispatched_at.saturating_add(skipped);
                    pending.completes_at = pending.completes_at.saturating_add(skipped);
                }
            }
            state.deals_day_index = utc_day_index(now_ms);
            state.deal_refreshes_used = 0;
            state.regenerate_deals(state.deals_day_index, 0, true);
        });
        for vessel in self.vessels.values_mut() {
            if !vessel.arrival_settled {
                vessel.dispatched_at = vessel.dispatched_at.saturating_add(skipped);
                vessel.arrival_at = vessel.arrival_at.saturating_add(skipped);
            }
        }
        for asteroid in self.asteroids.values_mut() {
            if let Some(mining) = &mut asteroid.mining {
                mining.started_at = mining.started_at.saturating_add(skipped);
                mining.completes_at = mining.completes_at.saturating_add(skipped);
            }
        }
    }

    /// Compatibility name for command paths and older tests. Both live and
    /// recovery settlement now share the deterministic timeline driver.
    pub(super) fn settle(&mut self, now_ms: u64) {
        self.advance_to(now_ms);
    }

    /// Build the load_game_state snapshot: settle everything due first, then
    /// read every field off the fully-settled state. `settle` up front means
    /// `resources` (and every other field) reflects the same settled instant
    /// regardless of struct-literal field order — settling lazily via the
    /// individual `*_snapshot` calls below made `resources` a stale read
    /// whenever a later field (e.g. a docking vessel's cargo deposit) settled
    /// something that touched it.
    pub(super) fn snapshot(&mut self, now_ms: u64) -> GameStateData {
        self.settle(now_ms);
        // The camera homes on the player's mothership after a (re)load, so
        // the interest area does too (ROADMAP P1.13) — the world slices
        // below are filtered to it.
        self.recenter_aoi_on_player();
        GameStateData {
            balance: balance_catalog_data(),
            player: self.player.clone(),
            resources: self.resources,
            map_window: self.aoi,
            motherships: self.motherships_snapshot(),
            asteroids: self.asteroids_snapshot(now_ms),
            vessels: self.active_vessels(now_ms),
            modules: self.modules_snapshot(now_ms),
            deals: self.deals_snapshot(now_ms),
            notifications: self.notifications.clone(),
            crew: self.crew_data(),
        }
    }

    /// Epoch ms of the next moment something comes due: the next production
    /// tick, a pending crew recruitment, the earliest pending build/upgrade
    /// completion, the earliest mining completion, or the earliest
    /// un-notified vessel arrival. The
    /// scheduler sleeps until this — never more than one production tick —
    /// or until a command wakes it early because it created a nearer
    /// deadline.
    pub(super) fn next_deadline(&self) -> u64 {
        let deadline = deadline_after(self.last_production_at, scaled_ms(PRODUCTION_TICK_MS));
        deadline.min(self.next_transition_deadline())
    }

    /// The next state transition other than production. This is deliberately
    /// separate from `next_deadline`: the live scheduler still wakes at the
    /// production cadence, while catch-up accrues an entire unchanged interval
    /// in one mathematically equivalent pass.
    fn next_transition_deadline(&self) -> u64 {
        let mut deadline = u64::MAX;
        if let Some(pending) = &self.pending_hire {
            deadline = deadline.min(pending.completes_at);
        }
        for module in self.modules.values() {
            if let Some(pending) = &module.pending {
                deadline = deadline.min(pending.completes_at);
            }
        }
        for vessel in self.vessels.values() {
            if !vessel.arrival_settled {
                deadline = deadline.min(vessel.arrival_at);
            }
        }
        for asteroid in self.asteroids.values() {
            if let Some(mining) = &asteroid.mining {
                deadline = deadline.min(mining.completes_at);
            }
        }
        // The daily deal reset (ROADMAP P1.12). Redundant while the
        // production tick wakes the scheduler every few seconds anyway, but
        // correct by construction if that cadence ever changes.
        deadline.min(
            self.deals_day_index
                .saturating_add(1)
                .saturating_mul(DAY_MS),
        )
    }

    /// Hand off every queued push for emission — dropping entity pushes
    /// whose footprint lies outside the client's interest area (ROADMAP
    /// P1.13; own-entity and global pushes carry no footprint and always go
    /// out) — appending one Resources push when counts changed since the
    /// last drain. Called at the boundaries — scheduler wake and command
    /// return — so the mutations themselves stay transport-free (and
    /// unit-testable).
    pub(super) fn drain_pushes(&mut self) -> Vec<ServerPush> {
        let aoi = self.aoi;
        let mut pushes: Vec<ServerPush> = std::mem::take(&mut self.outbox)
            .into_iter()
            .filter(|e| {
                e.footprint
                    .is_none_or(|(col, row, span)| aoi.intersects(col, row, span))
            })
            .map(|e| e.push)
            .collect();
        if self.resources_dirty {
            self.resources_dirty = false;
            pushes.push(ServerPush::Resources(self.resources));
        }
        pushes
    }

    /// Advance the global authoritative ordering token. Saturation is
    /// deliberate: reaching u64::MAX would require centuries at absurd event
    /// rates, and holding at MAX remains safer than wrapping stale data to 0.
    pub(super) fn advance_revision(&mut self) -> u64 {
        self.revision = self.revision.saturating_add(1);
        self.revision
    }

    /// Drain and stamp every push in one boundary with the same revision, so
    /// related resource/entity updates remain one authoritative batch.
    pub(super) fn drain_revisioned_pushes(&mut self, revision: u64) -> Vec<Revisioned<ServerPush>> {
        self.drain_pushes()
            .into_iter()
            .map(|push| Revisioned::new(revision, push))
            .collect()
    }

    /// Mark the whole feed read (the player opened the Mail panel) and
    /// return the updated list.
    pub(super) fn mark_notifications_read(&mut self) -> Vec<NotificationData> {
        for notification in &mut self.notifications {
            notification.read = true;
        }
        self.notifications.clone()
    }
}

fn validate_timestamp_pair(label: &str, start_ms: u64, deadline_ms: u64) -> Result<(), String> {
    if deadline_ms < start_ms {
        return Err(format!(
            "invalid {label} timestamps: deadline {deadline_ms} precedes start {start_ms}"
        ));
    }
    Ok(())
}

pub(super) fn footprints_separated(
    (a_col, a_row, a_span): (i64, i64, i64),
    (b_col, b_row, b_span): (i64, i64, i64),
    gap: i64,
) -> bool {
    a_col + a_span + gap <= b_col
        || b_col + b_span + gap <= a_col
        || a_row + a_span + gap <= b_row
        || b_row + b_span + gap <= a_row
}

#[cfg(test)]
mod tests {
    use super::super::resources::ResourceKind;
    use super::super::test_support::*;
    use super::super::world::{AsteroidMining, AOI_SPAN, HOUR_MS};
    use super::*;

    /// Paired with tests/cross_language_contract_test.ts. AOI span and feed
    /// retention affect client reconciliation, so their shared bounds stay
    /// visible even though neither needs a dedicated gameplay wire field.
    #[test]
    fn cross_language_state_contract_matches_the_shared_fixture() {
        let contracts: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/cross-language-contracts.json"
        ))
        .expect("read cross-language contract fixture");
        assert_eq!(AOI_SPAN, contracts["aoi"]["span"].as_i64().unwrap());
        assert_eq!(
            MAX_NOTIFICATIONS,
            contracts["maxNotifications"].as_u64().unwrap() as usize
        );
    }

    #[test]
    fn module_notifications_use_camel_case_and_read_legacy_fields() {
        let payload = NotificationPayload::ModuleCompleted {
            module_id: "module-refinery".to_string(),
            module_type: "ore-refinery".to_string(),
            level: 1,
            operation: ModuleCompletionOperation::Build,
        };
        let wire = serde_json::to_value(&payload).expect("serialize notification");
        assert_eq!(wire["moduleId"], "module-refinery");
        assert_eq!(wire["moduleType"], "ore-refinery");
        assert!(wire.get("module_id").is_none());
        assert!(wire.get("module_type").is_none());

        let legacy: NotificationPayload = serde_json::from_value(serde_json::json!({
            "kind": "module-completed",
            "module_id": "module-refinery",
            "module_type": "ore-refinery",
            "level": 1,
            "operation": "build",
        }))
        .expect("read pre-fix notification");
        assert!(matches!(
            legacy,
            NotificationPayload::ModuleCompleted { .. }
        ));
    }

    #[test]
    fn snapshots_are_windowed_to_the_interest_area() {
        let mut s = ServerState::new(0);
        // The AOI starts centered on the player's mothership, wherever the
        // outer-band spawn planner put it.
        let ship = s.player_mothership().expect("player mothership");
        let (ship_col, ship_row) = (ship.col, ship.row);
        let aoi = s.aoi;
        assert_eq!(
            (aoi.center_col, aoi.center_row, aoi.span),
            (ship_col + 2, ship_row + 2, AOI_SPAN)
        );
        // The selected profile's ship is inside the home window.
        assert_eq!(s.motherships_snapshot().len(), 1);
        // A far-away foreign ship drops from the slice...
        s.motherships.insert(
            "player-2".to_string(),
            MothershipData {
                mothership_id: "player-2".to_string(),
                owner_id: "player-2".to_string(),
                owner_name: "Player 2".to_string(),
                ship_type: "mothership-1".to_string(),
                damaged: false,
                col: 10,
                row: 10,
                span: 4,
            },
        );
        assert_eq!(s.motherships_snapshot().len(), 1);
        // ...but the player's own ship is exempt wherever it is.
        let own = s.motherships.get_mut("player-1").unwrap();
        own.col = 900;
        own.row = 900;
        assert!(s
            .motherships_snapshot()
            .iter()
            .any(|m| m.owner_id == "player-1"));
        // The asteroid slice holds only in-window footprints — far fewer
        // than the whole seeded field. A spawn lands in the outer resource
        // band, so the home window has asteroids in it to slice (P2.6).
        let mut s = ServerState::new(0);
        let windowed = s.asteroids_snapshot(0);
        assert!(!windowed.is_empty());
        assert!(windowed.len() < s.asteroids.len());
        for asteroid in &windowed {
            assert!(s.aoi.intersects(asteroid.col, asteroid.row, asteroid.span));
        }
        // Own vessels ride every snapshot regardless of position: dispatched
        // far beyond the window edge, the vessel stays in the slice even
        // long after arrival.
        let out = s.dispatch_vessel(900, 900, 0).unwrap();
        assert!(s
            .active_vessels(out.arrival_at + 60_000)
            .iter()
            .any(|v| v.vessel_id == out.vessel_id));
    }

    #[test]
    fn entity_pushes_outside_the_interest_area_are_dropped() {
        let mut s = mining_state(240);
        let out = s.mine_asteroid("asteroid-x", 0).unwrap();
        s.drain_pushes();
        // Pan the window far away from the asteroid at (499, 510), then let
        // the mining window run out: the asteroid's removal push is filtered,
        // while the own vessel's auto-return push and the (global)
        // notifications still arrive.
        s.map_window(100, 100, 0).unwrap();
        s.settle(10_000 + HOUR_MS);
        let pushes = s.drain_pushes();
        assert!(!pushes.iter().any(|p| matches!(
            p,
            ServerPush::Asteroid(_) | ServerPush::AsteroidRemoved { .. }
        )));
        assert!(pushes
            .iter()
            .any(|p| matches!(p, ServerPush::Vessel(v) if v.vessel_id == out.vessel_id)));
        assert!(pushes
            .iter()
            .any(|p| matches!(p, ServerPush::Notification(_))));

        // With the window over the asteroid, the same mining pushes flow: a
        // fresh state's mine dispatch queues an in-window Asteroid push that
        // survives the drain.
        let mut s = mining_state(240);
        s.mine_asteroid("asteroid-x", 0).unwrap();
        assert!(s
            .drain_pushes()
            .iter()
            .any(|p| matches!(p, ServerPush::Asteroid(_))));
    }

    #[test]
    fn authoritative_push_batches_share_monotonic_revisions() {
        let mut s = ServerState::new(0);
        s.queue_push(ServerPush::Crew(s.crew_data()));
        s.resources_dirty = true;

        let first_revision = s.advance_revision();
        let first = s.drain_revisioned_pushes(first_revision);
        assert_eq!(first_revision, 1);
        assert_eq!(first.len(), 2);
        assert!(first.iter().all(|message| message.revision == 1));

        s.queue_push(ServerPush::Crew(s.crew_data()));
        let second_revision = s.advance_revision();
        let second = s.drain_revisioned_pushes(second_revision);
        assert_eq!(second_revision, 2);
        assert!(second.iter().all(|message| message.revision == 2));
    }

    #[test]
    fn production_tick_queues_one_resources_push() {
        let mut s = ServerState::new(0);
        s.accrue_production(TICK - 1);
        assert!(s.drain_pushes().is_empty());
        // Two ticks accrued in one call still collapse into a single push
        // carrying the final counts.
        s.accrue_production(2 * TICK);
        let pushes = s.drain_pushes();
        assert_eq!(pushes.len(), 1);
        assert!(matches!(pushes[0], ServerPush::Resources(c) if c.construction == 102));
        // Drained: nothing left until the next change.
        assert!(s.drain_pushes().is_empty());
    }

    #[test]
    fn next_deadline_includes_hire_completion() {
        let mut s = ServerState::new(0);
        assert_eq!(s.next_deadline(), TICK);
        s.pending_hire = Some(PendingHire {
            action_id: "event-test".to_string(),
            dispatched_at: 0,
            completes_at: 3,
        });
        assert_eq!(s.next_deadline(), 3);
    }

    #[test]
    fn next_deadline_tracks_ticks_builds_and_arrivals() {
        let mut s = funded_state(1, 0);
        // Nothing pending: the next production tick is the only deadline.
        assert_eq!(s.next_deadline(), TICK);
        // A refinery build completes between production ticks.
        s.build_module(2, 2, "ore-refinery".to_string(), 1_000)
            .unwrap();
        s.settle(4 * TICK);
        assert_eq!(s.next_deadline(), 1_000 + ore_refinery_build_time());
        // Once it settles, the cadence falls back to the tick.
        s.settle(1_000 + ore_refinery_build_time());
        assert_eq!(s.next_deadline(), 5 * TICK);
        // A short vessel flight beats the tick; its settled arrival doesn't.
        // One tile off the dock, wherever the ship spawned.
        let ship = s.player_mothership().expect("player mothership");
        let (hop_col, hop_row) = (ship.col + 2, ship.row + 3);
        let out = s.dispatch_vessel(hop_col, hop_row, 23_500).unwrap();
        assert!(out.arrival_at < 5 * TICK);
        assert_eq!(s.next_deadline(), out.arrival_at);
        s.settle(out.arrival_at);
        assert_eq!(s.next_deadline(), 5 * TICK);
    }

    #[test]
    fn saturated_transition_deadline_settles_once_without_looping() {
        let now = u64::MAX - 1;
        let mut s = funded_state(1, now);
        let response = s
            .build_module(2, 2, "ore-refinery".to_string(), now)
            .expect("build at the timestamp limit");
        let module = response.module;
        assert_eq!(
            module.pending.expect("pending build").completes_at,
            u64::MAX
        );

        s.settle(u64::MAX);

        let module = s.modules.get(&module.module_id).expect("built module");
        assert_eq!(module.level, 1);
        assert!(module.pending.is_none());
    }

    #[test]
    fn notifications_are_capped_at_the_oldest_end() {
        let mut s = ServerState::new(0);
        for i in 0..(MAX_NOTIFICATIONS + 5) {
            s.push_notification(
                format!("event-{i}"),
                NotificationPayload::CrewHired { crew: i as u32 },
                i as u64,
            );
        }
        assert_eq!(s.notifications.len(), MAX_NOTIFICATIONS);
        assert_eq!(s.notifications[0].source_event_id, "event-5");
    }

    #[test]
    fn event_ids_are_unique_across_local_profiles() {
        let mut s = ServerState::new(0);
        let first = s.next_event_id();
        s.create_player_profile("Player 2".to_string(), 0)
            .expect("create second local profile");
        let second = s.next_event_id();

        assert_eq!(first, "player-1:event-1");
        assert_ne!(first, second);
        assert!(second.starts_with("player-"));
    }

    #[test]
    fn mark_notifications_read_clears_every_entry() {
        let mut s = ServerState::new(0);
        s.push_notification(
            "event-1".to_string(),
            NotificationPayload::CrewHired { crew: 1 },
            0,
        );
        s.push_notification(
            "event-2".to_string(),
            NotificationPayload::CrewHired { crew: 2 },
            1,
        );
        assert!(s.notifications.iter().all(|n| !n.read));
        let returned = s.mark_notifications_read();
        assert!(returned.iter().all(|n| n.read));
        assert!(s.notifications.iter().all(|n| n.read));
    }

    #[test]
    fn snapshot_reflects_a_deposit_settled_within_the_same_call() {
        // Regression for CR1.1: `snapshot` used to read `resources` before
        // `settle`-equivalent calls further down the struct literal (mining,
        // vessel arrivals) could still deposit into it, so a docking
        // arrival's cargo missed the snapshot it settled inside of.
        let mut s = mining_state(240);
        let out = s.mine_asteroid("asteroid-x", 0).unwrap();
        s.settle(10_000 + HOUR_MS);
        let back = s.vessels[&out.vessel_id].clone();
        s.drain_pushes();

        let data = s.snapshot(back.arrival_at);
        assert_eq!(data.resources.biological, 240);
        assert_eq!(s.resources.biological, 240);
        assert!(s.vessels.is_empty());
    }

    #[test]
    fn next_deadline_includes_mining_completion() {
        // Anchor production at 10_000 (next tick 15_000) and hand-place a
        // mining job completing sooner.
        let mut s = ServerState::new(10_000);
        s.asteroids.clear();
        s.asteroids.insert(
            "asteroid-x".to_string(),
            AsteroidData {
                asteroid_id: "asteroid-x".to_string(),
                tier: "small".to_string(),
                resource: ResourceKind::Fuel,
                col: 499,
                row: 510,
                span: 1,
                total: 60,
                remaining: 60,
                mining: Some(AsteroidMining {
                    action_id: "event-mine".to_string(),
                    vessel_id: "vessel-m".to_string(),
                    started_at: 11_000,
                    completes_at: 12_000,
                }),
            },
        );
        assert_eq!(s.next_deadline(), 12_000);
    }

    #[test]
    fn next_deadline_caps_at_the_daily_deal_reset() {
        let mut s = ServerState::new(0);
        // Push the production tick past the day boundary: the deal reset
        // must hold the deadline at the next UTC midnight.
        s.last_production_at = 2 * DAY_MS;
        assert_eq!(s.next_deadline(), DAY_MS);
    }

    #[test]
    fn deadline_math_saturates_at_the_timestamp_boundary() {
        assert_eq!(deadline_after(u64::MAX - 5, 10), u64::MAX);

        let mut s = ServerState::new(u64::MAX);
        s.deals_day_index = u64::MAX;
        assert_eq!(s.next_deadline(), u64::MAX);
    }

    #[test]
    fn persisted_timer_validation_rejects_wrapped_deadlines() {
        let mut s = ServerState::new(0);
        s.pending_hire = Some(PendingHire {
            action_id: "event-hire".to_string(),
            dispatched_at: u64::MAX,
            completes_at: 0,
        });

        let error = s.validate_timestamps().unwrap_err();

        assert!(error.contains("pending crew hire"), "{error}");
        assert!(error.contains("precedes start"), "{error}");
    }
}
