import * as ex from "excalibur";

import { invoke } from "@tauri-apps/api/core";

import { gameState, serverNow, VesselMoveEvent } from "../state/game-state.ts";
import { TileGridGeometry } from "../scene/grid-math.ts";
import { TileActor } from "../scene/tile-actor.ts";
import { roundButton } from "../ui/index.ts";
import { vesselWorldPos } from "./vessel-math.ts";

/** Scene services VesselSync needs — kept narrow so it doesn't reach back
 *  into MapLevel for anything beyond spawning actors, routing taps, and
 *  clearing the selection when a dispatch is sent. */
export interface VesselSyncHost {
  add(actor: TileActor): void;
  onTilePressed(actor: TileActor): void;
  deselectActor(): void;
}

/**
 * Reconciles vessel actors against gameState.vessels — the client mirror of
 * the backend's vessel table, refreshed by every load_game_state snapshot
 * and merged into by dispatch/recall command responses — and owns the
 * dispatch/recall requests themselves. Doesn't fit the shared
 * `reconcileActors` skeleton (src/scene/actor-sync.ts): a changed event redirects
 * an existing actor in place with a lerp rather than rebuilding it, and a
 * return leg that already finished must *not* respawn (the backend prunes it
 * from its next snapshot).
 */
export class VesselSync {
  private vessels = new Map<string, TileActor>();
  /** The last VesselMoveEvent applied per vesselId, used by sync() to skip
   *  re-applying moves the periodic snapshot poll returned unchanged. */
  private appliedVesselEvents = new Map<string, VesselMoveEvent>();

  constructor(private readonly host: VesselSyncHost) {}

  /**
   * With `force`, unchanged events are re-applied too — used on scene
   * activation to re-lerp positions after this scene's update loop was
   * paused (vessel actors freeze mid-flight while another scene is active,
   * but the event timestamps remain the source of truth).
   */
  sync(grid: TileGridGeometry | null, force = false): void {
    // The gameState subscription can fire before the async map load
    // finishes; MapLevel.setupActors calls this again once the grid exists.
    if (!grid) return;
    for (const [vesselId, actor] of this.vessels) {
      if (!gameState.vessels.has(vesselId)) actor.kill();
    }
    for (const vesselId of this.appliedVesselEvents.keys()) {
      if (!gameState.vessels.has(vesselId)) {
        this.appliedVesselEvents.delete(vesselId);
      }
    }
    const now = serverNow();
    for (const event of gameState.vessels.values()) {
      const applied = this.appliedVesselEvents.get(event.vesselId);
      const unchanged = applied !== undefined &&
        applied.dispatchedAt === event.dispatchedAt &&
        applied.destCol === event.destCol &&
        applied.destRow === event.destRow;
      if (unchanged && !force) continue;
      // A return leg that already finished describes a vessel that no
      // longer exists — the backend prunes it from its next snapshot; don't
      // respawn it in the meantime. (A live actor mid-return isn't affected:
      // its arrival handling despawns it.)
      if (
        !this.vessels.has(event.vesselId) &&
        now >= event.arrivalAt &&
        event.returning
      ) {
        continue;
      }
      this.appliedVesselEvents.set(event.vesselId, event);
      this.applyMoveEvent(grid, event);
    }
  }

  /**
   * Creates, redirects, or re-syncs a vessel according to the given event.
   * Designed to be called both for local player actions and for
   * server-pushed events from other players. The vessel is always placed at
   * the position the event timestamps imply, so an aged event — from a
   * late-join snapshot, or re-applied after this scene sat inactive — lands
   * mid-flight (or at the destination), never back at the source. A return
   * leg (`event.returning`) docks and despawns the vessel on arrival.
   */
  private applyMoveEvent(grid: TileGridGeometry, event: VesselMoveEvent): void {
    const onArrival = event.returning
      ? () => this.vessels.get(event.vesselId)?.kill()
      : undefined;

    // Authoritative current position: lerp src → dest by the event's server
    // timestamps. t >= 1 snaps to the destination and moveTo completes
    // immediately, running the normal arrival handling.
    const worldPos = vesselWorldPos(
      event,
      grid.tileWidth,
      grid.tileHeight,
      serverNow(),
    );
    const currentPos = ex.vec(worldPos.x, worldPos.y);

    const existing = this.vessels.get(event.vesselId);
    if (existing) {
      existing.pos = currentPos;
      existing.moveTo(event.destCol, event.destRow, event.speed, onArrival);
      return;
    }

    const vessel = new TileActor({
      grid,
      tile: `${event.vesselType}-base:0`,
      movingTile: `${event.vesselType}-moving:0`,
      col: event.srcCol,
      row: event.srcRow,
      width: 1,
      height: 1,
      ownerName: event.ownerName,
      ownerId: event.ownerId,
      onPressed: this.host.onTilePressed,
      buttons: [
        roundButton({
          icon: "details",
          label: "Details",
          onPressed: () => console.log("Details vessel", event.vesselId),
        }),
        roundButton({
          icon: "back",
          label: "Return",
          onPressed: () => void this.recall(event.vesselId),
        }),
      ],
    });
    this.vessels.set(event.vesselId, vessel);
    // Centralized cleanup: any kill path drops the tracking entry.
    vessel.on("kill", () => this.vessels.delete(event.vesselId));
    this.host.add(vessel);
    vessel.pos = currentPos;
    vessel.moveTo(event.destCol, event.destRow, event.speed, onArrival);
  }

  /**
   * Asks the backend to dispatch a vessel from the mothership to the given
   * tile. The backend verifies the destination, picks the departure dock,
   * and returns the authoritative VesselMoveEvent (id, speed, and arrival
   * time all server-stamped); merging it into gameState fans it out to
   * sync() → applyMoveEvent. Already the phase-3 shape: send a request,
   * apply the server's event — only the transport changes (Tauri IPC now,
   * WebSocket in P3.1).
   */
  async dispatch(destCol: number, destRow: number): Promise<void> {
    this.host.deselectActor(); // clear the destination empty tile actor
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
   * Asks the backend to recall a vessel to the mothership. The backend
   * computes the vessel's current position from its recorded move (so the
   * return leg is verified, not client-declared) and returns the authorized
   * event; docking — arrival at a dock tile — despawns the vessel on both
   * sides.
   */
  private async recall(vesselId: string): Promise<void> {
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
