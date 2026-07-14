import { assertEquals, assertFalse } from "@std/assert";

import {
  computeFootprintColors,
  estimateWarpFuelCost,
  Footprint,
  footprintIsClear,
} from "../src/map/warp-footprint.ts";

Deno.test("an empty map colors every cell green", () => {
  const colors = computeFootprintColors(10, 10, 4, []);
  assertEquals(colors.length, 4);
  for (const row of colors) {
    assertEquals(row, ["green", "green", "green", "green"]);
  }
  assertEquals(footprintIsClear(colors), true);
});

Deno.test("an overlapping entity reds out exactly the overlapping cells", () => {
  // Footprint at (10,10)-(13,13); entity at (12,12)-(14,14) overlaps the
  // footprint's bottom-right 2*2 corner only, with its own 8-neighbors
  // (row/col 1) turning yellow.
  const occupied: Footprint[] = [{ col: 12, row: 12, span: 2 }];
  const colors = computeFootprintColors(10, 10, 4, occupied);
  assertEquals(colors, [
    ["green", "green", "green", "green"],
    ["green", "yellow", "yellow", "yellow"],
    ["green", "yellow", "red", "red"],
    ["green", "yellow", "red", "red"],
  ]);
  assertFalse(footprintIsClear(colors));
});

Deno.test("cells adjacent to a red cell (including diagonally) turn yellow", () => {
  // A 1-tile entity near the footprint's top-left reds one cell and turns
  // every 8-neighbor yellow, leaving the untouched half green.
  const occupied: Footprint[] = [{ col: 11, row: 11, span: 1 }];
  const colors = computeFootprintColors(10, 10, 4, occupied);
  assertEquals(colors, [
    ["yellow", "yellow", "yellow", "green"],
    ["yellow", "red", "yellow", "green"],
    ["yellow", "yellow", "yellow", "green"],
    ["green", "green", "green", "green"],
  ]);
  assertFalse(footprintIsClear(colors));
});

Deno.test("touching-edge footprints (gap 0) don't overlap or turn cells yellow", () => {
  // Entity anchored exactly at the footprint's right edge (col 14) is
  // adjacent, not overlapping — matches the server's footprints_clear(gap: 0).
  // Yellow only propagates from a red cell inside the footprint, so an
  // entity that never overlaps leaves every cell green.
  const occupied: Footprint[] = [{ col: 14, row: 10, span: 4 }];
  const colors = computeFootprintColors(10, 10, 4, occupied);
  assertEquals(footprintIsClear(colors), true);
});

Deno.test("estimateWarpFuelCost is free in place, at least 1 otherwise", () => {
  assertEquals(estimateWarpFuelCost(500, 500, 500, 500), 0);
  assertEquals(estimateWarpFuelCost(500, 500, 501, 500), 1);
  assertEquals(estimateWarpFuelCost(500, 500, 500, 501), 1);
});

Deno.test("estimateWarpFuelCost rounds straight-line tile distance up", () => {
  // hypot(3, 4) = 5 exactly.
  assertEquals(estimateWarpFuelCost(0, 0, 3, 4), 5);
  // hypot(48, 52) ≈ 70.77 -> rounds up to 71.
  assertEquals(estimateWarpFuelCost(498, 498, 546, 550), 71);
});
