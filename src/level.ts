import * as ex from "excalibur";

import { buildTileMap, TileActor } from "./tilemap";

export class MyLevel extends ex.Scene {
  private hasDragged = false;
  private lastScreenPos: ex.Vector | null = null;
  private selectedActor: TileActor | null = null;
  private pendingActor: TileActor | null = null;

  private resetPointerState(): void {
    this.pendingActor = null;
    this.hasDragged = false;
    this.lastScreenPos = null;
  }

  private deselectActor(): void {
    if (this.selectedActor) {
      this.selectedActor.deselect();
      this.selectedActor = null;
    }
  }

  private selectActor(actor: TileActor): void {
    this.deselectActor();
    this.selectedActor = actor;
    actor.select();
  }

  override onInitialize(engine: ex.Engine): void {
    this.setupScene(engine);
  }

  private async setupScene(engine: ex.Engine): Promise<void> {
    const tilemap = await buildTileMap();
    this.add(tilemap);

    const mapWidth = tilemap.columns * tilemap.tileWidth;
    const mapHeight = tilemap.rows * tilemap.tileHeight;

    this.add(
      new TileActor({
        tilemap,
        tile: "ss1-base:0",
        col: 1,
        row: 1,
        width: 4,
        height: 4,
        ownerName: "Player One",
        ownerId: "player-1",
        onPressed: (a) => (this.pendingActor = a),
      }),
    );

    this.add(
      new TileActor({
        tilemap,
        tile: "ss1-damaged:0",
        col: 6,
        row: 1,
        width: 4,
        height: 4,
        ownerName: "Player Two",
        ownerId: "player-2",
        onPressed: (a) => (this.pendingActor = a),
      }),
    );

    this.camera.x = engine.halfDrawWidth;
    this.camera.y = engine.halfDrawHeight;
    this.camera.zoom = 1;

    const pointers = engine.input.pointers.primary;

    pointers.on("down", (evt) => {
      this.hasDragged = false;
      this.lastScreenPos = evt.screenPos.clone();
    });

    pointers.on("move", (evt) => {
      if (!this.lastScreenPos) return;
      this.hasDragged = true;
      const delta = this.lastScreenPos.sub(evt.screenPos);
      this.camera.x += delta.x / this.camera.zoom;
      this.camera.y += delta.y / this.camera.zoom;

      const halfW = engine.halfDrawWidth / this.camera.zoom;
      const halfH = engine.halfDrawHeight / this.camera.zoom;
      this.camera.x = ex.clamp(this.camera.x, halfW, mapWidth - halfW);
      this.camera.y = ex.clamp(this.camera.y, halfH, mapHeight - halfH);

      this.lastScreenPos = evt.screenPos.clone();
    });

    pointers.on("up", () => {
      if (!this.hasDragged && this.pendingActor) {
        if (this.selectedActor === this.pendingActor) {
          this.deselectActor();
        } else {
          this.selectActor(this.pendingActor);
        }
      } else {
        this.deselectActor();
      }
      this.resetPointerState();
    });

    pointers.on("cancel", () => {
      this.resetPointerState();
    });
  }
}
