use std::collections::{HashMap, HashSet};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;

#[derive(Serialize, serde::Deserialize)]
pub struct PlayerIdentity {
    pub id: String,
    pub name: String,
}

/// The player's stock of the four material resources plus the generic trade
/// currency ("credits" — placeholder term, renamed in the display layer if
/// needed). Mirrors the TS `ResourceCounts` in `src/game-state.ts` — keep
/// the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Copy)]
#[serde(rename_all = "camelCase")]
pub struct ResourceCounts {
    pub construction: u64,
    pub high_tech: u64,
    pub biological: u64,
    pub fuel: u64,
    pub credits: u64,
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
/// Build timer of the placeholder "base" module (P1.4 catalog: per type/level).
const MODULE_BUILD_TIME_MS: u64 = 15_000;
/// Cost of the placeholder "base" module, in `construction` resources. The
/// TS MODULE_COST_CONSTRUCTION mirrors this for display — keep in sync.
const MODULE_COST_CONSTRUCTION: u64 = 10;

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

/// A module construction authorized by the backend. Mirrors the TS
/// `BuildModuleEvent` in `src/ship-level.ts` — keep the two in sync.
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BuildModuleEventData {
    pub module_id: String,
    pub owner_id: String,
    pub owner_name: String,
    pub module_type: String,
    pub col: i64,
    pub row: i64,
    pub dispatched_at: u64,
    pub completes_at: u64,
}

/// Result of a verified build request: the authorized event plus the
/// resource counts after the cost was deducted.
#[derive(Serialize)]
pub struct BuildModuleResponse {
    pub event: BuildModuleEventData,
    pub resources: ResourceCounts,
}

/// Authoritative per-player state, held in memory for the app's lifetime.
/// Phase 2 serializes it to a save file; the phase-3 server owns it remotely.
pub struct ServerState {
    resources: ResourceCounts,
    /// Epoch ms of the last applied production-interval boundary. Production
    /// accrues lazily in whole intervals whenever state is read or mutated,
    /// so no background timer thread is needed.
    last_production_at: u64,
    /// Room-origin coords that already host a module.
    occupied_rooms: HashSet<(i64, i64)>,
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
        let mut occupied_rooms = HashSet::new();
        // The Command Module pre-exists, centered on the map at (18, 18) —
        // see ShipLevel::setupActors.
        occupied_rooms.insert(room_origin_at(18, 18).expect("command module room"));
        // Placeholder world: the player's mothership plus one sample enemy.
        // Persistence (P2) / the real server (P3) will load these instead.
        let player = player_identity();
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
            occupied_rooms,
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

    /// Accrue Command-Module baseline production (1 of each material per
    /// tick) for every whole interval elapsed since the last applied tick.
    /// Credits are earned through trade (P1.12), never produced. A clock
    /// that went backwards re-anchors instead of freezing production.
    fn accrue_production(&mut self, now_ms: u64) {
        if now_ms < self.last_production_at {
            self.last_production_at = now_ms;
            return;
        }
        let ticks = (now_ms - self.last_production_at) / PRODUCTION_TICK_MS;
        if ticks == 0 {
            return;
        }
        self.resources.construction += ticks;
        self.resources.high_tech += ticks;
        self.resources.biological += ticks;
        self.resources.fuel += ticks;
        self.last_production_at += ticks * PRODUCTION_TICK_MS;
    }

