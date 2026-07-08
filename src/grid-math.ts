// Pure tile-grid math — no runtime dependencies, so tests/grid_math_test.ts
// can exercise it under plain `deno test`.

/**
 * A multi-tile footprint on the map grid. TileActor satisfies this
 * structurally (readonly col/row are the construction position; colSpan and
 * rowSpan are the size in tiles).
 */
export interface TileFootprint {
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
}

/**
 * Returns the center tile of the ship's inner 2*2 that is closest to the
 * given destination. Used as the spawn/dock point for vessels. Assumes even
 * col/row spans (true for 4*4 motherships).
 */
export function closestDockTile(
  ship: TileFootprint,
  destCol: number,
  destRow: number,
): { col: number; row: number } {
  const halfCols = ship.colSpan / 2;
  const halfRows = ship.rowSpan / 2;
  const col = destCol < ship.col + halfCols
    ? ship.col + halfCols - 1
    : ship.col + halfCols;
  const row = destRow < ship.row + halfRows
    ? ship.row + halfRows - 1
    : ship.row + halfRows;
  return { col, row };
}

/**
 * A regular grid of square rooms, `count`*`count` rooms of `span`*`span`
 * tiles whose top-left corners sit `pitch` tiles apart starting at
 * (`origin`, `origin`). The tiles between rooms (pitch − span per gap) are
 * corridors/hull, not part of any room.
 */
export interface RoomGrid {
  origin: number;
  span: number;
  pitch: number;
  count: number;
}

/**
 * The ship-interior room layout: a 5*5 grid of 6*6-tile rooms with 2-tile
 * corridors between them, on the 40*40 map. Mirrors the geometry drawn in
 * art/ship-level.tmj — keep in sync if the map is redrawn.
 */
export const SHIP_ROOM_GRID: RoomGrid = {
  origin: 1,
  span: 6,
  pitch: 8,
  count: 5,
};

/**
 * Top-left tile of the room containing (col, row), or null when the position
 * falls outside every room (void, corridors between rooms).
 */
export function roomOriginAt(
  grid: RoomGrid,
  col: number,
  row: number,
): { col: number; row: number } | null {
  const axis = (v: number): number | null => {
    const rel = v - grid.origin;
    const idx = Math.floor(rel / grid.pitch);
    if (idx < 0 || idx >= grid.count) return null;
    if (rel - idx * grid.pitch >= grid.span) return null;
    return grid.origin + idx * grid.pitch;
  };
  const c = axis(col);
  const r = axis(row);
  return c === null || r === null ? null : { col: c, row: r };
}

/**
 * Anchor (top-left) tile for a span*span module centered in the room
 * containing (col, row), or null when (col, row) is not inside a room.
 * E.g. a 4*4 module in a 6*6 room sits one tile in from the room's corner.
 */
export function moduleAnchorAt(
  grid: RoomGrid,
  col: number,
  row: number,
  moduleSpan: number,
): { col: number; row: number } | null {
  const room = roomOriginAt(grid, col, row);
  if (room === null) return null;
  const inset = Math.floor((grid.span - moduleSpan) / 2);
  return { col: room.col + inset, row: room.row + inset };
}

/** True if (col, row) is one of the ship's inner 2*2 docking tiles. */
export function isDockTile(
  ship: TileFootprint,
  col: number,
  row: number,
): boolean {
  const halfCols = ship.colSpan / 2;
  const halfRows = ship.rowSpan / 2;
  return (
    col >= ship.col + halfCols - 1 &&
    col <= ship.col + halfCols &&
    row >= ship.row + halfRows - 1 &&
    row <= ship.row + halfRows
  );
}
