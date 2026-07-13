// Pure minimap projection math (ROADMAP P1.9) — no runtime dependencies, so
// tests/minimap_math_test.ts can exercise it under plain `deno test`. The
// minimap widget itself (src/map/minimap.ts) owns everything Excalibur: this
// module only maps between world px and minimap px.

/** A plain 2D point; ex.Vector satisfies this structurally. */
export interface Point {
  x: number;
  y: number;
}

/** An axis-aligned rectangle in minimap px (top-left origin). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Projection from world px onto a square minimap widget: uniform scale that
 * fits the whole map, with a non-square map centered by the offsets
 * (letterboxed on the shorter axis).
 */
export interface MinimapProjection {
  /** Widget size in px (square). */
  size: number;
  /** Minimap px per world px. */
  scale: number;
  /** Minimap px from the widget's left edge to the map's left edge. */
  offsetX: number;
  /** Minimap px from the widget's top edge to the map's top edge. */
  offsetY: number;
}

/** Build the projection for a map of the given world-px dimensions. */
export function minimapProjection(
  mapWidth: number,
  mapHeight: number,
  size: number,
): MinimapProjection {
  const scale = size / Math.max(mapWidth, mapHeight);
  return {
    size,
    scale,
    offsetX: (size - mapWidth * scale) / 2,
    offsetY: (size - mapHeight * scale) / 2,
  };
}

/** World px → minimap px. */
export function worldToMinimap(
  x: number,
  y: number,
  p: MinimapProjection,
): Point {
  return { x: p.offsetX + x * p.scale, y: p.offsetY + y * p.scale };
}

/**
 * Minimap px → world px (tap-to-jump). Inverse of worldToMinimap; a tap in
 * a letterbox margin maps outside the map — the camera clamp handles it.
 */
export function minimapToWorld(
  x: number,
  y: number,
  p: MinimapProjection,
): Point {
  return { x: (x - p.offsetX) / p.scale, y: (y - p.offsetY) / p.scale };
}

/**
 * The camera's visible world rectangle projected onto the minimap, clipped
 * to the widget. `drawW`/`drawH` are the zoom-1 draw dimensions
 * (screen.resolution), so the visible world extent is draw / zoom — the
 * same convention as TiledScene's clampedPos. `minSize` inflates each axis
 * to at least that many minimap px around the same center: on a map that
 * dwarfs the view (the full-size space map at default zoom) the true rect
 * is under a pixel, and the player couldn't see where they are.
 */
export function viewportRect(
  camera: Point,
  zoom: number,
  drawW: number,
  drawH: number,
  p: MinimapProjection,
  minSize = 0,
): Rect {
  const halfW = Math.max((drawW / zoom) * p.scale, minSize) / 2;
  const halfH = Math.max((drawH / zoom) * p.scale, minSize) / 2;
  const center = worldToMinimap(camera.x, camera.y, p);
  const x0 = Math.max(0, center.x - halfW);
  const y0 = Math.max(0, center.y - halfH);
  const x1 = Math.min(p.size, center.x + halfW);
  const y1 = Math.min(p.size, center.y + halfH);
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}
