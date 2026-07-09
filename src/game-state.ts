/**
 * Shared cross-scene game state (ROADMAP P0.12).
 *
 * `MapLevel` and `ShipLevel` are separate scene instances with no reference
 * to each other; anything both need lives here as a plain module singleton
 * that either can import. Today that is the local player's identity and the
 * four resource counts.
 *
 * The backend is authoritative for everything in here (ROADMAP P1.1): all
 * resource math — production accrual, build costs — happens in
 * src-tauri/src/lib.rs, because the client can be tampered with. This module
 * only mirrors what the backend last sent (via the loader-phase fetch, the
 * periodic sync poll in game-state-loader.ts, or a command response) and
 * notifies subscribers so scenes re-render.
 *
 * Pure module — no Excalibur/Vite imports — so it stays unit-testable under
 * Deno (see tests/game_state_test.ts).
 */

export interface PlayerIdentity {
  readonly id: string;
  readonly name: string;
}

/**
 * The four material resources (README § Design principles) plus a generic
 * currency for the trade economy. "credits" is a placeholder term — the
 * player-facing name settles later in the display layer (likely with the
 * P1.12 trading post), so only rendering code should ever spell it out. Key
 * names are shared with the Rust `ResourceCounts` wire shape (serde
 * camelCase).
 */
export type ResourceKind =
  | "construction"
  | "highTech"
  | "biological"
  | "fuel"
  | "credits";

export const RESOURCE_KINDS: readonly ResourceKind[] = [
  "construction",
  "highTech",
  "biological",
  "fuel",
  "credits",
];

export type ResourceCounts = Record<ResourceKind, number>;

/**
 * A mothership on the space map, as reported by the backend — the single
 * source of truth for placement. MapLevel builds its map actors from the
 * snapshot list rather than hardcoding positions, so moved ships or newly
 * joined players arrive through the same reconcile with no client changes.
 * Mirrors the Rust `MothershipData` in src-tauri/src/game_state.rs — keep
 * the two in sync.
 */
export interface MothershipData {
  /** One mothership per player for now, so ids equal the owner id. */
  mothershipId: string;
  ownerId: string;
  /** Display name shown below the ship sprite. */
  ownerName: string;
  /** Sprite/capability type, e.g. "ss1" — resolves art as `<type>-base` /
   *  `<type>-damaged`. */
  shipType: string;
  /** Renders the `-damaged` sprite variant when true. */
  damaged: boolean;
  /** Anchor (top-left) tile of the footprint. */
  col: number;
  row: number;
  /** Footprint size in tiles (span*span). */
  span: number;
}

/**
 * A vessel movement authorized by the backend — dispatches, recalls, and (in
 * phase 3) moves pushed from other players all use this one shape (see
 * SERVER.md). Lives here rather than in map-level.ts because it rides the
 * load_game_state snapshot: the shared state holds the vessel table between
 * scenes. srcCol/srcRow may be fractional — a recall departs from the
 * vessel's lerped mid-flight position. Mirrors the Rust `VesselMoveEventData`
 * in src-tauri/src/game_state.rs — keep the two in sync.
 */
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
   *  Lets late-joining clients lerp to the current position without
   *  re-computing travel time. */
  arrivalAt: number;
}

/**
 * Length of one backend production interval — the cadence at which the
 * client polls `load_game_state` so produced resources reach the resource
 * bar as they land. Mirrors PRODUCTION_TICK_MS in src-tauri/src/lib.rs —
 * keep the two in sync.
 */
export const PRODUCTION_TICK_MS = 5_000;

/**
 * A build or level-up in progress on a module — the level it completes to
 * and when. Mirrors the Rust `ModulePendingBuild` in
 * src-tauri/src/game_state.rs — keep the two in sync.
 */
export interface ModulePendingBuild {
  /** The level this build completes to. */
  level: number;
  /** Server epoch ms when the build/upgrade was authorized. */
  dispatchedAt: number;
  /** Pre-computed completion time — lets late-joining clients show the
   *  correct remaining time without redoing the clock math locally. */
  completesAt: number;
}

/**
 * A module placed in the ship (ROADMAP P1.4), with its catalog type and
 * current level — placement and level are server-owned, so ShipLevel builds
 * its actors from the `gameState.modules` snapshot with no hardcoded layout
 * (the Command Module included). Level 0 means the first build hasn't
 * completed yet; `pending` carries the in-progress timer for either a first
 * build (level 0 -> 1) or a level-up (level N -> N+1, during which the
 * module keeps functioning at level N). Mirrors the Rust `ModuleData` in
 * src-tauri/src/game_state.rs — keep the two in sync.
 */
export interface ModuleData {
  moduleId: string;
  ownerId: string;
  /** Display name shown below the module sprite. */
  ownerName: string;
  /** Catalog key, e.g. "ore-refinery" (see src/module-catalog.ts). Until
   *  per-type art lands, every module renders with the same "module-base"
   *  sprite regardless of this value. */
  moduleType: string;
  /** Anchor (top-left) tile of the module footprint. */
  col: number;
  row: number;
  /** Highest level this module has fully completed; 0 while the first build
   *  is still running. */
  level: number;
  /** Present while a build/upgrade is in flight. */
  pending: ModulePendingBuild | null;
}

/**
 * Wire shape of the `load_game_state` Tauri command. Mirrors the Rust
 * `GameStateData` in src-tauri/src/lib.rs — keep the two in sync.
 */
