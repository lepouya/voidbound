import { BalanceCatalogData } from "./game-state-types.ts";
import { installModuleBalance } from "../ship/module-catalog.ts";
import { installAsteroidBalance } from "../map/asteroid-catalog.ts";

/**
 * The balance catalog's wire contract (ROADMAP P2.6): one validator and one
 * apply for the whole payload.
 *
 * The payload spans domains — module catalog, crew, asteroid tiers — because
 * it is one message, so the checking lives here rather than inside any one
 * consumer. Previously module-catalog.ts validated the asteroid tiers while
 * asteroid-catalog.ts installed them behind a second copy of the version
 * check, and the loader had to call both in the right order to get either
 * right.
 *
 * Validation is deliberately strict and total: the client computes every
 * cost, duration, and production preview from these numbers and carries no
 * fallbacks, so a malformed payload must be refused outright rather than
 * partially installed. Nothing is installed until the whole payload passes —
 * an invalid catalog leaves the previous one in place.
 */

/**
 * Wire format this client understands. A mismatch is refused rather than
 * guessed at: an out-of-date client would render wrong numbers, which is
 * worse than saying it cannot render them (surfaced as the `incompatible`
 * LoadFailureKind). Bump in step with `BALANCE_SCHEMA_VERSION` in
 * src-tauri/src/game_state/balance.rs.
 */
export const BALANCE_SCHEMA_VERSION = 4;

const MATERIAL_KINDS = new Set([
  "construction",
  "highTech",
  "biological",
  "fuel",
]);

function positiveInteger(value: unknown, field: string): void {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`invalid balance catalog ${field}`);
  }
}

function nonNegativeInteger(value: unknown, field: string): void {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`invalid balance catalog ${field}`);
  }
}

function materialSlots(
  value: unknown,
  field: string,
): void {
  if (!Array.isArray(value)) {
    throw new Error(`invalid balance catalog ${field}`);
  }
  const kinds = new Set<string>();
  for (const [index, slot] of value.entries()) {
    if (!Array.isArray(slot) || slot.length !== 2) {
      throw new Error(`invalid balance catalog ${field}[${index}]`);
    }
    const [kind, amount] = slot;
    if (
      typeof kind !== "string" || !MATERIAL_KINDS.has(kind) || kinds.has(kind)
    ) {
      throw new Error(`invalid balance catalog ${field}[${index}] material`);
    }
    kinds.add(kind);
    positiveInteger(amount, `${field}[${index}] amount`);
  }
}

function operationalMaterials(value: unknown, field: string): void {
  if (!Array.isArray(value)) {
    throw new Error(`invalid balance catalog ${field}`);
  }
  const kinds = new Set<string>();
  for (const [index, kind] of value.entries()) {
    if (
      typeof kind !== "string" || !MATERIAL_KINDS.has(kind) || kinds.has(kind)
    ) {
      throw new Error(`invalid balance catalog ${field}[${index}]`);
    }
    kinds.add(kind);
  }
}

