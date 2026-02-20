import * as ex from "excalibur";

import { Tileset } from "@excaliburjs/plugin-tiled";
import { invoke } from "@tauri-apps/api/core";

import { Resources } from "./resources";

type TilesetRef = Tileset | string | number;

interface TileMapData {
  cols: number;
  rows: number;
  tiles: number[];
}

export function resolveTileset(ref: TilesetRef): Tileset {
  if (ref instanceof Tileset) return ref;
  if (typeof ref === "string") {
    const results = Resources.Tilesets.getTilesetByName(ref);
    if (results.length === 0) throw new Error(`Tileset not found: "${ref}"`);
    return results[0];
  }
  return Resources.Tilesets.getTilesetForTileGid(ref);
}

export async function buildTileMap(
  tilesetRef: TilesetRef,
): Promise<ex.TileMap> {
  const mapData = await invoke<TileMapData>("generate_map");
  const tileset = resolveTileset(tilesetRef);

  const tilemap = new ex.TileMap({
    rows: mapData.rows,
    columns: mapData.cols,
    tileWidth: tileset.tileWidth,
    tileHeight: tileset.tileHeight,
  });

  for (let i = 0; i < mapData.tiles.length; i++) {
    const gid = mapData.tiles[i];
    const col = i % mapData.cols;
    const row = Math.floor(i / mapData.cols);
    const tile = tilemap.getTile(col, row);
    if (!tile) continue;
    const sprite = tileset.getSpriteForGid(gid);
    tile.addGraphic(sprite);
  }

  return tilemap;
}

export interface TileActorOptions {
  tileset: TilesetRef;
  tileId: number;
  tilemap?: ex.TileMap;
  col?: number;
  row?: number;
  width?: number;
  height?: number;
  ownerName?: string;
  ownerId?: string;
}

export class TileActor extends ex.Actor {
  ownerName: string | undefined;
  ownerId: string | undefined;

  constructor({
    tilemap,
    tileset,
    tileId,
    col = 0,
    row = 0,
    width,
    height,
    ownerName,
    ownerId,
  }: TileActorOptions) {
    const resolved = resolveTileset(tileset);
    const gid = resolved.firstGid + tileId;
    const superArgs: ex.ActorArgs = tilemap
      ? (() => {
          const w = width ?? resolved.tileWidth / tilemap.tileWidth;
          const h = height ?? resolved.tileHeight / tilemap.tileHeight;
          return {
            x: col * tilemap.tileWidth + (w * tilemap.tileWidth) / 2,
            y: row * tilemap.tileHeight + (h * tilemap.tileHeight) / 2,
            width: resolved.tileWidth,
            height: resolved.tileHeight,
            anchor: ex.vec(0.5, 0.5),
            scale: ex.vec(
              (w * tilemap.tileWidth) / resolved.tileWidth,
              (h * tilemap.tileHeight) / resolved.tileHeight,
            ),
          };
        })()
      : { anchor: ex.vec(0.5, 0.5) };
    super(superArgs);
    this.ownerName = ownerName;
    this.ownerId = ownerId;
    const graphic =
      resolved.getAnimationForGid(gid) ?? resolved.getSpriteForGid(gid);
    this.graphics.use(graphic);
  }

  override onInitialize(): void {
    if (!this.ownerName) return;

    const labelText = new ex.Text({
      text: this.ownerName,
      maxWidth: this.width,
      font: new ex.Font({
        size: 10,
        color: ex.Color.White,
        textAlign: ex.TextAlign.Center,
        baseAlign: ex.BaseAlign.Top,
      }),
    });

    // Position the label so its top-center sits exactly at the sprite's bottom
    // edge. The child pos is in parent local space (pre-scale), so dividing by
    // scale converts the world-space bottom edge back to local space.
    // The child's own scale counteracts the parent so text renders unscaled.
    const labelActor = new ex.Actor({
      pos: ex.vec(0, this.height),
      scale: ex.vec(1 / this.scale.x, 1 / this.scale.y),
      anchor: ex.vec(0, 0),
    });
    labelActor.graphics.use(labelText);
    this.addChild(labelActor);
  }
}
