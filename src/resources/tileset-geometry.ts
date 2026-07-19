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

/** Canonical animated sheet spec (see AGENTS.md): 6*6 grid, 32 frames @ 66 ms. */
export const CANONICAL_ANIM = {
  cols: 6,
  rows: 6,
  frames: 32,
  frameDuration: 66,
} as const;

/** Asteroid animated sheet spec: 8*8 grid, 64 frames @ 66 ms (~4.2s loop) for serene zero-G motion. */
export const ASTEROID_ANIM = {
  cols: 8,
  rows: 8,
  frames: 64,
  frameDuration: 66,
} as const;

export const TILESET_GEOMETRY: TilesetGeometry[] = [
  { name: "test-tileset", cols: 4, rows: 1, tileSize: 32 },
  { name: "ship-tiles", cols: 6, rows: 6, tileSize: 64 },
  { name: "ui-selection", tileSize: 256, ...CANONICAL_ANIM },
  { name: "ui-selection-1x1", tileSize: 64, ...CANONICAL_ANIM },
  { name: "ui-selection-2x2", tileSize: 128, ...CANONICAL_ANIM },
  { name: "ui-selection-3x3", tileSize: 192, ...CANONICAL_ANIM },
  { name: "ui-selection-4x4", tileSize: 256, ...CANONICAL_ANIM },
  { name: "ui-selection-2", tileSize: 256, ...CANONICAL_ANIM },
  { name: "ui-selection-mod-1x1", tileSize: 64, ...CANONICAL_ANIM },
  { name: "ui-selection-mod-2x2", tileSize: 128, ...CANONICAL_ANIM },
  { name: "ui-selection-mod-3x3", tileSize: 192, ...CANONICAL_ANIM },
  { name: "ui-selection-mod-4x4", tileSize: 256, ...CANONICAL_ANIM },
  { name: "ss1-base", tileSize: 256, ...CANONICAL_ANIM },
  { name: "ss1-damaged", tileSize: 256, ...CANONICAL_ANIM },
  // Vessel sprites (ROADMAP P1.8 / P5.3): 32-frame animated 6x6 sheets featuring
  // idle zero-G float, anisotropic thruster plasma plumes, and 15s flourish tricks.
  { name: "vessel-1-base-self", tileSize: 64, ...CANONICAL_ANIM },
  { name: "vessel-1-moving-self", tileSize: 64, ...CANONICAL_ANIM },
  { name: "vessel-1-idle-self", tileSize: 64, ...CANONICAL_ANIM },
  { name: "vessel-1-base-allies", tileSize: 64, ...CANONICAL_ANIM },
  { name: "vessel-1-moving-allies", tileSize: 64, ...CANONICAL_ANIM },
  { name: "vessel-1-idle-allies", tileSize: 64, ...CANONICAL_ANIM },
  { name: "vessel-1-base-neutral", tileSize: 64, ...CANONICAL_ANIM },
  { name: "vessel-1-moving-neutral", tileSize: 64, ...CANONICAL_ANIM },
  { name: "vessel-1-idle-neutral", tileSize: 64, ...CANONICAL_ANIM },
  { name: "vessel-1-base-enemy", tileSize: 64, ...CANONICAL_ANIM },
  { name: "vessel-1-moving-enemy", tileSize: 64, ...CANONICAL_ANIM },
  { name: "vessel-1-idle-enemy", tileSize: 64, ...CANONICAL_ANIM },
  // Asteroid sprites (ROADMAP P1.6): 64-frame animated 8x8 sheets featuring
  // 3D anisotropic tumbling, zero-G Lissajous drift, and serene debris fields.
  // Grayscale vector base tinted per resource kind at render time (`ASTEROID_TINTS`
  // in src/map/asteroid-catalog.ts). Map tiles are 32 px world with 2x resolution,
  // so span 1/2/3 renders at 64/128/192 px tile size.
  { name: "asteroid-small", tileSize: 64, ...ASTEROID_ANIM },
  { name: "asteroid-medium", tileSize: 128, ...ASTEROID_ANIM },
  { name: "asteroid-large", tileSize: 192, ...ASTEROID_ANIM },
];

export const AUTO_TILESET_RULES: AutoTilesetRule[] = [
  // UI button frames and icons: static 3*1 sheet (normal, active, disabled).
  { prefix: "ui-frame-", cols: 3, rows: 1, tileSize: 64 },
  { prefix: "ui-icon-", cols: 3, rows: 1, tileSize: 64 },
  // Mothership modules: canonical animated sheet.
  { prefix: "module-", tileSize: 256, ...CANONICAL_ANIM },
];
