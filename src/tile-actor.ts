import * as ex from "excalibur";

import { TileGridGeometry } from "./grid-math.ts";
import {
  anchorFractions,
  ButtonDef,
  LABEL_PAD,
  makeBadgeActor,
  makeButtonGraphic,
  makeLabelActor,
  makePathLine,
  parseTileRef,
  resolveButtonLabel,
  resolveGraphicLayers,
  TileActorBadgeDef,
  TileRef,
} from "./ui/index.ts";

export interface TileActorOptions {
  /**
   * Sprite to display. Pass null/undefined for an invisible (empty) tile actor.
   * Accepts a single TileRef (string or TileLayerDef) or an array of TileRefs
   * that are composited in painter's order (bottom → top).
   */
  tile?: TileRef | TileRef[] | null;
  /**
   * Sprite to display while the actor is in motion. Same format as tile.
   * Falls back to the base tile graphic on arrival.
   */
  movingTile?: TileRef | TileRef[] | null;
  /** The scene's grid geometry — only the tile size is read. An ex.TileMap
   *  satisfies this structurally (TiledScene passes its `grid` either way). */
  grid: TileGridGeometry;
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
  /** Badges rendered at fixed corners/edges of the actor sprite. Always visible. */
  badges?: TileActorBadgeDef[];
  /**
   * Allow clicks in the outer 10% of the circumradius to fall through to the
   * empty-tile handler. Set to false in scenes that have no empty tile actor
   * so edge clicks still select this actor. Default: true.
   */
  edgeFallthrough?: boolean;
}

export class TileActor extends ex.Actor {
  // Update via setOwner() — label graphics are baked at creation time, so
  // assigning these fields directly has no visible effect once initialized.
  ownerName: string | undefined;
  ownerId: string | undefined;
  readonly col: number;
  readonly row: number;
  /** Actor width in tiles. */
  readonly colSpan: number;
  /** Actor height in tiles. */
  readonly rowSpan: number;
  private baseGraphic: ex.Graphic;
  private readonly movingGraphic: ex.Graphic | null;
  private readonly selectionTile: TileRef | null;
  private readonly onPressed: ((actor: TileActor) => void) | undefined;
  private readonly actionButtons: ButtonDef[];
  private readonly actorBadges: TileActorBadgeDef[];
  private readonly edgeFallthrough: boolean;
  private readonly tileWidth: number;
  private readonly tileHeight: number;
  // All selection-dependent actors: the selection ring and every action button
  // sprite/label. Toggled together in select() / deselect().
  private readonly selectionVisuals: ex.Actor[] = [];
  // Set by a button child's pointerdown to prevent the parent from treating
  // the same press as a tap on the actor body.
  private suppressNextPress = false;
  // Button pressed during the current tap. Fired by TiledScene on tap
  // confirmation (pointer-up without drag) via takePendingButton().
  private pendingButton: ButtonDef | null = null;
  // select() called before onInitialize sets this flag; onInitialize applies it.
  private pendingSelect = false;
  // Child actors that must stay upright (zero screen rotation) at a fixed
  // world-space offset from the actor center, regardless of this actor's
  // rotation. Each entry stores the target world offset (wx, wy) in px.
  // Populated in onInitialize(), setupActionButtons(), and setupBadges().
  private readonly uprightChildren: Array<{
    actor: ex.Actor;
    wx: number;
    wy: number;
  }> = [];
  // Sibling scene actor drawn while this actor is in motion; killed on arrival
  // or when a new moveTo() supersedes the previous one.
  private pathLine: ex.Actor | null = null;
  // Current owner-label child's uprightChildren entry, so setOwner() can
  // remove and rebuild it.
  private ownerLabel: { actor: ex.Actor; wx: number; wy: number } | null = null;
  // Per-button label slots (keyed by the index into the constructor's
  // `buttons` array), so setButtonLabel() can rebuild a single label — label
  // graphics are baked at creation time, like the owner label.
  private readonly buttonLabels = new Map<
    number,
    { btnActor: ex.Actor; labelActor: ex.Actor | null; text: string }
  >();

