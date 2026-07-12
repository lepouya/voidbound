import * as ex from "excalibur";

import { invoke } from "@tauri-apps/api/core";

import { AOI_REQUERY_TILES, MAP_VIEW_TILES_CAP } from "./aoi-config.ts";
import { ASTEROID_TINTS, asteroidDisplayName } from "./asteroid-catalog.ts";
import { tileViewCapZoom } from "./camera-math.ts";
import {
  AsteroidData,
  gameState,
  MapWindowData,
  MothershipData,
  VesselMoveEvent,
} from "./game-state.ts";
import { isDockTile } from "./grid-math.ts";
import { fetchGridGeometry } from "./map-loader.ts";
import { spawnMinimap } from "./minimap.ts";
import { TileActor } from "./tile-actor.ts";
import { SceneMap, TiledScene } from "./tiled-scene.ts";
import { formatCompactCount, roundButton, squareButton } from "./ui/index.ts";

/** True when two snapshots describe an identical ship — placement, art, and
 *  ownership — so the reconciler can skip rebuilding its actor. */
function sameMothership(a: MothershipData, b: MothershipData): boolean {
  return (
    a.col === b.col &&
    a.row === b.row &&
    a.span === b.span &&
    a.shipType === b.shipType &&
    a.damaged === b.damaged &&
    a.ownerId === b.ownerId &&
    a.ownerName === b.ownerName
  );
}

/** True when two snapshots describe an identical asteroid — placement, class,
 *  deposit, and mining slot — so the reconciler can skip rebuilding its
 *  actor. The mining slot matters: it toggles the Mine button. */
function sameAsteroid(a: AsteroidData, b: AsteroidData): boolean {
  return (
    a.col === b.col &&
    a.row === b.row &&
    a.span === b.span &&
    a.tier === b.tier &&
    a.resource === b.resource &&
    a.remaining === b.remaining &&
    (a.mining?.vesselId ?? null) === (b.mining?.vesselId ?? null)
  );
}

