import * as ex from "excalibur";

import { Resources } from "./resources";

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

export const LABEL_FONT_SIZE = 10;
export const LABEL_PAD = 3;
export const LABEL_CORNER_RADIUS = 6;
export const DEFAULT_BADGE_SIZE = 16;

// ---------------------------------------------------------------------------
// Anchor types
// ---------------------------------------------------------------------------

/**
 * 9-position anchor grid used for both HUD group placement (screen-relative)
 * and TileActor badge placement (sprite-relative).
 */
export type AnchorPlacement =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

/**
 * Converts an AnchorPlacement to horizontal and vertical fractions (0, 0.5, or 1).
 * Used internally by hud.ts (anchorLayout) and tile-actor.ts (setupBadges).
 */
export function anchorFractions(anchor: AnchorPlacement): {
  hFrac: number;
  vFrac: number;
} {
  const hFrac = anchor.includes("right")
    ? 1
    : anchor.includes("left")
    ? 0
    : 0.5;
  const vFrac = anchor.startsWith("bottom")
    ? 1
    : anchor.startsWith("top")
    ? 0
    : 0.5;
  return { hFrac, vFrac };
}

// ---------------------------------------------------------------------------
// Label helpers
// ---------------------------------------------------------------------------

/**
 * Returns a GraphicsGroup that renders `text` with a rectangular border
 * around it. Uses ex.Text (not a pre-baked bitmap), so it scales with the
 * camera correctly.
 */
export function makeBorderedLabel(
  text: string,
  {
    maxWidth,
    bordered = true,
    fontSize = LABEL_FONT_SIZE,
    color = ex.Color.White,
    backgroundColor = ex.Color.fromRGB(0, 0, 0, 0.5),
    anchor = "top-center" as AnchorPlacement,
  }: {
    maxWidth?: number;
    bordered?: boolean;
    fontSize?: number;
    color?: ex.Color;
    backgroundColor?: ex.Color;
    anchor?: AnchorPlacement;
  } = {},
): ex.GraphicsGroup {
  const textAlign = anchor.includes("left")
    ? ex.TextAlign.Left
    : anchor.includes("right")
    ? ex.TextAlign.Right
    : ex.TextAlign.Center;
  const baseAlign = anchor.startsWith("top")
    ? ex.BaseAlign.Top
    : anchor.startsWith("bottom")
    ? ex.BaseAlign.Bottom
    : ex.BaseAlign.Middle;
  const baseFontDef = {
    size: fontSize,
    color,
    textAlign,
    baseAlign,
  };

  // Font for measuring, no shadow.
  const measureFont = new ex.Font(baseFontDef);
  const b = measureFont.measureText(text, maxWidth);
  // measureText doesn't zero the aligned edge; correct it so b.width/height
  // reflect only the true glyph extent rather than the offset from origin.
  if (textAlign === ex.TextAlign.Left) b.left = 0;
  else if (textAlign === ex.TextAlign.Right) b.right = 0;
  if (baseAlign === ex.BaseAlign.Top) b.top = 0;
  else if (baseAlign === ex.BaseAlign.Bottom) b.bottom = 0;
  const members: ex.GraphicsGrouping[] = [];
  if (bordered) {
    const W = b.width + LABEL_PAD * 2;
    const H = b.height + LABEL_PAD * 2;
    const r = LABEL_CORNER_RADIUS;
    const bg = new ex.Canvas({
      width: W,
      height: H,
      cache: true,
      draw(ctx) {
        ctx.fillStyle = backgroundColor.toRGBA();
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(W - r, 0);
        ctx.arcTo(W, 0, W, r, r);
        ctx.lineTo(W, H - r);
        ctx.arcTo(W, H, W - r, H, r);
        ctx.lineTo(r, H);
        ctx.arcTo(0, H, 0, H - r, r);
        ctx.lineTo(0, r);
        ctx.arcTo(0, 0, r, 0, r);
        ctx.closePath();
        ctx.fill();
      },
    });
    members.push({
      // Canvas top-left is PAD px outside the text bounding box.
      offset: ex.vec(b.left - LABEL_PAD, b.top - LABEL_PAD),
      graphic: bg,
      useBounds: false,
    });
  }

  // Create a combined halo effect from 4 blurred shadows.
  const shadow = { blur: 2, color: ex.Color.Black };
  const shadowOffsets = [
    ex.vec(-1, -1),
    ex.vec(1, -1),
    ex.vec(-1, 1),
    ex.vec(1, 1),
  ];
  for (const offset of shadowOffsets) {
    const font = new ex.Font({
      ...baseFontDef,
      shadow: { ...shadow, offset },
    });
    members.push({
      offset: ex.vec(0, 0),
      graphic: new ex.Text({ text, font, maxWidth }),
      useBounds: false,
    });
  }

  return new ex.GraphicsGroup({ useAnchor: false, members });
}

