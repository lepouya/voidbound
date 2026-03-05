/**
 * 9-position anchor grid used for both HUD group placement (screen-relative)
 * and TileActor badge placement (sprite-relative).
 */
export type AnchorPlacement =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

/**
 * Converts an AnchorPlacement to horizontal and vertical fractions (0, 0.5, or 1).
 * Used internally by hud.ts (anchorLayout) and tile-actor.ts (setupBadges).
 */
export function anchorFractions(anchor: AnchorPlacement): {
  hFrac: number;
  vFrac: number;
} {
  const hFrac = anchor.includes("right")
    ? 1
    : anchor.includes("left")
    ? 0
    : 0.5;
  const vFrac = anchor.startsWith("bottom")
    ? 1
    : anchor.startsWith("top")
    ? 0
    : 0.5;
  return { hFrac, vFrac };
}
