use std::collections::{HashMap, HashSet};
use std::sync::{Condvar, Mutex, MutexGuard, PoisonError};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::{Emitter, Manager};

#[derive(Serialize, serde::Deserialize)]
pub struct PlayerIdentity {
    pub id: String,
    pub name: String,
}

/// One of the four material resources a module can produce, a build can
/// cost, or an asteroid can yield. Excludes `credits`, which is trade-only
/// and never produced by a module. Serializes to the TS `ResourceKind` key
/// strings ("construction", "highTech", ...) in `src/game-state.ts` — keep
/// the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "camelCase")]
pub enum ResourceKind {
    Construction,
    HighTech,
    Biological,
    Fuel,
}

/// Player-facing name of a resource for server-composed notification text.
fn resource_display_name(kind: ResourceKind) -> &'static str {
    match kind {
        ResourceKind::Construction => "construction material",
        ResourceKind::HighTech => "high-tech material",
        ResourceKind::Biological => "biological material",
        ResourceKind::Fuel => "fuel",
    }
}

/// One of the five trade-eligible types a Trading Post deal can exchange
/// (ROADMAP P1.12): the four material resources plus the trade currency.
/// Serializes to the full TS `ResourceKind` key set in `src/game-state.ts`
/// ("construction", ..., "credits") — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "camelCase")]
pub enum TradeKind {
    Construction,
    HighTech,
    Biological,
    Fuel,
    Credits,
}

const TRADE_KINDS: [TradeKind; 5] = [
    TradeKind::Construction,
    TradeKind::HighTech,
    TradeKind::Biological,
    TradeKind::Fuel,
    TradeKind::Credits,
];

impl TradeKind {
    /// The material resource behind this trade type, or None for credits.
    fn material(self) -> Option<ResourceKind> {
        match self {
            TradeKind::Construction => Some(ResourceKind::Construction),
            TradeKind::HighTech => Some(ResourceKind::HighTech),
            TradeKind::Biological => Some(ResourceKind::Biological),
            TradeKind::Fuel => Some(ResourceKind::Fuel),
            TradeKind::Credits => None,
        }
    }
}

/// Player-facing name of a trade-eligible type for error/notification text.
fn trade_display_name(kind: TradeKind) -> &'static str {
    match kind.material() {
        Some(res) => resource_display_name(res),
        None => "credits",
    }
}

/// The player's stock of the four material resources plus the generic trade
/// currency ("credits" — placeholder term, renamed in the display layer if
/// needed). Mirrors the TS `ResourceCounts` in `src/game-state.ts` — keep
/// the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Copy, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ResourceCounts {
    pub construction: u64,
    pub high_tech: u64,
    pub biological: u64,
    pub fuel: u64,
    pub credits: u64,
}

impl ResourceCounts {
    fn get(&self, kind: ResourceKind) -> u64 {
        match kind {
            ResourceKind::Construction => self.construction,
            ResourceKind::HighTech => self.high_tech,
            ResourceKind::Biological => self.biological,
            ResourceKind::Fuel => self.fuel,
        }
    }

    fn slot_mut(&mut self, kind: ResourceKind) -> &mut u64 {
        match kind {
            ResourceKind::Construction => &mut self.construction,
            ResourceKind::HighTech => &mut self.high_tech,
            ResourceKind::Biological => &mut self.biological,
            ResourceKind::Fuel => &mut self.fuel,
        }
    }

    fn add(&mut self, kind: ResourceKind, amount: u64) {
        let slot = self.slot_mut(kind);
        *slot = slot.saturating_add(amount);
    }

    /// Add at most what fits under `cap`, returning the amount actually
    /// stored — income past the storage cap is lost (ROADMAP P1.11). Stock
    /// already above the cap is never confiscated; it just leaves no room.
    fn add_capped(&mut self, kind: ResourceKind, amount: u64, cap: u64) -> u64 {
        let accepted = amount.min(cap.saturating_sub(self.get(kind)));
        self.add(kind, accepted);
        accepted
    }

    /// Deduct `amount` of a material resource, failing (untouched) when the
    /// stock doesn't cover it. Every module cost is stubbed as
    /// construction-only for now (ROADMAP P1.4) — fine-tuned to a real
    /// per-resource mix later; crew hiring spends biological (ROADMAP P1.10).
    fn spend(&mut self, kind: ResourceKind, amount: u64) -> Result<(), String> {
        let have = self.get(kind);
        if have < amount {
            return Err(format!(
                "not enough {}: need {amount}, have {have}",
                resource_display_name(kind)
            ));
        }
        *self.slot_mut(kind) -= amount;
        Ok(())
    }

    /// Trade-side accessors (ROADMAP P1.12) — like get/add/spend, but over
    /// the five trade-eligible types: the four materials plus credits.
    fn get_trade(&self, kind: TradeKind) -> u64 {
        match kind.material() {
            Some(res) => self.get(res),
            None => self.credits,
        }
    }

    fn add_trade(&mut self, kind: TradeKind, amount: u64) {
        match kind.material() {
            Some(res) => self.add(res, amount),
            None => self.credits = self.credits.saturating_add(amount),
        }
    }

    fn spend_trade(&mut self, kind: TradeKind, amount: u64) -> Result<(), String> {
        match kind.material() {
            Some(res) => self.spend(res, amount),
            None => {
                if self.credits < amount {
                    return Err(format!(
                        "not enough credits: need {amount}, have {}",
                        self.credits
                    ));
                }
                self.credits -= amount;
                Ok(())
            }
        }
    }
}

/// One entry in the module catalog (ROADMAP P1.4): production, storage,
/// cost, build time, and unlock prerequisite for a module type.
/// Cost/time/production/storage all scale by `scale_for_level` — a
/// deliberate doubling-per-level stub until real balancing lands. Mirrors
/// the TS `MODULE_CATALOG` in `src/module-catalog.ts` — keep the two in
/// sync.
pub struct ModuleCatalogEntry {
    /// Wire key — the `module_type` string on `ModuleData` and build requests.
    pub module_type: &'static str,
    pub display_name: &'static str,
    /// Resources produced per production tick at level 1; doubles per level.
    pub produces: &'static [(ResourceKind, u64)],
    /// Storage capacity contributed per resource at level 1 (ROADMAP P1.11);
    /// doubles per level. Income past a resource's total cap is lost.
    pub stores: &'static [(ResourceKind, u64)],
    /// Crew berths contributed per settled level (ROADMAP P1.10) — summed
    /// **linearly** (level * this), not scale_for_level: capacity is a head
    /// count, not a production curve. Crew Quarters is the real source; the
    /// Command Module contributes a baseline like it does for production and
    /// storage.
    pub crew_capacity_per_level: u32,
    /// Crew wanted per settled level to run at full output (ROADMAP P1.10),
    /// summed linearly ship-wide. Modules with 0 are never damped; the
    /// Command Module's baseline production stays 0 so the player can never
    /// get stuck (README § Ship design).
    pub crew_required_per_level: u32,
    /// Construction-material cost to build (or level up to) level 1; doubles
    /// per level thereafter.
    pub base_cost_construction: u64,
    /// Build/level-up time in ms at level 1; doubles per level thereafter.
    pub base_build_time_ms: u64,
    /// Minimum Command Module level required before this type can be built.
    pub unlock_command_level: u32,
}

pub const COMMAND_MODULE_TYPE: &str = "command";

/// Catalog key of the Trading Post (ROADMAP P1.12) — hosts the NPC deal
/// shop; its settled level gates the deal commands and sets the slot count.
pub const TRADING_POST_MODULE_TYPE: &str = "trading-post";

/// The module catalog. The Command Module is a catalog entry like every
/// other type (formalized per ROADMAP P1.4) even though it's pre-built at
/// game start rather than player-constructed — its level still advances
/// through the same `levelup_module` path as everything else, and its level
/// gates every other type's unlock and level cap (README § Ship design).
pub const MODULE_CATALOG: &[ModuleCatalogEntry] = &[
    ModuleCatalogEntry {
        module_type: COMMAND_MODULE_TYPE,
        display_name: "Command Module",
        produces: &[
            (ResourceKind::Construction, 1),
            (ResourceKind::HighTech, 1),
            (ResourceKind::Biological, 1),
            (ResourceKind::Fuel, 1),
        ],
        // Baseline storage, mirroring the baseline production: the player
        // always has some cap even with no Storage Bay built — sized to hold
        // a max small-tier asteroid harvest (ASTEROID_TIERS) with room over.
        stores: &[
            (ResourceKind::Construction, 1_000),
            (ResourceKind::HighTech, 1_000),
            (ResourceKind::Biological, 1_000),
            (ResourceKind::Fuel, 1_000),
        ],
        // Baseline berths too — hiring works before the first Crew Quarters
        // exists (ROADMAP P1.10).
        crew_capacity_per_level: 2,
        crew_required_per_level: 0,
        base_cost_construction: 20,
        base_build_time_ms: 30_000,
        unlock_command_level: 0,
    },
    ModuleCatalogEntry {
        module_type: "ore-refinery",
        display_name: "Ore Refinery",
        produces: &[(ResourceKind::Construction, 2)],
        stores: &[],
        crew_capacity_per_level: 0,
        crew_required_per_level: 1,
        base_cost_construction: 10,
        base_build_time_ms: 15_000,
        unlock_command_level: 1,
    },
    ModuleCatalogEntry {
        module_type: "electronics-fabricator",
        display_name: "Electronics Fabricator",
        produces: &[(ResourceKind::HighTech, 2)],
        stores: &[],
        crew_capacity_per_level: 0,
        crew_required_per_level: 1,
        base_cost_construction: 10,
        base_build_time_ms: 15_000,
        unlock_command_level: 1,
    },
    ModuleCatalogEntry {
        module_type: "hydroponics-bay",
        display_name: "Hydroponics Bay",
        produces: &[(ResourceKind::Biological, 2)],
        stores: &[],
        crew_capacity_per_level: 0,
        crew_required_per_level: 1,
        base_cost_construction: 10,
        base_build_time_ms: 15_000,
        unlock_command_level: 1,
    },
    ModuleCatalogEntry {
        module_type: "fusion-reactor",
        display_name: "Fusion Reactor",
        produces: &[(ResourceKind::Fuel, 2)],
        stores: &[],
        crew_capacity_per_level: 0,
        crew_required_per_level: 1,
        base_cost_construction: 10,
        base_build_time_ms: 15_000,
        unlock_command_level: 1,
    },
    ModuleCatalogEntry {
        module_type: "storage-bay",
        display_name: "Storage Bay",
        produces: &[],
        stores: &[
            (ResourceKind::Construction, 2_000),
            (ResourceKind::HighTech, 2_000),
            (ResourceKind::Biological, 2_000),
            (ResourceKind::Fuel, 2_000),
        ],
        crew_capacity_per_level: 0,
        crew_required_per_level: 0,
        base_cost_construction: 15,
        base_build_time_ms: 20_000,
        unlock_command_level: 1,
    },
    ModuleCatalogEntry {
        module_type: "crew-quarters",
        display_name: "Crew Quarters",
        produces: &[],
        stores: &[],
        crew_capacity_per_level: 1,
        crew_required_per_level: 0,
        base_cost_construction: 15,
        base_build_time_ms: 20_000,
        unlock_command_level: 1,
    },
    ModuleCatalogEntry {
        module_type: TRADING_POST_MODULE_TYPE,
        display_name: "Trading Post",
        // No production or storage — its function is the deal shop
        // (ROADMAP P1.12); leveling it adds deal slots instead.
        produces: &[],
        stores: &[],
        crew_capacity_per_level: 0,
        crew_required_per_level: 1,
        base_cost_construction: 15,
        base_build_time_ms: 20_000,
        // Low-mid unlock so trade arrives after the first production loop is
        // running; the exact level is a balancing stub → P2.5.
        unlock_command_level: 2,
    },
];

fn catalog_entry(module_type: &str) -> Option<&'static ModuleCatalogEntry> {
    MODULE_CATALOG.iter().find(|e| e.module_type == module_type)
}

/// Doubles `base` for every level above 1 — the stub scaling rule shared by
/// cost, build time, and production until real balancing lands (ROADMAP
/// P1.4). Level 0 (not yet built) scales to 0.
fn scale_for_level(base: u64, level: u32) -> u64 {
    if level == 0 {
        return 0;
    }
    base.saturating_mul(2u64.saturating_pow(level - 1))
}

/// Damp a production amount by the pooled crew staffing ratio (ROADMAP
/// P1.10): output * (0.5 + 0.5 * staffed/required), as exact integer math —
/// `amount * (required + staffed) / (2 * required)`. Fully staffed passes
/// through unchanged; a ship with no crew still runs at half speed (the 50%
/// floor — understaffing punishes, it never kills). `required == 0` means
/// nothing wants crew: no damping. The floor value is a balancing stub →
/// P2.5. Mirrored display-only as crewScaledAmount in
/// `src/module-catalog.ts` — keep the two in sync.
fn crew_scaled(amount: u64, staffed: u32, required: u32) -> u64 {
    if required == 0 {
        return amount;
    }
    let (staffed, required) = (staffed as u64, required as u64);
    amount.saturating_mul(required + staffed) / (2 * required)
}

/// A module placed in the ship, with its catalog type and current level.
/// Level 0 means the first build hasn't completed yet. `pending` carries the
/// in-progress timer for either a first build (level 0 → 1) or a level-up
/// (level N → N+1, during which the module keeps functioning at level N).
/// Mirrors the TS `ModuleData` in `src/game-state.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ModuleData {
    pub module_id: String,
    pub owner_id: String,
    pub owner_name: String,
    /// Catalog key, e.g. "ore-refinery" — until per-type art lands, the
    /// client renders every module with the same "module-base" sprite.
    pub module_type: String,
    /// Anchor (top-left) tile of the module footprint.
    pub col: i64,
    pub row: i64,
    /// Highest level this module has fully completed; 0 while the first
    /// build is still running.
    pub level: u32,
    /// Present while a build/upgrade is in flight.
    pub pending: Option<ModulePendingBuild>,
}

/// Mirrors the TS `ModulePendingBuild` in `src/game-state.ts` — keep the two
/// in sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ModulePendingBuild {
    /// The level this build completes to.
    pub level: u32,
    pub dispatched_at: u64,
    pub completes_at: u64,
}

/// Result of a verified build/level-up request: the affected module's
/// current state plus the resource counts after the cost was deducted.
#[derive(Serialize, Debug)]
pub struct ModuleActionResponse {
    pub module: ModuleData,
    pub resources: ResourceCounts,
}

/// A crew recruitment in flight (ROADMAP P1.10) — one at a time, same timer
/// shape as a module's pending build. Mirrors the TS `PendingHire` in
/// `src/game-state.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PendingHire {
    pub dispatched_at: u64,
    pub completes_at: u64,
}

/// The ship's crew state (ROADMAP P1.10): head count plus any recruitment in
/// flight. Like ModuleData, the struct doubles as its own event payload — a
/// crew push carries the full current snapshot. Capacity is not on the wire:
/// it derives from the module snapshot (crew_capacity / the TS
/// crewCapacityForModules mirror). Mirrors the TS `CrewData` in
/// `src/game-state.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CrewData {
    pub crew: u32,
    pub pending_hire: Option<PendingHire>,
}

/// Result of a verified hire request: the crew state with the recruitment
/// pending, plus the resource counts after the cost was deducted.
#[derive(Serialize, Debug)]
pub struct CrewActionResponse {
    pub crew: CrewData,
    pub resources: ResourceCounts,
}

/// Response to request_map_window (ROADMAP P1.13): the re-centered interest
/// area plus every world entity the client should now hold — it replaces its
/// mothership/asteroid/vessel tables wholesale with these slices. Mirrors
/// the TS `MapWindowData` in `src/game-state.ts` — keep the two in sync.
#[derive(Serialize, Debug)]
pub struct MapWindowData {
    pub window: MapWindow,
    pub motherships: Vec<MothershipData>,
    pub asteroids: Vec<AsteroidData>,
    pub vessels: Vec<VesselMoveEventData>,
}

/// Maximum event-feed entries retained; the oldest are dropped past this,
/// keeping the snapshot bounded over a long session.
const MAX_NOTIFICATIONS: usize = 100;

/// One entry in the player's event feed (ROADMAP P1.5), created server-side
/// when something the player should hear about happens — a build or level-up
/// completing, a vessel arriving or returning. Rides the load_game_state
/// snapshot (so the feed and its unread state survive a reload) and is also
/// pushed live (`ServerPush::Notification`). Mirrors the TS
/// `NotificationData` in `src/game-state.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NotificationData {
    pub notification_id: String,
    /// Category slug: "build-complete", "levelup-complete", "vessel-arrived",
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
/// Mirrors SERVER_PUSH_EVENT in `src/game-state.ts` — keep the two in sync.
pub const SERVER_PUSH_EVENT: &str = "server-push";

/// A server-initiated state push — the in-process stand-in for the phase-3
/// WebSocket event bus (SERVER.md § append + broadcast). Mutations queue
/// pushes into the ServerState outbox; whichever boundary ran the mutation —
/// the scheduler thread for time-based settlement, a command handler for
/// request-triggered settlement — drains the outbox and emits each entry as a
/// SERVER_PUSH_EVENT. The client routes every variant into the matching
/// `gameState` apply/sync entry point (`applyServerPush` in
/// `src/game-state.ts`) — the same entry points a phase-3 socket handler will
/// call. Mirrors the TS `ServerPush` union in `src/game-state.ts` — keep the
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
/// `src/game-state.ts` — keep the two in sync.
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

// -- Server-authoritative game rules ----------------------------------------
//
// The backend owns all resource math and build verification: the client can
// be tampered with, so it only renders what these commands return and asks
// for actions — it never computes or mutates resource values on its own.
// This is the phase-3 server model (SERVER.md) running in-process for now.

/// Length of one production interval — also the cadence at which the
/// scheduler thread pushes accrued resources to the client (the client never
/// polls; see run_scheduler).
const PRODUCTION_TICK_MS: u64 = 5_000;

/// Ship-interior room layout — mirrors SHIP_ROOM_GRID in `src/grid-math.ts`
/// and the geometry drawn in art/ship-level.tmj; keep all three in sync.
const ROOM_ORIGIN: i64 = 1;
const ROOM_SPAN: i64 = 6;
const ROOM_PITCH: i64 = 8;
const ROOM_COUNT: i64 = 5;
/// Modules occupy the 4*4 center of their 6*6 room.
const MODULE_SPAN: i64 = 4;

