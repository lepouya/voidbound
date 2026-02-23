import * as ex from "excalibur";

import { buildTileMap } from "./map-loader";
import { TileActor } from "./tile-actor";
import { TiledScene } from "./tiled-scene";

export class MapLevel extends TiledScene {
  protected override buildMap(): Promise<ex.TileMap> {
    return buildTileMap("space");
  }

  protected override setupActors(
    onTilePressed: (a: TileActor) => void,
  ): void {
    this.add(
      new TileActor({
        tilemap: this.tilemap,
        tile: "ss1-base:0",
        col: 48,
        row: 48,
        width: 4,
        height: 4,
        ownerName: "My Spaceship",
        ownerId: "player-1",
        onPressed: onTilePressed,
        buttons: [
          {
            tile: "ui-button-details:0",
            label: "Details",
            onPressed: () => console.log("Details my spaceship"),
          },
          {
            tile: "ui-button-enter:0",
            label: "Enter",
            onPressed: () => console.log("Enter my spaceship"),
          },
          {
            tile: "ui-button-upgrade:0",
            label: "Upgrade",
            onPressed: () => console.log("Upgrade my spaceship"),
          },
          {
            tile: "ui-button-warp:0",
            label: "Move",
            onPressed: () => console.log("Move my spaceship"),
          },
        ],
      }),
    );

    this.add(
      new TileActor({
        tilemap: this.tilemap,
        tile: "ss1-damaged:0",
        col: 53,
        row: 49,
        width: 4,
        height: 4,
        ownerName: "Enemy Spaceship",
        ownerId: "player-2",
        onPressed: onTilePressed,
        buttons: [
          {
            tile: "ui-button-details:0",
            label: "Details",
            onPressed: () => console.log("Details enemy spaceship"),
          },
          {
            tile: "ui-button-message:0",
            label: "Message",
            onPressed: () => console.log("Message enemy spaceship"),
          },
          {
            tile: "ui-button-attack:0",
            label: "Attack",
            onPressed: () => console.log("Attack enemy spaceship"),
          },
        ],
      }),
    );

    const cargoButtons = [
      {
        tile: "ui-button-details:0",
        label: "Details",
        onPressed: () => console.log("Details cargo ship"),
      },
      {
        tile: "ui-button-back:0",
        label: "Return",
        onPressed: () => console.log("Return cargo ship"),
      },
    ];

    this.add(
      new TileActor({
        tilemap: this.tilemap,
        tile: "cs1-base:0",
        col: 50,
        row: 54,
        width: 1,
        height: 1,
        onPressed: onTilePressed,
        buttons: cargoButtons,
      }),
    );

    this.add(
      new TileActor({
        tilemap: this.tilemap,
        tile: "cs1-moving:0",
        col: 54,
        row: 54,
        width: 1,
        height: 1,
        onPressed: onTilePressed,
        buttons: cargoButtons,
      }),
    );
  }

  protected override createEmptyTileActor(
    col: number,
    row: number,
    onPressed: (a: TileActor) => void,
  ): TileActor {
    return new TileActor({
      tilemap: this.tilemap,
      col,
      row,
      onPressed,
      buttons: [
        {
          tile: "ui-button-warp:0",
          label: "Move",
          onPressed: () => console.log("Move empty tile"),
        },
        {
          tile: "ui-button-deploy:0",
          label: "Deploy",
          onPressed: () => console.log("Deploy empty tile"),
        },
      ],
    });
  }
}
