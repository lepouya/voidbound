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
import { applyBalanceCatalog } from "./balance-catalog.ts";

/**
 * Excalibur loader resource that fetches the initial game state from the
 * backend and applies it to the shared `gameState` singleton. Riding the
 * loader (see main.ts) keeps the splash/loading screen up while the fetch —
 * potentially a slow network round-trip or login handshake later — runs
 * alongside asset loading.
 *
 * A failed load never blocks game start — the loading screen always
 * finishes. But the client carries no local fallback balance numbers, so a
 * failure leaves an explicitly *unloaded* state (no catalog, no world)
 * rather than a playable offline mode; scenes surface `currentLoadFailure()`
 * as a blocking dialog with a retry (see load-failure-dialog.ts).
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
    await attemptGameStateLoad(startServerPushListener);
    this.data = loadedSnapshot;
    this.attempted = true;
    return this.data;
  }

  isLoaded(): boolean {
    return this.attempted;
  }
}

/**
 * Why a load attempt failed. The two need different words in front of the
 * player and, later, different recovery: a transport failure is transient
 * and worth retrying, while an incompatible catalog means the client itself
 * is out of date and no amount of retrying will help — once Phase 3 serves
 * real clients, that case has to tell the player to update the app or
 * reload the page.
 */
export type LoadFailureKind = "unreachable" | "incompatible";

export interface LoadFailure {
  kind: LoadFailureKind;
  message: string;
}

/** Non-null while the most recent load attempt is unresolved. */
let loadFailure: LoadFailure | null = null;
/** The snapshot of the last *successful* attempt; never a partial one. */
let loadedSnapshot: Revisioned<GameStateData> | null = null;
const failureListeners = new Set<() => void>();

export function currentLoadFailure(): LoadFailure | null {
  return loadFailure;
}

/** Notified whenever the outstanding failure appears or clears. */
export function subscribeToLoadFailure(listener: () => void): () => void {
  failureListeners.add(listener);
  return () => failureListeners.delete(listener);
}

function setLoadFailure(failure: LoadFailure | null): void {
  loadFailure = failure;
  // An unresolved failure also stops the push channel from building a
  // partial world behind an empty catalog (see GameState.suspended).
  gameState.suspended = failure !== null;
  for (const listener of failureListeners) listener();
}

/**
 * Fetch the snapshot, install its balance catalog, and publish it — the one
 * path used by the loader phase and by the failure dialog's Retry alike.
 *
 * `beforeFirstRequest` runs only on the very first attempt: the push
 * listener must be subscribed before the snapshot is requested so no change
 * emitted after the snapshot is missed (game-state-loader-order.ts). A retry
 * reuses the listener already running.
 *
 * The snapshot is published only once its catalog validates, so a rejected
 * catalog can never leave `data` holding state that `gameState` never saw.
 */
export async function attemptGameStateLoad(
  beforeFirstRequest?: () => Promise<void>,
): Promise<LoadFailure | null> {
  let snapshot: Revisioned<GameStateData>;
  try {
    snapshot = beforeFirstRequest
      ? await loadAfterListenerReady(
        beforeFirstRequest,
        () => invoke<Revisioned<GameStateData>>("load_game_state"),
      )
      : await invoke<Revisioned<GameStateData>>("load_game_state");
  } catch (err) {
    console.error("load_game_state failed:", err);
    setLoadFailure({ kind: "unreachable", message: `${err}` });
    return loadFailure;
  }
  return adoptSnapshot(snapshot);
}

/**
 * Development-only: reseed the backend's local system and adopt the fresh
 * snapshot. Refused by release builds server-side; the dialog only offers it
 * in dev, and both halves go away once Phase 3 owns the state.
 */
export async function resetLocalSystem(): Promise<LoadFailure | null> {
  let snapshot: Revisioned<GameStateData>;
  try {
    snapshot = await invoke<Revisioned<GameStateData>>("reset_local_system");
  } catch (err) {
    console.error("reset_local_system failed:", err);
    setLoadFailure({ kind: "unreachable", message: `${err}` });
    return loadFailure;
  }
  return adoptSnapshot(snapshot);
}

/** Validate a snapshot's catalog, then publish both. Either both land or
 *  neither does. */
function adoptSnapshot(
  snapshot: Revisioned<GameStateData>,
): LoadFailure | null {
  try {
    applyBalanceCatalog(snapshot.data.balance);
  } catch (err) {
    console.error("balance catalog rejected:", err);
    setLoadFailure({ kind: "incompatible", message: `${err}` });
    return loadFailure;
  }
  loadedSnapshot = snapshot;
  gameState.load(snapshot);
  setLoadFailure(null);
  return null;
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