/// Space-map bounds — the single source `map.rs::generate_space_map` serves
/// to the client (geometry only since ROADMAP P1.9: no per-tile content at
/// this size, the scene renders a plain background).
pub(crate) const MAP_COLS: i64 = 1000;
pub(crate) const MAP_ROWS: i64 = 1000;
/// Map-scene tile size in world px — also served by
/// `map.rs::generate_space_map`.
pub(crate) const MAP_TILE_PX: f64 = 32.0;
/// Interest-area window edge length in tiles (ROADMAP P1.13): the client
/// only ever holds world entities inside this window centered on its camera.
/// Must stay strictly larger than the client's visible-view tile cap plus
/// its re-request hysteresis (MAP_VIEW_TILES_CAP / AOI_REQUERY_TILES in
/// src/aoi-config.ts, which mirrors this constant and whose invariant is
/// asserted by tests/aoi_config_test.ts — keep the two in sync) so unloaded
/// space can never scroll into sight.
pub(crate) const AOI_SPAN: i64 = 100;
/// Biological-material cost of one crew hire, multiplied by the new head
/// count — linear, not the doubling stub: hiring is a repeat purchase
/// (ROADMAP P1.10). Balancing stub → P2.5. Mirrored display-only as
/// HIRE_COST_BIOLOGICAL in `src/module-catalog.ts` — keep the two in sync.
const HIRE_COST_BIOLOGICAL: u64 = 20;
/// Recruitment time per hire. Balancing stub → P2.5. Mirrored display-only
/// as HIRE_TIME_MS in `src/module-catalog.ts` — keep the two in sync.
const HIRE_TIME_MS: u64 = 30_000;
/// A new player starts with no crew (ROADMAP P1.10) and hires from scratch —
/// the first recruitment is a natural early goal (and a future tutorial
/// step). The Command Module's baseline berths make it possible before any
/// Crew Quarters exists, and its baseline production is crew-independent, so
/// an empty ship still runs.
const STARTING_CREW: u32 = 0;

/// Vessel travel speed in world px/s. Server-verified: clients render the
/// speed the event carries, they never choose it. Update on upgrade (P4).
const VESSEL_SPEED_PX_S: f64 = 32.0;
/// Sprite/capability type of the only vessel class so far.
const VESSEL_TYPE: &str = "cs1";
/// Cheap stopgap fleet cap (CODE_REVIEW.md CR1.5): dispatch is otherwise free
/// and uncapped today, so nothing stops an unbounded vessel table. Superseded
/// by P5.3's crew-bound vessel counts; until then this just prevents runaway
/// growth.
const MAX_VESSELS: usize = 20;

/// The local player. Hardcoded until a login flow exists (phase 3).
fn player_identity() -> PlayerIdentity {
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

/// Top-left tile of the room containing (col, row), or None when the
/// position falls outside every room (void, corridors between rooms).
fn room_origin_at(col: i64, row: i64) -> Option<(i64, i64)> {
    let axis = |v: i64| {
        let rel = v - ROOM_ORIGIN;
        let idx = rel.div_euclid(ROOM_PITCH);
        if idx < 0 || idx >= ROOM_COUNT || rel.rem_euclid(ROOM_PITCH) >= ROOM_SPAN {
            return None;
        }
        Some(ROOM_ORIGIN + idx * ROOM_PITCH)
    };
    Some((axis(col)?, axis(row)?))
}

/// Anchor (top-left) tile for a module centered in the room containing
/// (col, row), or None when (col, row) is not inside a room.
fn module_anchor_at(col: i64, row: i64) -> Option<(i64, i64)> {
    let (room_col, room_row) = room_origin_at(col, row)?;
    let inset = (ROOM_SPAN - MODULE_SPAN) / 2;
    Some((room_col + inset, room_row + inset))
}

/// A mothership on the space map. Placement is server-owned: the client
/// renders whatever the load_game_state snapshot says (MapLevel reconciles
/// its actors from the list), so moved ships or newly joined players reach
/// every client through the same snapshot with no hardcoded positions.
/// Mirrors the TS `MothershipData` in `src/game-state.ts` — keep the two in
/// sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MothershipData {
    /// One mothership per player for now, so ids equal the owner id.
    pub mothership_id: String,
    pub owner_id: String,
    pub owner_name: String,
    /// Sprite/capability type, e.g. "ss1" — resolves art as `<type>-base` /
    /// `<type>-damaged`.
    pub ship_type: String,
    /// Renders the `-damaged` sprite variant when true.
    pub damaged: bool,
    /// Anchor (top-left) tile of the footprint.
    pub col: i64,
    pub row: i64,
    /// Footprint size in tiles (span*span).
    pub span: i64,
}

/// Center tile of the ship's inner 2*2 that is closest to the given position
/// — the spawn/dock point for vessels. Positions are fractional because
/// recalls depart from a lerped mid-flight position. Mirrors closestDockTile
/// in `src/grid-math.ts` — keep the two in sync.
fn closest_dock_tile(ship: &MothershipData, col: f64, row: f64) -> (i64, i64) {
    let axis = |v: f64, origin: i64| {
        let half = origin + ship.span / 2;
        if v < half as f64 {
            half - 1
        } else {
            half
        }
    };
    (axis(col, ship.col), axis(row, ship.row))
}

/// True if (col, row) is one of the ship's inner 2*2 docking tiles.
/// Mirrors isDockTile in `src/grid-math.ts` — keep the two in sync.
fn is_dock_tile(ship: &MothershipData, col: i64, row: i64) -> bool {
    let on_axis = |v: i64, origin: i64| {
        let half = origin + ship.span / 2;
        v == half - 1 || v == half
    };
    on_axis(col, ship.col) && on_axis(row, ship.row)
}

// -- Interest area (ROADMAP P1.13) --------------------------------------------

/// A client's interest-area window: the AOI_SPAN*AOI_SPAN-tile region,
/// centered on (center_col, center_row), inside which world entities are
/// streamed to that client. Snapshot slices and entity pushes are filtered
/// against it; everything the player owns is exempt (a mining vessel must
/// keep existing beyond the edge — alliance entities join the exemption in
/// P4). Per-client state: single-client today (`ServerState::aoi`), but
/// shaped exactly like the per-connection subscriptions P3.1's socket bus
/// needs (SERVER.md § Interest management). Mirrors the TS `MapWindow` in
/// `src/game-state.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Copy, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MapWindow {
    pub center_col: i64,
    pub center_row: i64,
    /// Window edge length in tiles (always AOI_SPAN; carried on the wire so
    /// the client never hardcodes it).
    pub span: i64,
}

impl MapWindow {
    fn centered_at(center_col: i64, center_row: i64) -> Self {
        Self {
            center_col,
            center_row,
            span: AOI_SPAN,
        }
    }

    /// Top-left tile of the window. May extend past the map edges — the
    /// intersection math doesn't care.
    fn origin(&self) -> (i64, i64) {
        (
            self.center_col - self.span / 2,
            self.center_row - self.span / 2,
        )
    }

    /// True when the given span*span footprint overlaps this window.
    fn intersects(&self, col: i64, row: i64, span: i64) -> bool {
        let (left, top) = self.origin();
        col + span > left && col < left + self.span && row + span > top && row < top + self.span
    }

    /// True when the given fractional tile position (a lerped vessel) lies
    /// inside this window.
    fn contains_point(&self, col: f64, row: f64) -> bool {
        let (left, top) = self.origin();
        col >= left as f64
            && col < (left + self.span) as f64
            && row >= top as f64
            && row < (top + self.span) as f64
    }
}

// -- Asteroids (ROADMAP P1.6) ------------------------------------------------

/// Mining extraction rate in resource units per hour, shared by every tier —
/// tiers differ only in how much an asteroid holds, so a full mine-out takes
/// amount / rate (small 15–60 min, medium 1–4 h, large 4–12 h). A stub like
/// `scale_for_level` until real balancing lands. Mirrored display-only in
/// `src/asteroid-catalog.ts` — keep the two in sync.
const MINE_UNITS_PER_HOUR: u64 = 240;
const HOUR_MS: u64 = 3_600_000;

/// How long mining the given amount takes at MINE_UNITS_PER_HOUR.
fn mine_duration_ms(amount: u64) -> u64 {
    amount.saturating_mul(HOUR_MS) / MINE_UNITS_PER_HOUR
}

/// How much a miner extracts in the given time at MINE_UNITS_PER_HOUR.
fn mined_amount(elapsed_ms: u64) -> u64 {
    elapsed_ms.saturating_mul(MINE_UNITS_PER_HOUR) / HOUR_MS
}

/// One asteroid size tier (README § Design principles): footprint, how much
/// resource it can hold, and how many the starter field seeds. Mirrors the
/// TS `ASTEROID_TIERS` in `src/asteroid-catalog.ts` — keep the two in sync.
pub struct AsteroidTierEntry {
    /// Wire key — the `tier` string on `AsteroidData`.
    pub tier: &'static str,
    /// Footprint size in tiles (span*span).
    pub span: i64,
    /// Inclusive resource-amount band; with MINE_UNITS_PER_HOUR this bounds
    /// the full-mine duration per tier.
    pub min_amount: u64,
    pub max_amount: u64,
    /// How many of this tier ServerState::new seeds — the rarity knob
    /// (small common, medium uncommon, large rare). Sized for the full
    /// 1000*1000 map: ~1920 asteroids total is one per ~23*23-tile
    /// neighborhood — 4* the P1.9 density, affordable now that the interest
    /// area (ROADMAP P1.13) unloads everything outside a 100*100 window
    /// (~19 in-window asteroids instead of ~5, which felt sparse under the
    /// tighter zoom cap). Still a stub pending real balancing.
    pub seed_count: usize,
    /// Simultaneous mining slots. 1 everywhere today; the large tier may
    /// allow more later (README revisit note), so verification reads this
    /// instead of hardcoding the single-slot rule.
    pub max_miners: usize,
}

pub const ASTEROID_TIERS: &[AsteroidTierEntry] = &[
    AsteroidTierEntry {
        tier: "small",
        span: 1,
        min_amount: 60,
        max_amount: 240,
        seed_count: 1280,
        max_miners: 1,
    },
    AsteroidTierEntry {
        tier: "medium",
        span: 2,
        min_amount: 240,
        max_amount: 960,
        seed_count: 480,
        max_miners: 1,
    },
    AsteroidTierEntry {
        tier: "large",
        span: 3,
        min_amount: 960,
        max_amount: 2880,
        seed_count: 160,
        max_miners: 1,
    },
];

fn asteroid_tier(tier: &str) -> Option<&'static AsteroidTierEntry> {
    ASTEROID_TIERS.iter().find(|t| t.tier == tier)
}

/// An active mining job on an asteroid — which vessel, and the extraction
/// window. At most one per asteroid today (single-slot rule); if large
/// asteroids gain multiple miners later this becomes a list, with one window
/// per miner. Mirrors the TS `AsteroidMining` in `src/game-state.ts` — keep
/// the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AsteroidMining {
    pub vessel_id: String,
    /// Epoch ms when extraction starts — the miner's outbound arrival. The
    /// slot is reserved from dispatch, so this can be in the future.
    pub started_at: u64,
    /// Epoch ms when the remaining deposit is fully mined out; the scheduler
    /// auto-recalls the miner then.
    pub completes_at: u64,
}

/// A minable asteroid on the space map (ROADMAP P1.6). Like motherships,
/// placement is server-owned data seeded in ServerState::new and rendered
/// from the snapshot — but asteroids are mutable: mining depletes
/// `remaining`, and a mined-out asteroid leaves the table (AsteroidRemoved
/// push). Following the ModuleData pattern, the struct doubles as its own
/// event payload: an Asteroid push carries the full current snapshot.
/// Mirrors the TS `AsteroidData` in `src/game-state.ts` — keep the two in
/// sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AsteroidData {
    pub asteroid_id: String,
    /// Size tier, an ASTEROID_TIERS key: "small" | "medium" | "large".
    pub tier: String,
    /// The one resource this asteroid yields. Single-resource by design for
    /// now; if large asteroids gain mixed deposits later this becomes a list.
    pub resource: ResourceKind,
    /// Anchor (top-left) tile of the footprint.
    pub col: i64,
    pub row: i64,
    /// Footprint size in tiles (span*span).
    pub span: i64,
    /// Units originally seeded — lets the client show depletion progress.
    pub total: u64,
    /// Units still minable. Settled at mining boundaries (recall/completion),
    /// not per-tick: mid-mine progress is implicit in `mining.started_at` +
    /// MINE_UNITS_PER_HOUR, like vessel positions are implicit in event
    /// timestamps.
    pub remaining: u64,
    /// The active mining job, if any — present from dispatch (the slot is
    /// reserved so two vessels can't race for it) until recall/completion.
    pub mining: Option<AsteroidMining>,
}

/// Tiny deterministic PRNG (xorshift64) for world seeding — the starter
/// field must be reproducible run-to-run until persistence (P2) stores the
/// world, and a rand dependency isn't worth it for this.
struct SeedRng(u64);

impl SeedRng {
    fn next(&mut self) -> u64 {
        let mut x = self.0;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.0 = x;
        x
    }

    /// Roughly uniform value in [lo, hi] (inclusive). Fine for seeding.
    fn range(&mut self, lo: u64, hi: u64) -> u64 {
        lo + self.next() % (hi - lo + 1)
    }
}

/// True when the two footprints are separated by at least `gap` empty tiles
/// on some axis.
fn footprints_clear(
    (a_col, a_row, a_span): (i64, i64, i64),
    (b_col, b_row, b_span): (i64, i64, i64),
    gap: i64,
) -> bool {
    a_col + a_span + gap <= b_col
        || b_col + b_span + gap <= a_col
        || a_row + a_span + gap <= b_row
        || b_row + b_span + gap <= a_row
}

/// Scatter the starter asteroid field (ROADMAP P1.6): ASTEROID_TIERS
/// seed_counts of each tier, rejection-sampled uniformly across the whole
/// map (July 2026 playtest feedback: resources spread evenly, not clustered
/// around the start — seed_counts are area-scaled to keep local density
/// playable) to keep clear of motherships and each other, with a
/// deterministic RNG so every run gets the same field until persistence
/// (P2) stores the world. Resource kinds are weighted so high-tech shows up
/// least ("rare asteroids", README § Design principles).
fn seed_asteroids(motherships: &HashMap<String, MothershipData>) -> HashMap<String, AsteroidData> {
    /// Tiles kept empty around every mothership (deploy/dock space).
    const MOTHERSHIP_CLEARANCE: i64 = 6;
    /// Tiles kept empty between asteroids.
    const ASTEROID_CLEARANCE: i64 = 2;
    // Rocky (construction) commonest, metallic (high-tech) rarest — README's
    // asteroid classes; display names live in src/asteroid-catalog.ts.
    const RESOURCE_WEIGHTS: [ResourceKind; 8] = [
        ResourceKind::Construction,
        ResourceKind::Construction,
        ResourceKind::Construction,
        ResourceKind::Biological,
        ResourceKind::Biological,
        ResourceKind::Fuel,
        ResourceKind::Fuel,
        ResourceKind::HighTech,
    ];
    let mut rng = SeedRng(0x9E37_79B9_7F4A_7C15);
    let mut asteroids: HashMap<String, AsteroidData> = HashMap::new();
    let mut seq = 0;
    for tier in ASTEROID_TIERS {
        'placement: for _ in 0..tier.seed_count {
            // Rejection-sample a clear spot; a crowded map just places fewer.
            for _attempt in 0..200 {
                let col = rng.range(0, (MAP_COLS - tier.span) as u64) as i64;
                let row = rng.range(0, (MAP_ROWS - tier.span) as u64) as i64;
                let spot = (col, row, tier.span);
                let blocked = motherships
                    .values()
                    .any(|m| !footprints_clear(spot, (m.col, m.row, m.span), MOTHERSHIP_CLEARANCE))
                    || asteroids.values().any(|a| {
                        !footprints_clear(spot, (a.col, a.row, a.span), ASTEROID_CLEARANCE)
                    });
                if blocked {
                    continue;
                }
                seq += 1;
                // Snap to a friendly multiple of 10 within the tier band.
                let amount = rng.range(tier.min_amount, tier.max_amount) / 10 * 10;
                let amount = amount.max(tier.min_amount);
                asteroids.insert(
                    format!("asteroid-{seq}"),
                    AsteroidData {
                        asteroid_id: format!("asteroid-{seq}"),
                        tier: tier.tier.to_string(),
                        resource: RESOURCE_WEIGHTS[(rng.next() % 8) as usize],
                        col,
                        row,
                        span: tier.span,
                        total: amount,
                        remaining: amount,
                        mining: None,
                    },
                );
                continue 'placement;
            }
        }
    }
    asteroids
}

// -- Trading Post deals (ROADMAP P1.12) ---------------------------------------

/// One UTC day in ms. The deal shop resets at fixed 00:00 UTC boundaries
/// (README's "resetting at a fixed point" principle), not a rolling window.
const DAY_MS: u64 = 86_400_000;

/// UTC day index of an epoch-ms timestamp — the `day` in deal ids and the
/// daily-reset boundary test.
fn utc_day_index(now_ms: u64) -> u64 {
    now_ms / DAY_MS
}

/// Credits-per-resource-unit exchange rate. With the four resources still
/// value-equivalent (all balancing is stubbed until P2.5), deal sizing works
/// in "units" and converts a credits side through this. Balancing stub →
/// P2.5.
const CREDITS_PER_RESOURCE_UNIT: u64 = 1;

/// Deal give-side size in units at Trading Post level 1; doubles per level
/// (scale_for_level). Balancing stub → P2.5.
const DEAL_GIVE_BASE_UNITS: u64 = 40;

/// The give side is capped at this fraction of the player's current storage
/// cap for the resource (cap / 5 = 20%) — the single rule that keeps deals
/// affordable at every progression stage and makes "trade a million
/// resources" structurally impossible. Credits are uncapped and skip it.
/// Balancing stub → P2.5.
const DEAL_GIVE_CAP_DIVISOR: u64 = 5;

/// Freebie get-amount band in units (inclusive) — a separate, deliberately
/// small band, not the deal-sizing rule: the daily freebie is a growth
/// nudge, never a big win. Balancing stub → P2.5.
const DEAL_FREEBIE_MIN_UNITS: u64 = 10;
const DEAL_FREEBIE_MAX_UNITS: u64 = 30;

/// Credits cost of each refresh within a day, indexed by refreshes already
/// used: the first is free, then doubling, hard-capped at the array length
/// (5/day). Mirrored display-only as DEAL_REFRESH_COSTS_CREDITS in
/// `src/trade-catalog.ts` — keep the two in sync. Balancing stub → P2.5.
const DEAL_REFRESH_COSTS_CREDITS: [u64; 5] = [0, 10, 20, 40, 80];

/// Deal slot count by Trading Post level: 3 at level 1, +1 every 2 levels,
/// capped at 6. Level 0 (no settled post yet — deals still generate, the
/// shop just can't open) uses the level-1 count. Slot count is server data
/// (the deal list's length) — the client never derives it.
fn deal_slot_count(trading_post_level: u32) -> u32 {
    (3 + trading_post_level.saturating_sub(1) / 2).min(6)
}

/// How player-favorable a deal is: the rarity's bonus multiplies the get
/// side only (the give side keeps the affordability cap). Serializes to the
/// TS `DealRarity` strings in `src/game-state.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "camelCase")]
pub enum DealRarity {
    Common,
    Uncommon,
    Rare,
}

/// (rarity, roll weight out of 100, get-side bonus percent). Weights and
/// bonuses are balancing stubs → P2.5; display styling lives in
/// `src/trade-catalog.ts`.
const DEAL_RARITIES: [(DealRarity, u64, u64); 3] = [
    (DealRarity::Common, 70, 20),
    (DealRarity::Uncommon, 25, 50),
    (DealRarity::Rare, 5, 100),
];

fn rarity_bonus_pct(rarity: DealRarity) -> u64 {
    DEAL_RARITIES
        .iter()
        .find(|(r, ..)| *r == rarity)
        .map(|&(_, _, bonus)| bonus)
        .unwrap_or(0)
}

