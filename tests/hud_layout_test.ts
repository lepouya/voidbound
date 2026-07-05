import { assertEquals } from "jsr:@std/assert@1";

import {
  anchorLayout,
  inferDirection,
  layoutButtonCenters,
} from "../src/ui/hud-layout.ts";

// The game's portrait resolution.
const W = 390;
const H = 844;

Deno.test("anchorLayout: base positions honor padding on anchored edges", () => {
  assertEquals(anchorLayout("top-left", 8, W, H), {
    hFrac: 0,
    vFrac: 0,
    bx: 8,
    by: 8,
  });
  assertEquals(anchorLayout("bottom-right", 8, W, H), {
    hFrac: 1,
    vFrac: 1,
    bx: W - 8,
    by: H - 8,
  });
  // Centered axes ignore padding and sit at the midpoint.
  assertEquals(anchorLayout("middle-center", 8, W, H), {
    hFrac: 0.5,
    vFrac: 0.5,
    bx: W / 2,
    by: H / 2,
  });
});

Deno.test("inferDirection: bottom anchors grow up, everything else down", () => {
  assertEquals(inferDirection("bottom-left"), "up");
  assertEquals(inferDirection("bottom-right"), "up");
  assertEquals(inferDirection("top-right"), "down");
  assertEquals(inferDirection("middle-left"), "down");
});

Deno.test("top-right stacking down (the Shop/Events group)", () => {
  const centers = layoutButtonCenters(
    { anchor: "top-right", gap: 8 },
    [{ w: 48, h: 48 }, { w: 32, h: 32 }],
    W,
    H,
  );
  // First button: right edge at 382 (padding 8), top edge at 8.
  // Second: stacked 8 px below the first.
  assertEquals(centers, [
    { x: 382 - 24, y: 8 + 24 },
    { x: 382 - 16, y: 8 + 48 + 8 + 16 },
  ]);
});

Deno.test("bottom-right stacking up (the scene-switch/Mail/Items group)", () => {
  const centers = layoutButtonCenters(
    { anchor: "bottom-right", gap: 8 },
    [{ w: 64, h: 64 }, { w: 32, h: 32 }, { w: 32, h: 32 }],
    W,
    H,
  );
  // First button sits flush at the bottom edge (836), the rest stack upward.
  assertEquals(centers, [
    { x: 382 - 32, y: 836 - 32 },
    { x: 382 - 16, y: 836 - 64 - 8 - 16 },
    { x: 382 - 16, y: 836 - 64 - 8 - 32 - 8 - 16 },
  ]);
});

Deno.test("explicit 'right' from top-left grows rightward", () => {
  const centers = layoutButtonCenters(
    { anchor: "top-left", direction: "right" },
    [{ w: 32, h: 32 }, { w: 32, h: 32 }],
    W,
    H,
  );
  // Default gap 4: leading edges at 8 and 44.
  assertEquals(centers, [{ x: 24, y: 24 }, { x: 60, y: 24 }]);
});

Deno.test("explicit 'left' from top-right grows leftward", () => {
  const centers = layoutButtonCenters(
    { anchor: "top-right", direction: "left" },
    [{ w: 32, h: 32 }, { w: 32, h: 32 }],
    W,
    H,
  );
  // Right edges at 382 and 346 (gap 4).
  assertEquals(centers, [{ x: 366, y: 24 }, { x: 330, y: 24 }]);
});

Deno.test("'center' on a middle anchor is symmetric around the midpoint", () => {
  const centers = layoutButtonCenters(
    { anchor: "middle-left", direction: "center" },
    [{ w: 32, h: 32 }, { w: 32, h: 32 }],
    W,
    H,
  );
  // Total extent 32+4+32 = 68 centered on 422: spans 388..456.
  assertEquals(centers, [{ x: 24, y: 404 }, { x: 24, y: 440 }]);
  // The two centers straddle the anchor midpoint exactly.
  assertEquals((centers[0].y + centers[1].y) / 2, H / 2);
});

Deno.test("'center' on a top anchor spreads horizontally", () => {
  const centers = layoutButtonCenters(
    { anchor: "top-center", direction: "center" },
    [{ w: 32, h: 32 }, { w: 32, h: 32 }],
    W,
    H,
  );
  assertEquals((centers[0].x + centers[1].x) / 2, W / 2);
  assertEquals(centers[0].y, 24);
});

Deno.test("offset shifts the whole group along the stacking axis", () => {
  const base = layoutButtonCenters(
    { anchor: "top-right" },
    [{ w: 32, h: 32 }],
    W,
    H,
  );
  const shifted = layoutButtonCenters(
    { anchor: "top-right", offset: 40 },
    [{ w: 32, h: 32 }],
    W,
    H,
  );
  assertEquals(shifted[0].y, base[0].y + 40);
  // 'up' directions grow inward, so offset moves away from the bottom edge.
  const up = layoutButtonCenters(
    { anchor: "bottom-right", offset: 40 },
    [{ w: 32, h: 32 }],
    W,
    H,
  );
  assertEquals(up[0].y, 836 - 40 - 16);
});

Deno.test("custom padding moves the anchored edges", () => {
  const centers = layoutButtonCenters(
    { anchor: "top-left", padding: 20 },
    [{ w: 32, h: 32 }],
    W,
    H,
  );
  assertEquals(centers, [{ x: 36, y: 36 }]);
});
