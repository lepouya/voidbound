import {
  BalanceCatalogData,
  ModuleData,
  ResourceCounts,
  ResourceKind,
} from "../state/game-state.ts";

/**
 * Module type catalog (ROADMAP P1.4), received in the versioned authoritative
 * balance snapshot. The backend verifies and derives every result; this module
 * only renders cost badges and performs optimistic affordability previews.
 *
 * Pure module — no Excalibur/Vite imports — so it stays unit-testable under
 * Deno (see tests/module_catalog_test.ts).
 */
export interface ModuleCatalogEntry {
  /** Catalog key — the wire `moduleType` on `ModuleData` and build requests. */
  moduleType: string;
  displayName: string;
  /** Resources produced **per minute** at level 1; `productionAtLevel`
   *  applies the level curve. */
  produces: Partial<Record<ResourceKind, number>>;
  /** Storage granted once settled at any level, plus storage added per
   *  settled level: `base + perLevel * level`. */
  storesBase: Partial<Record<ResourceKind, number>>;
  storesPerLevel: Partial<Record<ResourceKind, number>>;
  /** Crew berths (ROADMAP P1.10), same base + per-level shape as stores. */
  crewCapacityBase: number;
  crewCapacityPerLevel: number;
  /** Crew wanted per settled level to run at full output (ROADMAP P1.10),
   *  summed linearly ship-wide; 0 means never damped. */
  crewRequiredPerLevel: number;
  /** Extra materials added from the operational threshold onward, each at
   *  the supplemental fraction of the construction amount. Empty means
   *  construction-only until the high-tech threshold. */
  operationalCosts: ResourceKind[];
  /** Exact multiplier over the shared construction-cost curve, reaching the
   *  supplemental materials derived from it. */
  costNumerator: number;
  costDenominator: number;
  /** Exact multiplier over the shared construction-time table. */
  buildTimeNumerator: number;
  buildTimeDenominator: number;
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

/** Loaded from the server snapshot before scene subscribers run. */
export let MODULE_CATALOG: readonly ModuleCatalogEntry[] = [];

let balanceCatalog: BalanceCatalogData | null = null;

/**
 * Install the module half of an already-validated balance payload. Call
 * `applyBalanceCatalog` (src/state/balance-catalog.ts) instead — it owns the
 * validation and installs every catalog together.
 */
export function installModuleBalance(balance: BalanceCatalogData): void {
  const entries = balance.modules.map((entry) => ({
    ...entry,
    produces: Object.fromEntries(entry.produces),
    storesBase: Object.fromEntries(entry.storesBase),
    storesPerLevel: Object.fromEntries(entry.storesPerLevel),
    operationalCosts: [...entry.operationalCosts],
  }));
  MODULE_CATALOG = entries;
  balanceCatalog = balance;
}

/** Biological-material cost of one crew hire, multiplied by the new head
 * count (linear — hiring is a repeat purchase). */
export function hireCostBiological(): number {
  return balanceCatalog?.hireCostBiological ?? 0;
}

/**
 * Recruitment time per hire, ms.
 */
export function hireTimeMs(): number {
  return balanceCatalog?.hireTimeMs ?? 0;
}

/** The server-authoritative progression ceiling for every module. */
export function maxModuleLevel(): number {
  return balanceCatalog?.maxModuleLevel ?? 0;
}

/** Biological cost of hiring one more crew member on top of `crew` heads —
 *  the linear rule the backend charges (HIRE_COST_BIOLOGICAL * new count). */
export function hireCostAt(crew: number): number {
  return hireCostBiological() * (crew + 1);
}

export function moduleCatalogEntry(
  moduleType: string,
): ModuleCatalogEntry | undefined {
  return MODULE_CATALOG.find((e) => e.moduleType === moduleType);
}

export type ModuleCost = Partial<Record<ResourceKind, number>>;

function ceilRatio(
  value: number,
  numerator: number,
  denominator: number,
): number {
  return Math.ceil((value * numerator) / denominator);
}

/** 25 construction at level 1, then rounded-up 1.5x per target level. */
export function constructionCostAtLevel(level: number): number {
  const balance = balanceCatalog;
  if (!balance) return 0;
  let amount = balance.constructionCostLevelOne;
  for (let target = 1; target < level; target++) {
    amount = ceilRatio(
      amount,
      balance.constructionCostNumerator,
      balance.constructionCostDenominator,
    );
  }
  return amount;
}

/** Display-only preview of the authoritative mixed-material module cost. */
export function costAtLevel(
  entry: ModuleCatalogEntry,
  level: number,
): ModuleCost {
  const balance = balanceCatalog;
  if (!balance) return {};
  // The entry multiplier applies to construction, and so reaches the
  // supplemental materials derived from it — mirroring `module_cost`.
  const construction = ceilRatio(
    constructionCostAtLevel(level),
    entry.costNumerator,
    entry.costDenominator,
  );
  const supplemental = ceilRatio(
    construction,
    balance.supplementalCostNumerator,
    balance.supplementalCostDenominator,
  );
  const cost: ModuleCost = {};
  // Amounts accumulate per material rather than overwriting, so a type
  // listing highTech operationally still shows the universal high-tech
  // charge on top of it — mirroring module_cost's keyed sum exactly.
  const charge = (kind: ResourceKind, amount: number) => {
    cost[kind] = (cost[kind] ?? 0) + amount;
  };
  charge("construction", construction);
  if (level >= balance.operationalCostStartLevel) {
    for (const kind of entry.operationalCosts) charge(kind, supplemental);
  }
  if (level >= balance.highTechCostStartLevel) {
    charge("highTech", supplemental);
  }
  return cost;
}

export function canAffordModuleCost(
  resources: ResourceCounts,
  cost: ModuleCost,
): boolean {
  if (!balanceCatalog) return false;
  return Object.entries(cost).every(([kind, amount]) =>
    resources[kind as ResourceKind] >= (amount ?? 0)
  );
}

/** Compact unambiguous labels for world-space cost badges. */
export function formatModuleCost(cost: ModuleCost): string {
  const labels: Record<ResourceKind, string> = {
    construction: "C",
    highTech: "H",
    biological: "B",
    fuel: "F",
    credits: "$",
  };
  return Object.entries(cost).map(([kind, amount]) =>
    `${amount}${labels[kind as ResourceKind]}`
  ).join("+");
}

export function buildTimeAtLevel(
  entry: ModuleCatalogEntry,
  level: number,
): number {
  const balance = balanceCatalog;
  if (!balance) return 0;
  const baseline = balance.baseBuildTimesMs[level - 1] ??
    balance.postLevel10BuildTimeMs;
  return ceilRatio(
    baseline,
    entry.buildTimeNumerator,
    entry.buildTimeDenominator,
  );
}

/**
 * Production per minute at a settled level: `base * 1.15^(level-1)`, rounded
 * up **once** at the end.
 *
 * Compounds in fixed point rather than rounding at every level — rounding each
 * step up on a small integer base turns "+15% per level" into "+1 per level".
 * Deliberately the same integer algorithm as `production_at_level` in
 * src-tauri/src/game_state/modules.rs, using the server's own precision
 * constant, so the preview never disagrees with what the player is credited.
 */
export function productionAtLevel(
  entry: ModuleCatalogEntry,
  level: number,
): Partial<Record<ResourceKind, number>> {
  const out: Partial<Record<ResourceKind, number>> = {};
  const balance = balanceCatalog;
  if (!balance) return out;
  for (const [kind, amount] of Object.entries(entry.produces)) {
    if (level <= 0) {
      out[kind as ResourceKind] = 0;
      continue;
    }
    let scaled = amount * balance.productionPrecision;
    for (let settled = 1; settled < level; settled++) {
      scaled = Math.floor(
        (scaled * balance.productionNumerator) / balance.productionDenominator,
      );
    }
    out[kind as ResourceKind] = Math.ceil(scaled / balance.productionPrecision);
  }
  return out;
}

/**
 * Total storage cap per resource (ROADMAP P1.11): every settled module's
 * catalog baseline plus its per-level contribution — the display preview of
 * the Rust `ServerState::storage_caps`, which is what actually clamps income.
 * A pending build/upgrade (level 0) contributes neither half until it
 * settles. Credits are trade-only and uncapped (Infinity).
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
    if (!entry || module.level < 1) continue;
    for (const [kind, base] of Object.entries(entry.storesBase)) {
      caps[kind as ResourceKind] += base;
    }
    for (const [kind, perLevel] of Object.entries(entry.storesPerLevel)) {
      caps[kind as ResourceKind] += perLevel * module.level;
    }
  }
  return caps;
}

/**
 * Total crew berths (ROADMAP P1.10): every settled module's catalog baseline
 * plus its per-level contribution — the display preview of the Rust
 * `ServerState::crew_capacity`, which is what actually verifies hires. A
 * pending build/upgrade doesn't count until it settles.
 */
export function crewCapacityForModules(
  modules: Iterable<Pick<ModuleData, "moduleType" | "level">>,
): number {
  let capacity = 0;
  for (const module of modules) {
    const entry = moduleCatalogEntry(module.moduleType);
    if (!entry || module.level < 1) continue;
    capacity += entry.crewCapacityBase +
      entry.crewCapacityPerLevel * module.level;
  }
  return capacity;
}

/**
 * Ship-wide crew demand (ROADMAP P1.10): every module's crewRequiredPerLevel
 * times its settled level, summed linearly — the display preview of the Rust
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
 * exactly 0.5 + 0.5 * ratio with a 50% floor. Display preview of the Rust
 * `crew_scaled` in src-tauri/src/game_state/modules.rs; the backend does the
 * actual damping. `required <= 0` means nothing wants crew:
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