export interface GameStateData {
  player: PlayerIdentity;
  resources: ResourceCounts;
  /** Every mothership on the space map — placement is server-owned; the
   *  client builds its map actors from this list. */
  motherships: MothershipData[];
  /** Every vessel currently in flight or parked on the map, in dispatch
   *  order — the snapshot half of SERVER.md's snapshot + replay. */
  vessels: VesselMoveEvent[];
  /** Every module in the ship, built or under construction, including the
   *  Command Module — placement and level are server-owned. */
  modules: ModuleData[];
}

export type GameStateListener = () => void;

export class GameState {
  /**
   * True once load() has applied backend state. Until then every field below
   * holds its new-player default — scenes must render sensibly either way,
   * because the backend fetch (or a future login flow) may finish after they
   * initialize, or not at all.
   */
  loaded = false;

  /**
   * The local player. Synced from the backend during the loader phase (see
   * game-state-loader.ts); the mothership and dispatched vessels are stamped
   * with it. New-player default until load() lands.
   */
  player: PlayerIdentity = { id: "player-1", name: "Player 1" };

  /**
   * The player's stock of every ResourceKind, as last reported by the
   * backend. All writes go through update(); reads are direct. New-player
   * default (all zero) until load() lands — must match what the backend
   * sends for a fresh player.
   */
  resources: ResourceCounts = {
    construction: 0,
    highTech: 0,
    biological: 0,
    fuel: 0,
    credits: 0,
  };

  /**
   * Every mothership on the space map, keyed by mothershipId, as last
   * reported by the backend. Replaced wholesale by each load() snapshot —
   * which is also how updates (a moved ship, a newly joined player) reach
   * the client until a push channel lands. Empty until load() lands: the
   * client hardcodes no placements. MapLevel reconciles its actors from
   * this table whenever subscribers are notified.
   */
  motherships = new Map<string, MothershipData>();

  /**
   * Every vessel in flight or parked on the map, keyed by vesselId, holding
   * its latest backend-authorized move. Replaced wholesale by each load()
   * snapshot and merged per-event by applyVesselEvent(). Held here rather
   * than in the map scene so vessel state stays current (via the periodic
   * sync poll) while other scenes are active — MapLevel reconciles its
   * actors from this table whenever subscribers are notified.
   */
  vessels = new Map<string, VesselMoveEvent>();

  /**
   * Every module in the ship, built or under construction (Command Module
   * included), keyed by moduleId, as last reported by the backend. Replaced
   * wholesale by each load() snapshot and merged per-module by
   * applyModuleEvent(). Empty until load() lands: the client hardcodes no
   * modules. ShipLevel reconciles its actors from this table whenever
   * subscribers are notified.
   */
  modules = new Map<string, ModuleData>();

  private listeners = new Set<GameStateListener>();

  /**
   * Register a listener called after every update(). Returns an unsubscribe
   * function. Scenes live for the whole app run, so subscribing once in
   * onInitialize (after actors exist) is fine for world actors; listeners
   * that touch per-activation HUD elements should instead subscribe in
   * onActivate and unsubscribe in onDeactivate.
   */
  subscribe(listener: GameStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Apply a mutation and notify subscribers. All writes must go through here
   * so cross-scene consumers (e.g. the P1.2 resource bar HUD) stay in sync.
   */
  update(mutate: (state: GameState) => void): void {
    mutate(this);
    // Copy first: a listener may unsubscribe (itself or others) mid-notify.
    for (const listener of [...this.listeners]) listener();
  }

  /**
   * Replace the resource counts with an authoritative snapshot from a
   * backend command response (e.g. request_build_module returns the counts
   * after the cost deduction), notifying subscribers.
   */
  syncResources(resources: ResourceCounts): void {
    this.update((s) => {
      s.resources = { ...resources };
    });
  }

  /**
   * Merge a single authorized vessel event from a command response (or, in
   * phase 3, a server push), notifying subscribers. The next load() snapshot
   * supersedes it — the backend records every event it authorizes, so the
   * snapshot already contains it.
   */
  applyVesselEvent(event: VesselMoveEvent): void {
    this.update((s) => {
      s.vessels.set(event.vesselId, event);
    });
  }

  /**
   * Apply a single authorized module event (build or level-up) from a
   * command response, notifying subscribers — the CLAUDE.md multiplayer-
   * ready event pattern's `apply<Action>Event` entry point for module
   * actions, matching applyVesselEvent's shape: idempotent (merges by
   * moduleId, so a redirect/replay just overwrites), zero UI housekeeping.
   * ModuleData itself is the event payload (it already carries the pending
   * build's dispatchedAt/completesAt, same as VesselMoveEvent's timestamps);
   * a separate `ModuleEvent` wrapper isn't needed since the module's full
   * current state *is* what a server push would send. The next load()
   * snapshot supersedes it — the backend records every module it mutates, so
   * the snapshot already contains it.
   */
  applyModuleEvent(module: ModuleData): void {
    this.update((s) => {
      s.modules.set(module.moduleId, module);
    });
  }

  /**
   * Replace this state with backend-loaded data, notifying subscribers.
   * Routed through update() so a re-sync at any time (the periodic poll, a
   * post-login refresh, a phase-3 server snapshot) refreshes live scenes the
   * same way a local mutation would.
   */
  load(data: GameStateData): void {
    this.update((s) => {
      s.player = data.player;
      s.resources = { ...data.resources };
      s.motherships = new Map(
        data.motherships.map((m) => [m.mothershipId, m]),
      );
      s.vessels = new Map(data.vessels.map((e) => [e.vesselId, e]));
      s.modules = new Map(data.modules.map((m) => [m.moduleId, m]));
      s.loaded = true;
    });
  }
}

/** The single shared instance every scene imports. */
export const gameState = new GameState();
