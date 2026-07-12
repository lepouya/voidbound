import { assert, assertEquals } from "jsr:@std/assert@1";

import {
  AsteroidData,
  DealsData,
  GameState,
  gameState,
  MapWindow,
  ModuleData,
  MothershipData,
  NotificationData,
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

function sampleWindow(overrides: Partial<MapWindow> = {}): MapWindow {
  return { centerCol: 50, centerRow: 50, span: 100, ...overrides };
}

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
    returning: false,
    miningAsteroidId: null,
    cargo: null,
    ...overrides,
  };
}

function sampleAsteroid(
  id: string,
  overrides: Partial<AsteroidData> = {},
): AsteroidData {
  return {
    asteroidId: id,
    tier: "small",
    resource: "construction",
    col: 40,
    row: 60,
    span: 1,
    total: 240,
    remaining: 240,
    mining: null,
    ...overrides,
  };
}

function sampleModule(
  id: string,
  overrides: Partial<ModuleData> = {},
): ModuleData {
  return {
    moduleId: id,
    ownerId: "player-1",
    ownerName: "Player 1",
    moduleType: "ore-refinery",
    col: 2,
    row: 2,
    level: 1,
    pending: null,
    ...overrides,
  };
}

function sampleDeals(overrides: Partial<DealsData> = {}): DealsData {
  return {
    dayIndex: 20_600,
    refreshesUsed: 1,
    deals: [
      {
        dealId: "deal-20600-0-0",
        slot: 0,
        rarity: "common",
        give: null,
        get: { kind: "credits", amount: 15 },
        accepted: false,
      },
      {
        dealId: "deal-20600-1-0",
        slot: 1,
        rarity: "rare",
        give: { kind: "fuel", amount: 40 },
        get: { kind: "construction", amount: 80 },
        accepted: true,
      },
    ],
    ...overrides,
  };
}

function sampleNotification(
  id: string,
  overrides: Partial<NotificationData> = {},
): NotificationData {
  return {
    notificationId: id,
    kind: "build-complete",
    message: "Ore Refinery construction complete",
    createdAt: 1_000,
    read: false,
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
    mapWindow: sampleWindow(),
    motherships: [sampleMothership("player-42")],
    asteroids: [sampleAsteroid("asteroid-1")],
    vessels: [sampleVessel("vessel-a")],
    modules: [sampleModule("module-command")],
    notifications: [sampleNotification("notif-1")],
    crew: { crew: 3, pendingHire: { dispatchedAt: 500, completesAt: 30_500 } },
    deals: sampleDeals(),
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
  assertEquals(
    state.asteroids.get("asteroid-1"),
    sampleAsteroid("asteroid-1"),
  );
  assertEquals(
    state.modules.get("module-command"),
    sampleModule("module-command"),
  );
  assertEquals(
    state.notifications.get("notif-1"),
    sampleNotification("notif-1"),
  );
  assertEquals(state.mapWindow, sampleWindow());
  assertEquals(state.crew, 3);
  assertEquals(state.pendingHire, {
    dispatchedAt: 500,
    completesAt: 30_500,
  });
  assertEquals(state.deals, sampleDeals());
  assert(state.loaded);
  assertEquals(notified, 1);
});

Deno.test("applyMapWindow replaces the world tables and window, notifies", () => {
  const state = new GameState();
  state.load({
    player: { id: "player-1", name: "Player 1" },
    resources: { ...ZERO_RESOURCES, construction: 7 },
    mapWindow: sampleWindow(),
    motherships: [sampleMothership("player-1")],
    asteroids: [sampleAsteroid("asteroid-old")],
    vessels: [sampleVessel("vessel-own")],
    modules: [sampleModule("module-command")],
    notifications: [sampleNotification("notif-1")],
    crew: { crew: 2, pendingHire: null },
    deals: sampleDeals(),
  });
  let notified = 0;
  state.subscribe(() => notified++);

  // The camera panned: a re-centered window response replaces the world
  // tables wholesale — entities that left the window unload.
  state.applyMapWindow({
    window: sampleWindow({ centerCol: 500, centerRow: 500 }),
    motherships: [
      sampleMothership("player-1"),
      sampleMothership("player-2", { col: 503, row: 499 }),
    ],
    asteroids: [sampleAsteroid("asteroid-new", { col: 480, row: 520 })],
    vessels: [sampleVessel("vessel-own")],
  });

  assertEquals(
    state.mapWindow,
    sampleWindow({ centerCol: 500, centerRow: 500 }),
  );
  assertEquals(
    [...state.motherships.keys()].sort(),
    ["player-1", "player-2"],
  );
  assertEquals([...state.asteroids.keys()], ["asteroid-new"]);
  assertEquals([...state.vessels.keys()], ["vessel-own"]);
  // Global state is untouched: modules, resources, and the feed stay put.
  assertEquals([...state.modules.keys()], ["module-command"]);
  assertEquals(state.resources.construction, 7);
  assertEquals(state.notifications.size, 1);
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
    returning: true,
  });
  state.applyVesselEvent(recall);

  assertEquals(state.vessels.size, 2);
  assertEquals(state.vessels.get("vessel-a"), recall);
  assertEquals(notified, 3);
});

