import * as ex from "excalibur";

import { buildTileMap, TileActor } from "./tilemap";

export class MyLevel extends ex.Scene {
  private hasDragged = false;
  private lastScreenPos: ex.Vector | null = null;
  private selectedActor: TileActor | null = null;
  private pendingActor: TileActor | null = null;
  private pinchDistance: number | null = null;

  private resetPointerState(): void {
    this.pendingActor = null;
    this.hasDragged = false;
    this.lastScreenPos = null;
    this.pinchDistance = null;
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

    const onTilePressed = (a: TileActor) => {
      this.pendingActor = a;
    };

    this.add(
      new TileActor({
        tilemap,
        tile: "ss1-base:0",
        col: 48,
        row: 48,
        width: 4,
        height: 4,
        ownerName: "Player One",
        ownerId: "player-1",
        onPressed: onTilePressed,
      }),
    );

    this.add(
      new TileActor({
        tilemap,
        tile: "ss1-damaged:0",
        col: 53,
        row: 49,
        width: 4,
        height: 4,
        ownerName: "Player Two",
        ownerId: "player-2",
        onPressed: onTilePressed,
      }),
    );

    this.add(
      new TileActor({
        tilemap,
        tile: "cs1-base:0",
        col: 50,
        row: 54,
        width: 1,
        height: 1,
        onPressed: onTilePressed,
      }),
    );

    this.add(
      new TileActor({
        tilemap,
        tile: "cs1-moving:0",
        col: 54,
        row: 54,
        width: 1,
        height: 1,
        onPressed: onTilePressed,
      }),
    );

    this.camera.x = mapWidth / 2;
    this.camera.y = mapHeight / 2;
    this.camera.zoom = 1;

    // Capture actual draw dimensions at zoom=1 so viewport.width == drawW.
    // Used directly in clampedPos to avoid depending on camera.viewport being
    // up-to-date mid-frame after a zoom mutation.
    const drawW = this.camera.viewport.width;
    const drawH = this.camera.viewport.height;

    const MIN_ZOOM = Math.max(drawW / mapWidth, drawH / mapHeight);
    const MAX_ZOOM = 4;

    const clampedPos = (
      x: number,
      y: number,
      atZoom = this.camera.zoom,
    ): ex.Vector => {
      const halfW = drawW / (2 * atZoom);
      const halfH = drawH / (2 * atZoom);
      return ex.vec(
        halfW * 2 >= mapWidth
          ? mapWidth / 2
          : ex.clamp(x, halfW, mapWidth - halfW),
        halfH * 2 >= mapHeight
          ? mapHeight / 2
          : ex.clamp(y, halfH, mapHeight - halfH),
      );
    };

    const clampCamera = () => {
      this.camera.zoom = ex.clamp(this.camera.zoom, MIN_ZOOM, MAX_ZOOM);
      const pos = clampedPos(this.camera.x, this.camera.y);
      this.camera.x = pos.x;
      this.camera.y = pos.y;
    };

    const applyPinchZoom = (a: ex.Vector, b: ex.Vector) => {
      const newDist = a.distance(b);
      this.camera.zoom *= newDist / this.pinchDistance!;
      this.pinchDistance = newDist;
      clampCamera();
    };

    const pointer1 = engine.input.pointers.primary;
    const pointer2 = engine.input.pointers.at(1);

    pointer1.on("down", (evt) => {
      this.hasDragged = false;
      this.lastScreenPos = evt.screenPos.clone();
    });

    pointer1.on("move", (evt) => {
      if (!this.lastScreenPos) return;
      if (this.pinchDistance !== null) {
        const p2 = pointer2.lastScreenPos;
        if (p2) applyPinchZoom(evt.screenPos, p2);
        this.lastScreenPos = evt.screenPos.clone();
        return;
      }
      this.hasDragged = true;
      const delta = this.lastScreenPos.sub(evt.screenPos);
      this.camera.x += delta.x / this.camera.zoom;
      this.camera.y += delta.y / this.camera.zoom;
      clampCamera();
      this.lastScreenPos = evt.screenPos.clone();
    });

    pointer1.on("up", () => {
      if (!this.hasDragged) {
        if (this.pendingActor) {
          if (this.selectedActor === this.pendingActor) {
            this.deselectActor();
          } else {
            this.selectActor(this.pendingActor);
            const targetZoom = ex.clamp(
              this.camera.zoom,
              Math.max(MIN_ZOOM, 0.5),
              2,
            );
            const target = clampedPos(
              this.pendingActor.pos.x,
              this.pendingActor.pos.y,
              targetZoom,
            );
            this.camera.move(target, 500, ex.easeInOutCubic);
            if (targetZoom !== this.camera.zoom) {
              this.camera.zoomOverTime(targetZoom, 500, ex.easeInOutCubic);
            }
          }
        } else {
          this.deselectActor();
        }
      }
      this.resetPointerState();
    });

    pointer1.on("cancel", () => {
      this.resetPointerState();
    });

    pointer2.on("down", (evt) => {
      this.pinchDistance = pointer1.lastScreenPos.distance(evt.screenPos);
      this.hasDragged = true;
    });

    pointer2.on("move", (evt) => {
      if (this.pinchDistance === null) return;
      const p1 = pointer1.lastScreenPos;
      if (p1) applyPinchZoom(p1, evt.screenPos);
    });

    const endPinch = () => {
      this.pinchDistance = null;
    };
    pointer2.on("up", endPinch);
    pointer2.on("cancel", endPinch);

    // Trackpad scroll pans; trackpad pinch arrives as wheel + ctrlKey and zooms
    engine.input.pointers.on("wheel", (evt) => {
      if ((evt.ev as WheelEvent).ctrlKey) {
        this.camera.zoom *= 1 - evt.deltaY * 0.01;
      } else {
        this.camera.x += evt.deltaX / this.camera.zoom;
        this.camera.y += evt.deltaY / this.camera.zoom;
      }
      clampCamera();
    });
  }
}
