import * as ex from "excalibur";

import { invoke } from "@tauri-apps/api/core";

import { TileGridGeometry } from "./grid-math.ts";
import { parseTileRef } from "../ui/index.ts";

interface TileMapData {
  cols: number;
  rows: number;
  tile_width: number;
  tile_height: number;
  tiles: string[];
}

/**
 * Fetch a map's grid geometry without building an ex.TileMap — for
 * geometry-only scenes (ROADMAP P1.9): the full-size space map ships no
 * per-tile content (`tiles` comes back empty), so pre-allocating a million
 * Excalibur Tile objects would buy nothing.
 */
export async function fetchGridGeometry(
  mapType: string,
): Promise<TileGridGeometry> {
  const mapData = await invoke<TileMapData>("generate_map", { mapType });
  return {
    columns: mapData.cols,
    rows: mapData.rows,
    tileWidth: mapData.tile_width,
    tileHeight: mapData.tile_height,
  };
}

/**
 * Scale a graphic to fill a tile cell of the given pixel dimensions.
 *
 * Sprites are cloned before scaling to avoid mutating the shared registry
 * instance (which would affect every other consumer of that sprite).
 * GraphicsGroups are created fresh by parseTileRef and Animations are
 * constructed fresh by every getGraphic call, so both are safe to scale
 * in-place.
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
