import { ResourceKind } from "./game-state.ts";

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
    baseCostConstruction: 20,
    baseBuildTimeMs: 30_000,
    unlockCommandLevel: 0,
  },
  {
    moduleType: "ore-refinery",
    displayName: "Ore Refinery",
    produces: { construction: 2 },
    baseCostConstruction: 10,
    baseBuildTimeMs: 15_000,
    unlockCommandLevel: 1,
  },
  {
    moduleType: "electronics-fabricator",
    displayName: "Electronics Fabricator",
    produces: { highTech: 2 },
    baseCostConstruction: 10,
    baseBuildTimeMs: 15_000,
    unlockCommandLevel: 1,
  },
  {
    moduleType: "hydroponics-bay",
    displayName: "Hydroponics Bay",
    produces: { biological: 2 },
    baseCostConstruction: 10,
    baseBuildTimeMs: 15_000,
    unlockCommandLevel: 1,
  },
  {
    moduleType: "fusion-reactor",
    displayName: "Fusion Reactor",
    produces: { fuel: 2 },
    baseCostConstruction: 10,
    baseBuildTimeMs: 15_000,
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