/** Reject malformed or incompatible data before any of it is installed. */
export function validateBalanceCatalog(balance: BalanceCatalogData): void {
  if (balance.schemaVersion !== BALANCE_SCHEMA_VERSION) {
    throw new Error(`unsupported balance catalog ${balance.schemaVersion}`);
  }
  if (!Array.isArray(balance.modules) || balance.modules.length === 0) {
    throw new Error("invalid balance catalog modules");
  }
  if (
    !Array.isArray(balance.baseBuildTimesMs) ||
    balance.baseBuildTimesMs.length !== 10
  ) {
    throw new Error("invalid balance catalog baseBuildTimesMs");
  }
  for (const [index, time] of balance.baseBuildTimesMs.entries()) {
    positiveInteger(time, `baseBuildTimesMs[${index}]`);
  }
  for (
    const [field, value] of Object.entries({
      postLevel10BuildTimeMs: balance.postLevel10BuildTimeMs,
      constructionCostLevelOne: balance.constructionCostLevelOne,
      constructionCostNumerator: balance.constructionCostNumerator,
      constructionCostDenominator: balance.constructionCostDenominator,
      productionNumerator: balance.productionNumerator,
      productionDenominator: balance.productionDenominator,
      productionPrecision: balance.productionPrecision,
      ticksPerMinute: balance.ticksPerMinute,
      operationalCostStartLevel: balance.operationalCostStartLevel,
      highTechCostStartLevel: balance.highTechCostStartLevel,
      maxModuleLevel: balance.maxModuleLevel,
      supplementalCostNumerator: balance.supplementalCostNumerator,
      supplementalCostDenominator: balance.supplementalCostDenominator,
      hireCostBiological: balance.hireCostBiological,
      hireTimeMs: balance.hireTimeMs,
      mineUnitsPerHour: balance.asteroids?.mineUnitsPerHour,
    })
  ) positiveInteger(value, field);
  if (balance.operationalCostStartLevel > balance.highTechCostStartLevel) {
    throw new Error("invalid balance catalog cost threshold order");
  }
  if (
    !Array.isArray(balance.asteroids?.tiers) ||
    balance.asteroids.tiers.length === 0
  ) {
    throw new Error("invalid balance catalog asteroids.tiers");
  }
  const moduleTypes = new Set<string>();
  for (const module of balance.modules) {
    if (
      !module || typeof module.moduleType !== "string" ||
      module.moduleType.length === 0 || moduleTypes.has(module.moduleType)
    ) {
      throw new Error("invalid balance catalog moduleType");
    }
    moduleTypes.add(module.moduleType);
    if (
      typeof module.displayName !== "string" || module.displayName.length === 0
    ) {
      throw new Error(
        `invalid balance catalog ${module.moduleType}.displayName`,
      );
    }
    materialSlots(module.produces, `${module.moduleType}.produces`);
    materialSlots(module.storesBase, `${module.moduleType}.storesBase`);
    materialSlots(module.storesPerLevel, `${module.moduleType}.storesPerLevel`);
    positiveInteger(module.costNumerator, `${module.moduleType}.costNumerator`);
    positiveInteger(
      module.costDenominator,
      `${module.moduleType}.costDenominator`,
    );
    positiveInteger(
      module.buildTimeNumerator,
      `${module.moduleType}.buildTimeNumerator`,
    );
    positiveInteger(
      module.buildTimeDenominator,
      `${module.moduleType}.buildTimeDenominator`,
    );
    nonNegativeInteger(
      module.crewCapacityBase,
      `${module.moduleType}.crewCapacityBase`,
    );
    nonNegativeInteger(
      module.crewCapacityPerLevel,
      `${module.moduleType}.crewCapacityPerLevel`,
    );
    nonNegativeInteger(
      module.crewRequiredBase,
      `${module.moduleType}.crewRequiredBase`,
    );
    nonNegativeInteger(
      module.crewRequiredPerLevel,
      `${module.moduleType}.crewRequiredPerLevel`,
    );
    nonNegativeInteger(
      module.unlockCommandLevel,
      `${module.moduleType}.unlockCommandLevel`,
    );
    operationalMaterials(
      module.operationalCosts,
      `${module.moduleType}.operationalCosts`,
    );
  }
  const asteroidTiers = new Set<string>();
  for (const tier of balance.asteroids.tiers) {
    if (!tier.tier || asteroidTiers.has(tier.tier)) {
      throw new Error("invalid balance catalog asteroid tier");
    }
    asteroidTiers.add(tier.tier);
    positiveInteger(tier.span, `${tier.tier}.span`);
    positiveInteger(tier.minAmount, `${tier.tier}.minAmount`);
    positiveInteger(tier.maxAmount, `${tier.tier}.maxAmount`);
    if (tier.minAmount > tier.maxAmount) {
      throw new Error(`invalid balance catalog ${tier.tier} amount range`);
    }
  }
}

/**
 * Validate the server's balance payload and install it into every display
 * catalog. Throws on a malformed or incompatible payload without installing
 * anything, so a rejected catalog can never leave half the client rendering
 * new numbers and half rendering old ones.
 */
export function applyBalanceCatalog(balance: BalanceCatalogData): void {
  validateBalanceCatalog(balance);
  installModuleBalance(balance);
  installAsteroidBalance(balance);
}
