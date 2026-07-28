mod game_state;
mod map;

use game_state::GameServer;
use tauri::Manager;
use tauri_plugin_cli::{CliExt, Matches};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_cli::init())
        .setup(|app| {
            let matches = app.cli().matches().map_err(|error| error.to_string())?;
            let startup = startup_config(matches)?;
            game_state::configure_time_scale(startup.time_scale)?;
            let save_path = app
                .path()
                .app_local_data_dir()
                .map_err(|error| format!("resolve local save directory: {error}"))?
                .join("local-system.json");
            let server = GameServer::open(
                save_path,
                startup.player,
                startup.restore_backup,
                game_state::now_ms(),
            )?;
            app.manage(server);
            let scale = game_state::time_scale();
            if scale != 1.0 {
                println!("--time-scale {scale} — scheduler timers running {scale}x speed");
            }
            // The push scheduler (game_state::run_scheduler) settles due
            // state and emits server-push events for the app's lifetime.
            let handle = app.handle().clone();
            std::thread::spawn(move || game_state::run_scheduler(handle));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            map::generate_map,
            game_state::load_game_state,
            game_state::reset_local_system,
            game_state::request_map_window,
            game_state::request_build_module,
            game_state::request_levelup_module,
            game_state::request_dispatch_vessel,
            game_state::request_recall_vessel,
            game_state::request_relocate_mothership,
            game_state::request_mine_asteroid,
            game_state::request_hire_crew,
            game_state::request_accept_deal,
            game_state::request_refresh_deals,
            game_state::mark_notifications_read
        ])
        .build(tauri::generate_context!())
        .expect("error while building Tauri application");
    app.run(|app_handle, event| {
        if let tauri::RunEvent::ExitRequested { .. } = event {
            app_handle.state::<GameServer>().persist_on_exit();
        }
    });
}

struct StartupConfig {
    player: String,
    time_scale: f64,
    restore_backup: Option<usize>,
}

fn startup_config(matches: Matches) -> Result<StartupConfig, String> {
    let player = matches
        .args
        .get("player")
        .and_then(|argument| argument.value.as_str())
        .unwrap_or("Player 1")
        .trim()
        .to_string();
    let mut time_scale = 1.0;
    let mut restore_backup = None;
    if let Some(raw) = matches
        .args
        .get("time-scale")
        .and_then(|argument| argument.value.as_str())
    {
        time_scale = raw
            .parse::<f64>()
            .ok()
            .filter(|scale| scale.is_finite() && *scale > 0.0)
            .ok_or_else(|| "--time-scale must be a finite number greater than zero".to_string())?;
    }
    if let Some(raw) = matches
        .args
        .get("restore-backup")
        .and_then(|argument| argument.value.as_str())
    {
        restore_backup = Some(
            raw.parse::<usize>()
                .ok()
                .filter(|index| (1..=5).contains(index))
                .ok_or_else(|| "--restore-backup must be an integer in 1..=5".to_string())?,
        );
    }
    if player.is_empty() {
        return Err("--player must not be empty".to_string());
    }
    Ok(StartupConfig {
        player,
        time_scale,
        restore_backup,
    })
}
