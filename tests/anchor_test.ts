import { assertEquals } from "jsr:@std/assert@1";

import { anchorFractions, AnchorPlacement } from "../src/ui/anchor.ts";

const CASES: [AnchorPlacement, number, number][] = [
  ["top-left", 0, 0],
  ["top-center", 0.5, 0],
  ["top-right", 1, 0],
  ["middle-left", 0, 0.5],
  ["middle-center", 0.5, 0.5],
  ["middle-right", 1, 0.5],
  ["bottom-left", 0, 1],
  ["bottom-center", 0.5, 1],
  ["bottom-right", 1, 1],
];

Deno.test("anchorFractions maps all 9 placements", () => {
  for (const [anchor, hFrac, vFrac] of CASES) {
    assertEquals(anchorFractions(anchor), { hFrac, vFrac }, anchor);
  }
});
