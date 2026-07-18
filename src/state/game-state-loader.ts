import * as ex from "excalibur";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import {
  gameState,
  GameStateData,
  Revisioned,
  SERVER_PUSH_EVENT,
  ServerPush,
} from "./game-state.ts";
import { loadAfterListenerReady } from "./game-state-loader-order.ts";

/**
 * Excalibur loader resource that fetches the initial game state from the
 * backend and applies it to the shared `gameState` singleton. Riding the
 * loader (see main.ts) keeps the splash/loading screen up while the fetch —
 * potentially a slow network round-trip or login handshake later — runs
 * alongside asset loading.
 *
 * Resilient by design: a failed load never blocks game start. The player
 * simply continues on the new-player defaults, and a later login/sync can
 * call gameState.load() again at any time — scenes subscribe for changes
 * rather than assuming state is final when they initialize.
 *
 * Lives outside game-state.ts so that module stays free of runtime
 * Excalibur/Tauri imports and unit-testable under Deno (same split as
 * map-loader.ts vs. the pure grid/tile modules).
 */
export class GameStateResource
  implements ex.Loadable<Revisioned<GameStateData> | null> {
  data: Revisioned<GameStateData> | null = null;
  private attempted = false;

  async load(): Promise<Revisioned<GameStateData> | null> {
    try {
      this.data = await loadAfterListenerReady(
        startServerPushListener,
        () => invoke<Revisioned<GameStateData>>("load_game_state"),
      );
      gameState.load(this.data);
    } catch (err) {
      console.error(
        "load_game_state failed; continuing as a new player:",
        err,
      );
    }
    this.attempted = true;
    return this.data;
  }

  isLoaded(): boolean {
    return this.attempted;
  }
}

/**
 * Subscribe to the backend's push channel (ROADMAP P1.5). The scheduler
 * thread in src-tauri/src/game_state/scheduler.rs settles state the moment something
 * comes due — a production tick, a build/level-up completing, a vessel
 * arriving — and emits a ServerPush; applyServerPush routes it into the
 * shared gameState. This replaces the old load_game_state polling loop: the
 * server tells the client when something changed, the client never asks on
 * a timer.
 *
 * Same resilience contract as the loader fetch: if subscribing fails (e.g. a
 * plain-browser dev tab with no Tauri backend), the game still runs on the
 * initial snapshot and command responses — just without live pushes.
 */
let serverPushListenerReady: Promise<void> | null = null;

export function startServerPushListener(): Promise<void> {
  serverPushListenerReady ??= listen<Revisioned<ServerPush>>(
    SERVER_PUSH_EVENT,
    (event) => {
      gameState.applyServerPush(event.payload);
    },
  ).then(() => undefined).catch((err) => {
    console.error(
      "server-push subscription failed; live updates disabled:",
      err,
    );
  });
  return serverPushListenerReady;
}
