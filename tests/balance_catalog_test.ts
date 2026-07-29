import { assertEquals, assertThrows } from "@std/assert";

import {
  applyBalanceCatalog,
  BALANCE_SCHEMA_VERSION,
} from "../src/state/balance-catalog.ts";
import { moduleCatalogEntry } from "../src/ship/module-catalog.ts";
import { asteroidTierEntry } from "../src/map/asteroid-catalog.ts";
import { sampleBalance } from "./balance_fixture.ts";

/**
 * The balance payload is validated and installed as one unit (ROADMAP P2.6
 * review, R4). Before that, module-catalog.ts validated the asteroid tiers
 * while asteroid-catalog.ts installed them behind a second copy of the
 * version check, and the loader had to call both in the right order.
 */

Deno.test("a valid payload installs every catalog at once", () => {
  applyBalanceCatalog(sampleBalance());
  assertEquals(moduleCatalogEntry("ore-refinery")?.displayName, "Ore Refinery");
  assertEquals(asteroidTierEntry("large")?.span, 3);
});

Deno.test("a rejected payload installs nothing at all", () => {
  applyBalanceCatalog(sampleBalance());

  // Malformed on the *asteroid* side alone. The module half is perfectly
  // valid, so a validator that ran per catalog could install it and leave
  // the client rendering new module numbers against old asteroid ones.
  assertThrows(
    () =>
      applyBalanceCatalog(sampleBalance({
        modules: sampleBalance().modules.map((m) => ({
          ...m,
          displayName: `${m.displayName} v2`,
        })),
        asteroids: {
          tiers: [{ tier: "small", span: 0, minAmount: 60, maxAmount: 240 }],
          mineUnitsPerHour: 240,
        },
      })),
    Error,
    "invalid balance catalog small.span",
  );
  assertEquals(moduleCatalogEntry("ore-refinery")?.displayName, "Ore Refinery");

  // ...and the same the other way round.
  assertThrows(
    () =>
      applyBalanceCatalog(sampleBalance({
        modules: sampleBalance().modules.map((m) => ({
          ...m,
          costDenominator: 0,
        })),
        asteroids: {
          tiers: [{ tier: "tiny", span: 1, minAmount: 1, maxAmount: 2 }],
          mineUnitsPerHour: 240,
        },
      })),
    Error,
    "invalid balance catalog command.costDenominator",
  );
  assertEquals(asteroidTierEntry("large")?.span, 3);
  assertEquals(asteroidTierEntry("tiny"), undefined);
});

Deno.test("an unrecognized schema version is refused outright", () => {
  // No retry fixes this one — it means the client is out of date, which the
  // loader surfaces as the `incompatible` failure kind.
  assertThrows(
    () => applyBalanceCatalog(sampleBalance({ schemaVersion: 999 })),
    Error,
    "unsupported balance catalog 999",
  );
  assertEquals(
    sampleBalance().schemaVersion,
    BALANCE_SCHEMA_VERSION,
  );
});

Deno.test("a non-positive module level cap is rejected", () => {
  assertThrows(
    () => applyBalanceCatalog(sampleBalance({ maxModuleLevel: 0 })),
    Error,
    "invalid balance catalog maxModuleLevel",
  );
});

Deno.test("duplicate keys are rejected on both sides of the payload", () => {
  const base = sampleBalance();
  assertThrows(
    () =>
      applyBalanceCatalog(sampleBalance({
        modules: [base.modules[0], base.modules[0]],
      })),
    Error,
    "invalid balance catalog moduleType",
  );
  assertThrows(
    () =>
      applyBalanceCatalog(sampleBalance({
        asteroids: {
          tiers: [base.asteroids.tiers[0], base.asteroids.tiers[0]],
          mineUnitsPerHour: 240,
        },
      })),
    Error,
    "invalid balance catalog asteroid tier",
  );
});

Deno.test("nested catalog data is validated before either display catalog changes", () => {
  applyBalanceCatalog(sampleBalance());
  const base = sampleBalance();

  assertThrows(
    () => {
      const invalid = sampleBalance({
        modules: base.modules.map((module) => ({ ...module })),
      });
      invalid.modules[0].produces = [
        ["construction", 12],
        ["construction", 12],
      ];
      applyBalanceCatalog(invalid);
    },
    Error,
    "invalid balance catalog command.produces[1] material",
  );
  assertEquals(moduleCatalogEntry("command")?.produces.construction, 12);

  assertThrows(
    () => {
      const invalid = sampleBalance({
        modules: base.modules.map((module) => ({ ...module })),
      });
      invalid.modules[0].operationalCosts = ["credits"] as never;
      applyBalanceCatalog(invalid);
    },
    Error,
    "invalid balance catalog command.operationalCosts[0]",
  );

  assertThrows(
    () => {
      const invalid = sampleBalance({
        modules: base.modules.map((module) => ({ ...module })),
      });
      invalid.modules[0].productionBoostPctPerLevel = -1;
      applyBalanceCatalog(invalid);
    },
    Error,
    "invalid balance catalog command.productionBoostPctPerLevel",
  );

  assertThrows(
    () =>
      applyBalanceCatalog(sampleBalance({
        operationalCostStartLevel: 11,
        highTechCostStartLevel: 10,
      })),
    Error,
    "invalid balance catalog cost threshold order",
  );
  assertThrows(
    () =>
      applyBalanceCatalog(sampleBalance({
        asteroids: {
          tiers: [{ tier: "small", span: 1, minAmount: 240, maxAmount: 60 }],
          mineUnitsPerHour: 240,
        },
      })),
    Error,
    "invalid balance catalog small amount range",
  );
  assertEquals(asteroidTierEntry("large")?.span, 3);
});
