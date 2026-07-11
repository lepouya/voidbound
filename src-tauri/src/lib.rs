mod game_state;
mod map;

use game_state::GameServer;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(GameServer::new(game_state::now_ms()))
        .setup(|app| {
            // The push scheduler (game_state::run_scheduler) settles due
            // state and emits server-push events for the app's lifetime.
            let handle = app.handle().clone();
            std::thread::spawn(move || game_state::run_scheduler(handle));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            map::generate_map,
            game_state::load_game_state,
            game_state::request_map_window,
            game_state::request_build_module,
            game_state::request_levelup_module,
            game_state::request_dispatch_vessel,
            game_state::request_recall_vessel,
            game_state::request_mine_asteroid,
            game_state::mark_notifications_read
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
