// Pure vessel-move lerp math — no runtime dependencies, so
// tests/vessel_math_test.ts can exercise it under plain `deno test`. The
// same src->dest timestamp lerp was previously duplicated in
// map-level.ts's applyVesselMoveEvent and minimap.ts's vesselWorldPos; this
// module is their single shared implementation, and per CODE_REVIEW.md
// CR2.4/CR4.3, the one TS call site P3.2's clock-offset handshake needs to
// change. The Rust mirror is `vessel_position`/`move_progress` in
// src-tauri/src/game_state.rs — keep the two in sync.

/** The timestamp fields a vessel move needs to be lerped. A VesselMoveEvent
 *  (game-state.ts) satisfies this structurally. */
export interface VesselLeg {
  srcCol: number;
  srcRow: number;
  destCol: number;
  destRow: number;
  /** Server epoch ms when the move was authorized. */
  dispatchedAt: number;
  /** Server epoch ms when the move completes. */
  arrivalAt: number;
}

/** Progress fraction of a vessel's move at `now`, clamped to [0, 1] — the
 *  same math as Rust's move_progress. */
export function vesselMoveProgress(leg: VesselLeg, now: number): number {
  const duration = leg.arrivalAt - leg.dispatchedAt;
  if (duration <= 0) return 1;
  return Math.min(Math.max((now - leg.dispatchedAt) / duration, 0), 1);
}

/** A vessel's current world-px position at `now`, lerped src -> dest tile
 *  center by move progress — the same math as Rust's vessel_position. */
export function vesselWorldPos(
  leg: VesselLeg,
  tileWidth: number,
  tileHeight: number,
  now: number,
): { x: number; y: number } {
  const t = vesselMoveProgress(leg, now);
  const sx = (leg.srcCol + 0.5) * tileWidth;
  const sy = (leg.srcRow + 0.5) * tileHeight;
  const dx = (leg.destCol + 0.5) * tileWidth;
  const dy = (leg.destRow + 0.5) * tileHeight;
  return { x: sx + (dx - sx) * t, y: sy + (dy - sy) * t };
}
