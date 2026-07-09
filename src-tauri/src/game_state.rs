use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;

#[derive(Serialize, serde::Deserialize)]
pub struct PlayerIdentity {
    pub id: String,
    pub name: String,
}

/// One of the four material resources a module can produce or a build can
/// cost. Excludes `credits`, which is trade-only and never produced by a
/// module. Mirrors the material subset of the TS `ResourceKind` in
/// `src/game-state.ts` — keep the two in sync.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum ResourceKind {
    Construction,
    HighTech,
    Biological,
    Fuel,
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
    fn add(&mut self, kind: ResourceKind, amount: u64) {
        match kind {
            ResourceKind::Construction => self.construction += amount,
            ResourceKind::HighTech => self.high_tech += amount,
            ResourceKind::Biological => self.biological += amount,
            ResourceKind::Fuel => self.fuel += amount,
        }
    }

    /// Every module cost is stubbed as construction-only for now (ROADMAP
    /// P1.4) — fine-tuned to a real per-resource mix later.
    fn spend_construction(&mut self, amount: u64) -> Result<(), String> {
        if self.construction < amount {
            return Err(format!(
                "not enough construction material: need {amount}, have {}",
                self.construction
            ));
        }
        self.construction -= amount;
        Ok(())
    }
}

/// One entry in the module catalog (ROADMAP P1.4): production, cost, build
/// time, and unlock prerequisite for a module type. Cost/time/production all
/// scale by `scale_for_level` — a deliberate doubling-per-level stub until
/// real balancing lands. Mirrors the TS `MODULE_CATALOG` in
/// `src/module-catalog.ts` — keep the two in sync.
pub struct ModuleCatalogEntry {
    /// Wire key — the `module_type` string on `ModuleData` and build requests.
    pub module_type: &'static str,
    pub display_name: &'static str,
    /// Resources produced per production tick at level 1; doubles per level.
    pub produces: &'static [(ResourceKind, u64)],
    /// Construction-material cost to build (or level up to) level 1; doubles
    /// per level thereafter.
    pub base_cost_construction: u64,
    /// Build/level-up time in ms at level 1; doubles per level thereafter.
    pub base_build_time_ms: u64,
    /// Minimum Command Module level required before this type can be built.
    pub unlock_command_level: u32,
}

pub const COMMAND_MODULE_TYPE: &str = "command";

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
        base_cost_construction: 20,
        base_build_time_ms: 30_000,
        unlock_command_level: 0,
    },
    ModuleCatalogEntry {
        module_type: "ore-refinery",
        display_name: "Ore Refinery",
        produces: &[(ResourceKind::Construction, 2)],
        base_cost_construction: 10,
        base_build_time_ms: 15_000,
        unlock_command_level: 1,
    },
    ModuleCatalogEntry {
        module_type: "electronics-fabricator",
        display_name: "Electronics Fabricator",
        produces: &[(ResourceKind::HighTech, 2)],
        base_cost_construction: 10,
        base_build_time_ms: 15_000,
        unlock_command_level: 1,
    },
    ModuleCatalogEntry {
        module_type: "hydroponics-bay",
        display_name: "Hydroponics Bay",
        produces: &[(ResourceKind::Biological, 2)],
        base_cost_construction: 10,
        base_build_time_ms: 15_000,
        unlock_command_level: 1,
    },
    ModuleCatalogEntry {
        module_type: "fusion-reactor",
        display_name: "Fusion Reactor",
        produces: &[(ResourceKind::Fuel, 2)],
        base_cost_construction: 10,
        base_build_time_ms: 15_000,
        unlock_command_level: 1,
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

/// Game state pushed to the client. Mirrors the TS `GameStateData` in
/// `src/game-state.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize)]
pub struct GameStateData {
    pub player: PlayerIdentity,
    pub resources: ResourceCounts,
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
    /// Every module in the ship, built or under construction, including the
    /// Command Module — placement and level are server-owned, so ShipLevel
    /// builds its actors from this list with no hardcoded layout.
    pub modules: Vec<ModuleData>,
}

// -- Server-authoritative game rules ----------------------------------------
//
// The backend owns all resource math and build verification: the client can
// be tampered with, so it only renders what these commands return and asks
// for actions — it never computes or mutates resource values on its own.
// This is the phase-3 server model (SERVER.md) running in-process for now.

/// Length of one production interval. The TS PRODUCTION_TICK_MS mirrors this
/// as the client's poll cadence — keep the two in sync.
const PRODUCTION_TICK_MS: u64 = 5_000;

/// Ship-interior room layout — mirrors SHIP_ROOM_GRID in `src/grid-math.ts`
/// and the geometry drawn in art/ship-level.tmj; keep all three in sync.
const ROOM_ORIGIN: i64 = 1;
const ROOM_SPAN: i64 = 6;
const ROOM_PITCH: i64 = 8;
const ROOM_COUNT: i64 = 5;
/// Modules occupy the 4*4 center of their 6*6 room.
const MODULE_SPAN: i64 = 4;

/// Space-map bounds — mirror COLS/ROWS in `map.rs::generate_space_map`;
/// keep in sync.
const MAP_COLS: i64 = 100;
const MAP_ROWS: i64 = 100;
/// Map-scene tile size in world px — mirrors the tile_width/tile_height in
/// `map.rs::generate_space_map`; keep in sync.
const MAP_TILE_PX: f64 = 32.0;
/// Vessel travel speed in world px/s. Server-verified: clients render the
/// speed the event carries, they never choose it. Update on upgrade (P4).
const VESSEL_SPEED_PX_S: f64 = 32.0;
/// Sprite/capability type of the only vessel class so far.
const VESSEL_TYPE: &str = "cs1";

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
}

