import * as ex from "excalibur";

import { invoke } from "@tauri-apps/api/core";

import { gameState, MothershipData, VesselMoveEvent } from "./game-state.ts";
import { isDockTile } from "./grid-math.ts";
import { buildTileMap } from "./map-loader.ts";
import { TileActor } from "./tile-actor.ts";
import { TiledScene } from "./tiled-scene.ts";

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

export class MapLevel extends TiledScene {
  override onInitialize(engine: ex.Engine): void {
    super.onInitialize(engine);
    this.addCommonHud({
      frameTile: "ui-frame-square:0",
      activeFrameTile: "ui-frame-square:1",
      disabledFrameTile: "ui-frame-square:2",
      tile: "ui-icon-shipview:0",
      activeTile: "ui-icon-shipview:1",
      disabledTile: "ui-icon-shipview:2",
      width: 64,
      height: 64,
      label: "Ship",
      onPressed: () => engine.goToScene("ship"),
    });
    // The backend state may load (or a future login complete) after this
    // scene is built — reconcile mothership and vessel actors against the
    // refreshed tables on every notify. Motherships first: vessels need the
    // player's ship for dock math. No unsubscribe: scenes live for the
    // whole app run.
    gameState.subscribe(() => {
      this.syncMotherships();
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
  /** Active vessels keyed by vesselId. */
  private vessels = new Map<string, TileActor>();
  /** The last VesselMoveEvent applied per vesselId, used by syncVessels to
   *  skip re-applying moves the periodic snapshot poll returned unchanged. */
  private appliedVesselEvents = new Map<string, VesselMoveEvent>();

  protected override buildMap(): Promise<ex.TileMap> {
    return buildTileMap("map");
  }

  protected override supportsEmptyTileActor(): boolean {
    return true;
  }

  protected override setupActors(): void {
    // Nothing is placed here: mothership placement is server-owned, so all
    // map actors are reconciled from the backend snapshot — which may have
    // loaded before this scene finished its async map build (hence the
    // explicit sync), or may land later (the gameState subscription).
    this.syncMotherships();
    this.syncVessels();
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
    if (!this.tilemap) return;
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
    const roundButton = (
      icon: string,
      label: string,
      onPressed: () => void,
    ) => ({
      frameTile: "ui-frame-round:0",
      activeFrameTile: "ui-frame-round:1",
      disabledFrameTile: "ui-frame-round:2",
      tile: `ui-icon-${icon}:0`,
      activeTile: `ui-icon-${icon}:1`,
      disabledTile: `ui-icon-${icon}:2`,
      label,
      onPressed,
    });
    return new TileActor({
      tilemap: this.tilemap,
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
          roundButton(
            "details",
            "Details",
            () => console.log("Details my spaceship"),
          ),
          roundButton(
            "enter",
            "Enter",
            () => console.log("Enter my spaceship"),
          ),
          roundButton(
            "upgrade",
            "Upgrade",
            () => console.log("Upgrade my spaceship"),
          ),
          roundButton("warp", "Move", () => console.log("Move my spaceship")),
        ]
        : [
          roundButton(
            "details",
            "Details",
            () => console.log("Details enemy spaceship"),
          ),
          roundButton(
            "message",
            "Message",
            () => console.log("Message enemy spaceship"),
          ),
          roundButton(
            "attack",
            "Attack",
            () => console.log("Attack enemy spaceship"),
          ),
        ],
    });
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
    if (!this.tilemap) return;
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
      tilemap: this.tilemap,
      col,
      row,
      onPressed,
      buttons: [
        {
          frameTile: "ui-frame-round:0",
          activeFrameTile: "ui-frame-round:1",
          disabledFrameTile: "ui-frame-round:2",
          tile: "ui-icon-warp:0",
          activeTile: "ui-icon-warp:1",
          disabledTile: "ui-icon-warp:2",
          label: "Move",
          onPressed: () => console.log("Move empty tile"),
        },
        {
          frameTile: "ui-frame-round:0",
          activeFrameTile: "ui-frame-round:1",
          disabledFrameTile: "ui-frame-round:2",
          tile: "ui-icon-deploy:0",
          activeTile: "ui-icon-deploy:1",
          disabledTile: "ui-icon-deploy:2",
          label: "Deploy",
          onPressed: () => void this.dispatchVessel(col, row),
        },
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
      tilemap: this.tilemap,
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
        {
          frameTile: "ui-frame-round:0",
          activeFrameTile: "ui-frame-round:1",
          disabledFrameTile: "ui-frame-round:2",
          tile: "ui-icon-details:0",
          activeTile: "ui-icon-details:1",
          disabledTile: "ui-icon-details:2",
          label: "Details",
          onPressed: () => console.log("Details vessel", event.vesselId),
        },
        {
          frameTile: "ui-frame-round:0",
          activeFrameTile: "ui-frame-round:1",
          disabledFrameTile: "ui-frame-round:2",
          tile: "ui-icon-back:0",
          activeTile: "ui-icon-back:1",
          disabledTile: "ui-icon-back:2",
          label: "Return",
          onPressed: () => void this.recallVessel(event.vesselId),
        },
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
      col * this.tilemap.tileWidth + this.tilemap.tileWidth / 2,
      row * this.tilemap.tileHeight + this.tilemap.tileHeight / 2,
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
