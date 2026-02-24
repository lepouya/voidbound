import * as ex from "excalibur";

import { buildTileMap } from "./map-loader";
import { TileActor } from "./tile-actor";
import { TiledScene } from "./tiled-scene";

export interface VesselMoveEvent {
  vesselId: string;
  ownerId: string;
  /** Display name shown below the vessel sprite. */
  ownerName: string;
  /** Which mothership dispatched or will receive this vessel. */
  mothershipId: string;
  /** Sprite/capability type, e.g. "cs1". */
  vesselType: string;
  srcCol: number;
  srcRow: number;
  destCol: number;
  destRow: number;
  /** World px/s, server-verified. */
  speed: number;
  /** Server epoch ms when the move was authorized. */
  dispatchedAt: number;
  /** Pre-computed arrival time: dispatchedAt + (distancePx / speed * 1000).
   *  Lets late-joining clients lerp to the current position without re-computing
   *  travel time. */
  arrivalAt: number;
}

export class MapLevel extends TiledScene {
  /** World px/s. 1 tile (32 px) per second by default; update on upgrade. */
  private vesselSpeed = 32;
  private mothership!: TileActor;
  /** Active vessels keyed by vesselId. */
  private vessels = new Map<string, TileActor>();

  protected override buildMap(): Promise<ex.TileMap> {
    return buildTileMap("space");
  }