export class MapLevel extends TiledScene {
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
      this.syncMotherships();
      this.syncAsteroids();
      this.syncVessels();
    });
  }

  /**
   * Vessel actors freeze mid-flight while another scene is active (Excalibur
   * only updates the current scene), but the event timestamps remain the
   * source of truth. On re-activation, force-reapply every known event:
   * applyVesselMoveEvent re-lerps each vessel to its authoritative current
   * position and restarts the remaining leg — or completes it, docking
   * included, if it finished while the player was away.
   */
  override onActivate(): void {
    super.onActivate();
    this.syncVessels(true);
  }

  protected override initialCameraTarget(): { pos: ex.Vector; zoom: number } {
    // The backend snapshot may not have landed yet (or failed to): fall back
    // to the map center until the player's mothership exists.
    if (!this.mothership) return super.initialCameraTarget();
    return { pos: this.mothership.pos, zoom: 1 };
  }

  /** The local player's mothership actor — camera home and vessel dock
   *  target. Null until the backend snapshot delivers it (syncMotherships). */
  private mothership: TileActor | null = null;
  /** Mothership actors keyed by mothershipId. */
  private motherships = new Map<string, TileActor>();
  /** The last MothershipData applied per mothershipId, used by
   *  syncMotherships to skip rebuilding unchanged ships on every poll. */
  private appliedMotherships = new Map<string, MothershipData>();
  /** Asteroid actors keyed by asteroidId. */
  private asteroids = new Map<string, TileActor>();
  /** The last AsteroidData applied per asteroidId, used by syncAsteroids to
   *  skip rebuilding unchanged asteroids on every notify. */
  private appliedAsteroids = new Map<string, AsteroidData>();
  /** Active vessels keyed by vesselId. */
  private vessels = new Map<string, TileActor>();
  /** The last VesselMoveEvent applied per vesselId, used by syncVessels to
   *  skip re-applying moves the periodic snapshot poll returned unchanged. */
  private appliedVesselEvents = new Map<string, VesselMoveEvent>();

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
    this.syncMotherships();
    this.syncAsteroids();
    this.syncVessels();
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

  /**
   * Reconcile mothership actors against gameState.motherships — the client
   * mirror of the backend's placement table, refreshed by every
   * load_game_state snapshot. New ships (a player joining) spawn, ships that
   * left the snapshot despawn, and changed ships (moved, renamed, damaged)
   * are rebuilt in place — so server-side updates reach the map with no
   * client changes. The player's own ship is additionally tracked as
   * this.mothership for camera and vessel-dock math.
   */
  private syncMotherships(): void {
    // The subscription can fire before the async map load finishes;
    // setupActors calls this again once the tilemap exists.
    if (!this.grid) return;
    for (const [id, actor] of this.motherships) {
      if (!gameState.motherships.has(id)) {
        actor.kill();
        this.motherships.delete(id);
        this.appliedMotherships.delete(id);
        if (this.mothership === actor) this.mothership = null;
      }
    }
    for (const data of gameState.motherships.values()) {
      const applied = this.appliedMotherships.get(data.mothershipId);
      if (applied !== undefined && sameMothership(applied, data)) continue;
      // Placement or appearance changed: rebuild the actor. A moved ship is
      // a rare, discrete server event — no travel animation to preserve.
      this.motherships.get(data.mothershipId)?.kill();
      const actor = this.createMothershipActor(data);
      this.motherships.set(data.mothershipId, actor);
      this.appliedMotherships.set(data.mothershipId, data);
      this.add(actor);
      if (data.ownerId === gameState.player.id) this.mothership = actor;
    }
  }

  /** Builds the map actor for one mothership; the player's own ship gets
   *  command buttons, everyone else's the diplomacy/combat set. */
  private createMothershipActor(data: MothershipData): TileActor {
    const own = data.ownerId === gameState.player.id;
    return new TileActor({
      grid: this.grid,
      tile: `${data.shipType}-${data.damaged ? "damaged" : "base"}:0`,
      col: data.col,
      row: data.row,
      width: data.span,
      height: data.span,
      ownerName: data.ownerName,
      ownerId: data.ownerId,
      onPressed: this.handleTilePressed,
      edgeFallthrough: this.supportsEmptyTileActor(),
      buttons: own
        ? [
          roundButton({
            icon: "details",
            label: "Details",
            onPressed: () => console.log("Details my spaceship"),
          }),
          roundButton({
            icon: "enter",
            label: "Enter",
            onPressed: () => console.log("Enter my spaceship"),
          }),
          roundButton({
            icon: "upgrade",
            label: "Upgrade",
            onPressed: () => console.log("Upgrade my spaceship"),
          }),
          roundButton({
            icon: "warp",
            label: "Move",
            onPressed: () => console.log("Move my spaceship"),
          }),
        ]
        : [
          roundButton({
            icon: "details",
            label: "Details",
            onPressed: () => console.log("Details enemy spaceship"),
          }),
          roundButton({
            icon: "message",
            label: "Message",
            onPressed: () => console.log("Message enemy spaceship"),
          }),
          roundButton({
            icon: "attack",
            label: "Attack",
            onPressed: () => console.log("Attack enemy spaceship"),
          }),
        ],
    });
  }

  /**
   * Reconcile asteroid actors against gameState.asteroids — the client
   * mirror of the backend's asteroid table (ROADMAP P1.6), refreshed by
   * every load_game_state snapshot and merged into by asteroid pushes.
   * Changed asteroids (a reduced deposit, a claimed or freed mining slot)
   * are rebuilt in place, and mined-out asteroids that left the table
   * despawn — so harvests reach the map with no client math.
   */
  private syncAsteroids(): void {
    // The subscription can fire before the async map load finishes;
    // setupActors calls this again once the tilemap exists.
    if (!this.grid) return;
    for (const [id, actor] of this.asteroids) {
      if (!gameState.asteroids.has(id)) {
        actor.kill();
        this.asteroids.delete(id);
        this.appliedAsteroids.delete(id);
      }
    }
    for (const data of gameState.asteroids.values()) {
      const applied = this.appliedAsteroids.get(data.asteroidId);
      if (applied !== undefined && sameAsteroid(applied, data)) continue;
      this.asteroids.get(data.asteroidId)?.kill();
      const actor = this.createAsteroidActor(data);
      this.asteroids.set(data.asteroidId, actor);
      this.appliedAsteroids.set(data.asteroidId, data);
      this.add(actor);
    }
  }

  /**
   * Builds the map actor for one asteroid: the placeholder sprite tinted by
   * yielded resource, a remaining-deposit badge, and the Mine action —
   * disabled while a vessel holds the asteroid's single mining slot (the
   * actor is rebuilt when the slot changes, so the button state stays
   * current).
   */
  private createAsteroidActor(data: AsteroidData): TileActor {
    return new TileActor({
      grid: this.grid,
      tile: {
        tile: `asteroid-${data.tier}`,
        tint: ex.Color.fromHex(ASTEROID_TINTS[data.resource]),
      },
      col: data.col,
      row: data.row,
      width: data.span,
      height: data.span,
      ownerName: asteroidDisplayName(data),
      onPressed: this.handleTilePressed,
      badges: [
        { anchor: "top-right", badge: formatCompactCount(data.remaining) },
      ],
      buttons: [
        roundButton({
          icon: "details",
          label: "Details",
          onPressed: () => console.log("Details asteroid", data),
        }),
        roundButton({
          icon: "mine",
          label: "Mine",
          disabled: data.mining !== null,
          onPressed: () => void this.mineAsteroid(data.asteroidId),
        }),
      ],
    });
  }

  /**
   * Asks the backend to dispatch a vessel from the mothership to mine the
   * given asteroid (ROADMAP P1.6). The backend verifies the free mining
   * slot, reserves it, derives the destination tile and extraction window,
   * and returns the authoritative VesselMoveEvent; the asteroid's own change
   * (its claimed slot) arrives as a server push. Same phase-3 shape as
   * dispatchVessel: send a request, apply the server's event.
   */
  private async mineAsteroid(asteroidId: string): Promise<void> {
    this.deselectActor();
    try {
      const event = await invoke<VesselMoveEvent>("request_mine_asteroid", {
        asteroidId,
      });
      gameState.applyVesselEvent(event);
    } catch (err) {
      // No rejection UI yet — the Mine button is disabled while the slot is
      // taken, so this is a race (or a bug). Log it; state stays untouched.
      console.warn("request_mine_asteroid rejected:", err);
    }
  }

  /**
   * Reconcile vessel actors against gameState.vessels — the client mirror of
   * the backend's vessel table, refreshed by every load_game_state snapshot
   * and merged into by dispatch/recall command responses. Creates or
   * redirects actors for new or changed events and kills actors whose vessel
   * left the snapshot (docked while another scene was active). With `force`,
   * unchanged events are re-applied too — used on scene activation to
   * re-lerp positions after this scene's update loop was paused.
   */
  private syncVessels(force = false): void {
    // The subscription can fire before the async map load finishes;
    // setupActors calls syncVessels again once the tilemap exists.
    if (!this.grid) return;
    for (const [vesselId, actor] of this.vessels) {
      if (!gameState.vessels.has(vesselId)) actor.kill();
    }
    for (const vesselId of this.appliedVesselEvents.keys()) {
      if (!gameState.vessels.has(vesselId)) {
        this.appliedVesselEvents.delete(vesselId);
      }
    }
    const now = Date.now();
    for (const event of gameState.vessels.values()) {
      const applied = this.appliedVesselEvents.get(event.vesselId);
      const unchanged = applied !== undefined &&
        applied.dispatchedAt === event.dispatchedAt &&
        applied.destCol === event.destCol &&
        applied.destRow === event.destRow;
      if (unchanged && !force) continue;
      // A move that already finished on its mothership's docking tile
      // describes a vessel that no longer exists — the backend prunes it
      // from its next snapshot; don't respawn it in the meantime. (A live
      // actor mid-return isn't affected: its arrival handling despawns it.)
      const home = this.motherships.get(event.mothershipId);
      if (
        !this.vessels.has(event.vesselId) &&
        now >= event.arrivalAt &&
        home !== undefined &&
        isDockTile(home, event.destCol, event.destRow)
      ) {
        continue;
      }
      this.appliedVesselEvents.set(event.vesselId, event);
      this.applyVesselMoveEvent(event);
    }
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
          onPressed: () => void this.dispatchVessel(col, row),
        }),
      ],
    });
  }

  /**
   * Asks the backend to dispatch a vessel from the mothership to the given
   * tile. The backend verifies the destination, picks the departure dock,
   * and returns the authoritative VesselMoveEvent (id, speed, and arrival
   * time all server-stamped); merging it into gameState fans it out to
   * syncVessels → applyVesselMoveEvent. Already the phase-3 shape: send a
   * request, apply the server's event — only the transport changes (Tauri
   * IPC now, WebSocket in P3.1).
   */
  private async dispatchVessel(
    destCol: number,
    destRow: number,
  ): Promise<void> {
    this.deselectActor(); // clear the destination empty tile actor
    try {
      const event = await invoke<VesselMoveEvent>("request_dispatch_vessel", {
        destCol,
        destRow,
      });
      gameState.applyVesselEvent(event);
    } catch (err) {
      // No rejection UI yet — the Deploy button only appears on empty tiles,
      // so this is a race (or a bug). Log it; state stays untouched.
      console.warn("request_dispatch_vessel rejected:", err);
    }
  }

  /**
   * Creates, redirects, or re-syncs a vessel according to the given event.
   * Designed to be called both for local player actions and for server-pushed
   * events from other players. The vessel is always placed at the position
   * the event timestamps imply, so an aged event — from a late-join snapshot,
   * or re-applied after this scene sat inactive — lands mid-flight (or at the
   * destination), never back at the source. A move whose destination is a
   * mothership dock tile is a return: the vessel docks and despawns on
   * arrival.
   */
  applyVesselMoveEvent(event: VesselMoveEvent): void {
    const home = this.motherships.get(event.mothershipId);
    const onArrival =
      home !== undefined && isDockTile(home, event.destCol, event.destRow)
        ? () => this.vessels.get(event.vesselId)?.kill()
        : undefined;

    // Authoritative current position: lerp src → dest by the event's server
    // timestamps. t >= 1 snaps to the destination and moveTo completes
    // immediately, running the normal arrival handling.
    const duration = event.arrivalAt - event.dispatchedAt;
    const t = duration > 0
      ? ex.clamp((Date.now() - event.dispatchedAt) / duration, 0, 1)
      : 1;
    const src = this.tileCenter(event.srcCol, event.srcRow);
    const dest = this.tileCenter(event.destCol, event.destRow);
    const currentPos = src.add(dest.sub(src).scale(t));

    const existing = this.vessels.get(event.vesselId);
    if (existing) {
      existing.pos = currentPos;
      existing.moveTo(event.destCol, event.destRow, event.speed, onArrival);
      return;
    }

    const vessel = new TileActor({
      grid: this.grid,
      tile: `${event.vesselType}-base:0`,
      movingTile: `${event.vesselType}-moving:0`,
      col: event.srcCol,
      row: event.srcRow,
      width: 1,
      height: 1,
      ownerName: event.ownerName,
      ownerId: event.ownerId,
      onPressed: this.handleTilePressed,
      buttons: [
        roundButton({
          icon: "details",
          label: "Details",
          onPressed: () => console.log("Details vessel", event.vesselId),
        }),
        roundButton({
          icon: "back",
          label: "Return",
          onPressed: () => void this.recallVessel(event.vesselId),
        }),
      ],
    });
    this.vessels.set(event.vesselId, vessel);
    // Centralized cleanup: any kill path drops the tracking entry.
    vessel.on("kill", () => this.vessels.delete(event.vesselId));
    this.add(vessel);
    vessel.pos = currentPos;
    vessel.moveTo(event.destCol, event.destRow, event.speed, onArrival);
  }

  /** World-space center of the given tile (matches 1*1 TileActor placement). */
  private tileCenter(col: number, row: number): ex.Vector {
    return ex.vec(
      col * this.grid.tileWidth + this.grid.tileWidth / 2,
      row * this.grid.tileHeight + this.grid.tileHeight / 2,
    );
  }

  /**
   * Asks the backend to recall a vessel to the mothership. The backend
   * computes the vessel's current position from its recorded move (so the
   * return leg is verified, not client-declared) and returns the authorized
   * event; docking — arrival at a dock tile — despawns the vessel on both
   * sides.
   */
  private async recallVessel(vesselId: string): Promise<void> {
    try {
      const event = await invoke<VesselMoveEvent>("request_recall_vessel", {
        vesselId,
      });
      gameState.applyVesselEvent(event);
    } catch (err) {
      // Double-recalls are legal redirects, so a rejection here means the
      // vessel is gone (already docked) or a bug. Log it; state is untouched.
      console.warn("request_recall_vessel rejected:", err);
    }
  }
}