/// Progress of a vessel's move at `now_ms`, clamped to [0, 1].
fn move_progress(v: &VesselMoveEventData, now_ms: u64) -> f64 {
    let duration = v.arrival_at.saturating_sub(v.dispatched_at);
    if duration == 0 || now_ms >= v.arrival_at {
        return 1.0;
    }
    now_ms.saturating_sub(v.dispatched_at) as f64 / duration as f64
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
        // Placeholder world: the player's mothership plus one sample enemy.
        // Persistence (P2) / the real server (P3) will load these instead.
        let motherships = HashMap::from([
            (
                player.id.clone(),
                MothershipData {
                    mothership_id: player.id.clone(),
                    owner_id: player.id,
                    owner_name: player.name,
                    ship_type: "ss1".to_string(),
                    damaged: false,
                    col: 48,
                    row: 48,
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
                    col: 53,
                    row: 49,
                    span: 4,
                },
            ),
        ]);
        Self {
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
        }
    }

    /// The requesting player's own mothership — dispatch departs from it.
    fn player_mothership(&self) -> Result<&MothershipData, String> {
        self.motherships
            .get(&player_identity().id)
            .ok_or_else(|| "player has no mothership".to_string())
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

    /// Promote every module whose pending build/upgrade has finished — lazy
    /// settlement on read/mutation, like production accrual and docked-vessel
    /// pruning, so nothing needs a background timer.
    fn settle_modules(&mut self, now_ms: u64) {
        for module in self.modules.values_mut() {
            if let Some(pending) = &module.pending {
                if now_ms >= pending.completes_at {
                    module.level = pending.level;
                    module.pending = None;
                }
            }
        }
    }

    /// Accrue production for every whole interval elapsed since the last
    /// applied tick, summed across every settled (level >= 1) module's
    /// catalog `produces` entry, scaled by its current level. A clock that
    /// went backwards re-anchors instead of freezing production. Credits are
    /// earned through trade (P1.12), never produced.
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
            if old_level > 0 && old_ticks > 0 {
                for &(kind, base) in entry.produces {
                    self.resources
                        .add(kind, scale_for_level(base, old_level) * old_ticks);
                }
            }
            if new_level > 0 && new_ticks > 0 {
                for &(kind, base) in entry.produces {
                    self.resources
                        .add(kind, scale_for_level(base, new_level) * new_ticks);
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
        self.resources.spend_construction(cost)?;
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
        self.resources.spend_construction(cost)?;
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

    /// Drop vessels that have finished a move onto a docking tile of their
    /// own mothership — docking despawns the vessel (mirrors the arrival
    /// handling in applyVesselMoveEvent, src/map-level.ts). Vessels parked at
    /// any other destination persist until recalled.
    fn prune_docked_vessels(&mut self, now_ms: u64) {
        let motherships = &self.motherships;
        self.vessels.retain(|_, v| {
            now_ms < v.arrival_at
                || !motherships
                    .get(&v.mothership_id)
                    .is_some_and(|ship| is_dock_tile(ship, v.dest_col, v.dest_row))
        });
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
        self.prune_docked_vessels(now_ms);
        let ship = self.player_mothership()?;
        if !(0..MAP_COLS).contains(&dest_col) || !(0..MAP_ROWS).contains(&dest_row) {
            return Err(format!("({dest_col}, {dest_row}) is outside the map"));
        }
        if is_dock_tile(ship, dest_col, dest_row) {
            return Err(format!("({dest_col}, {dest_row}) is a docking tile"));
        }
        let (src_col, src_row) = closest_dock_tile(ship, dest_col as f64, dest_row as f64);
        let mothership_id = ship.mothership_id.clone();
        self.next_vessel_seq += 1;
        let player = player_identity();
        let event = VesselMoveEventData {
            vessel_id: format!("vessel-{}-{}", now_ms, self.next_vessel_seq),
            owner_id: player.id,
            owner_name: player.name,
            mothership_id,
            vessel_type: VESSEL_TYPE.to_string(),
            src_col: src_col as f64,
            src_row: src_row as f64,
            dest_col,
            dest_row,
            speed: VESSEL_SPEED_PX_S,
            dispatched_at: now_ms,
            arrival_at: now_ms
                + travel_time_ms(
                    src_col as f64,
                    src_row as f64,
                    dest_col as f64,
                    dest_row as f64,
                    VESSEL_SPEED_PX_S,
                ),
        };
        self.vessels.insert(event.vessel_id.clone(), event.clone());
        Ok(event)
    }

    /// Verify and execute a recall: the vessel must exist and belong to the
    /// requesting player. The return leg departs from the vessel's current
    /// (lerped, possibly fractional) position toward the closest docking
    /// tile; arriving there despawns it (see prune_docked_vessels).
    fn recall_vessel(
        &mut self,
        vessel_id: &str,
        now_ms: u64,
    ) -> Result<VesselMoveEventData, String> {
        self.prune_docked_vessels(now_ms);
        let vessel = self
            .vessels
            .get(vessel_id)
            .ok_or_else(|| format!("unknown vessel: {vessel_id:?}"))?;
        if vessel.owner_id != player_identity().id {
            return Err(format!("vessel {vessel_id:?} belongs to another player"));
        }
        let ship = self
            .motherships
            .get(&vessel.mothership_id)
            .ok_or_else(|| format!("vessel {vessel_id:?} has no mothership to return to"))?;
        let t = move_progress(vessel, now_ms);
        let src_col = vessel.src_col + (vessel.dest_col as f64 - vessel.src_col) * t;
        let src_row = vessel.src_row + (vessel.dest_row as f64 - vessel.src_row) * t;
        let (dock_col, dock_row) = closest_dock_tile(ship, src_col, src_row);
        let event = VesselMoveEventData {
            src_col,
            src_row,
            dest_col: dock_col,
            dest_row: dock_row,
            dispatched_at: now_ms,
            arrival_at: now_ms
                + travel_time_ms(
                    src_col,
                    src_row,
                    dock_col as f64,
                    dock_row as f64,
                    vessel.speed,
                ),
            ..vessel.clone()
        };
        self.vessels.insert(vessel_id.to_string(), event.clone());
        Ok(event)
    }

    /// Every mothership on the map, in stable id order — the placement slice
    /// of the load_game_state snapshot.
    fn motherships_snapshot(&self) -> Vec<MothershipData> {
        let mut ships: Vec<_> = self.motherships.values().cloned().collect();
        ships.sort_by(|a, b| a.mothership_id.cmp(&b.mothership_id));
        ships
    }

    /// Every vessel currently in flight or parked, in dispatch order — the
    /// vessel slice of the load_game_state snapshot.
    fn active_vessels(&mut self, now_ms: u64) -> Vec<VesselMoveEventData> {
        self.prune_docked_vessels(now_ms);
        let mut vessels: Vec<_> = self.vessels.values().cloned().collect();
        vessels
            .sort_by(|a, b| (a.dispatched_at, &a.vessel_id).cmp(&(b.dispatched_at, &b.vessel_id)));
        vessels
    }
}

/// Load the player's current game state, first accruing any production that
/// has come due. The client calls this once during the loader phase and then
/// polls it every production interval — that poll is how produced resources
/// reach the client.
#[tauri::command]
pub(crate) fn load_game_state(
    state: tauri::State<'_, Mutex<ServerState>>,
) -> Result<GameStateData, String> {
    let mut s = state.lock().map_err(|e| e.to_string())?;
    let now = now_ms();
    s.accrue_production(now);
    Ok(GameStateData {
        player: player_identity(),
        resources: s.resources,
        motherships: s.motherships_snapshot(),
        vessels: s.active_vessels(now),
        modules: s.modules_snapshot(now),
    })
}

/// Request dispatch of a vessel from the player's mothership to the given
/// map tile. Destination, departure dock, speed, and arrival time are
/// verified/derived here — the returned event is authoritative and already
/// part of subsequent load_game_state snapshots.
#[tauri::command]
pub(crate) fn request_dispatch_vessel(
    state: tauri::State<'_, Mutex<ServerState>>,
    dest_col: i64,
    dest_row: i64,
) -> Result<VesselMoveEventData, String> {
    let mut s = state.lock().map_err(|e| e.to_string())?;
    s.dispatch_vessel(dest_col, dest_row, now_ms())
}

/// Request recall of an in-flight or parked vessel back to the mothership.
/// The return leg departs from the vessel's server-computed current position.
#[tauri::command]
pub(crate) fn request_recall_vessel(
    state: tauri::State<'_, Mutex<ServerState>>,
    vessel_id: String,
) -> Result<VesselMoveEventData, String> {
    let mut s = state.lock().map_err(|e| e.to_string())?;
    s.recall_vessel(&vessel_id, now_ms())
}

/// Request construction of a new module at the given anchor tile. Catalog
/// type, unlock level, placement, and cost are all verified here — on
/// success the cost is already deducted and the returned module + resource
/// counts are authoritative.
#[tauri::command]
pub(crate) fn request_build_module(
    state: tauri::State<'_, Mutex<ServerState>>,
    col: i64,
    row: i64,
    module_type: String,
) -> Result<ModuleActionResponse, String> {
    let mut s = state.lock().map_err(|e| e.to_string())?;
    s.build_module(col, row, module_type, now_ms())
}

/// Request a level-up of an existing module. Ownership, pending state, and
/// the Command Module's level cap are all verified here — on success the
/// cost is already deducted and the returned module + resource counts are
/// authoritative.
#[tauri::command]
pub(crate) fn request_levelup_module(
    state: tauri::State<'_, Mutex<ServerState>>,
    module_id: String,
) -> Result<ModuleActionResponse, String> {
    let mut s = state.lock().map_err(|e| e.to_string())?;
    s.levelup_module(&module_id, now_ms())
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
        let event = s.dispatch_vessel(50, 60, 1_000).unwrap();
        // Mothership at (48, 48), 4*4: the inner docks are (49..=50, 49..=50).
        assert_eq!((event.src_col, event.src_row), (50.0, 50.0));
        assert_eq!((event.dest_col, event.dest_row), (50, 60));
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
        for (col, row) in [(100, 5), (5, -1), (-3, 3), (2, 100)] {
            let err = s.dispatch_vessel(col, row, 0).unwrap_err();
            assert!(err.contains("outside the map"), "{err}");
        }
        let err = s.dispatch_vessel(49, 50, 0).unwrap_err();
        assert!(err.contains("docking tile"), "{err}");
        assert!(s.active_vessels(0).is_empty());
    }

    #[test]
    fn recall_redirects_from_the_lerped_mid_flight_position() {
        let mut s = ServerState::new(0);
        let out = s.dispatch_vessel(50, 60, 0).unwrap();
        // Halfway through the 10 s outbound flight the vessel sits at row 55.
        let back = s.recall_vessel(&out.vessel_id, 5_000).unwrap();
        assert_eq!(back.vessel_id, out.vessel_id);
        assert_eq!((back.src_col, back.src_row), (50.0, 55.0));
        assert_eq!((back.dest_col, back.dest_row), (50, 50));
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
        let out = s.dispatch_vessel(50, 60, 0).unwrap();
        // Long past arrival the vessel is still on the map, parked at dest.
        assert_eq!(s.active_vessels(60_000).len(), 1);
        let back = s.recall_vessel(&out.vessel_id, 60_000).unwrap();
        assert_eq!((back.src_col, back.src_row), (50.0, 60.0));
        assert_eq!((back.dest_col, back.dest_row), (50, 50));
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
        assert_eq!((player.col, player.row, player.span), (48, 48, 4));
        assert!(!player.damaged);
        let enemy = ships.iter().find(|m| m.owner_id == "player-2").unwrap();
        assert_eq!((enemy.col, enemy.row), (53, 49));
        assert!(enemy.damaged);
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
}
