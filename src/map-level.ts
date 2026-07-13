import * as ex from "excalibur";

import { invoke } from "@tauri-apps/api/core";

import { AOI_REQUERY_TILES, MAP_VIEW_TILES_CAP } from "./aoi-config.ts";
import { tileViewCapZoom } from "./camera-math.ts";
import { gameState, MapWindowData } from "./game-state.ts";
import { fetchGridGeometry } from "./map-loader.ts";
import { AsteroidSync } from "./map-asteroids.ts";
import { MothershipSync } from "./map-motherships.ts";
import { VesselSync } from "./map-vessels.ts";
import { spawnMinimap } from "./minimap.ts";
import { TileActor } from "./tile-actor.ts";
import { SceneMap, TiledScene } from "./tiled-scene.ts";
import { roundButton, squareButton } from "./ui/index.ts";

export class MapLevel extends TiledScene {
  /** Reconciles mothership actors against gameState.motherships and tracks
   *  the local player's own ship (this.mothershipSync.ownShip) for camera
   *  and vessel-dock math. */
  private mothershipSync = new MothershipSync({
    add: (actor) => this.add(actor),
    onTilePressed: this.handleTilePressed,
    edgeFallthrough: () => this.supportsEmptyTileActor(),
  });
  /** Reconciles asteroid actors against gameState.asteroids and owns the
   *  Mine action (ROADMAP P1.6). */
  private asteroidSync = new AsteroidSync({
    add: (actor) => this.add(actor),
    onTilePressed: this.handleTilePressed,
    deselectActor: () => this.deselectActor(),
  });
  /** Reconciles vessel actors against gameState.vessels and owns the
   *  dispatch/recall actions. */
  private vesselSync = new VesselSync({
    add: (actor) => this.add(actor),
    onTilePressed: this.handleTilePressed,
    deselectActor: () => this.deselectActor(),
  });

  override onInitialize(engine: ex.Engine): void {
    super.onInitialize(engine);
    // The space map is geometry-only (ROADMAP P1.9): no tilemap, just a
    // space-dark backdrop — asteroids and motherships are the landmarks
    // (a real starfield is later art work).
    this.backgroundColor = ex.Color.fromHex("#060913");
    this.addCommonHud(squareButton({
      icon: "shipview",
      width: 64,
      height: 64,
      label: "Ship",
      onPressed: () => engine.goToScene("ship"),
    }));
    // The backend state may load (or a future login complete) after this
    // scene is built — reconcile mothership, asteroid, and vessel actors
    // against the refreshed tables on every notify. Motherships first:
    // vessels need the player's ship for dock math. No unsubscribe: scenes
    // live for the whole app run.
    gameState.subscribe(() => {
      this.mothershipSync.sync(this.grid);
      this.asteroidSync.sync(this.grid);
      this.vesselSync.sync(this.grid);
    });
  }

  /**
   * Vessel actors freeze mid-flight while another scene is active (Excalibur
   * only updates the current scene), but the event timestamps remain the
   * source of truth. On re-activation, force-reapply every known event: the
   * vessel sync re-lerps each vessel to its authoritative current position
   * and restarts the remaining leg — or completes it, docking included, if
   * it finished while the player was away.
   */
  override onActivate(): void {
    super.onActivate();
    this.vesselSync.sync(this.grid, true);
  }

  protected override initialCameraTarget(): { pos: ex.Vector; zoom: number } {
    // The backend snapshot may not have landed yet (or failed to): fall back
    // to the map center until the player's mothership exists.
    const mothership = this.mothershipSync.ownShip;
    if (!mothership) return super.initialCameraTarget();
    return { pos: mothership.pos, zoom: 1 };
  }

  protected override async buildMap(): Promise<SceneMap> {
    // Geometry only — the full-size map has no per-tile content to render
    // (see generate_space_map in src-tauri/src/map.rs).
    return { grid: await fetchGridGeometry("map") };
  }

  protected override supportsEmptyTileActor(): boolean {
    return true;
  }

  /**
   * Cap the visible view at MAP_VIEW_TILES_CAP tiles on the longer axis
   * (ROADMAP P1.13) — strictly inside the interest-area window, so space the
   * backend hasn't streamed can never scroll into sight. Supersedes P1.9's
   * fixed 0.1 floor (whose fps motivation this also covers: fewer visible
   * tiles is fewer sub-pixel actors); the minimap remains the whole-map
   * overview.
   */
  protected override minZoomFloor(): number {
    if (!this.grid) return 0;
    return tileViewCapZoom(
      this.engine.screen.resolution.width,
      this.engine.screen.resolution.height,
      this.grid.tileWidth,
      MAP_VIEW_TILES_CAP,
    );
  }

