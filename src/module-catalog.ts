import { ModuleData, ResourceKind } from "./game-state.ts";

/**
 * Module type catalog (ROADMAP P1.4) — display/UX mirror of the Rust
 * `MODULE_CATALOG` in src-tauri/src/game_state/modules.rs — keep the two in
 * sync. The backend is what actually verifies and derives cost/time/production;
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
  /** Crew berths contributed per settled level (ROADMAP P1.10) — summed
   *  linearly (level * this), not scaleForLevel: capacity is a head count,
   *  not a production curve. */
  crewCapacityPerLevel: number;
  /** Crew wanted per settled level to run at full output (ROADMAP P1.10),
   *  summed linearly ship-wide; 0 means never damped. */
  crewRequiredPerLevel: number;
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

/** Catalog key of the Crew Quarters (ROADMAP P1.10) — hosts the Hire Crew
 *  button alongside the Command Module. */
export const CREW_QUARTERS_MODULE_TYPE = "crew-quarters";

/** Catalog key of the Trading Post (ROADMAP P1.12) — a settled one hosts the
 *  Trade button that opens the deal-shop dialog. */
export const TRADING_POST_MODULE_TYPE = "trading-post";

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
    crewCapacityPerLevel: 2,
    crewRequiredPerLevel: 0,
    baseCostConstruction: 20,
    baseBuildTimeMs: 30_000,
    unlockCommandLevel: 0,
  },
  {
    moduleType: "ore-refinery",
    displayName: "Ore Refinery",
    produces: { construction: 2 },
    stores: {},
    crewCapacityPerLevel: 0,
    crewRequiredPerLevel: 1,
    baseCostConstruction: 10,
    baseBuildTimeMs: 15_000,
    unlockCommandLevel: 1,
  },
  {
    moduleType: "electronics-fabricator",
    displayName: "Electronics Fabricator",
    produces: { highTech: 2 },
    stores: {},
    crewCapacityPerLevel: 0,
    crewRequiredPerLevel: 1,
    baseCostConstruction: 10,
    baseBuildTimeMs: 15_000,
    unlockCommandLevel: 1,
  },
  {
    moduleType: "hydroponics-bay",
    displayName: "Hydroponics Bay",
    produces: { biological: 2 },
    stores: {},
    crewCapacityPerLevel: 0,
    crewRequiredPerLevel: 1,
    baseCostConstruction: 10,
    baseBuildTimeMs: 15_000,
    unlockCommandLevel: 1,
  },
  {
    moduleType: "fusion-reactor",
    displayName: "Fusion Reactor",
    produces: { fuel: 2 },
    stores: {},
    crewCapacityPerLevel: 0,
    crewRequiredPerLevel: 1,
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
    crewCapacityPerLevel: 0,
    crewRequiredPerLevel: 0,
    baseCostConstruction: 15,
    baseBuildTimeMs: 20_000,
    unlockCommandLevel: 1,
  },
  {
    moduleType: CREW_QUARTERS_MODULE_TYPE,
    displayName: "Crew Quarters",
    produces: {},
    stores: {},
    crewCapacityPerLevel: 1,
    crewRequiredPerLevel: 0,
    baseCostConstruction: 15,
    baseBuildTimeMs: 20_000,
    unlockCommandLevel: 1,
  },
  {
    moduleType: TRADING_POST_MODULE_TYPE,
    displayName: "Trading Post",
    // No production or storage — its function is the deal shop (ROADMAP
    // P1.12); leveling it adds deal slots instead.
    produces: {},
    stores: {},
    crewCapacityPerLevel: 0,
    crewRequiredPerLevel: 1,
    baseCostConstruction: 15,
    baseBuildTimeMs: 20_000,
    // Low-mid unlock; the exact level is a balancing stub → P2.6.
    unlockCommandLevel: 2,
  },
];

/**
 * Biological-material cost of one crew hire, multiplied by the new head
 * count (linear — hiring is a repeat purchase). Display mirror of the Rust
 * HIRE_COST_BIOLOGICAL in src-tauri/src/game_state/crew.rs — keep the two in
 * sync; the backend does the actual verification. Balancing stub → P2.6.
 */
export const HIRE_COST_BIOLOGICAL = 20;

/**
 * Recruitment time per hire, ms. Display mirror of the Rust HIRE_TIME_MS in
 * src-tauri/src/game_state/crew.rs — keep the two in sync. Balancing stub → P2.6.
 */
export const HIRE_TIME_MS = 30_000;

/** Biological cost of hiring one more crew member on top of `crew` heads —
 *  the linear rule the backend charges (HIRE_COST_BIOLOGICAL * new count). */
export function hireCostAt(crew: number): number {
  return HIRE_COST_BIOLOGICAL * (crew + 1);
}

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

/**
 * Total crew berths (ROADMAP P1.10): every module's crewCapacityPerLevel
 * times its settled level, summed linearly — the display mirror of the Rust
 * `ServerState::crew_capacity`, which is what actually verifies hires. A
 * pending build/upgrade doesn't count until it settles.
 */
export function crewCapacityForModules(
  modules: Iterable<Pick<ModuleData, "moduleType" | "level">>,
): number {
  let capacity = 0;
  for (const module of modules) {
    const entry = moduleCatalogEntry(module.moduleType);
    if (!entry) continue;
    capacity += entry.crewCapacityPerLevel * module.level;
  }
  return capacity;
}

/**
 * Ship-wide crew demand (ROADMAP P1.10): every module's crewRequiredPerLevel
 * times its settled level, summed linearly — the display mirror of the Rust
 * `ServerState::crew_required`.
 */
export function crewRequiredForModules(
  modules: Iterable<Pick<ModuleData, "moduleType" | "level">>,
): number {
  let required = 0;
  for (const module of modules) {
    const entry = moduleCatalogEntry(module.moduleType);
    if (!entry) continue;
    required += entry.crewRequiredPerLevel * module.level;
  }
  return required;
}

/**
 * Damp a production amount by the pooled crew staffing ratio (ROADMAP
 * P1.10): amount * (required + staffed) / (2 * required), integer-floored —
 * exactly 0.5 + 0.5 * ratio with a 50% floor. Display mirror of the Rust
 * `crew_scaled` in src-tauri/src/game_state/modules.rs — keep the two in sync; the
 * backend does the actual damping. `required <= 0` means nothing wants crew:
 * no damping.
 */
export function crewScaledAmount(
  amount: number,
  crew: number,
  required: number,
): number {
  if (required <= 0) return amount;
  const staffed = Math.min(crew, required);
  return Math.floor((amount * (required + staffed)) / (2 * required));
}