    /// Verify and execute a build request: the spot must be the free canonical
    /// anchor of a room and the player must afford the cost. Deducts the cost
    /// and returns the authorized event.
    fn build_module(
        &mut self,
        col: i64,
        row: i64,
        module_type: String,
        now_ms: u64,
    ) -> Result<BuildModuleEventData, String> {
        if module_type != "base" {
            return Err(format!("unknown module type: {module_type:?}"));
        }
        self.accrue_production(now_ms);
        let anchor = module_anchor_at(col, row).ok_or("build spot is not inside a room")?;
        if anchor != (col, row) {
            return Err(format!(
                "({col}, {row}) is not a module anchor; expected {anchor:?}"
            ));
        }
        let room = room_origin_at(col, row).expect("anchor implies a room");
        if self.occupied_rooms.contains(&room) {
            return Err(format!("room at {room:?} already has a module"));
        }
        if self.resources.construction < MODULE_COST_CONSTRUCTION {
            return Err(format!(
                "not enough construction material: need {MODULE_COST_CONSTRUCTION}, have {}",
                self.resources.construction
            ));
        }
        self.resources.construction -= MODULE_COST_CONSTRUCTION;
        self.occupied_rooms.insert(room);
        self.next_module_seq += 1;
        let player = player_identity();
        Ok(BuildModuleEventData {
            module_id: format!("module-{}-{}", now_ms, self.next_module_seq),
            owner_id: player.id,
            owner_name: player.name,
            module_type,
            col,
            row,
            dispatched_at: now_ms,
            completes_at: now_ms + MODULE_BUILD_TIME_MS,
        })
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

/// Request construction of a module at the given anchor tile. Placement and
/// cost are verified here — on success the cost is already deducted and the
/// returned event + resource counts are authoritative.
#[tauri::command]
pub(crate) fn request_build_module(
    state: tauri::State<'_, Mutex<ServerState>>,
    col: i64,
    row: i64,
    module_type: String,
) -> Result<BuildModuleResponse, String> {
    let mut s = state.lock().map_err(|e| e.to_string())?;
    let event = s.build_module(col, row, module_type, now_ms())?;
    Ok(BuildModuleResponse {
        event,
        resources: s.resources,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const TICK: u64 = PRODUCTION_TICK_MS;

    /// A state that can afford `builds` modules, with production anchored so
    /// no further accrual lands at time `at`.
    fn funded_state(builds: u64, at: u64) -> ServerState {
        let mut s = ServerState::new(at);
        s.resources.construction = builds * MODULE_COST_CONSTRUCTION;
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
    fn build_deducts_cost_and_returns_a_timed_event() {
        let mut s = funded_state(1, 0);
        let event = s.build_module(2, 2, "base".to_string(), 1_000).unwrap();
        assert_eq!(s.resources.construction, 0);
        assert_eq!((event.col, event.row), (2, 2));
        assert_eq!(event.dispatched_at, 1_000);
        assert_eq!(event.completes_at, 1_000 + MODULE_BUILD_TIME_MS);
        assert_eq!(event.owner_id, player_identity().id);
    }

    #[test]
    fn build_accrues_due_production_before_the_cost_check() {
        // 0 on hand, but by the time of the request enough ticks have passed.
        let mut s = ServerState::new(0);
        let at = MODULE_COST_CONSTRUCTION * TICK;
        assert!(s.build_module(2, 2, "base".to_string(), at).is_ok());
        assert_eq!(s.resources.construction, 0);
    }

    #[test]
    fn build_rejects_insufficient_resources_without_side_effects() {
        let mut s = ServerState::new(0);
        s.resources.construction = MODULE_COST_CONSTRUCTION - 1;
        let err = s.build_module(2, 2, "base".to_string(), 0).unwrap_err();
        assert!(err.contains("not enough construction"), "{err}");
        assert_eq!(s.resources.construction, MODULE_COST_CONSTRUCTION - 1);
        // The room was not marked occupied by the failed attempt.
        assert!(s.build_module(2, 2, "base".to_string(), TICK).is_ok());
    }

    #[test]
    fn build_rejects_occupied_rooms_and_bad_spots() {
        let mut s = funded_state(10, 0);
        // The command module's room is pre-occupied.
        assert!(s
            .build_module(18, 18, "base".to_string(), 0)
            .unwrap_err()
            .contains("already has a module"));
        // Corridor tile: not inside a room.
        assert!(s
            .build_module(7, 7, "base".to_string(), 0)
            .unwrap_err()
            .contains("not inside a room"));
        // Inside a room but not the canonical anchor.
        assert!(s
            .build_module(1, 1, "base".to_string(), 0)
            .unwrap_err()
            .contains("not a module anchor"));
        // Unknown type.
        assert!(s
            .build_module(2, 2, "turbo".to_string(), 0)
            .unwrap_err()
            .contains("unknown module type"));
        // A successful build occupies the room for the next attempt.
        assert!(s.build_module(2, 2, "base".to_string(), 0).is_ok());
        assert!(s
            .build_module(2, 2, "base".to_string(), 0)
            .unwrap_err()
            .contains("already has a module"));
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
