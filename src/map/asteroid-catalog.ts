import {
  AsteroidData,
  BalanceCatalogData,
  MaterialResourceKind,
} from "../state/game-state.ts";

/**
 * Asteroid tier catalog (ROADMAP P1.6), received in the versioned authoritative
 * balance snapshot. The backend verifies mining and derives harvests; this
 * module only renders names, placeholder tints, and duration estimates.
 *
 * Pure module — no Excalibur/Vite imports — so it stays unit-testable under
 * Deno (see tests/asteroid_catalog_test.ts).
 */
export interface AsteroidTierEntry {
  /** Wire key — the `tier` string on `AsteroidData`. */
  tier: string;
  /** Footprint size in tiles (span*span). */
  span: number;
  /** Inclusive resource-amount band; with MINE_UNITS_PER_HOUR this bounds
   *  the full-mine duration per tier. */
  minAmount: number;
  maxAmount: number;
}

export let ASTEROID_TIERS: readonly AsteroidTierEntry[] = [];

let mineUnitsPerHour: number | null = null;

/**
 * Install the asteroid half of an already-validated balance payload. Call
 * `applyBalanceCatalog` (src/state/balance-catalog.ts) instead — it owns the
 * validation and installs every catalog together.
 */
export function installAsteroidBalance(balance: BalanceCatalogData): void {
  ASTEROID_TIERS = balance.asteroids.tiers.map((tier) => ({ ...tier }));
  mineUnitsPerHour = balance.asteroids.mineUnitsPerHour;
}

export function asteroidTierEntry(
  tier: string,
): AsteroidTierEntry | undefined {
  return ASTEROID_TIERS.find((t) => t.tier === tier);
}

/**
 * Mining extraction rate in resource units per hour, shared by every tier —
 * a full mine-out takes amount / rate (small 15–60 min, medium 1–4 h, large
 * 4–12 h at grade 1; deeper radial grades multiply the server-seeded deposit.
 */
/** How long mining the given amount takes at MINE_UNITS_PER_HOUR. */
export function mineDurationMs(amount: number): number {
  if (!mineUnitsPerHour) return 0;
  return Math.floor((amount * 3_600_000) / mineUnitsPerHour);
}

/**
 * Asteroid class per yielded resource (README § Design principles: rocky or
 * iron-rich → construction, rare → high-tech, icy → biological, plus a
 * methane-ice class for fuel).
 */
export const ASTEROID_CLASS_NAMES: Record<MaterialResourceKind, string> = {
  construction: "Rocky",
  highTech: "Metallic",
  biological: "Icy",
  fuel: "Carbonaceous",
};

/** Display name for an asteroid, e.g. "Small Rocky Asteroid". */
export function asteroidDisplayName(
  asteroid: Pick<AsteroidData, "tier" | "resource">,
): string {
  const tier = asteroid.tier.charAt(0).toUpperCase() + asteroid.tier.slice(1);
  return `${tier} ${ASTEROID_CLASS_NAMES[asteroid.resource]} Asteroid`;
}

/**
 * Tint applied to the grayscale placeholder asteroid sprites so the yielded
 * resource is tellable at map zoom — matches the per-resource icon accents
 * in art/gen_ui.sh (the high-tech accent is the shared default one). Real
 * per-class art replaces this eventually.
 */
export const ASTEROID_TINTS: Record<MaterialResourceKind, string> = {
  construction: "#ff9d45",
  highTech: "#00d2ff",
  biological: "#54e05e",
  fuel: "#ff5470",
};