fn roll_rarity(rng: &mut SeedRng) -> DealRarity {
    let mut roll = rng.range(1, 100);
    for &(rarity, weight, _) in &DEAL_RARITIES {
        if roll <= weight {
            return rarity;
        }
        roll -= weight;
    }
    DealRarity::Common
}

/// One side of a deal: a trade-eligible type and its amount. Mirrors the TS
/// `DealSide` in `src/game-state.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Copy, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DealSide {
    pub kind: TradeKind,
    pub amount: u64,
}

/// One deal slot in the Trading Post shop (ROADMAP P1.12). Give and get
/// types always differ (server-enforced at generation *and* acceptance);
/// `give: None` is the once-daily freebie — refreshes never mint a new one.
/// Mirrors the TS `DealData` in `src/game-state.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DealData {
    /// Stable id: "deal-<day>-<slot>-<generation>" (generation = refreshes
    /// used when this batch was rolled; 0 for the daily set).
    pub deal_id: String,
    /// 0..slots-1, stable within a batch.
    pub slot: u32,
    pub rarity: DealRarity,
    /// What the player pays; None = the daily freebie.
    pub give: Option<DealSide>,
    pub get: DealSide,
    /// Greyed out client-side once true; a refresh replaces the whole batch.
    pub accepted: bool,
}

/// The whole deal-shop state — day, refreshes used, and every current slot.
/// Following the ModuleData pattern, the struct doubles as its own event
/// payload: a deals push/response carries the full current list. Mirrors the
/// TS `DealsData` in `src/game-state.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DealsData {
    pub day_index: u64,
    /// Refreshes used since the daily reset — indexes the doubling cost
    /// table client-side for the Refresh button's price tag.
    pub refreshes_used: u32,
    pub deals: Vec<DealData>,
}

/// Result of a verified accept/refresh request: the full deal state plus the
/// resource counts after the exchange/cost.
#[derive(Serialize, Debug)]
pub struct DealActionResponse {
    pub deals: DealsData,
    pub resources: ResourceCounts,
}

/// Deterministic per-deal RNG seed from (player id, day, slot, generation) —
/// the same reproducibility precedent as seed_asteroids: regeneration is
/// server-cheap and replayable. FNV-1a over the player id, then odd-constant
/// mixing; never 0 (xorshift's fixed point).
fn deal_seed(player_id: &str, day: u64, slot: u32, generation: u32) -> u64 {
    let mut seed: u64 = 0xcbf2_9ce4_8422_2325;
    for byte in player_id.bytes() {
        seed ^= byte as u64;
        seed = seed.wrapping_mul(0x0000_0100_0000_01b3);
    }
    seed ^= day.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    seed ^= (slot as u64 + 1).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    seed ^= (generation as u64 + 1).wrapping_mul(0x94D0_49BB_1331_11EB);
    seed.max(1)
}

/// Units → wire amount for one deal side: a credits side converts through
/// the exchange rate, materials pass through. Never 0.
fn trade_amount(kind: TradeKind, units: u64) -> u64 {
    let amount = match kind {
        TradeKind::Credits => units.saturating_mul(CREDITS_PER_RESOURCE_UNIT),
        _ => units,
    };
    amount.max(1)
}

/// Straight-line travel time between two tile positions at the given speed.
fn travel_time_ms(
    src_col: f64,
    src_row: f64,
    dest_col: f64,
    dest_row: f64,
    speed_px_s: f64,
) -> u64 {
    let dist_px = ((dest_col - src_col) * MAP_TILE_PX).hypot((dest_row - src_row) * MAP_TILE_PX);
    (dist_px / speed_px_s * 1000.0).round() as u64
}

/// Harvested resources riding home on a vessel's return leg — deposited into
/// the player's counts when the vessel docks. Mirrors the TS `VesselCargo`
/// in `src/game-state.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct VesselCargo {
    pub resource: ResourceKind,
    pub amount: u64,
}

/// A vessel movement authorized by the backend — dispatches, recalls, and
/// (in phase 3) moves pushed from other players all use this one shape.
/// `src_col`/`src_row` are fractional for recalls, which depart from the
/// vessel's lerped mid-flight position. Mirrors the TS `VesselMoveEvent` in
/// `src/game-state.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct VesselMoveEventData {
    pub vessel_id: String,
    pub owner_id: String,
    pub owner_name: String,
    pub mothership_id: String,
    pub vessel_type: String,
    pub src_col: f64,
    pub src_row: f64,
    pub dest_col: i64,
    pub dest_row: i64,
    pub speed: f64,
    pub dispatched_at: u64,
    pub arrival_at: u64,
    /// True on a leg built by `return_leg` (recall or mining auto-return),
    /// false on an outbound dispatch. Settling reads this flag rather than
    /// re-deriving "is this a return" from `is_dock_tile` against the
    /// mothership's *current* position — geometry that a future relocation
    /// (voluntary move, P5.8 forced warp) could change between a return's
    /// dispatch and arrival, stranding the vessel (CR1.4).
    pub returning: bool,
    /// Asteroid this vessel is assigned to mine (ROADMAP P1.6) — present on
    /// the outbound leg and while extracting; cleared on the return leg.
    pub mining_asteroid_id: Option<String>,
    /// Harvested resources riding home on a return leg; deposited when the
    /// vessel docks.
    pub cargo: Option<VesselCargo>,
}

/// Progress of a vessel's move at `now_ms`, clamped to [0, 1].
fn move_progress(v: &VesselMoveEventData, now_ms: u64) -> f64 {
    let duration = v.arrival_at.saturating_sub(v.dispatched_at);
    if duration == 0 || now_ms >= v.arrival_at {
        return 1.0;
    }
    now_ms.saturating_sub(v.dispatched_at) as f64 / duration as f64
}

/// A vessel's current fractional tile position at `now_ms`, lerped from its
/// move timestamps — the same math the client's applyVesselMoveEvent uses.
fn vessel_position(v: &VesselMoveEventData, now_ms: u64) -> (f64, f64) {
    let t = move_progress(v, now_ms);
    (
        v.src_col + (v.dest_col as f64 - v.src_col) * t,
        v.src_row + (v.dest_row as f64 - v.src_row) * t,
    )
}

/// One queued push plus the world footprint it concerns, if any. The drain
/// boundary filters entity pushes against the client's interest area
/// (ROADMAP P1.13); footprint-less pushes — global state (resources,
/// notifications) and the player's own entities (modules, own vessels) —
/// always go out.
struct OutboxEntry {
    footprint: Option<(i64, i64, i64)>,
    push: ServerPush,
}

/// Authoritative per-player state, held in memory for the app's lifetime.
/// Phase 2 serializes it to a save file; the phase-3 server owns it remotely.
pub struct ServerState {
    resources: ResourceCounts,
    /// Epoch ms of the last applied production-interval boundary. Production
    /// accrues lazily in whole intervals whenever state is read or mutated,
    /// so no background timer thread is needed.
    last_production_at: u64,
    /// Every module in the ship, built or under construction, keyed by module
    /// id — the single source of truth for the ship's catalog state (the
    /// client renders the snapshot, Command Module included).
    modules: HashMap<String, ModuleData>,
    /// Monotonic sequence mixed into module ids for uniqueness.
    next_module_seq: u64,
    /// Every mothership on the map, keyed by mothership id — the single
    /// source of truth for placement (the client renders the snapshot).
    motherships: HashMap<String, MothershipData>,
    /// Every vessel in flight or parked, keyed by vessel id, each holding its
    /// latest authorized move. Time-based state is implicit in the event
    /// timestamps, so nothing ticks: vessels that finish a return onto a dock
    /// tile are pruned lazily on read/mutation (like production accrual).
    vessels: HashMap<String, VesselMoveEventData>,
    /// Monotonic sequence mixed into vessel ids for uniqueness.
    next_vessel_seq: u64,
    /// Every asteroid still holding resources, keyed by asteroid id — the
    /// single source of truth for the field (the client renders the
    /// snapshot). Mined-out asteroids are removed outright.
    asteroids: HashMap<String, AsteroidData>,
    /// Vessels whose current move's arrival has already produced its feed
    /// notification — parked vessels stay in the table, so without this every
    /// settle pass would re-announce them. An id leaves the set when its
    /// vessel despawns or is recalled (the redirect makes it in-flight again).
    notified_arrivals: HashSet<String>,
    /// Ship's crew head count (ROADMAP P1.10). Capacity derives from the
    /// module table (crew_capacity); the pooled staffing ratio against
    /// crew_required damps producer output in accrue_production.
    crew: u32,
    /// The one crew recruitment in flight, if any — same timer shape as a
    /// module's pending build, settled by settle_hire.
    pending_hire: Option<PendingHire>,
    /// The player's event feed (ROADMAP P1.5), oldest first, capped at
    /// MAX_NOTIFICATIONS. Server-owned like everything else: it rides the
    /// snapshot, so a reload restores the feed and its unread state.
    notifications: Vec<NotificationData>,
    /// Monotonic sequence mixed into notification ids for uniqueness.
    next_notification_seq: u64,
    /// The Trading Post deal shop (ROADMAP P1.12): the current day's deal
    /// slots. Regenerated at every UTC-day boundary (settle_deals) and by
    /// refreshes; deterministic per (player, day, slot, generation).
    deals: Vec<DealData>,
    /// UTC day index the current deal batch belongs to — settle_deals rolls
    /// the shop over when a later day starts.
    deals_day_index: u64,
    /// Refreshes used since the daily reset — indexes the doubling cost
    /// table, hard-capped at its length.
    deal_refreshes_used: u32,
    /// The client's interest-area window (ROADMAP P1.13) — snapshot slices
    /// and entity pushes are filtered against it, own entities exempt.
    /// Single-client today; the phase-3 server keeps one per connection.
    aoi: MapWindow,
    /// Pushes queued by mutations since the last drain. Mutations queue,
    /// boundaries (scheduler wake / command return) drain and emit — so every
    /// settlement path broadcasts identically, whoever triggered it.
    outbox: Vec<OutboxEntry>,
    /// True when resource counts changed since the last drain; drain_pushes
    /// appends one Resources push carrying the final counts, so several
    /// accruals/spends inside one mutation collapse into a single push.
    resources_dirty: bool,
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

    /// The requesting player's own mothership — dispatch departs from it.
    fn player_mothership(&self) -> Result<&MothershipData, String> {
        self.motherships
            .get(&player_identity().id)
            .ok_or_else(|| "player has no mothership".to_string())
    }

    /// How many vessels the requesting player currently has in the table
    /// (in flight, parked, or mining) — the fleet-cap check's input.
    fn player_vessel_count(&self) -> usize {
        let player_id = player_identity().id;
        self.vessels
            .values()
            .filter(|v| v.owner_id == player_id)
            .count()
    }

    /// The module already occupying the given room, if any — a build target
    /// must land on a free room.
    fn room_occupant(&self, room: (i64, i64)) -> Option<&ModuleData> {
        self.modules
            .values()
            .find(|m| room_origin_at(m.col, m.row) == Some(room))
    }

    /// The Command Module's current level, or 0 if it somehow doesn't exist
    /// yet — every other type's unlock and level cap read from this.
    fn command_level(&self) -> u32 {
        self.modules
            .values()
            .find(|m| m.module_type == COMMAND_MODULE_TYPE)
            .map(|m| m.level)
            .unwrap_or(0)
    }

    /// Total storage cap per resource (ROADMAP P1.11): the sum of every
    /// module's catalog `stores` contribution scaled by its settled level —
    /// a build/upgrade raises the cap only once it settles, like production.
    /// Credits are trade-only and uncapped (their economy is P1.12/P4.6
    /// design), expressed here as a u64::MAX cap.
    fn storage_caps(&self) -> ResourceCounts {
        let mut caps = ResourceCounts {
            construction: 0,
            high_tech: 0,
            biological: 0,
            fuel: 0,
            credits: u64::MAX,
        };
        for module in self.modules.values() {
            let Some(entry) = catalog_entry(&module.module_type) else {
                continue;
            };
            for &(kind, base) in entry.stores {
                caps.add(kind, scale_for_level(base, module.level));
            }
        }
        caps
    }

    /// Total crew berths (ROADMAP P1.10): every module's catalog
    /// `crew_capacity_per_level` times its settled level, summed linearly —
    /// a build/upgrade adds berths only once it settles, like storage caps.
    fn crew_capacity(&self) -> u32 {
        self.modules
            .values()
            .filter_map(|m| {
                catalog_entry(&m.module_type)
                    .map(|e| e.crew_capacity_per_level.saturating_mul(m.level))
            })
            .sum()
    }

    /// Ship-wide crew demand (ROADMAP P1.10): every module's catalog
    /// `crew_required_per_level` times its settled level, summed linearly.
    /// The pooled staffing ratio against this damps producer output.
    fn crew_required(&self) -> u32 {
        self.modules
            .values()
            .filter_map(|m| {
                catalog_entry(&m.module_type)
                    .map(|e| e.crew_required_per_level.saturating_mul(m.level))
            })
            .sum()
    }

    fn crew_data(&self) -> CrewData {
        CrewData {
            crew: self.crew,
            pending_hire: self.pending_hire.clone(),
        }
    }

    /// Verify and execute a hire request (ROADMAP P1.10): one recruitment at
    /// a time, the new head must fit the berths (a pending hire counts
    /// against them), and the biological cost — linear in the new head count
    /// — must be affordable. Deducts the cost and returns the crew state
    /// with the recruitment pending.
    fn hire_crew(&mut self, now_ms: u64) -> Result<CrewActionResponse, String> {
        self.accrue_production(now_ms);
        self.settle_hire(now_ms);
        if self.pending_hire.is_some() {
            return Err("a crew member is already being recruited".to_string());
        }
        let capacity = self.crew_capacity();
        if self.crew + 1 > capacity {
            return Err(format!(
                "no berths free: crew {} of {capacity} — build or upgrade Crew Quarters",
                self.crew
            ));
        }
        let cost = HIRE_COST_BIOLOGICAL.saturating_mul(self.crew as u64 + 1);
        self.resources.spend(ResourceKind::Biological, cost)?;
        self.resources_dirty = true;
        self.pending_hire = Some(PendingHire {
            dispatched_at: now_ms,
            completes_at: now_ms + HIRE_TIME_MS,
        });
        Ok(CrewActionResponse {
            crew: self.crew_data(),
            resources: self.resources,
        })
    }

    /// Complete a recruitment whose timer has run out (ROADMAP P1.10):
    /// production must already be settled to the completion moment (see
    /// settle() / hire_crew ordering) so the staffing-ratio change is never
    /// credited retroactively. Queues the Crew push and a feed notification.
    fn settle_hire(&mut self, now_ms: u64) {
        let Some(pending) = &self.pending_hire else {
            return;
        };
        if now_ms < pending.completes_at {
            return;
        }
        let completed_at = pending.completes_at;
        self.crew += 1;
        self.pending_hire = None;
        // Crew is the player's own ship state — never interest-area
        // filtered.
        self.queue_push(ServerPush::Crew(self.crew_data()));
        self.push_notification(
            "crew-hired",
            format!("A new crew member came aboard ({} total)", self.crew),
            completed_at,
        );
    }

    /// Queue a push that always reaches the client — global state (resources,
    /// notifications) or the player's own entities (modules, own vessels),
    /// which are exempt from interest-area filtering (ROADMAP P1.13).
    fn queue_push(&mut self, push: ServerPush) {
        self.outbox.push(OutboxEntry {
            footprint: None,
            push,
        });
    }

    /// Queue a push about a world entity at the given (col, row, span)
    /// footprint — dropped at drain time when the footprint lies outside the
    /// client's interest area (ROADMAP P1.13).
    fn queue_entity_push(&mut self, footprint: (i64, i64, i64), push: ServerPush) {
        self.outbox.push(OutboxEntry {
            footprint: Some(footprint),
            push,
        });
    }

