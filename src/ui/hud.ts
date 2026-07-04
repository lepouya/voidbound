import * as ex from "excalibur";

import { anchorFractions, AnchorPlacement } from "./anchor";
import { BadgeDef, makeBadgeActor } from "./badge";
import { ButtonDef, makeButtonGraphic } from "./button";
import { LABEL_PAD, makeLabelActor } from "./label";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Screen-space anchor alias — same 9-position grid as AnchorPlacement in anchor.ts. */
export type HudAnchor = AnchorPlacement;

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
 * HUD-specific button definition. Extends ButtonDef with size and hit-area
 * fields that are only meaningful in screen-space context.
 */
export interface HudButtonDef extends ButtonDef {
  /** Button width in screen pixels. Default: 32. */
  width?: number;
  /** Button height in screen pixels. Default: 32. */
  height?: number;
  /** Inflates the pointer-event hit area beyond the visual bounds (px). Default: 0. */
  hitPadding?: number;
}

export interface HudGroupDef {
  anchor: HudAnchor;
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
  /** Z draw order for layering between overlapping groups. Default: 0. */
  zOffset?: number;
  buttons: HudButtonDef[];
}

export interface HudGroupHandle {
  /** Show or hide all buttons in the group. */
  setVisible(visible: boolean): void;
  /** Enable or disable an individual button by index. */
  setButtonDisabled(index: number, disabled: boolean): void;
  /** Toggle the active state of an individual button by index. */
  setButtonActive(index: number, active: boolean): void;
  /** Update or remove the badge on an individual button by index. */
  setBadge(index: number, badge: BadgeDef | undefined): void;
  /** Remove all buttons in this group from the scene. */
  remove(): void;
  /**
   * Recompute button positions for the current screen dimensions. Call after
   * a screen resize; all runtime state (visibility, disabled, badges) is kept.
   */
  relayout(engine: ex.Engine): void;
  /**
   * If screenPos falls within a button's hit area, fires its onPressed (unless
   * disabled) and returns true. Returns false if no button was hit.
   * Used by TiledScene to handle clicks without relying on actor pointer events.
   */
  tryPointerUp(screenPos: ex.Vector): boolean;
}

// ---------------------------------------------------------------------------
// Internal state per button
// ---------------------------------------------------------------------------

