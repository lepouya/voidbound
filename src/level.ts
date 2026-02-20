import * as ex from "excalibur";

import { buildTileMap, TileActor } from "./tilemap";

export class MyLevel extends ex.Scene {
  private pointerDown = false;
  private hasDragged = false;
  private lastScreenPos: ex.Vector | null = null;
  private selectedActor: ex.Actor | null = null;
  private reticle: TileActor | null = null;
  private pendingActor: ex.Actor | null = null;

  override onInitialize(engine: ex.Engine): void {
    this.setupScene(engine);
  }

  private async setupScene(engine: ex.Engine): Promise<void> {
    const tilemap = await buildTileMap("TestTileset");
    this.add(tilemap);

    // Build the selection reticle from ui-selection tile 0
    this.reticle = new TileActor({ tileset: "ui-selection", tileId: 0 });

    const deselectActor = () => {
      if (this.selectedActor) {
        this.selectedActor.removeChild(this.reticle!);
        this.selectedActor = null;
      }
    };

    const selectActor = (actor: ex.Actor) => {
      deselectActor();
      this.selectedActor = actor;
      actor.addChild(this.reticle!);
    };

    const ss1Actor = new TileActor({
      tilemap,
      tileset: "ss1-base",
      tileId: 0,
      col: 1,
      row: 1,
      width: 4,
      height: 4,
      ownerName: "Player One",
      ownerId: "player-1",
    });
    ss1Actor.on("pointerdown", () => (this.pendingActor = ss1Actor));
    this.add(ss1Actor);

    const ss1DamagedActor = new TileActor({
      tilemap,
      tileset: "ss1-damaged",
      tileId: 0,
      col: 6,
      row: 1,
      width: 4,
      height: 4,
      ownerName: "Player Two",
      ownerId: "player-2",
    });
    ss1DamagedActor.on(
      "pointerdown",
      () => (this.pendingActor = ss1DamagedActor),
    );
    this.add(ss1DamagedActor);

    this.camera.x = engine.halfDrawWidth;
    this.camera.y = engine.halfDrawHeight;
    this.camera.zoom = 1;

    const pointers = engine.input.pointers.primary;

    pointers.on("down", (evt) => {
      this.pointerDown = true;
      this.hasDragged = false;
      this.lastScreenPos = evt.screenPos.clone();
    });

    const mapWidth = tilemap.columns * tilemap.tileWidth;
    const mapHeight = tilemap.rows * tilemap.tileHeight;

    pointers.on("move", (evt) => {
      if (!this.pointerDown || !this.lastScreenPos) return;
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
      if (this.hasDragged) {
        deselectActor();
      } else if (this.pendingActor) {
        if (this.selectedActor === this.pendingActor) {
          deselectActor();
        } else {
          selectActor(this.pendingActor);
        }
      } else {
        deselectActor();
      }
      this.pendingActor = null;
      this.pointerDown = false;
      this.hasDragged = false;
      this.lastScreenPos = null;
    });

    pointers.on("cancel", () => {
      this.pendingActor = null;
      this.pointerDown = false;
      this.hasDragged = false;
      this.lastScreenPos = null;
    });
  }
}
