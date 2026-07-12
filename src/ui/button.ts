import * as ex from "excalibur";

import { BadgeDef } from "./badge.ts";
import { LabelDef } from "./label.ts";
import { parseTileRef, TileRef } from "./tile-ref.ts";

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
  /** Base frame/chrome tile (e.g., circular border or HUD box). */
  frameTile?: TileRef;
  /** Shown instead of frameTile when active is true. Falls back to frameTile if absent. */
  activeFrameTile?: TileRef;
  /** Shown instead of frameTile when disabled is true. Falls back to frameTile if absent. */
  disabledFrameTile?: TileRef;
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
  let frameRef: TileRef | undefined;
  if (disabled && def.disabledFrameTile) frameRef = def.disabledFrameTile;
  else if (active && def.activeFrameTile) frameRef = def.activeFrameTile;
  else frameRef = def.frameTile;

  let tileRef: TileRef | undefined;
  if (disabled && def.disabledTile) tileRef = def.disabledTile;
  else if (active && def.activeTile) tileRef = def.activeTile;
  else tileRef = def.tile;

  const resolveScaled = (ref: TileRef): ex.Graphic => {
    const base = parseTileRef(ref);
    const g = base instanceof ex.Sprite ? base.clone() : base;
    g.scale = ex.vec(w / base.width, h / base.height);
    return g;
  };

  let graphic: ex.Graphic;
  if (frameRef && tileRef) {
    graphic = new ex.GraphicsGroup({
      members: [
        { graphic: resolveScaled(frameRef), offset: ex.vec(0, 0) },
        { graphic: resolveScaled(tileRef), offset: ex.vec(0, 0) },
      ],
    });
  } else if (frameRef) {
    graphic = resolveScaled(frameRef);
  } else if (tileRef) {
    graphic = resolveScaled(tileRef);
  } else {
    graphic = new ex.Rectangle({
      width: w,
      height: h,
      color: ex.Color.fromHex("#ffffff33"),
    });
  }

  const opacity = disabled && !def.disabledTile && !def.disabledFrameTile
    ? 0.5
    : 1;
  return { graphic, opacity };
}

// ---------------------------------------------------------------------------
// Icon button factories
// ---------------------------------------------------------------------------

/** Shared fields for the roundButton/squareButton factories below. */
export interface IconButtonOpts {
  /** Icon name — resolves to the `ui-icon-<icon>` tileset's base/active/disabled frames. */
  icon: string;
  label?: string | LabelDef;
  disabled?: boolean;
  badge?: BadgeDef;
  onPressed: () => void;
}

/**
 * Builds a ButtonDef wearing the `ui-frame-round` chrome plus the named
 * `ui-icon-<icon>` sprite (base/active/disabled frames) — the shape every
 * world-space TileActor action button uses (mothership/asteroid/vessel
 * commands, empty-tile Move/Deploy, module build/level-up).
 */
export function roundButton(opts: IconButtonOpts): ButtonDef {
  return {
    frameTile: "ui-frame-round:0",
    activeFrameTile: "ui-frame-round:1",
    disabledFrameTile: "ui-frame-round:2",
    tile: `ui-icon-${opts.icon}:0`,
    activeTile: `ui-icon-${opts.icon}:1`,
    disabledTile: `ui-icon-${opts.icon}:2`,
    label: opts.label,
    disabled: opts.disabled,
    badge: opts.badge,
    onPressed: opts.onPressed,
  };
}

/**
 * Builds a ButtonDef wearing the `ui-frame-square` chrome plus the named
 * `ui-icon-<icon>` sprite — the shape every HUD/dialog button uses
 * (top/bottom-right HUD groups, scene-switch, shop/dialog action buttons).
 * width/height are required: unlike round world-space buttons, every square
 * caller renders at a HUD-specific size (see HudButtonDef in hud.ts).
 */
export function squareButton(
  opts: IconButtonOpts & { width: number; height: number },
): ButtonDef & { width: number; height: number } {
  return {
    frameTile: "ui-frame-square:0",
    activeFrameTile: "ui-frame-square:1",
    disabledFrameTile: "ui-frame-square:2",
    tile: `ui-icon-${opts.icon}:0`,
    activeTile: `ui-icon-${opts.icon}:1`,
    disabledTile: `ui-icon-${opts.icon}:2`,
    label: opts.label,
    disabled: opts.disabled,
    badge: opts.badge,
    onPressed: opts.onPressed,
    width: opts.width,
    height: opts.height,
  };
}
