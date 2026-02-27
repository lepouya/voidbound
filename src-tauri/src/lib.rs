use serde::Serialize;

#[derive(Serialize)]
pub struct TileMapData {
    pub cols: u32,
    pub rows: u32,
    pub tile_width: u32,
    pub tile_height: u32,
    pub tiles: Vec<String>,
}

struct Rect {
    x: u32,
    y: u32,
    w: u32,
    h: u32,
    tile: &'static str,
}

fn generate_space_map() -> TileMapData {
    const COLS: u32 = 100;
    const ROWS: u32 = 100;
    // Tile IDs within test-tileset: 0 = gray (background), 1 = blue, 2 = red, 3 = green
    let rects = [
        Rect { x: 2,  y: 2,  w: 12, h: 12, tile: "test-tileset:1" },
        Rect { x: 20, y: 5,  w: 8,  h: 8,  tile: "test-tileset:2" },
        Rect { x: 35, y: 2,  w: 15, h: 10, tile: "test-tileset:3" },
        Rect { x: 60, y: 3,  w: 10, h: 10, tile: "test-tileset:1" },
        Rect { x: 80, y: 1,  w: 18, h: 14, tile: "test-tileset:2" },
        Rect { x: 5,  y: 20, w: 10, h: 15, tile: "test-tileset:3" },
        Rect { x: 25, y: 22, w: 20, h: 6,  tile: "test-tileset:1" },
        Rect { x: 50, y: 18, w: 12, h: 12, tile: "test-tileset:2" },
        Rect { x: 70, y: 20, w: 8,  h: 20, tile: "test-tileset:3" },
        Rect { x: 85, y: 25, w: 14, h: 10, tile: "test-tileset:1" },
        Rect { x: 10, y: 40, w: 18, h: 8,  tile: "test-tileset:2" },
        Rect { x: 35, y: 38, w: 10, h: 10, tile: "test-tileset:3" },
        Rect { x: 55, y: 42, w: 14, h: 14, tile: "test-tileset:1" },
        Rect { x: 78, y: 45, w: 20, h: 8,  tile: "test-tileset:2" },
        Rect { x: 3,  y: 55, w: 8,  h: 16, tile: "test-tileset:1" },
        Rect { x: 20, y: 58, w: 12, h: 12, tile: "test-tileset:3" },
        Rect { x: 40, y: 55, w: 16, h: 10, tile: "test-tileset:2" },
        Rect { x: 65, y: 60, w: 10, h: 10, tile: "test-tileset:3" },
        Rect { x: 82, y: 58, w: 16, h: 16, tile: "test-tileset:1" },
        Rect { x: 8,  y: 78, w: 14, h: 12, tile: "test-tileset:3" },
        Rect { x: 30, y: 75, w: 10, h: 18, tile: "test-tileset:1" },
        Rect { x: 50, y: 80, w: 18, h: 8,  tile: "test-tileset:2" },
        Rect { x: 75, y: 78, w: 12, h: 12, tile: "test-tileset:3" },
        Rect { x: 90, y: 82, w: 8,  h: 16, tile: "test-tileset:2" },
    ];

    let mut tiles = vec!["test-tileset:0".to_string(); (COLS * ROWS) as usize];

    for rect in &rects {
        for ry in rect.y..rect.y + rect.h {
            for rx in rect.x..rect.x + rect.w {
                if rx < COLS && ry < ROWS {
                    let is_border = ry == rect.y
                        || ry == rect.y + rect.h - 1
                        || rx == rect.x
                        || rx == rect.x + rect.w - 1;

                    if is_border {
                        tiles[(ry * COLS + rx) as usize] = rect.tile.to_string();
                    }
                }
            }
        }
    }

    TileMapData { cols: COLS, rows: ROWS, tile_width: 32, tile_height: 32, tiles }
}

fn generate_ship_map() -> TileMapData {
    const COLS: u32 = 30;
    const ROWS: u32 = 30;
    // Three concentric border-only rects centered at (15, 15).
    // test-tileset: 0 = gray, 1 = blue, 2 = red, 3 = green
    let rects = [
        Rect { x: 0,  y: 0,  w: 30, h: 30, tile: "test-tileset:1" },
        Rect { x: 5,  y: 5,  w: 20, h: 20, tile: "test-tileset:2" },
        Rect { x: 10, y: 10, w: 10, h: 10, tile: "test-tileset:3" },
    ];

    let mut tiles = vec!["test-tileset:0".to_string(); (COLS * ROWS) as usize];

    for rect in &rects {
        for ry in rect.y..rect.y + rect.h {
            for rx in rect.x..rect.x + rect.w {
                if rx < COLS && ry < ROWS {
                    let is_border = ry == rect.y
                        || ry == rect.y + rect.h - 1
                        || rx == rect.x
                        || rx == rect.x + rect.w - 1;
                    if is_border {
                        tiles[(ry * COLS + rx) as usize] = rect.tile.to_string();
                    }
                }
            }
        }
    }

    TileMapData { cols: COLS, rows: ROWS, tile_width: 32, tile_height: 32, tiles }
}

#[tauri::command]
fn generate_map(map_type: String) -> Result<TileMapData, String> {
    match map_type.as_str() {
        "map"  => Ok(generate_space_map()),
        "ship" => Ok(generate_ship_map()),
        other  => Err(format!("unrecognized map_type: {other:?}")),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![generate_map])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
