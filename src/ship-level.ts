import * as ex from "excalibur";

import { buildTileMap } from "./map-loader";
import { TileActor } from "./tile-actor";
import { TiledScene } from "./tiled-scene";

export class ShipLevel extends TiledScene {
  override onInitialize(engine: ex.Engine): void {
    super.onInitialize(engine);
    this.backgroundColor = ex.Color.Black;
    this.addCommonHud({
      tile: "ui-button-mapview:0",
      width: 64,
      height: 64,
      label: { text: "Map", labelOffset: ex.vec(0, -1), bordered: false },
      onPressed: () => engine.goToScene("map"),
    });
  }

  protected override buildMap(): Promise<ex.TileMap> {
    return buildTileMap("ship");
  }

  protected override setupActors(onTilePressed: (a: TileActor) => void): void {
    const commandModule = new TileActor({
      tilemap: this.tilemap,
      edgeFallthrough: this.supportsEmptyTileActor(),
      tile: "module-base:0",
      col: 18, // (40 - 4) / 2 — centered on the 40*40 map
      row: 18,
      width: 4,
      height: 4,
      ownerName: "Command Module",
      selection: "ui-selection-2",
      onPressed: onTilePressed,
      badges: [
        {
          anchor: "bottom-left",
          badge: { text: "2", backgroundColor: ex.Color.ExcaliburBlue },
        },
      ],
    });
    this.add(commandModule);
  }
}
