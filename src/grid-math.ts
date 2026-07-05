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
