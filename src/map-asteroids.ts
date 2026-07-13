import * as ex from "excalibur";

import { invoke } from "@tauri-apps/api/core";

import { ASTEROID_TINTS, asteroidDisplayName } from "./asteroid-catalog.ts";
import { reconcileActors } from "./actor-sync.ts";
import { AsteroidData, gameState, VesselMoveEvent } from "./game-state.ts";
import { TileGridGeometry } from "./grid-math.ts";
import { TileActor } from "./tile-actor.ts";
import { formatCompactCount, roundButton } from "./ui/index.ts";

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

/** Scene services AsteroidSync needs — kept narrow so it doesn't reach back
 *  into MapLevel for anything beyond spawning actors, routing taps, and
 *  clearing the selection when a mining dispatch is sent. */
export interface AsteroidSyncHost {
  add(actor: TileActor): void;
  onTilePressed(actor: TileActor): void;
  deselectActor(): void;
}

/**
 * Reconciles asteroid actors against gameState.asteroids — the client mirror
 * of the backend's asteroid table (ROADMAP P1.6), refreshed by every
 * load_game_state snapshot and merged into by asteroid pushes. Changed
 * asteroids (a reduced deposit, a claimed or freed mining slot) are rebuilt
 * in place, and mined-out asteroids that left the table despawn — so
 * harvests reach the map with no client math. Also owns the Mine action: it
 * dispatches a vessel from the mothership, so its result is a
 * VesselMoveEvent even though the trigger lives on the asteroid's button.
 */
export class AsteroidSync {
  private asteroids = new Map<string, TileActor>();
  /** The last AsteroidData applied per asteroidId, used by sync() to skip
   *  rebuilding unchanged asteroids on every notify. */
  private appliedAsteroids = new Map<string, AsteroidData>();

  constructor(private readonly host: AsteroidSyncHost) {}

  sync(grid: TileGridGeometry | null): void {
    // The gameState subscription can fire before the async map load
    // finishes; MapLevel.setupActors calls this again once the grid exists.
    if (!grid) return;
    reconcileActors({
      actors: this.asteroids,
      applied: this.appliedAsteroids,
      source: gameState.asteroids,
      id: (data) => data.asteroidId,
      same: sameAsteroid,
      add: this.host.add,
      build: (data) => this.createActor(grid, data),
    });
  }

  /**
   * Builds the map actor for one asteroid: the placeholder sprite tinted by
   * yielded resource, a remaining-deposit badge, and the Mine action —
   * disabled while a vessel holds the asteroid's single mining slot (the
   * actor is rebuilt when the slot changes, so the button state stays
   * current).
   */
  private createActor(grid: TileGridGeometry, data: AsteroidData): TileActor {
    return new TileActor({
      grid,
      tile: {
        tile: `asteroid-${data.tier}`,
        tint: ex.Color.fromHex(ASTEROID_TINTS[data.resource]),
      },
      col: data.col,
      row: data.row,
      width: data.span,
      height: data.span,
      ownerName: asteroidDisplayName(data),
      onPressed: this.host.onTilePressed,
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
          onPressed: () => void this.mine(data.asteroidId),
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
   * VesselSync.dispatch: send a request, apply the server's event.
   */
  private async mine(asteroidId: string): Promise<void> {
    this.host.deselectActor();
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
}
