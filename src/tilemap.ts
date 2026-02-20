import * as ex from "excalibur";

import { invoke } from "@tauri-apps/api/core";

import { Resources } from "./resources";

// "tileset-name" or "tileset-name:tile_id" (tile_id defaults to 0)
export type TileRef = string;

function parseTileRef(ref: TileRef): ex.Graphic {
  const colon = ref.indexOf(":");
  const name = colon === -1 ? ref : ref.slice(0, colon);
  const tileId = colon === -1 ? 0 : parseInt(ref.slice(colon + 1), 10);
  const results = Resources.Tilesets.getTilesetByName(name);
  if (results.length === 0) throw new Error(`Tileset not found: "${name}"`);
  const tileset = results[0];
  const gid = tileset.firstGid + tileId;
  return tileset.getAnimationForGid(gid) ?? tileset.getSpriteForGid(gid);
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

export interface TileActorOptions {
  tile: TileRef;
  tilemap?: ex.TileMap;
  col?: number;
  row?: number;
  width?: number;
  height?: number;
  ownerName?: string;
  ownerId?: string;
  selection?: TileRef | null;
  onPressed?: (actor: TileActor) => void;
}

export class TileActor extends ex.Actor {
  ownerName: string | undefined;
  ownerId: string | undefined;
  private readonly selectionTile: TileRef | null;
  private selection: ex.Actor | null = null;
  private readonly onPressed: ((actor: TileActor) => void) | undefined;

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
  }: TileActorOptions) {
    const graphic = parseTileRef(tile);
    let superArgs: ex.ActorArgs = { anchor: ex.vec(0.5, 0.5) };
    if (tilemap) {
      const w = width ?? graphic.width / tilemap.tileWidth;
      const h = height ?? graphic.height / tilemap.tileHeight;
      superArgs = {
        x: col * tilemap.tileWidth + (w * tilemap.tileWidth) / 2,
        y: row * tilemap.tileHeight + (h * tilemap.tileHeight) / 2,
        width: graphic.width,
        height: graphic.height,
        anchor: ex.vec(0.5, 0.5),
        scale: ex.vec(
          (w * tilemap.tileWidth) / graphic.width,
          (h * tilemap.tileHeight) / graphic.height,
        ),
      };
    }
    super(superArgs);
    this.ownerName = ownerName;
    this.ownerId = ownerId;
    this.selectionTile = selection === undefined ? "ui-selection:0" : selection;
    this.onPressed = onPressed;
    this.graphics.use(graphic);
  }

  select(): void {
    if (this.selection) this.selection.graphics.isVisible = true;
  }

  deselect(): void {
    if (this.selection) this.selection.graphics.isVisible = false;
  }

  override onInitialize(): void {
    this.on("pointerdown", () => this.onPressed?.(this));

    if (this.selectionTile !== null) {
      this.selection = new ex.Actor({ anchor: ex.vec(0.5, 0.5) });
      this.selection.graphics.use(parseTileRef(this.selectionTile));
      this.selection.graphics.isVisible = false;
      this.addChild(this.selection);
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
  }
}