  constructor({
    grid,
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
    badges = [],
    edgeFallthrough = true,
  }: TileActorOptions) {
    let graphic: ex.Graphic;
    let w: number;
    let h: number;
    if (tile != null) {
      graphic = resolveGraphicLayers(tile);
      w = width ?? graphic.width / grid.tileWidth;
      h = height ?? graphic.height / grid.tileHeight;
    } else {
      w = width ?? 1;
      h = height ?? 1;
      graphic = new ex.Rectangle({
        width: w * grid.tileWidth,
        height: h * grid.tileHeight,
        color: ex.Color.Transparent,
      });
    }
    super({
      x: col * grid.tileWidth + (w * grid.tileWidth) / 2,
      y: row * grid.tileHeight + (h * grid.tileHeight) / 2,
      width: graphic.width,
      height: graphic.height,
      anchor: ex.vec(0.5, 0.5),
      z: 2,
      scale: ex.vec(
        (w * grid.tileWidth) / graphic.width,
        (h * grid.tileHeight) / graphic.height,
      ),
    });
    this.col = col;
    this.row = row;
    this.colSpan = w;
    this.rowSpan = h;
    this.baseGraphic = graphic;
    this.movingGraphic = movingTile != null
      ? resolveGraphicLayers(movingTile)
      : null;
    this.ownerName = ownerName;
    this.ownerId = ownerId;
    this.selectionTile = selection === undefined ? "ui-selection:0" : selection;
    this.onPressed = onPressed;
    this.actionButtons = buttons;
    this.tileWidth = grid.tileWidth;
    this.tileHeight = grid.tileHeight;
    this.actorBadges = badges;
    this.edgeFallthrough = edgeFallthrough;
    this.graphics.use(graphic);
  }

  private setSelectionVisible(visible: boolean): void {
    for (const v of this.selectionVisuals) {
      v.graphics.isVisible = visible;
      for (const c of v.children) (c as ex.Actor).graphics.isVisible = visible;
    }
  }

  select(): void {
    if (this.selectionVisuals.length === 0) {
      // onInitialize hasn't run yet; defer until it does.
      this.pendingSelect = true;
      return;
    }
    this.setSelectionVisible(true);
  }

  deselect(): void {
    this.pendingSelect = false;
    this.suppressNextPress = false;
    this.pendingButton = null;
    this.setSelectionVisible(false);
  }

  /**
   * Returns and clears the action button pressed during the current tap, if
   * any. TiledScene calls this on tap confirmation (pointer-up without drag)
   * to fire the button, and on pointer reset to discard a press that turned
   * into a drag.
   */
  takePendingButton(): ButtonDef | null {
    const btn = this.pendingButton;
    this.pendingButton = null;
    return btn;
  }

