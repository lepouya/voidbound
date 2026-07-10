import { AsteroidData, MaterialResourceKind } from "./game-state.ts";

/**
 * Asteroid tier catalog (ROADMAP P1.6) — display/UX mirror of the Rust
 * `ASTEROID_TIERS` + `MINE_UNITS_PER_HOUR` in src-tauri/src/game_state.rs —
 * keep the two in sync. The backend is what actually verifies mining and
 * derives harvests; this module only lets the map scene name asteroids,
 * tint their placeholder sprites, and show deposit/duration estimates
 * without a round-trip.
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

export const ASTEROID_TIERS: readonly AsteroidTierEntry[] = [
  { tier: "small", span: 1, minAmount: 60, maxAmount: 240 },
  { tier: "medium", span: 2, minAmount: 240, maxAmount: 960 },
  { tier: "large", span: 3, minAmount: 960, maxAmount: 2880 },
];

export function asteroidTierEntry(
  tier: string,
): AsteroidTierEntry | undefined {
  return ASTEROID_TIERS.find((t) => t.tier === tier);
}

/**
 * Mining extraction rate in resource units per hour, shared by every tier —
 * a full mine-out takes amount / rate (small 15–60 min, medium 1–4 h, large
 * 4–12 h). Stub balancing, like scaleForLevel.
 */
export const MINE_UNITS_PER_HOUR = 240;

/** How long mining the given amount takes at MINE_UNITS_PER_HOUR. */
export function mineDurationMs(amount: number): number {
  return Math.floor((amount * 3_600_000) / MINE_UNITS_PER_HOUR);
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
