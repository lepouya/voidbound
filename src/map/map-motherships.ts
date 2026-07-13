import { gameState, MothershipData } from "../state/game-state.ts";
import { TileGridGeometry } from "../scene/grid-math.ts";
import { reconcileActors } from "../scene/actor-sync.ts";
import { TileActor } from "../scene/tile-actor.ts";
import { roundButton } from "../ui/index.ts";

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

/** Scene services MothershipSync needs — kept narrow so it doesn't reach back
 *  into MapLevel for anything beyond spawning actors, routing taps, opening
 *  the details panel, and switching to the ship interior. */
export interface MothershipSyncHost {
  add(actor: TileActor): void;
  onTilePressed(actor: TileActor): void;
  edgeFallthrough(): boolean;
  openDetails(mothershipId: string): void;
  enterShip(): void;
}

/**
 * Reconciles mothership actors against gameState.motherships — the client
 * mirror of the backend's placement table, refreshed by every
 * load_game_state snapshot. New ships (a player joining) spawn, ships that
 * left the snapshot despawn, and changed ships (moved, renamed, damaged) are
 * rebuilt in place — so server-side updates reach the map with no client
 * changes. The local player's own ship is additionally tracked as `ownShip`
 * for camera and vessel-dock math (MapLevel.initialCameraTarget).
 */
export class MothershipSync {
  private motherships = new Map<string, TileActor>();
  /** The last MothershipData applied per mothershipId, used by sync() to
   *  skip rebuilding unchanged ships on every poll. */
  private appliedMotherships = new Map<string, MothershipData>();
  private ownShipActor: TileActor | null = null;

  constructor(private readonly host: MothershipSyncHost) {}

  /** The local player's mothership actor, or null until the backend
   *  snapshot delivers it. */
  get ownShip(): TileActor | null {
    return this.ownShipActor;
  }

  sync(grid: TileGridGeometry | null): void {
    // The gameState subscription can fire before the async map load
    // finishes; MapLevel.setupActors calls this again once the grid exists.
    if (!grid) return;
    // Placement or appearance changes rebuild the actor in place — a moved
    // ship is a rare, discrete server event, so there's no travel animation
    // to preserve.
    reconcileActors({
      actors: this.motherships,
      applied: this.appliedMotherships,
      source: gameState.motherships,
      id: (data) => data.mothershipId,
      same: sameMothership,
      add: this.host.add,
      build: (data) => this.createActor(grid, data),
      onAdd: (data, actor) => {
        if (data.ownerId === gameState.player.id) this.ownShipActor = actor;
      },
      onRemove: (_id, actor) => {
        if (this.ownShipActor === actor) this.ownShipActor = null;
      },
    });
  }

  /** Builds the map actor for one mothership; the player's own ship gets
   *  command buttons, everyone else's the diplomacy/combat set. */
  private createActor(
    grid: TileGridGeometry,
    data: MothershipData,
  ): TileActor {
    const own = data.ownerId === gameState.player.id;
    return new TileActor({
      grid,
      tile: `${data.shipType}-${data.damaged ? "damaged" : "base"}:0`,
      col: data.col,
      row: data.row,
      width: data.span,
      height: data.span,
      ownerName: data.ownerName,
      ownerId: data.ownerId,
      onPressed: this.host.onTilePressed,
      edgeFallthrough: this.host.edgeFallthrough(),
      buttons: own
        ? [
          // No standalone Upgrade button: upgrading the ship is leveling
          // its Command Module, which lives in the details panel's readout
          // row (ROADMAP P1.16).
          roundButton({
            icon: "details",
            label: "Details",
            onPressed: () => this.host.openDetails(data.mothershipId),
          }),
          roundButton({
            icon: "enter",
            label: "Enter",
            onPressed: () => this.host.enterShip(),
          }),
          roundButton({
            icon: "warp",
            // "Warp" (not "Move") so it can't be confused with vessel
            // Move/Deploy; the relocation itself lands with P4.7.
            label: "Warp",
            onPressed: () => console.log("Warp my spaceship"),
          }),
        ]
        : [
          roundButton({
            icon: "details",
            label: "Details",
            onPressed: () => this.host.openDetails(data.mothershipId),
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
}