// ---------------------------------------------------------------------------
// Label and Button types
// ---------------------------------------------------------------------------

/** Configuration for a text label rendered below (or alongside) a button. */
export interface LabelDef {
  text: string;
  /** Render with rounded pill background. Default: true. */
  bordered?: boolean;
  /** Font size in pixels. Default: LABEL_FONT_SIZE (10). */
  fontSize?: number;
  /** Text color. Default: ex.Color.White. */
  color?: ex.Color;
  /** Background fill color when bordered is true. Default: semi-transparent black. */
  backgroundColor?: ex.Color;
  /** Position offset as a multiple of the label's font size. Default: (0, 0). */
  labelOffset?: ex.Vector;
}

/**
 * Normalizes a string shorthand or full LabelDef to a LabelDef, or returns
 * undefined if the input is undefined.
 * String shorthand: "Move" → { text: "Move", bordered: true }
 */
export function resolveLabel(
  label: string | LabelDef | undefined,
): LabelDef | undefined {
  if (label === undefined) return undefined;
  if (typeof label === "string") return { text: label, bordered: true };
  return label;
}

/**
 * Creates an ex.Actor whose graphic is a bordered label.
 * Returns null when `label` is undefined so callers can skip addChild cleanly.
 *
 * @param label  - raw string, LabelDef, or undefined
 * @param pos    - position in the parent's local space
 * @param anchor - placement and text alignment anchor; default "top-center"
 * @param scale  - actor scale; default (1, 1). World-space callers pass the
 *                 inverse of the parent's scale to keep labels at 1:1.
 * @param maxWidth - optional max wrap width passed to makeBorderedLabel
 * @param visible  - initial graphics visibility; default true
 */
export function makeLabelActor(
  label: string | LabelDef | undefined,
  pos: ex.Vector,
  {
    anchor = "top-center" as AnchorPlacement,
    scale = ex.vec(1, 1),
    maxWidth,
    visible = true,
  }: {
    anchor?: AnchorPlacement;
    scale?: ex.Vector;
    maxWidth?: number;
    visible?: boolean;
  } = {},
): ex.Actor | null {
  const def = resolveLabel(label);
  if (!def) return null;

  const actorPos = def.labelOffset
    ? pos.add(def.labelOffset.scale(def.fontSize ?? LABEL_FONT_SIZE))
    : pos;

  const { hFrac, vFrac } = anchorFractions(anchor);
  const actor = new ex.Actor({
    pos: actorPos,
    anchor: ex.vec(hFrac, vFrac),
    scale,
  });
  actor.graphics.use(
    makeBorderedLabel(def.text, {
      maxWidth,
      bordered: def.bordered ?? true,
      fontSize: def.fontSize,
      color: def.color,
      backgroundColor: def.backgroundColor,
      anchor,
    }),
  );
  if (!visible) actor.graphics.isVisible = false;
  return actor;
}

// ---------------------------------------------------------------------------
// Badge types and helpers
// ---------------------------------------------------------------------------

/** Badge carrying a sprite instead of text. */
export interface SpriteBadge {
  tile: TileRef;
  /** Rendered size in world pixels. Default: DEFAULT_BADGE_SIZE (16). */
  size?: number;
}

/**
 * Unified badge content: text shorthand (number/string), full LabelDef,
 * or a sprite (SpriteBadge). Used in both ButtonDef.badge and TileActorBadgeDef.
 */
export type BadgeDef = number | string | LabelDef | SpriteBadge;

/**
 * Creates an actor whose graphic is a badge — either a text label or a sprite.
 *
 * @param badge   - string/number shorthand (defaults: bordered, 80% font size),
 *                  LabelDef to control style, or SpriteBadge for a sprite.
 * @param pos     - position in the parent's local space (the actor's anchor point)
 * @param anchor  - placement and text alignment anchor; default "top-right",
 *                  matching the button badge convention.
 * @param scale   - actor scale; world-space callers pass inverse of parent scale
 * @param visible - initial visibility; default true
 */
