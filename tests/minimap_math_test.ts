import { assertAlmostEquals, assertEquals } from "@std/assert";

import {
  minimapProjection,
  minimapToWorld,
  viewportRect,
  worldToMinimap,
} from "../src/minimap-math.ts";

// The real space map: 1000*1000 tiles at 32 px on a 120 px widget.
const MAP_PX = 1000 * 32;
const SQUARE = minimapProjection(MAP_PX, MAP_PX, 120);

Deno.test("minimapProjection fits a square map exactly (no letterbox)", () => {
  assertEquals(SQUARE.size, 120);
  assertAlmostEquals(SQUARE.scale, 120 / MAP_PX);
  assertEquals(SQUARE.offsetX, 0);
  assertEquals(SQUARE.offsetY, 0);
});

Deno.test("minimapProjection letterboxes the shorter axis of a wide map", () => {
  const p = minimapProjection(2000, 1000, 100);
  // Fit the long axis: scale = 100/2000; the 1000-px height maps to 50 px,
  // centered with 25 px margins above and below.
  assertAlmostEquals(p.scale, 0.05);
  assertEquals(p.offsetX, 0);
  assertEquals(p.offsetY, 25);
});

Deno.test("worldToMinimap maps map corners to widget corners", () => {
  assertEquals(worldToMinimap(0, 0, SQUARE), { x: 0, y: 0 });
  assertEquals(worldToMinimap(MAP_PX, MAP_PX, SQUARE), { x: 120, y: 120 });
  const center = worldToMinimap(MAP_PX / 2, MAP_PX / 2, SQUARE);
  assertAlmostEquals(center.x, 60);
  assertAlmostEquals(center.y, 60);
});

Deno.test("minimapToWorld inverts worldToMinimap, letterbox included", () => {
  const p = minimapProjection(2000, 1000, 100);
  for (const [x, y] of [[0, 0], [1234, 567], [2000, 1000]]) {
    const m = worldToMinimap(x, y, p);
    const back = minimapToWorld(m.x, m.y, p);
    assertAlmostEquals(back.x, x);
    assertAlmostEquals(back.y, y);
  }
});

Deno.test("viewportRect centers on the camera and scales with zoom", () => {
  // A 390*844 draw at zoom 1 in the map center.
  const rect = viewportRect(
    { x: MAP_PX / 2, y: MAP_PX / 2 },
    1,
    390,
    844,
    SQUARE,
  );
  assertAlmostEquals(rect.w, 390 * SQUARE.scale);
  assertAlmostEquals(rect.h, 844 * SQUARE.scale);
  assertAlmostEquals(rect.x + rect.w / 2, 60);
  assertAlmostEquals(rect.y + rect.h / 2, 60);
  // Doubling the zoom halves the visible extent.
  const zoomed = viewportRect(
    { x: MAP_PX / 2, y: MAP_PX / 2 },
    2,
    390,
    844,
    SQUARE,
  );
  assertAlmostEquals(zoomed.w, rect.w / 2);
  assertAlmostEquals(zoomed.h, rect.h / 2);
});

Deno.test("viewportRect enforces the minimum marker size", () => {
  // At default zoom on the full-size map the true rect is under a pixel —
  // minSize must inflate it around the same center.
  const rect = viewportRect(
    { x: MAP_PX / 2, y: MAP_PX / 2 },
    1,
    390,
    844,
    SQUARE,
    8,
  );
  assertEquals(rect.w, 8);
  assertEquals(rect.h, 8);
  assertAlmostEquals(rect.x + rect.w / 2, 60);
  assertAlmostEquals(rect.y + rect.h / 2, 60);
  // A rect already larger than minSize is untouched.
  const minZoom = 390 / MAP_PX;
  const all = viewportRect(
    { x: MAP_PX / 2, y: MAP_PX / 2 },
    minZoom,
    390,
    844,
    SQUARE,
    8,
  );
  assertEquals(all, { x: 0, y: 0, w: 120, h: 120 });
});

Deno.test("viewportRect clips to the widget bounds", () => {
  // Camera in the map's top-left corner: the rect must not spill past 0.
  const rect = viewportRect({ x: 0, y: 0 }, 1, 390, 844, SQUARE);
  assertEquals(rect.x, 0);
  assertEquals(rect.y, 0);
  assertAlmostEquals(rect.w, 390 * SQUARE.scale / 2);
  assertAlmostEquals(rect.h, 844 * SQUARE.scale / 2);
  // Fully zoomed out (whole map visible): the rect covers the map area.
  const minZoom = 390 / MAP_PX;
  const all = viewportRect(
    { x: MAP_PX / 2, y: MAP_PX / 2 },
    minZoom,
    390,
    844,
    SQUARE,
  );
  assertEquals(all, { x: 0, y: 0, w: 120, h: 120 });
});
