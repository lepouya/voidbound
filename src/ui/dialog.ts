// ---------------------------------------------------------------------------
// Modal dialog layer (ROADMAP P1.14)
// ---------------------------------------------------------------------------
//
// Scenes open dialogs through TiledScene.openDialog() — never spawnDialog
// directly — from onInitialize (or later), after super.onInitialize(engine).
// One dialog is open at a time; opening another closes the first. While one
// is open the scene captures all pointer input: dialog buttons fire on the
// same confirmed-tap logic as HUD buttons, and everything else — camera
// pan/zoom, world taps, HUD taps, scrim taps — is swallowed. The close
// button (or a scene switch) is the only way out unless a cell button closes
// it programmatically.
//
// Content is rows of cells composed from the existing ui/ primitives:
//
//   const handle = this.openDialog({
//     title: "Trading Post",
//     rows: [
//       {
//         cells: [
//           { tile: "ui-icon-fuel:0", label: "60" }, // icon + amount
//           { label: "→" }, // centered text
//           { tile: "ui-icon-credits:0", label: "45" },
//           {
//             button: { // interactive (a HudButtonDef)
//               frameTile: "ui-frame-square:0",
//               disabledFrameTile: "ui-frame-square:2",
//               tile: "ui-icon-buy:0",
//               disabledTile: "ui-icon-buy:2",
//               width: 40,
//               height: 40,
//               label: "Accept",
//               onPressed: () => this.acceptDeal(dealId),
//             },
//           },
//         ],
//       },
//     ],
//     onClose: () => this.shopHandle = null,
//   });
//
// Server-driven content re-renders wholesale with handle.setRows(newRows) —
// the panel re-centers to the new row count — and per-button state (e.g.
// affordability) flips with handle.setButtonDisabled(row, cell, disabled).
// Frame constants (margins, title band, padding) override per-dialog via
// DialogDef.layout (DialogLayoutOpts). There is no scrolling yet (ROADMAP
// P6.3): dialogs must fit the portrait 390*844 design target.

import * as ex from "excalibur";

import { makeBadgeActor } from "./badge.ts";
import { makeButtonGraphic } from "./button.ts";
import { HudButtonDef } from "./hud.ts";
import {
  LABEL_PAD,
  LabelDef,
  makeLabelActor,
  resolveButtonLabel,
} from "./label.ts";
import { TileRef } from "./tile-ref.ts";
import {
  DIALOG_DEFAULT_ROW_HEIGHT,
  DialogLayoutOpts,
  DialogRect,
  layoutCellRects,
  layoutDialogFrame,
} from "./dialog-layout.ts";

// Layout math lives in dialog-layout.ts — a pure module testable under plain
// `deno test` (same split as hud.ts / hud-layout.ts). Re-export the pieces
// consumers need so they keep importing from the "./ui" barrel unchanged.
export { DIALOG_DEFAULT_ROW_HEIGHT };
export type { DialogLayoutOpts, DialogRect };

/**
 * Z draw order the modal layer builds on: above HUD_BASE_Z, so an open
 * dialog's scrim covers the whole scene UI. The scrim sits at this base and
 * the panel content renders above it as its children.
 */
export const MODAL_BASE_Z = 20_000;

// Frame styling. The panel is drawn (not a stretched tile) so it stays crisp
// at any size; colors match the ui-frame-*/ui-icon-* accent palette
// (art/gen_ui.sh).
const TITLE_FONT_SIZE = 14;
const CLOSE_BUTTON_SIZE = 28;
const DEFAULT_CELL_TILE_SIZE = 22;
const PANEL_CORNER_RADIUS = 10;
const PANEL_BG = ex.Color.fromRGB(10, 14, 26, 0.95);
const PANEL_BORDER = ex.Color.fromHex("#00d2ff");
const PANEL_DIVIDER = ex.Color.fromRGB(0, 210, 255, 0.35);
const SCRIM_COLOR = ex.Color.fromRGB(0, 0, 0, 0.6);

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * One cell of a dialog content row. Exactly one flavor per cell — checked in
 * this order:
 *   button          — an interactive button (same def HUD buttons use,
 *                     including the disabled state and its own label/badge)
 *   tile (+ label)  — a static graphic centered in the cell, optional text
 *                     below it (resource-bar style)
 *   label           — text centered in the cell (borderless by default; the
 *                     panel provides the background)
 */
export interface DialogCellDef {
  /** Interactive button centered in the cell. */
  button?: HudButtonDef;
  /** Static graphic centered in the cell (e.g. a resource icon). */
  tile?: TileRef;
  /** Pixel size of the static tile graphic. Default: 22. */
  tileSize?: number;
  /** Text label (below the tile when one is present, else cell-centered). */
  label?: string | LabelDef;
  /** Relative share of the row width. Default: 1. */
  weight?: number;
}

export interface DialogRowDef {
  cells: DialogCellDef[];
  /** Row height in px. Default: DIALOG_DEFAULT_ROW_HEIGHT. */
  height?: number;
  /** Horizontal gap between cells in px. Default: 8. */
  gap?: number;
}

