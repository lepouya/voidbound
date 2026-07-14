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
  layoutToastCenters,
  MAX_ACTIVE_TOASTS,
  spawnDialog,
  spawnHudGroup,
  spawnToast,
  squareButton,
  ToastDef,
  ToastHandle,
} from "../ui/index.ts";
import { TileGridGeometry } from "./grid-math.ts";
import { SceneCamera } from "./scene-camera.ts";
import { SceneInputController } from "./scene-input.ts";
import {
  gameState,
  NotificationData,
  RESOURCE_KINDS,
  ResourceKind,
} from "../state/game-state.ts";
// Deliberate exception to the scene/ directory being domain-agnostic: the
// shared HUD resource bar renders storage/crew caps, which are ship-module
// derived, so the base scene class reaches into ship/'s catalog for this one
// display computation.
import {
  crewCapacityForModules,
  storageCapsForModules,
} from "../ship/module-catalog.ts";
import { TileActor } from "./tile-actor.ts";

/**
 * Tileset (ui-icon-* PNG) for each resource's icon — the bar readouts here
 * plus the deal-shop rows (ship-level.ts). Icon art is generated from
 * art/ui/icons/*.svg by art/gen_ui.sh; the "credits" icon keeps its working
 * name even after the currency's display name settles (see game-state.ts).
 */
