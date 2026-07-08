/**
 * Shared cross-scene game state (ROADMAP P0.12).
 *
 * `MapLevel` and `ShipLevel` are separate scene instances with no reference
 * to each other; anything both need lives here as a plain module singleton
 * that either can import. Today that is the local player's identity and the
 * four resource counts with their production tick (ROADMAP P1.1 — mined in
 * the map view, spent in the ship view).
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
 * Length of one production interval. Production accrues only in whole
 * intervals (see GameState.applyProduction), so this is also how often the
 * P1.2 resource bar will visibly change. Placeholder pacing — tune alongside
 * the P1.4 module catalog.
 */
export const PRODUCTION_TICK_MS = 5_000;

/**
 * Baseline per-tick output of the Command Module — always present, so the
 * player can never get resource-stuck (README § Command Module). The P1.4
 * catalog scales this by module level and adds the four producer modules.
 */
export const COMMAND_MODULE_PRODUCTION: ResourceCounts = {
  construction: 1,
  highTech: 1,
  biological: 1,
  fuel: 1,
  // Currency is earned through trade (P1.12), never produced by modules.
  credits: 0,
};

/**
 * Wire shape of the `load_game_state` Tauri command. Mirrors the Rust
 * `GameStateData` in src-tauri/src/lib.rs — keep the two in sync.
 */
export interface GameStateData {
  player: PlayerIdentity;
  resources: ResourceCounts;
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
   * The player's stock of every ResourceKind. All writes go through
   * update(); reads are direct. New-player default (all zero) until load()
   * lands — must match what the backend sends for a fresh player.
   */
  resources: ResourceCounts = {
    construction: 0,
    highTech: 0,
    biological: 0,
    fuel: 0,
    credits: 0,
  };

  /**
   * Epoch ms of the last applied production-interval boundary. Production
   * accrues in whole PRODUCTION_TICK_MS steps from this anchor; the
   * sub-interval remainder carries over between applyProduction calls.
   */
  private lastProductionAt: number;

  private listeners = new Set<GameStateListener>();

  constructor(nowMs = Date.now()) {
    this.lastProductionAt = nowMs;
  }

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
   * Combined per-tick resource production. Command Module baseline only for
   * now; the P1.4 module catalog adds producer-module output (scaled by
   * level) on top of it.
   */
  productionPerTick(): ResourceCounts {
    return { ...COMMAND_MODULE_PRODUCTION };
  }

  /**
   * Accrue production for every whole PRODUCTION_TICK_MS interval elapsed
   * since the last applied tick (ROADMAP P1.1). Safe to call every frame: it
   * no-ops (without notifying subscribers) until a full interval has passed,
   * and catches up in a single call after a pause or a background stretch.
   * Returns the number of ticks applied.
   *
   * Deliberately not event-modeled: production is a deterministic function
   * of time and module levels, so the phase-3 server recomputes it from
   * snapshots instead of logging a tick event per player per interval.
   */
  applyProduction(nowMs: number): number {
    if (nowMs < this.lastProductionAt) {
      // Clock went backwards (manual adjustment, suspend/resume drift) —
      // re-anchor instead of freezing production until it catches back up.
      this.lastProductionAt = nowMs;
      return 0;
    }
    const ticks = Math.floor(
      (nowMs - this.lastProductionAt) / PRODUCTION_TICK_MS,
    );
    if (ticks === 0) return 0;
    this.update((s) => {
      const perTick = s.productionPerTick();
      for (const kind of RESOURCE_KINDS) {
        s.resources[kind] += perTick[kind] * ticks;
      }
      s.lastProductionAt += ticks * PRODUCTION_TICK_MS;
    });
    return ticks;
  }

  /**
   * Replace this state with backend-loaded data, notifying subscribers.
   * Routed through update() so a re-sync at any time (post-login refresh,
   * phase-3 server snapshot) refreshes live scenes the same way a local
   * mutation would.
   */
  load(data: GameStateData, nowMs = Date.now()): void {
    this.update((s) => {
      s.player = data.player;
      s.resources = { ...data.resources };
      // Backend counts are authoritative as of the load instant; drop any
      // partial local interval so production resumes cleanly from here.
      s.lastProductionAt = nowMs;
      s.loaded = true;
    });
  }
}

/** The single shared instance every scene imports. */
export const gameState = new GameState();
