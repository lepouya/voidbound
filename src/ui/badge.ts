import * as ex from "excalibur";

import { anchorFractions, AnchorPlacement } from "./anchor";
import { LABEL_FONT_SIZE, LabelDef, makeLabelActor } from "./label";
import { parseTileRef, TileRef } from "./tile-ref";

export const DEFAULT_BADGE_SIZE = 16;

// ---------------------------------------------------------------------------
// Badge types
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

// ---------------------------------------------------------------------------
// Badge rendering helpers
// ---------------------------------------------------------------------------

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
    // Clone only plain Sprites — they are shared cached instances. Animations
    // and GraphicsGroups (multi-layer tiles) are constructed fresh per call,
    // so they are safe to mutate.
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
