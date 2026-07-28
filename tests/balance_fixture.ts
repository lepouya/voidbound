import { BalanceCatalogData } from "../src/state/game-state.ts";
import { BALANCE_SCHEMA_VERSION } from "../src/state/balance-catalog.ts";

/**
 * A complete stand-in for the server's balance payload, shared by every suite
 * that needs one.
 *
 * Shared rather than copied per file because the payload is validated as a
 * whole: `applyBalanceCatalog` refuses a partial catalog, so a suite that only
 * cares about asteroid tiers still has to present valid module data. Three
 * hand-maintained partial copies were the alternative, and they would drift
 * from the wire format independently.
 *
 * Values track the real catalog closely enough that the preview assertions
 * mean something, but this is a fixture, not a mirror — tests that care about
 * a specific number state it themselves.
 */
export function sampleBalance(
  overrides: Partial<BalanceCatalogData> = {},
): BalanceCatalogData {
  return {
    schemaVersion: BALANCE_SCHEMA_VERSION,
    baseBuildTimesMs: [
      45_000,
      90_000,
      180_000,
      480_000,
      1_200_000,
      2_700_000,
      7_200_000,
      21_600_000,
      64_800_000,
      172_800_000,
    ],
    postLevel10BuildTimeMs: 172_800_000,
    constructionCostLevelOne: 25,
    constructionCostNumerator: 3,
    constructionCostDenominator: 2,
    productionNumerator: 115,
    productionDenominator: 100,
    productionPrecision: 1_000_000,
    ticksPerMinute: 12,
    operationalCostStartLevel: 5,
    highTechCostStartLevel: 10,
    maxModuleLevel: 30,
    supplementalCostNumerator: 1,
    supplementalCostDenominator: 2,
    hireCostBiological: 20,
    hireTimeMs: 300_000,
    asteroids: {
      tiers: [
        { tier: "small", span: 1, minAmount: 60, maxAmount: 240 },
        { tier: "medium", span: 2, minAmount: 240, maxAmount: 960 },
        { tier: "large", span: 3, minAmount: 960, maxAmount: 2880 },
      ],
      mineUnitsPerHour: 240,
    },
    modules: [
      {
        moduleType: "command",
        displayName: "Command Module",
        produces: [["construction", 12], ["highTech", 12], ["biological", 12], [
          "fuel",
          12,
        ]],
        // Base-only: leveling the Command Module buys progression, not
        // capacity (see MODULE_CATALOG in game_state/modules.rs).
        storesBase: [["construction", 1000], ["highTech", 1000], [
          "biological",
          1000,
        ], ["fuel", 1000]],
        storesPerLevel: [],
        crewCapacityBase: 2,
        crewCapacityPerLevel: 0,
        crewRequiredPerLevel: 0,
        operationalCosts: ["biological"],
        costNumerator: 1,
        costDenominator: 1,
        buildTimeNumerator: 1,
        buildTimeDenominator: 1,
        unlockCommandLevel: 0,
      },
      {
        moduleType: "ore-refinery",
        displayName: "Ore Refinery",
        produces: [["construction", 24]],
        storesBase: [],
        storesPerLevel: [],
        crewCapacityBase: 0,
        crewCapacityPerLevel: 0,
        crewRequiredPerLevel: 1,
        operationalCosts: ["fuel"],
        costNumerator: 1,
        costDenominator: 2,
        buildTimeNumerator: 1,
        buildTimeDenominator: 2,
        unlockCommandLevel: 1,
      },
      {
        moduleType: "fusion-reactor",
        displayName: "Fusion Reactor",
        produces: [["fuel", 24]],
        storesBase: [],
        storesPerLevel: [],
        crewCapacityBase: 0,
        crewCapacityPerLevel: 0,
        crewRequiredPerLevel: 1,
        operationalCosts: ["fuel"],
        costNumerator: 1,
        costDenominator: 2,
        buildTimeNumerator: 1,
        buildTimeDenominator: 2,
        unlockCommandLevel: 1,
      },
      {
        moduleType: "storage-bay",
        displayName: "Storage Bay",
        produces: [],
        storesBase: [],
        storesPerLevel: [["construction", 2000], ["highTech", 2000], [
          "biological",
          2000,
        ], ["fuel", 2000]],
        crewCapacityBase: 0,
        crewCapacityPerLevel: 0,
        crewRequiredPerLevel: 0,
        operationalCosts: ["fuel"],
        costNumerator: 1,
        costDenominator: 1,
        buildTimeNumerator: 1,
        buildTimeDenominator: 1,
        unlockCommandLevel: 1,
      },
      {
        moduleType: "crew-quarters",
        displayName: "Crew Quarters",
        produces: [],
        storesBase: [],
        storesPerLevel: [],
        crewCapacityBase: 0,
        crewCapacityPerLevel: 5,
        crewRequiredPerLevel: 0,
        operationalCosts: ["biological"],
        costNumerator: 1,
        costDenominator: 1,
        buildTimeNumerator: 1,
        buildTimeDenominator: 1,
        unlockCommandLevel: 1,
      },
      {
        moduleType: "trading-post",
        displayName: "Trading Post",
        produces: [],
        storesBase: [],
        storesPerLevel: [],
        crewCapacityBase: 0,
        crewCapacityPerLevel: 0,
        crewRequiredPerLevel: 1,
        operationalCosts: ["biological"],
        costNumerator: 1,
        costDenominator: 1,
        buildTimeNumerator: 1,
        buildTimeDenominator: 1,
        unlockCommandLevel: 3,
      },
    ],
    ...overrides,
  };
}
