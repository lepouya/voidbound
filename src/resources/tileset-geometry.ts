// Pure-data tileset catalog: grid geometry for every tileset in the game.
//
// This module has NO imports and NO side effects — it is consumed both by
// src/resources/resources.ts (which resolves asset URLs and builds
// SpriteSheets) and by tests/tileset_geometry_test.ts (which cross-checks
// each PNG's real pixel dimensions against these rows without needing Vite
// or Excalibur).
//
// To add a tileset: drop the PNG in src/assets/ and either match an
// auto-register prefix in AUTO_TILESET_RULES or add a row to TILESET_GEOMETRY.
// See the /add-tileset skill for the full checklist.

/** Grid shape of a tileset sheet, without its name or asset URL. */
export interface TilesetGridGeometry {
  cols: number;
  rows: number;
  /** Square cell size in px. Sheet must be exactly cols*tileSize by rows*tileSize. */
  tileSize: number;
  /**
   * Present → animated tileset using the first `frames` cells.
   * Absent → static sheet of independent sprites.
   */
  frames?: number;
  /** Duration of each animation frame in ms. Set together with `frames`. */
  frameDuration?: number;
}

/** A named catalog row. `name` must match the PNG path under src/assets/ (sans .png). */
export interface TilesetGeometry extends TilesetGridGeometry {
  name: string;
}

/** Auto-registration rule: any PNG whose filename starts with `prefix` gets this shape. */
export interface AutoTilesetRule extends TilesetGridGeometry {
  prefix: string;
}

/** 32-frame animated sheet spec (6*6 grid, 32 frames @ 66 ms). */
export const ANIM_32_FRAMES = {
  cols: 6,
  rows: 6,
  frames: 32,
  frameDuration: 66,
} as const;

/** 64-frame animated sheet spec (8*8 grid, 64 frames @ 66 ms). */
export const ANIM_64_FRAMES = {
  cols: 8,
  rows: 8,
  frames: 64,
  frameDuration: 66,
} as const;

export const TILESET_GEOMETRY: TilesetGeometry[] = [
  // Mothership interior map tiles: static 6*6 sheet at 64x64 cell size.
  { name: "ship-tiles", cols: 6, rows: 6, tileSize: 64 },
  // UI selection rings and brackets: 32-frame animated 6*6 sheets across spans 1x1 through 4x4.
  { name: "ui-selection", tileSize: 256, ...ANIM_32_FRAMES },
  { name: "ui-selection-1x1", tileSize: 64, ...ANIM_32_FRAMES },
  { name: "ui-selection-2x2", tileSize: 128, ...ANIM_32_FRAMES },
  { name: "ui-selection-3x3", tileSize: 192, ...ANIM_32_FRAMES },
  { name: "ui-selection-4x4", tileSize: 256, ...ANIM_32_FRAMES },
  { name: "ui-selection-2", tileSize: 256, ...ANIM_32_FRAMES },
  { name: "ui-selection-mod-1x1", tileSize: 64, ...ANIM_32_FRAMES },
  { name: "ui-selection-mod-2x2", tileSize: 128, ...ANIM_32_FRAMES },
  { name: "ui-selection-mod-3x3", tileSize: 192, ...ANIM_32_FRAMES },
  { name: "ui-selection-mod-4x4", tileSize: 256, ...ANIM_32_FRAMES },
  // Asteroid sprites: 64-frame animated 8*8 sheets across spans 1/2/3 (64/128/192 px cell size).
  { name: "asteroid-small", tileSize: 64, ...ANIM_64_FRAMES },
  { name: "asteroid-medium", tileSize: 128, ...ANIM_64_FRAMES },
  { name: "asteroid-large", tileSize: 192, ...ANIM_64_FRAMES },
  // Command module tiers: 64-frame animated 8*8 sheets across spans 4/5/6 (256/320/384 px cell size).
  { name: "module-command-t1", tileSize: 256, ...ANIM_64_FRAMES },
  { name: "module-command-t2", tileSize: 320, ...ANIM_64_FRAMES },
  { name: "module-command-t3", tileSize: 384, ...ANIM_64_FRAMES },
];

export const AUTO_TILESET_RULES: AutoTilesetRule[] = [
  // UI button frames and icons: static 3*1 sheet (normal, active, disabled).
  { prefix: "ui-frame-", cols: 3, rows: 1, tileSize: 64 },
  { prefix: "ui-icon-", cols: 3, rows: 1, tileSize: 64 },
  // Mothership sprites: 32-frame animated 6*6 sheets at 256x256 cell size (4*4 world tiles).
  { prefix: "mothership-", tileSize: 256, ...ANIM_32_FRAMES },
  // Vessel sprites: 32-frame animated 6*6 sheets at 64x64 cell size (1*1 world tile).
  { prefix: "vessel-", tileSize: 64, ...ANIM_32_FRAMES },
  // Mothership modules (e.g. module-base): canonical animated sheet across 4*4 world tiles (256px cell size).
  { prefix: "module-", tileSize: 256, ...ANIM_32_FRAMES },
];
