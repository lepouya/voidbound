import * as ex from "excalibur";

import {
  ButtonDef,
  LABEL_PAD,
  makeBorderedLabel,
  makeButtonGraphic,
  makeLabelActor,
} from "./ui";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type HudAnchor =
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
 * Stack direction for buttons within a HUD group.
 *
 * 'down' / 'up' / 'left' / 'right' — buttons grow in that direction from the
 * anchor edge.
 *
 * 'center' — buttons are distributed symmetrically around the anchor point
 * along the primary axis (vertical for *-left / *-right / middle-* anchors;
 * horizontal for top-* / bottom-* anchors). An offset shifts the whole group.
 */
export type HudStackDir = "down" | "up" | "left" | "right" | "center";

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
  buttons: ButtonDef[];
}

export interface HudGroupHandle {
  /** Show or hide all buttons in the group. */
  setVisible(visible: boolean): void;
  /** Enable or disable an individual button by index. */
  setButtonDisabled(index: number, disabled: boolean): void;
  /** Toggle the active state of an individual button by index. */
  setButtonActive(index: number, active: boolean): void;
  /** Update or remove the badge on an individual button by index. */
  setBadge(index: number, badge: number | string | undefined): void;
  /** Remove all buttons in this group from the scene. */
  remove(): void;
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
  def: ButtonDef;
  disabled: boolean;
  active: boolean;
  badgeActor: ex.Actor | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse 'top-left' → ['top', 'left'], etc. */
function splitAnchor(anchor: HudAnchor): [string, string] {
  const idx = anchor.indexOf("-");
  return [anchor.slice(0, idx), anchor.slice(idx + 1)];
}

/**
 * Returns the ex.ScreenElement anchor fractions (hFrac, vFrac) and the base
 * screen position (bx, by) for a given HudAnchor + padding.
 */
function anchorLayout(
  anchor: HudAnchor,
  padding: number,
  drawWidth: number,
  drawHeight: number,
): { hFrac: number; vFrac: number; bx: number; by: number } {
  const [v, h] = splitAnchor(anchor);
  const hFrac = h === "left" ? 0 : h === "right" ? 1 : 0.5;
  const vFrac = v === "top" ? 0 : v === "bottom" ? 1 : 0.5;
  const bx = h === "left"
    ? padding
    : h === "right"
    ? drawWidth - padding
    : drawWidth / 2;
  const by = v === "top"
    ? padding
    : v === "bottom"
    ? drawHeight - padding
    : drawHeight / 2;
  return { hFrac, vFrac, bx, by };
}

/** Infer a default stack direction from the anchor. */
function inferDirection(anchor: HudAnchor): HudStackDir {
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

/** Create or update a badge child actor on a ScreenElement. */
function spawnBadge(
  el: ex.ScreenElement,
  badge: number | string,
  w: number,
  h: number,
  hFrac: number,
  vFrac: number,
): ex.Actor {
  const actor = new ex.Actor({
    // Top-right corner of the visual button in local space.
    // Children are relative to the parent's raw pos, not its visual center,
    // so we must compensate for the anchor offset.
    pos: ex.vec((1 - hFrac) * w, -vFrac * h),
    anchor: ex.vec(1, 1),
  });
  actor.graphics.use(
    makeBorderedLabel(String(badge), { bordered: true, fontSize: 8 }),
  );
  el.addChild(actor);
  return actor;
}

// ---------------------------------------------------------------------------
// Main factory
// ---------------------------------------------------------------------------

export function spawnHudGroup(
  engine: ex.Engine,
  def: HudGroupDef,
): { elements: ex.ScreenElement[]; handle: HudGroupHandle } {
  const padding = def.padding ?? 8;
  const gap = def.gap ?? 4;
  const offset = def.offset ?? 0;
  // HUD elements must always render above all world-space actors and tilemaps.
  // Use a large base z; zOffset is relative between overlapping HUD groups.
  const HUD_BASE_Z = 10_000;
  const z = HUD_BASE_Z + (def.zOffset ?? 0);
  const direction = def.direction ?? inferDirection(def.anchor);

  const { hFrac, vFrac, bx, by } = anchorLayout(
    def.anchor,
    padding,
    engine.drawWidth,
    engine.drawHeight,
  );

  // Determine stacking axis.
  const isVertical = direction === "down" || direction === "up" ||
    direction === "center";

  // Resolve sizes for all buttons up front (needed for 'center' pre-computation).
  const sizes = def.buttons.map((btn) => ({
    w: btn.width ?? 32,
    h: btn.height ?? 32,
  }));

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

  const elements: ex.ScreenElement[] = [];
  const states: ButtonState[] = [];
  let cursor = startPos;

  for (let i = 0; i < def.buttons.length; i++) {
    const btn = def.buttons[i];
    const { w, h } = sizes[i];
    const size = isVertical ? h : w;

    // For 'up'/'left', position is the far edge; adjust cursor before placing.
    if (direction === "up" || direction === "left") {
      cursor -= size;
    }

    const elX = isVertical ? bx : cursor;
    const elY = isVertical ? cursor : by;

    const el = new ex.ScreenElement({
      x: elX,
      y: elY,
      width: w + (btn.hitPadding ?? 0) * 2,
      height: h + (btn.hitPadding ?? 0) * 2,
      anchor: ex.vec(hFrac, vFrac),
      z,
    });

    const initDisabled = btn.disabled ?? false;
    const initActive = btn.active ?? false;

    applyButtonGraphic(el, btn, initDisabled, initActive, w, h);

    // If hitPadding is set, offset the graphic to keep it visually centered.
    if (btn.hitPadding) {
      const pad = btn.hitPadding;
      el.graphics.offset = ex.vec(-pad, -pad);
    }

    el.on("pointerup", () => {
      if (state.disabled) return;
      btn.onPressed();
    });

    // Label below the button.
    // Bottom-center of the visual button in local space, compensating for anchor.
    const labelActor = makeLabelActor(
      btn.label,
      ex.vec((0.5 - hFrac) * w, (1 - vFrac) * h + LABEL_PAD),
    );
    if (labelActor) el.addChild(labelActor);

    // Badge overlay at top-right corner.
    let badgeActor: ex.Actor | null = null;
    if (btn.badge !== undefined) {
      badgeActor = spawnBadge(el, btn.badge, w, h, hFrac, vFrac);
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

    // Advance cursor.
    if (direction === "up" || direction === "left") {
      cursor -= gap;
    } else {
      cursor += size + gap;
    }
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
      if (state.def.hitPadding) {
        state.element.graphics.offset = ex.vec(
          -state.def.hitPadding,
          -state.def.hitPadding,
        );
      }
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
      if (state.def.hitPadding) {
        state.element.graphics.offset = ex.vec(
          -state.def.hitPadding,
          -state.def.hitPadding,
        );
      }
    },

    setBadge(index: number, badge: number | string | undefined) {
      const state = states[index];
      if (!state) return;
      if (state.badgeActor) {
        state.badgeActor.kill();
        state.badgeActor = null;
      }
      if (badge !== undefined) {
        const { w, h } = sizes[index];
        state.badgeActor = spawnBadge(state.element, badge, w, h, hFrac, vFrac);
      }
    },

    remove() {
      for (const el of elements) el.kill();
    },

    tryPointerUp(screenPos: ex.Vector): boolean {
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const state = states[i];
        if (el.isKilled() || !el.graphics.isVisible) continue;
        const left = el.pos.x - el.anchor.x * el.width;
        const top = el.pos.y - el.anchor.y * el.height;
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
