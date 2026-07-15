import * as ex from "excalibur";

import { invoke } from "@tauri-apps/api/core";

import {
  CrewData,
  gameState,
  ModuleData,
  ResourceCounts,
  serverNow,
} from "../state/game-state.ts";
import {
  moduleAnchorAt,
  roomOriginAt,
  SHIP_ROOM_GRID,
} from "../scene/grid-math.ts";
import {
  COMMAND_MODULE_TYPE,
  costAtLevel,
  CREW_QUARTERS_MODULE_TYPE,
  crewCapacityForModules,
  crewRequiredForModules,
  crewScaledAmount,
  hireCostAt,
  MODULE_CATALOG,
  moduleCatalogEntry,
  TRADING_POST_MODULE_TYPE,
} from "./module-catalog.ts";
import { TileActor } from "../scene/tile-actor.ts";
import { TileGridGeometry } from "../scene/grid-math.ts";
import {
  ButtonDef,
  errorToast,
  roundButton,
  TileRef,
  ToastDef,
} from "../ui/index.ts";

/**
 * Modules occupy the 4*4 center of their 6*6 room. Mirrors MODULE_SPAN in
 * `src-tauri/src/game_state/modules.rs` — keep the two in sync.
 */
const MODULE_SPAN = 4;

/**
 * Every module renders with the same placeholder sprite until per-type art
 * lands (ROADMAP P1.4 note) — `moduleType` only drives game logic and
 * display name for now.
 */
const MODULE_ART_TYPE = "base";

/** Wire shape of the `request_build_module` / `request_levelup_module` Tauri
 *  commands' result. Mirrors the Rust `ModuleActionResponse` in
 *  src-tauri/src/game_state/modules.rs — keep in sync. Exported for the map
 *  scene's own-mothership details panel, whose Upgrade action levels the
 *  Command Module through the same command (ROADMAP P1.16). */
export interface ModuleActionResponse {
  module: ModuleData;
  /** Authoritative counts after the cost was deducted. */
  resources: ResourceCounts;
}

/** Result of levelUpStatus(): whether/why a module's Level Up button would
 *  currently be enabled. "capped" (blocked by the Command Module's own
 *  level) is kept distinct from "unaffordable" so the UI can say which one
 *  it is. */
type LevelUpStatus = "unavailable" | "capped" | "unaffordable" | "ready";

/** Wire shape of the `request_hire_crew` Tauri command's result. Mirrors the
 *  Rust `CrewActionResponse` in src-tauri/src/game_state/crew.rs — keep in
 *  sync. */
interface CrewActionResponse {
  crew: CrewData;
  /** Authoritative counts after the cost was deducted. */
  resources: ResourceCounts;
}

/** Result of hireStatus(): whether/why the Command Module's Hire Crew button
 *  would currently be enabled (ROADMAP P1.10). "full" (no berths free — the
 *  fix is Crew Quarters, not resources) is kept distinct from "unaffordable"
 *  so the UI can say which one it is. */
type HireStatus = "recruiting" | "full" | "unaffordable" | "ready";

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

/** Hire button label while a recruitment timer runs (ROADMAP P1.10). */
function recruitingLabel(completesAt: number, nowMs: number): string {
  const remaining = Math.max(0, Math.ceil((completesAt - nowMs) / 1000));
  return `Recruiting (${remaining}s)`;
}

/** The Hire Crew button's index in its host actor's `buttons` array — always
 *  pushed first (see createActor), so the onPostUpdate countdown can address
 *  it via setButtonLabel. */
const HIRE_BUTTON_INDEX = 0;

/** Scene services ModuleSync needs — kept narrow so it doesn't reach back
 *  into ShipLevel for anything beyond spawning actors, routing taps,
 *  carrying selection across a rebuild, opening the shop dialog, and
 *  surfacing rejections. */
export interface ModuleSyncHost {
  add(actor: TileActor): void;
  onTilePressed(actor: TileActor): void;
  edgeFallthrough(): boolean;
  isSelected(actor: TileActor): boolean;
  reselectActor(actor: TileActor): void;
  deselectActor(): void;
  openShop(): void;
  openDetails(moduleId: string): void;
  showToast(toast: string | ToastDef): void;
}

