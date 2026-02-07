import * as ex from "excalibur";
import { invoke } from "@tauri-apps/api/core";

import { Resources } from "./resources";

interface TileMapData {
  cols: number;
  rows: number;
  tiles: number[];
}

export async function buildTileMap(): Promise<ex.TileMap> {
  const mapData = await invoke<TileMapData>("generate_map");
  const tileset = Resources.Tilesets.getTilesetForTileGid(1);

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