Deno.test("applyModuleEvent merges by moduleId and notifies", () => {
  const state = new GameState();
  let notified = 0;
  state.subscribe(() => notified++);

  state.applyModuleEvent(sampleModule("module-command"));
  state.applyModuleEvent(sampleModule("module-a"));
  // A level-up re-stamps the same module with a pending build: replace, not
  // append.
  const leveledUp = sampleModule("module-a", {
    pending: { level: 2, dispatchedAt: 1_000, completesAt: 6_000 },
  });
  state.applyModuleEvent(leveledUp);

  assertEquals(state.modules.size, 2);
  assertEquals(state.modules.get("module-a"), leveledUp);
  assertEquals(notified, 3);
});

Deno.test("load replaces the vessel, mothership, and module tables wholesale", () => {
  const state = new GameState();
  state.applyVesselEvent(sampleVessel("vessel-docked"));
  state.load({
    player: { id: "player-1", name: "Player 1" },
    resources: ZERO_RESOURCES,
    mapWindow: sampleWindow(),
    motherships: [sampleMothership("player-1")],
    asteroids: [sampleAsteroid("asteroid-old")],
    vessels: [],
    modules: [sampleModule("module-command")],
    notifications: [sampleNotification("notif-old")],
    crew: { crew: 2, pendingHire: null },
    deals: sampleDeals(),
  });

  state.load({
    player: { id: "player-1", name: "Player 1" },
    resources: ZERO_RESOURCES,
    mapWindow: sampleWindow({ centerCol: 12, centerRow: 14 }),
    motherships: [sampleMothership("player-9", { col: 10, row: 12 })],
    asteroids: [sampleAsteroid("asteroid-live")],
    vessels: [sampleVessel("vessel-live")],
    modules: [sampleModule("module-command"), sampleModule("module-a")],
    notifications: [],
    crew: { crew: 2, pendingHire: null },
    deals: sampleDeals({ refreshesUsed: 0 }),
  });

  // The docked vessel was pruned by the backend and player-1's ship left the
  // world; only the latest snapshot survives.
  assertEquals([...state.vessels.keys()], ["vessel-live"]);
  assertEquals([...state.asteroids.keys()], ["asteroid-live"]);
  assertEquals([...state.motherships.keys()], ["player-9"]);
  assertEquals(state.motherships.get("player-9")?.col, 10);
  assertEquals(
    [...state.modules.keys()].sort(),
    ["module-a", "module-command"],
  );
  assertEquals(state.notifications.size, 0);
});

