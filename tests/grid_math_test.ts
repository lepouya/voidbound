import { assert, assertEquals } from "jsr:@std/assert@1";

import {
  closestDockTile,
  isDockTile,
  TileFootprint,
} from "../src/grid-math.ts";

// The MapLevel mothership: 4*4 at (48, 48). Its inner 2*2 docking tiles are
// cols 49-50, rows 49-50.
const SHIP: TileFootprint = { col: 48, row: 48, colSpan: 4, rowSpan: 4 };

Deno.test("closestDockTile picks the dock corner nearest the destination", () => {
  // Destination up-left of the ship → near dock tile (49, 49).
  assertEquals(closestDockTile(SHIP, 40, 40), { col: 49, row: 49 });
  // Down-right → far dock tile (50, 50).
  assertEquals(closestDockTile(SHIP, 60, 60), { col: 50, row: 50 });
  // Mixed quadrants.
  assertEquals(closestDockTile(SHIP, 60, 40), { col: 50, row: 49 });
  assertEquals(closestDockTile(SHIP, 40, 60), { col: 49, row: 50 });
});

Deno.test("closestDockTile boundary: the ship-center coordinate flips the pick", () => {
  // col/row 50 is the center line: destinations at exactly 50 pick the far
  // tile, 49 picks the near tile.
  assertEquals(closestDockTile(SHIP, 50, 50), { col: 50, row: 50 });
  assertEquals(closestDockTile(SHIP, 49, 49), { col: 49, row: 49 });
});

Deno.test("closestDockTile always returns a dock tile", () => {
  for (const dest of [[0, 0], [99, 99], [48, 52], [51, 47], [50, 49]]) {
    const dock = closestDockTile(SHIP, dest[0], dest[1]);
    assert(
      isDockTile(SHIP, dock.col, dock.row),
      `dock (${dock.col}, ${dock.row}) for dest (${dest[0]}, ${dest[1]})`,
    );
  }
});

Deno.test("isDockTile matches exactly the inner 2*2", () => {
  const docks: Array<[number, number]> = [[49, 49], [50, 49], [49, 50], [
    50,
    50,
  ]];
  for (const [c, r] of docks) assert(isDockTile(SHIP, c, r), `(${c}, ${r})`);
  const outside: Array<[number, number]> = [
    [48, 49], // west edge of the ship, not a dock
    [51, 50], // east edge
    [49, 48], // north edge
    [50, 51], // south edge
    [0, 0],
  ];
  for (const [c, r] of outside) {
    assert(!isDockTile(SHIP, c, r), `(${c}, ${r})`);
  }
});
