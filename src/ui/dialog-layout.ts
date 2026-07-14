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
   * The pinned band below the title and above `content` — zero height unless
   * the caller passed a `headerHeight` (ROADMAP P1.21: a dialog's tab strip).
   * Never scrolls, unlike `content`/`rows`.
   */
  header: DialogRect;
  /**
   * The content region below the title band (and header, if any), inside the
   * padding — kept a distinct sub-rect so the scrollable row window (ROADMAP
   * P1.21) can clamp against it without touching the frame math.
   */
  content: DialogRect;
  /** One rect per content row, stacked top-down inside `content`. */
  rows: DialogRect[];
}

/**
 * Computes the dialog frame for the given screen dimensions (the zoom-1
 * resolution — screen space is not affected by camera zoom). The panel height
 * follows the row heights (plus `headerHeight`, if given) but never exceeds
 * the screen minus margins. `rowHeights` should be only the *visible* window
 * of rows for a scrollable dialog (ROADMAP P1.21's `computeScrollWindow`) —
 * this function has no scroll awareness of its own.
 */
export function layoutDialogFrame(
  screenW: number,
  screenH: number,
  rowHeights: number[],
  opts: DialogLayoutOpts = {},
  headerHeight = 0,
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
    titleHeight + headerHeight + contentH + 2 * padding,
    screenH - 2 * margin,
  );
  const panel: DialogRect = {
    x: (screenW - w) / 2,
    y: (screenH - h) / 2,
    w,
    h,
  };

  const header: DialogRect = {
    x: panel.x + padding,
    y: panel.y + titleHeight,
    w: panel.w - 2 * padding,
    h: headerHeight,
  };

  const content: DialogRect = {
    x: panel.x + padding,
    y: panel.y + titleHeight + headerHeight + padding,
    w: panel.w - 2 * padding,
    h: panel.h - titleHeight - headerHeight - 2 * padding,
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
    header,
    content,
    rows,
  };
}

/**
 * Windows a row list for a scrollable dialog (ROADMAP P1.21): assumes
 * uniform row height (the only shape needed so far — a message feed), so the
 * math is a simple row count rather than a rolling height sum. `offset` is
 * clamped to `[0, maxOffset]`, so a caller can pass a raw drag-derived value
 * without pre-clamping.
 */
export function computeScrollWindow(
  totalRows: number,
  visibleRows: number,
  offset: number,
): { startIndex: number; visibleCount: number; maxOffset: number } {
  const visibleCount = Math.min(visibleRows, totalRows);
  const maxOffset = Math.max(0, totalRows - visibleCount);
  const startIndex = Math.min(Math.max(0, offset), maxOffset);
  return { startIndex, visibleCount, maxOffset };
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
