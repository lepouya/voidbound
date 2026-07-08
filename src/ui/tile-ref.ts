import * as ex from "excalibur";

import { Resources } from "../resources.ts";
import {
  parseSegment,
  splitRefLayers,
  TileLayerDef,
  TileRef,
  visibleLayers,
} from "./tile-ref-parse.ts";

// The TileRef types and the pure parsing helpers live in tile-ref-parse.ts
// (no runtime imports, so they are testable under plain `deno test`); this
// module adds the Excalibur graphic construction on top. Re-export the types
// so consumers keep importing them from the "./ui" barrel unchanged.
export type { TileLayerDef, TileRef };

/** Resolve a single "tileset-name[:tile-id]" segment to its graphic. */
function segmentGraphic(segment: string): ex.Graphic {
  const { name, tileId } = parseSegment(segment);
  return Resources.Tilesets.getGraphic(name, tileId);
}

/**
 * Resolves a TileRef to an Excalibur graphic, applying any per-layer effects
 * declared on a TileLayerDef. Comma-separated string refs produce a
 * GraphicsGroup with one member per segment.
 *
 * Note: Sprites are cloned before effects are applied — the registry hands
 * out shared spritesheet instances. Animations are constructed fresh by every
 * getGraphic call, so per-instance effects are safe; the flip side is that
 * each consumer runs its own animation timer, so separate instances are not
 * frame-synchronized.
 *
 * The `offset` and `blendMode` fields of TileLayerDef are NOT handled here;
 * use resolveGraphicLayers() when those are needed.
 */
export function parseTileRef(ref: TileRef): ex.Graphic {
  if (typeof ref === "string") {
    const parts = splitRefLayers(ref);
    if (parts.length === 1) return segmentGraphic(parts[0]);
    return new ex.GraphicsGroup({
      useAnchor: true,
      members: parts.map((part) => ({
        offset: ex.vec(0, 0),
        graphic: segmentGraphic(part),
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
  const visibleRefs = visibleLayers(refs);
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
