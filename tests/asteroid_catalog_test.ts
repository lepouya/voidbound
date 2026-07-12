import { assert, assertEquals } from "@std/assert";

import {
  ASTEROID_CLASS_NAMES,
  ASTEROID_TIERS,
  ASTEROID_TINTS,
  asteroidDisplayName,
  asteroidTierEntry,
  mineDurationMs,
} from "../src/asteroid-catalog.ts";
import { MaterialResourceKind, RESOURCE_KINDS } from "../src/game-state.ts";

const MINUTE_MS = 60_000;

Deno.test("tier amount bands give the designed full-mine duration bands", () => {
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
});

Deno.test("tiers are keyed by name with growing footprints and deposits", () => {
  assertEquals(asteroidTierEntry("small")?.span, 1);
  assertEquals(asteroidTierEntry("medium")?.span, 2);
  assertEquals(asteroidTierEntry("large")?.span, 3);
  assertEquals(asteroidTierEntry("planetoid"), undefined);
  for (let i = 1; i < ASTEROID_TIERS.length; i++) {
    assert(ASTEROID_TIERS[i].minAmount >= ASTEROID_TIERS[i - 1].maxAmount);
  }
});

Deno.test("every material resource has a class name and a tint", () => {
  const materials = RESOURCE_KINDS.filter(
    (k): k is MaterialResourceKind => k !== "credits",
  );
  assertEquals(materials.length, 4);
  for (const kind of materials) {
    assert(ASTEROID_CLASS_NAMES[kind]);
    assert(/^#[0-9a-f]{6}$/i.test(ASTEROID_TINTS[kind]));
  }
});

Deno.test("asteroidDisplayName composes tier and class", () => {
  assertEquals(
    asteroidDisplayName({ tier: "small", resource: "construction" }),
    "Small Rocky Asteroid",
  );
  assertEquals(
    asteroidDisplayName({ tier: "large", resource: "highTech" }),
    "Large Metallic Asteroid",
  );
});
