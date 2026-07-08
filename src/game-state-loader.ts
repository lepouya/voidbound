import * as ex from "excalibur";

import { invoke } from "@tauri-apps/api/core";

import { gameState, GameStateData } from "./game-state.ts";

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
export class GameStateResource implements ex.Loadable<GameStateData | null> {
  data: GameStateData | null = null;
  private attempted = false;

  async load(): Promise<GameStateData | null> {
    try {
      this.data = await invoke<GameStateData>("load_game_state");
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
