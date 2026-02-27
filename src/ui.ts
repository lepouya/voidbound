import * as ex from "excalibur";

import { Resources } from "./resources";

// "tileset-name" or "tileset-name:tile-id" (tile-id defaults to 0)
export type TileRef = string;

export function parseTileRef(ref: TileRef): ex.Graphic {
  const colon = ref.indexOf(":");
  const name = colon === -1 ? ref : ref.slice(0, colon);
  const tileId = colon === -1 ? 0 : parseInt(ref.slice(colon + 1), 10);
  return Resources.Tilesets.getGraphic(name, tileId);
}

export const LABEL_FONT_SIZE = 10;
export const LABEL_PAD = 2;
export const LABEL_CORNER_RADIUS = 10;

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
  }: {
    maxWidth?: number;
    bordered?: boolean;
    fontSize?: number;
    color?: ex.Color;
  } = {},
): ex.GraphicsGroup {
  const baseFont = {
    size: fontSize,
    textAlign: ex.TextAlign.Center,
    baseAlign: ex.BaseAlign.Top,
  };
  // Halo pass: black stroke only, transparent fill — drawn first (behind).
  const haloFont = new ex.Font({
    ...baseFont,
    color: ex.Color.Transparent,
    strokeColor: ex.Color.Black,
    lineWidth: 2,
  });
  // Fill pass: colored fill only, no stroke — drawn on top.
  const fillFont = new ex.Font({
    ...baseFont,
    color,
  });
  const b = fillFont.measureText(text, maxWidth);
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
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
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
  // The -LABEL_PAD shift aligns the text origin with the rect's inner
  // edge, compensating for the font's own internal padding offset.
  const textOffset = ex.vec(-LABEL_PAD, -LABEL_PAD);
  members.push(
    {
      offset: textOffset,
      graphic: new ex.Text({ text, font: haloFont, maxWidth }),
      useBounds: false,
    },
    {
      offset: textOffset,
      graphic: new ex.Text({ text, font: fillFont, maxWidth }),
      useBounds: false,
    },
  );
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
 * @param anchor - actor anchor; default (0.5, 0) = top-center at pos
 * @param scale  - actor scale; default (1, 1). World-space callers pass the
 *                 inverse of the parent's scale to keep labels at 1:1.
 * @param maxWidth - optional max wrap width passed to makeBorderedLabel
 * @param visible  - initial graphics visibility; default true
 */
export function makeLabelActor(
  label: string | LabelDef | undefined,
  pos: ex.Vector,
  {
    anchor = ex.vec(0.5, 0),
    scale = ex.vec(1, 1),
    maxWidth,
    visible = true,
  }: {
    anchor?: ex.Vector;
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

  const actor = new ex.Actor({ pos: actorPos, anchor, scale });
  actor.graphics.use(
    makeBorderedLabel(def.text, {
      maxWidth,
      bordered: def.bordered ?? true,
      fontSize: def.fontSize,
      color: def.color,
    }),
  );
  if (!visible) actor.graphics.isVisible = false;
  return actor;
}

/**
 * Creates an actor whose graphic is a small badge label, anchored at its
 * top-right corner (anchor 1,1). Used for overlay counters on buttons.
 *
 * @param badge   - string/number shorthand (defaults: bordered, 80% font size),
 *                  or a full LabelDef to control bordered, color, fontSize, etc.
 * @param pos     - position in the parent's local space
 * @param scale   - actor scale; world-space callers pass inverse of parent scale
 * @param visible - initial visibility; default true
 */
export function makeBadgeActor(
  badge: number | string | LabelDef,
  pos: ex.Vector,
  {
    scale = ex.vec(1, 1),
    visible = true,
  }: {
    scale?: ex.Vector;
    visible?: boolean;
  } = {},
): ex.Actor {
  // When a LabelDef is passed, use it as-is. For string/number shorthand,
  // apply badge-appropriate defaults (bordered, smaller font).
  const def: LabelDef = typeof badge === "object"
    ? badge
    : { text: String(badge), bordered: true, fontSize: LABEL_FONT_SIZE * 0.8 };
  const fontSize = def.fontSize ?? LABEL_FONT_SIZE * 0.8;
  // Measure the text width and shift the position left by that amount so the
  // badge stays inside the button bounds instead of growing to the right.
  const { width } = new ex.Font({ size: fontSize }).measureText(def.text);
  const adjustedPos = pos.add(ex.vec(-width, 0));
  // makeLabelActor only returns null when label is undefined; we always pass a
  // LabelDef, so the non-null assertion is safe.
  return makeLabelActor(def, adjustedPos, {
    anchor: ex.vec(1, 1),
    scale,
    visible,
  })!;
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
    const g = base instanceof ex.Animation ? base : (base as ex.Sprite).clone();
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

/**
 * Unified button definition shared by world-space TileActor buttons and
 * screen-space HUD buttons.
 *
 * Fields specific to HUD buttons (ignored in world-space context):
 *   width, height  — button size in screen pixels; default 32
 *
 * Fields applicable to both contexts (initial state; runtime changes via
 * HudGroupHandle or a future per-actor API for TileActor):
 *   active, disabled, badge, hitPadding
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
  /** Inflates the pointer-event hit area beyond the visual bounds (px). Default: 0. */
  hitPadding?: number;
  /** Small overlay counter/indicator at the button's top-right corner.
   *  Pass a string/number for the default style, or a LabelDef to control
   *  bordered, color, fontSize, etc. */
  badge?: number | string | LabelDef;
  /** Button width in screen pixels. HUD only; ignored in world-space. Default: 32. */
  width?: number;
  /** Button height in screen pixels. HUD only; ignored in world-space. Default: 32. */
  height?: number;
  /** Optional label rendered below the button. */
  label?: string | LabelDef;
  onPressed: () => void;
}
