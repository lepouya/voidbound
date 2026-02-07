import * as ex from "excalibur";

import { Player } from "./player";
import { buildTileMap } from "./tilemap";

export class MyLevel extends ex.Scene {
  private dragging = false;
  private lastScreenPos: ex.Vector | null = null;

  override onInitialize(engine: ex.Engine): void {
    this.setupScene(engine);
  }

  private async setupScene(engine: ex.Engine): Promise<void> {
    const tilemap = await buildTileMap();
    this.add(tilemap);

    const player = new Player();
    this.add(player);

    this.camera.x = engine.halfDrawWidth;
    this.camera.y = engine.halfDrawHeight;
    this.camera.zoom = 1;

    const pointers = engine.input.pointers.primary;

    pointers.on("down", (evt) => {
      this.dragging = true;
      this.lastScreenPos = evt.screenPos.clone();
    });

    const mapWidth = tilemap.columns * tilemap.tileWidth;
    const mapHeight = tilemap.rows * tilemap.tileHeight;

    pointers.on("move", (evt) => {
      if (!this.dragging || !this.lastScreenPos) return;
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
      this.dragging = false;
      this.lastScreenPos = null;
    });

    pointers.on("cancel", () => {
      this.dragging = false;
      this.lastScreenPos = null;
    });
  }
}