/**
 * Reconciles module actors (Command Module included) against
 * gameState.modules — the client mirror of the backend's module table,
 * refreshed by every load_game_state snapshot and merged into by
 * build/level-up command responses — and owns every module-domain action
 * (build, level up, hire crew). Doesn't fit the shared `reconcileActors`
 * skeleton (src/scene/actor-sync.ts): a module's rebuild diff depends on several
 * side-derived values (level-up/hire status, staffing %) beyond its own
 * snapshot, and a rebuilt actor must carry the outgoing one's selection
 * state over.
 */
export class ModuleSync {
  /** Module actors keyed by moduleId. */
  private modules = new Map<string, TileActor>();
  /** The last ModuleData applied per moduleId, used by sync() to skip
   *  rebuilding unchanged modules on every poll. */
  private appliedModules = new Map<string, ModuleData>();
  /** The last levelUpStatus() result applied per moduleId — tracked
   *  alongside ModuleData so a resource or Command-level change that flips a
   *  Level Up button's status (with no change to the module itself) still
   *  triggers a rebuild; otherwise the button would freeze at whatever it
   *  showed the last time this module's own data changed. */
  private appliedLevelUpStatus = new Map<string, LevelUpStatus>();
  /** The last hireStatus() applied per hire-hosting actor (ROADMAP P1.10) —
   *  same rebuild-diff role as appliedLevelUpStatus: a crew, berth, or
   *  biological change must flip the Hire Crew button even when the module
   *  itself didn't change. Null for modules that don't host the button. */
  private appliedHireStatus = new Map<string, HireStatus | null>();
  /** The last staffing percentage applied per moduleId (ROADMAP P1.10) —
   *  producers show an understaffed badge, so a crew or demand change must
   *  rebuild them even when the module itself didn't change. */
  private appliedStaffPct = new Map<string, number>();
  /** Actors currently hosting the Hire Crew button (Command Module + settled
   *  Crew Quarters), keyed by moduleId — drives the once-a-frame recruiting
   *  countdown in tick() via setButtonLabel. */
  private hireHosts = new Map<string, TileActor>();
  /** Modules with a build/level-up in progress, keyed by moduleId — drives
   *  the once-a-frame countdown label tick in tick(). */
  private pendingModules = new Map<string, ModuleData>();

  constructor(private readonly host: ModuleSyncHost) {}

