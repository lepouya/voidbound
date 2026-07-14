import { assertEquals } from "@std/assert";

import {
  computeScrollWindow,
  DIALOG_DEFAULT_ROW_HEIGHT,
  layoutCellRects,
  layoutDialogFrame,
} from "../src/ui/dialog-layout.ts";

// The game's portrait resolution.
const W = 390;
const H = 844;

Deno.test("frame: panel is centered and capped by the screen margins", () => {
  const rows = [DIALOG_DEFAULT_ROW_HEIGHT, DIALOG_DEFAULT_ROW_HEIGHT];
  const frame = layoutDialogFrame(W, H, rows);
  // Width: min(480, 390 - 24) = 366, centered → x = 12.
  assertEquals(frame.panel.w, 366);
  assertEquals(frame.panel.x, 12);
  // Height: 44 (title) + 2*12 (padding) + 56+8+56 (rows) = 188, centered.
  assertEquals(frame.panel.h, 188);
  assertEquals(frame.panel.y, (H - 188) / 2);
});

Deno.test("frame: title and close button sit centered in the title band", () => {
  const frame = layoutDialogFrame(W, H, [40], { titleHeight: 44 });
  assertEquals(frame.titleCenter, {
    x: frame.panel.x + frame.panel.w / 2,
    y: frame.panel.y + 22,
  });
  assertEquals(frame.closeCenter, {
    x: frame.panel.x + frame.panel.w - 22,
    y: frame.panel.y + 22,
  });
});

Deno.test("frame: content region excludes the title band and padding", () => {
  const frame = layoutDialogFrame(W, H, [50, 50], {
    titleHeight: 40,
    padding: 10,
    rowGap: 6,
  });
  assertEquals(frame.content, {
    x: frame.panel.x + 10,
    y: frame.panel.y + 40 + 10,
    w: frame.panel.w - 20,
    h: 50 + 6 + 50,
  });
});

Deno.test("frame: rows stack top-down inside the content region", () => {
  const frame = layoutDialogFrame(W, H, [30, 60, 30], { rowGap: 8 });
  assertEquals(frame.rows.length, 3);
  assertEquals(frame.rows[0].y, frame.content.y);
  assertEquals(frame.rows[1].y, frame.content.y + 30 + 8);
  assertEquals(frame.rows[2].y, frame.content.y + 30 + 8 + 60 + 8);
  for (const row of frame.rows) {
    assertEquals(row.x, frame.content.x);
    assertEquals(row.w, frame.content.w);
  }
});

Deno.test("frame: panel height clamps to the screen minus margins", () => {
  // 20 tall rows would want far more than 844 px.
  const frame = layoutDialogFrame(W, H, Array(20).fill(100), { margin: 12 });
  assertEquals(frame.panel.h, H - 24);
  assertEquals(frame.panel.y, 12);
  // The content rect clamps with it (rows themselves may overflow — no
  // scrolling until P6.3).
  assertEquals(
    frame.content.h,
    frame.panel.h - 44 - 24,
  );
});

Deno.test("frame: maxWidth caps the panel on wide screens", () => {
  const frame = layoutDialogFrame(1200, 800, [56]);
  assertEquals(frame.panel.w, 480);
  assertEquals(frame.panel.x, (1200 - 480) / 2);
});

Deno.test("cells: equal weights split the row width minus gaps evenly", () => {
  const row = { x: 20, y: 100, w: 316, h: 56 };
  const cells = layoutCellRects(row, [1, 1, 1], 8);
  // Usable width: 316 - 16 = 300 → 100 each.
  assertEquals(cells, [
    { x: 20, y: 100, w: 100, h: 56 },
    { x: 128, y: 100, w: 100, h: 56 },
    { x: 236, y: 100, w: 100, h: 56 },
  ]);
});

Deno.test("cells: weights divide proportionally", () => {
  const row = { x: 0, y: 0, w: 106, h: 40 };
  const cells = layoutCellRects(row, [1, 2, 1], 2);
  // Usable width: 106 - 4 = 102 → 25.5 / 51 / 25.5.
  assertEquals(cells[0].w, 25.5);
  assertEquals(cells[1].w, 51);
  assertEquals(cells[2].w, 25.5);
  assertEquals(cells[1].x, 27.5);
  assertEquals(cells[2].x, 80.5);
});

Deno.test("cells: a single cell spans the full row", () => {
  const row = { x: 5, y: 5, w: 200, h: 30 };
  assertEquals(layoutCellRects(row, [1]), [row]);
});

Deno.test("frame: headerHeight adds a pinned band above content", () => {
  const frame = layoutDialogFrame(W, H, [56], {}, 32);
  // Height: 44 (title) + 32 (header) + 2*12 (padding) + 56 (row) = 156.
  assertEquals(frame.panel.h, 156);
  assertEquals(frame.header, {
    x: frame.panel.x + 12,
    y: frame.panel.y + 44,
    w: frame.panel.w - 24,
    h: 32,
  });
  assertEquals(frame.content.y, frame.panel.y + 44 + 32 + 12);
  assertEquals(frame.content.h, frame.panel.h - 44 - 32 - 24);
  assertEquals(frame.rows[0].y, frame.content.y);
});

Deno.test("frame: zero headerHeight (default) leaves a zero-height header rect", () => {
  const frame = layoutDialogFrame(W, H, [56]);
  assertEquals(frame.header.h, 0);
});

Deno.test("scroll window: fewer rows than the page shows everything, no offset", () => {
  const w = computeScrollWindow(3, 6, 0);
  assertEquals(w, { startIndex: 0, visibleCount: 3, maxOffset: 0 });
});

Deno.test("scroll window: more rows than the page clamps maxOffset to the overflow", () => {
  const w = computeScrollWindow(10, 6, 0);
  assertEquals(w, { startIndex: 0, visibleCount: 6, maxOffset: 4 });
});

Deno.test("scroll window: offset clamps to [0, maxOffset]", () => {
  assertEquals(computeScrollWindow(10, 6, -5).startIndex, 0);
  assertEquals(computeScrollWindow(10, 6, 999).startIndex, 4);
  assertEquals(computeScrollWindow(10, 6, 2).startIndex, 2);
});
