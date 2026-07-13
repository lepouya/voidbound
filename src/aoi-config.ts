/**
 * Interest-area client tuning (ROADMAP P1.13). The map camera never shows
 * more than MAP_VIEW_TILES_CAP tiles on its longer axis, and the window is
 * re-centered once the camera drifts more than AOI_REQUERY_TILES tiles
 * (Chebyshev) from the window center. Together they must keep the visible
 * view strictly inside the backend's AOI_SPAN window:
 * MAP_VIEW_TILES_CAP / 2 + AOI_REQUERY_TILES < AOI_SPAN / 2 (40 + 8 < 50),
 * so unloaded space can't scroll into sight even while a re-request is in
 * flight for a few frames.
 *
 * Pure module — no Excalibur/Vite imports — so tests/aoi_config_test.ts can
 * assert that inequality under plain `deno test` instead of leaving it
 * comment-enforced only (review finding CR2.2).
 */
export const MAP_VIEW_TILES_CAP = 80;
export const AOI_REQUERY_TILES = 8;

/** Mirror of AOI_SPAN in src-tauri/src/game_state/world.rs — keep in sync. */
export const AOI_SPAN = 100;
