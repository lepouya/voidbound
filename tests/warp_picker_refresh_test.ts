import { assert, assertFalse } from "@std/assert";

import { shouldRecomputeWarpPreview } from "../src/map/warp-picker-refresh.ts";

Deno.test("warp preview refreshes when an authoritative update lands at the same camera tile", () => {
  const previous = { col: 120, row: 80, stateRevision: 41 };

  // An asteroid/mothership update can change occupancy, and a resource update
  // can change Confirm affordability, without moving the camera at all.
  assert(shouldRecomputeWarpPreview(previous, {
    col: 120,
    row: 80,
    stateRevision: 42,
  }));
});

Deno.test("warp preview stays cached while both camera tile and state match", () => {
  const key = { col: 120, row: 80, stateRevision: 41 };
  assertFalse(shouldRecomputeWarpPreview(key, { ...key }));
});
