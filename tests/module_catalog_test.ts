import { assert, assertEquals } from "jsr:@std/assert@1";

import {
  buildTimeAtLevel,
  COMMAND_MODULE_TYPE,
  costAtLevel,
  MODULE_CATALOG,
  moduleCatalogEntry,
  productionAtLevel,
  scaleForLevel,
  storageCapsForModules,
} from "../src/module-catalog.ts";

Deno.test("scaleForLevel doubles per level above 1 and is 0 at level 0", () => {
  assertEquals(scaleForLevel(10, 0), 0);
  assertEquals(scaleForLevel(10, 1), 10);
  assertEquals(scaleForLevel(10, 2), 20);
  assertEquals(scaleForLevel(10, 3), 40);
});

Deno.test("moduleCatalogEntry finds a known type and misses an unknown one", () => {
  const refinery = moduleCatalogEntry("ore-refinery");
  assert(refinery);
  assertEquals(refinery.displayName, "Ore Refinery");
  assertEquals(moduleCatalogEntry("does-not-exist"), undefined);
});

Deno.test("costAtLevel and buildTimeAtLevel scale with scaleForLevel", () => {
  const entry = moduleCatalogEntry("ore-refinery")!;
  assertEquals(costAtLevel(entry, 1), entry.baseCostConstruction);
  assertEquals(costAtLevel(entry, 2), entry.baseCostConstruction * 2);
  assertEquals(buildTimeAtLevel(entry, 1), entry.baseBuildTimeMs);
  assertEquals(buildTimeAtLevel(entry, 3), entry.baseBuildTimeMs * 4);
});

Deno.test("productionAtLevel scales every produced resource", () => {
  const command = moduleCatalogEntry(COMMAND_MODULE_TYPE)!;
  assertEquals(productionAtLevel(command, 1), {
    construction: 1,
    highTech: 1,
    biological: 1,
    fuel: 1,
  });
  assertEquals(productionAtLevel(command, 2), {
    construction: 2,
    highTech: 2,
    biological: 2,
    fuel: 2,
  });
  // A non-producing level (0) yields nothing.
  assertEquals(productionAtLevel(command, 0), {
    construction: 0,
    highTech: 0,
    biological: 0,
    fuel: 0,
  });
});

Deno.test("the catalog has one entry per type with no duplicates", () => {
  const types = MODULE_CATALOG.map((e) => e.moduleType);
  assertEquals(new Set(types).size, types.length);
  assert(types.includes(COMMAND_MODULE_TYPE));
});

Deno.test("storageCapsForModules sums stores by settled level, credits uncapped", () => {
  // No modules: zero cap on materials, credits always uncapped.
  assertEquals(storageCapsForModules([]), {
    construction: 0,
    highTech: 0,
    biological: 0,
    fuel: 0,
    credits: Infinity,
  });
  // Command baseline (1000) + a level-2 Storage Bay (2000 doubled) = 5000.
  const caps = storageCapsForModules([
    { moduleType: COMMAND_MODULE_TYPE, level: 1 },
    { moduleType: "storage-bay", level: 2 },
  ]);
  assertEquals(caps.construction, 5_000);
  assertEquals(caps.fuel, 5_000);
  assertEquals(caps.credits, Infinity);
  // Level 0 (first build still pending) contributes nothing; producers and
  // unknown types contribute nothing.
  const pending = storageCapsForModules([
    { moduleType: "storage-bay", level: 0 },
    { moduleType: "ore-refinery", level: 3 },
    { moduleType: "not-in-catalog", level: 5 },
  ]);
  assertEquals(pending.construction, 0);
});

Deno.test("the Command Module is always unlocked and every producer needs it at level 1", () => {
  const command = moduleCatalogEntry(COMMAND_MODULE_TYPE)!;
  assertEquals(command.unlockCommandLevel, 0);
  for (const entry of MODULE_CATALOG) {
    if (entry.moduleType === COMMAND_MODULE_TYPE) continue;
    assertEquals(entry.unlockCommandLevel, 1);
  }
});
