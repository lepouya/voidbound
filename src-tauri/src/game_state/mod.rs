mod commands;
mod crew;
mod deals;
mod modules;
mod resources;
mod scheduler;
mod state;
#[cfg(test)]
mod test_support;
mod world;

// A glob, not an explicit list: #[tauri::command] emits hidden companion
// items (__cmd__*, __tauri_command_name_*) alongside each fn that
// generate_handler! also needs — an explicit re-export list would miss them.
pub(crate) use commands::*;
pub(crate) use scheduler::{run_scheduler, GameServer};
pub(crate) use state::{now_ms, time_scale, MAP_COLS, MAP_ROWS, MAP_TILE_PX};
