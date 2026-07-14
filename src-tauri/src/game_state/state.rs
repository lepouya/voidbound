use std::collections::{HashMap, HashSet};
use std::sync::OnceLock;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;

use super::crew::{CrewData, PendingHire, STARTING_CREW};
use super::deals::{utc_day_index, DealData, DealsData, DAY_MS};
use super::modules::{module_anchor_at, ModuleData, COMMAND_MODULE_TYPE, PRODUCTION_TICK_MS};
use super::resources::ResourceCounts;
use super::world::{seed_asteroids, AsteroidData, MapWindow, MothershipData, VesselMoveEventData};

#[derive(Serialize, serde::Deserialize)]
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
/// `NotificationData` in `src/state/game-state.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NotificationData {
    pub notification_id: String,
    /// Category slug: "build-complete", "levelup-complete", "mining-started",
    /// or "vessel-returned". Display/grouping only — new kinds need no client
    /// changes.
    pub kind: String,
    /// Server-composed display text (the server owns the catalog names).
    pub message: String,
    /// Server epoch ms when the notification was created.
    pub created_at: u64,
    /// Cleared by the mark_notifications_read command; the Events HUD badge
    /// shows the unread count.
    pub read: bool,
}

/// The Tauri event channel carrying `ServerPush` messages to the webview.
/// Mirrors SERVER_PUSH_EVENT in `src/state/game-state.ts` — keep the two in sync.
pub const SERVER_PUSH_EVENT: &str = "server-push";

/// A server-initiated state push — the in-process stand-in for the phase-3
/// WebSocket event bus (SERVER.md § append + broadcast). Mutations queue
/// pushes into the ServerState outbox; whichever boundary ran the mutation —
/// the scheduler thread for time-based settlement, a command handler for
/// request-triggered settlement — drains the outbox and emits each entry as a
/// SERVER_PUSH_EVENT. The client routes every variant into the matching
/// `gameState` apply/sync entry point (`applyServerPush` in
/// `src/state/game-state.ts`) — the same entry points a phase-3 socket handler will
/// call. Mirrors the TS `ServerPush` union in `src/state/game-state.ts` — keep the
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
    /// completes; phase 3 adds other players' moves.
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
/// `src/state/game-state.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameStateData {
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
    /// replays these through applyVesselMoveEvent, so vessels dispatched
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
    /// Events badge unread count across reloads.
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

/// The local player. Hardcoded until a login flow exists (phase 3).
pub(super) fn player_identity() -> PlayerIdentity {
    PlayerIdentity {
        id: "player-1".to_string(),
        name: "Player 1".to_string(),
    }
}

pub(crate) fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

static TIME_SCALE: OnceLock<f64> = OnceLock::new();

