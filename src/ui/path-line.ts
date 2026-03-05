import * as ex from "excalibur";

// ---------------------------------------------------------------------------
// Path line rendering
// ---------------------------------------------------------------------------

export interface PathLineOptions {
  /** CSS color string for the line and knobs. Default: "rgba(80, 232, 120, 0.85)". */
  color?: string;
  /** Line stroke width in world pixels. Default: 1. */
  thickness?: number;
  /** Radius of the circular endpoint knobs in world pixels. Default: 2. */
  knobRadius?: number;
  /**
   * Canvas setLineDash pattern: alternating drawn/gap lengths in world pixels.
   * Pass [] for a solid line. Default: [2, 4].
   */
  dashPattern?: number[];
}

/**
 * Creates a scene-level actor that draws a straight path line between two
 * world positions. The line is horizontal in local space; the actor is rotated
 * to face `to`. Small circular knobs mark each endpoint. Kill the returned
 * actor to remove the line from the scene.
 */
export function makePathLine(
  from: ex.Vector,
  to: ex.Vector,
  {
    color = "rgba(80, 232, 120, 0.85)",
    thickness = 1,
    knobRadius = 2,
    dashPattern = [2, 4],
  }: PathLineOptions = {},
): ex.Actor {
  const t = thickness;
  const r = knobRadius;
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const mid = ex.vec((from.x + to.x) / 2, (from.y + to.y) / 2);
  // Canvas: (length + 2r) wide so knobs fit flush at each edge; 2r tall.
  const W = Math.ceil(length + 2 * r);
  const H = 2 * r;
  const cy = H / 2;
  const canvas = new ex.Canvas({
    width: W,
    height: H,
    cache: true,
    draw(ctx) {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      // Dotted line from knob center to knob center.
      ctx.lineWidth = t;
      ctx.lineCap = "round";
      ctx.setLineDash(dashPattern);
      ctx.beginPath();
      ctx.moveTo(r, cy);
      ctx.lineTo(r + length, cy);
      ctx.stroke();
      // Solid knobs at each endpoint (reset dash first).
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(r, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(r + length, cy, r, 0, Math.PI * 2);
      ctx.fill();
    },
  });
  const actor = new ex.Actor({
    pos: mid,
    anchor: ex.vec(0.5, 0.5),
    rotation: angle,
    z: 1,
  });
  actor.graphics.use(canvas);
  return actor;
}
