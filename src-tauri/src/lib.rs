mod game_state;
mod map;

use game_state::{GameServer, StartupReset};
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
            let save_path = app
                .path()
                .app_local_data_dir()
                .map_err(|error| format!("resolve local save directory: {error}"))?
                .join("local-system.json");
            if startup.list_players {
                let players = GameServer::list_players(save_path)?;
                if players.is_empty() {
                    println!("No local player profiles.");
                } else {
                    println!("Local player profiles:");
                    for player in players {
                        let pending = player
                            .pending_command_level
                            .map_or_else(String::new, |level| format!(" (upgrading to {level})"));
                        println!(
                            "- {} — Command Module level {}{pending}",
                            player.name, player.command_level
                        );
                    }
                }
                app.handle().exit(0);
                return Ok(());
            }
            game_state::configure_time_scale(startup.time_scale)?;
            if let Some(player) = startup.player {
                let server = GameServer::open(
                    save_path,
                    player,
                    startup.restore_backup,
                    startup.reset,
                    game_state::now_ms(),
                )?;
                app.manage(game_state::LocalProfiles::selected(&server)?);
                app.manage(server);
                let handle = app.handle().clone();
                std::thread::spawn(move || game_state::run_scheduler(handle));
            } else {
                app.manage(game_state::LocalProfiles::open(save_path)?);
            }
            let scale = game_state::time_scale();
            if scale != 1.0 {
                println!("--time-scale {scale} — scheduler timers running {scale}x speed");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            map::generate_map,
            game_state::get_local_profiles,
            game_state::request_begin_local_profile,
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
            game_state::request_assign_crew,
            game_state::request_accept_deal,
            game_state::request_refresh_deals,
            game_state::mark_notifications_read
        ])
        .build(tauri::generate_context!())
        .expect("error while building Tauri application");
    app.run(|app_handle, event| {
        if let tauri::RunEvent::ExitRequested { .. } = event {
            if let Some(server) = app_handle.try_state::<GameServer>() {
                server.persist_on_exit();
            }
        }
    });
}

struct StartupConfig {
    player: Option<String>,
    time_scale: f64,
    restore_backup: Option<usize>,
    reset: Option<StartupReset>,
    list_players: bool,
}

fn startup_config(matches: Matches) -> Result<StartupConfig, String> {
    let explicit_player = matches
        .args
        .get("player")
        .and_then(|argument| argument.value.as_str())
        .map(str::trim)
        .map(str::to_string);
    let reset_player = matches
        .args
        .get("reset-player")
        .and_then(|argument| argument.value.as_str())
        .map(str::trim)
        .map(str::to_string);
    let reset_system = boolean_flag(&matches, "reset-system");
    let list_players = boolean_flag(&matches, "list-players");
    if reset_system && reset_player.is_some() {
        return Err("--reset-player and --reset-system cannot be used together".to_string());
    }
    if reset_player.is_some() && explicit_player.is_some() {
        return Err("--reset-player already selects its player; omit --player".to_string());
    }
    if list_players
        && (reset_system
            || reset_player.is_some()
            || explicit_player.is_some()
            || matches
                .args
                .get("restore-backup")
                .and_then(|argument| argument.value.as_str())
                .is_some()
            || matches
                .args
                .get("time-scale")
                .and_then(|argument| argument.value.as_str())
                .is_some())
    {
        return Err(
            "--list-players cannot be combined with player, reset, restore, or time-scale options"
                .to_string(),
        );
    }
    if (reset_system || reset_player.is_some())
        && matches
            .args
            .get("restore-backup")
            .and_then(|argument| argument.value.as_str())
            .is_some()
    {
        return Err(
            "--reset-player/--reset-system cannot be combined with --restore-backup".to_string(),
        );
    }
    let reset = if reset_system {
        Some(StartupReset::System)
    } else if reset_player.is_some() {
        Some(StartupReset::Player)
    } else {
        None
    };
    let player = reset_player.or(explicit_player);
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
    if player.as_ref().is_some_and(|name| name.is_empty()) {
        return Err("--player must not be empty".to_string());
    }
    // Preserve the historical default identity for destructive/recovery CLI
    // controls. Normal launches (including --time-scale alone) show the chooser.
    let player = player
        .or_else(|| (reset.is_some() || restore_backup.is_some()).then(|| "Player 1".to_string()));
    Ok(StartupConfig {
        player,
        time_scale,
        restore_backup,
        reset,
        list_players,
    })
}

fn boolean_flag(matches: &Matches, name: &str) -> bool {
    matches
        .args
        .get(name)
        .and_then(|argument| argument.value.as_bool())
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;
    use tauri_plugin_cli::ArgData;

    fn matches(args: &[(&str, Value)]) -> Matches {
        let mut matches = Matches::default();
        for (name, value) in args {
            let mut data = ArgData::default();
            data.value = value.clone();
            data.occurrences = 1;
            matches.args.insert((*name).to_string(), data);
        }
        matches
    }

    #[test]
    fn normal_startup_and_time_scale_show_the_profile_chooser() {
        let normal = startup_config(matches(&[])).unwrap();
        assert_eq!(normal.player, None);
        assert_eq!(normal.time_scale, 1.0);

        let scaled =
            startup_config(matches(&[("time-scale", Value::String("4".to_string()))])).unwrap();
        assert_eq!(scaled.player, None);
        assert_eq!(scaled.time_scale, 4.0);
    }

    #[test]
    fn explicit_and_recovery_cli_controls_keep_direct_player_startup() {
        let explicit =
            startup_config(matches(&[("player", Value::String("Ada".to_string()))])).unwrap();
        assert_eq!(explicit.player.as_deref(), Some("Ada"));

        let restore = startup_config(matches(&[(
            "restore-backup",
            Value::String("2".to_string()),
        )]))
        .unwrap();
        assert_eq!(restore.player.as_deref(), Some("Player 1"));
        assert_eq!(restore.restore_backup, Some(2));

        let reset = startup_config(matches(&[("reset-system", Value::Bool(true))])).unwrap();
        assert_eq!(reset.player.as_deref(), Some("Player 1"));
        assert_eq!(reset.reset, Some(StartupReset::System));
    }
}
