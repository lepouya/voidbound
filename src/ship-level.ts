import * as ex from "excalibur";

import { buildTileMap } from "./map-loader.ts";
import { TileActor } from "./tile-actor.ts";
import { TiledScene } from "./tiled-scene.ts";

export class ShipLevel extends TiledScene {
  override onInitialize(engine: ex.Engine): void {
    super.onInitialize(engine);
    this.backgroundColor = ex.Color.Black;
    this.addCommonHud({
      frameTile: "ui-frame-square:0",
      activeFrameTile: "ui-frame-square:1",
      disabledFrameTile: "ui-frame-square:2",
      tile: "ui-icon-mapview:0",
      activeTile: "ui-icon-mapview:1",
      disabledTile: "ui-icon-mapview:2",
      width: 64,
      height: 64,
      label: "Map",
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
