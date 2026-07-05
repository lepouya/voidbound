// Pure HUD layout math — no runtime dependencies beyond anchor.ts (also
// pure), so tests/hud_layout_test.ts can exercise it under plain `deno test`.
// Positions are plain {x, y} records; hud.ts wraps them into ex.Vectors.
import { anchorFractions, AnchorPlacement } from "./anchor";

/**
 * Stack direction for buttons within a HUD group.
 *
 * 'down' / 'up' / 'left' / 'right' — buttons grow in that direction from the
 * anchor edge.
 *
 * 'center' — buttons are distributed symmetrically around the anchor point
 * along the primary axis (vertical for middle-* anchors; horizontal for top-*
 * / bottom-* anchors). An offset shifts the whole group.
 */
export type HudStackDir = "down" | "up" | "left" | "right" | "center";

/**
 * The subset of HudGroupDef that drives layout. HudGroupDef is structurally
 * assignable to this, so hud.ts passes its def straight through.
 */
export interface HudLayoutDef {
  anchor: AnchorPlacement;
  /** Inferred from anchor if omitted: top-*→down, bottom-*→up, middle-*→down. */
  direction?: HudStackDir;
  /** Gap from the screen edge in pixels. Default: 8. */
  padding?: number;
  /** Gap between consecutive buttons in pixels. Default: 4. */
  gap?: number;
  /**
   * Shift along the stacking axis before the first button (px). Default: 0.
   * For 'center': shifts the entire centered group in the positive direction.
   */
  offset?: number;
}

/**
 * Returns the anchor fractions (hFrac, vFrac) and the base screen position
 * (bx, by) for a given anchor + padding on a drawWidth*drawHeight screen.
 */
export function anchorLayout(
  anchor: AnchorPlacement,
  padding: number,
  drawWidth: number,
  drawHeight: number,
): { hFrac: number; vFrac: number; bx: number; by: number } {
  const { hFrac, vFrac } = anchorFractions(anchor);
  const bx = hFrac === 0
    ? padding
    : hFrac === 1
    ? drawWidth - padding
    : drawWidth / 2;
  const by = vFrac === 0
    ? padding
    : vFrac === 1
    ? drawHeight - padding
    : drawHeight / 2;
  return { hFrac, vFrac, bx, by };
}

/** Infer a default stack direction from the anchor. */
export function inferDirection(anchor: AnchorPlacement): HudStackDir {
  return anchor.startsWith("bottom") ? "up" : "down";
}

/**
 * Computes the visual-center screen position of every button in the group for
 * the given screen dimensions (the zoom-1 resolution — screen space is not
 * affected by camera zoom). Shared by the initial spawn and relayout-on-resize.
 */
export function layoutButtonCenters(
  def: HudLayoutDef,
  sizes: Array<{ w: number; h: number }>,
  drawWidth: number,
  drawHeight: number,
): Array<{ x: number; y: number }> {
  const padding = def.padding ?? 8;
  const gap = def.gap ?? 4;
  const offset = def.offset ?? 0;
  const direction = def.direction ?? inferDirection(def.anchor);

  const { hFrac, vFrac, bx, by } = anchorLayout(
    def.anchor,
    padding,
    drawWidth,
    drawHeight,
  );

  // Determine stacking axis. For 'center', buttons spread along the anchor's
  // primary edge: horizontal for top-*/bottom-* anchors, vertical otherwise.
  const isVertical = direction === "down" ||
    direction === "up" ||
    (direction === "center" &&
      !def.anchor.startsWith("top") &&
      !def.anchor.startsWith("bottom"));

  // Compute the starting position along the stack axis.
  let startPos: number;
  if (direction === "center") {
    const totalExtent = isVertical
      ? sizes.reduce((sum, s) => sum + s.h, 0) + (sizes.length - 1) * gap
      : sizes.reduce((sum, s) => sum + s.w, 0) + (sizes.length - 1) * gap;
    const anchorPos = isVertical ? by : bx;
    startPos = anchorPos - totalExtent / 2 + offset;
  } else if (direction === "down" || direction === "right") {
    startPos = (isVertical ? by : bx) + offset;
  } else {
    // 'up' or 'left': buttons grow inward from the anchor
    startPos = (isVertical ? by : bx) - offset;
  }

  const centers: Array<{ x: number; y: number }> = [];
  let cursor = startPos;

  for (const { w, h } of sizes) {
    const size = isVertical ? h : w;

    // For 'up'/'left', cursor is the trailing edge; step back so that cursor
    // is the leading (top/left) edge of this button in every direction.
    if (direction === "up" || direction === "left") {
      cursor -= size;
    }

    // Along the stacking axis the center is simply leading edge + half size.
    // On the cross axis, shift from the anchored base position to the visual
    // center so children can be placed relative to (0,0) = button center.
    const axisCenter = cursor + size / 2;
    centers.push({
      x: isVertical ? bx + (0.5 - hFrac) * w : axisCenter,
      y: isVertical ? axisCenter : by + (0.5 - vFrac) * h,
    });

    // Advance cursor.
    if (direction === "up" || direction === "left") {
      cursor -= gap;
    } else {
      cursor += size + gap;
    }
  }
  return centers;
}
