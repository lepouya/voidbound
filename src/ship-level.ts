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
      edgeFallthrough: this.supportsEmptyTileActor(),
      tile: "module-base:0",
      col: 11,
      row: 11,
      width: 8,
      height: 8,
      ownerName: "Command Module",
      onPressed: onTilePressed,
      badges: [
        { anchor: "top-left", badge: { text: "TL", bordered: false } },
        { anchor: "top-center", badge: { text: "TC", bordered: false } },
        { anchor: "top-right", badge: { text: "TR", bordered: false } },
        { anchor: "middle-left", badge: { text: "ML", bordered: false } },
        { anchor: "middle-center", badge: { text: "MC", bordered: false } },
        { anchor: "middle-right", badge: { text: "MR", bordered: false } },
        { anchor: "bottom-left", badge: { text: "BL", bordered: false } },
        { anchor: "bottom-center", badge: { text: "BC", bordered: false } },
        { anchor: "bottom-right", badge: { text: "BR", bordered: false } },
      ],
    });
    this.add(commandModule);

    const commandModule2 = new TileActor({
      tilemap: this.tilemap,
      edgeFallthrough: this.supportsEmptyTileActor(),
      tile: "module-base:0",
      col: 13,
      row: 6,
      width: 4,
      height: 4,
      ownerName: "Command Module 2",
      onPressed: onTilePressed,
      badges: [
        { anchor: "top-left", badge: { text: "TL", bordered: false } },
        { anchor: "top-center", badge: { text: "TC", bordered: false } },
        { anchor: "top-right", badge: { text: "TR", bordered: false } },
        { anchor: "middle-left", badge: { text: "ML", bordered: false } },
        { anchor: "middle-center", badge: { text: "MC", bordered: false } },
        { anchor: "middle-right", badge: { text: "MR", bordered: false } },
        { anchor: "bottom-left", badge: { text: "BL", bordered: false } },
        { anchor: "bottom-center", badge: { text: "BC", bordered: false } },
        { anchor: "bottom-right", badge: { text: "BR", bordered: false } },
      ],
    });
    this.add(commandModule2);
  }
}