  /**
   * Reconcile module actors against gameState.modules. New modules spawn,
   * modules that left the snapshot despawn, and changed modules (leveled up,
   * build completed) are rebuilt in place — so server-side changes reach the
   * ship with no client changes, the Command Module included.
   */
  sync(grid: TileGridGeometry | null): void {
    // The gameState subscription can fire before the async map load
    // finishes; ShipLevel.setupActors calls this again once the grid exists.
    if (!grid) return;
    for (const [id, actor] of this.modules) {
      if (!gameState.modules.has(id)) {
        if (this.host.isSelected(actor)) this.host.deselectActor();
        actor.kill();
        this.modules.delete(id);
        this.appliedModules.delete(id);
        this.appliedLevelUpStatus.delete(id);
        this.appliedHireStatus.delete(id);
        this.appliedStaffPct.delete(id);
        this.hireHosts.delete(id);
        this.pendingModules.delete(id);
      }
    }
    const commandLevel = this.commandModuleLevel();
    const hire = this.hireStatus();
    // The pooled staffing ratio (ROADMAP P1.10) is ship-wide: every producer
    // shows the same output percentage when crew is short.
    const staffPct = crewScaledAmount(
      100,
      gameState.crew,
      crewRequiredForModules(gameState.modules.values()),
    );
    for (const data of gameState.modules.values()) {
      const entry = moduleCatalogEntry(data.moduleType);
      const status = this.levelUpStatus(data, commandLevel);
      // The Command Module and settled Crew Quarters host the Hire Crew
      // button (ROADMAP P1.10) — their actors rebuild when the status flips.
      const hostsHire = data.moduleType === COMMAND_MODULE_TYPE ||
        (data.moduleType === CREW_QUARTERS_MODULE_TYPE && data.level >= 1);
      const hireForModule = hostsHire ? hire : null;
      // Only settled producers wear the understaffed badge — a
      // crew-demanding non-producer (the Trading Post) has no output
      // percentage to report, so a "50%" badge would be noise.
      const staffPctForModule = (entry?.crewRequiredPerLevel ?? 0) > 0 &&
          data.level >= 1 &&
          Object.keys(entry?.produces ?? {}).length > 0
        ? staffPct
        : 100;
      const applied = this.appliedModules.get(data.moduleId);
      const appliedStatus = this.appliedLevelUpStatus.get(data.moduleId);
      const appliedHire = this.appliedHireStatus.get(data.moduleId);
      const appliedPct = this.appliedStaffPct.get(data.moduleId);
      if (
        applied !== undefined && sameModule(applied, data) &&
        appliedStatus === status && appliedHire === hireForModule &&
        appliedPct === staffPctForModule
      ) continue;
      const existing = this.modules.get(data.moduleId);
      // A rebuild (e.g. a poll landing a build/level-up completion) replaces
      // the TileActor instance; carry the selection over so a player with
      // this module's panel open doesn't see it silently vanish.
      const wasSelected = existing !== undefined &&
        this.host.isSelected(existing);
      existing?.kill();
      const actor = this.createActor(
        grid,
        data,
        status,
        hireForModule,
        staffPctForModule,
      );
      this.modules.set(data.moduleId, actor);
      this.appliedModules.set(data.moduleId, data);
      this.appliedLevelUpStatus.set(data.moduleId, status);
      this.appliedHireStatus.set(data.moduleId, hireForModule);
      this.appliedStaffPct.set(data.moduleId, staffPctForModule);
      if (hireForModule !== null) {
        this.hireHosts.set(data.moduleId, actor);
      } else {
        this.hireHosts.delete(data.moduleId);
      }
      this.host.add(actor);
      if (wasSelected) this.host.reselectActor(actor);
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
   * Shared by createActor (button label/disabled) and sync() (to decide
   * whether a resource or Command-level change alone should trigger a
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

  /**
   * Whether/why the Hire Crew button (on the Command Module and settled Crew
   * Quarters) would currently be enabled (ROADMAP P1.10) — ship-wide state,
   * not per-module: one recruitment at a time, the new head must fit the
   * berths (display-derived via crewCapacityForModules, like the
   * resource-bar readout), and the linear biological cost must be
   * affordable. The backend re-verifies all three on request; this is just
   * UX, mirroring levelUpStatus.
   */
  private hireStatus(): HireStatus {
    if (gameState.pendingHire !== null) return "recruiting";
    const capacity = crewCapacityForModules(gameState.modules.values());
    if (gameState.crew + 1 > capacity) return "full";
    return gameState.resources.biological >= hireCostAt(gameState.crew)
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
   *  ghost while its first build is pending), a level badge — plus an
   *  understaffed badge on producers running below full output — and, once
   *  idle at a real level, a Level Up button; the Command Module and settled
   *  Crew Quarters additionally carry the Hire Crew button (ROADMAP P1.10).
   *  `status`, `hireStatus`, and `staffPct` are the results the caller
   *  already computed for the rebuild diff, reused here so they never drift
   *  (`hireStatus` is null for modules that don't host the button). */
  private createActor(
    grid: TileGridGeometry,
    data: ModuleData,
    status: LevelUpStatus,
    hireStatus: HireStatus | null,
    staffPct: number,
  ): TileActor {
    const now = serverNow();
    const entry = moduleCatalogEntry(data.moduleType);
    const displayName = entry?.displayName ?? data.moduleType;
    const firstBuildPending = data.pending !== null && data.level === 0;

    const buttons: ButtonDef[] = [];
    // Hire Crew (ROADMAP P1.10) — pushed first, so HIRE_BUTTON_INDEX holds
    // for the tick() countdown. Independent of the module's own build
    // pipeline: a pending level-up doesn't block recruiting, so it sits
    // outside the pending gate below.
    if (hireStatus !== null) {
      // "full" (no berths — the fix is Crew Quarters) reads very
      // differently from a cost badge that looks unmet — say so.
      buttons.push(roundButton({
        icon: "crew",
        label: hireStatus === "recruiting"
          ? recruitingLabel(gameState.pendingHire?.completesAt ?? now, now)
          : hireStatus === "full"
          ? "Quarters Full"
          : "Hire Crew",
        badge: hireStatus === "ready" || hireStatus === "unaffordable"
          ? `${hireCostAt(gameState.crew)}`
          : undefined,
        disabled: hireStatus !== "ready",
        onPressed: () => void this.hireCrew(),
      }));
    }
    // Trade (ROADMAP P1.12): a settled Trading Post opens the deal shop.
    // Level 0 / mid-first-build shows nothing ("zero and earned"); a pending
    // level-up doesn't block trading — the module keeps functioning at its
    // settled level.
    if (data.moduleType === TRADING_POST_MODULE_TYPE && data.level >= 1) {
      buttons.push(roundButton({
        icon: "buy",
        label: "Trade",
        onPressed: () => this.host.openShop(),
      }));
    }
    if (data.pending === null && entry) {
      const nextLevel = data.level + 1;
      const cost = costAtLevel(entry, nextLevel);
      buttons.push(roundButton({
        icon: "upgrade",
        // "capped" (blocked by the Command Module's own level, README § Ship
        // design) reads very differently from "unaffordable" — say so rather
        // than showing a cost badge that looks unmet either way.
        label: status === "capped"
          ? `Needs Command Lv${nextLevel}`
          : "Level Up",
        badge: `${cost}`,
        disabled: status !== "ready",
        onPressed: () => void this.levelUp(data.moduleId),
      }));
    }
    // Details (ROADMAP P1.20): read-only stats/level/countdown panel, the
    // same affordance map entities already have (P1.16). Always available —
    // unlike the actions above, it has nothing to gate.
    buttons.push(roundButton({
      icon: "details",
      label: "Details",
      onPressed: () => this.host.openDetails(data.moduleId),
    }));

    return new TileActor({
      grid,
      edgeFallthrough: this.host.edgeFallthrough(),
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
      onPressed: this.host.onTilePressed,
      buttons,
      badges: [
        {
          anchor: "bottom-left",
          badge: {
            text: `${data.level}`,
            backgroundColor: ex.Color.ExcaliburBlue,
          },
        },
        // Understaffed producer (ROADMAP P1.10): show how far below full
        // output the pooled crew shortage puts it. Hiring (or leveling Crew
        // Quarters) is the fix, so the badge clears itself via the rebuild
        // diff as crew lands.
        ...(staffPct < 100
          ? [
            {
              anchor: "top-right" as const,
              badge: {
                text: `${staffPct}%`,
                backgroundColor: ex.Color.Orange,
              },
            },
          ]
          : []),
      ],
    });
  }

  /**
   * Tapping an empty interior tile offers to build any catalog type unlocked
   * by the current Command Module level, in that room (mirroring the map
   * view's Move/Deploy pattern). Taps outside a room (void, hull, corridors),
   * in an occupied room, or when nothing is buildable yet do nothing.
   */
  createBuildOfferActor(
    grid: TileGridGeometry,
    col: number,
    row: number,
    onPressed: (a: TileActor) => void,
  ): TileActor | null {
    const anchor = moduleAnchorAt(SHIP_ROOM_GRID, col, row, MODULE_SPAN);
    if (anchor === null) return null;
    const room = roomOriginAt(SHIP_ROOM_GRID, col, row)!;
    if (this.roomOccupied(room.col, room.row)) return null;

    const commandLevel = this.commandModuleLevel();
    // One module per type (ROADMAP P1.18): the backend rejects a second
    // build of a type the player already owns (any level, build pending or
    // not), so the offer hides it here too rather than showing a button
    // that would just come back as an error.
    const ownedTypes = new Set(
      [...gameState.modules.values()].map((m) => m.moduleType),
    );
    const buildable = MODULE_CATALOG.filter(
      (e) =>
        e.moduleType !== COMMAND_MODULE_TYPE &&
        e.unlockCommandLevel <= commandLevel &&
        !ownedTypes.has(e.moduleType),
    );
    if (buildable.length === 0) return null;

    return new TileActor({
      grid,
      tile: ghostModuleTile(0.2),
      col: anchor.col,
      row: anchor.row,
      width: MODULE_SPAN,
      height: MODULE_SPAN,
      onPressed,
      buttons: buildable.map((entry) => {
        const cost = costAtLevel(entry, 1);
        return roundButton({
          icon: "build",
          label: entry.displayName,
          // Cost shown as the button badge; affordability is re-checked by
          // the backend on request — this disable is just UX.
          badge: `${cost}`,
          disabled: gameState.resources.construction < cost,
          onPressed: () =>
            void this.build(anchor.col, anchor.row, entry.moduleType),
        });
      }),
    });
  }

  /**
   * Asks the backend to start a module build. The backend verifies the
   * catalog type, unlock level, placement, and cost, deducts the resources,
   * and returns the authoritative ModuleData plus updated resource counts;
   * merging both into gameState fans out to sync(). Already the phase-3
   * shape: send a request, apply the server's response — only the transport
   * changes (Tauri IPC now, WebSocket in P3.1).
   */
  private async build(
    col: number,
    row: number,
    moduleType: string,
  ): Promise<void> {
    this.host.deselectActor(); // clear the placement preview actor
    try {
      const { module, resources } = await invoke<ModuleActionResponse>(
        "request_build_module",
        { col, row, moduleType },
      );
      gameState.syncResources(resources);
      gameState.applyModuleEvent(module);
    } catch (err) {
      // The Build button is disabled when unaffordable, so this is a race
      // (or a bug). Surface it; state stays untouched.
      console.warn("request_build_module rejected:", err);
      this.host.showToast(errorToast(`Build failed: ${err}`));
    }
  }

  /**
   * Asks the backend to level up an existing module. The backend verifies
   * ownership, that no build is already pending, and the Command Module's
   * level cap, deducts the scaled cost, and returns the authoritative
   * ModuleData plus updated resource counts.
   */
  private async levelUp(moduleId: string): Promise<void> {
    // Unlike build(), there's no placement-preview ghost to clear here — the
    // button lives on the real, already-selected module actor. Leave it
    // selected while the request is in flight; sync() rebuilds it (carrying
    // the selection forward) once the response lands and the module shows
    // `pending`.
    try {
      const { module, resources } = await invoke<ModuleActionResponse>(
        "request_levelup_module",
        { moduleId },
      );
      gameState.syncResources(resources);
      gameState.applyModuleEvent(module);
    } catch (err) {
      console.warn("request_levelup_module rejected:", err);
      this.host.showToast(errorToast(`Level up failed: ${err}`));
    }
  }

  /**
   * Asks the backend to recruit one crew member (ROADMAP P1.10). The backend
   * verifies the single-recruitment rule, berth room, and the biological
   * cost, deducts it, and returns the authoritative crew state (recruitment
   * pending) plus updated resource counts; the completion arrives later as a
   * crew push. Same event-pattern shape as build/levelUp.
   */
  private async hireCrew(): Promise<void> {
    // Like levelUp: the button lives on the already-selected Command Module
    // actor — leave the selection alone; sync() rebuilds it (carrying the
    // selection over) when the response flips the status.
    try {
      const { crew, resources } = await invoke<CrewActionResponse>(
        "request_hire_crew",
      );
      gameState.syncResources(resources);
      gameState.applyCrewEvent(crew);
    } catch (err) {
      console.warn("request_hire_crew rejected:", err);
      this.host.showToast(errorToast(`Hire failed: ${err}`));
    }
  }

  /**
   * Drives the build/level-up countdown labels: while pending, a module's
   * label counts down once a second. Completion itself arrives as a server
   * push — the backend scheduler settles the build the moment completesAt
   * passes and pushes the updated ModuleData, which sync() applies — so the
   * label only ever shows "0s" for however long that push takes to land.
   * Runs only while the scene is active; a build that completed while the
   * player was away is already settled in gameState when they return.
   */
  tick(): void {
    const now = serverNow();
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
    // Recruiting countdown (ROADMAP P1.10) on every hire-hosting actor's
    // button; setButtonLabel no-ops until the rounded seconds change.
    // Completion arrives as a crew push, whose rebuild resets the label.
    const pendingHire = gameState.pendingHire;
    if (pendingHire !== null) {
      const label = recruitingLabel(pendingHire.completesAt, now);
      for (const actor of this.hireHosts.values()) {
        actor.setButtonLabel(HIRE_BUTTON_INDEX, label);
      }
    }
  }
}
