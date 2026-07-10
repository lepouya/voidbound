use serde::Serialize;

use crate::game_state::{MAP_COLS, MAP_ROWS, MAP_TILE_PX};

#[derive(Serialize, serde::Deserialize)]
pub struct TileMapData {
    pub cols: u32,
    pub rows: u32,
    pub tile_width: u32,
    pub tile_height: u32,
    pub tiles: Vec<String>,
}

/// Geometry only (ROADMAP P1.9): at the full 1000*1000 size, per-tile content
/// would ship a million strings over IPC and pre-allocate a million Excalibur
/// Tile objects for what is mostly empty space. The empty `tiles` vector
/// tells the client to render a plain background and treat the grid as pure
/// coordinate math — asteroids and motherships are the landmarks (a real
/// starfield is later art work).
fn generate_space_map() -> TileMapData {
    TileMapData {
        cols: MAP_COLS as u32,
        rows: MAP_ROWS as u32,
        tile_width: MAP_TILE_PX as u32,
        tile_height: MAP_TILE_PX as u32,
        tiles: Vec::new(),
    }
}

fn generate_ship_map() -> Result<TileMapData, String> {
    // To load from a network call instead, replace include_str! with a
    // fetched string — the Result propagation is already in place.
    let json = include_str!("../../src/assets/ship-level.json");
    serde_json::from_str(json).map_err(|e| format!("ship-level.json parse error: {e}"))
}

#[tauri::command]
pub(crate) fn generate_map(map_type: String) -> Result<TileMapData, String> {
    match map_type.as_str() {
        "map" => Ok(generate_space_map()),
        "ship" => generate_ship_map(),
        other => Err(format!("unrecognized map_type: {other:?}")),
    }
}
