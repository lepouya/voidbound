import * as ex from "excalibur";

import { HudGroupDef, HudGroupHandle, spawnHudGroup } from "./hud";
import { TileActor } from "./tile-actor";

/**
 * Abstract base scene for any level that displays a tile-based map with
 * drag-to-pan, pinch/scroll-to-zoom, and tap-to-select TileActor support.
 *
 * Subclasses must implement:
 *   buildMap()    – return the ex.TileMap appropriate for this level
 *   setupActors() – add TileActors to the scene after the map is loaded
 *
 * Override `createEmptyTileActor()` to enable tapping empty map tiles:
 * return a TileActor to select it, or null (the default) to do nothing.
 */
export abstract class TiledScene extends ex.Scene {
  // --- Interaction state ---
  private hasDragged = false;
  private lastScreenPos: ex.Vector | null = null;
  private selectedActor: TileActor | null = null;
  protected pendingActor: TileActor | null = null;
  // Set by subclasses to skip selection logic on the next pointer-up (e.g.
  // when a button action has already handled the interaction).
  protected suppressNextPointerUp = false;
  private emptyTileActor: TileActor | null = null;
  private pinchDistance: number | null = null;
  /** All HUD group handles, used to dispatch pointer-up events to buttons. */
  private hudHandles: HudGroupHandle[] = [];

  /** Stored once buildMap() resolves; accessible to setupActors() via this. */
  protected tilemap!: ex.TileMap;

  // --- Map-derived constants, set after buildMap() resolves ---
  private mapWidth = 0;
  private mapHeight = 0;
  private drawW = 0;
  private drawH = 0;
  private minZoom = 0;
  private static readonly MAX_ZOOM = 4;

  // --- Lifecycle helpers ---
  private isActive = false;
  private mapReady = false;
  private engineRef!: ex.Engine;
  private inputCleanup: Array<() => void> = [];

  /**
   * Stable callback reference used by every TileActor in this scene.
   * Defined as a field so re-registration on scene reactivation keeps
   * the same function identity.
   */
  protected readonly handleTilePressed = (a: TileActor): void => {
    this.pendingActor = a;
  };

  /** Return the ex.TileMap this scene should display. */
  protected abstract buildMap(): Promise<ex.TileMap>;

  /**
   * Add TileActors for this level. Called after buildMap() resolves and the
   * tilemap has been added to the scene. Use `this.tilemap` for positioning.
   * Pass `onTilePressed` as the `onPressed` callback for each TileActor.
   */
  protected abstract setupActors(
    onTilePressed: (a: TileActor) => void,
  ): void;

  /**
   * Called when the player taps an empty map tile. Return a TileActor to
   * spawn and immediately select it, or null to do nothing (default).
   * The actor should include `onPressed` in its options so the standard
   * selection flow works correctly.
   */
  protected createEmptyTileActor(
    _col: number,
    _row: number,
    _onPressed: (a: TileActor) => void,
  ): TileActor | null {
    return null;
  }

  override onInitialize(engine: ex.Engine): void {
    this.engineRef = engine;
    this.setupScene();
  }

  override onActivate(): void {
    this.isActive = true;
    if (this.mapReady) this.registerInputHandlers();
  }

  override onDeactivate(): void {
    this.isActive = false;
    this.unregisterInputHandlers();
    this.deselectActor();
    this.resetPointerState();
  }

  private resetPointerState(): void {
    this.pendingActor = null;
    this.hasDragged = false;
    this.lastScreenPos = null;
    this.pinchDistance = null;
    this.suppressNextPointerUp = false;
  }

  protected deselectActor(): void {
    if (this.selectedActor) {
      this.selectedActor.deselect();
      this.selectedActor = null;
    }
    if (this.emptyTileActor) {
      this.emptyTileActor.kill();
      this.emptyTileActor = null;
    }
  }

  private selectActor(actor: TileActor): void {
    this.deselectActor();
    this.selectedActor = actor;
    actor.select();
  }

