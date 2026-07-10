import * as ex from "excalibur";

import { invoke } from "@tauri-apps/api/core";

import { gameState, ModuleData, ResourceCounts } from "./game-state.ts";
import { moduleAnchorAt, roomOriginAt, SHIP_ROOM_GRID } from "./grid-math.ts";
import { buildTileMap } from "./map-loader.ts";
import {
  COMMAND_MODULE_TYPE,
  costAtLevel,
  MODULE_CATALOG,
  moduleCatalogEntry,
} from "./module-catalog.ts";
import { TileActor } from "./tile-actor.ts";
import { SceneMap, TiledScene } from "./tiled-scene.ts";
import { ButtonDef, TileRef } from "./ui/index.ts";

/** Modules occupy the 4*4 center of their 6*6 room. */
const MODULE_SPAN = 4;

/**
 * Every module renders with the same placeholder sprite until per-type art
 * lands (ROADMAP P1.4 note) — `moduleType` only drives game logic and
 * display name for now.
 */
const MODULE_ART_TYPE = "base";

/** Wire shape of the `request_build_module` / `request_levelup_module` Tauri
 *  commands' result. Mirrors the Rust `ModuleActionResponse` in
 *  src-tauri/src/game_state.rs — keep in sync. */
interface ModuleActionResponse {
  module: ModuleData;
  /** Authoritative counts after the cost was deducted. */
  resources: ResourceCounts;
}

/** Result of levelUpStatus(): whether/why a module's Level Up button would
 *  currently be enabled. "capped" (blocked by the Command Module's own
 *  level) is kept distinct from "unaffordable" so the UI can say which one
 *  it is. */
type LevelUpStatus = "unavailable" | "capped" | "unaffordable" | "ready";

/** Finished module sprite. */
function moduleTile(): TileRef {
  return `module-${MODULE_ART_TYPE}:0`;
}

/** Translucent ghost of the module sprite, shown while a build/preview runs. */
function ghostModuleTile(opacity: number): TileRef {
  return { tile: `module-${MODULE_ART_TYPE}`, tileId: 0, opacity };
}

/** True when two snapshots describe an identical module — placement, type,
 *  level, and pending build — so the reconciler can skip rebuilding its
 *  actor. */
function sameModule(a: ModuleData, b: ModuleData): boolean {
  return (
    a.col === b.col &&
    a.row === b.row &&
    a.moduleType === b.moduleType &&
    a.level === b.level &&
    a.ownerId === b.ownerId &&
    a.ownerName === b.ownerName &&
    (a.pending?.level ?? null) === (b.pending?.level ?? null) &&
    (a.pending?.completesAt ?? null) === (b.pending?.completesAt ?? null)
  );
}

/** Owner label shown while a module's build/level-up timer runs. */
function buildCountdownLabel(
  displayName: string,
  completesAt: number,
  nowMs: number,
): string {
  const remaining = Math.max(0, Math.ceil((completesAt - nowMs) / 1000));
  return `${displayName} (${remaining}s)`;
}

