import { assertEquals } from "@std/assert";

import { storageThreshold } from "../src/state/storage-threshold.ts";

Deno.test("storage threshold distinguishes protected, exposed, and paused stock", () => {
  assertEquals(storageThreshold(400, 1_000), {
    protectedAmount: 400,
    exposedAmount: 0,
    passiveProductionPaused: false,
  });
  assertEquals(storageThreshold(1_000, 1_000), {
    protectedAmount: 1_000,
    exposedAmount: 0,
    passiveProductionPaused: true,
  });
  assertEquals(storageThreshold(1_800, 1_000), {
    protectedAmount: 1_000,
    exposedAmount: 800,
    passiveProductionPaused: true,
  });
  assertEquals(storageThreshold(500, Infinity), {
    protectedAmount: 500,
    exposedAmount: 0,
    passiveProductionPaused: false,
  });
});
