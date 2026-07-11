// Pure dialog layout math — no runtime dependencies, so
// tests/dialog_layout_test.ts can exercise it under plain `deno test`.
// Rects are plain top-left {x, y, w, h} records; dialog.ts wraps them into
// actor positions. Same pure-module split as hud.ts / hud-layout.ts.

/** Axis-aligned screen rect, top-left origin. */
export interface DialogRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The tunable frame constants of a dialog. Every field has a default sized
 * for the portrait 390*844 design target; consumers override per-dialog only
 * when a panel needs to deviate.
 */
export interface DialogLayoutOpts {
  /** Minimum gap between the panel and the screen edges (px). Default: 12. */
  margin?: number;
  /** Panel width cap (px) so wide screens don't stretch it. Default: 480. */
  maxWidth?: number;
  /** Height of the title band across the panel top (px). Default: 44. */
  titleHeight?: number;
  /** Inner padding around the content region (px). Default: 12. */
  padding?: number;
  /** Vertical gap between consecutive content rows (px). Default: 8. */
  rowGap?: number;
}

/** Default height of a content row (px) when a row doesn't override it. */
export const DIALOG_DEFAULT_ROW_HEIGHT = 56;

/** Everything spawnDialog needs to place the frame and its content rows. */
export interface DialogFrameLayout {
  /** The framed panel, horizontally and vertically centered on screen. */
  panel: DialogRect;
  /** Center of the title text within the title band. */
  titleCenter: { x: number; y: number };
  /** Center of the close button, at the right end of the title band. */
  closeCenter: { x: number; y: number };
  /**
   * The content region below the title band, inside the padding — kept a
   * distinct sub-rect so a future scrollable region (ROADMAP P6.3) can drop
   * into it without touching the frame math.
   */
  content: DialogRect;
  /** One rect per content row, stacked top-down inside `content`. */
  rows: DialogRect[];
}

/**
 * Computes the dialog frame for the given screen dimensions (the zoom-1
 * resolution — screen space is not affected by camera zoom). The panel height
 * follows the row heights but never exceeds the screen minus margins; there
 * is no scrolling yet (P6.3), so rows past the clamp simply overflow —
 * dialogs are expected to fit portrait.
 */
export function layoutDialogFrame(
  screenW: number,
  screenH: number,
  rowHeights: number[],
  opts: DialogLayoutOpts = {},
): DialogFrameLayout {
  const margin = opts.margin ?? 12;
  const maxWidth = opts.maxWidth ?? 480;
  const titleHeight = opts.titleHeight ?? 44;
  const padding = opts.padding ?? 12;
  const rowGap = opts.rowGap ?? 8;

  const contentH = rowHeights.reduce((sum, h) => sum + h, 0) +
    Math.max(0, rowHeights.length - 1) * rowGap;

  const w = Math.min(maxWidth, screenW - 2 * margin);
  const h = Math.min(
    titleHeight + contentH + 2 * padding,
    screenH - 2 * margin,
  );
  const panel: DialogRect = {
    x: (screenW - w) / 2,
    y: (screenH - h) / 2,
    w,
    h,
  };

  const content: DialogRect = {
    x: panel.x + padding,
    y: panel.y + titleHeight + padding,
    w: panel.w - 2 * padding,
    h: panel.h - titleHeight - 2 * padding,
  };

  const rows: DialogRect[] = [];
  let cursor = content.y;
  for (const rowH of rowHeights) {
    rows.push({ x: content.x, y: cursor, w: content.w, h: rowH });
    cursor += rowH + rowGap;
  }

  return {
    panel,
    titleCenter: { x: panel.x + panel.w / 2, y: panel.y + titleHeight / 2 },
    closeCenter: {
      x: panel.x + panel.w - titleHeight / 2,
      y: panel.y + titleHeight / 2,
    },
    content,
    rows,
  };
}

/**
 * Splits a row rect into horizontal cell rects, dividing the width (minus
 * gaps) proportionally to each cell's weight.
 */
export function layoutCellRects(
  row: DialogRect,
  weights: number[],
  gap = 8,
): DialogRect[] {
  const usableW = row.w - Math.max(0, weights.length - 1) * gap;
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const rects: DialogRect[] = [];
  let cursor = row.x;
  for (const weight of weights) {
    const cellW = totalWeight > 0 ? usableW * (weight / totalWeight) : 0;
    rects.push({ x: cursor, y: row.y, w: cellW, h: row.h });
    cursor += cellW + gap;
  }
  return rects;
}
