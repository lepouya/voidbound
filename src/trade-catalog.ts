import { DealRarity } from "./game-state.ts";

/**
 * Trading Post display mirror (ROADMAP P1.12) — the UX half of the deal
 * constants in src-tauri/src/game_state.rs. The backend is what actually
 * generates deals, verifies acceptance, and charges refreshes; this module
 * only lets the shop dialog show price tags and rarity styling without a
 * round-trip. Deal sizing itself (give base, cap fraction, freebie band) has
 * no mirror: amounts arrive on the wire, the client never derives them.
 *
 * Pure module — no Excalibur/Vite imports — so it stays unit-testable under
 * Deno (see tests/trade_catalog_test.ts).
 */

/**
 * Credits cost of each deal refresh within a day, indexed by refreshes
 * already used: the first is free, then doubling, hard-capped at the array
 * length. Display mirror of the Rust DEAL_REFRESH_COSTS_CREDITS in
 * src-tauri/src/game_state.rs — keep the two in sync. Balancing stub → P2.5.
 */
export const DEAL_REFRESH_COSTS_CREDITS: readonly number[] = [
  0,
  10,
  20,
  40,
  80,
];

/** Hard cap on refreshes per day — the cost table's length. */
export const MAX_DEAL_REFRESHES_PER_DAY = DEAL_REFRESH_COSTS_CREDITS.length;

/**
 * Credits cost of the next refresh after `refreshesUsed` uses today, or null
 * when the daily cap is spent — drives the Refresh button's price tag and
 * disabled state (the backend re-verifies on request).
 */
export function dealRefreshCost(refreshesUsed: number): number | null {
  return DEAL_REFRESH_COSTS_CREDITS[refreshesUsed] ?? null;
}

/**
 * Rarity styling for deal rows: display name plus a label tint (hex, so this
 * module stays free of runtime imports — scenes convert via ex.Color).
 * The get-side bonus each rarity applied is server-side only (DEAL_RARITIES
 * in game_state.rs); the client shows the rolled amounts, not the math.
 */
export const DEAL_RARITY_STYLE: Record<
  DealRarity,
  { label: string; colorHex: string }
> = {
  common: { label: "Common", colorHex: "#c2ccd6" },
  uncommon: { label: "Uncommon", colorHex: "#00d2ff" },
  rare: { label: "Rare", colorHex: "#ffcc4d" },
};
