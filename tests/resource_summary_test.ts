import { assertEquals } from "@std/assert";
import { applyBalanceCatalog } from "../src/state/balance-catalog.ts";
import { productionForModules } from "../src/scene/resource-summary.ts";
import { sampleBalance } from "./balance_fixture.ts";

Deno.test("resource overview counts settled, staffed production and support bonuses", () => {
  applyBalanceCatalog(sampleBalance());
  const modules = [
    { moduleId: "command", moduleType: "command", level: 1 },
    { moduleId: "refinery", moduleType: "ore-refinery", level: 1 },
    { moduleId: "building", moduleType: "ore-refinery", level: 0 },
    { moduleId: "unknown", moduleType: "unknown", level: 9 },
  ];
  assertEquals(productionForModules(modules.values(), new Map()), {
    construction: 24,
    highTech: 12,
    biological: 12,
    fuel: 12,
    credits: 0,
  });
  const assignments = new Map([["refinery", { assigned: 1 }]]);
  assertEquals(
    productionForModules(modules.values(), assignments).construction,
    36,
  );
  modules.push({ moduleId: "storage", moduleType: "storage-bay", level: 3 });
  assignments.set("storage", { assigned: 3 });
  // A fully staffed level-3 bay boosts each producer by 15%, rounding per
  // module just like the existing module Details preview: 13 + 27 = 40.
  assertEquals(
    productionForModules(modules.values(), assignments).construction,
    40,
  );
  assertEquals(productionForModules(modules.values(), assignments).credits, 0);
});