  private clampedPos(
    x: number,
    y: number,
    atZoom = this.camera.zoom,
  ): ex.Vector {
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

  private clampCamera(): void {
    this.camera.zoom = ex.clamp(
      this.camera.zoom,
      this.minZoom,
      TiledScene.MAX_ZOOM,
    );
    const pos = this.clampedPos(this.camera.x, this.camera.y);
    this.camera.x = pos.x;
    this.camera.y = pos.y;
  }

  private applyPinchZoom(a: ex.Vector, b: ex.Vector): void {
    if (this.pinchDistance === null) return;
    const newDist = a.distance(b);
    this.camera.zoom *= newDist / this.pinchDistance;
    this.pinchDistance = newDist;
    this.clampCamera();
  }

  private async setupScene(): Promise<void> {
    this.tilemap = await this.buildMap();
    this.add(this.tilemap);

    this.mapWidth = this.tilemap.columns * this.tilemap.tileWidth;
    this.mapHeight = this.tilemap.rows * this.tilemap.tileHeight;

    this.setupActors(this.handleTilePressed);

    this.camera.x = this.mapWidth / 2;
    this.camera.y = this.mapHeight / 2;
    this.camera.zoom = 1;

    // Capture actual draw dimensions at zoom=1 so viewport.width == drawW.
    // Used directly in clampedPos to avoid depending on camera.viewport being
    // up-to-date mid-frame after a zoom mutation.
    this.drawW = this.camera.viewport.width;
    this.drawH = this.camera.viewport.height;
    this.minZoom = Math.max(
      this.drawW / this.mapWidth,
      this.drawH / this.mapHeight,
    );

    this.mapReady = true;
    // The scene may already be active (e.g. it is the start scene and
    // onActivate fired before the async map load finished).
    if (this.isActive) this.registerInputHandlers();
  }

  /**
   * Dispatches a confirmed tap (no drag) to the appropriate handler.
   * HUD buttons take priority; then actor-tap or empty-tile-tap.
   * `suppressNextPointerUp` is cleared by the subsequent resetPointerState().
   */
  private handleTap(screenPos: ex.Vector): void {
    // HUD buttons take priority — actor-level pointer events on ScreenElements
    // are unreliable, so we poll handles manually.
    for (const handle of this.hudHandles) {
      if (handle.tryPointerUp(screenPos)) return;
    }
    if (this.suppressNextPointerUp) return;
    if (this.pendingActor) {
      this.handleActorTap(this.pendingActor);
    } else {
      this.handleEmptyTap(screenPos);
    }
  }

  /** Toggle-selects an actor and animates the camera toward it. */
  private handleActorTap(actor: TileActor): void {
    if (this.selectedActor === actor) {
      this.deselectActor();
      return;
    }
    this.selectActor(actor);
    const targetZoom = ex.clamp(
      this.camera.zoom,
      Math.max(this.minZoom, 0.5),
      2,
    );
    const target = this.clampedPos(actor.pos.x, actor.pos.y, targetZoom);
    this.camera.move(target, 500, ex.easeInOutCubic);
    if (targetZoom !== this.camera.zoom) {
      this.camera.zoomOverTime(targetZoom, 500, ex.easeInOutCubic);
    }
  }

  /**
   * Handles a tap on empty space. Deselects the current actor. If a real
   * (non-empty) actor was selected, stops there. Otherwise tries to open an
   * empty tile actor at the tapped world position.
   */
  private handleEmptyTap(screenPos: ex.Vector): void {
    const wasRealActorSelected = this.selectedActor !== null &&
      this.selectedActor !== this.emptyTileActor;
    this.deselectActor();
    if (wasRealActorSelected) return;

    const worldPos = this.engineRef.screen.screenToWorldCoordinates(screenPos);
    const col = Math.floor(worldPos.x / this.tilemap.tileWidth);
    const row = Math.floor(worldPos.y / this.tilemap.tileHeight);
    if (
      col < 0 ||
      col >= this.tilemap.columns ||
      row < 0 ||
      row >= this.tilemap.rows
    ) return;

    const emptyActor = this.createEmptyTileActor(
      col,
      row,
      this.handleTilePressed,
    );
    if (emptyActor === null) return;
    this.emptyTileActor = emptyActor;
    this.add(emptyActor);
    this.selectedActor = emptyActor;
    emptyActor.select();
  }

  private registerInputHandlers(): void {
    const engine = this.engineRef;
    const pointer1 = engine.input.pointers.primary;
    const pointer2 = engine.input.pointers.at(1);

    const onP1Down = (evt: ex.PointerEvent) => {
      this.hasDragged = false;
      this.lastScreenPos = evt.screenPos.clone();
    };
    pointer1.on("down", onP1Down);

    const onP1Move = (evt: ex.PointerEvent) => {
      if (!this.lastScreenPos) return;
      if (this.pinchDistance !== null) {
        const p2 = pointer2.lastScreenPos;
        if (p2) this.applyPinchZoom(evt.screenPos, p2);
        this.lastScreenPos = evt.screenPos.clone();
        return;
      }
      this.hasDragged = true;
      const delta = this.lastScreenPos.sub(evt.screenPos);
      this.camera.x += delta.x / this.camera.zoom;
      this.camera.y += delta.y / this.camera.zoom;
      this.clampCamera();
      this.lastScreenPos = evt.screenPos.clone();
    };
    pointer1.on("move", onP1Move);

    const onP1Up = () => {
      if (!this.hasDragged && this.lastScreenPos) {
        this.handleTap(this.lastScreenPos);
      }
      this.resetPointerState();
    };
    pointer1.on("up", onP1Up);

    const onP1Cancel = () => this.resetPointerState();
    pointer1.on("cancel", onP1Cancel);

    const onP2Down = (evt: ex.PointerEvent) => {
      this.pinchDistance = pointer1.lastScreenPos.distance(evt.screenPos);
      this.hasDragged = true;
    };
    pointer2.on("down", onP2Down);

    const onP2Move = (evt: ex.PointerEvent) => {
      if (this.pinchDistance === null) return;
      const p1 = pointer1.lastScreenPos;
      if (p1) this.applyPinchZoom(p1, evt.screenPos);
    };
    pointer2.on("move", onP2Move);

    const endPinch = () => {
      this.pinchDistance = null;
    };
    pointer2.on("up", endPinch);
    pointer2.on("cancel", endPinch);

    // Trackpad scroll pans; trackpad pinch arrives as wheel + ctrlKey and zooms
    const onWheel = (evt: ex.WheelEvent) => {
      if ((evt.ev as WheelEvent).ctrlKey) {
        this.camera.zoom *= 1 - evt.deltaY * 0.01;
      } else {
        this.camera.x += evt.deltaX / this.camera.zoom;
        this.camera.y += evt.deltaY / this.camera.zoom;
      }
      this.clampCamera();
    };
    engine.input.pointers.on("wheel", onWheel);

    this.inputCleanup = [
      () => pointer1.off("down", onP1Down),
      () => pointer1.off("move", onP1Move),
      () => pointer1.off("up", onP1Up),
      () => pointer1.off("cancel", onP1Cancel),
      () => pointer2.off("down", onP2Down),
      () => pointer2.off("move", onP2Move),
      () => pointer2.off("up", endPinch),
      () => pointer2.off("cancel", endPinch),
      () => engine.input.pointers.off("wheel", onWheel),
    ];
  }

  private unregisterInputHandlers(): void {
    for (const fn of this.inputCleanup) fn();
    this.inputCleanup = [];
  }

  /**
   * Spawn a group of screen-fixed HUD buttons at the given anchor position
   * and add them to this scene. Returns a handle for runtime control
   * (show/hide, disable, active state, badge updates, removal).
   *
   * Must be called after super.onInitialize(engine) so that this.engineRef
   * is available.
   */
  protected addHudGroup(def: HudGroupDef): HudGroupHandle {
    const { elements, handle } = spawnHudGroup(this.engineRef, def);
    for (const el of elements) this.add(el);
    // Wrap remove() so it also unregisters the handle from the HUD poll list.
    const wrapped: HudGroupHandle = {
      ...handle,
      remove: () => {
        handle.remove();
        const idx = this.hudHandles.indexOf(wrapped);
        if (idx !== -1) this.hudHandles.splice(idx, 1);
      },
    };
    this.hudHandles.push(wrapped);
    return wrapped;
  }
}
