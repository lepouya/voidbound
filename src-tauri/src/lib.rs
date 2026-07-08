use serde::Serialize;

#[derive(Serialize, serde::Deserialize)]
pub struct TileMapData {
    pub cols: u32,
    pub rows: u32,
    pub tile_width: u32,
    pub tile_height: u32,
    pub tiles: Vec<String>,
}

fn generate_space_map() -> TileMapData {
    const COLS: u32 = 100;
    const ROWS: u32 = 100;
    // Tile IDs within test-tileset: 0 = gray (background), 1 = blue, 2 = red, 3 = green
    // Rects as (x, y, w, h, tile).
    #[rustfmt::skip]
    let rects: [(u32, u32, u32, u32, &str); 24] = [
        (2, 2, 12, 12, "test-tileset:1"),
        (20, 5, 8, 8, "test-tileset:2"),
        (35, 2, 15, 10, "test-tileset:3"),
        (60, 3, 10, 10, "test-tileset:1"),
        (80, 1, 18, 14, "test-tileset:2"),
        (5, 20, 10, 15, "test-tileset:3"),
        (25, 22, 20, 6, "test-tileset:1"),
        (50, 18, 12, 12, "test-tileset:2"),
        (70, 20, 8, 20, "test-tileset:3"),
        (85, 25, 14, 10, "test-tileset:1"),
        (10, 40, 18, 8, "test-tileset:2"),
        (35, 38, 10, 10, "test-tileset:3"),
        (55, 42, 14, 14, "test-tileset:1"),
        (78, 45, 20, 8, "test-tileset:2"),
        (3, 55, 8, 16, "test-tileset:1"),
        (20, 58, 12, 12, "test-tileset:3"),
        (40, 55, 16, 10, "test-tileset:2"),
        (65, 60, 10, 10, "test-tileset:3"),
        (82, 58, 16, 16, "test-tileset:1"),
        (8, 78, 14, 12, "test-tileset:3"),
        (30, 75, 10, 18, "test-tileset:1"),
        (50, 80, 18, 8, "test-tileset:2"),
        (75, 78, 12, 12, "test-tileset:3"),
        (90, 82, 8, 16, "test-tileset:2"),
    ];

    let mut tiles = vec!["test-tileset:0".to_string(); (COLS * ROWS) as usize];

    for &(x, y, w, h, tile) in &rects {
        for ry in y..y + h {
            for rx in x..x + w {
                if rx < COLS && ry < ROWS {
                    let is_border = ry == y || ry == y + h - 1 || rx == x || rx == x + w - 1;

                    if is_border {
                        tiles[(ry * COLS + rx) as usize] = tile.to_string();
                    }
                }
            }
        }
    }

    TileMapData {
        cols: COLS,
        rows: ROWS,
        tile_width: 32,
        tile_height: 32,
        tiles,
    }
}

fn generate_ship_map() -> Result<TileMapData, String> {
    // To load from a network call instead, replace include_str! with a
    // fetched string — the Result propagation is already in place.
    let json = include_str!("../../src/assets/ship-level.json");
    serde_json::from_str(json).map_err(|e| format!("ship-level.json parse error: {e}"))
}

#[tauri::command]
fn generate_map(map_type: String) -> Result<TileMapData, String> {
    match map_type.as_str() {
        "map" => Ok(generate_space_map()),
        "ship" => generate_ship_map(),
        other => Err(format!("unrecognized map_type: {other:?}")),
    }
}

#[derive(Serialize, serde::Deserialize)]
pub struct PlayerIdentity {
    pub id: String,
    pub name: String,
}

/// Initial game state pushed to the client on startup. Mirrors the TS
/// `GameStateData` in `src/game-state.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize)]
pub struct GameStateData {
    pub player: PlayerIdentity,
}

/// Load the player's game state. Hardcoded for now; later this hydrates from
/// the phase-2 local save file and then the phase-3 server snapshot — the
/// Result propagation is already in place for both.
#[tauri::command]
fn load_game_state() -> Result<GameStateData, String> {
    Ok(GameStateData {
        player: PlayerIdentity {
            id: "player-1".to_string(),
            name: "Player 1".to_string(),
        },
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![generate_map, load_game_state])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
