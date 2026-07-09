mod game_state;
mod map;

use std::sync::Mutex;

use game_state::ServerState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(ServerState::new(game_state::now_ms())))
        .invoke_handler(tauri::generate_handler![
            map::generate_map,
            game_state::load_game_state,
            game_state::request_build_module,
            game_state::request_dispatch_vessel,
            game_state::request_recall_vessel
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
