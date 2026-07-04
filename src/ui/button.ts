import * as ex from "excalibur";

import { BadgeDef } from "./badge";
import { LabelDef } from "./label";
import { parseTileRef, TileRef } from "./tile-ref";

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
  /**
   * Optional label rendered below the button. Button labels default to
   * borderless with labelOffset (0, -1) (see resolveButtonLabel) — pass a
   * plain string unless you need to override those.
   */
  label?: string | LabelDef;
  onPressed: () => void;
}

// ---------------------------------------------------------------------------
// Button rendering helpers
// ---------------------------------------------------------------------------

/**
 * Resolves the correct graphic and opacity for a button given its current
 * disabled/active state. The graphic is pre-scaled to exactly w×h pixels.
 *
 * Sprites are cloned before scaling so the shared cached instance is not
 * mutated. Animations are constructed fresh per getGraphic call, so scaling
 * them in-place is safe.
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
    // Clone only plain Sprites — they are shared cached instances. Animations
    // and GraphicsGroups (multi-layer tiles) are constructed fresh per call,
    // so they are safe to mutate.
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