  /** Center of the last interest-area request sent (in tiles), resolved or
   *  not — the hysteresis reference, so panning doesn't re-fire while a
   *  request is in flight, and a failed backend is retried only after
   *  further panning rather than every frame. Null until the first check
   *  adopts the snapshot's window center. */
  private lastWindowRequest: { col: number; row: number } | null = null;
  /** True while a request_map_window call is awaiting its response. */
  private windowRequestInFlight = false;

  /**
   * Interest-area hysteresis (ROADMAP P1.13): once the camera center drifts
   * more than AOI_REQUERY_TILES (Chebyshev) from the last window center, ask
   * the backend to re-center the window — never per frame, never while a
   * request is in flight. Lives in the update loop because panning happens
   * everywhere (drag, wheel, minimap jump, actor-tap camera moves); the
   * check itself is a few comparisons.
   */
  override onPreUpdate(): void {
    if (!this.grid || !gameState.loaded || this.windowRequestInFlight) return;
    const reference = this.lastWindowRequest ??
      (gameState.mapWindow && {
        col: gameState.mapWindow.centerCol,
        row: gameState.mapWindow.centerRow,
      });
    if (!reference) return;
    const col = ex.clamp(
      Math.round(this.camera.pos.x / this.grid.tileWidth),
      0,
      this.grid.columns - 1,
    );
    const row = ex.clamp(
      Math.round(this.camera.pos.y / this.grid.tileHeight),
      0,
      this.grid.rows - 1,
    );
    const drift = Math.max(
      Math.abs(col - reference.col),
      Math.abs(row - reference.row),
    );
    if (drift <= AOI_REQUERY_TILES) return;
    void this.requestMapWindow(col, row);
  }

  /**
   * Asks the backend to re-center the interest-area window on the given tile
   * and replaces the world tables with the response (ROADMAP P1.13) — the
   * reconcilers then despawn everything that left the window and spawn what
   * entered it. Until the response lands the view may be briefly empty in
   * freshly scrolled-in space (tap-to-jump into an unloaded region is
   * legal by design); the wholesale table replacement is authoritative for
   * everything inside the window.
   */
  private async requestMapWindow(col: number, row: number): Promise<void> {
    this.lastWindowRequest = { col, row };
    this.windowRequestInFlight = true;
    try {
      const data = await invoke<MapWindowData>("request_map_window", {
        centerCol: col,
        centerRow: row,
      });
      gameState.applyMapWindow(data);
    } catch (err) {
      // Leave lastWindowRequest standing: the failed center stays the
      // hysteresis reference, so a dead backend is retried on further
      // panning, not every frame.
      console.warn("request_map_window rejected:", err);
    } finally {
      this.windowRequestInFlight = false;
    }
  }

  protected override setupActors(): void {
    // Nothing is placed here: mothership and asteroid placement is
    // server-owned, so all map actors are reconciled from the backend
    // snapshot — which may have loaded before this scene finished its async
    // map build (hence the explicit sync), or may land later (the gameState
    // subscription).
    this.mothershipSync.sync(this.grid);
    this.asteroidSync.sync(this.grid);
    this.vesselSync.sync(this.grid);
    // The minimap needs the grid, so it spawns here rather than in
    // onInitialize. Registering its pointer target gives its taps priority
    // over world taps and re-pins it on every resize.
    const minimap = spawnMinimap({
      engine: this.engine,
      grid: this.grid,
      camera: this.camera,
      onJump: (x, y) => this.panCameraTo(x, y),
    });
    this.add(minimap.element);
    this.registerHudTarget(minimap.target);
  }

  protected override createEmptyTileActor(
    col: number,
    row: number,
    onPressed: (a: TileActor) => void,
  ): TileActor {
    return new TileActor({
      grid: this.grid,
      col,
      row,
      onPressed,
      buttons: [
        roundButton({
          icon: "warp",
          label: "Move",
          onPressed: () => console.log("Move empty tile"),
        }),
        roundButton({
          icon: "deploy",
          label: "Deploy",
          onPressed: () => void this.vesselSync.dispatch(col, row),
        }),
      ],
    });
  }
}