    /// Append a notification to the feed (dropping the oldest past the cap)
    /// and queue its live push.
    fn push_notification(&mut self, kind: &str, message: String, now_ms: u64) {
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

    /// Promote every module whose pending build/upgrade has finished — lazy
    /// settlement on read/mutation plus eager settlement from the scheduler
    /// thread. Each promotion queues a Module push (so the client flips the
    /// actor to its new level without asking) and a feed notification
    /// (ROADMAP P1.5).
    fn settle_modules(&mut self, now_ms: u64) {
        let mut settled = Vec::new();
        for module in self.modules.values_mut() {
            if let Some(pending) = &module.pending {
                if now_ms >= pending.completes_at {
                    module.level = pending.level;
                    module.pending = None;
                    settled.push(module.clone());
                }
            }
        }
        for module in &settled {
            let name = catalog_entry(&module.module_type)
                .map(|e| e.display_name)
                .unwrap_or(&module.module_type);
            let (kind, message) = if module.level == 1 {
                ("build-complete", format!("{name} construction complete"))
            } else {
                (
                    "levelup-complete",
                    format!("{name} upgraded to level {}", module.level),
                )
            };
            // Modules are the player's own ship interior — always exempt
            // from interest-area filtering.
            self.queue_push(ServerPush::Module(module.clone()));
            self.push_notification(kind, message, now_ms);
        }
        // A Trading Post level-up can raise the deal slot count mid-batch —
        // make the reward visible now rather than at the next reroll
        // (ROADMAP P1.12).
        if settled
            .iter()
            .any(|m| m.module_type == TRADING_POST_MODULE_TYPE)
        {
            self.top_up_deal_slots();
        }
    }

    /// Append fresh deal slots when the Trading Post's settled level raised
    /// the slot count mid-batch (ROADMAP P1.12), so the level-up reward shows
    /// up immediately. Only appends — existing deals (and their accepted
    /// state) are never rerolled: a free reroll on level-up would bypass the
    /// refresh cost. New slots roll deterministically at the current
    /// (day, generation) like the rest of the batch, and are never a freebie.
    fn top_up_deal_slots(&mut self) {
        let slots = deal_slot_count(self.trading_post_level()) as usize;
        if self.deals.len() >= slots {
            return;
        }
        for slot in self.deals.len()..slots {
            let deal = self.generate_deal(
                self.deals_day_index,
                slot as u32,
                self.deal_refreshes_used,
                false,
            );
            self.deals.push(deal);
        }
        // Deals are the player's own shop state — never interest-area
        // filtered.
        self.queue_push(ServerPush::Deals(self.deals_data()));
    }

    /// Accrue production for every whole interval elapsed since the last
    /// applied tick, summed across every settled (level >= 1) module's
    /// catalog `produces` entry, scaled by its current level. Each resource
    /// accrues only up to its storage cap (ROADMAP P1.11) — production past
    /// the cap is lost. A clock that went backwards re-anchors instead of
    /// freezing production. Credits are earned through trade (P1.12), never
    /// produced.
    fn accrue_production(&mut self, now_ms: u64) {
        if now_ms < self.last_production_at {
            self.last_production_at = now_ms;
            self.settle_modules(now_ms);
            return;
        }
        let interval_start = self.last_production_at;
        let ticks = (now_ms - interval_start) / PRODUCTION_TICK_MS;
        if ticks == 0 {
            self.settle_modules(now_ms);
            return;
        }
        self.resources_dirty = true;
        // Storage caps (ROADMAP P1.11) read the levels as of the window
        // start: a Storage Bay that settles partway through this window only
        // raises the cap from the next accrual on — stub precision, fine at
        // a 5 s tick.
        let caps = self.storage_caps();
        // The crew staffing ratio (ROADMAP P1.10) reads the same window-start
        // state — head count and demand as of the last settle. A hire or
        // level-up completing mid-window shifts the ratio only from the next
        // accrual on (settle_hire runs after this, and the scheduler wakes at
        // those deadlines anyway, so straddling windows stay tiny) — the same
        // stub precision as the caps above.
        let required = self.crew_required();
        let staffed = self.crew.min(required);
        // Settling (bumping `level`) happens only after this loop: a module
        // whose pending build/upgrade completes partway through this window
        // must be credited its OLD level for the whole ticks fully elapsed
        // before completion, and its NEW level only for the ticks after —
        // never its new level retroactively for time it hadn't reached yet.
        for module in self.modules.values() {
            let (old_level, new_level, old_ticks) = match &module.pending {
                Some(p) if p.completes_at > interval_start && p.completes_at <= now_ms => {
                    let elapsed_before = p.completes_at - interval_start;
                    (
                        module.level,
                        p.level,
                        (elapsed_before / PRODUCTION_TICK_MS).min(ticks),
                    )
                }
                // Already due to settle at (or before) the start of this
                // window — e.g. a caller settled it directly in between
                // accrue_production calls — so it's effectively at its
                // pending level for the entire window.
                Some(p) if p.completes_at <= interval_start => (p.level, p.level, 0),
                // No pending, or still pending past the end of this window:
                // one level for the whole window.
                _ => (module.level, module.level, ticks),
            };
            let new_ticks = ticks - old_ticks;
            let Some(entry) = catalog_entry(&module.module_type) else {
                continue;
            };
            // Only modules that want crew are damped by the staffing ratio
            // (ROADMAP P1.10) — the Command Module's baseline production
            // (crew_required_per_level 0) always runs at full output.
            let damped = entry.crew_required_per_level > 0;
            let (damp_staffed, damp_required) = if damped { (staffed, required) } else { (0, 0) };
            if old_level > 0 && old_ticks > 0 {
                for &(kind, base) in entry.produces {
                    let amount = scale_for_level(base, old_level) * old_ticks;
                    let amount = crew_scaled(amount, damp_staffed, damp_required);
                    self.resources.add_capped(kind, amount, caps.get(kind));
                }
            }
            if new_level > 0 && new_ticks > 0 {
                for &(kind, base) in entry.produces {
                    let amount = scale_for_level(base, new_level) * new_ticks;
                    let amount = crew_scaled(amount, damp_staffed, damp_required);
                    self.resources.add_capped(kind, amount, caps.get(kind));
                }
            }
        }
        self.last_production_at += ticks * PRODUCTION_TICK_MS;
        self.settle_modules(now_ms);
    }

    /// Verify and execute a build request: the type must be a real,
    /// non-Command catalog entry unlocked by the current Command Module
    /// level, the spot must be the free canonical anchor of a room, and the
    /// player must afford the level-1 cost. Deducts the cost and returns the
    /// new module (level 0, pending its first completion).
    fn build_module(
        &mut self,
        col: i64,
        row: i64,
        module_type: String,
        now_ms: u64,
    ) -> Result<ModuleActionResponse, String> {
        self.accrue_production(now_ms);
        let entry = catalog_entry(&module_type)
            .ok_or_else(|| format!("unknown module type: {module_type:?}"))?;
        if entry.module_type == COMMAND_MODULE_TYPE {
            return Err("the Command Module is already built".to_string());
        }
        if entry.unlock_command_level > self.command_level() {
            return Err(format!(
                "{} requires Command Module level {}",
                entry.display_name, entry.unlock_command_level
            ));
        }
        let anchor = module_anchor_at(col, row).ok_or("build spot is not inside a room")?;
        if anchor != (col, row) {
            return Err(format!(
                "({col}, {row}) is not a module anchor; expected {anchor:?}"
            ));
        }
        let room = room_origin_at(col, row).expect("anchor implies a room");
        if self.room_occupant(room).is_some() {
            return Err(format!("room at {room:?} already has a module"));
        }
        let cost = scale_for_level(entry.base_cost_construction, 1);
        self.resources.spend(ResourceKind::Construction, cost)?;
        self.resources_dirty = true;
        self.next_module_seq += 1;
        let player = player_identity();
        let module = ModuleData {
            module_id: format!("module-{}-{}", now_ms, self.next_module_seq),
            owner_id: player.id,
            owner_name: player.name,
            module_type,
            col,
            row,
            level: 0,
            pending: Some(ModulePendingBuild {
                level: 1,
                dispatched_at: now_ms,
                completes_at: now_ms + scale_for_level(entry.base_build_time_ms, 1),
            }),
        };
        self.modules
            .insert(module.module_id.clone(), module.clone());
        Ok(ModuleActionResponse {
            module,
            resources: self.resources,
        })
    }

    /// Verify and execute a level-up: the module must exist, belong to the
    /// player, and not already have a build/upgrade pending; a non-Command
    /// module additionally can't level past the Command Module's own level
    /// (README § Ship design: the Command Module gates everyone else's max
    /// level). Cost and build time scale with the target level (doubling
    /// stub, `scale_for_level`); production scales the same way once the
    /// level-up settles, since `accrue_production` reads the current level.
    fn levelup_module(
        &mut self,
        module_id: &str,
        now_ms: u64,
    ) -> Result<ModuleActionResponse, String> {
        self.accrue_production(now_ms);
        let (owner_id, module_type, current_level, pending) = {
            let module = self
                .modules
                .get(module_id)
                .ok_or_else(|| format!("unknown module: {module_id:?}"))?;
            (
                module.owner_id.clone(),
                module.module_type.clone(),
                module.level,
                module.pending.is_some(),
            )
        };
        if owner_id != player_identity().id {
            return Err(format!("module {module_id:?} belongs to another player"));
        }
        if pending {
            return Err(format!(
                "module {module_id:?} is already under construction"
            ));
        }
        let entry = catalog_entry(&module_type)
            .ok_or_else(|| format!("unknown module type: {module_type:?}"))?;
        let next_level = current_level + 1;
        if entry.module_type != COMMAND_MODULE_TYPE && next_level > self.command_level() {
            return Err(format!(
                "{} cannot exceed the Command Module's level ({})",
                entry.display_name,
                self.command_level()
            ));
        }
        let cost = scale_for_level(entry.base_cost_construction, next_level);
        self.resources.spend(ResourceKind::Construction, cost)?;
        self.resources_dirty = true;
        let completes_at = now_ms + scale_for_level(entry.base_build_time_ms, next_level);
        let module = self
            .modules
            .get_mut(module_id)
            .expect("existence checked above");
        module.pending = Some(ModulePendingBuild {
            level: next_level,
            dispatched_at: now_ms,
            completes_at,
        });
        Ok(ModuleActionResponse {
            module: module.clone(),
            resources: self.resources,
        })
    }

    /// Every module, in stable id order — the modules slice of the
    /// load_game_state snapshot.
    fn modules_snapshot(&mut self, now_ms: u64) -> Vec<ModuleData> {
        self.settle_modules(now_ms);
        let mut modules: Vec<_> = self.modules.values().cloned().collect();
        modules.sort_by(|a, b| a.module_id.cmp(&b.module_id));
        modules
    }

    /// Settle every vessel whose current move has arrived: each un-notified
    /// arrival queues a feed notification (ROADMAP P1.5), stamped with
    /// `vessel.arrival_at` rather than `now_ms` — like `settle_mining` below,
    /// so a lazily settled arrival still gets the feed timestamp of when it
    /// actually happened, not when the server got around to noticing. A
    /// vessel finishing a return leg (`vessel.returning`, set by
    /// `return_leg`) additionally despawns (mirroring the arrival handling in
    /// applyVesselMoveEvent, src/map-level.ts) with a VesselRemoved push so
    /// clients drop it from their tables — depositing any cargo it carried
    /// into the resource counts (ROADMAP P1.6: the mining loop's payoff).
    /// Vessels parked at any other destination persist until recalled. Runs
    /// lazily on read/mutation plus eagerly from the scheduler thread, like
    /// production accrual.
    fn settle_vessel_arrivals(&mut self, now_ms: u64) {
        let arrived: Vec<VesselMoveEventData> = self
            .vessels
            .values()
            .filter(|v| now_ms >= v.arrival_at && !self.notified_arrivals.contains(&v.vessel_id))
            .cloned()
            .collect();
        for vessel in arrived {
            let docked = vessel.returning;
            if docked {
                self.vessels.remove(&vessel.vessel_id);
                self.notified_arrivals.remove(&vessel.vessel_id);
                let message = match &vessel.cargo {
                    Some(cargo) => {
                        // Deposit clamps at the storage cap (ROADMAP P1.11);
                        // whatever doesn't fit is lost, and the notification
                        // says so.
                        let cap = self.storage_caps().get(cargo.resource);
                        let accepted = self.resources.add_capped(cargo.resource, cargo.amount, cap);
                        if accepted > 0 {
                            self.resources_dirty = true;
                        }
                        let name = resource_display_name(cargo.resource);
                        let lost = cargo.amount - accepted;
                        if lost > 0 {
                            format!(
                                "Vessel returned with {accepted} {name} — storage full, {lost} lost"
                            )
                        } else {
                            format!("Vessel returned with {accepted} {name}")
                        }
                    }
                    None => "Vessel returned to the mothership".to_string(),
                };
                self.push_notification("vessel-returned", message, vessel.arrival_at);
                // Own vessel (the only kind until P3) — exempt from
                // interest-area filtering.
                self.queue_push(ServerPush::VesselRemoved {
                    vessel_id: vessel.vessel_id,
                });
            } else {
                self.notified_arrivals.insert(vessel.vessel_id.clone());
                let (kind, message) = if vessel.mining_asteroid_id.is_some() {
                    (
                        "mining-started",
                        format!(
                            "Vessel started mining at ({}, {})",
                            vessel.dest_col, vessel.dest_row
                        ),
                    )
                } else {
                    (
                        "vessel-arrived",
                        format!(
                            "Vessel arrived at ({}, {})",
                            vessel.dest_col, vessel.dest_row
                        ),
                    )
                };
                self.push_notification(kind, message, vessel.arrival_at);
            }
        }
    }

    /// Verify and execute a vessel dispatch: the destination must be on the
    /// map and not a docking tile (arriving on a dock despawns the vessel —
    /// that's what recalls are for). The departure dock, speed, and arrival
    /// time are all derived here; the returned event is authoritative and
    /// already recorded, so the next load_game_state snapshot includes it.
    fn dispatch_vessel(
        &mut self,
        dest_col: i64,
        dest_row: i64,
        now_ms: u64,
    ) -> Result<VesselMoveEventData, String> {
        self.settle_vessel_arrivals(now_ms);
        let ship = self.player_mothership()?;
        if !(0..MAP_COLS).contains(&dest_col) || !(0..MAP_ROWS).contains(&dest_row) {
            return Err(format!("({dest_col}, {dest_row}) is outside the map"));
        }
        if is_dock_tile(ship, dest_col, dest_row) {
            return Err(format!("({dest_col}, {dest_row}) is a docking tile"));
        }
        if self.player_vessel_count() >= MAX_VESSELS {
            return Err(format!("fleet limit reached ({MAX_VESSELS} vessels)"));
        }
        let (src_col, src_row) = closest_dock_tile(ship, dest_col as f64, dest_row as f64);
        let mothership_id = ship.mothership_id.clone();
        let event = self.outbound_leg(
            mothership_id,
            src_col as f64,
            src_row as f64,
            dest_col,
            dest_row,
            now_ms,
            None,
        );
        self.vessels.insert(event.vessel_id.clone(), event.clone());
        Ok(event)
    }

    /// Verify and execute a mining dispatch (ROADMAP P1.6): the asteroid must
    /// exist (a mined-out one has already left the table) and have a free
    /// mining slot. The slot is reserved immediately — an in-transit miner
    /// counts as occupying it, so two vessels can't race for one deposit —
    /// and the extraction window is derived here: it starts on arrival and
    /// ends when the remaining deposit is exhausted (the scheduler
    /// auto-recalls the miner then; an early player recall harvests
    /// proportionally instead). The asteroid change goes out as a push; the
    /// returned vessel event is authoritative like any dispatch.
    fn mine_asteroid(
        &mut self,
        asteroid_id: &str,
        now_ms: u64,
    ) -> Result<VesselMoveEventData, String> {
        self.settle_mining(now_ms);
        self.settle_vessel_arrivals(now_ms);
        let ship = self.player_mothership()?.clone();
        let asteroid = self
            .asteroids
            .get(asteroid_id)
            .ok_or_else(|| format!("unknown asteroid: {asteroid_id:?}"))?;
        // Single-slot rule: `mining` holds at most one job today, so any job
        // means the tier's max_miners (1 everywhere) is reached. When large
        // asteroids allow more, this becomes a count-vs-max_miners check.
        let max_miners = asteroid_tier(&asteroid.tier).map_or(1, |t| t.max_miners);
        if asteroid.mining.iter().count() >= max_miners {
            return Err(format!(
                "asteroid {asteroid_id:?} already has a vessel mining it"
            ));
        }
        if self.player_vessel_count() >= MAX_VESSELS {
            return Err(format!("fleet limit reached ({MAX_VESSELS} vessels)"));
        }
        // Fly to the footprint tile closest to the departure dock.
        let center_col = asteroid.col as f64 + asteroid.span as f64 / 2.0;
        let center_row = asteroid.row as f64 + asteroid.span as f64 / 2.0;
        let (src_col, src_row) = closest_dock_tile(&ship, center_col, center_row);
        let dest_col = (src_col).clamp(asteroid.col, asteroid.col + asteroid.span - 1);
        let dest_row = (src_row).clamp(asteroid.row, asteroid.row + asteroid.span - 1);
        let remaining = asteroid.remaining;
        let event = self.outbound_leg(
            ship.mothership_id.clone(),
            src_col as f64,
            src_row as f64,
            dest_col,
            dest_row,
            now_ms,
            Some(asteroid_id.to_string()),
        );
        let asteroid = self
            .asteroids
            .get_mut(asteroid_id)
            .expect("existence checked above");
        asteroid.mining = Some(AsteroidMining {
            vessel_id: event.vessel_id.clone(),
            started_at: event.arrival_at,
            completes_at: event.arrival_at + mine_duration_ms(remaining),
        });
        let snapshot = asteroid.clone();
        self.queue_entity_push(
            (snapshot.col, snapshot.row, snapshot.span),
            ServerPush::Asteroid(snapshot),
        );
        self.vessels.insert(event.vessel_id.clone(), event.clone());
        Ok(event)
    }

    /// End the given vessel's mining job on an asteroid and harvest what it
    /// extracted so far — the full remainder when the window ran to
    /// completion, a time-proportional share on an early recall, nothing if
    /// the vessel never arrived. Depletes the asteroid (removing it outright
    /// at zero, with the AsteroidRemoved push and feed entry) and returns the
    /// cargo to stamp on the vessel's return leg. No-op when the asteroid is
    /// gone or the job belongs to a different vessel.
    fn stop_mining(
        &mut self,
        asteroid_id: &str,
        vessel_id: &str,
        now_ms: u64,
    ) -> Option<VesselCargo> {
        let asteroid = self.asteroids.get_mut(asteroid_id)?;
        match &asteroid.mining {
            Some(mining) if mining.vessel_id == vessel_id => {}
            _ => return None,
        }
        let mining = asteroid.mining.take().expect("matched above");
        // A window that ran to completion harvests the whole remainder
        // outright: deriving it from elapsed time floors (mined_amount), and
        // whenever amount * HOUR_MS isn't divisible by the rate that would
        // strand a husk asteroid holding the rounding remainder. Partial
        // recalls floor deliberately — the remainder stays minable.
        let harvested = if now_ms >= mining.completes_at {
            asteroid.remaining
        } else {
            let elapsed = now_ms.saturating_sub(mining.started_at);
            mined_amount(elapsed).min(asteroid.remaining)
        };
        asteroid.remaining -= harvested;
        let resource = asteroid.resource;
        // Footprint captured before a depleted asteroid leaves the table —
        // its removal push is interest-area filtered like any entity push.
        let footprint = (asteroid.col, asteroid.row, asteroid.span);
        let snapshot = asteroid.clone();
        if snapshot.remaining == 0 {
            self.asteroids.remove(asteroid_id);
            self.push_notification(
                "asteroid-depleted",
                format!(
                    "Asteroid mined out — {} {} deposit at ({}, {})",
                    snapshot.tier,
                    resource_display_name(resource),
                    footprint.0,
                    footprint.1
                ),
                now_ms,
            );
            self.queue_entity_push(
                footprint,
                ServerPush::AsteroidRemoved {
                    asteroid_id: asteroid_id.to_string(),
                },
            );
        } else {
            self.queue_entity_push(footprint, ServerPush::Asteroid(snapshot));
        }
        (harvested > 0).then_some(VesselCargo {
            resource,
            amount: harvested,
        })
    }

    /// Auto-recall every miner whose extraction window has run out
    /// (ROADMAP P1.6): harvest the full remainder, put the vessel on a
    /// return leg stamped with the cargo, and let stop_mining remove the
    /// now-empty asteroid. The leg is timestamped at the completion moment,
    /// not the settle time, so a client that was away sees the vessel where
    /// it really is — the same aged-event lerp recalls rely on. Runs lazily
    /// on read/mutation plus eagerly from the scheduler thread.
    fn settle_mining(&mut self, now_ms: u64) {
        let due: Vec<(String, AsteroidMining)> = self
            .asteroids
            .values()
            .filter_map(|a| {
                a.mining
                    .clone()
                    .filter(|m| now_ms >= m.completes_at)
                    .map(|m| (a.asteroid_id.clone(), m))
            })
            .collect();
        for (asteroid_id, mining) in due {
            // Announce before stop_mining so the feed reads completion →
            // depletion. A full window always harvests exactly the remainder
            // (the window length was derived from it).
            if let Some(asteroid) = self.asteroids.get(&asteroid_id) {
                self.push_notification(
                    "mining-complete",
                    format!(
                        "Mining complete — vessel returning with {} {}",
                        asteroid.remaining,
                        resource_display_name(asteroid.resource)
                    ),
                    mining.completes_at,
                );
            }
            let cargo = self.stop_mining(&asteroid_id, &mining.vessel_id, mining.completes_at);
            let Some(vessel) = self.vessels.get_mut(&mining.vessel_id) else {
                continue;
            };
            vessel.mining_asteroid_id = None;
            vessel.cargo = cargo;
            let vessel = vessel.clone();
            // Send it home; if the mothership is somehow gone the vessel just
            // stays parked with its cargo until a later recall succeeds.
            let event = match self.return_leg(&vessel, mining.completes_at) {
                Ok(event) => event,
                Err(_) => vessel,
            };
            self.notified_arrivals.remove(&event.vessel_id);
            self.vessels.insert(event.vessel_id.clone(), event.clone());
            // Own vessel (the only kind until P3) — exempt from
            // interest-area filtering.
            self.queue_push(ServerPush::Vessel(event));
        }
    }

    /// The return-home leg for a vessel at `at_ms`, departing from its lerped
    /// current position toward the closest docking tile — shared by player
    /// recalls and the mining auto-return. Pure derivation: recording the
    /// event and notification bookkeeping stay with the caller.
    fn return_leg(
        &self,
        vessel: &VesselMoveEventData,
        at_ms: u64,
    ) -> Result<VesselMoveEventData, String> {
        let ship = self.motherships.get(&vessel.mothership_id).ok_or_else(|| {
            format!(
                "vessel {:?} has no mothership to return to",
                vessel.vessel_id
            )
        })?;
        let (src_col, src_row) = vessel_position(vessel, at_ms);
        let (dock_col, dock_row) = closest_dock_tile(ship, src_col, src_row);
        Ok(VesselMoveEventData {
            src_col,
            src_row,
            dest_col: dock_col,
            dest_row: dock_row,
            dispatched_at: at_ms,
            arrival_at: at_ms
                + travel_time_ms(
                    src_col,
                    src_row,
                    dock_col as f64,
                    dock_row as f64,
                    vessel.speed,
                ),
            returning: true,
            mining_asteroid_id: None,
            ..vessel.clone()
        })
    }

    /// A fresh outward leg for a newly dispatched vessel — shared by
    /// `dispatch_vessel` and `mine_asteroid`, which differ only in
    /// destination derivation and whether a mining job is attached. Assigns
    /// the vessel id and owner identity, derives arrival time from speed and
    /// distance, and stamps `returning: false`. Recording the event in
    /// `self.vessels` stays with the caller.
    fn outbound_leg(
        &mut self,
        mothership_id: String,
        src_col: f64,
        src_row: f64,
        dest_col: i64,
        dest_row: i64,
        now_ms: u64,
        mining_asteroid_id: Option<String>,
    ) -> VesselMoveEventData {
        self.next_vessel_seq += 1;
        let player = player_identity();
        VesselMoveEventData {
            vessel_id: format!("vessel-{}-{}", now_ms, self.next_vessel_seq),
            owner_id: player.id,
            owner_name: player.name,
            mothership_id,
            vessel_type: VESSEL_TYPE.to_string(),
            src_col,
            src_row,
            dest_col,
            dest_row,
            speed: VESSEL_SPEED_PX_S,
            dispatched_at: now_ms,
            arrival_at: now_ms
                + travel_time_ms(
                    src_col,
                    src_row,
                    dest_col as f64,
                    dest_row as f64,
                    VESSEL_SPEED_PX_S,
                ),
            returning: false,
            mining_asteroid_id,
            cargo: None,
        }
    }

    /// Verify and execute a recall: the vessel must exist and belong to the
    /// requesting player. The return leg departs from the vessel's current
    /// (lerped, possibly fractional) position toward the closest docking
    /// tile; arriving there despawns it (see settle_vessel_arrivals). A
    /// vessel recalled off a mining job harvests proportionally to the time
    /// it spent extracting (ROADMAP P1.6) — the partial cargo rides the
    /// return leg; recalling before it ever reached the asteroid just frees
    /// the slot.
    fn recall_vessel(
        &mut self,
        vessel_id: &str,
        now_ms: u64,
    ) -> Result<VesselMoveEventData, String> {
        // A job whose window already ran out is settled first — its full
        // harvest and auto-return happened at completes_at; the recall then
        // legally redirects the return leg (cargo intact).
        self.settle_mining(now_ms);
        self.settle_vessel_arrivals(now_ms);
        let vessel = self
            .vessels
            .get(vessel_id)
            .ok_or_else(|| format!("unknown vessel: {vessel_id:?}"))?
            .clone();
        if vessel.owner_id != player_identity().id {
            return Err(format!("vessel {vessel_id:?} belongs to another player"));
        }
        let mut event = self.return_leg(&vessel, now_ms)?;
        if let Some(asteroid_id) = &vessel.mining_asteroid_id {
            event.cargo = self.stop_mining(asteroid_id, vessel_id, now_ms);
        }
        // The redirect puts the vessel back in flight: its next arrival is a
        // fresh event for the notification bookkeeping.
        self.notified_arrivals.remove(vessel_id);
        self.vessels.insert(vessel_id.to_string(), event.clone());
        Ok(event)
    }

    /// Every mothership the client should hold (ROADMAP P1.13): the player's
    /// own anywhere, everyone else's only inside the interest area. Stable
    /// id order — the placement slice of snapshots and window responses.
    fn motherships_snapshot(&self) -> Vec<MothershipData> {
        let player_id = player_identity().id;
        let mut ships: Vec<_> = self
            .motherships
            .values()
            .filter(|m| m.owner_id == player_id || self.aoi.intersects(m.col, m.row, m.span))
            .cloned()
            .collect();
        ships.sort_by(|a, b| a.mothership_id.cmp(&b.mothership_id));
        ships
    }

    /// Every vessel the client should hold, in dispatch order: the player's
    /// own anywhere (a mining vessel must keep existing beyond the window
    /// edge), foreign ones only while their current lerped position is
    /// inside the interest area — the vessel slice of snapshots and window
    /// responses.
    fn active_vessels(&mut self, now_ms: u64) -> Vec<VesselMoveEventData> {
        self.settle_vessel_arrivals(now_ms);
        let player_id = player_identity().id;
        let mut vessels: Vec<_> = self
            .vessels
            .values()
            .filter(|v| {
                if v.owner_id == player_id {
                    return true;
                }
                let (col, row) = vessel_position(v, now_ms);
                self.aoi.contains_point(col, row)
            })
            .cloned()
            .collect();
        vessels
            .sort_by(|a, b| (a.dispatched_at, &a.vessel_id).cmp(&(b.dispatched_at, &b.vessel_id)));
        vessels
    }

    /// Every asteroid inside the interest area that still holds resources,
    /// in stable id order — the asteroid slice of snapshots and window
    /// responses (ROADMAP P1.13: the rest of the field stays server-side
    /// until the window moves over it).
    fn asteroids_snapshot(&mut self, now_ms: u64) -> Vec<AsteroidData> {
        self.settle_mining(now_ms);
        let mut asteroids: Vec<_> = self
            .asteroids
            .values()
            .filter(|a| self.aoi.intersects(a.col, a.row, a.span))
            .cloned()
            .collect();
        asteroids.sort_by(|a, b| a.asteroid_id.cmp(&b.asteroid_id));
        asteroids
    }

    /// Re-center the client's interest area (ROADMAP P1.13) and return the
    /// world entities inside the new window. The client replaces its
    /// mothership/asteroid/vessel tables wholesale with these slices, so
    /// everything that left the window unloads, and the response is
    /// authoritative for everything inside it — stale mining slots and
    /// deposits resolve on window re-entry.
    fn map_window(
        &mut self,
        center_col: i64,
        center_row: i64,
        now_ms: u64,
    ) -> Result<MapWindowData, String> {
        if !(0..MAP_COLS).contains(&center_col) || !(0..MAP_ROWS).contains(&center_row) {
            return Err(format!("({center_col}, {center_row}) is outside the map"));
        }
        self.aoi = MapWindow::centered_at(center_col, center_row);
        // Asteroids settle mining first so an auto-returning miner lands in
        // the vessel slice of this same response.
        let asteroids = self.asteroids_snapshot(now_ms);
        let vessels = self.active_vessels(now_ms);
        Ok(MapWindowData {
            window: self.aoi,
            motherships: self.motherships_snapshot(),
            asteroids,
            vessels,
        })
    }

    /// The highest settled Trading Post level, or 0 when none is built —
    /// gates the deal commands and sets slot count / give sizing (ROADMAP
    /// P1.12).
    fn trading_post_level(&self) -> u32 {
        self.modules
            .values()
            .filter(|m| m.module_type == TRADING_POST_MODULE_TYPE)
            .map(|m| m.level)
            .max()
            .unwrap_or(0)
    }

    fn deals_data(&self) -> DealsData {
        DealsData {
            day_index: self.deals_day_index,
            refreshes_used: self.deal_refreshes_used,
            deals: self.deals.clone(),
        }
    }

    /// Roll one deal slot deterministically from (player, day, slot,
    /// generation). A freebie slot gets a small banded gift; a regular slot
    /// exchanges two distinct trade types — give sized by Trading Post level
    /// but capped at a fraction of the player's storage cap, get boosted by
    /// the rolled rarity.
    fn generate_deal(&self, day: u64, slot: u32, generation: u32, freebie: bool) -> DealData {
        let mut rng = SeedRng(deal_seed(&player_identity().id, day, slot, generation));
        let deal_id = format!("deal-{day}-{slot}-{generation}");
        if freebie {
            // Deliberately basic — its own band, not the sizing rule below:
            // a daily growth nudge, never a big win.
            let kind = TRADE_KINDS[(rng.next() % 5) as usize];
            let units = rng.range(DEAL_FREEBIE_MIN_UNITS, DEAL_FREEBIE_MAX_UNITS) / 5 * 5;
            return DealData {
                deal_id,
                slot,
                rarity: DealRarity::Common,
                give: None,
                get: DealSide {
                    kind,
                    amount: trade_amount(kind, units),
                },
                accepted: false,
            };
        }
        let rarity = roll_rarity(&mut rng);
        let give_kind = TRADE_KINDS[(rng.next() % 5) as usize];
        // give ≠ get, always — the get side draws from the other four.
        let others: Vec<TradeKind> = TRADE_KINDS
            .iter()
            .copied()
            .filter(|k| *k != give_kind)
            .collect();
        let get_kind = others[(rng.next() % 4) as usize];
        let base = scale_for_level(DEAL_GIVE_BASE_UNITS, self.trading_post_level().max(1));
        let mut give_units = rng.range(base / 2, base);
        if let Some(res) = give_kind.material() {
            give_units = give_units.min(self.storage_caps().get(res) / DEAL_GIVE_CAP_DIVISOR);
        }
        // Snap to a friendly multiple of 5 (asteroid deposits snap to 10).
        let give_units = (give_units / 5 * 5).max(5);
        let get_units = give_units * (100 + rarity_bonus_pct(rarity)) / 100;
        DealData {
            deal_id,
            slot,
            rarity,
            give: Some(DealSide {
                kind: give_kind,
                amount: trade_amount(give_kind, give_units),
            }),
            get: DealSide {
                kind: get_kind,
                amount: trade_amount(get_kind, get_units),
            },
            accepted: false,
        }
    }

    /// Replace every deal slot with a fresh roll for (day, generation) —
    /// slot count from the current Trading Post level; the freebie only in
    /// the daily (generation 0) batch, in slot 0.
    fn regenerate_deals(&mut self, day: u64, generation: u32, with_freebie: bool) {
        let slots = deal_slot_count(self.trading_post_level());
        self.deals = (0..slots)
            .map(|slot| self.generate_deal(day, slot, generation, with_freebie && slot == 0))
            .collect();
    }

    /// Roll the shop over when a new UTC day has started (ROADMAP P1.12):
    /// fresh deals (freebie included), refresh counter reset, the new state
    /// pushed. Runs lazily from the deal commands and snapshot plus eagerly
    /// from the scheduler (the boundary is a deadline). A clock that went
    /// backwards keeps the current batch — the day index only advances.
    fn settle_deals(&mut self, now_ms: u64) {
        let today = utc_day_index(now_ms);
        if today <= self.deals_day_index {
            return;
        }
        self.deals_day_index = today;
        self.deal_refreshes_used = 0;
        self.regenerate_deals(today, 0, true);
        // Deals are the player's own shop state — never interest-area
        // filtered.
        self.queue_push(ServerPush::Deals(self.deals_data()));
        // Only worth announcing once the player can actually open the shop.
        if self.trading_post_level() >= 1 {
            self.push_notification(
                "deals-refreshed",
                "New deals are in at the Trading Post".to_string(),
                now_ms,
            );
        }
    }

    /// Verify and execute a deal acceptance (ROADMAP P1.12): a settled
    /// Trading Post, a current deal not yet accepted, give ≠ get (a
    /// malformed request can never trade a type against itself), the give
    /// side affordable, and the get side fitting in storage — an explicit
    /// player action is rejected outright rather than clamp-and-lose
    /// (contrast P1.11's passive production overflow). Applies the exchange
    /// and returns the full deal state plus updated counts.
    fn accept_deal(&mut self, deal_id: &str, now_ms: u64) -> Result<DealActionResponse, String> {
        self.accrue_production(now_ms);
        self.settle_deals(now_ms);
        if self.trading_post_level() < 1 {
            return Err("no settled Trading Post to trade at".to_string());
        }
        let deal = self
            .deals
            .iter()
            .find(|d| d.deal_id == deal_id)
            .ok_or_else(|| format!("unknown deal: {deal_id:?}"))?
            .clone();
        if deal.accepted {
            return Err(format!("deal {deal_id:?} was already accepted"));
        }
        if deal.give.is_some_and(|give| give.kind == deal.get.kind) {
            return Err("malformed deal: give and get types match".to_string());
        }
        let cap = self.storage_caps().get_trade(deal.get.kind);
        let have = self.resources.get_trade(deal.get.kind);
        if have.saturating_add(deal.get.amount) > cap {
            return Err(format!(
                "not enough storage for {} {}: {have} of {cap} used",
                deal.get.amount,
                trade_display_name(deal.get.kind),
            ));
        }
        if let Some(give) = deal.give {
            self.resources.spend_trade(give.kind, give.amount)?;
        }
        self.resources.add_trade(deal.get.kind, deal.get.amount);
        self.resources_dirty = true;
        self.deals
            .iter_mut()
            .find(|d| d.deal_id == deal_id)
            .expect("existence checked above")
            .accepted = true;
        Ok(DealActionResponse {
            deals: self.deals_data(),
            resources: self.resources,
        })
    }

    /// Verify and execute a deal refresh (ROADMAP P1.12): a settled Trading
    /// Post and a refresh left today; the first is free, then credits
    /// doubling per use. Replaces every slot — accepted deals included, and
    /// an unclaimed freebie is forfeited: a refresh batch never contains a
    /// new one. Returns the full deal state plus updated counts.
    fn refresh_deals(&mut self, now_ms: u64) -> Result<DealActionResponse, String> {
        self.accrue_production(now_ms);
        self.settle_deals(now_ms);
        if self.trading_post_level() < 1 {
            return Err("no settled Trading Post to trade at".to_string());
        }
        let used = self.deal_refreshes_used as usize;
        let Some(&cost) = DEAL_REFRESH_COSTS_CREDITS.get(used) else {
            return Err(format!(
                "no refreshes left today ({used} of {} used)",
                DEAL_REFRESH_COSTS_CREDITS.len()
            ));
        };
        if cost > 0 {
            self.resources.spend_trade(TradeKind::Credits, cost)?;
            self.resources_dirty = true;
        }
        self.deal_refreshes_used += 1;
        self.regenerate_deals(self.deals_day_index, self.deal_refreshes_used, false);
        Ok(DealActionResponse {
            deals: self.deals_data(),
            resources: self.resources,
        })
    }

    /// The current deal state, first rolled over to a new day if one started
    /// — the deals slice of the load_game_state snapshot.
    fn deals_snapshot(&mut self, now_ms: u64) -> DealsData {
        self.settle_deals(now_ms);
        self.deals_data()
    }

    /// Settle everything due at now_ms — production ticks, module build
    /// completions, mining completions, vessel arrivals — queueing the
    /// corresponding pushes. The scheduler thread's whole job; commands
    /// settle the same way piecemeal through their own entry points. Mining
    /// settles before arrivals so an auto-return created long ago can dock
    /// (and deposit its cargo) in the same pass.
    fn settle(&mut self, now_ms: u64) {
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
    fn snapshot(&mut self, now_ms: u64) -> GameStateData {
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
    fn next_deadline(&self) -> u64 {
        let mut deadline = self.last_production_at + PRODUCTION_TICK_MS;
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
    fn drain_pushes(&mut self) -> Vec<ServerPush> {
        let aoi = self.aoi;
        let mut pushes: Vec<ServerPush> = std::mem::take(&mut self.outbox)
            .into_iter()
            .filter(|e| {
                e.footprint
                    .map_or(true, |(col, row, span)| aoi.intersects(col, row, span))
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
    fn mark_notifications_read(&mut self) -> Vec<NotificationData> {
        for notification in &mut self.notifications {
            notification.read = true;
        }
        self.notifications.clone()
    }
}

/// The managed Tauri state: the authoritative ServerState behind a mutex,
/// plus the condvar that wakes the scheduler thread early when a command
/// creates a nearer deadline (a build started, a vessel dispatched or
/// recalled) — without it, a short vessel flight's arrival push would wait
/// out the scheduler's current sleep.
pub struct GameServer {
    state: Mutex<ServerState>,
    wake: Condvar,
}

impl GameServer {
    pub fn new(now_ms: u64) -> Self {
        Self {
            state: Mutex::new(ServerState::new(now_ms)),
            wake: Condvar::new(),
        }
    }
}

/// Emit every drained push on the SERVER_PUSH_EVENT channel. Failures are
/// logged and dropped — a push is advisory (the client could recover from a
/// fresh snapshot), never something to crash over.
fn emit_pushes(app: &tauri::AppHandle, pushes: Vec<ServerPush>) {
    for push in pushes {
        if let Err(err) = app.emit(SERVER_PUSH_EVENT, &push) {
            eprintln!("failed to emit {SERVER_PUSH_EVENT}: {err}");
        }
    }
}

/// The push scheduler (spawned from lib.rs at app setup): sleeps until the
/// next deadline — production tick, build completion, vessel arrival —
/// settles whatever came due, and emits the queued pushes. This thread is
/// what turns the lazily-settling ServerState into a server that *tells*
/// clients when something happens instead of waiting to be asked — the
/// in-process prototype of SERVER.md's broadcast loop (ROADMAP P3.1 moves it
/// behind a WebSocket). A poisoned lock (a panicked command) is recovered,
/// not propagated: state is plain data and pushes must keep flowing.
pub fn run_scheduler(app: tauri::AppHandle) {
    let server = app.state::<GameServer>();
    let mut state = server.state.lock().unwrap_or_else(PoisonError::into_inner);
    loop {
        state.settle(now_ms());
        let pushes = state.drain_pushes();
        if !pushes.is_empty() {
            // Emit without holding the lock, then re-settle: time passed and
            // commands may have run while it was released.
            drop(state);
            emit_pushes(&app, pushes);
            state = server.state.lock().unwrap_or_else(PoisonError::into_inner);
            continue;
        }
        // settle() left every deadline in the future, so this is a real
        // sleep (clamped defensively); spurious and early wakes just loop
        // through a no-op settle and sleep again.
        let wait = state.next_deadline().saturating_sub(now_ms()).max(10);
        let (guard, _) = server
            .wake
            .wait_timeout(state, Duration::from_millis(wait))
            .unwrap_or_else(PoisonError::into_inner);
        state = guard;
    }
}

/// Command epilogue: emit the pushes queued while this command held the
/// lock, and wake the scheduler so it re-derives its next deadline (the
/// command may have created a nearer one). Takes the guard to enforce that
/// emission happens after the lock is released.
fn finish_command(
    app: &tauri::AppHandle,
    server: &GameServer,
    mut state: MutexGuard<'_, ServerState>,
) {
    let pushes = state.drain_pushes();
    drop(state);
    emit_pushes(app, pushes);
    server.wake.notify_all();
}

/// Load the player's current game state, first settling anything that has
/// come due. The client calls this once during the loader phase; after that,
/// changes arrive over the SERVER_PUSH_EVENT channel — there is no polling.
#[tauri::command]
pub(crate) fn load_game_state(
    app: tauri::AppHandle,
    server: tauri::State<'_, GameServer>,
) -> Result<GameStateData, String> {
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let data = s.snapshot(now_ms());
    finish_command(&app, server.inner(), s);
    Ok(data)
}

/// Re-center the client's interest-area window on the given tile as the
/// camera pans (ROADMAP P1.13) and return the entities inside it — the
/// client replaces its world tables wholesale, unloading everything that
/// left the window. Called with hysteresis client-side (a drift threshold,
/// never per frame).
#[tauri::command]
pub(crate) fn request_map_window(
    app: tauri::AppHandle,
    server: tauri::State<'_, GameServer>,
    center_col: i64,
    center_row: i64,
) -> Result<MapWindowData, String> {
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let result = s.map_window(center_col, center_row, now_ms());
    finish_command(&app, server.inner(), s);
    result
}

/// Request dispatch of a vessel from the player's mothership to the given
/// map tile. Destination, departure dock, speed, and arrival time are
/// verified/derived here — the returned event is authoritative and already
/// part of subsequent load_game_state snapshots.
#[tauri::command]
pub(crate) fn request_dispatch_vessel(
    app: tauri::AppHandle,
    server: tauri::State<'_, GameServer>,
    dest_col: i64,
    dest_row: i64,
) -> Result<VesselMoveEventData, String> {
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let result = s.dispatch_vessel(dest_col, dest_row, now_ms());
    finish_command(&app, server.inner(), s);
    result
}

/// Request dispatch of a vessel from the player's mothership to mine the
/// given asteroid (ROADMAP P1.6). The mining slot, destination tile, and
/// extraction window are verified/derived here; the asteroid change goes out
/// as a push and the returned vessel event is authoritative.
#[tauri::command]
pub(crate) fn request_mine_asteroid(
    app: tauri::AppHandle,
    server: tauri::State<'_, GameServer>,
    asteroid_id: String,
) -> Result<VesselMoveEventData, String> {
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let result = s.mine_asteroid(&asteroid_id, now_ms());
    finish_command(&app, server.inner(), s);
    result
}

/// Request recall of an in-flight or parked vessel back to the mothership.
/// The return leg departs from the vessel's server-computed current position.
/// Recalling a mining vessel harvests proportionally to its extraction time;
/// the partial cargo rides home on the returned event.
#[tauri::command]
pub(crate) fn request_recall_vessel(
    app: tauri::AppHandle,
    server: tauri::State<'_, GameServer>,
    vessel_id: String,
) -> Result<VesselMoveEventData, String> {
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let result = s.recall_vessel(&vessel_id, now_ms());
    finish_command(&app, server.inner(), s);
    result
}

/// Request construction of a new module at the given anchor tile. Catalog
/// type, unlock level, placement, and cost are all verified here — on
/// success the cost is already deducted and the returned module + resource
/// counts are authoritative.
#[tauri::command]
pub(crate) fn request_build_module(
    app: tauri::AppHandle,
    server: tauri::State<'_, GameServer>,
    col: i64,
    row: i64,
    module_type: String,
) -> Result<ModuleActionResponse, String> {
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let result = s.build_module(col, row, module_type, now_ms());
    finish_command(&app, server.inner(), s);
    result
}

/// Request a level-up of an existing module. Ownership, pending state, and
/// the Command Module's level cap are all verified here — on success the
/// cost is already deducted and the returned module + resource counts are
/// authoritative.
#[tauri::command]
pub(crate) fn request_levelup_module(
    app: tauri::AppHandle,
    server: tauri::State<'_, GameServer>,
    module_id: String,
) -> Result<ModuleActionResponse, String> {
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let result = s.levelup_module(&module_id, now_ms());
    finish_command(&app, server.inner(), s);
    result
}

/// Request recruitment of one crew member (ROADMAP P1.10). Berth room, the
/// single-recruitment rule, and the biological cost are all verified here —
/// on success the cost is already deducted and the returned crew state +
/// resource counts are authoritative; the completion later arrives as a
/// Crew push.
#[tauri::command]
pub(crate) fn request_hire_crew(
    app: tauri::AppHandle,
    server: tauri::State<'_, GameServer>,
) -> Result<CrewActionResponse, String> {
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let result = s.hire_crew(now_ms());
    finish_command(&app, server.inner(), s);
    result
}

/// Accept a Trading Post deal (ROADMAP P1.12). The settled-post requirement,
/// the deal's existence and acceptance state, the give-side cost, and
/// get-side storage room are all verified here — on success the exchange is
/// already applied and the returned deal state + resource counts are
/// authoritative.
#[tauri::command]
pub(crate) fn request_accept_deal(
    app: tauri::AppHandle,
    server: tauri::State<'_, GameServer>,
    deal_id: String,
) -> Result<DealActionResponse, String> {
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let result = s.accept_deal(&deal_id, now_ms());
    finish_command(&app, server.inner(), s);
    result
}

/// Refresh the Trading Post deal slots (ROADMAP P1.12). The settled-post
/// requirement, the daily refresh cap, and the doubling credits cost are all
/// verified here — on success the cost is already deducted and the returned
/// deal state + resource counts are authoritative.
#[tauri::command]
pub(crate) fn request_refresh_deals(
    app: tauri::AppHandle,
    server: tauri::State<'_, GameServer>,
) -> Result<DealActionResponse, String> {
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let result = s.refresh_deals(now_ms());
    finish_command(&app, server.inner(), s);
    result
}

/// Mark the whole event feed read (the player opened the Events feed) and
/// return the updated list — the client replaces its table with it, which
/// clears the Events badge in every scene.
#[tauri::command]
pub(crate) fn mark_notifications_read(
    app: tauri::AppHandle,
    server: tauri::State<'_, GameServer>,
) -> Result<Vec<NotificationData>, String> {
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let notifications = s.mark_notifications_read();
    finish_command(&app, server.inner(), s);
    Ok(notifications)
}

#[cfg(test)]
mod tests {
    use super::*;

    const TICK: u64 = PRODUCTION_TICK_MS;

    fn ore_refinery_cost() -> u64 {
        catalog_entry("ore-refinery")
            .unwrap()
            .base_cost_construction
    }

    fn ore_refinery_build_time() -> u64 {
        catalog_entry("ore-refinery").unwrap().base_build_time_ms
    }

    /// A state that can afford `builds` ore-refinery builds, with production
    /// anchored so no further accrual lands at time `at`.
    fn funded_state(builds: u64, at: u64) -> ServerState {
        let mut s = ServerState::new(at);
        s.resources.construction = builds * ore_refinery_cost();
        s
    }

    /// Insert an already-settled module directly, bypassing the build timer
    /// and cost — for tests that isolate level-derived state (production
    /// scaling, crew sums) from the build pipeline.
    fn insert_settled(s: &mut ServerState, id: &str, module_type: &str, level: u32) {
        s.modules.insert(
            id.to_string(),
            ModuleData {
                module_id: id.to_string(),
                owner_id: player_identity().id,
                owner_name: player_identity().name,
                module_type: module_type.to_string(),
                col: 2,
                row: 2,
                level,
                pending: None,
            },
        );
    }

    #[test]
    fn room_origin_maps_room_tiles_and_rejects_the_rest() {
        // Every tile of the center room resolves to its origin.
        for col in 17..=22 {
            for row in 17..=22 {
                assert_eq!(room_origin_at(col, row), Some((17, 17)));
            }
        }
        assert_eq!(room_origin_at(1, 1), Some((1, 1)));
        assert_eq!(room_origin_at(38, 38), Some((33, 33)));
        // Hull, corridors, off-map.
        for (col, row) in [(0, 0), (39, 39), (7, 3), (20, 8), (7, 8), (-5, 20)] {
            assert_eq!(room_origin_at(col, row), None, "({col}, {row})");
        }
    }

    #[test]
    fn module_anchor_is_one_tile_into_the_room() {
        assert_eq!(module_anchor_at(20, 21), Some((18, 18)));
        assert_eq!(module_anchor_at(1, 6), Some((2, 2)));
        assert_eq!(module_anchor_at(7, 7), None);
    }

    #[test]
    fn new_state_seeds_the_command_module_at_level_one() {
        let mut s = ServerState::new(0);
        let modules = s.modules_snapshot(0);
        assert_eq!(modules.len(), 1);
        let command = &modules[0];
        assert_eq!(command.module_id, "module-command");
        assert_eq!(command.module_type, COMMAND_MODULE_TYPE);
        assert_eq!((command.col, command.row), (18, 18));
        assert_eq!(command.level, 1);
        assert!(command.pending.is_none());
    }

    #[test]
    fn production_accrues_whole_ticks_with_remainder_carryover() {
        let mut s = ServerState::new(0);
        s.accrue_production(TICK - 1);
        assert_eq!(s.resources.construction, 0);
        s.accrue_production(3 * TICK + TICK / 2);
        assert_eq!(s.resources.construction, 3);
        assert_eq!(s.resources.fuel, 3);
        assert_eq!(s.resources.credits, 0); // trade-only, never produced
                                            // The half-tick remainder carries over.
        s.accrue_production(4 * TICK);
        assert_eq!(s.resources.construction, 4);
    }

    #[test]
    fn production_reanchors_when_the_clock_goes_backwards() {
        let mut s = ServerState::new(10 * TICK);
        s.accrue_production(0);
        assert_eq!(s.resources.construction, 0);
        s.accrue_production(TICK);
        assert_eq!(s.resources.construction, 1);
    }

    #[test]
    fn production_stops_at_the_storage_cap() {
        let mut s = ServerState::new(0);
        // Command Module baseline (level 1): 1000 per material resource.
        let cap = s.storage_caps().construction;
        assert_eq!(cap, 1_000);
        // Far more ticks than the cap holds: every resource clamps at it.
        s.accrue_production((cap + 500) * TICK);
        assert_eq!(s.resources.construction, cap);
        assert_eq!(s.resources.fuel, cap);
        // Stock already above the cap is never confiscated — accrual just
        // has no room.
        s.resources.construction = cap + 123;
        s.accrue_production((cap + 600) * TICK);
        assert_eq!(s.resources.construction, cap + 123);
        assert_eq!(s.resources.fuel, cap);
    }

    #[test]
    fn storage_bay_raises_the_cap_once_settled() {
        let mut s = ServerState::new(0);
        let entry = catalog_entry("storage-bay").unwrap();
        s.resources.construction = entry.base_cost_construction;
        let response = s.build_module(2, 2, "storage-bay".to_string(), 0).unwrap();
        let completes_at = response.module.pending.unwrap().completes_at;
        // Pending builds don't count: still the Command Module baseline.
        assert_eq!(s.storage_caps().construction, 1_000);
        s.settle_modules(completes_at);
        assert_eq!(s.storage_caps().construction, 3_000);
        assert_eq!(s.storage_caps().biological, 3_000);
        // Credits are trade-only and uncapped.
        assert_eq!(s.storage_caps().credits, u64::MAX);
    }

    #[test]
    fn build_deducts_cost_and_returns_a_pending_level_one_module() {
        let mut s = funded_state(1, 0);
        let response = s
            .build_module(2, 2, "ore-refinery".to_string(), 1_000)
            .unwrap();
        assert_eq!(s.resources.construction, 0);
        let module = response.module;
        assert_eq!((module.col, module.row), (2, 2));
        assert_eq!(module.level, 0);
        assert_eq!(module.owner_id, player_identity().id);
        let pending = module.pending.unwrap();
        assert_eq!(pending.level, 1);
        assert_eq!(pending.dispatched_at, 1_000);
        assert_eq!(pending.completes_at, 1_000 + ore_refinery_build_time());
    }

    #[test]
    fn build_accrues_due_production_before_the_cost_check() {
        // 0 on hand, but by the time of the request enough ticks have passed.
        let mut s = ServerState::new(0);
        let at = ore_refinery_cost() * TICK;
        assert!(s.build_module(2, 2, "ore-refinery".to_string(), at).is_ok());
        assert_eq!(s.resources.construction, 0);
    }

    #[test]
    fn build_rejects_insufficient_resources_without_side_effects() {
        let mut s = ServerState::new(0);
        s.resources.construction = ore_refinery_cost() - 1;
        let err = s
            .build_module(2, 2, "ore-refinery".to_string(), 0)
            .unwrap_err();
        assert!(err.contains("not enough construction"), "{err}");
        assert_eq!(s.resources.construction, ore_refinery_cost() - 1);
        // The room was not marked occupied by the failed attempt.
        s.resources.construction = ore_refinery_cost();
        assert!(s
            .build_module(2, 2, "ore-refinery".to_string(), TICK)
            .is_ok());
    }

    #[test]
    fn build_rejects_occupied_rooms_and_bad_spots() {
        let mut s = funded_state(10, 0);
        // The command module's room is pre-occupied.
        assert!(s
            .build_module(18, 18, "ore-refinery".to_string(), 0)
            .unwrap_err()
            .contains("already has a module"));
        // Corridor tile: not inside a room.
        assert!(s
            .build_module(7, 7, "ore-refinery".to_string(), 0)
            .unwrap_err()
            .contains("not inside a room"));
        // Inside a room but not the canonical anchor.
        assert!(s
            .build_module(1, 1, "ore-refinery".to_string(), 0)
            .unwrap_err()
            .contains("not a module anchor"));
        // Unknown type.
        assert!(s
            .build_module(2, 2, "turbo".to_string(), 0)
            .unwrap_err()
            .contains("unknown module type"));
        // A successful build occupies the room for the next attempt.
        assert!(s.build_module(2, 2, "ore-refinery".to_string(), 0).is_ok());
        assert!(s
            .build_module(2, 2, "ore-refinery".to_string(), 0)
            .unwrap_err()
            .contains("already has a module"));
    }

    #[test]
    fn build_rejects_the_command_module_type() {
        let mut s = funded_state(1, 0);
        let err = s
            .build_module(2, 2, COMMAND_MODULE_TYPE.to_string(), 0)
            .unwrap_err();
        assert!(err.contains("already built"), "{err}");
    }

    #[test]
    fn build_rejects_types_below_the_command_level_requirement() {
        let mut s = funded_state(1, 0);
        // Simulate a Command Module that hasn't reached the unlock level.
        s.modules.get_mut("module-command").unwrap().level = 0;
        let err = s
            .build_module(2, 2, "ore-refinery".to_string(), 0)
            .unwrap_err();
        assert!(err.contains("requires Command Module level"), "{err}");
    }

    #[test]
    fn levelup_rejects_while_a_build_is_pending() {
        let mut s = funded_state(2, 0);
        s.build_module(2, 2, "ore-refinery".to_string(), 0).unwrap();
        let module_id = s.modules_snapshot(0)[0].module_id.clone();
        let err = s.levelup_module(&module_id, 0).unwrap_err();
        assert!(err.contains("already under construction"), "{err}");
    }

    #[test]
    fn levelup_rejects_exceeding_the_command_level_cap() {
        let mut s = funded_state(2, 0);
        let build = s.build_module(2, 2, "ore-refinery".to_string(), 0).unwrap();
        // Let the first build complete: level 1, same as the Command Module.
        s.settle_modules(ore_refinery_build_time());
        let err = s
            .levelup_module(&build.module.module_id, ore_refinery_build_time())
            .unwrap_err();
        assert!(
            err.contains("cannot exceed the Command Module's level"),
            "{err}"
        );
    }

    #[test]
    fn levelup_scales_cost_and_time_and_sets_the_pending_target() {
        let mut s = funded_state(1, 0);
        // Level the Command Module up first so a refinery can follow it.
        s.resources.construction += scale_for_level(
            catalog_entry(COMMAND_MODULE_TYPE)
                .unwrap()
                .base_cost_construction,
            2,
        );
        let command = s.levelup_module("module-command", 0).unwrap().module;
        let command_done = command.pending.unwrap().completes_at;
        s.settle_modules(command_done);
        assert_eq!(s.command_level(), 2);

        let build = s
            .build_module(2, 2, "ore-refinery".to_string(), command_done)
            .unwrap();
        s.settle_modules(build.module.pending.unwrap().completes_at);
        let refinery_id = build.module.module_id;

        s.resources.construction += 2 * ore_refinery_cost(); // level 2 costs double
        let response = s.levelup_module(&refinery_id, command_done).unwrap();
        let pending = response.module.pending.unwrap();
        assert_eq!(pending.level, 2);
        assert_eq!(
            pending.completes_at,
            command_done + 2 * ore_refinery_build_time()
        );
    }

    #[test]
    fn production_scales_with_module_level() {
        // Insert an already-settled refinery directly, bypassing the build
        // timer, to isolate the level -> production scaling in general from
        // the specific mid-window-completion split covered by
        // production_is_not_retroactively_credited_before_a_build_completes.
        let mut s = ServerState::new(0);
        // Fully staffed throughout — the crew damping has its own tests.
        s.crew = 4;
        s.modules.insert(
            "module-refinery".to_string(),
            ModuleData {
                module_id: "module-refinery".to_string(),
                owner_id: player_identity().id,
                owner_name: player_identity().name,
                module_type: "ore-refinery".to_string(),
                col: 2,
                row: 2,
                level: 1,
                pending: None,
            },
        );
        s.accrue_production(TICK);
        // Command Module (level 1: +1 construction) + refinery (level 1: +2).
        assert_eq!(s.resources.construction, 3);

        s.modules.get_mut("module-refinery").unwrap().level = 2;
        s.accrue_production(2 * TICK);
        // Refinery production doubles at level 2 (+4), command stays +1.
        assert_eq!(s.resources.construction, 3 + 5);
    }

    #[test]
    fn production_is_not_retroactively_credited_before_a_build_completes() {
        // Build a refinery (15_000ms = 3 ticks) and, with no intermediate
        // accrual, jump straight to 2 ticks past its completion.
        let mut s = funded_state(1, 0);
        let build = s.build_module(2, 2, "ore-refinery".to_string(), 0).unwrap();
        let completes_at = build.module.pending.unwrap().completes_at;
        s.accrue_production(completes_at + 2 * TICK);
        // 5 ticks elapsed in total. The Command Module (unaffected, level 1)
        // earns all 5: +5. The refinery was level 0 (no production) for the
        // first 3 ticks and only reaches level 1 (+2/tick) for the last 2:
        // +4. A naive settle-then-multiply would instead credit the
        // refinery's level-1 rate for all 5 ticks (+10) — 6 more than
        // correct.
        assert_eq!(s.resources.construction, 5 + 4);
    }

    #[test]
    fn dispatch_departs_from_the_closest_dock_with_arrival_time() {
        let mut s = ServerState::new(0);
        let event = s.dispatch_vessel(500, 510, 1_000).unwrap();
        // Mothership at (498, 498), 4*4: the inner docks are
        // (499..=500, 499..=500).
        assert_eq!((event.src_col, event.src_row), (500.0, 500.0));
        assert_eq!((event.dest_col, event.dest_row), (500, 510));
        assert_eq!(event.owner_id, player_identity().id);
        assert_eq!(event.speed, VESSEL_SPEED_PX_S);
        assert_eq!(event.dispatched_at, 1_000);
        // 10 tiles * 32 px at 32 px/s = 10 s of travel.
        assert_eq!(event.arrival_at, 11_000);
        assert_eq!(s.active_vessels(1_000).len(), 1);
    }

    #[test]
    fn dispatch_rejects_off_map_and_docking_destinations() {
        let mut s = ServerState::new(0);
        for (col, row) in [(1000, 5), (5, -1), (-3, 3), (2, 1000)] {
            let err = s.dispatch_vessel(col, row, 0).unwrap_err();
            assert!(err.contains("outside the map"), "{err}");
        }
        let err = s.dispatch_vessel(499, 500, 0).unwrap_err();
        assert!(err.contains("docking tile"), "{err}");
        assert!(s.active_vessels(0).is_empty());
    }

    #[test]
    fn dispatch_rejects_beyond_the_fleet_cap() {
        let mut s = ServerState::new(0);
        for i in 0..MAX_VESSELS {
            s.dispatch_vessel(500, 510 + i as i64, 0).unwrap();
        }
        assert_eq!(s.active_vessels(0).len(), MAX_VESSELS);
        let err = s.dispatch_vessel(500, 600, 0).unwrap_err();
        assert!(err.contains("fleet limit"), "{err}");
        // Recalling one mid-flight frees a slot only once its return leg
        // actually docks — the recalled vessel stays in the table meanwhile.
        let vessel_id = s.active_vessels(0)[0].vessel_id.clone();
        let back = s.recall_vessel(&vessel_id, 2_000).unwrap();
        let err = s.dispatch_vessel(500, 600, 2_000).unwrap_err();
        assert!(err.contains("fleet limit"), "{err}");
        s.dispatch_vessel(500, 600, back.arrival_at).unwrap();
    }

    #[test]
    fn recall_redirects_from_the_lerped_mid_flight_position() {
        let mut s = ServerState::new(0);
        let out = s.dispatch_vessel(500, 510, 0).unwrap();
        // Halfway through the 10 s outbound flight the vessel sits at row 505.
        let back = s.recall_vessel(&out.vessel_id, 5_000).unwrap();
        assert_eq!(back.vessel_id, out.vessel_id);
        assert_eq!((back.src_col, back.src_row), (500.0, 505.0));
        assert_eq!((back.dest_col, back.dest_row), (500, 500));
        assert_eq!(back.dispatched_at, 5_000);
        assert_eq!(back.arrival_at, 10_000);
        // Docking completes: the vessel leaves the snapshot...
        assert!(s.active_vessels(10_000).is_empty());
        // ...and can no longer be recalled.
        let err = s.recall_vessel(&out.vessel_id, 10_000).unwrap_err();
        assert!(err.contains("unknown vessel"), "{err}");
    }

    #[test]
    fn arrived_vessels_stay_parked_until_recalled() {
        let mut s = ServerState::new(0);
        let out = s.dispatch_vessel(500, 510, 0).unwrap();
        // Long past arrival the vessel is still on the map, parked at dest.
        assert_eq!(s.active_vessels(60_000).len(), 1);
        let back = s.recall_vessel(&out.vessel_id, 60_000).unwrap();
        assert_eq!((back.src_col, back.src_row), (500.0, 510.0));
        assert_eq!((back.dest_col, back.dest_row), (500, 500));
        assert_eq!(back.arrival_at, 70_000);
    }

    #[test]
    fn recall_of_an_unknown_vessel_fails() {
        let mut s = ServerState::new(0);
        let err = s.recall_vessel("vessel-x", 0).unwrap_err();
        assert!(err.contains("unknown vessel"), "{err}");
    }

    #[test]
    fn snapshot_includes_the_seeded_motherships() {
        let s = ServerState::new(0);
        let ships = s.motherships_snapshot();
        assert_eq!(ships.len(), 2);
        let player = ships.iter().find(|m| m.owner_id == "player-1").unwrap();
        assert_eq!((player.col, player.row, player.span), (498, 498, 4));
        assert!(!player.damaged);
        let enemy = ships.iter().find(|m| m.owner_id == "player-2").unwrap();
        assert_eq!((enemy.col, enemy.row), (503, 499));
        assert!(enemy.damaged);
    }

    /// The kind of every feed entry, oldest first.
    fn notification_kinds(s: &ServerState) -> Vec<&str> {
        s.notifications.iter().map(|n| n.kind.as_str()).collect()
    }

    #[test]
    fn window_intersection_covers_edges_and_multi_tile_footprints() {
        // Centered at (500, 500) with span 100 the window covers [450, 550).
        let w = MapWindow::centered_at(500, 500);
        assert_eq!(w.span, AOI_SPAN);
        assert!(w.intersects(450, 450, 1));
        assert!(w.intersects(549, 549, 1));
        assert!(!w.intersects(449, 500, 1));
        assert!(!w.intersects(550, 500, 1));
        // A 3*3 footprint anchored outside still overlaps the window edge.
        assert!(w.intersects(448, 500, 3));
        assert!(w.intersects(500, 548, 3));
        assert!(!w.intersects(446, 500, 3));
        // Fractional vessel positions use half-open bounds too.
        assert!(w.contains_point(450.0, 549.9));
        assert!(!w.contains_point(449.9, 500.0));
        assert!(!w.contains_point(500.0, 550.0));
    }

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
    fn map_window_recenters_and_returns_the_windowed_world() {
        let mut s = ServerState::new(0);
        let far = s.map_window(100, 100, 0).unwrap();
        assert_eq!(
            (
                far.window.center_col,
                far.window.center_row,
                far.window.span
            ),
            (100, 100, AOI_SPAN)
        );
        // The player's own mothership rides along even though it sits far
        // outside the new window; the enemy's doesn't.
        assert!(far.motherships.iter().any(|m| m.owner_id == "player-1"));
        assert!(!far.motherships.iter().any(|m| m.owner_id == "player-2"));
        assert!(!far.asteroids.is_empty());
        for asteroid in &far.asteroids {
            assert!(far
                .window
                .intersects(asteroid.col, asteroid.row, asteroid.span));
        }
        // Off-map centers are rejected without moving the window.
        assert!(s
            .map_window(-1, 100, 0)
            .unwrap_err()
            .contains("outside the map"));
        assert!(s
            .map_window(100, 1000, 0)
            .unwrap_err()
            .contains("outside the map"));
        assert_eq!((s.aoi.center_col, s.aoi.center_row), (100, 100));
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
    fn build_completion_queues_module_push_and_notification() {
        let mut s = funded_state(1, 0);
        s.build_module(2, 2, "ore-refinery".to_string(), 0).unwrap();
        s.drain_pushes(); // discard the build's own spend push
        s.settle(ore_refinery_build_time());
        let pushes = s.drain_pushes();
        assert!(pushes
            .iter()
            .any(|p| matches!(p, ServerPush::Module(m) if m.level == 1 && m.pending.is_none())));
        assert!(pushes.iter().any(|p| matches!(
            p,
            ServerPush::Notification(n)
                if n.kind == "build-complete"
                    && n.message.contains("Ore Refinery")
                    && !n.read
        )));
        assert_eq!(notification_kinds(&s), vec!["build-complete"]);
        // Settling again at the same time re-announces nothing.
        s.settle(ore_refinery_build_time());
        assert!(s.drain_pushes().is_empty());
    }

    #[test]
    fn levelup_completion_notifies_with_the_new_level() {
        let mut s = ServerState::new(0);
        s.resources.construction = scale_for_level(
            catalog_entry(COMMAND_MODULE_TYPE)
                .unwrap()
                .base_cost_construction,
            2,
        );
        let response = s.levelup_module("module-command", 0).unwrap();
        let done = response.module.pending.unwrap().completes_at;
        s.drain_pushes();
        s.settle(done);
        assert!(s.drain_pushes().iter().any(|p| matches!(
            p,
            ServerPush::Notification(n)
                if n.kind == "levelup-complete" && n.message.contains("level 2")
        )));
    }

    #[test]
    fn crew_capacity_and_requirement_sum_linearly() {
        let mut s = ServerState::new(0);
        // Command Module level 1: the 2-berth baseline, no demand.
        assert_eq!(s.crew_capacity(), 2);
        assert_eq!(s.crew_required(), 0);
        // Linear per level — deliberately not the scale_for_level doubling.
        insert_settled(&mut s, "module-quarters", "crew-quarters", 2);
        insert_settled(&mut s, "module-refinery", "ore-refinery", 3);
        assert_eq!(s.crew_capacity(), 2 + 2);
        assert_eq!(s.crew_required(), 3);
    }

    #[test]
    fn hire_verifies_berths_cost_and_single_recruitment() {
        let mut s = ServerState::new(0);
        // A full ship (head count at the berth total) can't recruit.
        s.crew = s.crew_capacity();
        let err = s.hire_crew(0).unwrap_err();
        assert!(err.contains("no berths"), "{err}");
        insert_settled(&mut s, "module-quarters", "crew-quarters", 1);
        let err = s.hire_crew(0).unwrap_err();
        assert!(err.contains("not enough biological"), "{err}");
        // Linear cost: the third head costs 3 * the base.
        s.resources.biological = HIRE_COST_BIOLOGICAL * 3;
        let response = s.hire_crew(0).unwrap();
        assert_eq!(response.crew.crew, 2);
        assert_eq!(
            response.crew.pending_hire.unwrap().completes_at,
            HIRE_TIME_MS
        );
        assert_eq!(response.resources.biological, 0);
        let err = s.hire_crew(1).unwrap_err();
        assert!(err.contains("already being recruited"), "{err}");
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
    fn hire_completion_queues_crew_push_and_notification() {
        let mut s = ServerState::new(0);
        // A new player's very first recruitment: no crew, baseline berths.
        s.resources.biological = HIRE_COST_BIOLOGICAL;
        s.hire_crew(0).unwrap();
        s.drain_pushes(); // discard the hire's own spend push
        s.settle(HIRE_TIME_MS);
        let pushes = s.drain_pushes();
        assert!(pushes.iter().any(|p| matches!(
            p,
            ServerPush::Crew(c) if c.crew == 1 && c.pending_hire.is_none()
        )));
        assert!(pushes.iter().any(|p| matches!(
            p,
            ServerPush::Notification(n) if n.kind == "crew-hired" && !n.read
        )));
        assert_eq!(s.crew, 1);
        // Settling again at the same time re-announces nothing.
        s.settle(HIRE_TIME_MS);
        assert!(s.drain_pushes().is_empty());
    }

    #[test]
    fn understaffed_production_is_damped_with_a_half_floor() {
        let mut s = ServerState::new(0);
        // A level-4 refinery wants 4 crew and makes 16 construction/tick at
        // full staff; the Command Module's baseline (+1) is never damped.
        insert_settled(&mut s, "module-refinery", "ore-refinery", 4);
        s.crew = 4;
        s.accrue_production(TICK);
        assert_eq!(s.resources.construction, 16 + 1);
        // Half staffed: 16 * (4 + 2) / (2 * 4) = 12.
        s.crew = 2;
        s.accrue_production(2 * TICK);
        assert_eq!(s.resources.construction, 17 + 12 + 1);
        // No crew at all still runs at the 50% floor: 16 / 2 = 8.
        s.crew = 0;
        s.accrue_production(3 * TICK);
        assert_eq!(s.resources.construction, 17 + 13 + 8 + 1);
    }

    #[test]
    fn hire_settles_after_production_so_the_ratio_is_not_retroactive() {
        let mut s = ServerState::new(0);
        // A level-4 refinery with no crew at all: the floor rate, 8/tick.
        insert_settled(&mut s, "module-refinery", "ore-refinery", 4);
        s.crew = 0;
        s.resources.biological = HIRE_COST_BIOLOGICAL;
        s.hire_crew(0).unwrap();
        // Settling exactly at the completion accrues every elapsed tick at
        // the *old* staffing first; only then does the new head land.
        s.settle(HIRE_TIME_MS);
        let ticks = HIRE_TIME_MS / TICK;
        assert_eq!(s.resources.construction, ticks * (8 + 1));
        assert_eq!(s.crew, 1);
        // The next tick runs at the improved ratio: 16 * (4 + 1) / 8 = 10.
        s.accrue_production(HIRE_TIME_MS + TICK);
        assert_eq!(s.resources.construction, ticks * 9 + 10 + 1);
    }

    #[test]
    fn vessel_arrival_notifies_once_and_docking_prunes_with_push() {
        let mut s = ServerState::new(0);
        let out = s.dispatch_vessel(500, 510, 0).unwrap();
        s.drain_pushes();
        // Settle lazily, well after the arrival — the notification must still
        // be stamped with the arrival moment, not this later settle time
        // (CR1.2).
        let lazy_settle_at = out.arrival_at + 5 * TICK;
        s.settle(lazy_settle_at);
        assert!(s.drain_pushes().iter().any(|p| matches!(
            p,
            ServerPush::Notification(n)
                if n.kind == "vessel-arrived"
                    && n.message.contains("(500, 510)")
                    && n.created_at == out.arrival_at
        )));
        // Parked: later settles stay quiet about it.
        s.settle(lazy_settle_at + 5 * TICK);
        assert!(!s
            .drain_pushes()
            .iter()
            .any(|p| matches!(p, ServerPush::Notification(_))));
        // The recall's docking arrival despawns the vessel: a "returned"
        // notification plus the VesselRemoved push for the client's table.
        let back = s
            .recall_vessel(&out.vessel_id, lazy_settle_at + 5 * TICK)
            .unwrap();
        s.drain_pushes();
        // Same lazy-settle check on the return leg.
        let lazy_return_settle_at = back.arrival_at + 5 * TICK;
        s.settle(lazy_return_settle_at);
        let pushes = s.drain_pushes();
        assert!(pushes.iter().any(|p| matches!(
            p,
            ServerPush::Notification(n)
                if n.kind == "vessel-returned" && n.created_at == back.arrival_at
        )));
        assert!(pushes.iter().any(|p| matches!(
            p,
            ServerPush::VesselRemoved { vessel_id } if *vessel_id == out.vessel_id
        )));
        assert!(s.active_vessels(lazy_return_settle_at).is_empty());
        assert_eq!(
            notification_kinds(&s),
            vec!["vessel-arrived", "vessel-returned"]
        );
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

    /// A state with production silenced (the only module is a settled
    /// Storage Bay, which produces nothing but keeps a 2000-per-resource
    /// storage cap so deposits aren't clamped — ROADMAP P1.11) and the
    /// seeded asteroid field replaced by one known asteroid at (499, 510) —
    /// 10 tiles / 10 s from the (499, 500) dock — so mining math is
    /// deterministic.
    fn mining_state(amount: u64) -> ServerState {
        let mut s = ServerState::new(0);
        s.modules.clear();
        let player = player_identity();
        s.modules.insert(
            "module-storage".to_string(),
            ModuleData {
                module_id: "module-storage".to_string(),
                owner_id: player.id,
                owner_name: player.name,
                module_type: "storage-bay".to_string(),
                col: 2,
                row: 2,
                level: 1,
                pending: None,
            },
        );
        s.asteroids.clear();
        s.asteroids.insert(
            "asteroid-x".to_string(),
            AsteroidData {
                asteroid_id: "asteroid-x".to_string(),
                tier: "small".to_string(),
                resource: ResourceKind::Biological,
                col: 499,
                row: 510,
                span: 1,
                total: amount,
                remaining: amount,
                mining: None,
            },
        );
        s
    }

    #[test]
    fn seeded_asteroid_field_is_deterministic_and_valid() {
        let a = ServerState::new(0);
        let b = ServerState::new(0);
        let key = |s: &ServerState| {
            let mut rows: Vec<_> = s
                .asteroids
                .values()
                .map(|a| (a.asteroid_id.clone(), a.col, a.row, a.span, a.total))
                .collect();
            rows.sort();
            rows
        };
        assert_eq!(key(&a), key(&b));

        let expected: usize = ASTEROID_TIERS.iter().map(|t| t.seed_count).sum();
        assert_eq!(a.asteroids.len(), expected);
        // Evenly spread across the map (July 2026 playtest feedback), not
        // clustered around the start: every map quadrant holds asteroids.
        let quadrants: std::collections::HashSet<_> = a
            .asteroids
            .values()
            .map(|ast| (ast.col >= MAP_COLS / 2, ast.row >= MAP_ROWS / 2))
            .collect();
        assert_eq!(quadrants.len(), 4);
        for asteroid in a.asteroids.values() {
            let tier = asteroid_tier(&asteroid.tier).expect("known tier");
            assert_eq!(asteroid.span, tier.span);
            assert!(asteroid.total >= tier.min_amount && asteroid.total <= tier.max_amount);
            assert_eq!(asteroid.remaining, asteroid.total);
            assert!(asteroid.mining.is_none());
            assert!(asteroid.col >= 0 && asteroid.col + asteroid.span <= MAP_COLS);
            assert!(asteroid.row >= 0 && asteroid.row + asteroid.span <= MAP_ROWS);
            // Clear of every mothership (and its deploy space)...
            for ship in a.motherships.values() {
                assert!(footprints_clear(
                    (asteroid.col, asteroid.row, asteroid.span),
                    (ship.col, ship.row, ship.span),
                    6,
                ));
            }
            // ...and of every other asteroid.
            for other in a.asteroids.values() {
                if other.asteroid_id != asteroid.asteroid_id {
                    assert!(footprints_clear(
                        (asteroid.col, asteroid.row, asteroid.span),
                        (other.col, other.row, other.span),
                        2,
                    ));
                }
            }
        }
    }

    #[test]
    fn mine_dispatch_reserves_the_slot_and_derives_the_window() {
        let mut s = mining_state(240);
        let event = s.mine_asteroid("asteroid-x", 1_000).unwrap();
        assert_eq!(event.mining_asteroid_id.as_deref(), Some("asteroid-x"));
        assert!(event.cargo.is_none());
        assert_eq!((event.src_col, event.src_row), (499.0, 500.0));
        assert_eq!((event.dest_col, event.dest_row), (499, 510));
        assert_eq!(event.arrival_at, 11_000);

        // Extraction runs from arrival until the deposit is exhausted:
        // 240 units at MINE_UNITS_PER_HOUR (240) is one hour.
        let mining = s.asteroids["asteroid-x"].mining.clone().unwrap();
        assert_eq!(mining.vessel_id, event.vessel_id);
        assert_eq!(mining.started_at, 11_000);
        assert_eq!(mining.completes_at, 11_000 + HOUR_MS);

        // The slot is taken from dispatch, before arrival — a second miner
        // can't race for it.
        let err = s.mine_asteroid("asteroid-x", 2_000).unwrap_err();
        assert!(err.contains("already has a vessel"), "{err}");
        let err = s.mine_asteroid("asteroid-gone", 2_000).unwrap_err();
        assert!(err.contains("unknown asteroid"), "{err}");
    }

    #[test]
    fn completed_mining_auto_returns_the_full_harvest_and_deposits_on_dock() {
        let mut s = mining_state(240);
        let out = s.mine_asteroid("asteroid-x", 0).unwrap();
        s.drain_pushes();
        // Arrival announces the start of extraction (in a long lazy jump
        // straight past completes_at this stale news would be skipped).
        s.settle(10_000);
        let done = 10_000 + HOUR_MS;
        s.settle(done);

        // Mined out: the asteroid left the table with its removal push.
        assert!(!s.asteroids.contains_key("asteroid-x"));
        let pushes = s.drain_pushes();
        assert!(pushes.iter().any(|p| matches!(
            p,
            ServerPush::AsteroidRemoved { asteroid_id } if asteroid_id == "asteroid-x"
        )));
        // The server put the vessel on a return leg (a push, not a command
        // response) carrying the whole deposit, stamped at the completion
        // moment rather than the settle time.
        assert!(pushes
            .iter()
            .any(|p| matches!(p, ServerPush::Vessel(v) if v.vessel_id == out.vessel_id)));
        let back = s.vessels[&out.vessel_id].clone();
        assert_eq!(back.mining_asteroid_id, None);
        assert_eq!(back.dispatched_at, done);
        assert_eq!((back.src_col, back.src_row), (499.0, 510.0));
        assert_eq!((back.dest_col, back.dest_row), (499, 500));
        let cargo = back.cargo.clone().unwrap();
        assert_eq!(cargo.resource, ResourceKind::Biological);
        assert_eq!(cargo.amount, 240);

        // Docking deposits the cargo into the resource counts.
        s.settle(back.arrival_at);
        assert_eq!(s.resources.biological, 240);
        assert!(s.vessels.is_empty());
        assert_eq!(
            notification_kinds(&s),
            vec![
                "mining-started",
                "mining-complete",
                "asteroid-depleted",
                "vessel-returned",
            ]
        );
        assert!(s.notifications.last().unwrap().message.contains("240"));
        // CR1.6: the depletion message names the deposit, not just "mined
        // out" — tier, resource, and location, matching the seeded asteroid.
        let depleted = s
            .notifications
            .iter()
            .find(|n| n.kind == "asteroid-depleted")
            .unwrap();
        assert_eq!(
            depleted.message,
            "Asteroid mined out — small biological material deposit at (499, 510)"
        );
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
    fn cargo_deposit_clamps_at_the_cap_and_reports_the_loss() {
        // mining_state's Storage Bay caps biological at 2000; leave only 100
        // of room before the 240-unit harvest docks.
        let mut s = mining_state(240);
        s.resources.biological = 1_900;
        let out = s.mine_asteroid("asteroid-x", 0).unwrap();
        s.settle(10_000 + HOUR_MS);
        let back = s.vessels[&out.vessel_id].clone();
        s.settle(back.arrival_at);
        assert_eq!(s.resources.biological, 2_000);
        let last = s.notifications.last().unwrap();
        assert_eq!(last.kind, "vessel-returned");
        assert!(last.message.contains("storage full"), "{}", last.message);
        assert!(last.message.contains("140 lost"), "{}", last.message);
    }

    #[test]
    fn early_recall_harvests_proportionally_and_frees_the_slot() {
        let mut s = mining_state(240);
        let out = s.mine_asteroid("asteroid-x", 0).unwrap();
        // Recall halfway through the one-hour window (arrival was 10_000).
        let back = s
            .recall_vessel(&out.vessel_id, 10_000 + HOUR_MS / 2)
            .unwrap();
        let cargo = back.cargo.clone().unwrap();
        assert_eq!(cargo.amount, 120);
        assert_eq!(back.mining_asteroid_id, None);

        // The un-mined half stays on the asteroid, slot free for the next
        // vessel — whose window covers only what's left (half an hour).
        let asteroid = &s.asteroids["asteroid-x"];
        assert_eq!(asteroid.remaining, 120);
        assert_eq!(asteroid.total, 240);
        assert!(asteroid.mining.is_none());
        let again = s.mine_asteroid("asteroid-x", 10_000 + HOUR_MS / 2).unwrap();
        let mining = s.asteroids["asteroid-x"].mining.clone().unwrap();
        assert_eq!(mining.vessel_id, again.vessel_id);
        assert_eq!(mining.completes_at - mining.started_at, HOUR_MS / 2);
    }

    #[test]
    fn recall_before_arrival_abandons_the_job_with_no_cargo() {
        let mut s = mining_state(240);
        let out = s.mine_asteroid("asteroid-x", 0).unwrap();
        // Turn back mid-outbound: nothing was extracted.
        let back = s.recall_vessel(&out.vessel_id, 5_000).unwrap();
        assert!(back.cargo.is_none());
        assert_eq!(back.mining_asteroid_id, None);
        let asteroid = &s.asteroids["asteroid-x"];
        assert_eq!(asteroid.remaining, 240);
        assert!(asteroid.mining.is_none());
    }

    #[test]
    fn completion_harvests_the_whole_remainder_despite_rate_rounding() {
        // Hand-shorten the window so mined_amount(window) floors below the
        // remainder — as happens whenever amount * HOUR_MS isn't divisible
        // by the rate. Completion must still take everything: otherwise a
        // 1-unit husk asteroid survives every full mine-out.
        let mut s = mining_state(470);
        let out = s.mine_asteroid("asteroid-x", 0).unwrap();
        let asteroid = s.asteroids.get_mut("asteroid-x").unwrap();
        let mining = asteroid.mining.as_mut().unwrap();
        mining.completes_at -= 7;
        let done = mining.completes_at;
        assert!(mined_amount(done - mining.started_at) < 470);
        s.settle(done);
        assert!(!s.asteroids.contains_key("asteroid-x"));
        assert_eq!(s.vessels[&out.vessel_id].cargo.clone().unwrap().amount, 470);
    }

    #[test]
    fn recall_after_the_window_redirects_the_auto_return_with_cargo_intact() {
        let mut s = mining_state(240);
        let out = s.mine_asteroid("asteroid-x", 0).unwrap();
        // Recall long after mining finished: the auto-return already departed
        // at completes_at (and by now already docked), so the recall finds no
        // vessel left to redirect.
        let done = 10_000 + HOUR_MS;
        let err = s.recall_vessel(&out.vessel_id, done + 60_000).unwrap_err();
        assert!(err.contains("unknown vessel"), "{err}");
        // The full harvest still deposited through the settle chain.
        assert_eq!(s.resources.biological, 240);

        // A recall *during* the return leg is a legal redirect keeping the
        // cargo: re-run with a recall one second after completion.
        let mut s = mining_state(240);
        let out = s.mine_asteroid("asteroid-x", 0).unwrap();
        let back = s.recall_vessel(&out.vessel_id, done + 1_000).unwrap();
        assert_eq!(back.cargo.clone().unwrap().amount, 240);
        assert_eq!(back.dispatched_at, done + 1_000);
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
    fn vessel_docks_follow_the_mothership_position() {
        let mut s = ServerState::new(0);
        // Relocate the player's mothership: docks must move with it, for
        // dispatch departure, recall destination, and docked pruning alike.
        let ship = s.motherships.get_mut("player-1").unwrap();
        ship.col = 10;
        ship.row = 10;
        let out = s.dispatch_vessel(12, 30, 0).unwrap();
        assert_eq!((out.src_col, out.src_row), (12.0, 12.0));
        let back = s.recall_vessel(&out.vessel_id, 0).unwrap();
        assert_eq!((back.dest_col, back.dest_row), (12, 12));
        assert!(s.active_vessels(back.arrival_at).is_empty());
    }

    #[test]
    fn returning_vessel_docks_even_if_mothership_moved_after_dispatch() {
        // CR1.4 regression: a relocation between a return leg's dispatch and
        // arrival must not strand the vessel. Impossible via any command
        // today (ships never move), so the move is injected directly —
        // exercising the fix, that docking reads the `returning` flag stamped
        // at return_leg time rather than re-deriving it from is_dock_tile
        // against the mothership's now-different position.
        let mut s = ServerState::new(0);
        let out = s.dispatch_vessel(500, 510, 0).unwrap();
        let back = s.recall_vessel(&out.vessel_id, 0).unwrap();
        assert!(back.returning);
        let ship = s.motherships.get_mut("player-1").unwrap();
        ship.col += 5;
        ship.row += 5;
        s.settle(back.arrival_at);
        assert!(s.active_vessels(back.arrival_at).is_empty());
        // Recalled before its outbound leg ever arrived, so only the return
        // leg's notification fires.
        assert_eq!(notification_kinds(&s), vec!["vessel-returned"]);
    }

    // -- Trading Post deals (ROADMAP P1.12) -----------------------------------

    #[test]
    fn deal_slot_count_grows_every_two_levels_capped_at_six() {
        for (level, expected) in [
            (0, 3),
            (1, 3),
            (2, 3),
            (3, 4),
            (4, 4),
            (5, 5),
            (7, 6),
            (12, 6),
        ] {
            assert_eq!(deal_slot_count(level), expected, "level {level}");
        }
    }

    #[test]
    fn new_state_seeds_the_daily_deals_deterministically() {
        let s1 = ServerState::new(0);
        let s2 = ServerState::new(0);
        assert_eq!(s1.deals.len(), 3);
        assert_eq!(format!("{:?}", s1.deals), format!("{:?}", s2.deals));
        // Slot 0 is the daily freebie; every other slot is a real exchange.
        assert!(s1.deals[0].give.is_none());
        assert!(s1.deals[0].get.amount > 0);
        for deal in &s1.deals[1..] {
            let give = deal.give.expect("only slot 0 is the freebie");
            assert_ne!(give.kind, deal.get.kind);
            assert!(give.amount > 0);
            assert!(deal.get.amount > 0);
            assert!(!deal.accepted);
        }
    }

    #[test]
    fn generated_deals_never_trade_a_type_against_itself_and_respect_the_cap() {
        let s = ServerState::new(0);
        // Baseline storage caps are 1000 per material → give ≤ 200 units.
        for day in 0..40 {
            for generation in 0..6 {
                for slot in 0..6 {
                    let deal = s.generate_deal(day, slot, generation, false);
                    let give = deal.give.expect("non-freebie roll");
                    assert_ne!(give.kind, deal.get.kind, "{}", deal.deal_id);
                    assert!(give.amount >= 1 && deal.get.amount >= 1);
                    if give.kind != TradeKind::Credits {
                        assert!(
                            give.amount <= 200,
                            "{}: give {} exceeds the storage-cap fraction",
                            deal.deal_id,
                            give.amount
                        );
                    }
                }
            }
        }
    }

    #[test]
    fn deal_commands_require_a_settled_trading_post() {
        let mut s = ServerState::new(0);
        let deal_id = s.deals[1].deal_id.clone();
        assert!(s.accept_deal(&deal_id, 0).is_err());
        assert!(s.refresh_deals(0).is_err());
        // A pending (level 0) post doesn't count.
        insert_settled(&mut s, "module-tp", TRADING_POST_MODULE_TYPE, 0);
        assert!(s.accept_deal(&deal_id, 0).is_err());
        assert!(s.refresh_deals(0).is_err());
    }

    #[test]
    fn accept_deal_applies_the_exchange_once() {
        let mut s = ServerState::new(0);
        insert_settled(&mut s, "module-tp", TRADING_POST_MODULE_TYPE, 1);
        let deal = s.deals[1].clone();
        let give = deal.give.unwrap();
        // Fund exactly the give side.
        s.resources.add_trade(give.kind, give.amount);
        let response = s.accept_deal(&deal.deal_id, 0).unwrap();
        assert_eq!(s.resources.get_trade(give.kind), 0);
        assert_eq!(s.resources.get_trade(deal.get.kind), deal.get.amount);
        assert!(response.deals.deals[1].accepted);
        // A second accept is rejected outright and touches nothing.
        let counts = s.resources;
        assert!(s.accept_deal(&deal.deal_id, 0).is_err());
        assert_eq!(format!("{:?}", s.resources), format!("{counts:?}"));
    }

    #[test]
    fn accept_deal_rejects_an_unaffordable_give_side() {
        let mut s = ServerState::new(0);
        insert_settled(&mut s, "module-tp", TRADING_POST_MODULE_TYPE, 1);
        let deal = s.deals[1].clone();
        // One short of the give amount: rejected, nothing gained.
        let give = deal.give.unwrap();
        s.resources.add_trade(give.kind, give.amount - 1);
        assert!(s.accept_deal(&deal.deal_id, 0).is_err());
        assert_eq!(s.resources.get_trade(deal.get.kind), 0);
        assert!(!s.deals[1].accepted);
    }

    #[test]
    fn freebie_accepts_without_cost() {
        let mut s = ServerState::new(0);
        insert_settled(&mut s, "module-tp", TRADING_POST_MODULE_TYPE, 1);
        let freebie = s.deals[0].clone();
        assert!(freebie.give.is_none());
        s.accept_deal(&freebie.deal_id, 0).unwrap();
        assert_eq!(s.resources.get_trade(freebie.get.kind), freebie.get.amount);
    }

    #[test]
    fn accept_rejects_when_the_get_side_overflows_storage() {
        let mut s = ServerState::new(0);
        insert_settled(&mut s, "module-tp", TRADING_POST_MODULE_TYPE, 1);
        // Hand-rolled deal so the get side and its overflow are exact: an
        // explicit player action must reject, never clamp-and-lose (P1.11's
        // rule is for passive production only).
        s.deals.push(DealData {
            deal_id: "deal-test-overflow".to_string(),
            slot: 99,
            rarity: DealRarity::Common,
            give: Some(DealSide {
                kind: TradeKind::Credits,
                amount: 10,
            }),
            get: DealSide {
                kind: TradeKind::Construction,
                amount: 300,
            },
            accepted: false,
        });
        s.resources.credits = 10;
        s.resources.construction = 900; // cap 1000 — 300 won't fit
        let err = s.accept_deal("deal-test-overflow", 0).unwrap_err();
        assert!(err.contains("storage"), "unexpected error: {err}");
        // Nothing was spent or gained, and the deal stays open.
        assert_eq!(s.resources.credits, 10);
        assert_eq!(s.resources.construction, 900);
        assert!(!s.deals.last().unwrap().accepted);
    }

    #[test]
    fn accept_rejects_a_malformed_same_type_deal() {
        let mut s = ServerState::new(0);
        insert_settled(&mut s, "module-tp", TRADING_POST_MODULE_TYPE, 1);
        s.deals.push(DealData {
            deal_id: "deal-test-same".to_string(),
            slot: 99,
            rarity: DealRarity::Common,
            give: Some(DealSide {
                kind: TradeKind::Fuel,
                amount: 10,
            }),
            get: DealSide {
                kind: TradeKind::Fuel,
                amount: 12,
            },
            accepted: false,
        });
        s.resources.fuel = 100;
        assert!(s.accept_deal("deal-test-same", 0).is_err());
        assert_eq!(s.resources.fuel, 100);
    }

    #[test]
    fn refresh_costs_follow_the_doubling_table_and_cap() {
        let mut s = ServerState::new(0);
        insert_settled(&mut s, "module-tp", TRADING_POST_MODULE_TYPE, 1);
        s.resources.credits = 150; // 0 + 10 + 20 + 40 + 80
        let first = s.refresh_deals(0).unwrap();
        assert_eq!(s.resources.credits, 150); // first is free
        assert_eq!(first.deals.refreshes_used, 1);
        // A refresh batch never contains a new freebie.
        assert!(first.deals.deals.iter().all(|d| d.give.is_some()));
        for expected_remaining in [140, 120, 80, 0] {
            s.refresh_deals(0).unwrap();
            assert_eq!(s.resources.credits, expected_remaining);
        }
        // Hard cap: 5 refreshes a day.
        assert!(s.refresh_deals(0).is_err());
    }

    #[test]
    fn failed_paid_refresh_does_not_consume_the_daily_slot() {
        // CR5.1 regression: spend_trade rejects the credits spend before
        // deal_refreshes_used is bumped, so an unaffordable paid refresh must
        // leave the day's refresh count and credits untouched.
        let mut s = ServerState::new(0);
        insert_settled(&mut s, "module-tp", TRADING_POST_MODULE_TYPE, 1);
        s.refresh_deals(0).unwrap(); // first refresh is free
        assert_eq!(s.deal_refreshes_used, 1);
        s.resources.credits = 5; // second refresh costs 10 — not enough
        let err = s.refresh_deals(0).unwrap_err();
        assert!(err.contains("not enough credits"), "{err}");
        assert_eq!(s.deal_refreshes_used, 1);
        assert_eq!(s.resources.credits, 5);
    }

    #[test]
    fn refresh_replaces_accepted_deals_and_scales_slots_with_level() {
        let mut s = ServerState::new(0);
        insert_settled(&mut s, "module-tp", TRADING_POST_MODULE_TYPE, 5);
        let freebie_id = s.deals[0].deal_id.clone();
        s.accept_deal(&freebie_id, 0).unwrap();
        let response = s.refresh_deals(0).unwrap();
        // Level 5 → 5 slots, all fresh, unaccepted, and freebie-less (the
        // claimed freebie is gone for the day).
        assert_eq!(response.deals.deals.len(), 5);
        assert!(response
            .deals
            .deals
            .iter()
            .all(|d| !d.accepted && d.give.is_some() && d.deal_id != freebie_id));
    }

    #[test]
    fn a_new_utc_day_rolls_the_shop_over() {
        let mut s = ServerState::new(0);
        insert_settled(&mut s, "module-tp", TRADING_POST_MODULE_TYPE, 1);
        s.resources.credits = 10;
        s.refresh_deals(0).unwrap();
        s.refresh_deals(0).unwrap(); // paid: credits now 0
        assert_eq!(s.deal_refreshes_used, 2);
        assert_eq!(s.resources.credits, 0);
        let old_ids: Vec<String> = s.deals.iter().map(|d| d.deal_id.clone()).collect();
        s.settle(DAY_MS + 1);
        assert_eq!(s.deals_day_index, 1);
        assert_eq!(s.deal_refreshes_used, 0);
        // Fresh daily batch: freebie back in slot 0, all-new ids.
        assert!(s.deals[0].give.is_none());
        assert!(s.deals.iter().all(|d| !old_ids.contains(&d.deal_id)));
        // The rollover was pushed, plus a feed notification (a Trading Post
        // is settled, so the player can act on it).
        let pushes = s.drain_pushes();
        assert!(pushes.iter().any(|p| matches!(p, ServerPush::Deals(_))));
        assert!(pushes
            .iter()
            .any(|p| matches!(p, ServerPush::Notification(n) if n.kind == "deals-refreshed")));
    }

    #[test]
    fn a_trading_post_level_up_adds_deal_slots_mid_batch() {
        let mut s = ServerState::new(0);
        assert_eq!(s.deals.len(), 3);
        // A settled level-2 post with a level-up to 3 in flight (3 → 4
        // slots once it settles).
        insert_settled(&mut s, "module-tp", TRADING_POST_MODULE_TYPE, 2);
        s.modules.get_mut("module-tp").unwrap().pending = Some(ModulePendingBuild {
            level: 3,
            dispatched_at: 0,
            completes_at: 1_000,
        });
        // Accept a deal first: the top-up must not reroll it.
        let deal = s.deals[1].clone();
        let give = deal.give.unwrap();
        s.resources.add_trade(give.kind, give.amount);
        s.accept_deal(&deal.deal_id, 0).unwrap();
        s.drain_pushes();
        s.settle_modules(1_000);
        // One new slot appended; the existing batch — accepted state
        // included — is untouched, and a top-up never mints a freebie.
        assert_eq!(s.deals.len(), 4);
        assert_eq!(s.deals[1].deal_id, deal.deal_id);
        assert!(s.deals[1].accepted);
        assert!(s.deals[0].give.is_none()); // the day's freebie stays put
        assert!(s.deals[3].give.is_some());
        assert!(!s.deals[3].accepted);
        // The change was pushed so an open shop dialog re-renders.
        let pushes = s.drain_pushes();
        assert!(pushes.iter().any(|p| matches!(p, ServerPush::Deals(_))));
        // Settling again (every read path calls this) is a no-op.
        s.settle_modules(2_000);
        assert_eq!(s.deals.len(), 4);
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
