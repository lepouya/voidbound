import * as ex from "excalibur";

import { invoke } from "@tauri-apps/api/core";

import { parseTileRef } from "./ui";

interface TileMapData {
  cols: number;
  rows: number;
  tile_width: number;
  tile_height: number;
  tiles: string[];
}

/**
 * Scale a graphic to fill a tile cell of the given pixel dimensions.
 *
 * Sprites are cloned before scaling to avoid mutating the shared registry
 * instance (which would affect every other consumer of that sprite).
 * GraphicsGroups are created fresh by parseTileRef so they are safe to
 * mutate in-place. Animations share a cached instance — scaling them here
 * mutates the shared object and affects all other consumers of that animation.
 */
function fitToTile(
  graphic: ex.Graphic,
  tileWidth: number,
  tileHeight: number,
): ex.Graphic {
  const sx = tileWidth / graphic.width;
  const sy = tileHeight / graphic.height;
  if (Math.abs(sx - 1) < 1e-6 && Math.abs(sy - 1) < 1e-6) return graphic;
  const g = graphic instanceof ex.Sprite ? graphic.clone() : graphic;
  g.scale = ex.vec(sx, sy);
  return g;
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
    if (!tileRef) continue;
    const tile = tilemap.getTile(
      i % mapData.cols,
      Math.floor(i / mapData.cols),
    );
    if (!tile) continue;
    tile.addGraphic(
      fitToTile(parseTileRef(tileRef), mapData.tile_width, mapData.tile_height),
    );
  }

  return tilemap;
}
