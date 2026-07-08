import * as ex from "excalibur";

import { invoke } from "@tauri-apps/api/core";

import { gameState, ResourceCounts } from "./game-state.ts";
import { moduleAnchorAt, roomOriginAt, SHIP_ROOM_GRID } from "./grid-math.ts";
import { buildTileMap } from "./map-loader.ts";
import { TileActor } from "./tile-actor.ts";
import { TiledScene } from "./tiled-scene.ts";
import { TileRef } from "./ui/index.ts";

/**
 * A module construction authorized by the backend — the backend verifies
 * placement and cost, deducts the resources, and issues this event (see
 * SERVER.md for the server-authoritative model). Mirrors the Rust
 * `BuildModuleEventData` in src-tauri/src/lib.rs — keep the two in sync.
 */
export interface BuildModuleEvent {
  moduleId: string;
  ownerId: string;
  /** Display name of the owning player. */
  ownerName: string;
  /** Catalog type, e.g. "base" — resolves art as `module-<type>`. */
  moduleType: string;
  /** Anchor (top-left) tile of the module footprint, server-verified. */
  col: number;
  row: number;
  /** Server epoch ms when the build was authorized. */
  dispatchedAt: number;
  /** Pre-computed completion time: dispatchedAt + the type's build time.
   *  Gives build timers for free and lets late-joining clients show the
   *  correct remaining time without redoing the clock math locally. */
  completesAt: number;
}

// Placeholder single-type "catalog" until P1.4 lands: every build produces a
// generic level-1 module-base module (real types, costs, and build times
// come from the catalog, per type and level).
const MODULE_TYPE = "base";
const MODULE_DISPLAY_NAME = "Module";
/**
 * Cost of the placeholder module in `construction` resources — display and
 * button-disable pre-check only; the backend is what actually verifies and
 * deducts it. Mirrors MODULE_COST_CONSTRUCTION in src-tauri/src/lib.rs —
 * keep the two in sync.
 */
const MODULE_COST_CONSTRUCTION = 10;
/** Modules occupy the 4*4 center of their 6*6 room. */
const MODULE_SPAN = 4;

/** Wire shape of the `request_build_module` Tauri command's result. Mirrors
 *  the Rust `BuildModuleResponse` in src-tauri/src/lib.rs — keep in sync. */
interface BuildModuleResponse {
  event: BuildModuleEvent;
  /** Authoritative counts after the build cost was deducted. */
  resources: ResourceCounts;
}

/** Finished module sprite for a catalog type. */
function moduleTile(moduleType: string): TileRef {
  return `module-${moduleType}:0`;
}

/** Translucent ghost of the module sprite, shown while the build runs. */
function underConstructionTile(moduleType: string): TileRef {
  return { tile: `module-${moduleType}`, tileId: 0, opacity: 0.4 };
}

/** Owner label shown under a module while its build timer runs. */
function buildCountdownLabel(completesAt: number, nowMs: number): string {
  return `${MODULE_DISPLAY_NAME} (${Math.ceil((completesAt - nowMs) / 1000)}s)`;
}

export class ShipLevel extends TiledScene {
  /** Built modules keyed by moduleId (the Command Module is not event-built). */
  private modules = new Map<string, TileActor>();
  /** Events whose build timer is still running, keyed by moduleId. */
  private pendingBuilds = new Map<string, BuildModuleEvent>();
  /** Room-origin keys ("col,row") that already host a module. */
  private occupiedRooms = new Set<string>();

  override onInitialize(engine: ex.Engine): void {
    super.onInitialize(engine);
    this.backgroundColor = ex.Color.Black;
    this.addCommonHud({
      frameTile: "ui-frame-square:0",
      activeFrameTile: "ui-frame-square:1",
      disabledFrameTile: "ui-frame-square:2",
      tile: "ui-icon-mapview:0",
      activeTile: "ui-icon-mapview:1",
      disabledTile: "ui-icon-mapview:2",
      width: 64,
      height: 64,
      label: "Map",
      onPressed: () => engine.goToScene("map"),
    });
  }

  protected override buildMap(): Promise<ex.TileMap> {
    return buildTileMap("ship");
  }

  protected override supportsEmptyTileActor(): boolean {
    return true;
  }

  protected override setupActors(onTilePressed: (a: TileActor) => void): void {
    const commandModule = new TileActor({
      tilemap: this.tilemap,
      edgeFallthrough: this.supportsEmptyTileActor(),
      tile: "module-base:0",
      col: 18, // (40 - 4) / 2 — centered on the 40*40 map
      row: 18,
      width: 4,
      height: 4,
      ownerName: "Command Module",
      selection: "ui-selection-2",
      onPressed: onTilePressed,
      badges: [
        {
          anchor: "bottom-left",
          badge: { text: "2", backgroundColor: ex.Color.ExcaliburBlue },
        },
      ],
    });
    this.add(commandModule);
    this.occupyRoomAt(commandModule.col, commandModule.row);
  }

  /** Marks the room containing (col, row) as hosting a module. */
  private occupyRoomAt(col: number, row: number): void {
    const room = roomOriginAt(SHIP_ROOM_GRID, col, row);
    if (room) this.occupiedRooms.add(`${room.col},${room.row}`);
  }

