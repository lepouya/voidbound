import * as ex from "excalibur";

import { ASTEROID_TINTS } from "./asteroid-catalog.ts";
import { gameState, serverNow, VesselMoveEvent } from "./game-state.ts";
import { TileGridGeometry } from "./grid-math.ts";
import {
  MinimapProjection,
  minimapProjection,
  minimapToWorld,
  viewportRect,
  worldToMinimap,
} from "./minimap-math.ts";
import { HUD_BASE_Z, HudPointerTarget } from "./ui/index.ts";

/**
 * The space-map overview widget (ROADMAP P1.9): a square screen-fixed canvas
 * in the bottom-left showing every loaded mothership (own = green, others =
 * red), asteroid (its class tint), and in-flight vessel (white) as dots,
 * plus the camera's visible-world rectangle. "Loaded" is the interest-area
 * window plus the player's own entities (ROADMAP P1.13) — the gameState
 * tables are the filter. Tapping pans the camera to the tapped world point;
 * jumping into an unloaded region is legal and triggers the window
 * re-request via the scene's hysteresis check.
 *
 * The canvas redraws every frame (cache: false): the viewport rectangle
 * moves with every pan/zoom frame anyway, dots read the live gameState
 * tables directly — the same source the scene's reconcilers render from —
 * and the widget is far too small for the redraw to matter. Projection math
 * lives in src/minimap-math.ts (pure, unit-tested).
 */

/** Widget edge length in screen px. */
const SIZE = 120;
/** Gap from the screen edges, matching the HUD groups' default padding. */
const PADDING = 8;

const BACKGROUND = "rgba(5, 9, 20, 0.8)";
const BORDER = "rgba(255, 255, 255, 0.3)";
const OWN_MOTHERSHIP = "#3dfc4e";
const OTHER_MOTHERSHIP = "#ff3333";
const VESSEL = "#ffffff";
const VIEWPORT = "#ffffff";
/** Minimum viewport-marker edge in minimap px: at default zoom the true
 *  view rect is under a pixel on the full-size map, and the player couldn't
 *  see where they are (Pouya's July 2026 playtest feedback). */
const VIEWPORT_MIN_PX = 8;
/** Viewport-marker pulse period — a slow breathe, glow + alpha together. */
const VIEWPORT_PULSE_MS = 1600;
/** Asteroid dots render at half strength under full-strength ship dots
 *  (ROADMAP P1.13 minimap hierarchy): seeing players matters more than
 *  seeing resource nodes, and the glowing viewport marker stays the most
 *  obvious thing of all. */
const ASTEROID_DOT_ALPHA = 0.5;

/** Half-size of a dot in minimap px (dots are squares, pixel-art style). */
const MOTHERSHIP_DOT = 2;
const ASTEROID_DOT = 1.5;
const VESSEL_DOT = 1;

export interface MinimapOptions {
  engine: ex.Engine;
  /** The map's grid geometry (world size = columns/rows * tile size). */
  grid: TileGridGeometry;
  /** The scene camera the viewport rectangle tracks. */
  camera: ex.Camera;
  /** Confirmed tap on the minimap at the given world point (tap-to-jump). */
  onJump: (x: number, y: number) => void;
}

/** A vessel's current world position, lerped from its move event timestamps
 *  — the same math applyVesselMoveEvent uses to place the scene actor. */
function vesselWorldPos(
  event: VesselMoveEvent,
  grid: TileGridGeometry,
  now: number,
): { x: number; y: number } {
  const duration = event.arrivalAt - event.dispatchedAt;
  const t = duration > 0
    ? Math.min(Math.max((now - event.dispatchedAt) / duration, 0), 1)
    : 1;
  const sx = (event.srcCol + 0.5) * grid.tileWidth;
  const sy = (event.srcRow + 0.5) * grid.tileHeight;
  const dx = (event.destCol + 0.5) * grid.tileWidth;
  const dy = (event.destRow + 0.5) * grid.tileHeight;
  return { x: sx + (dx - sx) * t, y: sy + (dy - sy) * t };
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  worldX: number,
  worldY: number,
  p: MinimapProjection,
  color: string,
  halfSize: number,
): void {
  const m = worldToMinimap(worldX, worldY, p);
  ctx.fillStyle = color;
  ctx.fillRect(m.x - halfSize, m.y - halfSize, halfSize * 2, halfSize * 2);
}

