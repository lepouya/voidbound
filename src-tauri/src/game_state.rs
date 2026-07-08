use std::collections::HashSet;
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
}

impl ServerState {
    pub fn new(now_ms: u64) -> Self {
        let mut occupied_rooms = HashSet::new();
        // The Command Module pre-exists, centered on the map at (18, 18) —
        // see ShipLevel::setupActors.
        occupied_rooms.insert(room_origin_at(18, 18).expect("command module room"));
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
        }
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
    s.accrue_production(now_ms());
    Ok(GameStateData {
        player: player_identity(),
        resources: s.resources,
    })
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
}
