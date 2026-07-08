import { assert, assertEquals } from "jsr:@std/assert@1";

import { GameState, gameState } from "../src/game-state.ts";

Deno.test("update applies the mutation and notifies every subscriber", () => {
  const state = new GameState();
  let notified = 0;
  state.subscribe(() => notified++);
  state.subscribe(() => notified++);

  state.update((s) => {
    s.player = { id: "player-9", name: "Renamed" };
  });

  assertEquals(state.player, { id: "player-9", name: "Renamed" });
  assertEquals(notified, 2);
});

Deno.test("listeners fire after the mutation, seeing the new state", () => {
  const state = new GameState();
  let seenName = "";
  state.subscribe(() => {
    seenName = state.player.name;
  });

  state.update((s) => {
    s.player = { ...s.player, name: "After" };
  });

  assertEquals(seenName, "After");
});

Deno.test("unsubscribe stops notifications", () => {
  const state = new GameState();
  let notified = 0;
  const unsubscribe = state.subscribe(() => notified++);

  state.update(() => {});
  unsubscribe();
  state.update(() => {});

  assertEquals(notified, 1);
});

Deno.test("a listener unsubscribing itself mid-notify doesn't skip others", () => {
  const state = new GameState();
  const fired: string[] = [];
  const unsubA = state.subscribe(() => {
    fired.push("a");
    unsubA();
  });
  state.subscribe(() => fired.push("b"));

  state.update(() => {});
  assertEquals(fired, ["a", "b"]);

  // "a" removed itself; only "b" fires the second time.
  state.update(() => {});
  assertEquals(fired, ["a", "b", "b"]);
});

Deno.test("load replaces state with backend data, sets loaded, notifies", () => {
  const state = new GameState();
  let notified = 0;
  state.subscribe(() => notified++);
  assert(!state.loaded);

  state.load({ player: { id: "player-42", name: "Loaded Player" } });

  assertEquals(state.player, { id: "player-42", name: "Loaded Player" });
  assert(state.loaded);
  assertEquals(notified, 1);
});

Deno.test("shared singleton starts unloaded with new-player defaults", () => {
  assertEquals(gameState.player, { id: "player-1", name: "Player 1" });
  assert(!gameState.loaded);
  assert(gameState instanceof GameState);
});
