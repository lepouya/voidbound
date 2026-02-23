import * as ex from "excalibur";

import { buildTileMap } from "./map-loader";
import { TileActor } from "./tile-actor";
import { TiledScene } from "./tiled-scene";

export class ShipLevel extends TiledScene {
  protected override buildMap(): Promise<ex.TileMap> {
    return buildTileMap("ship");
  }

  protected override setupActors(
    _onTilePressed: (a: TileActor) => void,
  ): void {
    // Ship compartment actors will be added here.
  }
}
