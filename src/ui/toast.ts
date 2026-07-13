// ---------------------------------------------------------------------------
// Toast/snackbar layer (ROADMAP P1.15)
// ---------------------------------------------------------------------------
//
// Transient on-screen messages: bordered text pills stacked bottom-center,
// newest nearest the screen edge, each fading out on its own timer. Toasts
// are purely informational — they never capture pointer input (taps pass
// through to whatever is underneath) and they render above the modal layer,
// so feedback for an action taken inside a dialog (e.g. a rejected deal
// accept) stays visible over the open dialog.
//
// Scenes show toasts through TiledScene.showToast() — never spawnToast
// directly — which owns the stack: restacking as toasts expire, capping the
// count, relayout on resize, and clearing on scene switch. The first
// consumer is player-visible feedback for rejected server requests (see
// errorToast), but the primitive is general.

import * as ex from "excalibur";

import { layoutButtonCenters } from "./hud-layout.ts";
import { LABEL_PAD, makeLabelActor } from "./label.ts";

/**
 * Z draw order the toast layer builds on: above MODAL_BASE_Z, so transient
 * feedback stays visible over an open dialog (which captures the input a
 * toast never wants anyway).
 */
export const TOAST_BASE_Z = 30_000;

/** Most toasts shown at once — older ones drop off the top of the stack. */
export const MAX_ACTIVE_TOASTS = 4;

const TOAST_FONT_SIZE = 12;
const TOAST_DURATION_MS = 4_000;
const TOAST_FADE_MS = 300;
/** Width cap so toasts stay pill-shaped; longer messages wrap. */
const TOAST_MAX_WIDTH = 300;
/** Minimum gap between a toast and the screen's side edges. */
const TOAST_SIDE_MARGIN = 24;
/** Gap between the newest toast and the bottom screen edge — clears the
 *  bottom-right HUD group visually (overlap would only be cosmetic: toasts
 *  never take input). */
const TOAST_EDGE_PADDING = 88;
const TOAST_STACK_GAP = 6;

/** Background fill per kind; text stays white (LabelDef default). */
const TOAST_BACKGROUND: Record<ToastKind, ex.Color> = {
  info: ex.Color.fromRGB(10, 14, 26, 0.92), // the dialog panel's palette
  error: ex.Color.fromRGB(112, 16, 24, 0.92),
};

export type ToastKind = "info" | "error";

export interface ToastDef {
  message: string;
  /** Visual flavor: neutral "info" (default) or red-tinted "error". */
  kind?: ToastKind;
  /** How long the toast holds before fading (ms). Default: 4000. */
  durationMs?: number;
}

/** Shorthand for the rejected-server-request consumer: an error-kind toast.
 *  Callers compose the message ("Deploy failed: ${err}") — backend rejection
 *  strings are player-readable sentences by convention. */
export function errorToast(message: string): ToastDef {
  return { message, kind: "error" };
}

/** Runtime control for one live toast, held by TiledScene's stack. */
export interface ToastHandle {
  /** Pill size measured at spawn, for stack layout. */
  readonly width: number;
  readonly height: number;
  /** Position the pill's visual center (screen px). */
  setCenter(x: number, y: number): void;
  /** Remove the toast immediately (stack cap or scene switch). */
  remove(): void;
}

/**
 * Screen positions for the whole toast stack, newest first — plain
 * layoutButtonCenters stacking with the toast constants baked in. Shared by
 * spawn-time restacks and relayout-on-resize (TiledScene calls it with the
 * zoom-1 resolution, like every screen-space layout).
 */
export function layoutToastCenters(
  sizes: Array<{ w: number; h: number }>,
  screenW: number,
  screenH: number,
): Array<{ x: number; y: number }> {
  return layoutButtonCenters(
    {
      anchor: "bottom-center",
      direction: "up",
      padding: TOAST_EDGE_PADDING,
      gap: TOAST_STACK_GAP,
    },
    sizes,
    screenW,
    screenH,
  );
}

/**
 * Builds one toast: a bordered label pill on a positionable screen-space
 * root, self-expiring via delay → fade → kill. `onExpired` fires (with this
 * toast's own handle) only on natural expiry — remove() paths skip it, so
 * the caller drops the handle itself there.
 */
export function spawnToast(
  engine: ex.Engine,
  def: ToastDef,
  onExpired: (handle: ToastHandle) => void,
): { root: ex.ScreenElement; handle: ToastHandle } {
  const kind = def.kind ?? "info";
  const maxWidth = Math.min(
    TOAST_MAX_WIDTH,
    engine.screen.resolution.width - 2 * TOAST_SIDE_MARGIN,
  );

  // Measure the wrapped text the same way makeBorderedLabel will draw it, so
  // the stack layout knows this pill's real size.
  const font = new ex.Font({
    size: TOAST_FONT_SIZE,
    textAlign: ex.TextAlign.Center,
    baseAlign: ex.BaseAlign.Middle,
  });
  const bounds = font.measureText(def.message, maxWidth);

  const root = new ex.ScreenElement({
    x: 0,
    y: 0,
    anchor: ex.vec(0, 0),
    z: TOAST_BASE_Z,
  });

  const handle: ToastHandle = {
    width: bounds.width + LABEL_PAD * 2,
    height: bounds.height + LABEL_PAD * 2,
    setCenter(x: number, y: number) {
      root.pos = ex.vec(x, y);
    },
    remove() {
      root.kill();
    },
  };

  const label = makeLabelActor(
    {
      text: def.message,
      bordered: true,
      fontSize: TOAST_FONT_SIZE,
      backgroundColor: TOAST_BACKGROUND[kind],
    },
    ex.vec(0, 0),
    { anchor: "middle-center", maxWidth },
  );
  if (label) {
    root.addChild(label);
    label.actions
      .delay(def.durationMs ?? TOAST_DURATION_MS)
      .fade(0, TOAST_FADE_MS)
      .callMethod(() => {
        root.kill();
        onExpired(handle);
      });
  }

  return { root, handle };
}
