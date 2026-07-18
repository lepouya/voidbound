import * as ex from "excalibur";

import { anchorFractions, AnchorPlacement } from "./anchor.ts";
import { defaultButtonLabelOffset } from "./button-label-defaults.ts";

export const LABEL_FONT_SIZE = 10;
export const LABEL_PAD = 3;
export const LABEL_CORNER_RADIUS = 6;

// ---------------------------------------------------------------------------
// Label types
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
 * Normalizes a button label (ButtonDef.label) to a LabelDef with button
 * defaults applied: borderless, nudged one font-size up toward the button
 * when placed below it (labelOffset (0, -1)), or unshifted when centered on
 * its face. Explicit LabelDef fields override the defaults, so callers only
 * spell out what deviates.
 */
export function resolveButtonLabel(
  label: string | LabelDef | undefined,
  position?: "below" | "center",
): LabelDef | undefined {
  if (label === undefined) return undefined;
  const def = typeof label === "string" ? { text: label } : label;
  const offset = defaultButtonLabelOffset(position);
  return { bordered: false, labelOffset: ex.vec(offset.x, offset.y), ...def };
}

// ---------------------------------------------------------------------------
// Label rendering helpers
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
