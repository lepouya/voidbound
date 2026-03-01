import * as ex from "excalibur";

import { buildTileMap } from "./map-loader";
import { TileActor } from "./tile-actor";
import { TiledScene } from "./tiled-scene";

export class ShipLevel extends TiledScene {
  override onInitialize(engine: ex.Engine): void {
    super.onInitialize(engine);
    this.addHudGroup({
      anchor: "top-right",
      buttons: [
        {
          tile: "ui-button-buy:1",
          width: 48,
          height: 48,
          label: { text: "Shop", labelOffset: ex.vec(0, -1), bordered: false },
          onPressed: () => console.log("shop"),
        },
        {
          tile: "ui-button-events:0",
          width: 32,
          height: 32,
          badge: { text: "@", bordered: false, color: ex.Color.Red },
          label: {
            text: "Events",
            labelOffset: ex.vec(0, -1),
            bordered: false,
          },
          onPressed: () => console.log("events"),
        },
      ],
    });
    this.addHudGroup({
      anchor: "bottom-right",
      buttons: [
        {
          tile: "ui-button-mapview:0",
          width: 64,
          height: 64,
          label: { text: "Map", labelOffset: ex.vec(0, -1), bordered: false },
          onPressed: () => engine.goToScene("map"),
        },
        {
          tile: "ui-button-message:0",
          width: 32,
          height: 32,
          label: {
            text: "Mail",
            labelOffset: ex.vec(0, -1),
            bordered: false,
          },
          onPressed: () => console.log("messages"),
        },
        {
          tile: "ui-button-items:0",
          width: 32,
          height: 32,
          label: { text: "Items", labelOffset: ex.vec(0, -1), bordered: false },
          onPressed: () => console.log("items"),
        },
      ],
    });
  }

  protected override buildMap(): Promise<ex.TileMap> {
    return buildTileMap("ship");
  }

  protected override setupActors(onTilePressed: (a: TileActor) => void): void {
    const commandModule = new TileActor({
      tilemap: this.tilemap,
      tile: "module-base:0",
      col: 13,
      row: 13,
      width: 4,
      height: 4,
      ownerName: "Command Module",
      onPressed: onTilePressed,
    });
    this.add(commandModule);
  }
}