/**
 * Build the minimap ScreenElement plus its HudPointerTarget. The caller (the
 * map scene) adds the element to itself and registers the target via
 * TiledScene.registerHudTarget() so taps on the widget beat world taps and
 * resizes re-pin it to the bottom-left corner.
 */
export function spawnMinimap(
  { engine, grid, camera, onJump }: MinimapOptions,
): { element: ex.ScreenElement; target: HudPointerTarget } {
  const projection = minimapProjection(
    grid.columns * grid.tileWidth,
    grid.rows * grid.tileHeight,
    SIZE,
  );

  const bottomLeft = (screen: ex.Screen) =>
    ex.vec(PADDING, screen.resolution.height - PADDING - SIZE);

  const element = new ex.ScreenElement({
    pos: bottomLeft(engine.screen),
    width: SIZE,
    height: SIZE,
    anchor: ex.vec(0, 0),
    z: HUD_BASE_Z,
  });

  const canvas = new ex.Canvas({
    width: SIZE,
    height: SIZE,
    cache: false,
    draw: (ctx) => {
      ctx.fillStyle = BACKGROUND;
      ctx.fillRect(0, 0, SIZE, SIZE);

      const now = serverNow();
      // Half-strength asteroid dots first, full-strength ship dots over
      // them (ROADMAP P1.13 hierarchy). The tables are already
      // interest-area filtered: beyond the window the minimap shows only
      // the background and the player's own (later alliance) ships — the
      // global resource picture disappears by design.
      ctx.save();
      ctx.globalAlpha = ASTEROID_DOT_ALPHA;
      for (const a of gameState.asteroids.values()) {
        drawDot(
          ctx,
          (a.col + a.span / 2) * grid.tileWidth,
          (a.row + a.span / 2) * grid.tileHeight,
          projection,
          ASTEROID_TINTS[a.resource],
          ASTEROID_DOT,
        );
      }
      ctx.restore();
      for (const m of gameState.motherships.values()) {
        drawDot(
          ctx,
          (m.col + m.span / 2) * grid.tileWidth,
          (m.row + m.span / 2) * grid.tileHeight,
          projection,
          m.ownerId === gameState.player.id ? OWN_MOTHERSHIP : OTHER_MOTHERSHIP,
          MOTHERSHIP_DOT,
        );
      }
      for (const v of gameState.vessels.values()) {
        const pos = vesselWorldPos(v, grid, now);
        drawDot(ctx, pos.x, pos.y, projection, VESSEL, VESSEL_DOT);
      }

      const view = viewportRect(
        camera.pos,
        camera.zoom,
        engine.screen.resolution.width,
        engine.screen.resolution.height,
        projection,
        VIEWPORT_MIN_PX,
      );
      // Glowing, gently pulsing marker so the current location reads at a
      // glance among the dots.
      const pulse = 0.875 +
        0.125 * Math.sin((now / VIEWPORT_PULSE_MS) * 2 * Math.PI);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.shadowColor = VIEWPORT;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = VIEWPORT;
      ctx.lineWidth = 2;
      ctx.strokeRect(view.x + 1, view.y + 1, view.w - 2, view.h - 2);
      ctx.restore();

      ctx.strokeStyle = BORDER;
      ctx.strokeRect(0.5, 0.5, SIZE - 1, SIZE - 1);
    },
  });
  element.graphics.use(canvas);

  const target: HudPointerTarget = {
    relayout(engine: ex.Engine) {
      element.pos = bottomLeft(engine.screen);
    },
    tryPointerUp(screenPos: ex.Vector): boolean {
      const local = screenPos.sub(element.pos);
      if (local.x < 0 || local.x > SIZE || local.y < 0 || local.y > SIZE) {
        return false;
      }
      const world = minimapToWorld(local.x, local.y, projection);
      onJump(world.x, world.y);
      return true;
    },
  };

  return { element, target };
}
