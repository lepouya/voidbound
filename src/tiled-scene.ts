import * as ex from "excalibur";

import { invoke } from "@tauri-apps/api/core";

import {
  BadgeDef,
  DialogDef,
  DialogHandle,
  formatCompactCount,
  HudButtonDef,
  HudGroupDef,
  HudGroupHandle,
  HudPointerTarget,
  LabelDef,
  spawnDialog,
  spawnHudGroup,
} from "./ui/index.ts";
import { anchoredZoomPos } from "./camera-math.ts";
import { TileGridGeometry } from "./grid-math.ts";
import {
  gameState,
  NotificationData,
  RESOURCE_KINDS,
  ResourceKind,
} from "./game-state.ts";
import {
  crewCapacityForModules,
  storageCapsForModules,
} from "./module-catalog.ts";
import { TileActor } from "./tile-actor.ts";

/**
 * Tileset (ui-icon-* PNG) for each resource's bar icon. Icon art is generated
 * from art/ui/icons/*.svg by art/gen_ui.sh; the "credits" icon keeps its
 * working name even after the currency's display name settles (see
 * game-state.ts).
 */
const RESOURCE_ICON_TILESET: Record<ResourceKind, string> = {
  construction: "ui-icon-construction",
  highTech: "ui-icon-hightech",
  biological: "ui-icon-biological",
  fuel: "ui-icon-fuel",
  credits: "ui-icon-credits",
};

/**
 * What buildMap() resolves to: the scene's grid geometry, optionally backed
 * by a real ex.TileMap (ROADMAP P1.9). All camera/tap/actor math reads the
 * geometry; the tilemap — when present — is only added to the scene for
 * rendering. Geometry-only scenes (the full-size space map) render a plain
 * background instead. An ex.TileMap satisfies TileGridGeometry structurally,
 * so a tilemap-backed scene returns `{ grid: tilemap, tilemap }`.
 */
export interface SceneMap {
  grid: TileGridGeometry;
  tilemap?: ex.TileMap;
}

