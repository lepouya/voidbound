// Pure TileRef parsing logic — no runtime imports (the excalibur import below
// is type-only and erased at compile time), so tests/tile_ref_parse_test.ts
// can exercise it under plain `deno test`. Graphic construction lives in
// tile-ref.ts, which consumes these helpers.
// The DOM lib reference makes GlobalCompositeOperation resolvable when this
// module is type-checked standalone under Deno (without the Vite/DOM config).
/// <reference lib="dom" />
import type * as ex from "excalibur";

/**
 * Object form of a tile reference with optional per-layer visual effects.
 * Use this when you need tint, opacity, rotation, flip, scale, or offset
 * on a specific layer. For simple cases, the string shorthand is preferred.
 */
export interface TileLayerDef {
  /** Tileset name only — no ":tile-id" suffix (use tileId field for that). */
  tile: string;
  /** Tile index within the tileset. Default: 0. */
  tileId?: number;
  /** Multiplicative color blend. White (default) has no effect. */
  tint?: ex.Color;
  /** Alpha, 0–1. Default: 1. */
  opacity?: number;
  /** Rotation in radians applied to this layer. Default: 0. */
  rotation?: number;
  /** Mirror the graphic horizontally. Default: false. */
  flipHorizontal?: boolean;
  /** Mirror the graphic vertically. Default: false. */
  flipVertical?: boolean;
  /**
   * Scale multiplier on the graphic's natural pixel size. The actor's overall
   * scale (tile-fill scaling) is applied on top. Pass a number for uniform
   * scaling or an ex.Vector for non-uniform. Default: 1.
   */
  scale?: number | ex.Vector;
  /**
   * Pixel offset from the layer's default position within the composite group.
   * Only meaningful in a multi-layer context; ignored by buildTileMap
   * (tile.addGraphic has no per-graphic offset).
   */
  offset?: ex.Vector;
  /**
   * Canvas 2D globalCompositeOperation for this layer (e.g. "lighter" for
   * additive blending, "multiply", "screen").
   *
   * NOTE: ex.Graphic and GraphicsGrouping have no blend mode property in
   * Excalibur v0.32. This field is stored but NOT yet applied — reserved for
   * future Material/shader integration.
   */
  blendMode?: GlobalCompositeOperation;
  /**
   * When false, this layer is excluded from the composite entirely.
   * Cheaper than opacity:0 (no draw call). Default: true.
   */
  visible?: boolean;
}

/**
 * A tile reference: either a string shorthand or a full TileLayerDef.
 *
 * String forms:
 *   "tileset-name"            — tile 0 from named tileset
 *   "tileset-name:tile-id"    — specific tile by index
 *   "ts1,ts2:1,ts3"           — comma-separated list; each segment is a layer
 *                               stacked in painter's order (bottom → top)
 *
 * Object form: TileLayerDef — tileset name + optional tile-id + visual effects.
 */
export type TileRef = string | TileLayerDef;

/**
 * Parse a single "tileset-name" or "tileset-name:tile-id" segment (no commas)
 * into its tileset name and tile index. A missing ":tile-id" suffix means
 * tile 0.
 */
export function parseSegment(
  segment: string,
): { name: string; tileId: number } {
  const colon = segment.indexOf(":");
  if (colon === -1) return { name: segment, tileId: 0 };
  return {
    name: segment.slice(0, colon),
    tileId: parseInt(segment.slice(colon + 1), 10),
  };
}

/**
 * Split a string TileRef into its layer segments (painter's order, bottom →
 * top). Segments are trimmed; empty segments (from stray commas) are dropped.
 * A ref without commas yields a single segment.
 */
export function splitRefLayers(ref: string): string[] {
  return ref.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Normalize a TileRef | TileRef[] into the array of layers that should be
 * rendered: object-form layers explicitly marked visible:false are excluded.
 * String TileRefs are always included — to hide a string layer conditionally,
 * convert it to TileLayerDef form.
 */
export function visibleLayers(refs: TileRef | TileRef[]): TileRef[] {
  const arr = Array.isArray(refs) ? refs : [refs];
  return arr.filter(
    (ref) => !(typeof ref === "object" && ref.visible === false),
  );
}
