// Asserts the AOI safety invariant documented in src/aoi-config.ts and
// CODE_REVIEW.md CR2.2: the client's visible-view cap plus its re-query
// hysteresis must stay strictly inside the backend's AOI_SPAN window, so
// unloaded space can never scroll into sight even mid re-request. Without
// this test the inequality was comment-enforced only across the
// map-level.ts <-> game_state.rs language boundary.

import { assert } from "jsr:@std/assert@1";

import {
  AOI_REQUERY_TILES,
  AOI_SPAN,
  MAP_VIEW_TILES_CAP,
} from "../src/aoi-config.ts";

Deno.test("AOI safety invariant: view cap + requery hysteresis stays inside AOI_SPAN", () => {
  assert(
    MAP_VIEW_TILES_CAP / 2 + AOI_REQUERY_TILES < AOI_SPAN / 2,
    `MAP_VIEW_TILES_CAP/2 (${MAP_VIEW_TILES_CAP / 2}) + ` +
      `AOI_REQUERY_TILES (${AOI_REQUERY_TILES}) must be < ` +
      `AOI_SPAN/2 (${AOI_SPAN / 2})`,
  );
});
