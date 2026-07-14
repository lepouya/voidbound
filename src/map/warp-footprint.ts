// Pure mothership-relocation footprint occupancy + fuel-cost math (ROADMAP
// P1.22) — no runtime dependencies, so tests/warp_footprint_test.ts can
// exercise it under plain `deno test`. Mirrors the server's
// footprints_clear(gap: 0) overlap rule (src-tauri/src/game_state/world.rs)
// cell-by-cell instead of footprint-by-footprint, so the picker can show
// exactly which tiles collide — the server re-verifies the same overlap rule
// (and the fuel cost) at confirm time, never trusting this client-side
// preview.

/** Display-only mirror of the Rust WARP_FUEL_PER_TILE stub in
 *  src-tauri/src/game_state/world.rs — keep the two in sync. The server
 *  re-derives the real cost at confirm time; this only drives the picker's
 *  live cost readout. */
export const WARP_FUEL_PER_TILE = 1;

/** Estimated fuel cost of a warp from (srcCol, srcRow) to (destCol, destRow)
 *  — mirrors the server's straight-line-distance formula in
 *  relocate_mothership (world.rs): free to warp in place, otherwise at least
 *  1 fuel, rounded up per tile of distance. */
export function estimateWarpFuelCost(
  srcCol: number,
  srcRow: number,
  destCol: number,
  destRow: number,
): number {
  const dist = Math.hypot(destCol - srcCol, destRow - srcRow);
  if (dist === 0) return 0;
  return Math.max(1, Math.ceil(dist * WARP_FUEL_PER_TILE));
}

/** A footprint on the map: anchor tile (top-left) plus a square span. A
 *  MothershipData or AsteroidData satisfies this structurally. */
export interface Footprint {
  col: number;
  row: number;
  span: number;
}

/** Per-cell coloring for the relocation picker's footprint overlay: red where
 *  that cell overlaps another entity's footprint, yellow where a clear cell
 *  8-neighbors a red cell (within the footprint), green otherwise. */
export type FootprintCellState = "green" | "yellow" | "red";

/**
 * Colors every cell of a `span*span` footprint anchored at (col, row) against
 * a list of occupied footprints (other motherships, asteroids). Row-major:
 * `colors[row][col]`.
 */
export function computeFootprintColors(
  col: number,
  row: number,
  span: number,
  occupied: readonly Footprint[],
): FootprintCellState[][] {
  const red: boolean[][] = Array.from(
    { length: span },
    () => Array<boolean>(span).fill(false),
  );
  for (const entity of occupied) {
    const c0 = Math.max(0, entity.col - col);
    const c1 = Math.min(span, entity.col + entity.span - col);
    const r0 = Math.max(0, entity.row - row);
    const r1 = Math.min(span, entity.row + entity.span - row);
    for (let r = r0; r < r1; r++) {
      for (let c = c0; c < c1; c++) red[r][c] = true;
    }
  }
  const colors: FootprintCellState[][] = [];
  for (let r = 0; r < span; r++) {
    const rowColors: FootprintCellState[] = [];
    for (let c = 0; c < span; c++) {
      if (red[r][c]) {
        rowColors.push("red");
        continue;
      }
      let yellow = false;
      for (let dr = -1; dr <= 1 && !yellow; dr++) {
        for (let dc = -1; dc <= 1 && !yellow; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < span && nc >= 0 && nc < span && red[nr][nc]) {
            yellow = true;
          }
        }
      }
      rowColors.push(yellow ? "yellow" : "green");
    }
    colors.push(rowColors);
  }
  return colors;
}

/** True only when every cell is green — the picker's Confirm-enabled rule. */
export function footprintIsClear(colors: FootprintCellState[][]): boolean {
  return colors.every((row) => row.every((cell) => cell === "green"));
}