  protected override setupActors(
    onTilePressed: (a: TileActor) => void,
  ): void {
    this.mothership = new TileActor({
      tilemap: this.tilemap,
      tile: "ss1-base:0",
      col: 48,
      row: 48,
      width: 4,
      height: 4,
      ownerName: "My Spaceship",
      ownerId: "player-1",
      onPressed: onTilePressed,
      buttons: [
        {
          tile: "ui-button-details:0",
          label: "Details",
          onPressed: () => console.log("Details my spaceship"),
        },
        {
          tile: "ui-button-enter:0",
          label: "Enter",
          onPressed: () => console.log("Enter my spaceship"),
        },
        {
          tile: "ui-button-upgrade:0",
          label: "Upgrade",
          onPressed: () => console.log("Upgrade my spaceship"),
        },
        {
          tile: "ui-button-warp:0",
          label: "Move",
          onPressed: () => console.log("Move my spaceship"),
        },
      ],
    });
    this.add(this.mothership);

    this.add(
      new TileActor({
        tilemap: this.tilemap,
        tile: "ss1-damaged:0",
        col: 53,
        row: 49,
        width: 4,
        height: 4,
        ownerName: "Enemy Spaceship",
        ownerId: "player-2",
        onPressed: onTilePressed,
        buttons: [
          {
            tile: "ui-button-details:0",
            label: "Details",
            onPressed: () => console.log("Details enemy spaceship"),
          },
          {
            tile: "ui-button-message:0",
            label: "Message",
            onPressed: () => console.log("Message enemy spaceship"),
          },
          {
            tile: "ui-button-attack:0",
            label: "Attack",
            onPressed: () => console.log("Attack enemy spaceship"),
          },
        ],
      }),
    );
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
          tile: "ui-button-warp:0",
          label: "Move",
          onPressed: () => console.log("Move empty tile"),
        },
        {
          tile: "ui-button-deploy:0",
          label: "Deploy",
          onPressed: () => this.dispatchVessel(col, row),
        },
      ],
    });
  }

  /**
   * Returns the center tile of the mothership's inner 2*2 that is closest to
   * the given destination. Used as the spawn/dock point for vessels.
   */
  private closestDockTile(
    destCol: number,
    destRow: number,
  ): { col: number; row: number } {
    const halfCols = this.mothership.colSpan / 2;
    const halfRows = this.mothership.rowSpan / 2;
    const col = destCol < this.mothership.col + halfCols
      ? this.mothership.col + halfCols - 1
      : this.mothership.col + halfCols;
    const row = destRow < this.mothership.row + halfRows
      ? this.mothership.row + halfRows - 1
      : this.mothership.row + halfRows;
    return { col, row };
  }

  /**
   * Constructs a VesselMoveEvent for a new dispatch and applies it locally.
   * In future this event will be sent to the server for verification before
   * being broadcast to all clients via applyVesselMoveEvent().
   */
  private dispatchVessel(destCol: number, destRow: number): void {
    const dock = this.closestDockTile(destCol, destRow);
    const distPx = Math.hypot(
      (destCol - dock.col) * this.tilemap.tileWidth,
      (destRow - dock.row) * this.tilemap.tileHeight,
    );
    const now = Date.now();
    const event: VesselMoveEvent = {
      vesselId: crypto.randomUUID(),
      ownerId: "player-1",
      ownerName: "My Spaceship",
      mothershipId: "player-1",
      vesselType: "cs1",
      srcCol: dock.col,
      srcRow: dock.row,
      destCol,
      destRow,
      speed: this.vesselSpeed,
      dispatchedAt: now,
      arrivalAt: now + (distPx / this.vesselSpeed) * 1000,
    };
    this.applyVesselMoveEvent(event);
    this.deselectActor(); // clear the destination empty tile actor
    this.suppressNextPointerUp = true; // prevent onP1Up from re-creating it
  }

  /**
   * Creates or redirects a vessel according to the given event. Designed to be
   * called both for local player actions and for server-pushed events from other
   * players.
   */
  applyVesselMoveEvent(event: VesselMoveEvent): void {
    const existing = this.vessels.get(event.vesselId);
    if (existing) {
      existing.moveTo(event.destCol, event.destRow, event.speed);
      return;
    }

    let vessel!: TileActor;
    vessel = new TileActor({
      tilemap: this.tilemap,
      tile: `${event.vesselType}-base:0`,
      movingTile: `${event.vesselType}-moving:0`,
      col: event.srcCol,
      row: event.srcRow,
      width: 1,
      height: 1,
      ownerName: event.ownerName,
      onPressed: this.handleTilePressed,
      buttons: [
        {
          tile: "ui-button-details:0",
          label: "Details",
          onPressed: () => console.log("Details vessel", event.vesselId),
        },
        {
          tile: "ui-button-back:0",
          label: "Return",
          onPressed: () => this.returnVessel(vessel, event),
        },
      ],
    });
    this.vessels.set(event.vesselId, vessel);
    this.add(vessel);
    vessel.moveTo(event.destCol, event.destRow, event.speed);
  }

  /**
   * Sends a vessel back to the closest mothership docking tile. Internally
   * constructs a return VesselMoveEvent from the vessel's current position.
   */
  private returnVessel(
    vessel: TileActor,
    originalEvent: VesselMoveEvent,
  ): void {
    // Approximate current tile position from world coordinates.
    const currentCol = Math.round(
      (vessel.pos.x - this.tilemap.tileWidth / 2) / this.tilemap.tileWidth,
    );
    const currentRow = Math.round(
      (vessel.pos.y - this.tilemap.tileHeight / 2) / this.tilemap.tileHeight,
    );
    const dock = this.closestDockTile(currentCol, currentRow);
    const distPx = Math.hypot(
      (dock.col - currentCol) * this.tilemap.tileWidth,
      (dock.row - currentRow) * this.tilemap.tileHeight,
    );
    const now = Date.now();
    const returnEvent: VesselMoveEvent = {
      ...originalEvent,
      srcCol: currentCol,
      srcRow: currentRow,
      destCol: dock.col,
      destRow: dock.row,
      dispatchedAt: now,
      arrivalAt: now + (distPx / originalEvent.speed) * 1000,
    };
    vessel.moveTo(
      returnEvent.destCol,
      returnEvent.destRow,
      returnEvent.speed,
      () => {
        vessel.kill();
        this.vessels.delete(originalEvent.vesselId);
      },
    );
  }
}