  /**
   * Replace the base tile graphic after construction — e.g. swapping an
   * under-construction ghost for the finished module sprite. The replacement
   * must have the same pixel dimensions as the construction-time tile: the
   * actor's scale was baked from it and is not recomputed. If the actor is
   * mid-moveTo showing movingTile, the new base appears on arrival.
   */
  setTile(tile: TileRef | TileRef[]): void {
    this.baseGraphic = resolveGraphicLayers(tile);
    if (this.graphics.current !== this.movingGraphic) {
      this.graphics.use(this.baseGraphic);
    }
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
      // Only applies when the scene has an empty tile actor to receive the click.
      if (this.edgeFallthrough) {
        const visualW = this.width;
        const visualH = this.height;
        if (visualW > this.tileWidth || visualH > this.tileHeight) {
          const circumradius = Math.sqrt(
            (visualW / 2) ** 2 + (visualH / 2) ** 2,
          );
          const dx = evt.worldPos.x - this.pos.x;
          const dy = evt.worldPos.y - this.pos.y;
          if (Math.sqrt(dx * dx + dy * dy) > circumradius * 0.9) return;
        }
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

    this.rebuildOwnerLabel();

    this.setupActionButtons();
    this.setupBadges();
    // Apply correct initial positions for all upright children so they don't
    // spend one frame at (0,0) before the first onPostUpdate runs.
    this.repositionUprightChildren();
    if (this.pendingSelect) {
      this.pendingSelect = false;
      this.select();
    }
  }

  /**
   * Update the owner identity after construction — e.g. when the shared game
   * state finishes loading from the backend and the placeholder identity is
   * replaced. Rebuilds the owner label child, since label graphics are baked
   * at creation time.
   */
  setOwner(ownerName: string | undefined, ownerId: string | undefined): void {
    if (ownerName === this.ownerName && ownerId === this.ownerId) return;
    this.ownerName = ownerName;
    this.ownerId = ownerId;
    // Not initialized yet: onInitialize will bake the updated fields.
    if (this.isInitialized) this.rebuildOwnerLabel();
  }

  /** (Re)creates the owner-name label child from the current ownerName. */
  private rebuildOwnerLabel(): void {
    if (this.ownerLabel) {
      this.removeChild(this.ownerLabel.actor);
      this.ownerLabel.actor.kill();
      const idx = this.uprightChildren.indexOf(this.ownerLabel);
      if (idx !== -1) this.uprightChildren.splice(idx, 1);
      this.ownerLabel = null;
    }
    const labelActor = makeLabelActor(this.ownerName, ex.vec(0, 0), {
      anchor: "top-center",
      scale: ex.vec(1 / this.scale.x, 1 / this.scale.y),
    });
    if (!labelActor) return;
    this.addChild(labelActor);
    // World offset: just below the actor sprite, with consistent padding.
    this.ownerLabel = {
      actor: labelActor,
      wx: 0,
      wy: this.height / 2 + LABEL_PAD,
    };
    this.uprightChildren.push(this.ownerLabel);
    // Place immediately so the label doesn't spend a frame at (0,0).
    this.repositionUprightChildren();
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

  private setupBadges(): void {
    if (this.actorBadges.length === 0) return;
    const badgeScale = ex.vec(1 / this.scale.x, 1 / this.scale.y);

    for (const badgeDef of this.actorBadges) {
      const { hFrac, vFrac } = anchorFractions(badgeDef.anchor);
      const wx = (hFrac - 0.5) * this.width + (badgeDef.offset?.x ?? 0);
      const wy = (vFrac - 0.5) * this.height + (badgeDef.offset?.y ?? 0);

      const badgeActor = makeBadgeActor(badgeDef.badge, ex.vec(0, 0), {
        anchor: badgeDef.anchor,
        scale: badgeScale,
      });

      this.addChild(badgeActor);
      this.uprightChildren.push({ actor: badgeActor, wx, wy });
    }
  }

  private setupActionButtons(): void {
    // World-space buttons are expected to have a tile; skip any that don't so
    // they don't leave ghost gaps in the arc layout.
    const buttons = this.actionButtons.filter((b) => b.tile);
    const N = buttons.length;
    if (N === 0) return;

    const tileW = this.tileWidth;
    const tileH = this.tileHeight;
    const actorVisualW = this.width;
    const actorVisualH = this.height;

    // Arc radius: one full tile of clearance beyond the actor's largest
    // half-dimension, so buttons clear the sprite at any angle.
    const R = Math.max(actorVisualW, actorVisualH) / 2 + tileH;

    // Angular step: chord between adjacent button centers = 1.5 * tileW,
    // giving half a tile of visible gap between button edges (each button is
    // 1 tile wide, so edge-to-edge gap = chord - tileW = 0.5 * tileW).
    // For N=1 the step is unused; we place the button straight down.
    const dAngle = N > 1 ? 2 * Math.asin((1.5 * tileW) / (2 * R)) : 0;

    for (let i = 0; i < N; i++) {
      const btn = buttons[i];

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
        // Defer firing to the scene's tap confirmation so starting a
        // drag-to-pan on a visible button doesn't trigger its action.
        this.pendingButton = btn;
      });
      this.addChild(btnActor);
      this.selectionVisuals.push(btnActor);
      this.uprightChildren.push({ actor: btnActor, wx: bxWorld, wy: byWorld });

      // Badge and label are children of btnActor, not of TileActor.
      // btnActor.scale = 1/S cancels TileActor.scale = S, so children use
      // scale (1,1) and positions are simply in world-pixel units relative to
      // the button center. Rotation correction cascades from btnActor, so no
      // uprightChildren entries are needed for either child.

      // Badge at the button's top-right corner.
      if (btn.badge !== undefined) {
        btnActor.addChild(
          makeBadgeActor(btn.badge, ex.vec(tileW / 2, -tileH / 2), {
            visible: false,
          }),
        );
      }

      // Label below the button, top-center aligned on the button center x.
      const labelDef = resolveButtonLabel(btn.label);
      const labelActor = makeLabelActor(
        labelDef,
        ex.vec(0, tileH / 2 + LABEL_PAD),
        { visible: false },
      );
      if (labelActor) btnActor.addChild(labelActor);
      this.buttonLabels.set(this.actionButtons.indexOf(btn), {
        btnActor,
        labelActor: labelActor ?? null,
        text: labelDef?.text ?? "",
      });
    }
  }

  /**
   * Replace one action button's label text after construction — e.g. a
   * countdown ticking on a timed action's button. `index` addresses the
   * constructor's `buttons` array. Rebuilds just that label child (graphics
   * are baked at creation, like the owner label), preserving the current
   * selection visibility. No-ops until the text actually changes, so calling
   * every frame is fine.
   */
  setButtonLabel(index: number, text: string): void {
    const slot = this.buttonLabels.get(index);
    if (!slot || slot.text === text) return;
    slot.text = text;
    const visible = slot.labelActor?.graphics.isVisible ??
      slot.btnActor.graphics.isVisible;
    if (slot.labelActor) {
      slot.btnActor.removeChild(slot.labelActor);
      slot.labelActor.kill();
    }
    const labelActor = makeLabelActor(
      resolveButtonLabel(text),
      ex.vec(0, this.tileHeight / 2 + LABEL_PAD),
      { visible },
    );
    if (labelActor) slot.btnActor.addChild(labelActor);
    slot.labelActor = labelActor ?? null;
  }
}
