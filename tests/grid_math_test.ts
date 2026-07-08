import { assert, assertEquals } from "jsr:@std/assert@1";

import {
  closestDockTile,
  isDockTile,
  moduleAnchorAt,
  roomOriginAt,
  SHIP_ROOM_GRID,
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

Deno.test("roomOriginAt maps every tile of a room to its top-left corner", () => {
  // Ship rooms: origins at 1, 9, 17, 25, 33, each spanning 6 tiles.
  // Every tile of the center room (17-22) resolves to (17, 17).
  for (let col = 17; col <= 22; col++) {
    for (let row = 17; row <= 22; row++) {
      assertEquals(roomOriginAt(SHIP_ROOM_GRID, col, row), {
        col: 17,
        row: 17,
      });
    }
  }
  // Corner rooms of the 5*5 grid.
  assertEquals(roomOriginAt(SHIP_ROOM_GRID, 1, 1), { col: 1, row: 1 });
  assertEquals(roomOriginAt(SHIP_ROOM_GRID, 38, 38), { col: 33, row: 33 });
});

Deno.test("roomOriginAt rejects void, hull, and corridor tiles", () => {
  const outside: Array<[number, number]> = [
    [0, 0], // hull ring around the interior
    [0, 20], // hull west of a room band
    [39, 39], // hull, past the last room (ends at 38)
    [7, 3], // corridor column between rooms 0 and 1
    [20, 8], // corridor row between rooms 0 and 1
    [7, 8], // corridor intersection — in no room on either axis
    [-5, 20], // off-map
    [20, 100],
  ];
  for (const [c, r] of outside) {
    assertEquals(roomOriginAt(SHIP_ROOM_GRID, c, r), null, `(${c}, ${r})`);
  }
});

Deno.test("moduleAnchorAt centers a 4*4 module one tile into its 6*6 room", () => {
  // The center room (17, 17) hosts the Command Module at (18, 18).
  assertEquals(moduleAnchorAt(SHIP_ROOM_GRID, 20, 21, 4), { col: 18, row: 18 });
  // Top-left room.
  assertEquals(moduleAnchorAt(SHIP_ROOM_GRID, 1, 6, 4), { col: 2, row: 2 });
  // Not inside a room.
  assertEquals(moduleAnchorAt(SHIP_ROOM_GRID, 7, 7, 4), null);
});