/// Dev-speed multiplier (ROADMAP P0.13), read once from `VOIDBOUND_TIME_SCALE`
/// at first use. Unset — the normal `deno task tauri dev` — behaves as 1.0
/// (real-time); `deno task tauri dev:fast` sets it so build/hire/mine timers
/// and the production tick complete N* faster, for playtesting the core loop
/// without waiting out real-time timers.
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
/// Phase 2 serializes it to a save file; the phase-3 server owns it remotely.
pub struct ServerState {
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
    /// Vessels whose current move's arrival has already produced its feed
    /// notification — parked vessels stay in the table, so without this every
    /// settle pass would re-announce them. An id leaves the set when its
    /// vessel despawns or is recalled (the redirect makes it in-flight again).
    pub(super) notified_arrivals: HashSet<String>,
    /// Ship's crew head count (ROADMAP P1.10). Capacity derives from the
    /// module table (crew_capacity); the pooled staffing ratio against
    /// crew_required damps producer output in accrue_production.
    pub(super) crew: u32,
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
    /// Single-client today; the phase-3 server keeps one per connection.
    pub(super) aoi: MapWindow,
    /// Pushes queued by mutations since the last drain. Mutations queue,
    /// boundaries (scheduler wake / command return) drain and emit — so every
    /// settlement path broadcasts identically, whoever triggered it.
    pub(super) outbox: Vec<OutboxEntry>,
    /// True when resource counts changed since the last drain; drain_pushes
    /// appends one Resources push carrying the final counts, so several
    /// accruals/spends inside one mutation collapse into a single push.
    pub(super) resources_dirty: bool,
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
        // Placeholder world: the player's mothership plus one sample enemy,
        // at the center of the full-size map (ROADMAP P1.9). Persistence
        // (P2) / the real server (P3) will load these instead.
        let motherships = HashMap::from([
            (
                player.id.clone(),
                MothershipData {
                    mothership_id: player.id.clone(),
                    owner_id: player.id,
                    owner_name: player.name,
                    ship_type: "ss1".to_string(),
                    damaged: false,
                    col: 498,
                    row: 498,
                    span: 4,
                },
            ),
            (
                "player-2".to_string(),
                MothershipData {
                    mothership_id: "player-2".to_string(),
                    owner_id: "player-2".to_string(),
                    owner_name: "Enemy".to_string(),
                    ship_type: "ss1".to_string(),
                    damaged: true,
                    col: 503,
                    row: 499,
                    span: 4,
                },
            ),
        ]);
        // Placeholder starter asteroid field, spread across the map.
        // Persistence (P2) / the real server (P3) will load this instead.
        let asteroids = seed_asteroids(&motherships);
        let mut state = Self {
            resources: ResourceCounts {
                construction: 0,
                high_tech: 0,
                biological: 0,
                fuel: 0,
                credits: 0,
            },
            last_production_at: now_ms,
            modules,
            next_module_seq: 0,
            motherships,
            vessels: HashMap::new(),
            next_vessel_seq: 0,
            asteroids,
            notified_arrivals: HashSet::new(),
            crew: STARTING_CREW,
            pending_hire: None,
            notifications: Vec::new(),
            next_notification_seq: 0,
            deals: Vec::new(),
            deals_day_index: utc_day_index(now_ms),
            deal_refreshes_used: 0,
            aoi: MapWindow::centered_at(MAP_COLS / 2, MAP_ROWS / 2),
            outbox: Vec::new(),
            resources_dirty: false,
        };
        // The interest area starts centered on the player's mothership —
        // matching the camera's home position (ROADMAP P1.13).
        state.recenter_aoi_on_player();
        // Today's deal batch, freebie included (ROADMAP P1.12) — generated
        // whether or not a Trading Post exists yet, so the shop is stocked
        // the moment one settles; deterministic like the asteroid field.
        state.regenerate_deals(state.deals_day_index, 0, true);
        state
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

