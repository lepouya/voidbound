use super::crew::CrewActionResponse;
use super::deals::DealActionResponse;
use super::modules::ModuleActionResponse;
use super::scheduler::{finish_command, GameServer};
use super::state::{now_ms, GameStateData, NotificationData};
use super::world::{MapWindowData, MothershipActionResponse, VesselMoveEventData};

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
) -> Result<MothershipActionResponse, String> {
    let mut s = server.state.lock().map_err(|e| e.to_string())?;
    let result = s.relocate_mothership(dest_col, dest_row, now_ms());
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

/// Mark the whole notification feed read (the player opened the Mail panel) and
/// return the updated list — the client replaces its table with it, which
/// clears the Mail badge in every scene.
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
