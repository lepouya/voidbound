import { assert, assertEquals } from "jsr:@std/assert@1";

import {
  GameState,
  gameState,
  PRODUCTION_TICK_MS,
  RESOURCE_KINDS,
  ResourceCounts,
} from "../src/game-state.ts";

const ZERO_RESOURCES: ResourceCounts = {
  construction: 0,
  highTech: 0,
  biological: 0,
  fuel: 0,
  credits: 0,
};

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

  state.load({
    player: { id: "player-42", name: "Loaded Player" },
    resources: {
      construction: 5,
      highTech: 6,
      biological: 7,
      fuel: 8,
      credits: 9,
    },
  });

  assertEquals(state.player, { id: "player-42", name: "Loaded Player" });
  assertEquals(state.resources, {
    construction: 5,
    highTech: 6,
    biological: 7,
    fuel: 8,
    credits: 9,
  });
  assert(state.loaded);
  assertEquals(notified, 1);
});

Deno.test("shared singleton starts unloaded with new-player defaults", () => {
  assertEquals(gameState.player, { id: "player-1", name: "Player 1" });
  assertEquals(gameState.resources, ZERO_RESOURCES);
  assert(!gameState.loaded);
  assert(gameState instanceof GameState);
});

Deno.test("applyProduction no-ops before a full interval elapses", () => {
  const state = new GameState(1_000);
  let notified = 0;
  state.subscribe(() => notified++);

  assertEquals(state.applyProduction(1_000 + PRODUCTION_TICK_MS - 1), 0);

  assertEquals(state.resources, ZERO_RESOURCES);
  assertEquals(notified, 0);
});

Deno.test("applyProduction applies whole elapsed ticks and notifies once", () => {
  const state = new GameState(0);
  let notified = 0;
  state.subscribe(() => notified++);

  assertEquals(state.applyProduction(3 * PRODUCTION_TICK_MS + 500), 3);

  const perTick = state.productionPerTick();
  for (const kind of RESOURCE_KINDS) {
    assertEquals(state.resources[kind], perTick[kind] * 3);
  }
  assertEquals(notified, 1);
});

Deno.test("applyProduction carries the partial-interval remainder over", () => {
  const state = new GameState(0);

  // 1.5 intervals: one tick applies, half an interval is left over.
  assertEquals(state.applyProduction(PRODUCTION_TICK_MS * 1.5), 1);
  // Another half interval completes the second tick.
  assertEquals(state.applyProduction(PRODUCTION_TICK_MS * 2), 1);
});

Deno.test("applyProduction re-anchors when the clock goes backwards", () => {
  const state = new GameState(10 * PRODUCTION_TICK_MS);

  assertEquals(state.applyProduction(0), 0);
  // Re-anchored at 0, so production resumes one interval later instead of
  // freezing until the clock catches back up to the old anchor.
  assertEquals(state.applyProduction(PRODUCTION_TICK_MS), 1);
});

Deno.test("load restarts the production clock at the load instant", () => {
  const state = new GameState(0);
  state.applyProduction(PRODUCTION_TICK_MS); // some local accrual pre-load

  const loadedAt = 7 * PRODUCTION_TICK_MS + 123;
  state.load({
    player: { id: "p", name: "P" },
    resources: {
      construction: 100,
      highTech: 0,
      biological: 0,
      fuel: 0,
      credits: 0,
    },
  }, loadedAt);

  // Backend counts are authoritative as of load time: nothing accrues on top
  // for the pre-load elapsed time, and the next tick lands one full interval
  // after the load.
  assertEquals(state.applyProduction(loadedAt + PRODUCTION_TICK_MS - 1), 0);
  assertEquals(state.resources.construction, 100);
  assertEquals(state.applyProduction(loadedAt + PRODUCTION_TICK_MS), 1);
});
