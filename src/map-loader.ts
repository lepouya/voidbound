import * as ex from "excalibur";

import { invoke } from "@tauri-apps/api/core";

import { parseTileRef } from "./tile-actor";

interface TileMapData {
  cols: number;
  rows: number;
  tile_width: number;
  tile_height: number;
  tiles: string[];
}

export async function buildTileMap(mapType: string): Promise<ex.TileMap> {
  const mapData = await invoke<TileMapData>("generate_map", { mapType });

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
