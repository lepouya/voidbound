import * as ex from "excalibur";

import { Resources } from "../resources";

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

/** Parse a single "tileset-name" or "tileset-name:tile-id" segment (no commas). */
function parseSegment(segment: string): ex.Graphic {
  const colon = segment.indexOf(":");
  const name = colon === -1 ? segment : segment.slice(0, colon);
  const tileId = colon === -1 ? 0 : parseInt(segment.slice(colon + 1), 10);
  return Resources.Tilesets.getGraphic(name, tileId);
}

/**
 * Resolves a TileRef to an Excalibur graphic, applying any per-layer effects
 * declared on a TileLayerDef. Comma-separated string refs produce a
 * GraphicsGroup with one member per segment.
 *
 * Note: Sprites are cloned before effects are applied to avoid mutating the
 * shared cached instance. Animations are used as-is (same as existing
 * makeButtonGraphic behavior); effects on animations mutate the shared
 * instance — a known limitation.
 *
 * The `offset` and `blendMode` fields of TileLayerDef are NOT handled here;
 * use resolveGraphicLayers() when those are needed.
 */
export function parseTileRef(ref: TileRef): ex.Graphic {
  if (typeof ref === "string") {
    const parts = ref.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 1) return parseSegment(parts[0]);
    return new ex.GraphicsGroup({
      useAnchor: true,
      members: parts.map((part) => ({
        offset: ex.vec(0, 0),
        graphic: parseSegment(part),
      })),
    });
  }

  const base = Resources.Tilesets.getGraphic(ref.tile, ref.tileId ?? 0);
  const g = base instanceof ex.Animation ? base : (base as ex.Sprite).clone();
  if (ref.tint != null) g.tint = ref.tint;
  if (ref.opacity != null) g.opacity = ref.opacity;
  if (ref.rotation != null) g.rotation = ref.rotation;
  if (ref.flipHorizontal != null) g.flipHorizontal = ref.flipHorizontal;
  if (ref.flipVertical != null) g.flipVertical = ref.flipVertical;
  if (ref.scale != null) {
    g.scale = typeof ref.scale === "number"
      ? ex.vec(ref.scale, ref.scale)
      : ref.scale;
  }
  // offset and blendMode are not applied here — see resolveGraphicLayers
  return g;
}

/**
 * Resolves a TileRef or TileRef[] into a single Excalibur graphic, compositing
 * multiple layers into a GraphicsGroup when needed.
 *
 * - Object-form (TileLayerDef) layers with visible:false are excluded from the
 *   composite. String TileRefs in an array are always included — to hide a
 *   string layer conditionally, convert it to TileLayerDef form.
 * - The offset field of TileLayerDef members is applied as GraphicsGrouping.offset.
 * - Use this instead of parseTileRef() when working with TileActor tile options.
 */
export function resolveGraphicLayers(refs: TileRef | TileRef[]): ex.Graphic {
  const arr = Array.isArray(refs) ? refs : [refs];
  // Filter out object-form layers explicitly marked invisible.
  const visibleRefs = arr.filter(
    (ref) => !(typeof ref === "object" && ref.visible === false),
  );
  if (visibleRefs.length === 0) {
    // All layers hidden. Returns a 1×1 placeholder; callers should supply
    // explicit width/height when all layers may be invisible.
    return new ex.Rectangle({
      width: 1,
      height: 1,
      color: ex.Color.Transparent,
    });
  }
  if (visibleRefs.length === 1) {
    const g = parseTileRef(visibleRefs[0]);
    const offset = typeof visibleRefs[0] === "object"
      ? visibleRefs[0].offset
      : undefined;
    if (!offset) return g;
    return new ex.GraphicsGroup({
      useAnchor: true,
      members: [{ offset, graphic: g }],
    });
  }
  return new ex.GraphicsGroup({
    useAnchor: true,
    members: visibleRefs.map((ref) => ({
      offset: typeof ref === "object" && ref.offset ? ref.offset : ex.vec(0, 0),
      graphic: parseTileRef(ref),
    })),
  });
}
