use super::crew::{CrewActionResponse, CrewAssignmentResponse};
use super::deals::DealActionResponse;
use super::modules::ModuleActionResponse;
use super::scheduler::{finish_command, GameServer};
use super::state::{now_ms, GameStateData, NotificationData, Revisioned};
use super::world::{MapWindowData, MothershipActionResponse, VesselMoveEventData};

/// Load the player's current game state, first settling anything that has
/// come due. The client calls this once during the loader phase; after that,
/// changes arrive over the SERVER_PUSH_EVENT channel — there is no polling.
#[tauri::command]
pub(crate) fn load_game_state(
    app: tauri::AppHandle,
    server: tauri::State<'_, GameServer>,
) -> Result<Revisioned<GameStateData>, String> {
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let data = s.snapshot(now_ms());
    let revision = finish_command(&app, server.inner(), s);
    Ok(Revisioned::new(revision, data))
}

/// Development-only: throw away the entire local system and reseed it, then
/// return the fresh snapshot so the client can adopt it without a relaunch.
/// Destroys every local profile and all world progress.
///
/// Refused outright in release builds — this is a developer data-management
/// control, never part of an online protocol. The client only offers it from
/// the load-failure dialog in dev builds, and both halves disappear once
/// Phase 3 owns the authoritative state (SERVER.md).
#[tauri::command]
pub(crate) fn reset_local_system(
    app: tauri::AppHandle,
    server: tauri::State<'_, GameServer>,
) -> Result<Revisioned<GameStateData>, String> {
    if !cfg!(debug_assertions) {
        return Err("reset_local_system is a development-only control".to_string());
    }
    server.reset_system(now_ms())?;
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let data = s.snapshot(now_ms());
    let revision = finish_command(&app, server.inner(), s);
    Ok(Revisioned::new(revision, data))
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
) -> Result<Revisioned<MapWindowData>, String> {
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let result = s.map_window(center_col, center_row, now_ms());
    let revision = finish_command(&app, server.inner(), s);
    result.map(|data| Revisioned::new(revision, data))
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
) -> Result<Revisioned<VesselMoveEventData>, String> {
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let result = s.dispatch_vessel(dest_col, dest_row, now_ms());
    let revision = finish_command(&app, server.inner(), s);
    result.map(|data| Revisioned::new(revision, data))
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
) -> Result<Revisioned<VesselMoveEventData>, String> {
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let result = s.mine_asteroid(&asteroid_id, now_ms());
    let revision = finish_command(&app, server.inner(), s);
    result.map(|data| Revisioned::new(revision, data))
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
) -> Result<Revisioned<VesselMoveEventData>, String> {
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let result = s.recall_vessel(&vessel_id, now_ms());
    let revision = finish_command(&app, server.inner(), s);
    result.map(|data| Revisioned::new(revision, data))
}

/// Request relocation of the player's mothership to the given 4*4 footprint
/// (ROADMAP P1.22). The no-vessels-deployed precondition, map bounds, and
/// footprint occupancy against every other mothership/asteroid are all
/// verified here — on success the fuel cost is already deducted and the
/// returned mothership + resource counts are authoritative.
#[tauri::command]
pub(crate) fn request_relocate_mothership(
    app: tauri::AppHandle,
    server: tauri::State<'_, GameServer>,
    dest_col: i64,
    dest_row: i64,
) -> Result<Revisioned<MothershipActionResponse>, String> {
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let result = s.relocate_mothership(dest_col, dest_row, now_ms());
    let revision = finish_command(&app, server.inner(), s);
    result.map(|data| Revisioned::new(revision, data))
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
) -> Result<Revisioned<ModuleActionResponse>, String> {
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let result = s.build_module(col, row, module_type, now_ms());
    let revision = finish_command(&app, server.inner(), s);
    result.map(|data| Revisioned::new(revision, data))
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
) -> Result<Revisioned<ModuleActionResponse>, String> {
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let result = s.levelup_module(&module_id, now_ms());
    let revision = finish_command(&app, server.inner(), s);
    result.map(|data| Revisioned::new(revision, data))
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
) -> Result<Revisioned<CrewActionResponse>, String> {
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let result = s.hire_crew(now_ms());
    let revision = finish_command(&app, server.inner(), s);
    result.map(|data| Revisioned::new(revision, data))
}

/// Assign an exact number of available crew to one settled crew-demanding
/// module (ROADMAP P2.8). The backend settles production before changing the
/// allocation, verifies both the module demand and the ship-wide free crew
/// pool, then returns the complete CrewData snapshot for the shared apply
/// path.
#[tauri::command]
pub(crate) fn request_assign_crew(
    app: tauri::AppHandle,
    server: tauri::State<'_, GameServer>,
    module_id: String,
    assigned: u32,
) -> Result<Revisioned<CrewAssignmentResponse>, String> {
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let result = s.assign_crew(&module_id, assigned, now_ms());
    let revision = finish_command(&app, server.inner(), s);
    result.map(|data| Revisioned::new(revision, data))
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
) -> Result<Revisioned<DealActionResponse>, String> {
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let result = s.accept_deal(&deal_id, now_ms());
    let revision = finish_command(&app, server.inner(), s);
    result.map(|data| Revisioned::new(revision, data))
}

/// Refresh the Trading Post deal slots (ROADMAP P1.12). The settled-post
/// requirement, the daily refresh cap, and the doubling credits cost are all
/// verified here — on success the cost is already deducted and the returned
/// deal state + resource counts are authoritative.
#[tauri::command]
pub(crate) fn request_refresh_deals(
    app: tauri::AppHandle,
    server: tauri::State<'_, GameServer>,
) -> Result<Revisioned<DealActionResponse>, String> {
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let result = s.refresh_deals(now_ms());
    let revision = finish_command(&app, server.inner(), s);
    result.map(|data| Revisioned::new(revision, data))
}

/// Mark the whole notification feed read (the player opened the Mail panel) and
/// return the updated list — the client replaces its table with it, which
/// clears the Mail badge in every scene.
#[tauri::command]
pub(crate) fn mark_notifications_read(
    app: tauri::AppHandle,
    server: tauri::State<'_, GameServer>,
) -> Result<Revisioned<Vec<NotificationData>>, String> {
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let notifications = s.mark_notifications_read();
    let revision = finish_command(&app, server.inner(), s);
    Ok(Revisioned::new(revision, notifications))
}
