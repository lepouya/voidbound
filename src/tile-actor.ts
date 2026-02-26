import * as ex from "excalibur";

import {
  ButtonDef,
  makeButtonGraphic,
  makeLabelActor,
  parseTileRef,
  TileRef,
} from "./ui";

const PATH_LINE_COLOR = "rgba(80, 232, 120, 0.85)";
const PATH_LINE_THICKNESS = 1; // px in world space
const PATH_LINE_KNOB_RADIUS = 2; // px in world space

/**
 * Creates a scene-level actor that draws a straight path line between two
 * world positions. The line is horizontal in local space; the actor is rotated
 * to face `to`. Small circular knobs mark each endpoint. Kill the returned
 * actor to remove the line from the scene.
 */
function makePathLine(from: ex.Vector, to: ex.Vector): ex.Actor {
  const t = PATH_LINE_THICKNESS;
  const r = PATH_LINE_KNOB_RADIUS;
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
      ctx.strokeStyle = PATH_LINE_COLOR;
      ctx.fillStyle = PATH_LINE_COLOR;
      // Dotted line from knob center to knob center.
      ctx.lineWidth = t;
      ctx.lineCap = "round";
      ctx.setLineDash([2, 4]);
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

export interface TileActorOptions {
  /** Sprite to display. Pass null/undefined for an invisible (empty) tile actor. */
  tile?: TileRef | null;
  /** Sprite to display while the actor is in motion. Optional. */
  movingTile?: TileRef | null;
  tilemap: ex.TileMap;
  col?: number;
  row?: number;
  width?: number;
  height?: number;
  ownerName?: string;
  ownerId?: string;
  selection?: TileRef | null;
  onPressed?: (actor: TileActor) => void;
  /** Action buttons shown in a symmetric arc below the actor when selected. */
  buttons?: ButtonDef[];
}

export class TileActor extends ex.Actor {
  // Set once at construction; ownerName label is baked in onInitialize so
  // mutating it afterwards would have no visible effect.
  readonly ownerName: string | undefined;
  readonly ownerId: string | undefined;
  readonly col: number;
  readonly row: number;
  /** Actor width in tiles. */
  readonly colSpan: number;
  /** Actor height in tiles. */
  readonly rowSpan: number;
  private readonly baseGraphic: ex.Graphic;
  private readonly movingGraphic: ex.Graphic | null;
  private readonly selectionTile: TileRef | null;
  private readonly onPressed: ((actor: TileActor) => void) | undefined;
  private readonly actionButtons: ButtonDef[];
  private readonly tileWidth: number;
  private readonly tileHeight: number;
  // All selection-dependent actors: the selection ring and every action button
  // sprite/label. Toggled together in select() / deselect().
  private readonly selectionVisuals: ex.Actor[] = [];
  // Set by a button child's pointerdown to prevent the parent from treating
  // the same press as a tap on the actor body.
  private suppressNextPress = false;
  // select() called before onInitialize sets this flag; onInitialize applies it.
  private pendingSelect = false;
  // Child actors that must stay upright (zero screen rotation) at a fixed
  // world-space offset from the actor center, regardless of this actor's
  // rotation. Each entry stores the target world offset (wx, wy) in px.
  // Populated in onInitialize() and setupActionButtons().
  private readonly uprightChildren: Array<{
    actor: ex.Actor;
    wx: number;
    wy: number;
  }> = [];
  // Sibling scene actor drawn while this actor is in motion; killed on arrival
  // or when a new moveTo() supersedes the previous one.
  private pathLine: ex.Actor | null = null;

  constructor({
    tilemap,
    tile,
    movingTile,
    col = 0,
    row = 0,
    width,
    height,
    ownerName,
    ownerId,
    selection,
    onPressed,
    buttons = [],
  }: TileActorOptions) {
    let graphic: ex.Graphic;
    let w: number;
    let h: number;
    if (tile != null) {
      graphic = parseTileRef(tile);
      w = width ?? graphic.width / tilemap.tileWidth;
      h = height ?? graphic.height / tilemap.tileHeight;
    } else {
      w = width ?? 1;
      h = height ?? 1;
      graphic = new ex.Rectangle({
        width: w * tilemap.tileWidth,
        height: h * tilemap.tileHeight,
        color: ex.Color.Transparent,
      });
    }
    super({
      x: col * tilemap.tileWidth + (w * tilemap.tileWidth) / 2,
      y: row * tilemap.tileHeight + (h * tilemap.tileHeight) / 2,
      width: graphic.width,
      height: graphic.height,
      anchor: ex.vec(0.5, 0.5),
      z: 2,
      scale: ex.vec(
        (w * tilemap.tileWidth) / graphic.width,
        (h * tilemap.tileHeight) / graphic.height,
      ),
    });
    this.col = col;
    this.row = row;
    this.colSpan = w;
    this.rowSpan = h;
    this.baseGraphic = graphic;
    this.movingGraphic = movingTile != null ? parseTileRef(movingTile) : null;
    this.ownerName = ownerName;
    this.ownerId = ownerId;
    this.selectionTile = selection === undefined ? "ui-selection:0" : selection;
    this.onPressed = onPressed;
    this.actionButtons = buttons;
    this.tileWidth = tilemap.tileWidth;
    this.tileHeight = tilemap.tileHeight;
    this.graphics.use(graphic);
  }

  select(): void {
    if (this.selectionVisuals.length === 0) {
      // onInitialize hasn't run yet; defer until it does.
      this.pendingSelect = true;
      return;
    }
    for (const v of this.selectionVisuals) v.graphics.isVisible = true;
  }

  deselect(): void {
    this.pendingSelect = false;
    this.suppressNextPress = false;
    for (const v of this.selectionVisuals) v.graphics.isVisible = false;
  }

  /**
   * Rotate the actor to face the given angle (radians). Sprites are assumed to
   * point toward the top of the screen (−y) at rotation 0, so an angle of 0
   * leaves the sprite unchanged.
   *
   * Action buttons and labels are counter-rotated by repositionUprightChildren()
   * so they always appear upright and below the actor in world space.
   */
  setFacing(angle: number): void {
    this.rotation = angle;
    // Reposition immediately so children don't lag by one frame if this is
    // called mid-update (e.g. from a button press handler).
    this.repositionUprightChildren();
  }

  /**
   * Animate this actor from its current position to the given tile coordinates.
   * Automatically rotates the actor to face the direction of travel.
   * Switches to the movingTile sprite (if configured) during travel and back to
   * the base sprite on arrival. Cancels any in-flight movement before starting.
   * Shows a path line from the departure point to the destination; the line is
   * removed when the actor arrives or when a new moveTo() supersedes this one.
   */
  moveTo(
    col: number,
    row: number,
    speed: number,
    onComplete?: () => void,
  ): void {
    const worldX = col * this.tileWidth + this.tileWidth / 2;
    const worldY = row * this.tileHeight + this.tileHeight / 2;
    this.actions.clearActions();
    // Remove any path line from a previous (possibly in-flight) moveTo().
    this.pathLine?.kill();
    this.pathLine = null;
    // Face the direction of travel. Sprites default to facing up (−y), so
    // add π/2 to convert from the standard atan2 angle (0 = right) to the
    // sprite's frame (0 = up).
    const dx = worldX - this.pos.x;
    const dy = worldY - this.pos.y;
    if (dx !== 0 || dy !== 0) {
      this.setFacing(Math.atan2(dy, dx) + Math.PI / 2);
      const pathLine = makePathLine(this.pos, ex.vec(worldX, worldY));
      this.scene?.add(pathLine);
      this.pathLine = pathLine;
    }
    if (this.movingGraphic !== null) {
      this.graphics.use(this.movingGraphic);
    }
    this.actions.moveTo(worldX, worldY, speed).callMethod(() => {
      if (this.movingGraphic !== null) {
        this.graphics.use(this.baseGraphic);
      }
      this.pathLine?.kill();
      this.pathLine = null;
      onComplete?.();
    });
  }

  override onInitialize(): void {
    this.on("pointerdown", (evt) => {
      if (this.suppressNextPress) {
        this.suppressNextPress = false;
        return;
      }
      // For sprites larger than 1*1 tile, let clicks in the outer 10% of the
      // circumradius (center-to-corner distance) fall through to the tile beneath.
      const visualW = this.width * this.scale.x;
      const visualH = this.height * this.scale.y;
      if (visualW > this.tileWidth || visualH > this.tileHeight) {
        const circumradius = Math.sqrt((visualW / 2) ** 2 + (visualH / 2) ** 2);
        const dx = evt.worldPos.x - this.pos.x;
        const dy = evt.worldPos.y - this.pos.y;
        if (Math.sqrt(dx * dx + dy * dy) > circumradius * 0.9) return;
      }
      this.onPressed?.(this);
    });

    if (this.selectionTile !== null) {
      const selGraphic = parseTileRef(this.selectionTile);
      const selActor = new ex.Actor({
        anchor: ex.vec(0.5, 0.5),
        scale: ex.vec(
          this.width / this.scale.x / selGraphic.width,
          this.height / this.scale.y / selGraphic.height,
        ),
      });
      selActor.graphics.use(selGraphic);
      selActor.graphics.isVisible = false;
      this.addChild(selActor);
      this.selectionVisuals.push(selActor);
    }

    const ownerLabelActor = makeLabelActor(
      this.ownerName,
      ex.vec(0, this.height),
      {
        anchor: ex.vec(0, 0),
        scale: ex.vec(1 / this.scale.x, 1 / this.scale.y),
        maxWidth: this.width,
      },
    );
    if (ownerLabelActor) {
      this.addChild(ownerLabelActor);
      // World offset: (0, height * scaleY) — directly below the actor.
      this.uprightChildren.push({
        actor: ownerLabelActor,
        wx: 0,
        wy: this.height * this.scale.y,
      });
    }

    this.setupActionButtons();
    if (this.pendingSelect) {
      this.pendingSelect = false;
      for (const v of this.selectionVisuals) v.graphics.isVisible = true;
    }
  }

  /**
   * Keeps every upright child at its fixed world-space offset from the actor
   * center, with zero screen rotation, regardless of this actor's rotation θ.
   *
   * A child at parent-local position (px, py) ends up at world offset:
   *   wx = px·scaleX·cos(θ) − py·scaleY·sin(θ)
   *   wy = px·scaleX·sin(θ) + py·scaleY·cos(θ)
   * Inverting for the desired (wx, wy) gives:
   *   px = (wx·cos(θ) + wy·sin(θ)) / scaleX
   *   py = (−wx·sin(θ) + wy·cos(θ)) / scaleY
   * The child's own rotation is set to −θ so its graphics stay upright.
   */
  private repositionUprightChildren(): void {
    if (this.uprightChildren.length === 0) return;
    const θ = this.rotation;
    const cosθ = Math.cos(θ);
    const sinθ = Math.sin(θ);
    for (const { actor, wx, wy } of this.uprightChildren) {
      actor.pos = ex.vec(
        (wx * cosθ + wy * sinθ) / this.scale.x,
        (-wx * sinθ + wy * cosθ) / this.scale.y,
      );
      actor.rotation = -θ;
    }
  }

  override kill(): void {
    // If killed while mid-flight, Excalibur discards the action queue without
    // firing callMethod callbacks, so the normal cleanup inside moveTo's
    // callback won't run. Clean up the path line here as a safety net.
    this.pathLine?.kill();
    this.pathLine = null;
    super.kill();
  }

  override onPostUpdate(): void {
    this.repositionUprightChildren();
  }

  private setupActionButtons(): void {
    const N = this.actionButtons.length;
    if (N === 0) return;

    const tileW = this.tileWidth;
    const tileH = this.tileHeight;
    const actorVisualW = this.width * this.scale.x;
    const actorVisualH = this.height * this.scale.y;

    // Arc radius: one full tile of clearance beyond the actor's largest
    // half-dimension, so buttons clear the sprite at any angle.
    const R = Math.max(actorVisualW, actorVisualH) / 2 + tileH;

    // Angular step: chord between adjacent button centers = 1.5 * tileW,
    // giving half a tile of visible gap between button edges (each button is
    // 1 tile wide, so edge-to-edge gap = chord - tileW = 0.5 * tileW).
    // For N=1 the step is unused; we place the button straight down.
    const dAngle = N > 1 ? 2 * Math.asin((1.5 * tileW) / (2 * R)) : 0;

    for (let i = 0; i < N; i++) {
      const btn = this.actionButtons[i];

      // Skip buttons with no sprite — world-space buttons are always expected
      // to have a tile, but the unified ButtonDef type makes it optional.
      if (!btn.tile) continue;

      // Angles are symmetric around π/2 (straight down in screen space).
      // i=0 is the leftmost button, i=N-1 is the rightmost.
      const angle = Math.PI / 2 - (i - (N - 1) / 2) * dAngle;

      // Button center in world space (relative to actor center).
      const bxWorld = R * Math.cos(angle);
      const byWorld = R * Math.sin(angle);

      // Children are positioned in the parent's unscaled local space; divide
      // by parent scale to cancel it out and land on the right world position.
      const bxLocal = bxWorld / this.scale.x;
      const byLocal = byWorld / this.scale.y;

      // Graphic is pre-scaled to 1*1 tile; actor scale only compensates for
      // the parent's scale so children render at the correct world-space size.
      const { graphic: btnGraphic, opacity: btnOpacity } = makeButtonGraphic(
        btn,
        btn.disabled ?? false,
        btn.active ?? false,
        tileW,
        tileH,
      );
      const btnActor = new ex.Actor({
        pos: ex.vec(bxLocal, byLocal),
        anchor: ex.vec(0.5, 0.5),
        scale: ex.vec(1 / this.scale.x, 1 / this.scale.y),
      });
      btnActor.graphics.use(btnGraphic);
      btnActor.graphics.opacity = btnOpacity;
      btnActor.graphics.isVisible = false;
      btnActor.on("pointerdown", () => {
        if (!btnActor.graphics.isVisible) return;
        if (btn.disabled) return;
        this.suppressNextPress = true;
        btn.onPressed();
      });
      this.addChild(btnActor);
      this.selectionVisuals.push(btnActor);
      this.uprightChildren.push({ actor: btnActor, wx: bxWorld, wy: byWorld });

      // Badge overlay at the top-right corner of the button.
      if (btn.badge !== undefined) {
        const badgeText = String(btn.badge);
        // Top-right corner in world space: (+tileW/2, -tileH/2) from button center.
        const badgeWx = bxWorld + tileW / 2;
        const badgeWy = byWorld - tileH / 2;
        const badgeActor = makeLabelActor(
          { text: badgeText, bordered: true, fontSize: 8 },
          ex.vec(badgeWx / this.scale.x, badgeWy / this.scale.y),
          {
            anchor: ex.vec(1, 1),
            scale: ex.vec(1 / this.scale.x, 1 / this.scale.y),
            visible: false,
          },
        )!;
        this.addChild(badgeActor);
        this.selectionVisuals.push(badgeActor);
        this.uprightChildren.push({
          actor: badgeActor,
          wx: badgeWx,
          wy: badgeWy,
        });
      }

      // Label top touches the button's visual bottom edge.
      const labelByWorld = byWorld + tileH / 2;
      const labelActor = makeLabelActor(
        btn.label,
        ex.vec(bxLocal, labelByWorld / this.scale.y),
        {
          anchor: ex.vec(0, 0),
          scale: ex.vec(1 / this.scale.x, 1 / this.scale.y),
          visible: false,
        },
      );
      if (labelActor) {
        this.addChild(labelActor);
        this.selectionVisuals.push(labelActor);
        this.uprightChildren.push({
          actor: labelActor,
          wx: bxWorld,
          wy: labelByWorld,
        });
      }
    }
  }
}
