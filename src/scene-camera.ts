import * as ex from "excalibur";

import { anchoredZoomPos } from "./camera-math.ts";

/**
 * Owns the clamped-zoom/pan camera math shared by every TiledScene: keeps
 * the camera within map bounds at the current zoom, and anchors wheel/pinch
 * zoom at the pointer instead of the screen center (ROADMAP P1.8). Mutates
 * the ex.Camera it's given directly — it has no Excalibur lifecycle of its
 * own, so TiledScene drives it from onInitialize/setupScene/handleResize.
 */
export class SceneCamera {
  private static readonly MAX_ZOOM = 4;

  private mapWidth = 0;
  private mapHeight = 0;
  private drawW = 0;
  private drawH = 0;
  private minZoom = 0;

  constructor(
    private readonly camera: ex.Camera,
    /** Lowest zoom this scene allows regardless of what fits on screen — see
     *  TiledScene.minZoomFloor(). */
    private readonly minZoomFloor: () => number,
  ) {}

  setMapSize(width: number, height: number): void {
    this.mapWidth = width;
    this.mapHeight = height;
  }

  /**
   * Recompute the zoom-1 draw dimensions and the resulting minimum zoom.
   * screen.resolution is the zoom-1 draw size (screen.drawWidth divides by
   * the current camera zoom), which is the baseline clampedPos expects.
   */
  recomputeViewBounds(engine: ex.Engine): void {
    this.drawW = engine.screen.resolution.width;
    this.drawH = engine.screen.resolution.height;
    this.minZoom = Math.max(
      this.drawW / this.mapWidth,
      this.drawH / this.mapHeight,
      this.minZoomFloor(),
    );
  }

  clampedPos(x: number, y: number, atZoom = this.camera.zoom): ex.Vector {
    const halfW = this.drawW / (2 * atZoom);
    const halfH = this.drawH / (2 * atZoom);
    return ex.vec(
      halfW * 2 >= this.mapWidth
        ? this.mapWidth / 2
        : ex.clamp(x, halfW, this.mapWidth - halfW),
      halfH * 2 >= this.mapHeight
        ? this.mapHeight / 2
        : ex.clamp(y, halfH, this.mapHeight - halfH),
    );
  }

  clampCamera(): void {
    this.camera.zoom = ex.clamp(
      this.camera.zoom,
      this.minZoom,
      SceneCamera.MAX_ZOOM,
    );
    const pos = this.clampedPos(this.camera.x, this.camera.y);
    this.camera.x = pos.x;
    this.camera.y = pos.y;
  }

  /**
   * Set the camera zoom (clamped) while keeping the world point
   * `anchorWorld` fixed on screen, so wheel and pinch zoom anchor at the
   * pointer instead of the screen center (ROADMAP P1.8). The anchor may be
   * up to one frame stale (the camera transform behind screenToWorld /
   * WheelEvent world coords only refreshes per frame), but the resulting
   * camera error scales by 1 − oldZoom/newZoom — sub-pixel per event.
   */
  zoomAtAnchor(anchorWorld: ex.Vector, newZoom: number): void {
    const zoom = ex.clamp(newZoom, this.minZoom, SceneCamera.MAX_ZOOM);
    const pos = anchoredZoomPos(
      anchorWorld,
      this.camera.pos,
      this.camera.zoom,
      zoom,
    );
    this.camera.zoom = zoom;
    this.camera.x = pos.x;
    this.camera.y = pos.y;
    this.clampCamera();
  }

  /** Pan the camera by a screen-space delta, already zoom-scaled. */
  pan(deltaScreenX: number, deltaScreenY: number): void {
    this.camera.x += deltaScreenX / this.camera.zoom;
    this.camera.y += deltaScreenY / this.camera.zoom;
    this.clampCamera();
  }

  resetTo(target: { pos: ex.Vector; zoom: number }): void {
    this.camera.x = target.pos.x;
    this.camera.y = target.pos.y;
    this.camera.zoom = target.zoom;
    this.clampCamera();
  }

  /** Animate the camera to the given world position, clamped to the map
   *  bounds at the current zoom — e.g. the minimap's tap-to-jump. */
  panTo(x: number, y: number): void {
    this.camera.move(this.clampedPos(x, y), 400, ex.easeInOutCubic);
  }

  /** Animate the camera toward `pos`, clamped at `targetZoom`, zooming there
   *  too if it differs from the current zoom — e.g. focusing a tapped actor. */
  focusOn(pos: ex.Vector, targetZoom: number): void {
    const zoom = ex.clamp(targetZoom, Math.max(this.minZoom, 0.5), 2);
    const target = this.clampedPos(pos.x, pos.y, zoom);
    this.camera.move(target, 500, ex.easeInOutCubic);
    if (zoom !== this.camera.zoom) {
      this.camera.zoomOverTime(zoom, 500, ex.easeInOutCubic);
    }
  }

  get zoom(): number {
    return this.camera.zoom;
  }
}