export function makeBadgeActor(
  badge: BadgeDef,
  pos: ex.Vector,
  {
    anchor = "top-right" as AnchorPlacement,
    scale = ex.vec(1, 1),
    visible = true,
  }: {
    anchor?: AnchorPlacement;
    scale?: ex.Vector;
    visible?: boolean;
  } = {},
): ex.Actor {
  const { hFrac, vFrac } = anchorFractions(anchor);

  // Sprite branch: { tile, size? }
  if (typeof badge === "object" && "tile" in badge) {
    const base = parseTileRef(badge.tile);
    const size = badge.size ?? DEFAULT_BADGE_SIZE;
    // Clone only plain Sprites to avoid mutating the shared cached instance.
    // Animations and GraphicsGroups (multi-layer tiles) are used as-is.
    const g = base instanceof ex.Sprite ? base.clone() : base;
    g.scale = ex.vec(size / base.width, size / base.height);
    const actor = new ex.Actor({ pos, anchor: ex.vec(hFrac, vFrac), scale });
    actor.graphics.use(g);
    if (!visible) actor.graphics.isVisible = false;
    return actor;
  }

  // Text branch: number, string, or LabelDef
  const def: LabelDef = typeof badge === "object" ? badge : {
    text: String(badge),
    bordered: true,
    fontSize: LABEL_FONT_SIZE * 0.8,
  };
  // makeLabelActor sets actor.anchor = (hFrac, vFrac), which Excalibur uses to
  // align the graphic relative to pos — no manual shift needed here.
  // makeLabelActor only returns null when label is undefined; we always pass a
  // LabelDef, so the non-null assertion is safe.
  return makeLabelActor(def, pos, { anchor, scale, visible })!;
}

// ---------------------------------------------------------------------------
// Button types
// ---------------------------------------------------------------------------

/**
 * Unified button definition shared by world-space TileActor buttons and
 * screen-space HUD buttons.
 *
 * For HUD buttons, use HudButtonDef (defined in hud.ts) which extends this
 * with width, height, and hitPadding.
 */
export interface ButtonDef {
  /** Sprite to display. For world-space buttons, always provide this. */
  tile?: TileRef;
  /** Shown instead of tile when active is true. Falls back to tile if absent. */
  activeTile?: TileRef;
  /** Shown instead of tile when disabled is true. Falls back to tile at 50% opacity if absent. */
  disabledTile?: TileRef;
  /** Initial active state. Default: false. */
  active?: boolean;
  /** Initial disabled state — blocks input, mutes visuals. Default: false. */
  disabled?: boolean;
  /** Small overlay counter/indicator at the button's top-right corner. */
  badge?: BadgeDef;
  /** Optional label rendered below the button. */
  label?: string | LabelDef;
  onPressed: () => void;
}

/**
 * Resolves the correct graphic and opacity for a button given its current
 * disabled/active state. The graphic is pre-scaled to exactly w×h pixels.
 *
 * Sprites are cloned before scaling so the shared cached instance is not
 * mutated. Animations are used as-is (their scale property is instance-level).
 * When no tile is available a semi-transparent placeholder rectangle is used.
 *
 * Returns the ready-to-use graphic and the target opacity (0.5 when disabled
 * without a disabledTile, 1 otherwise).
 */
export function makeButtonGraphic(
  def: ButtonDef,
  disabled: boolean,
  active: boolean,
  w: number,
  h: number,
): { graphic: ex.Graphic; opacity: number } {
  let tileRef: TileRef | undefined;
  if (disabled && def.disabledTile) tileRef = def.disabledTile;
  else if (active && def.activeTile) tileRef = def.activeTile;
  else tileRef = def.tile;

  let graphic: ex.Graphic;
  if (tileRef) {
    const base = parseTileRef(tileRef);
    // Clone only plain Sprites to avoid mutating the shared cached instance.
    // Animations and GraphicsGroups (multi-layer tiles) are used as-is.
    const g = base instanceof ex.Sprite ? base.clone() : base;
    g.scale = ex.vec(w / base.width, h / base.height);
    graphic = g;
  } else {
    graphic = new ex.Rectangle({
      width: w,
      height: h,
      color: ex.Color.fromHex("#ffffff33"),
    });
  }
  return { graphic, opacity: disabled && !def.disabledTile ? 0.5 : 1 };
}

// ---------------------------------------------------------------------------
// TileActor badge types
// ---------------------------------------------------------------------------

/**
 * A badge rendered at a fixed corner or edge of a TileActor's sprite.
 * Always visible (not selection-gated). Pointer events pass through to
 * the parent actor.
 */
export interface TileActorBadgeDef {
  /** Corner/edge of the actor sprite where the badge is placed. */
  anchor: AnchorPlacement;
  /** Badge content: text shorthand, LabelDef, or sprite (SpriteBadge). */
  badge: BadgeDef;
  /** Additional pixel nudge from the anchor point in world space. */
  offset?: ex.Vector;
}
