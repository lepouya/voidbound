import { ModuleData, ResourceKind } from "./game-state.ts";

/**
 * Module type catalog (ROADMAP P1.4) — display/UX mirror of the Rust
 * `MODULE_CATALOG` in src-tauri/src/game_state.rs — keep the two in sync.
 * The backend is what actually verifies and derives cost/time/production;
 * this module only lets buttons show cost badges and pre-check affordability
 * without a round-trip.
 *
 * Pure module — no Excalibur/Vite imports — so it stays unit-testable under
 * Deno (see tests/module_catalog_test.ts).
 */
export interface ModuleCatalogEntry {
  /** Catalog key — the wire `moduleType` on `ModuleData` and build requests. */
  moduleType: string;
  displayName: string;
  /** Resources produced per production tick at level 1; doubles per level
   *  thereafter (see scaleForLevel). */
  produces: Partial<Record<ResourceKind, number>>;
  /** Storage capacity contributed per resource at level 1 (ROADMAP P1.11);
   *  doubles per level thereafter. Income past a resource's total cap is
   *  lost — the backend clamps; this mirror only drives the cap display. */
  stores: Partial<Record<ResourceKind, number>>;
  /** Construction-material cost to build (or level up to) level 1; doubles
   *  per level thereafter. Every module cost is stubbed as construction-only
   *  for now — fine-tuned to a real per-resource mix later. */
  baseCostConstruction: number;
  /** Build/level-up time in ms at level 1; doubles per level thereafter. */
  baseBuildTimeMs: number;
  /** Minimum Command Module level required before this type can be built. */
  unlockCommandLevel: number;
}

/** Catalog key of the Command Module — a catalog entry like every other
 *  type (formalized per ROADMAP P1.4), just pre-built at game start instead
 *  of player-constructed. Its level gates every other type's unlock and
 *  level cap (README § Ship design). */
export const COMMAND_MODULE_TYPE = "command";

export const MODULE_CATALOG: readonly ModuleCatalogEntry[] = [
  {
    moduleType: COMMAND_MODULE_TYPE,
    displayName: "Command Module",
    produces: { construction: 1, highTech: 1, biological: 1, fuel: 1 },
    // Baseline storage, mirroring the baseline production: the player
    // always has some cap even with no Storage Bay built.
    stores: {
      construction: 1_000,
      highTech: 1_000,
      biological: 1_000,
      fuel: 1_000,
    },
    baseCostConstruction: 20,
    baseBuildTimeMs: 30_000,
    unlockCommandLevel: 0,
  },
  {
    moduleType: "ore-refinery",
    displayName: "Ore Refinery",
    produces: { construction: 2 },
    stores: {},
    baseCostConstruction: 10,
    baseBuildTimeMs: 15_000,
    unlockCommandLevel: 1,
  },
  {
    moduleType: "electronics-fabricator",
    displayName: "Electronics Fabricator",
    produces: { highTech: 2 },
    stores: {},
    baseCostConstruction: 10,
    baseBuildTimeMs: 15_000,
    unlockCommandLevel: 1,
  },
  {
    moduleType: "hydroponics-bay",
    displayName: "Hydroponics Bay",
    produces: { biological: 2 },
    stores: {},
    baseCostConstruction: 10,
    baseBuildTimeMs: 15_000,
    unlockCommandLevel: 1,
  },
  {
    moduleType: "fusion-reactor",
    displayName: "Fusion Reactor",
    produces: { fuel: 2 },
    stores: {},
    baseCostConstruction: 10,
    baseBuildTimeMs: 15_000,
    unlockCommandLevel: 1,
  },
  {
    moduleType: "storage-bay",
    displayName: "Storage Bay",
    produces: {},
    stores: {
      construction: 2_000,
      highTech: 2_000,
      biological: 2_000,
      fuel: 2_000,
    },
    baseCostConstruction: 15,
    baseBuildTimeMs: 20_000,
    unlockCommandLevel: 1,
  },
];

export function moduleCatalogEntry(
  moduleType: string,
): ModuleCatalogEntry | undefined {
  return MODULE_CATALOG.find((e) => e.moduleType === moduleType);
}

/**
 * Doubles `base` for every level above 1 — the stub scaling rule shared by
 * cost, build time, and production until real balancing lands (ROADMAP
 * P1.4). Level 0 (not yet built) scales to 0.
 */
export function scaleForLevel(base: number, level: number): number {
  return level <= 0 ? 0 : base * 2 ** (level - 1);
}

export function costAtLevel(entry: ModuleCatalogEntry, level: number): number {
  return scaleForLevel(entry.baseCostConstruction, level);
}

export function buildTimeAtLevel(
  entry: ModuleCatalogEntry,
  level: number,
): number {
  return scaleForLevel(entry.baseBuildTimeMs, level);
}

export function productionAtLevel(
  entry: ModuleCatalogEntry,
  level: number,
): Partial<Record<ResourceKind, number>> {
  const out: Partial<Record<ResourceKind, number>> = {};
  for (const [kind, amount] of Object.entries(entry.produces)) {
    out[kind as ResourceKind] = scaleForLevel(amount, level);
  }
  return out;
}

/**
 * Total storage cap per resource (ROADMAP P1.11): the sum of every module's
 * catalog `stores` contribution scaled by its settled level — the display
 * mirror of the Rust `ServerState::storage_caps`, which is what actually
 * clamps income. A pending build/upgrade doesn't count until it settles.
 * Credits are trade-only and uncapped (Infinity).
 */
export function storageCapsForModules(
  modules: Iterable<Pick<ModuleData, "moduleType" | "level">>,
): Record<ResourceKind, number> {
  const caps: Record<ResourceKind, number> = {
    construction: 0,
    highTech: 0,
    biological: 0,
    fuel: 0,
    credits: Infinity,
  };
  for (const module of modules) {
    const entry = moduleCatalogEntry(module.moduleType);
    if (!entry) continue;
    for (const [kind, base] of Object.entries(entry.stores)) {
      caps[kind as ResourceKind] += scaleForLevel(base, module.level);
    }
  }
  return caps;
}