/**
 * Abstract base scene for any level that displays a tile-based map with
 * drag-to-pan, pinch/scroll-to-zoom, and tap-to-select TileActor support.
 *
 * Subclasses must implement:
 *   buildMap()    – return the SceneMap (grid geometry + optional tilemap)
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
  // Escape hatch for subclasses: skip all tap handling on the next pointer-up.
  // World-space button presses are consumed automatically (see handleTap), so
  // button handlers do NOT need to set this.
  protected suppressNextPointerUp = false;
  private emptyTileActor: TileActor | null = null;
  private pinchDistance: number | null = null;
  /** All HUD pointer targets (button groups and custom widgets like the
   *  minimap), used to dispatch pointer-up events and resize relayouts. */
  private hudHandles: HudPointerTarget[] = [];
  /** The modal slot (ROADMAP P1.14): while a dialog is open it captures all
   *  pointer input — no camera pan/zoom, no world or HUD taps underneath.
   *  One dialog at a time; openDialog replaces any open one. */
  private modalDialog: { handle: DialogHandle; onClose?: () => void } | null =
    null;

  /** The map's grid geometry, set once buildMap() resolves; accessible to
   *  setupActors() via this. Undefined before that (guard early
   *  subscription callbacks on it). */
  protected grid!: TileGridGeometry;
  /** The real tilemap, when this scene has one (ship). Geometry-only scenes
   *  (space map) leave it null. */
  protected tilemap: ex.TileMap | null = null;

  // --- Map-derived constants, set after buildMap() resolves ---
  private mapWidth = 0;
  private mapHeight = 0;
  private drawW = 0;
  private drawH = 0;
  private minZoom = 0;
  private static readonly MAX_ZOOM = 4;
  // Movement below this many screen px from the pointer-down position is
  // jitter, not a drag — touch taps on real devices wobble a few px.
  private static readonly DRAG_THRESHOLD_PX = 5;

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

  /** Return the grid geometry (and optional real tilemap) for this scene. */
  protected abstract buildMap(): Promise<SceneMap>;

  /**
   * Add TileActors for this level. Called after buildMap() resolves and any
   * tilemap has been added to the scene. Use `this.grid` for positioning.
   * Pass `onTilePressed` as the `onPressed` callback for each TileActor.
   */
  protected abstract setupActors(
    onTilePressed: (a: TileActor) => void,
  ): void;

  /**
   * Return the world-space position and zoom level the camera should start at
   * when this scene loads. Called after setupActors(), so all actors are
   * available for reference.
   *
   * Override in subclasses to focus on a specific actor or location:
   *   protected override initialCameraTarget() {
   *     return { pos: this.someActor.pos, zoom: 2 };
   *   }
   *
   * The default centers the camera on the map at zoom 1.
   */
  protected initialCameraTarget(): { pos: ex.Vector; zoom: number } {
    return {
      pos: ex.vec(
        this.grid.columns * this.grid.tileWidth / 2,
        this.grid.rows * this.grid.tileHeight / 2,
      ),
      zoom: 1,
    };
  }

  /**
   * Return true if this scene spawns an empty tile actor when the player taps
   * empty space (i.e. createEmptyTileActor is overridden). Default: false.
   * Pass the result as `edgeFallthrough` to every TileActor constructed in
   * setupActors() so edge-zone clicks fall through only when meaningful.
   */
  protected supportsEmptyTileActor(): boolean {
    return false;
  }

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
    this.setupScene().catch((err) => {
      // Without this, a generate_map failure is an unhandled rejection and
      // the scene silently never loads. Log it and make the failure visible.
      console.error(`Scene "${this.constructor.name}" failed to load:`, err);
      this.backgroundColor = ex.Color.fromRGB(96, 0, 0);
    });
  }

  override onActivate(): void {
    this.isActive = true;
    if (this.mapReady) {
      // The window may have resized while this scene was inactive.
      this.handleResize();
      this.resetCamera();
      this.registerInputHandlers();
    }
  }

  override onDeactivate(): void {
    this.isActive = false;
    this.unregisterInputHandlers();
    this.closeDialog();
    this.deselectActor();
    this.resetPointerState();
  }

  private resetPointerState(): void {
    this.pendingActor = null;
    this.hasDragged = false;
    this.lastScreenPos = null;
    this.pinchDistance = null;
    this.suppressNextPointerUp = false;
    // Discard any button press that never got tap confirmation (e.g. the
    // press turned into a drag, or the pointer was cancelled).
    this.selectedActor?.takePendingButton();
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

  /** True if `actor` is the currently selected actor — lets a subclass that
   *  rebuilds an actor in place (e.g. reconciling a server-data refresh)
   *  check whether the outgoing instance needs its selection carried over to
   *  the replacement via reselectActor(), instead of the selection silently
   *  vanishing because the killed instance no longer renders. */
  protected isSelected(actor: TileActor): boolean {
    return this.selectedActor === actor;
  }

  /** Select `actor` as the replacement for whatever was selected before,
   *  without the normal deselect-then-select handling (no prior actor to
   *  deselect — it's already been killed by the caller). Pairs with
   *  isSelected(): rebuild the actor, then call this if the outgoing
   *  instance was selected, so the player's open panel survives a
   *  server-driven rebuild instead of silently disappearing. */
  protected reselectActor(actor: TileActor): void {
    this.selectedActor = actor;
    actor.select();
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

  /**
   * Lowest camera zoom this scene allows, regardless of how much of the map
   * would fit on screen. 0 (the default) means "as far as fits the whole
   * map". Scenes whose map dwarfs the screen (the full-size space map)
   * override this: past a point, zooming out draws hundreds of sub-pixel
   * actors at single-digit fps and shows nothing readable — the minimap is
   * the whole-map overview instead.
   */
  protected minZoomFloor(): number {
    return 0;
  }

  /**
   * Recompute the zoom-1 draw dimensions and the resulting minimum zoom.
   * screen.resolution is the zoom-1 draw size (screen.drawWidth divides by
   * the current camera zoom), which is the baseline clampedPos expects.
   */
  private recomputeViewBounds(): void {
    this.drawW = this.engineRef.screen.resolution.width;
    this.drawH = this.engineRef.screen.resolution.height;
    this.minZoom = Math.max(
      this.drawW / this.mapWidth,
      this.drawH / this.mapHeight,
      this.minZoomFloor(),
    );
  }

  /** Re-derive everything that depends on the screen size. */
  private handleResize(): void {
    for (const handle of this.hudHandles) handle.relayout(this.engineRef);
    this.modalDialog?.handle.relayout(this.engineRef);
    if (!this.mapReady) return;
    this.recomputeViewBounds();
    this.clampCamera();
  }

  private resetCamera(): void {
    const target = this.initialCameraTarget();
    this.camera.x = target.pos.x;
    this.camera.y = target.pos.y;
    this.camera.zoom = target.zoom;
    this.clampCamera();
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

  /**
   * Set the camera zoom (clamped) while keeping the world point
   * `anchorWorld` fixed on screen, so wheel and pinch zoom anchor at the
   * pointer instead of the screen center (ROADMAP P1.8). The anchor may be
   * up to one frame stale (the camera transform behind screenToWorld /
   * WheelEvent world coords only refreshes per frame), but the resulting
   * camera error scales by 1 − oldZoom/newZoom — sub-pixel per event.
   */
  private zoomAtAnchor(anchorWorld: ex.Vector, newZoom: number): void {
    const zoom = ex.clamp(newZoom, this.minZoom, TiledScene.MAX_ZOOM);
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

  private applyPinchZoom(a: ex.Vector, b: ex.Vector): void {
    if (this.pinchDistance === null || this.modalDialog) return;
    const newDist = a.distance(b);
    const midpoint = this.engineRef.screen.screenToWorldCoordinates(
      a.add(b).scale(0.5),
    );
    this.zoomAtAnchor(
      midpoint,
      this.camera.zoom * (newDist / this.pinchDistance),
    );
    this.pinchDistance = newDist;
  }

  private async setupScene(): Promise<void> {
    const { grid, tilemap } = await this.buildMap();
    this.grid = grid;
    this.tilemap = tilemap ?? null;
    if (this.tilemap) this.add(this.tilemap);

    this.mapWidth = grid.columns * grid.tileWidth;
    this.mapHeight = grid.rows * grid.tileHeight;

    this.setupActors(this.handleTilePressed);

    this.mapReady = true;
    // Recompute view bounds and HUD layout now: the window may have resized
    // between HUD spawn in onInitialize and the async map load finishing.
    this.handleResize();
    this.resetCamera();
    // The scene may already be active (e.g. it is the start scene and
    // onActivate fired before the async map load finished).
    if (this.isActive) this.registerInputHandlers();
  }

  /**
   * Dispatches a confirmed tap (no drag) to the appropriate handler, in
   * priority order: the `suppressNextPointerUp` escape hatch, the modal
   * dialog (which swallows the tap entirely — dialog buttons fire, anything
   * else is absorbed by the scrim), world-space action buttons (recorded on
   * pointer-down, fired here on confirmation), HUD buttons, then actor-tap
   * or empty-tile-tap.
   * `suppressNextPointerUp` is cleared by the subsequent resetPointerState().
   */
  private handleTap(screenPos: ex.Vector): void {
    if (this.suppressNextPointerUp) return;
    if (this.modalDialog) {
      this.modalDialog.handle.tryPointerUp(screenPos);
      return;
    }
    // A world-button press consumes the whole tap, so handlers never need to
    // suppress the pointer-up themselves.
    const pendingButton = this.selectedActor?.takePendingButton();
    if (pendingButton) {
      pendingButton.onPressed();
      return;
    }
    // Actor-level pointer events on ScreenElements are unreliable, so HUD
    // clicks are dispatched by polling the handles manually.
    for (const handle of this.hudHandles) {
      if (handle.tryPointerUp(screenPos)) return;
    }
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
    const col = Math.floor(worldPos.x / this.grid.tileWidth);
    const row = Math.floor(worldPos.y / this.grid.tileHeight);
    if (
      col < 0 ||
      col >= this.grid.columns ||
      row < 0 ||
      row >= this.grid.rows
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
      // Until the threshold is crossed, ignore the move entirely: the tap
      // stays a tap and the camera doesn't micro-jitter. lastScreenPos is
      // only updated once dragging starts, so before that it still holds the
      // pointer-down position.
      if (
        !this.hasDragged &&
        evt.screenPos.distance(this.lastScreenPos) <
          TiledScene.DRAG_THRESHOLD_PX
      ) {
        return;
      }
      this.hasDragged = true;
      // Modal input capture: keep tracking the drag (so a press that slides
      // off a dialog button still cancels the tap) but never pan the camera.
      if (this.modalDialog) {
        this.lastScreenPos = evt.screenPos.clone();
        return;
      }
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
      // Only start a pinch if finger 1 is actually down. Use our tracked
      // position — pointer1.lastScreenPos can be stale/(0,0) if finger 1
      // never moved before finger 2 landed.
      if (!this.lastScreenPos) return;
      this.pinchDistance = this.lastScreenPos.distance(evt.screenPos);
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
      if (this.modalDialog) return;
      if ((evt.ev as WheelEvent).ctrlKey) {
        // Clamp the per-event factor: a fast wheel can send deltaY > 100,
        // which would make the factor zero or negative. evt.x/y is the
        // pointer's world position, the zoom anchor.
        this.zoomAtAnchor(
          ex.vec(evt.x, evt.y),
          this.camera.zoom * ex.clamp(1 - evt.deltaY * 0.01, 0.5, 2),
        );
      } else {
        this.camera.x += evt.deltaX / this.camera.zoom;
        this.camera.y += evt.deltaY / this.camera.zoom;
        this.clampCamera();
      }
    };
    engine.input.pointers.on("wheel", onWheel);

    const onResize = () => this.handleResize();
    engine.screen.events.on("resize", onResize);

    this.inputCleanup = [
      () => engine.screen.events.off("resize", onResize),
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
   * Register a custom screen-space widget (e.g. the map minimap) into HUD
   * dispatch: it gets tryPointerUp priority over world taps and a relayout
   * call on every screen resize. Button groups register automatically via
   * addHudGroup; this is only for widgets built outside that system.
   */
  protected registerHudTarget(target: HudPointerTarget): void {
    this.hudHandles.push(target);
  }

  /**
   * Animate the camera to the given world position (clamped to the map
   * bounds at the current zoom) — e.g. the minimap's tap-to-jump.
   */
  protected panCameraTo(x: number, y: number): void {
    this.camera.move(this.clampedPos(x, y), 400, ex.easeInOutCubic);
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

  /**
   * Open a modal dialog over this scene (ROADMAP P1.14). One dialog at a
   * time: any open dialog is closed first. While open, all pointer input is
   * captured — dialog buttons run the same confirmed-tap logic HUD buttons
   * use, everything else is swallowed by the scrim, and camera pan/zoom is
   * blocked. Switching scenes closes it. Returns the handle for runtime
   * control (setRows, setButtonDisabled).
   *
   * Must be called after super.onInitialize(engine) so that this.engineRef
   * is available.
   */
  protected openDialog(def: DialogDef): DialogHandle {
    this.closeDialog();
    const { root, handle } = spawnDialog(
      this.engineRef,
      def,
      () => this.closeDialog(),
    );
    this.add(root);
    this.modalDialog = { handle, onClose: def.onClose };
    return handle;
  }

  /** Close the open modal dialog, if any (fires its onClose). */
  protected closeDialog(): void {
    if (!this.modalDialog) return;
    const { handle, onClose } = this.modalDialog;
    this.modalDialog = null;
    handle.remove();
    onClose?.();
  }

  /**
   * Spawn the standard HUD shared by every scene: the resource bar along the
   * top-left, Shop/Events in the top-right, and the given scene-switch button
   * stacked above Mail/Items in the bottom-right. Call from onInitialize
   * after super.onInitialize(engine). Returns the group handles for runtime
   * control (e.g. wiring the Events or Mail badges to real counts).
   */
  protected addCommonHud(
    switchButton: HudButtonDef,
  ): {
    resourceBar: HudGroupHandle;
    topRight: HudGroupHandle;
    bottomRight: HudGroupHandle;
  } {
    // Resource bar (ROADMAP P1.2): one icon per ResourceKind with its count
    // below, kept live via the gameState subscription. Scenes live for the
    // whole app run, so the subscription is deliberately never torn down
    // (see GameState.subscribe). The zero labelOffset cancels the default
    // upward button-label nudge, which would overlap the count onto these
    // small frameless icons.
    // Each count renders as "count/cap" (ROADMAP P1.11) with the cap
    // display-derived from the module snapshot (storageCapsForModules) —
    // the backend does the actual clamping. Credits are uncapped (Infinity)
    // and show the bare count.
    const resourceCaps = () =>
      storageCapsForModules(gameState.modules.values());
    // Both halves compact from 1000 up ("985/1k", "3k/3k") — the full
    // "3000/3000" overflows the bar's per-icon spacing.
    const resourceLabel = (kind: ResourceKind, cap: number): LabelDef => {
      const count = formatCompactCount(gameState.resources[kind], 1_000);
      return {
        text: cap === Infinity
          ? count
          : `${count}/${formatCompactCount(cap, 1_000)}`,
        labelOffset: ex.vec(0, 0),
      };
    };
    // Crew rides the bar as a sixth readout (ROADMAP P1.10): head count over
    // total berths, the berths display-derived from the module snapshot like
    // the storage caps — the backend does the actual hire verification.
    const crewLabel = (): LabelDef => ({
      text: `${gameState.crew}/${
        crewCapacityForModules(gameState.modules.values())
      }`,
      labelOffset: ex.vec(0, 0),
    });
    const CREW_INDEX = RESOURCE_KINDS.length;
    const initialCaps = resourceCaps();
    const resourceBar = this.addHudGroup({
      anchor: "top-left",
      direction: "right",
      gap: 16,
      buttons: [
        ...RESOURCE_KINDS.map((kind) => ({
          tile: `${RESOURCE_ICON_TILESET[kind]}:0`,
          width: 22,
          height: 22,
          label: resourceLabel(kind, initialCaps[kind]),
          onPressed: () => console.log(`resource ${kind}`),
        })),
        {
          tile: "ui-icon-crew:0",
          width: 22,
          height: 22,
          label: crewLabel(),
          onPressed: () => console.log("crew"),
        },
      ],
    });
    gameState.subscribe(() => {
      const caps = resourceCaps();
      RESOURCE_KINDS.forEach((kind, i) =>
        resourceBar.setLabel(i, resourceLabel(kind, caps[kind]))
      );
      resourceBar.setLabel(CREW_INDEX, crewLabel());
    });

    const topRight = this.addHudGroup({
      anchor: "top-right",
      gap: 8,
      buttons: [
        {
          frameTile: "ui-frame-square:0",
          activeFrameTile: "ui-frame-square:1",
          disabledFrameTile: "ui-frame-square:2",
          tile: "ui-icon-buy:0",
          activeTile: "ui-icon-buy:1",
          disabledTile: "ui-icon-buy:2",
          width: 48,
          height: 48,
          label: "Shop",
          onPressed: () => console.log("shop"),
        },
        {
          frameTile: "ui-frame-square:0",
          activeFrameTile: "ui-frame-square:1",
          disabledFrameTile: "ui-frame-square:2",
          tile: "ui-icon-events:0",
          activeTile: "ui-icon-events:1",
          disabledTile: "ui-icon-events:2",
          width: 32,
          height: 32,
          label: "Events",
          onPressed: () => void this.openEventsFeed(),
        },
      ],
    });
    // Events badge (ROADMAP P1.5): the live unread notification count, or no
    // badge at all when everything is read. Set once now (the snapshot may
    // have loaded before this scene initialized) and kept live by the same
    // always-on subscription pattern as the resource bar above — but only
    // rebuilding the badge actor when the count actually changed, since most
    // notifies (every production tick) don't touch it.
    const EVENTS_INDEX = 1;
    let shownUnread = -1;
    const updateEventsBadge = () => {
      const unread = gameState.unreadNotificationCount();
      if (unread === shownUnread) return;
      shownUnread = unread;
      const badge: BadgeDef | undefined = unread === 0 ? undefined : {
        text: formatCompactCount(unread),
        bordered: false,
        color: ex.Color.Red,
      };
      topRight.setBadge(EVENTS_INDEX, badge);
    };
    updateEventsBadge();
    gameState.subscribe(updateEventsBadge);
    const bottomRight = this.addHudGroup({
      anchor: "bottom-right",
      gap: 8,
      buttons: [
        switchButton,
        {
          frameTile: "ui-frame-square:0",
          activeFrameTile: "ui-frame-square:1",
          disabledFrameTile: "ui-frame-square:2",
          tile: "ui-icon-message:0",
          activeTile: "ui-icon-message:1",
          disabledTile: "ui-icon-message:2",
          width: 32,
          height: 32,
          label: "Mail",
          onPressed: () => console.log("messages"),
        },
        {
          frameTile: "ui-frame-square:0",
          activeFrameTile: "ui-frame-square:1",
          disabledFrameTile: "ui-frame-square:2",
          tile: "ui-icon-items:0",
          activeTile: "ui-icon-items:1",
          disabledTile: "ui-icon-items:2",
          width: 32,
          height: 32,
          label: "Items",
          onPressed: () => console.log("items"),
        },
      ],
    });
    return { resourceBar, topRight, bottomRight };
  }

  /**
   * Events button press (ROADMAP P1.5): dump the feed to the console — a
   * real feed panel is later UI work; P1.5 only wires the badge — and ask
   * the backend to mark everything read. Applying the returned list clears
   * the badge in every scene via the shared-state notify.
   */
  private async openEventsFeed(): Promise<void> {
    for (const n of gameState.notifications.values()) {
      console.log(`[events]${n.read ? " " : " * "}${n.message}`);
    }
    if (gameState.unreadNotificationCount() === 0) return;
    try {
      const notifications = await invoke<NotificationData[]>(
        "mark_notifications_read",
      );
      gameState.syncNotifications(notifications);
    } catch (err) {
      console.warn("mark_notifications_read rejected:", err);
    }
  }
}
