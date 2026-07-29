import { assert, assertEquals } from "@std/assert";

import {
  buildTimeAtLevel,
  canAffordModuleCost,
  COMMAND_MODULE_TYPE,
  constructionCostAtLevel,
  costAtLevel,
  crewCapacityForModules,
  crewRequiredAtLevel,
  crewRequiredForModules,
  crewScaledAmount,
  hireCostAt,
  hireCostBiological,
  maxModuleLevel,
  MODULE_CATALOG,
  moduleCatalogEntry,
  moduleDisplayName,
  productionAtLevel,
  productionBoostedAmount,
  productionBoostPctAtLevel,
  productionBoostPctForModules,
  storageAtLevel,
  storageCapsForModules,
  TRADING_POST_MODULE_TYPE,
} from "../src/ship/module-catalog.ts";
import { ResourceKind } from "../src/state/game-state.ts";
import { applyBalanceCatalog } from "../src/state/balance-catalog.ts";
import { sampleBalance } from "./balance_fixture.ts";

const SAMPLE_BALANCE = sampleBalance();

/**
 * Install the fixture inside every test rather than once at import.
 *
 * The catalog lives in module-level state that `deno test` shares across
 * every test file in the run, so a suite relying on import-time installation
 * silently depends on file order — and on no other file having installed a
 * different catalog in between.
 */
function catalogTest(name: string, fn: () => void): void {
  Deno.test(name, () => {
    applyBalanceCatalog(SAMPLE_BALANCE);
    fn();
  });
}

catalogTest(
  "moduleCatalogEntry finds a known type and misses an unknown one",
  () => {
    const refinery = moduleCatalogEntry("ore-refinery");
    assert(refinery);
    assertEquals(refinery.displayName, "Ore Refinery");
    assertEquals(moduleCatalogEntry("does-not-exist"), undefined);
  },
);

catalogTest(
  "moduleDisplayName turns wire keys into player-facing catalog names",
  () => {
    assertEquals(moduleDisplayName("storage-bay"), "Storage Bay");
    assertEquals(moduleDisplayName("future-module"), "future-module");
  },
);

catalogTest(
  "balance curves use independent approved cost and time tables",
  () => {
    const entry = moduleCatalogEntry("ore-refinery")!;
    assertEquals([1, 2, 3, 4, 5].map(constructionCostAtLevel), [
      25,
      38,
      57,
      86,
      129,
    ]);
    // The refinery is a half-cost entry, so its charges are the shared curve
    // halved — see the_per_entry_cost_multiplier_scales_every_material in
    // src-tauri/src/game_state/modules.rs, which pins the same numbers.
    assertEquals(costAtLevel(entry, 1), { construction: 13 });
    // Construction-only right up to the operational threshold...
    assertEquals(costAtLevel(entry, 4), { construction: 43 });
    // ...which adds the entry's operational material at half the construction.
    assertEquals(costAtLevel(entry, 5), { construction: 65, fuel: 33 });
    // High-tech joins from level 10, on top of the operational material.
    assertEquals(costAtLevel(entry, 10), {
      construction: 492,
      fuel: 246,
      highTech: 246,
    });
    // A full-price entry pays the undiscounted curve for comparison.
    const storage = moduleCatalogEntry("storage-bay")!;
    assertEquals(costAtLevel(storage, 1), { construction: 25 });
    assertEquals(costAtLevel(storage, 5), { construction: 129, fuel: 65 });
    // Cost and time are independent multipliers, so timings are unchanged.
    assertEquals(buildTimeAtLevel(entry, 1), 22_500);
    assertEquals(buildTimeAtLevel(entry, 3), 90_000);
    assertEquals(buildTimeAtLevel(entry, 11), 86_400_000);
    assert(canAffordModuleCost(
      { construction: 13, highTech: 0, biological: 0, fuel: 0, credits: 0 },
      costAtLevel(entry, 1),
    ));
    // One short on the operational side alone is still unaffordable.
    assert(
      !canAffordModuleCost(
        { construction: 65, highTech: 0, biological: 0, fuel: 32, credits: 0 },
        costAtLevel(entry, 5),
      ),
    );
  },
);

