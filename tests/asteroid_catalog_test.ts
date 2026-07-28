import { assert, assertEquals } from "@std/assert";

import {
  ASTEROID_CLASS_NAMES,
  ASTEROID_TIERS,
  ASTEROID_TINTS,
  asteroidDisplayName,
  asteroidTierEntry,
  mineDurationMs,
} from "../src/map/asteroid-catalog.ts";
import { applyBalanceCatalog } from "../src/state/balance-catalog.ts";
import { sampleBalance } from "./balance_fixture.ts";
import {
  MaterialResourceKind,
  RESOURCE_KINDS,
} from "../src/state/game-state.ts";

const MINUTE_MS = 60_000;

const ASTEROID_BALANCE = sampleBalance();

/** Installed per test, not at import — see catalogTest in
 *  tests/module_catalog_test.ts for why. */
function catalogTest(name: string, fn: () => void): void {
  Deno.test(name, () => {
    applyBalanceCatalog(ASTEROID_BALANCE);
    fn();
  });
}

catalogTest(
  "tier amount bands give the designed full-mine duration bands",
  () => {
    // README P1.6 design: small 15–60 min, medium 1–4 h, large 4–12 h.
    const expected: Record<string, [number, number]> = {
      small: [15 * MINUTE_MS, 60 * MINUTE_MS],
      medium: [60 * MINUTE_MS, 240 * MINUTE_MS],
      large: [240 * MINUTE_MS, 720 * MINUTE_MS],
    };
    assertEquals(ASTEROID_TIERS.length, 3);
    for (const tier of ASTEROID_TIERS) {
      const [min, max] = expected[tier.tier];
      assertEquals(mineDurationMs(tier.minAmount), min, tier.tier);
      assertEquals(mineDurationMs(tier.maxAmount), max, tier.tier);
    }
  },
);

catalogTest(
  "tiers are keyed by name with growing footprints and deposits",
  () => {
    assertEquals(asteroidTierEntry("small")?.span, 1);
    assertEquals(asteroidTierEntry("medium")?.span, 2);
    assertEquals(asteroidTierEntry("large")?.span, 3);
    assertEquals(asteroidTierEntry("planetoid"), undefined);
    for (let i = 1; i < ASTEROID_TIERS.length; i++) {
      assert(ASTEROID_TIERS[i].minAmount >= ASTEROID_TIERS[i - 1].maxAmount);
    }
  },
);

catalogTest("every material resource has a class name and a tint", () => {
  const materials = RESOURCE_KINDS.filter(
    (k): k is MaterialResourceKind => k !== "credits",
  );
  assertEquals(materials.length, 4);
  for (const kind of materials) {
    assert(ASTEROID_CLASS_NAMES[kind]);
    assert(/^#[0-9a-f]{6}$/i.test(ASTEROID_TINTS[kind]));
  }
});

catalogTest("asteroidDisplayName composes tier and class", () => {
  assertEquals(
    asteroidDisplayName({ tier: "small", resource: "construction" }),
    "Small Rocky Asteroid",
  );
  assertEquals(
    asteroidDisplayName({ tier: "large", resource: "highTech" }),
    "Large Metallic Asteroid",
  );
});
