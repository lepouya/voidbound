// Pure camera math — no runtime dependencies, so tests/camera_math_test.ts
// can exercise it under plain `deno test`.

/** A plain 2D point; ex.Vector satisfies this structurally. */
export interface Point {
  x: number;
  y: number;
}

/**
 * Camera center that keeps the world point `anchor` under the same screen
 * pixel across a zoom change (ROADMAP P1.8 zoom-at-cursor).
 *
 * With a centered camera, the world point under a screen point sits at
 * `camera + offset / zoom` for a fixed screen-space `offset`, so keeping
 * `anchor` fixed across a zoom change means scaling the camera-to-anchor
 * distance by `oldZoom / newZoom`.
 *
 * Pass the zoom that will actually be applied (post-clamping) as `newZoom`,
 * otherwise the camera pans while the zoom stays pinned at its limit.
 */
export function anchoredZoomPos(
  anchor: Point,
  camera: Point,
  oldZoom: number,
  newZoom: number,
): Point {
  const scale = oldZoom / newZoom;
  return {
    x: anchor.x - (anchor.x - camera.x) * scale,
    y: anchor.y - (anchor.y - camera.y) * scale,
  };
}

/**
 * The camera zoom below which a view of the given zoom-1 draw dimensions
 * would show more than `maxTiles` tiles along its longer axis — i.e. the
 * zoom floor that caps the visible tile count (ROADMAP P1.13). The space map
 * uses it to keep the visible view strictly inside the interest-area window
 * so unloaded space can never scroll into sight (superseding P1.9's fixed
 * 0.1 floor; capping visible tiles also caps how many sub-pixel actors a
 * frame draws, the floor's original fps motivation). Assumes square tiles.
 */
export function tileViewCapZoom(
  drawW: number,
  drawH: number,
  tilePx: number,
  maxTiles: number,
): number {
  return Math.max(drawW, drawH) / (maxTiles * tilePx);
}