catalogTest(
  "mixed material costs accumulate per material, never overwrite",
  () => {
    // Mirrors multi_material_costs_sum_per_material_and_spend_atomically in
    // src-tauri/src/game_state/modules.rs. Neither shape is in the catalog
    // today; both are shapes it is meant to allow, and the preview has to
    // agree with the server about what they cost.
    //
    // Built on a full-price entry so these assertions isolate the per-material
    // accumulation from the per-entry cost multiplier, which has its own test.
    const base = moduleCatalogEntry("storage-bay")!;
    const both = {
      ...base,
      operationalCosts: ["biological", "fuel"] as ResourceKind[],
    };
    const dual = costAtLevel(both, 5);
    assertEquals(dual, { construction: 129, biological: 65, fuel: 65 });

    // High-tech listed operationally *and* charged universally from level 10:
    // the two sum rather than the second replacing the first.
    const techy = {
      ...base,
      operationalCosts: ["highTech"] as ResourceKind[],
    };
    assertEquals(costAtLevel(techy, 10), { construction: 984, highTech: 984 });

    // No operational materials: construction-only until the high-tech gate.
    const plain = { ...base, operationalCosts: [] as ResourceKind[] };
    assertEquals(costAtLevel(plain, 5), { construction: 129 });
  },
);

catalogTest("productionAtLevel scales every produced resource", () => {
  const command = moduleCatalogEntry(COMMAND_MODULE_TYPE)!;
  assertEquals(productionAtLevel(command, 1), {
    construction: 12,
    highTech: 12,
    biological: 12,
    fuel: 12,
  });
  // ceil(12 * 1.15) — rounded once at the end, not per level.
  assertEquals(productionAtLevel(command, 2), {
    construction: 14,
    highTech: 14,
    biological: 14,
    fuel: 14,
  });
  // A non-producing level (0) yields nothing.
  assertEquals(productionAtLevel(command, 0), {
    construction: 0,
    highTech: 0,
    biological: 0,
    fuel: 0,
  });
});

catalogTest(
  "the production curve mirrors the server's compounding sequence",
  () => {
    // Identical expectations to
    // production_follows_a_true_compounding_curve_not_a_per_level_round in
    // src-tauri/src/game_state/modules.rs. The preview is only useful if it
    // agrees exactly with what the player is actually credited, so these two
    // sequences must be changed together.
    const command = moduleCatalogEntry(COMMAND_MODULE_TYPE)!;
    const refinery = moduleCatalogEntry("ore-refinery")!;
    const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    assertEquals(
      levels.map((level) => productionAtLevel(command, level).construction),
      [12, 14, 16, 19, 21, 25, 28, 32, 37, 43],
    );
    assertEquals(
      levels.map((level) => productionAtLevel(refinery, level).construction),
      [24, 28, 32, 37, 42, 49, 56, 64, 74, 85],
    );
  },
);

catalogTest("the catalog has one entry per type with no duplicates", () => {
  const types = MODULE_CATALOG.map((e) => e.moduleType);
  assertEquals(new Set(types).size, types.length);
  assert(types.includes(COMMAND_MODULE_TYPE));
  assertEquals(maxModuleLevel(), 30);
});

catalogTest(
  "storageAtLevel exposes one module's base plus per-level capacity",
  () => {
    const command = moduleCatalogEntry(COMMAND_MODULE_TYPE)!;
    const storage = moduleCatalogEntry("storage-bay")!;
    assertEquals(storageAtLevel(command, 1), {
      construction: 1_000,
      highTech: 1_000,
      biological: 1_000,
      fuel: 1_000,
    });
    assertEquals(storageAtLevel(command, 30), storageAtLevel(command, 1));
    assertEquals(storageAtLevel(storage, 2), {
      construction: 4_000,
      highTech: 4_000,
      biological: 4_000,
      fuel: 4_000,
    });
    assertEquals(storageAtLevel(storage, 0), {});
  },
);

catalogTest(
  "storageCapsForModules sums stores by settled level, credits uncapped",
  () => {
    // No modules: zero cap on materials, credits always uncapped.
    assertEquals(storageCapsForModules([]), {
      construction: 0,
      highTech: 0,
      biological: 0,
      fuel: 0,
      credits: Infinity,
    });
    // Command baseline (1000) + a level-2 Storage Bay (2000/level) = 5000.
    const caps = storageCapsForModules([
      { moduleType: COMMAND_MODULE_TYPE, level: 1 },
      { moduleType: "storage-bay", level: 2 },
    ]);
    assertEquals(caps.construction, 5_000);
    assertEquals(caps.fuel, 5_000);
    assertEquals(caps.credits, Infinity);
    // The Command Module's storage is a flat baseline, deliberately: leveling
    // it buys progression, never capacity, so a Storage Bay stays worth
    // building at every level. A level-10 command holds exactly what a level-1
    // one does.
    assertEquals(
      storageCapsForModules([{ moduleType: COMMAND_MODULE_TYPE, level: 10 }])
        .construction,
      1_000,
    );
    // Level 0 (first build still pending) contributes nothing; producers and
    // unknown types contribute nothing.
    const pending = storageCapsForModules([
      { moduleType: "storage-bay", level: 0 },
      { moduleType: "ore-refinery", level: 3 },
      { moduleType: "not-in-catalog", level: 5 },
    ]);
    assertEquals(pending.construction, 0);
  },
);