export const RESOURCE_ICON_TILESET: Record<ResourceKind, string> = {
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
  private selectedActor: TileActor | null = null;
  protected pendingActor: TileActor | null = null;
  private emptyTileActor: TileActor | null = null;
  /** All HUD pointer targets (button groups and custom widgets like the
   *  minimap), used to dispatch pointer-up events and resize relayouts. */
  private hudHandles: HudPointerTarget[] = [];
  /** The modal slot (ROADMAP P1.14): while a dialog is open it captures all
   *  pointer input — no camera pan/zoom, no world or HUD taps underneath.
   *  One dialog at a time; openDialog replaces any open one. */
  private modalDialog: { handle: DialogHandle; onClose?: () => void } | null =
    null;
  /** Live toasts (ROADMAP P1.15), newest first — the order layoutToastCenters
   *  expects (newest nearest the bottom edge). Toasts drop out on their own
   *  expiry, the stack cap, or scene switch. */
  private toasts: ToastHandle[] = [];

  /** The map's grid geometry, set once buildMap() resolves; accessible to
   *  setupActors() via this. Undefined before that (guard early
   *  subscription callbacks on it). */
  protected grid!: TileGridGeometry;
  /** The real tilemap, when this scene has one (ship). Geometry-only scenes
   *  (space map) leave it null. */
  protected tilemap: ex.TileMap | null = null;

  // --- Camera + pointer input, factored out (ROADMAP housekeeping) ---
  private readonly sceneCamera = new SceneCamera(
    this.camera,
    () => this.minZoomFloor(),
  );
  private readonly inputController = new SceneInputController({
    isModalCaptured: () => this.modalDialog !== null,
    pan: (dx, dy) => this.sceneCamera.pan(dx, dy),
    zoomAtAnchor: (anchor, zoom) => this.sceneCamera.zoomAtAnchor(anchor, zoom),
    currentZoom: () => this.sceneCamera.zoom,
    onTap: (screenPos) => this.handleTap(screenPos),
    onPointerReset: () => {
      this.pendingActor = null;
      // Discard any button press that never got tap confirmation (e.g. the
      // press turned into a drag, or the pointer was cancelled).
      this.selectedActor?.takePendingButton();
    },
  });
  private resizeCleanup: (() => void) | null = null;

  // --- Lifecycle helpers ---
  private isActive = false;
  private mapReady = false;
  private engineRef!: ex.Engine;

  /**
   * Stable callback reference used by every TileActor in this scene.
   * Defined as a field so re-registration on scene reactivation keeps
   * the same function identity.
   */
  protected readonly handleTilePressed = (a: TileActor): void => {
    this.pendingActor = a;
  };

  /** Escape hatch for subclasses: skip all tap handling on the next
   *  pointer-up. World-space button presses are consumed automatically (see
   *  handleTap), so button handlers do NOT need to set this. */
  protected get suppressNextPointerUp(): boolean {
    return this.inputController.suppressNextPointerUp;
  }
  protected set suppressNextPointerUp(value: boolean) {
    this.inputController.suppressNextPointerUp = value;
  }

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
      this.sceneCamera.resetTo(this.initialCameraTarget());
      this.registerInputHandlers();
    }
  }

  override onDeactivate(): void {
    this.isActive = false;
    this.unregisterInputHandlers();
    this.closeDialog();
    this.clearToasts();
    this.deselectActor();
    this.inputController.reset();
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

  /** Re-derive everything that depends on the screen size. */
  private handleResize(): void {
    for (const handle of this.hudHandles) handle.relayout(this.engineRef);
    this.modalDialog?.handle.relayout(this.engineRef);
    this.restackToasts();
    if (!this.mapReady) return;
    this.sceneCamera.recomputeViewBounds(this.engineRef);
    this.sceneCamera.clampCamera();
  }

  private async setupScene(): Promise<void> {
    const { grid, tilemap } = await this.buildMap();
    this.grid = grid;
    this.tilemap = tilemap ?? null;
    if (this.tilemap) this.add(this.tilemap);

    this.sceneCamera.setMapSize(
      grid.columns * grid.tileWidth,
      grid.rows * grid.tileHeight,
    );

    this.setupActors(this.handleTilePressed);

    this.mapReady = true;
    // Recompute view bounds and HUD layout now: the window may have resized
    // between HUD spawn in onInitialize and the async map load finishing.
    this.handleResize();
    this.sceneCamera.resetTo(this.initialCameraTarget());
    // The scene may already be active (e.g. it is the start scene and
    // onActivate fired before the async map load finished).
    if (this.isActive) this.registerInputHandlers();
  }

  /**
   * Dispatches a confirmed tap (no drag) to the appropriate handler, in
   * priority order: the modal dialog (which swallows the tap entirely —
   * dialog buttons fire, anything else is absorbed by the scrim), world-space
   * action buttons (recorded on pointer-down, fired here on confirmation),
   * HUD buttons, then actor-tap or empty-tile-tap. The `suppressNextPointerUp`
   * escape hatch and drag-vs-tap decision happen upstream, in
   * SceneInputController.
   */
  private handleTap(screenPos: ex.Vector): void {
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
    this.sceneCamera.focusOn(actor.pos, this.camera.zoom);
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

  /** Register the pointer/wheel/resize listeners for this scene (delegated
   *  to SceneInputController for the pointer/wheel half). */
  private registerInputHandlers(): void {
    this.inputController.register(this.engineRef);
    const onResize = () => this.handleResize();
    this.engineRef.screen.events.on("resize", onResize);
    this.resizeCleanup = () =>
      this.engineRef.screen.events.off("resize", onResize);
  }

  private unregisterInputHandlers(): void {
    this.inputController.unregister();
    this.resizeCleanup?.();
    this.resizeCleanup = null;
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
    this.sceneCamera.panTo(x, y);
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

  /**
   * Show a transient toast/snackbar message (ROADMAP P1.15): a text pill at
   * the bottom-center of the screen that fades out on its own. Repeated
   * calls stack upward, newest nearest the edge, capped at MAX_ACTIVE_TOASTS
   * (oldest drop off). Toasts never capture pointer input and render above
   * any open dialog; switching scenes clears them. The plain-string form is
   * an info toast — pass a ToastDef (e.g. via errorToast) for other kinds.
   *
   * Must be called after super.onInitialize(engine) so that this.engineRef
   * is available.
   */
  protected showToast(toast: string | ToastDef): void {
    const def = typeof toast === "string" ? { message: toast } : toast;
    const { root, handle } = spawnToast(
      this.engineRef,
      def,
      (expired) => this.dropToast(expired),
    );
    this.add(root);
    this.toasts.unshift(handle);
    while (this.toasts.length > MAX_ACTIVE_TOASTS) this.toasts.pop()?.remove();
    this.restackToasts();
  }

  /** Natural-expiry path: forget the toast and close the stack gap. */
  private dropToast(handle: ToastHandle): void {
    const idx = this.toasts.indexOf(handle);
    if (idx === -1) return; // already removed by the cap or a scene switch
    this.toasts.splice(idx, 1);
    this.restackToasts();
  }

  private restackToasts(): void {
    const centers = layoutToastCenters(
      this.toasts.map((t) => ({ w: t.width, h: t.height })),
      this.engineRef.screen.resolution.width,
      this.engineRef.screen.resolution.height,
    );
    this.toasts.forEach((t, i) => t.setCenter(centers[i].x, centers[i].y));
  }

  private clearToasts(): void {
    for (const t of this.toasts) t.remove();
    this.toasts = [];
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
        squareButton({
          icon: "buy",
          width: 48,
          height: 48,
          label: "Shop",
          onPressed: () => console.log("shop"),
        }),
        squareButton({
          icon: "events",
          width: 32,
          height: 32,
          label: "Events",
          onPressed: () => void this.openEventsFeed(),
        }),
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
    // Toast every freshly-pushed notification (ROADMAP P1.19) — build/hire
    // completions, vessel arrivals/returns, mining completions — on whichever
    // scene is currently active, not just the error path P1.15 originally
    // covered. subscribeToNotifications only fires for the push channel, so
    // the initial snapshot's unread backlog never floods the toast layer, and
    // MAX_ACTIVE_TOASTS already bounds a burst gracefully.
    gameState.subscribeToNotifications((n) => {
      if (this.isActive) this.showToast(n.message);
    });
    const bottomRight = this.addHudGroup({
      anchor: "bottom-right",
      gap: 8,
      buttons: [
        switchButton,
        squareButton({
          icon: "message",
          width: 32,
          height: 32,
          label: "Mail",
          onPressed: () => console.log("messages"),
        }),
        squareButton({
          icon: "items",
          width: 32,
          height: 32,
          label: "Items",
          onPressed: () => console.log("items"),
        }),
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
