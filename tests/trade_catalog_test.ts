import { assertEquals } from "@std/assert";

import {
  DEAL_RARITY_STYLE,
  DEAL_REFRESH_COSTS_CREDITS,
  dealRefreshCost,
  MAX_DEAL_REFRESHES_PER_DAY,
} from "../src/ship/trade-catalog.ts";
import { DealRarity } from "../src/state/game-state.ts";

Deno.test("refresh costs start free, then double per use", () => {
  assertEquals(DEAL_REFRESH_COSTS_CREDITS[0], 0);
  for (let i = 2; i < DEAL_REFRESH_COSTS_CREDITS.length; i++) {
    assertEquals(
      DEAL_REFRESH_COSTS_CREDITS[i],
      DEAL_REFRESH_COSTS_CREDITS[i - 1] * 2,
    );
  }
});

Deno.test("dealRefreshCost walks the table and nulls past the daily cap", () => {
  assertEquals(dealRefreshCost(0), 0);
  assertEquals(dealRefreshCost(1), 10);
  assertEquals(dealRefreshCost(4), 80);
  assertEquals(dealRefreshCost(MAX_DEAL_REFRESHES_PER_DAY), null);
  assertEquals(dealRefreshCost(99), null);
});

Deno.test("every rarity has display styling", () => {
  const rarities: DealRarity[] = ["common", "uncommon", "rare"];
  for (const rarity of rarities) {
    const style = DEAL_RARITY_STYLE[rarity];
    assertEquals(style.label.length > 0, true);
    assertEquals(/^#[0-9a-f]{6}$/i.test(style.colorHex), true);
  }
});
