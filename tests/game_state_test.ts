import { assert, assertEquals } from "jsr:@std/assert@1";

import {
  GameState,
  gameState,
  MothershipData,
  ResourceCounts,
  VesselMoveEvent,
} from "../src/game-state.ts";

const ZERO_RESOURCES: ResourceCounts = {
  construction: 0,
  highTech: 0,
  biological: 0,
  fuel: 0,
  credits: 0,
};

function sampleMothership(
  id: string,
  overrides: Partial<MothershipData> = {},
): MothershipData {
  return {
    mothershipId: id,
    ownerId: id,
    ownerName: `Owner of ${id}`,
    shipType: "ss1",
    damaged: false,
    col: 48,
    row: 48,
    span: 4,
    ...overrides,
  };
}

function sampleVessel(
  id: string,
  overrides: Partial<VesselMoveEvent> = {},
): VesselMoveEvent {
  return {
    vesselId: id,
    ownerId: "player-1",
    ownerName: "Player 1",
    mothershipId: "player-1",
    vesselType: "cs1",
    srcCol: 50,
    srcRow: 50,
    destCol: 50,
    destRow: 60,
    speed: 32,
    dispatchedAt: 1_000,
    arrivalAt: 11_000,
    ...overrides,
  };
}

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
    motherships: [sampleMothership("player-42")],
    vessels: [sampleVessel("vessel-a")],
  });

  assertEquals(state.player, { id: "player-42", name: "Loaded Player" });
  assertEquals(state.resources, {
    construction: 5,
    highTech: 6,
    biological: 7,
    fuel: 8,
    credits: 9,
  });
  assertEquals(
    state.motherships.get("player-42"),
    sampleMothership("player-42"),
  );
  assertEquals(state.vessels.get("vessel-a"), sampleVessel("vessel-a"));
  assert(state.loaded);
  assertEquals(notified, 1);
});

Deno.test("applyVesselEvent merges by vesselId and notifies", () => {
  const state = new GameState();
  let notified = 0;
  state.subscribe(() => notified++);

  state.applyVesselEvent(sampleVessel("vessel-a"));
  state.applyVesselEvent(sampleVessel("vessel-b"));
  // A recall re-stamps the same vessel with a new move: replace, not append.
  const recall = sampleVessel("vessel-a", {
    srcCol: 50,
    srcRow: 55,
    destCol: 50,
    destRow: 50,
    dispatchedAt: 6_000,
    arrivalAt: 11_000,
  });
  state.applyVesselEvent(recall);

  assertEquals(state.vessels.size, 2);
  assertEquals(state.vessels.get("vessel-a"), recall);
  assertEquals(notified, 3);
});

Deno.test("load replaces the vessel and mothership tables wholesale", () => {
  const state = new GameState();
  state.applyVesselEvent(sampleVessel("vessel-docked"));
  state.load({
    player: { id: "player-1", name: "Player 1" },
    resources: ZERO_RESOURCES,
    motherships: [sampleMothership("player-1")],
    vessels: [],
  });

  state.load({
    player: { id: "player-1", name: "Player 1" },
    resources: ZERO_RESOURCES,
    motherships: [sampleMothership("player-9", { col: 10, row: 12 })],
    vessels: [sampleVessel("vessel-live")],
  });

  // The docked vessel was pruned by the backend and player-1's ship left the
  // world; only the latest snapshot survives.
  assertEquals([...state.vessels.keys()], ["vessel-live"]);
  assertEquals([...state.motherships.keys()], ["player-9"]);
  assertEquals(state.motherships.get("player-9")?.col, 10);
});

Deno.test("shared singleton starts unloaded with new-player defaults", () => {
  assertEquals(gameState.player, { id: "player-1", name: "Player 1" });
  assertEquals(gameState.resources, ZERO_RESOURCES);
  // No hardcoded placements: the world is empty until a snapshot lands.
  assertEquals(gameState.motherships.size, 0);
  assertEquals(gameState.vessels.size, 0);
  assert(!gameState.loaded);
  assert(gameState instanceof GameState);
});

Deno.test("syncResources replaces the counts with the snapshot, notifies", () => {
  const state = new GameState();
  let notified = 0;
  state.subscribe(() => notified++);

  const snapshot: ResourceCounts = {
    construction: 12,
    highTech: 3,
    biological: 4,
    fuel: 5,
    credits: 6,
  };
  state.syncResources(snapshot);

  assertEquals(state.resources, snapshot);
  assertEquals(notified, 1);
  // A copy was stored: later mutation of the snapshot doesn't leak in.
  snapshot.construction = 999;
  assertEquals(state.resources.construction, 12);
  // syncResources alone doesn't mark the full state as loaded.
  assert(!state.loaded);
});