catalogTest(
  "crew capacity and requirement sum by their catalog shapes",
  () => {
    // No modules: nothing to berth, nothing to staff.
    assertEquals(crewCapacityForModules([]), 0);
    assertEquals(crewRequiredForModules([]), 0);
    const modules = [
      // Command baseline: 2 fixed berths, no demand.
      { moduleType: COMMAND_MODULE_TYPE, level: 1 },
      // Five berths per Crew Quarters level.
      { moduleType: "crew-quarters", level: 2 },
      // Producers want 1 crew per level.
      { moduleType: "ore-refinery", level: 3 },
      { moduleType: "fusion-reactor", level: 1 },
      // Trading Post keeps its one fixed operator at every level.
      { moduleType: TRADING_POST_MODULE_TYPE, level: 5 },
      // Level 0 (first build pending) and unknown types contribute nothing.
      { moduleType: "crew-quarters", level: 0 },
      { moduleType: "not-in-catalog", level: 5 },
    ];
    assertEquals(crewCapacityForModules(modules), 2 + 10);
    assertEquals(crewRequiredForModules(modules), 3 + 1 + 1);
    // Berths follow the same rule as storage: the Command Module's two are a
    // flat baseline that never grows, so housing crew stays Crew Quarters' job.
    assertEquals(
      crewCapacityForModules([{ moduleType: COMMAND_MODULE_TYPE, level: 10 }]),
      2,
    );
    const post = moduleCatalogEntry(TRADING_POST_MODULE_TYPE)!;
    assertEquals(crewRequiredAtLevel(post, 0), 0);
    assertEquals(crewRequiredAtLevel(post, 1), 1);
    assertEquals(crewRequiredAtLevel(post, 5), 1);
  },
);

catalogTest(
  "crewScaledAmount uses each module's explicit linear assignment",
  () => {
    // Nothing wants crew: pass-through.
    assertEquals(crewScaledAmount(16, 0, 0), 16);
    // Fully staffed (or overstaffed): full output.
    assertEquals(crewScaledAmount(16, 4, 4), 16);
    assertEquals(crewScaledAmount(16, 9, 4), 16);
    // Half assigned: 16 * (2 + 1) / (4 + 1) = 9.
    assertEquals(crewScaledAmount(16, 2, 4), 9);
    // No assignment retains the 1/(level+1) baseline.
    assertEquals(crewScaledAmount(16, 0, 4), 3);
    // Integer-floored, matching the Rust u64 math.
    assertEquals(crewScaledAmount(1, 0, 4), 0);
  },
);

catalogTest(
  "Storage Bay boosts passive production by its own staffed linear bonus",
  () => {
    const storage = moduleCatalogEntry("storage-bay")!;
    assertEquals(crewRequiredAtLevel(storage, 3), 3);
    assertEquals(productionBoostPctAtLevel(storage, 0), 0);
    assertEquals(productionBoostPctAtLevel(storage, 3), 15);
    const modules = [{
      moduleId: "module-storage",
      moduleType: "storage-bay",
      level: 3,
    }];
    assertEquals(productionBoostPctForModules(modules, new Map()), 3);
    assertEquals(
      productionBoostPctForModules(
        modules,
        new Map([["module-storage", { assigned: 1 }]]),
      ),
      7,
    );
    assertEquals(
      productionBoostPctForModules(
        modules,
        new Map([["module-storage", { assigned: 3 }]]),
      ),
      15,
    );
    // Only building production calls this helper; mining has no call site.
    assertEquals(productionBoostedAmount(24, 15), 27);
  },
);

catalogTest("hireCostAt is linear in the new head count", () => {
  assertEquals(hireCostAt(0), hireCostBiological());
  assertEquals(hireCostAt(2), hireCostBiological() * 3);
});

catalogTest(
  "the Command Module is always unlocked and gates everything else",
  () => {
    const command = moduleCatalogEntry(COMMAND_MODULE_TYPE)!;
    assertEquals(command.unlockCommandLevel, 0);
    for (const entry of MODULE_CATALOG) {
      if (entry.moduleType === COMMAND_MODULE_TYPE) continue;
      // Every other type needs a real Command level; the Trading Post
      // deliberately unlocks later (ROADMAP P1.12's low-mid unlock).
      assert(entry.unlockCommandLevel >= 1);
    }
    assertEquals(
      moduleCatalogEntry(TRADING_POST_MODULE_TYPE)!.unlockCommandLevel,
      3,
    );
  },
);

// Schema-version rejection and the all-or-nothing install now live with the
// validator they belong to, in tests/balance_catalog_test.ts.