    /// Append a notification to the feed (dropping the oldest past the cap)
    /// and queue its live push.
    pub(super) fn push_notification(&mut self, kind: &str, message: String, now_ms: u64) {
        self.next_notification_seq += 1;
        let notification = NotificationData {
            notification_id: format!("notif-{}-{}", now_ms, self.next_notification_seq),
            kind: kind.to_string(),
            message,
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

    /// Settle everything due at now_ms — production ticks, module build
    /// completions, mining completions, vessel arrivals — queueing the
    /// corresponding pushes. The scheduler thread's whole job; commands
    /// settle the same way piecemeal through their own entry points. Mining
    /// settles before arrivals so an auto-return created long ago can dock
    /// (and deposit its cargo) in the same pass.
    pub(super) fn settle(&mut self, now_ms: u64) {
        self.accrue_production(now_ms); // also settles modules
                                        // After production: the staffing-ratio bump must never be credited
                                        // retroactively for ticks that elapsed before the recruitment
                                        // finished (ROADMAP P1.10).
        self.settle_hire(now_ms);
        self.settle_mining(now_ms);
        self.settle_vessel_arrivals(now_ms);
        // The daily deal reset (ROADMAP P1.12) — after production, so a
        // rollover lands with counts already settled to now.
        self.settle_deals(now_ms);
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
            player: player_identity(),
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
        let mut deadline = self.last_production_at + scaled_ms(PRODUCTION_TICK_MS);
        if let Some(pending) = &self.pending_hire {
            deadline = deadline.min(pending.completes_at);
        }
        for module in self.modules.values() {
            if let Some(pending) = &module.pending {
                deadline = deadline.min(pending.completes_at);
            }
        }
        for vessel in self.vessels.values() {
            if !self.notified_arrivals.contains(&vessel.vessel_id) {
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
        deadline.min((self.deals_day_index + 1).saturating_mul(DAY_MS))
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

    /// Mark the whole feed read (the player opened the Events feed) and
    /// return the updated list.
    pub(super) fn mark_notifications_read(&mut self) -> Vec<NotificationData> {
        for notification in &mut self.notifications {
            notification.read = true;
        }
        self.notifications.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::super::resources::ResourceKind;
    use super::super::test_support::*;
    use super::super::world::{AsteroidMining, AOI_SPAN, HOUR_MS};
    use super::*;

    #[test]
    fn snapshots_are_windowed_to_the_interest_area() {
        let mut s = ServerState::new(0);
        // The AOI starts centered on the player's mothership (498+2, 498+2).
        let aoi = s.aoi;
        assert_eq!(
            (aoi.center_col, aoi.center_row, aoi.span),
            (500, 500, AOI_SPAN)
        );
        // Both seeded ships sit inside the home window.
        assert_eq!(s.motherships_snapshot().len(), 2);
        // A far-away foreign ship drops from the slice...
        let enemy = s.motherships.get_mut("player-2").unwrap();
        enemy.col = 10;
        enemy.row = 10;
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
        // than the whole seeded field.
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
    fn production_tick_queues_one_resources_push() {
        let mut s = ServerState::new(0);
        s.accrue_production(TICK - 1);
        assert!(s.drain_pushes().is_empty());
        // Two ticks accrued in one call still collapse into a single push
        // carrying the final counts.
        s.accrue_production(2 * TICK);
        let pushes = s.drain_pushes();
        assert_eq!(pushes.len(), 1);
        assert!(matches!(pushes[0], ServerPush::Resources(c) if c.construction == 2));
        // Drained: nothing left until the next change.
        assert!(s.drain_pushes().is_empty());
    }

    #[test]
    fn next_deadline_includes_hire_completion() {
        let mut s = ServerState::new(0);
        assert_eq!(s.next_deadline(), TICK);
        s.pending_hire = Some(PendingHire {
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
        // A build completing between ticks beats the tick (15s build started
        // at 1_000 completes at 16_000, between the 15_000 and 20_000 ticks).
        s.build_module(2, 2, "ore-refinery".to_string(), 1_000)
            .unwrap();
        s.settle(3 * TICK);
        assert_eq!(s.next_deadline(), 1_000 + ore_refinery_build_time());
        // Once it settles, the cadence falls back to the tick.
        s.settle(1_000 + ore_refinery_build_time());
        assert_eq!(s.next_deadline(), 4 * TICK);
        // A short vessel flight beats the tick; its settled arrival doesn't.
        let out = s.dispatch_vessel(500, 501, 16_000).unwrap();
        assert!(out.arrival_at < 4 * TICK);
        assert_eq!(s.next_deadline(), out.arrival_at);
        s.settle(out.arrival_at);
        assert_eq!(s.next_deadline(), 4 * TICK);
    }

    #[test]
    fn notifications_are_capped_at_the_oldest_end() {
        let mut s = ServerState::new(0);
        for i in 0..(MAX_NOTIFICATIONS + 5) {
            s.push_notification("test", format!("n{i}"), i as u64);
        }
        assert_eq!(s.notifications.len(), MAX_NOTIFICATIONS);
        assert_eq!(s.notifications[0].message, "n5");
    }

    #[test]
    fn mark_notifications_read_clears_every_entry() {
        let mut s = ServerState::new(0);
        s.push_notification("test", "hello".to_string(), 0);
        s.push_notification("test", "world".to_string(), 1);
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
}
