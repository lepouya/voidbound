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

function resolveTileset(ref: TilesetRef): Tileset {
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
  col: number;
  row: number;
  width?: number;
  height?: number;
}

export function createTileActor(
  tilemap: ex.TileMap,
  options: TileActorOptions,
): ex.Actor {
  const { tileset, tileId, col, row } = options;
  const resolved = resolveTileset(tileset);
  const gid = resolved.firstGid + tileId;
  const graphic =
    resolved.getAnimationForGid(gid) ?? resolved.getSpriteForGid(gid);
  const w = options.width ?? resolved.tileWidth / tilemap.tileWidth;
  const h = options.height ?? resolved.tileHeight / tilemap.tileHeight;
  const scaleX = (w * tilemap.tileWidth) / resolved.tileWidth;
  const scaleY = (h * tilemap.tileHeight) / resolved.tileHeight;
  const actor = new ex.Actor({
    x: col * tilemap.tileWidth + (w * tilemap.tileWidth) / 2,
    y: row * tilemap.tileHeight + (h * tilemap.tileHeight) / 2,
    anchor: ex.vec(0.5, 0.5),
    scale: ex.vec(scaleX, scaleY),
  });
  actor.graphics.use(graphic);
  return actor;
}
