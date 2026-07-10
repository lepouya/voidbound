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