Deno.test("shared singleton starts unloaded with new-player defaults", () => {
  assertEquals(gameState.player, { id: "player-1", name: "Player 1" });
  assertEquals(gameState.resources, ZERO_RESOURCES);
  // No hardcoded placements: the world is empty until a snapshot lands.
  assertEquals(gameState.motherships.size, 0);
  assertEquals(gameState.vessels.size, 0);
  assertEquals(gameState.asteroids.size, 0);
  assertEquals(gameState.modules.size, 0);
  assertEquals(gameState.notifications.size, 0);
  assertEquals(gameState.crew, 0);
  assertEquals(gameState.pendingHire, null);
  assertEquals(gameState.mapWindow, null);
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

Deno.test("applyServerPush routes each variant to the right table", () => {
  const state = new GameState();
  let notified = 0;
  state.subscribe(() => notified++);

  state.applyServerPush({
    type: "resources",
    data: { construction: 7, highTech: 1, biological: 2, fuel: 3, credits: 4 },
  });
  assertEquals(state.resources.construction, 7);

  state.applyServerPush({ type: "module", data: sampleModule("module-a") });
  assertEquals(state.modules.get("module-a"), sampleModule("module-a"));

  state.applyVesselEvent(sampleVessel("vessel-a"));
  state.applyServerPush({
    type: "vesselRemoved",
    data: { vesselId: "vessel-a" },
  });
  assertEquals(state.vessels.size, 0);
  // Removing an unknown vessel (already gone locally) is a harmless no-op.
  state.applyServerPush({
    type: "vesselRemoved",
    data: { vesselId: "vessel-a" },
  });

  // A server-initiated vessel move (the mining auto-return) merges like a
  // command response.
  const returning = sampleVessel("vessel-b", {
    returning: true,
    cargo: { resource: "biological", amount: 120 },
  });
  state.applyServerPush({ type: "vessel", data: returning });
  assertEquals(state.vessels.get("vessel-b"), returning);

  state.applyServerPush({
    type: "asteroid",
    data: sampleAsteroid("asteroid-1", {
      remaining: 120,
      mining: { vesselId: "vessel-b", startedAt: 1_000, completesAt: 5_000 },
    }),
  });
  assertEquals(state.asteroids.get("asteroid-1")?.remaining, 120);

  state.applyServerPush({
    type: "asteroidRemoved",
    data: { asteroidId: "asteroid-1" },
  });
  assertEquals(state.asteroids.size, 0);

  state.applyServerPush({
    type: "notification",
    data: sampleNotification("notif-1"),
  });
  assertEquals(
    state.notifications.get("notif-1"),
    sampleNotification("notif-1"),
  );

  // A recruitment completing lands crew state like a command response.
  state.applyServerPush({
    type: "crew",
    data: { crew: 3, pendingHire: null },
  });
  assertEquals(state.crew, 3);
  assertEquals(state.pendingHire, null);

  // The daily deal reset replaces the shop wholesale (ROADMAP P1.12).
  state.applyServerPush({ type: "deals", data: sampleDeals() });
  assertEquals(state.deals, sampleDeals());

  // One notify per push, plus one for the applyVesselEvent merge.
  assertEquals(notified, 11);
});

Deno.test("applyDealsEvent replaces the shop state and notifies", () => {
  const state = new GameState();
  let notified = 0;
  state.subscribe(() => notified++);

  // An accept response: the same batch with one deal flipped to accepted.
  state.applyDealsEvent(sampleDeals());
  const accepted = sampleDeals();
  accepted.deals[0].accepted = true;
  state.applyDealsEvent(accepted);

  assertEquals(state.deals.deals[0].accepted, true);
  assertEquals(state.deals.deals[1].accepted, true);
  assertEquals(state.deals.refreshesUsed, 1);
  assertEquals(notified, 2);
});

Deno.test("applyCrewEvent replaces the crew state and notifies", () => {
  const state = new GameState();
  let notified = 0;
  state.subscribe(() => notified++);

  // A hire response: the head count is unchanged, a recruitment pends.
  state.applyCrewEvent({
    crew: 2,
    pendingHire: { dispatchedAt: 1_000, completesAt: 31_000 },
  });
  assertEquals(state.crew, 2);
  assertEquals(state.pendingHire?.completesAt, 31_000);

  // The completion push: one more head, nothing pending — re-applying the
  // full-snapshot payload is idempotent.
  const completed = { crew: 3, pendingHire: null };
  state.applyCrewEvent(completed);
  state.applyCrewEvent(completed);
  assertEquals(state.crew, 3);
  assertEquals(state.pendingHire, null);
  assertEquals(notified, 3);
});

Deno.test("applyAsteroidEvent merges by asteroidId and notifies", () => {
  const state = new GameState();
  let notified = 0;
  state.subscribe(() => notified++);

  state.applyAsteroidEvent(sampleAsteroid("asteroid-1"));
  state.applyAsteroidEvent(sampleAsteroid("asteroid-2"));
  // A harvest re-stamps the same asteroid with a reduced deposit: replace,
  // not append.
  const harvested = sampleAsteroid("asteroid-1", { remaining: 60 });
  state.applyAsteroidEvent(harvested);

  assertEquals(state.asteroids.size, 2);
  assertEquals(state.asteroids.get("asteroid-1"), harvested);
  assertEquals(notified, 3);
});

Deno.test("unreadNotificationCount counts only unread entries", () => {
  const state = new GameState();
  assertEquals(state.unreadNotificationCount(), 0);

  state.applyServerPush({
    type: "notification",
    data: sampleNotification("notif-1"),
  });
  state.applyServerPush({
    type: "notification",
    data: sampleNotification("notif-2", {
      kind: "vessel-arrived",
      message: "Vessel arrived at (50, 60)",
    }),
  });
  state.applyServerPush({
    type: "notification",
    data: sampleNotification("notif-3", { read: true }),
  });
  assertEquals(state.unreadNotificationCount(), 2);

  // A re-pushed entry replaces by id — never a duplicate feed line.
  state.applyServerPush({
    type: "notification",
    data: sampleNotification("notif-1", { read: true }),
  });
  assertEquals(state.notifications.size, 3);
  assertEquals(state.unreadNotificationCount(), 1);
});

Deno.test("syncNotifications replaces the feed wholesale and notifies", () => {
  const state = new GameState();
  state.applyServerPush({
    type: "notification",
    data: sampleNotification("notif-1"),
  });
  let notified = 0;
  state.subscribe(() => notified++);

  // The mark_notifications_read response: everything read.
  state.syncNotifications([
    sampleNotification("notif-1", { read: true }),
    sampleNotification("notif-2", { read: true }),
  ]);

  assertEquals(state.notifications.size, 2);
  assertEquals(state.unreadNotificationCount(), 0);
  assertEquals(notified, 1);
});
