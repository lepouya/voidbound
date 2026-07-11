import { assert, assertAlmostEquals, assertEquals } from "jsr:@std/assert@1";

import { anchoredZoomPos, Point, tileViewCapZoom } from "../src/camera-math.ts";

/**
 * World point under the screen offset `offset` (screen px from the screen
 * center) for a centered camera — the invariant anchoredZoomPos preserves.
 */
function worldUnder(camera: Point, zoom: number, offset: Point): Point {
  return { x: camera.x + offset.x / zoom, y: camera.y + offset.y / zoom };
}

Deno.test("anchoredZoomPos keeps the anchored world point under its screen px", () => {
  const camera = { x: 1600, y: 1600 };
  // A point 150,-80 screen px from center at zoom 1.25.
  const offset = { x: 150, y: -80 };
  const oldZoom = 1.25;
  const anchor = worldUnder(camera, oldZoom, offset);

  for (const newZoom of [0.5, 1, 2, 4]) {
    const moved = anchoredZoomPos(anchor, camera, oldZoom, newZoom);
    const after = worldUnder(moved, newZoom, offset);
    assertAlmostEquals(after.x, anchor.x, 1e-9, `x at zoom ${newZoom}`);
    assertAlmostEquals(after.y, anchor.y, 1e-9, `y at zoom ${newZoom}`);
  }
});

Deno.test("anchoredZoomPos is identity when the zoom does not change", () => {
  const camera = { x: 320, y: 480 };
  assertEquals(
    anchoredZoomPos({ x: 1000, y: -200 }, camera, 2, 2),
    camera,
  );
});

Deno.test("anchoredZoomPos at the screen center never pans", () => {
  // Anchoring at the camera position itself (screen center) must reduce to
  // a plain centered zoom.
  const camera = { x: 50, y: 75 };
  assertEquals(anchoredZoomPos(camera, camera, 1, 3), camera);
});

Deno.test("anchoredZoomPos moves the camera toward the anchor when zooming in", () => {
  const camera = { x: 0, y: 0 };
  const anchor = { x: 100, y: 100 };
  const moved = anchoredZoomPos(anchor, camera, 1, 2);
  // Halfway to the anchor at 2x, three quarters at 4x.
  assertEquals(moved, { x: 50, y: 50 });
  assertEquals(anchoredZoomPos(anchor, camera, 1, 4), { x: 75, y: 75 });
  // Zooming out pushes it away instead.
  const out = anchoredZoomPos(anchor, camera, 1, 0.5);
  assertEquals(out, { x: -100, y: -100 });
});

Deno.test("tileViewCapZoom shows exactly maxTiles along the longer axis", () => {
  // Portrait phone view, 32px tiles, 80-tile cap (ROADMAP P1.13): at the
  // returned zoom the taller axis spans exactly 80 tiles...
  const zoom = tileViewCapZoom(390, 844, 32, 80);
  assertAlmostEquals(844 / zoom / 32, 80, 1e-9);
  // ...and the shorter axis strictly fewer.
  assert(390 / zoom / 32 < 80);
  // Landscape flips which axis binds; the result is orientation-symmetric.
  assertEquals(tileViewCapZoom(844, 390, 32, 80), zoom);
});

Deno.test("tileViewCapZoom scales with resolution and tile size", () => {
  // Twice the resolution needs twice the zoom to show the same tile count.
  assertEquals(
    tileViewCapZoom(780, 1688, 32, 80),
    2 * tileViewCapZoom(390, 844, 32, 80),
  );
  // Twice the tile size halves it.
  assertEquals(
    tileViewCapZoom(390, 844, 64, 80),
    tileViewCapZoom(390, 844, 32, 80) / 2,
  );
});
