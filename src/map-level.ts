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

/**
 * Random unique id for locally-created events. crypto.randomUUID requires a
 * secure context (always true under Tauri), so fall back to random hex when
 * the vite dev build is served over plain http to a LAN device.
 */
function newEventId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(
    crypto.getRandomValues(new Uint8Array(16)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}

export class MapLevel extends TiledScene {
  override onInitialize(engine: ex.Engine): void {
    super.onInitialize(engine);
    this.addHudGroup({
      anchor: "top-right",
      gap: 8,
      buttons: [
        {
          tile: "ui-button-buy:1",
          width: 48,
          height: 48,
          label: { text: "Shop", labelOffset: ex.vec(0, -1), bordered: false },
          onPressed: () => console.log("shop"),
        },
        {
          tile: "ui-button-events:0",
          width: 32,
          height: 32,
          badge: { text: "@", bordered: false, color: ex.Color.Red },
          label: {
            text: "Events",
            labelOffset: ex.vec(0, -1),
            bordered: false,
          },
          onPressed: () => console.log("events"),
        },
      ],
    });
    this.addHudGroup({
      anchor: "bottom-right",
      gap: 8,
      buttons: [
        {
          tile: "ui-button-shipview:1",
          width: 64,
          height: 64,
          label: { text: "Ship", labelOffset: ex.vec(0, -1), bordered: false },
          onPressed: () => engine.goToScene("ship"),
        },
        {
          tile: "ui-button-message:0",
          width: 32,
          height: 32,
          label: {
            text: "Mail",
            labelOffset: ex.vec(0, -1),
            bordered: false,
          },
          onPressed: () => console.log("messages"),
        },
        {
          tile: "ui-button-items:0",
          width: 32,
          height: 32,
          label: { text: "Items", labelOffset: ex.vec(0, -1), bordered: false },
          onPressed: () => console.log("items"),
        },
      ],
    });
  }

  protected override initialCameraTarget(): { pos: ex.Vector; zoom: number } {
    return { pos: this.mothership.pos, zoom: 1 };
  }

  /** World px/s. 1 tile (32 px) per second by default; update on upgrade. */
  private vesselSpeed = 32;
  private mothership!: TileActor;
  /** Active vessels keyed by vesselId. */
  private vessels = new Map<string, TileActor>();

  protected override buildMap(): Promise<ex.TileMap> {
    return buildTileMap("map");
  }

  protected override supportsEmptyTileActor(): boolean {
    return true;
  }

  protected override setupActors(onTilePressed: (a: TileActor) => void): void {
    const edgeFallthrough = this.supportsEmptyTileActor();
    this.mothership = new TileActor({
      tilemap: this.tilemap,
      tile: "ss1-base:0",
      col: 48,
      row: 48,
      width: 4,
      height: 4,
      ownerName: "Player 1",
      ownerId: "player-1",
      onPressed: onTilePressed,
      edgeFallthrough,
      buttons: [
        {
          tile: "ui-button-details:0",
          label: {
            text: "Details",
            bordered: false,
            labelOffset: ex.vec(0, -1),
          },
          onPressed: () => console.log("Details my spaceship"),
        },
        {
          tile: "ui-button-enter:0",
          label: { text: "Enter", bordered: false, labelOffset: ex.vec(0, -1) },
          onPressed: () => console.log("Enter my spaceship"),
        },
        {
          tile: "ui-button-upgrade:2",
          label: {
            text: "Upgrade",
            bordered: false,
            labelOffset: ex.vec(0, -1),
          },
          onPressed: () => console.log("Upgrade my spaceship"),
        },
        {
          tile: "ui-button-warp:1",
          label: { text: "Move", bordered: false, labelOffset: ex.vec(0, -1) },
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
        ownerName: "Enemy",
        ownerId: "player-2",
        onPressed: onTilePressed,
        edgeFallthrough,
        buttons: [
          {
            tile: "ui-button-details:0",
            label: {
              text: "Details",
              bordered: false,
              labelOffset: ex.vec(0, -1),
            },
            onPressed: () => console.log("Details enemy spaceship"),
          },
          {
            tile: "ui-button-message:0",
            label: {
              text: "Message",
              bordered: false,
              labelOffset: ex.vec(0, -1),
            },
            onPressed: () => console.log("Message enemy spaceship"),
          },
          {
            tile: "ui-button-attack:4",
            label: {
              text: "Attack",
              bordered: false,
              labelOffset: ex.vec(0, -1),
            },
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
          tile: "ui-button-warp:1",
          label: { text: "Move", bordered: false, labelOffset: ex.vec(0, -1) },
          onPressed: () => console.log("Move empty tile"),
        },
        {
          tile: "ui-button-deploy:0",
          label: {
            text: "Deploy",
            bordered: false,
            labelOffset: ex.vec(0, -1),
          },
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
      vesselId: newEventId(),
      ownerId: "player-1",
      ownerName: "Player 1",
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
  }

  /** True if (col, row) is one of the mothership's inner 2*2 docking tiles. */
  private isDockTile(col: number, row: number): boolean {
    const halfCols = this.mothership.colSpan / 2;
    const halfRows = this.mothership.rowSpan / 2;
    return (
      col >= this.mothership.col + halfCols - 1 &&
      col <= this.mothership.col + halfCols &&
      row >= this.mothership.row + halfRows - 1 &&
      row <= this.mothership.row + halfRows
    );
  }

  /**
   * Creates or redirects a vessel according to the given event. Designed to be
   * called both for local player actions and for server-pushed events from other
   * players. A move whose destination is a mothership dock tile is a return:
   * the vessel docks and despawns on arrival.
   */
  applyVesselMoveEvent(event: VesselMoveEvent): void {
    const onArrival = this.isDockTile(event.destCol, event.destRow)
      ? () => this.vessels.get(event.vesselId)?.kill()
      : undefined;

    const existing = this.vessels.get(event.vesselId);
    if (existing) {
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
          tile: "ui-button-details:4",
          label: {
            text: "Details",
            bordered: false,
            labelOffset: ex.vec(0, -1),
          },
          onPressed: () => console.log("Details vessel", event.vesselId),
        },
        {
          tile: "ui-button-back:0",
          label: {
            text: "Return",
            bordered: false,
            labelOffset: ex.vec(0, -1),
          },
          onPressed: () => {
            const v = this.vessels.get(event.vesselId);
            if (v) this.returnVessel(v, event);
          },
        },
      ],
    });
    this.vessels.set(event.vesselId, vessel);
    // Centralized cleanup: any kill path drops the tracking entry.
    vessel.on("kill", () => this.vessels.delete(event.vesselId));
    this.add(vessel);

    // Late-join lerp: an aged event (e.g. received in a snapshot after
    // joining) spawns the vessel at its current in-flight position instead of
    // replaying the whole flight. t >= 1 snaps to the destination and moveTo
    // completes immediately, running the normal arrival handling.
    const duration = event.arrivalAt - event.dispatchedAt;
    const t = duration > 0
      ? ex.clamp((Date.now() - event.dispatchedAt) / duration, 0, 1)
      : 1;
    if (t > 0) {
      const src = this.tileCenter(event.srcCol, event.srcRow);
      const dest = this.tileCenter(event.destCol, event.destRow);
      vessel.pos = src.add(dest.sub(src).scale(t));
    }
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
   * Sends a vessel back to the closest mothership docking tile by constructing
   * a return VesselMoveEvent from the vessel's current position and routing it
   * through applyVesselMoveEvent, so local and server-pushed returns behave
   * identically. Docking (arrival at a dock tile) despawns the vessel.
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
    this.applyVesselMoveEvent({
      ...originalEvent,
      srcCol: currentCol,
      srcRow: currentRow,
      destCol: dock.col,
      destRow: dock.row,
      dispatchedAt: now,
      arrivalAt: now + (distPx / originalEvent.speed) * 1000,
    });
  }
}
