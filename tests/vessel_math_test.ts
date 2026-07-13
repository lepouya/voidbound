import { assertEquals } from "@std/assert";

import { vesselMoveProgress, vesselWorldPos } from "../src/map/vessel-math.ts";

const LEG = {
  srcCol: 10,
  srcRow: 10,
  destCol: 20,
  destRow: 10,
  dispatchedAt: 1000,
  arrivalAt: 2000,
};

Deno.test("vesselMoveProgress is 0 at dispatch and 1 at arrival", () => {
  assertEquals(vesselMoveProgress(LEG, 1000), 0);
  assertEquals(vesselMoveProgress(LEG, 2000), 1);
});

Deno.test("vesselMoveProgress interpolates linearly mid-flight", () => {
  assertEquals(vesselMoveProgress(LEG, 1500), 0.5);
  assertEquals(vesselMoveProgress(LEG, 1250), 0.25);
});

Deno.test("vesselMoveProgress clamps before dispatch and after arrival", () => {
  assertEquals(vesselMoveProgress(LEG, 0), 0);
  assertEquals(vesselMoveProgress(LEG, 5000), 1);
});

Deno.test("vesselMoveProgress treats a zero/negative duration as arrived", () => {
  const instant = { ...LEG, arrivalAt: LEG.dispatchedAt };
  assertEquals(vesselMoveProgress(instant, 1000), 1);
  const backwards = { ...LEG, arrivalAt: LEG.dispatchedAt - 100 };
  assertEquals(vesselMoveProgress(backwards, 1000), 1);
});

Deno.test("vesselWorldPos lerps between src and dest tile centers", () => {
  assertEquals(vesselWorldPos(LEG, 32, 32, 1000), { x: 336, y: 336 });
  assertEquals(vesselWorldPos(LEG, 32, 32, 2000), { x: 656, y: 336 });
  assertEquals(vesselWorldPos(LEG, 32, 32, 1500), { x: 496, y: 336 });
});