export class ShipLevel extends TiledScene {
  /** Module actors keyed by moduleId. */
  private modules = new Map<string, TileActor>();
  /** The last ModuleData applied per moduleId, used by syncModules to skip
   *  rebuilding unchanged modules on every poll. */
  private appliedModules = new Map<string, ModuleData>();
  /** The last levelUpStatus() result applied per moduleId — tracked
   *  alongside ModuleData so a resource or Command-level change that flips a
   *  Level Up button's status (with no change to the module itself) still
   *  triggers a rebuild; otherwise the button would freeze at whatever it
   *  showed the last time this module's own data changed. */
  private appliedLevelUpStatus = new Map<string, LevelUpStatus>();
  /** Modules with a build/level-up in progress, keyed by moduleId — drives
   *  the once-a-frame countdown label tick in onPostUpdate. */
  private pendingModules = new Map<string, ModuleData>();

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
    // The backend state may load (or a future login complete) after this
    // scene is built — reconcile module actors (Command Module included)
    // against the refreshed table on every notify. No unsubscribe: scenes
    // live for the whole app run.
    gameState.subscribe(() => this.syncModules());
  }

  protected override async buildMap(): Promise<SceneMap> {
    const tilemap = await buildTileMap("ship");
    return { grid: tilemap, tilemap };
  }

  protected override supportsEmptyTileActor(): boolean {
    return true;
  }

  protected override setupActors(): void {
    // Nothing is placed here: every module, including the Command Module, is
    // server-owned and reconciled from the backend snapshot — which may have
    // loaded before this scene finished its async map build (hence the
    // explicit sync), or may land later (the gameState subscription).
    this.syncModules();
  }

  /**
   * Reconcile module actors against gameState.modules — the client mirror of
   * the backend's module table, refreshed by every load_game_state snapshot
   * and merged into by build/level-up command responses. New modules spawn,
   * modules that left the snapshot despawn, and changed modules (leveled up,
   * build completed) are rebuilt in place — so server-side changes reach the
   * ship with no client changes, the Command Module included.
   */
  private syncModules(): void {
    // The subscription can fire before the async map load finishes;
    // setupActors calls this again once the grid exists.
    if (!this.grid) return;
    for (const [id, actor] of this.modules) {
      if (!gameState.modules.has(id)) {
        if (this.isSelected(actor)) this.deselectActor();
        actor.kill();
        this.modules.delete(id);
        this.appliedModules.delete(id);
        this.appliedLevelUpStatus.delete(id);
        this.pendingModules.delete(id);
      }
    }
    const commandLevel = this.commandModuleLevel();
    for (const data of gameState.modules.values()) {
      const status = this.levelUpStatus(data, commandLevel);
      const applied = this.appliedModules.get(data.moduleId);
      const appliedStatus = this.appliedLevelUpStatus.get(data.moduleId);
      if (
        applied !== undefined && sameModule(applied, data) &&
        appliedStatus === status
      ) continue;
      const existing = this.modules.get(data.moduleId);
      // A rebuild (e.g. a poll landing a build/level-up completion) replaces
      // the TileActor instance; carry the selection over so a player with
      // this module's panel open doesn't see it silently vanish.
      const wasSelected = existing !== undefined && this.isSelected(existing);
      existing?.kill();
      const actor = this.createModuleActor(data, status);
      this.modules.set(data.moduleId, actor);
      this.appliedModules.set(data.moduleId, data);
      this.appliedLevelUpStatus.set(data.moduleId, status);
      this.add(actor);
      if (wasSelected) this.reselectActor(actor);
      if (data.pending !== null) {
        this.pendingModules.set(data.moduleId, data);
      } else {
        this.pendingModules.delete(data.moduleId);
      }
    }
  }

  /**
   * Whether/why a Level Up button for this module would currently be
   * enabled — "capped" (README § Ship design: a non-Command module can never
   * level past the Command Module's own level) is distinct from
   * "unaffordable" so the UI can tell the player which one it is, instead of
   * showing a cost badge that looks unmet when the real blocker is the cap.
   * Shared by createModuleActor (button label/disabled) and syncModules (to
   * decide whether a resource or Command-level change alone should trigger a
   * rebuild). Takes the Command Module's level as a parameter — callers
   * looping over several modules should compute it once (commandModuleLevel
   * rescans the whole module table) and pass it down, rather than each call
   * re-deriving it.
   */
  private levelUpStatus(data: ModuleData, commandLevel: number): LevelUpStatus {
    if (data.pending !== null) return "unavailable";
    const entry = moduleCatalogEntry(data.moduleType);
    if (!entry) return "unavailable";
    const nextLevel = data.level + 1;
    if (entry.moduleType !== COMMAND_MODULE_TYPE && nextLevel > commandLevel) {
      return "capped";
    }
    return gameState.resources.construction >= costAtLevel(entry, nextLevel)
      ? "ready"
      : "unaffordable";
  }

  /** The Command Module's current level, or 0 before the snapshot loads —
   *  gates which types can be built and every module's level cap. */
  private commandModuleLevel(): number {
    for (const data of gameState.modules.values()) {
      if (data.moduleType === COMMAND_MODULE_TYPE) return data.level;
    }
    return 0;
  }

  /** True if the room containing (col, row) already hosts a module. */
  private roomOccupied(roomCol: number, roomRow: number): boolean {
    for (const data of gameState.modules.values()) {
      const room = roomOriginAt(SHIP_ROOM_GRID, data.col, data.row);
      if (room && room.col === roomCol && room.row === roomRow) return true;
    }
    return false;
  }

  /** Builds the map actor for one module: the base placeholder sprite (or a
   *  ghost while its first build is pending), a level badge, and — once idle
   *  at a real level — a Level Up button. `status` is the levelUpStatus()
   *  result the caller already computed for the rebuild diff, reused here so
   *  the two never drift. */
  private createModuleActor(
    data: ModuleData,
    status: LevelUpStatus,
  ): TileActor {
    const now = Date.now();
    const entry = moduleCatalogEntry(data.moduleType);
    const displayName = entry?.displayName ?? data.moduleType;
    const firstBuildPending = data.pending !== null && data.level === 0;

    const buttons: ButtonDef[] = [];
    if (data.pending === null && entry) {
      const nextLevel = data.level + 1;
      const cost = costAtLevel(entry, nextLevel);
      buttons.push({
        frameTile: "ui-frame-round:0",
        activeFrameTile: "ui-frame-round:1",
        disabledFrameTile: "ui-frame-round:2",
        tile: "ui-icon-upgrade:0",
        activeTile: "ui-icon-upgrade:1",
        disabledTile: "ui-icon-upgrade:2",
        // "capped" (blocked by the Command Module's own level, README § Ship
        // design) reads very differently from "unaffordable" — say so rather
        // than showing a cost badge that looks unmet either way.
        label: status === "capped"
          ? `Needs Command Lv${nextLevel}`
          : "Level Up",
        badge: `${cost}`,
        disabled: status !== "ready",
        onPressed: () => void this.levelUpModule(data.moduleId),
      });
    }

    return new TileActor({
      grid: this.grid,
      edgeFallthrough: this.supportsEmptyTileActor(),
      tile: firstBuildPending ? ghostModuleTile(0.4) : moduleTile(),
      col: data.col,
      row: data.row,
      width: MODULE_SPAN,
      height: MODULE_SPAN,
      ownerName: data.pending !== null
        ? buildCountdownLabel(displayName, data.pending.completesAt, now)
        : displayName,
      ownerId: data.ownerId,
      selection: "ui-selection-2",
      onPressed: this.handleTilePressed,
      buttons,
      badges: [
        {
          anchor: "bottom-left",
          badge: {
            text: `${data.level}`,
            backgroundColor: ex.Color.ExcaliburBlue,
          },
        },
      ],
    });
  }

  /**
   * Tapping an empty interior tile offers to build any catalog type unlocked
   * by the current Command Module level, in that room (mirroring the map
   * view's Move/Deploy pattern). Taps outside a room (void, hull, corridors),
   * in an occupied room, or when nothing is buildable yet do nothing.
   */
  protected override createEmptyTileActor(
    col: number,
    row: number,
    onPressed: (a: TileActor) => void,
  ): TileActor | null {
    const anchor = moduleAnchorAt(SHIP_ROOM_GRID, col, row, MODULE_SPAN);
    if (anchor === null) return null;
    const room = roomOriginAt(SHIP_ROOM_GRID, col, row)!;
    if (this.roomOccupied(room.col, room.row)) return null;

    const commandLevel = this.commandModuleLevel();
    const buildable = MODULE_CATALOG.filter(
      (e) =>
        e.moduleType !== COMMAND_MODULE_TYPE &&
        e.unlockCommandLevel <= commandLevel,
    );
    if (buildable.length === 0) return null;

    return new TileActor({
      grid: this.grid,
      tile: ghostModuleTile(0.2),
      col: anchor.col,
      row: anchor.row,
      width: MODULE_SPAN,
      height: MODULE_SPAN,
      onPressed,
      buttons: buildable.map((entry) => {
        const cost = costAtLevel(entry, 1);
        return {
          frameTile: "ui-frame-round:0",
          activeFrameTile: "ui-frame-round:1",
          disabledFrameTile: "ui-frame-round:2",
          tile: "ui-icon-build:0",
          activeTile: "ui-icon-build:1",
          disabledTile: "ui-icon-build:2",
          label: entry.displayName,
          // Cost shown as the button badge; affordability is re-checked by
          // the backend on request — this disable is just UX.
          badge: `${cost}`,
          disabled: gameState.resources.construction < cost,
          onPressed: () =>
            void this.buildModule(anchor.col, anchor.row, entry.moduleType),
        };
      }),
    });
  }

  /**
   * Asks the backend to start a module build. The backend verifies the
   * catalog type, unlock level, placement, and cost, deducts the resources,
   * and returns the authoritative ModuleData plus updated resource counts;
   * merging both into gameState fans out to syncModules. Already the phase-3
   * shape: send a request, apply the server's response — only the transport
   * changes (Tauri IPC now, WebSocket in P3.1).
   */
  private async buildModule(
    col: number,
    row: number,
    moduleType: string,
  ): Promise<void> {
    this.deselectActor(); // clear the placement preview actor
    try {
      const { module, resources } = await invoke<ModuleActionResponse>(
        "request_build_module",
        { col, row, moduleType },
      );
      gameState.syncResources(resources);
      gameState.applyModuleEvent(module);
    } catch (err) {
      // No rejection UI yet — the Build button is disabled when unaffordable,
      // so this is a race (or a bug). Log it; state stays untouched.
      console.warn("request_build_module rejected:", err);
    }
  }

  /**
   * Asks the backend to level up an existing module. The backend verifies
   * ownership, that no build is already pending, and the Command Module's
   * level cap, deducts the scaled cost, and returns the authoritative
   * ModuleData plus updated resource counts.
   */
  private async levelUpModule(moduleId: string): Promise<void> {
    // Unlike buildModule, there's no placement-preview ghost to clear here —
    // the button lives on the real, already-selected module actor. Leave it
    // selected while the request is in flight; syncModules() rebuilds it
    // (carrying the selection forward, see isSelected/reselectActor in
    // TiledScene) once the response lands and the module shows `pending`.
    try {
      const { module, resources } = await invoke<ModuleActionResponse>(
        "request_levelup_module",
        { moduleId },
      );
      gameState.syncResources(resources);
      gameState.applyModuleEvent(module);
    } catch (err) {
      console.warn("request_levelup_module rejected:", err);
    }
  }

  /**
   * Drives the build/level-up countdown labels: while pending, a module's
   * label counts down once a second. Completion itself arrives as a server
   * push — the backend scheduler settles the build the moment completesAt
   * passes and pushes the updated ModuleData, which syncModules() applies —
   * so the label only ever shows "0s" for however long that push takes to
   * land. Runs only while this scene is active; a build that completed while
   * the player was away is already settled in gameState when they return.
   */
  override onPostUpdate(): void {
    if (this.pendingModules.size === 0) return;
    const now = Date.now();
    for (const [id, data] of this.pendingModules) {
      if (data.pending === null) continue;
      const module = this.modules.get(id);
      const entry = moduleCatalogEntry(data.moduleType);
      const displayName = entry?.displayName ?? data.moduleType;
      // setOwner no-ops until the rounded seconds change.
      module?.setOwner(
        buildCountdownLabel(displayName, data.pending.completesAt, now),
        module.ownerId,
      );
    }
  }
}
