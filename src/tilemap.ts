import * as ex from "excalibur";

import { invoke } from "@tauri-apps/api/core";

import { Resources } from "./resources";

// "tileset-name" or "tileset-name:tile_id" (tile_id defaults to 0)
export type TileRef = string;

function parseTileRef(ref: TileRef): ex.Graphic {
  const colon = ref.indexOf(":");
  const name = colon === -1 ? ref : ref.slice(0, colon);
  const tileId = colon === -1 ? 0 : parseInt(ref.slice(colon + 1), 10);
  return Resources.Tilesets.getGraphic(name, tileId);
}

interface TileMapData {
  cols: number;
  rows: number;
  tile_width: number;
  tile_height: number;
  tiles: string[];
}

export async function buildTileMap(): Promise<ex.TileMap> {
  const mapData = await invoke<TileMapData>("generate_map");

  const tilemap = new ex.TileMap({
    rows: mapData.rows,
    columns: mapData.cols,
    tileWidth: mapData.tile_width,
    tileHeight: mapData.tile_height,
  });

  for (const [i, tileRef] of mapData.tiles.entries()) {
    const tile = tilemap.getTile(
      i % mapData.cols,
      Math.floor(i / mapData.cols),
    );
    if (!tile) continue;
    tile.addGraphic(parseTileRef(tileRef));
  }

  return tilemap;
}

/** A single action button shown in the arc when a TileActor is selected. */
export interface ActionButton {
  /** Graphic sprite for the button, in TileRef format ("tileset-name:tile_id"). */
  tile: TileRef;
  /** Optional label text shown beneath the button. */
  label?: string;
  /** Called when the button is pressed. */
  onPressed: () => void;
}

export interface TileActorOptions {
  tile: TileRef;
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
  buttons?: ActionButton[];
}

export class TileActor extends ex.Actor {
  ownerName: string | undefined;
  ownerId: string | undefined;
  private readonly selectionTile: TileRef | null;
  private readonly onPressed: ((actor: TileActor) => void) | undefined;
  private readonly actionButtons: ActionButton[];
  private readonly tileWidth: number;
  private readonly tileHeight: number;
  // All selection-dependent actors: the selection ring and every action button
  // sprite/label. Toggled together in select() / deselect().
  private readonly selectionVisuals: ex.Actor[] = [];
  // Set by a button child's pointerdown to prevent the parent from treating
  // the same press as a tap on the actor body.
  private suppressNextPress = false;

  constructor({
    tilemap,
    tile,
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
    const graphic = parseTileRef(tile);
    const w = width ?? graphic.width / tilemap.tileWidth;
    const h = height ?? graphic.height / tilemap.tileHeight;
    super({
      x: col * tilemap.tileWidth + (w * tilemap.tileWidth) / 2,
      y: row * tilemap.tileHeight + (h * tilemap.tileHeight) / 2,
      width: graphic.width,
      height: graphic.height,
      anchor: ex.vec(0.5, 0.5),
      scale: ex.vec(
        (w * tilemap.tileWidth) / graphic.width,
        (h * tilemap.tileHeight) / graphic.height,
      ),
    });
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
    for (const v of this.selectionVisuals) v.graphics.isVisible = true;
  }

  deselect(): void {
    this.suppressNextPress = false;
    for (const v of this.selectionVisuals) v.graphics.isVisible = false;
  }

  override onInitialize(): void {
    this.on("pointerdown", () => {
      if (this.suppressNextPress) {
        this.suppressNextPress = false;
        return;
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

    if (this.ownerName !== undefined) {
      const labelActor = new ex.Actor({
        pos: ex.vec(0, this.height),
        scale: ex.vec(1 / this.scale.x, 1 / this.scale.y),
        anchor: ex.vec(0, 0),
      });
      labelActor.graphics.use(
        new ex.Text({
          text: this.ownerName,
          maxWidth: this.width,
          font: new ex.Font({
            size: 10,
            color: ex.Color.White,
            textAlign: ex.TextAlign.Center,
            baseAlign: ex.BaseAlign.Top,
          }),
        }),
      );
      this.addChild(labelActor);
    }

    this.setupActionButtons();
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

      // Angles are symmetric around π/2 (straight down in screen space).
      // i=0 is the rightmost button, i=N-1 is the leftmost.
      const angle = Math.PI / 2 + (i - (N - 1) / 2) * dAngle;

      // Button center in world space (relative to actor center).
      const bxWorld = R * Math.cos(angle);
      const byWorld = R * Math.sin(angle);

      // Children are positioned in the parent's unscaled local space; divide
      // by parent scale to cancel it out and land on the right world position.
      const bxLocal = bxWorld / this.scale.x;
      const byLocal = byWorld / this.scale.y;

      const btnGraphic = parseTileRef(btn.tile);

      // Scale so the button renders at exactly 1*1 tile in world space,
      // regardless of the parent actor's scale.
      // World visual size = btnGraphic.size * btnScale * parentScale = tileSize
      // → btnScale = tileSize / (btnGraphic.size * parentScale)
      const btnScaleX = tileW / (btnGraphic.width * this.scale.x);
      const btnScaleY = tileH / (btnGraphic.height * this.scale.y);

      const btnActor = new ex.Actor({
        pos: ex.vec(bxLocal, byLocal),
        anchor: ex.vec(0.5, 0.5),
        scale: ex.vec(btnScaleX, btnScaleY),
      });
      btnActor.graphics.use(btnGraphic);
      btnActor.graphics.isVisible = false;
      btnActor.on("pointerdown", () => {
        if (!btnActor.graphics.isVisible) return;
        this.suppressNextPress = true;
        btn.onPressed();
      });
      this.addChild(btnActor);
      this.selectionVisuals.push(btnActor);

      if (btn.label) {
        // Label top touches the button's visual bottom edge.
        const labelByWorld = byWorld + tileH / 2;
        const labelActor = new ex.Actor({
          pos: ex.vec(bxLocal, labelByWorld / this.scale.y),
          anchor: ex.vec(0, 0),
          scale: ex.vec(1 / this.scale.x, 1 / this.scale.y),
        });
        labelActor.graphics.use(
          new ex.Text({
            text: btn.label,
            font: new ex.Font({
              size: 10,
              color: ex.Color.White,
              textAlign: ex.TextAlign.Center,
              baseAlign: ex.BaseAlign.Top,
            }),
          }),
        );
        labelActor.graphics.isVisible = false;
        this.addChild(labelActor);
        this.selectionVisuals.push(labelActor);
      }
    }
  }
}