  /**
   * Tapping an empty interior tile offers to build a module in that room
   * (mirroring the map view's Move/Deploy pattern). The actor shows a faint
   * placement preview of the module, centered in the room. Taps outside a
   * room (void, hull, corridors) or in an occupied room do nothing.
   */
  protected override createEmptyTileActor(
    col: number,
    row: number,
    onPressed: (a: TileActor) => void,
  ): TileActor | null {
    const anchor = moduleAnchorAt(SHIP_ROOM_GRID, col, row, MODULE_SPAN);
    if (anchor === null) return null;
    const room = roomOriginAt(SHIP_ROOM_GRID, col, row)!;
    if (this.occupiedRooms.has(`${room.col},${room.row}`)) return null;
    return new TileActor({
      tilemap: this.tilemap,
      tile: { tile: `module-${MODULE_TYPE}`, tileId: 0, opacity: 0.2 },
      col: anchor.col,
      row: anchor.row,
      width: MODULE_SPAN,
      height: MODULE_SPAN,
      onPressed,
      buttons: [
        {
          frameTile: "ui-frame-round:0",
          activeFrameTile: "ui-frame-round:1",
          disabledFrameTile: "ui-frame-round:2",
          tile: "ui-icon-build:0",
          activeTile: "ui-icon-build:1",
          disabledTile: "ui-icon-build:2",
          label: "Build",
          // Cost shown as the button badge; affordability is re-checked by
          // the backend on request — this disable is just UX.
          badge: `${MODULE_COST_CONSTRUCTION}`,
          disabled: gameState.resources.construction < MODULE_COST_CONSTRUCTION,
          onPressed: () => void this.buildModule(anchor.col, anchor.row),
        },
      ],
    });
  }

  /**
   * Asks the backend to start a module build. The backend verifies placement
   * and cost, deducts the resources, and returns the authoritative
   * BuildModuleEvent plus updated resource counts; the client applies both
   * verbatim. Already the phase-3 shape: send a request, apply the server's
   * event — only the transport changes (Tauri IPC now, WebSocket in P3.1).
   */
  private async buildModule(col: number, row: number): Promise<void> {
    this.deselectActor(); // clear the placement preview actor
    try {
      const { event, resources } = await invoke<BuildModuleResponse>(
        "request_build_module",
        { col, row, moduleType: MODULE_TYPE },
      );
      gameState.syncResources(resources);
      this.applyBuildModuleEvent(event);
    } catch (err) {
      // No rejection UI yet — the Build button is disabled when unaffordable,
      // so this is a race (or a bug). Log it; state stays untouched.
      console.warn("request_build_module rejected:", err);
    }
  }

  /**
   * Spawns the module described by the given event. Designed to be called
   * both for local player actions and for server-pushed events (including
   * aged events from a late-join snapshot: a completesAt already in the past
   * spawns the module finished, mid-build spawns it with the remaining
   * timer). Duplicate moduleIds and occupied rooms are ignored — the server
   * verifies placement; locally createEmptyTileActor never offers them.
   */
  applyBuildModuleEvent(event: BuildModuleEvent): void {
    if (this.modules.has(event.moduleId)) return;
    const room = roomOriginAt(SHIP_ROOM_GRID, event.col, event.row);
    if (room === null || this.occupiedRooms.has(`${room.col},${room.row}`)) {
      console.warn("Ignoring invalid module placement", event);
      return;
    }
    this.occupiedRooms.add(`${room.col},${room.row}`);

    const now = Date.now();
    const building = now < event.completesAt;
    const module = new TileActor({
      tilemap: this.tilemap,
      edgeFallthrough: this.supportsEmptyTileActor(),
      tile: building
        ? underConstructionTile(event.moduleType)
        : moduleTile(event.moduleType),
      col: event.col,
      row: event.row,
      width: MODULE_SPAN,
      height: MODULE_SPAN,
      ownerName: building
        ? buildCountdownLabel(event.completesAt, now)
        : MODULE_DISPLAY_NAME,
      ownerId: event.ownerId,
      selection: "ui-selection-2",
      onPressed: this.handleTilePressed,
      badges: [
        {
          anchor: "bottom-left",
          badge: { text: "1", backgroundColor: ex.Color.ExcaliburBlue },
        },
      ],
    });
    this.modules.set(event.moduleId, module);
    this.add(module);
    if (building) this.pendingBuilds.set(event.moduleId, event);
  }

  /**
   * Drives the build timers: while a build is pending its label counts down
   * once a second; at completesAt the ghost swaps to the finished sprite.
   * Runs only while this scene is active — an overdue build completes on the
   * first frame after the player returns to the ship view, consistent with
   * the completesAt timestamp being the source of truth.
   */
  override onPostUpdate(): void {
    if (this.pendingBuilds.size === 0) return;
    const now = Date.now();
    for (const [id, event] of this.pendingBuilds) {
      const module = this.modules.get(id);
      if (now >= event.completesAt) {
        this.pendingBuilds.delete(id);
        module?.setTile(moduleTile(event.moduleType));
        module?.setOwner(MODULE_DISPLAY_NAME, module.ownerId);
      } else {
        // setOwner no-ops until the rounded seconds change.
        module?.setOwner(
          buildCountdownLabel(event.completesAt, now),
          module.ownerId,
        );
      }
    }
  }
}