export interface DialogDef {
  title: string;
  rows: DialogRowDef[];
  /** Frame overrides (margins, title band, padding). */
  layout?: DialogLayoutOpts;
  /**
   * Called after the dialog closes, whatever the path: the close button, a
   * scene switch, or a newer dialog replacing this one.
   */
  onClose?: () => void;
}

/**
 * Runtime control for an open dialog. Structurally a HudPointerTarget, but a
 * dialog is modal: TiledScene dispatches to it exclusively (its own modal
 * slot) rather than through the shared HUD handle list.
 */
export interface DialogHandle {
  /**
   * Replace the content rows wholesale and relayout (the panel height follows
   * the row count) — e.g. re-rendering a server-refreshed deal list.
   * The handle owns the row defs it is given: setButtonDisabled writes state
   * back into them.
   */
  setRows(rows: DialogRowDef[]): void;
  /** Enable or disable a cell button by row/cell index. */
  setButtonDisabled(row: number, cell: number, disabled: boolean): void;
  /** Recompute the frame and all content for the current screen size. */
  relayout(engine: ex.Engine): void;
  /**
   * Fire the button under a confirmed tap, if any. Returns whether a button
   * was hit — but the tap never falls through either way: while a dialog is
   * open the scene swallows all pointer input (modal input capture).
   */
  tryPointerUp(screenPos: ex.Vector): boolean;
  /** Remove the dialog and everything in it from the scene. */
  remove(): void;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/** A hit-testable button inside the dialog (close button or cell button). */
interface DialogButtonState {
  actor: ex.Actor;
  def: HudButtonDef;
  disabled: boolean;
  center: { x: number; y: number };
  w: number;
  h: number;
  hitPad: number;
}

/** Dialog text defaults to borderless — the panel is the background. */
function resolveDialogLabel(
  label: string | LabelDef | undefined,
): LabelDef | undefined {
  if (label === undefined) return undefined;
  const def = typeof label === "string" ? { text: label } : label;
  return { bordered: false, ...def };
}

/** The framed panel chrome: rounded rect, border, title-band divider. */
function makePanelActor(panel: DialogRect, titleHeight: number): ex.Actor {
  const W = panel.w;
  const H = panel.h;
  const r = PANEL_CORNER_RADIUS;
  const canvas = new ex.Canvas({
    width: W,
    height: H,
    cache: true,
    draw(ctx) {
      // Inset by 1 so the 2px border stroke stays inside the canvas.
      ctx.beginPath();
      ctx.moveTo(1 + r, 1);
      ctx.lineTo(W - 1 - r, 1);
      ctx.arcTo(W - 1, 1, W - 1, 1 + r, r);
      ctx.lineTo(W - 1, H - 1 - r);
      ctx.arcTo(W - 1, H - 1, W - 1 - r, H - 1, r);
      ctx.lineTo(1 + r, H - 1);
      ctx.arcTo(1, H - 1, 1, H - 1 - r, r);
      ctx.lineTo(1, 1 + r);
      ctx.arcTo(1, 1, 1 + r, 1, r);
      ctx.closePath();
      ctx.fillStyle = PANEL_BG.toRGBA();
      ctx.fill();
      ctx.strokeStyle = PANEL_BORDER.toRGBA();
      ctx.lineWidth = 2;
      ctx.stroke();
      // Divider under the title band.
      ctx.beginPath();
      ctx.moveTo(8, titleHeight);
      ctx.lineTo(W - 8, titleHeight);
      ctx.strokeStyle = PANEL_DIVIDER.toRGBA();
      ctx.lineWidth = 1;
      ctx.stroke();
    },
  });
  const actor = new ex.Actor({
    pos: ex.vec(panel.x, panel.y),
    anchor: ex.vec(0, 0),
  });
  actor.graphics.use(canvas);
  return actor;
}

// ---------------------------------------------------------------------------
// Main factory
// ---------------------------------------------------------------------------

/**
 * Builds a modal dialog rooted in a single screen-covering scrim element.
 * Don't call directly from scenes — use TiledScene.openDialog(), which adds
 * the root to the scene, enforces one-dialog-at-a-time, and captures input
 * while it is open. `requestClose` is how the dialog's own close button asks
 * the scene to close it.
 */
export function spawnDialog(
  engine: ex.Engine,
  def: DialogDef,
  requestClose: () => void,
): { root: ex.ScreenElement; handle: DialogHandle } {
  const root = new ex.ScreenElement({
    x: 0,
    y: 0,
    anchor: ex.vec(0, 0),
    z: MODAL_BASE_Z,
  });

  let rows = def.rows;
  let buttons: DialogButtonState[] = [];

  const closeDef: HudButtonDef = {
    frameTile: "ui-frame-square:0",
    activeFrameTile: "ui-frame-square:1",
    tile: "ui-icon-close:0",
    activeTile: "ui-icon-close:1",
    width: CLOSE_BUTTON_SIZE,
    height: CLOSE_BUTTON_SIZE,
    hitPadding: 8,
    onPressed: requestClose,
  };

  const applyGraphic = (
    actor: ex.Actor,
    btn: HudButtonDef,
    disabled: boolean,
    w: number,
    h: number,
  ): void => {
    const { graphic, opacity } = makeButtonGraphic(
      btn,
      disabled,
      btn.active ?? false,
      w,
      h,
    );
    actor.graphics.use(graphic);
    actor.graphics.opacity = opacity;
  };

  const addButton = (
    btn: HudButtonDef,
    center: { x: number; y: number },
  ): void => {
    const w = btn.width ?? 32;
    const h = btn.height ?? 32;
    const actor = new ex.Actor({ pos: ex.vec(center.x, center.y) });
    const disabled = btn.disabled ?? false;
    applyGraphic(actor, btn, disabled, w, h);
    // Label below and badge at the top-right corner, exactly like HUD
    // buttons (button center is (0,0) in local space).
    const label = makeLabelActor(
      resolveButtonLabel(btn.label),
      ex.vec(0, h / 2 + LABEL_PAD),
    );
    if (label) actor.addChild(label);
    if (btn.badge !== undefined) {
      actor.addChild(makeBadgeActor(btn.badge, ex.vec(w / 2, -h / 2)));
    }
    root.addChild(actor);
    buttons.push({
      actor,
      def: btn,
      disabled,
      center,
      w,
      h,
      hitPad: btn.hitPadding ?? 0,
    });
  };

  const addCell = (cell: DialogCellDef, rect: DialogRect): void => {
    const center = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
    if (cell.button) {
      addButton(cell.button, center);
      return;
    }
    if (cell.tile) {
      const size = cell.tileSize ?? DEFAULT_CELL_TILE_SIZE;
      const actor = new ex.Actor({ pos: ex.vec(center.x, center.y) });
      // Reuse the button graphic resolver for its tile scaling; a static
      // cell is just a button graphic that never fires.
      applyGraphic(
        actor,
        { tile: cell.tile, onPressed: () => {} },
        false,
        size,
        size,
      );
      const label = makeLabelActor(
        resolveButtonLabel(cell.label),
        ex.vec(0, size / 2 + LABEL_PAD),
      );
      if (label) actor.addChild(label);
      root.addChild(actor);
      return;
    }
    const label = makeLabelActor(
      resolveDialogLabel(cell.label),
      ex.vec(center.x, center.y),
      { anchor: "middle-center" },
    );
    if (label) root.addChild(label);
  };

  /**
   * (Re)build everything from scratch for the current screen size and rows.
   * A dialog is a couple dozen actors at most, so full rebuild keeps resize,
   * setRows, and initial spawn on one code path.
   */
  const rebuild = (): void => {
    for (const child of [...root.children]) child.kill();
    buttons = [];

    // screen.resolution is the zoom-1 draw size (see spawnHudGroup).
    const sw = engine.screen.resolution.width;
    const sh = engine.screen.resolution.height;
    root.graphics.use(
      new ex.Rectangle({ width: sw, height: sh, color: SCRIM_COLOR }),
    );

    const frame = layoutDialogFrame(
      sw,
      sh,
      rows.map((row) => row.height ?? DIALOG_DEFAULT_ROW_HEIGHT),
      def.layout,
    );
    const titleHeight = (frame.titleCenter.y - frame.panel.y) * 2;

    root.addChild(makePanelActor(frame.panel, titleHeight));
    const title = makeLabelActor(
      { text: def.title, fontSize: TITLE_FONT_SIZE, bordered: false },
      ex.vec(frame.titleCenter.x, frame.titleCenter.y),
      { anchor: "middle-center" },
    );
    if (title) root.addChild(title);
    addButton(closeDef, frame.closeCenter);

    rows.forEach((row, i) => {
      const cellRects = layoutCellRects(
        frame.rows[i],
        row.cells.map((cell) => cell.weight ?? 1),
        row.gap,
      );
      row.cells.forEach((cell, j) => addCell(cell, cellRects[j]));
    });
  };

  rebuild();

  const handle: DialogHandle = {
    setRows(newRows: DialogRowDef[]) {
      rows = newRows;
      rebuild();
    },

    setButtonDisabled(row: number, cell: number, disabled: boolean) {
      const btn = rows[row]?.cells[cell]?.button;
      if (!btn) return;
      // Write through to the def so a later rebuild (resize, setRows with
      // the same defs) keeps the state.
      btn.disabled = disabled;
      const state = buttons.find((b) => b.def === btn);
      if (!state) return;
      state.disabled = disabled;
      applyGraphic(state.actor, btn, disabled, state.w, state.h);
    },

    relayout(_engine: ex.Engine) {
      rebuild();
    },

    tryPointerUp(screenPos: ex.Vector): boolean {
      for (const b of buttons) {
        if (
          Math.abs(screenPos.x - b.center.x) <= b.w / 2 + b.hitPad &&
          Math.abs(screenPos.y - b.center.y) <= b.h / 2 + b.hitPad
        ) {
          if (!b.disabled) b.def.onPressed();
          return true;
        }
      }
      return false;
    },

    remove() {
      root.kill();
    },
  };

  return { root, handle };
}
