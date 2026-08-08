import { assertEquals } from "@std/assert";

import contracts from "./fixtures/cross-language-contracts.json" with {
  type: "json",
};
import {
  ASTEROID_GRADE_BAND_WIDTH,
  ASTEROID_GRADE_MULTIPLIERS,
  asteroidResourceGrade,
} from "../src/map/asteroid-catalog.ts";
import {
  AOI_REQUERY_TILES,
  AOI_SPAN,
  MAP_VIEW_TILES_CAP,
} from "../src/map/aoi-config.ts";
import { MAX_NOTIFICATIONS } from "../src/state/game-state.ts";
import {
  closestDockTile,
  isDockTile,
  roomOriginAt,
  SHIP_ROOM_GRID,
} from "../src/scene/grid-math.ts";
import { vesselMoveProgress, vesselWorldPos } from "../src/map/vessel-math.ts";
import {
  estimateWarpFuelCost,
  WARP_FUEL_PER_TILE,
} from "../src/map/warp-footprint.ts";
import {
  DEAL_REFRESH_COSTS_CREDITS,
  dealRefreshCost,
} from "../src/ship/trade-catalog.ts";

// Rust's paired checks live beside their authoritative rules in
// game_state/{world,modules,deals,state}.rs. The JSON fixture keeps the
// otherwise internal numeric mirrors explicit without widening the wire API.
Deno.test("cross-language numeric contracts match the shared fixture", () => {
  const { asteroids, aoi, ship, vessel, warp } = contracts;
  assertEquals(ASTEROID_GRADE_BAND_WIDTH, asteroids.gradeBandWidth);
  assertEquals(
    [...ASTEROID_GRADE_MULTIPLIERS],
    asteroids.gradeMultipliers.map(([numerator, denominator]) =>
      numerator / denominator
    ),
  );
  for (const point of asteroids.grades) {
    assertEquals(
      asteroidResourceGrade(
        point.col,
        point.row,
        asteroids.map[0],
        asteroids.map[1],
      ),
      point.grade,
    );
  }

  assertEquals(AOI_SPAN, aoi.span);
  assertEquals(MAP_VIEW_TILES_CAP, aoi.viewCap);
  assertEquals(AOI_REQUERY_TILES, aoi.requeryTiles);
  assertEquals(
    MAP_VIEW_TILES_CAP / 2 + AOI_REQUERY_TILES < AOI_SPAN / 2,
    true,
  );

  assertEquals(SHIP_ROOM_GRID, ship.roomGrid);
  for (const point of ship.roomOrigins) {
    const origin = roomOriginAt(SHIP_ROOM_GRID, point.col, point.row);
    assertEquals(origin && [origin.col, origin.row], point.origin);
  }
  const mothership = {
    col: ship.mothership.col,
    row: ship.mothership.row,
    colSpan: ship.mothership.span,
    rowSpan: ship.mothership.span,
  };
  for (const point of ship.docks) {
    assertEquals(isDockTile(mothership, point.col, point.row), point.isDock);
  }
  for (const point of ship.closestDocks) {
    const dock = closestDockTile(mothership, point.dest[0], point.dest[1]);
    assertEquals([dock.col, dock.row], point.dock);
  }

  const leg = {
    srcCol: vessel.src[0],
    srcRow: vessel.src[1],
    destCol: vessel.dest[0],
    destRow: vessel.dest[1],
    dispatchedAt: vessel.dispatchedAt,
    arrivalAt: vessel.arrivalAt,
  };
  for (const sample of vessel.samples) {
    assertEquals(vesselMoveProgress(leg, sample.now), sample.progress);
    const position = vesselWorldPos(leg, 1, 1, sample.now);
    assertEquals([position.x - 0.5, position.y - 0.5], sample.position);
  }

  assertEquals(WARP_FUEL_PER_TILE, warp.fuelPerTile);
  for (const entry of warp.cases) {
    assertEquals(
      estimateWarpFuelCost(
        entry.from[0],
        entry.from[1],
        entry.to[0],
        entry.to[1],
      ),
      entry.cost,
    );
  }
  assertEquals(DEAL_REFRESH_COSTS_CREDITS, contracts.dealRefreshCostsCredits);
  for (
    let index = 0;
    index <= contracts.dealRefreshCostsCredits.length;
    index++
  ) {
    assertEquals(
      dealRefreshCost(index),
      contracts.dealRefreshCostsCredits[index] ?? null,
    );
  }
  assertEquals(MAX_NOTIFICATIONS, contracts.maxNotifications);
});