interface ButtonState {
  element: ex.ScreenElement;
  def: HudButtonDef;
  disabled: boolean;
  active: boolean;
  badgeActor: ex.Actor | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the ex.ScreenElement anchor fractions (hFrac, vFrac) and the base
 * screen position (bx, by) for a given HudAnchor + padding.
 */
function anchorLayout(
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
function inferDirection(anchor: AnchorPlacement): HudStackDir {
  return anchor.startsWith("bottom") ? "up" : "down";
}

/** Apply the correct graphic and opacity to a ScreenElement for the given state. */
function applyButtonGraphic(
  el: ex.ScreenElement,
  def: ButtonDef,
  disabled: boolean,
  active: boolean,
  w: number,
  h: number,
): void {
  const { graphic, opacity } = makeButtonGraphic(def, disabled, active, w, h);
  el.graphics.use(graphic);
  el.graphics.opacity = opacity;
}

/**
 * Computes the visual-center screen position of every button in the group for
 * the given screen dimensions (the zoom-1 resolution — screen space is not
 * affected by camera zoom). Shared by the initial spawn and relayout-on-resize.
 */
function layoutButtonCenters(
  def: HudGroupDef,
  sizes: Array<{ w: number; h: number }>,
  drawWidth: number,
  drawHeight: number,
): ex.Vector[] {
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

  const centers: ex.Vector[] = [];
  let cursor = startPos;

  for (let i = 0; i < def.buttons.length; i++) {
    const { w, h } = sizes[i];
    const size = isVertical ? h : w;

    // For 'up'/'left', position is the far edge; adjust cursor before placing.
    if (direction === "up" || direction === "left") {
      cursor -= size;
    }

    // For 'up'/'left', cursor is the far (leading) edge after subtracting size.
    // The position formula below expects the anchor edge, so add size back.
    const elX = isVertical ? bx : direction === "left" ? cursor + size : cursor;
    const elY = isVertical ? (direction === "up" ? cursor + size : cursor) : by;

    // Shift from the anchor-edge position to the button's visual center so
    // that children can be placed relative to (0,0) = button center.
    centers.push(ex.vec(elX + (0.5 - hFrac) * w, elY + (0.5 - vFrac) * h));

    // Advance cursor.
    if (direction === "up" || direction === "left") {
      cursor -= gap;
    } else {
      cursor += size + gap;
    }
  }
  return centers;
}

// ---------------------------------------------------------------------------
// Main factory
// ---------------------------------------------------------------------------

export function spawnHudGroup(
  engine: ex.Engine,
  def: HudGroupDef,
): { elements: ex.ScreenElement[]; handle: HudGroupHandle } {
  // HUD elements must always render above all world-space actors and tilemaps.
  // Use a large base z; zOffset is relative between overlapping HUD groups.
  const HUD_BASE_Z = 10_000;
  const z = HUD_BASE_Z + (def.zOffset ?? 0);

  // Resolve sizes for all buttons up front (needed for 'center' pre-computation).
  const sizes = def.buttons.map((btn) => ({
    w: btn.width ?? 32,
    h: btn.height ?? 32,
  }));

  // screen.resolution is the zoom-1 draw size; engine.drawWidth/drawHeight
  // divide by the current camera zoom and would misplace screen-space HUD
  // elements whenever the camera is zoomed.
  const centers = layoutButtonCenters(
    def,
    sizes,
    engine.screen.resolution.width,
    engine.screen.resolution.height,
  );

  const elements: ex.ScreenElement[] = [];
  const states: ButtonState[] = [];

  for (let i = 0; i < def.buttons.length; i++) {
    const btn = def.buttons[i];
    const { w, h } = sizes[i];

    const el = new ex.ScreenElement({
      x: centers[i].x,
      y: centers[i].y,
      width: w + (btn.hitPadding ?? 0) * 2,
      height: h + (btn.hitPadding ?? 0) * 2,
      anchor: ex.vec(0.5, 0.5),
      z,
    });

    const initDisabled = btn.disabled ?? false;
    const initActive = btn.active ?? false;

    applyButtonGraphic(el, btn, initDisabled, initActive, w, h);

    // Note: no pointer event registration here. HUD clicks are dispatched
    // exclusively via handle.tryPointerUp() polled by TiledScene.handleTap —
    // a second path through ScreenElement pointer events would double-fire.

    // Label below the button. Button center is at (0,0) in local space.
    const labelActor = makeLabelActor(btn.label, ex.vec(0, h / 2 + LABEL_PAD));
    if (labelActor) el.addChild(labelActor);

    // Badge overlay at top-right corner. Button center is (0,0) in local space,
    // so the top-right corner of the visual button is at (+w/2, -h/2).
    let badgeActor: ex.Actor | null = null;
    if (btn.badge !== undefined) {
      badgeActor = makeBadgeActor(btn.badge, ex.vec(w / 2, -h / 2));
      el.addChild(badgeActor);
    }

    const state: ButtonState = {
      element: el,
      def: btn,
      disabled: initDisabled,
      active: initActive,
      badgeActor,
    };
    states.push(state);
    elements.push(el);
  }

  // ---------------------------------------------------------------------------
  // Handle
  // ---------------------------------------------------------------------------

  const handle: HudGroupHandle = {
    setVisible(visible: boolean) {
      for (const el of elements) {
        el.graphics.isVisible = visible;
        for (const child of el.children) {
          (child as ex.Actor).graphics.isVisible = visible;
        }
      }
    },

    setButtonDisabled(index: number, disabled: boolean) {
      const state = states[index];
      if (!state) return;
      state.disabled = disabled;
      const { w, h } = sizes[index];
      applyButtonGraphic(
        state.element,
        state.def,
        disabled,
        state.active,
        w,
        h,
      );
    },

    setButtonActive(index: number, active: boolean) {
      const state = states[index];
      if (!state) return;
      state.active = active;
      const { w, h } = sizes[index];
      applyButtonGraphic(
        state.element,
        state.def,
        state.disabled,
        active,
        w,
        h,
      );
    },

    setBadge(index: number, badge: BadgeDef | undefined) {
      const state = states[index];
      if (!state) return;
      if (state.badgeActor) {
        state.badgeActor.kill();
        state.badgeActor = null;
      }
      if (badge !== undefined) {
        const { w, h } = sizes[index];
        const actor = makeBadgeActor(badge, ex.vec(w / 2, -h / 2));
        state.element.addChild(actor);
        state.badgeActor = actor;
      }
    },

    remove() {
      for (const el of elements) el.kill();
    },

    relayout(engine: ex.Engine) {
      const centers = layoutButtonCenters(
        def,
        sizes,
        engine.screen.resolution.width,
        engine.screen.resolution.height,
      );
      for (let i = 0; i < elements.length; i++) {
        elements[i].pos = centers[i].clone();
      }
    },

    tryPointerUp(screenPos: ex.Vector): boolean {
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const state = states[i];
        if (el.isKilled() || !el.graphics.isVisible) continue;
        const left = el.pos.x - 0.5 * el.width;
        const top = el.pos.y - 0.5 * el.height;
        if (
          screenPos.x >= left &&
          screenPos.x <= left + el.width &&
          screenPos.y >= top &&
          screenPos.y <= top + el.height
        ) {
          if (!state.disabled) state.def.onPressed();
          return true;
        }
      }
      return false;
    },
  };

  return { elements, handle };
}
