import { assert, assertEquals } from "@std/assert";

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
  Revisioned,
  ServerPush,
  VesselMoveEvent,
} from "../src/state/game-state.ts";
import { sampleBalance } from "./balance_fixture.ts";

function revisioned<T>(data: T, revision = 1): Revisioned<T> {
  return { revision, data };
}

function serverPush(data: ServerPush, revision = 1): Revisioned<ServerPush> {
  return revisioned(data, revision);
}

const ZERO_RESOURCES: ResourceCounts = {
  construction: 0,
  highTech: 0,
  biological: 0,
  fuel: 0,
  credits: 0,
};

const SAMPLE_BALANCE = sampleBalance();

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
    shipType: "mothership-1",
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
    eventId: `event-${id}`,
    vesselId: id,
    ownerId: "player-1",
    ownerName: "Player 1",
    mothershipId: "player-1",
    vesselType: "vessel-1",
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
    arrivalSettled: false,
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
  overrides: Partial<Extract<NotificationData, { kind: "module-completed" }>> =
    {},
): NotificationData {
  return {
    notificationId: id,
    sourceEventId: `event-${id}`,
    kind: "module-completed",
    moduleId: "module-ore-refinery",
    moduleType: "ore-refinery",
    level: 1,
    operation: "build",
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

  state.load(revisioned({
    balance: SAMPLE_BALANCE,
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
    crew: {
      crew: 3,
      pendingHire: {
        actionId: "event-hire",
        dispatchedAt: 500,
        completesAt: 30_500,
      },
      assignments: [],
    },
    deals: sampleDeals(),
  }));

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
    actionId: "event-hire",
    dispatchedAt: 500,
    completesAt: 30_500,
  });
  assertEquals(state.deals, sampleDeals());
  assert(state.loaded);
  assertEquals(notified, 1);
});

Deno.test("pushes apply before a snapshot but not while suspended", () => {
  const state = new GameState();
  // Deliberately NOT gated on `loaded`: the push listener subscribes before
  // the snapshot is requested so nothing emitted in between is missed, and
  // load() reconciles per entity by revision.
  assert(!state.loaded);
  state.applyServerPush(revisioned({
    type: "resources",
    data: { ...ZERO_RESOURCES, construction: 9 },
  }, 5));
  assertEquals(state.resources.construction, 9);

  // Suspended is the narrower guard: a load has definitively failed, so
  // there is no baseline to reconcile against and no catalog to render with.
  state.suspended = true;
  state.applyServerPush(revisioned({
    type: "resources",
    data: { ...ZERO_RESOURCES, construction: 99 },
  }, 6));
  assertEquals(state.resources.construction, 9);

  // A recovered load lifts it and the channel resumes.
  state.suspended = false;
  state.applyServerPush(revisioned({
    type: "resources",
    data: { ...ZERO_RESOURCES, construction: 42 },
  }, 7));
  assertEquals(state.resources.construction, 42);
});

Deno.test("applyMapWindow replaces the world tables and window, notifies", () => {
  const state = new GameState();
  state.load(revisioned({
    balance: SAMPLE_BALANCE,
    player: { id: "player-1", name: "Player 1" },
    resources: { ...ZERO_RESOURCES, construction: 7 },
    mapWindow: sampleWindow(),
    motherships: [sampleMothership("player-1")],
    asteroids: [sampleAsteroid("asteroid-old")],
    vessels: [sampleVessel("vessel-own")],
    modules: [sampleModule("module-command")],
    notifications: [sampleNotification("notif-1")],
    crew: { crew: 2, pendingHire: null, assignments: [] },
    deals: sampleDeals(),
  }));
  let notified = 0;
  state.subscribe(() => notified++);

  // The camera panned: a re-centered window response replaces the world
  // tables wholesale — entities that left the window unload.
  state.applyMapWindow(revisioned({
    window: sampleWindow({ centerCol: 500, centerRow: 500 }),
    motherships: [
      sampleMothership("player-1"),
      sampleMothership("player-2", { col: 503, row: 499 }),
    ],
    asteroids: [sampleAsteroid("asteroid-new", { col: 480, row: 520 })],
    vessels: [sampleVessel("vessel-own")],
  }, 2));

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

  state.applyVesselEvent(revisioned(sampleVessel("vessel-a")));
  state.applyVesselEvent(revisioned(sampleVessel("vessel-b")));
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
  state.applyVesselEvent(revisioned(recall));

  assertEquals(state.vessels.size, 2);
  assertEquals(state.vessels.get("vessel-a"), recall);
  assertEquals(notified, 3);
});

Deno.test("applyModuleEvent merges by moduleId and notifies", () => {
  const state = new GameState();
  let notified = 0;
  state.subscribe(() => notified++);

  state.applyModuleEvent(revisioned(sampleModule("module-command")));
  state.applyModuleEvent(revisioned(sampleModule("module-a")));
  // A level-up re-stamps the same module with a pending build: replace, not
  // append.
  const leveledUp = sampleModule("module-a", {
    pending: {
      actionId: "event-module",
      level: 2,
      dispatchedAt: 1_000,
      completesAt: 6_000,
    },
  });
  state.applyModuleEvent(revisioned(leveledUp));

  assertEquals(state.modules.size, 2);
  assertEquals(state.modules.get("module-a"), leveledUp);
  assertEquals(notified, 3);
});

Deno.test("load replaces the vessel, mothership, and module tables wholesale", () => {
  const state = new GameState();
  state.applyVesselEvent(revisioned(sampleVessel("vessel-docked"), 0));
  state.load(revisioned({
    balance: SAMPLE_BALANCE,
    player: { id: "player-1", name: "Player 1" },
    resources: ZERO_RESOURCES,
    mapWindow: sampleWindow(),
    motherships: [sampleMothership("player-1")],
    asteroids: [sampleAsteroid("asteroid-old")],
    vessels: [],
    modules: [sampleModule("module-command")],
    notifications: [sampleNotification("notif-old")],
    crew: { crew: 2, pendingHire: null, assignments: [] },
    deals: sampleDeals(),
  }, 1));

  state.load(revisioned({
    balance: SAMPLE_BALANCE,
    player: { id: "player-1", name: "Player 1" },
    resources: ZERO_RESOURCES,
    mapWindow: sampleWindow({ centerCol: 12, centerRow: 14 }),
    motherships: [sampleMothership("player-9", { col: 10, row: 12 })],
    asteroids: [sampleAsteroid("asteroid-live")],
    vessels: [sampleVessel("vessel-live")],
    modules: [sampleModule("module-command"), sampleModule("module-a")],
    notifications: [],
    crew: { crew: 2, pendingHire: null, assignments: [] },
    deals: sampleDeals({ refreshesUsed: 0 }),
  }, 2));

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
  state.syncResources(revisioned(snapshot));

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

  state.applyServerPush(serverPush({
    type: "resources",
    data: { construction: 7, highTech: 1, biological: 2, fuel: 3, credits: 4 },
  }));
  assertEquals(state.resources.construction, 7);

  state.applyServerPush(serverPush({
    type: "module",
    data: sampleModule("module-a"),
  }));
  assertEquals(state.modules.get("module-a"), sampleModule("module-a"));

  state.applyVesselEvent(revisioned(sampleVessel("vessel-a")));
  state.applyServerPush(serverPush({
    type: "vesselRemoved",
    data: { vesselId: "vessel-a" },
  }));
  assertEquals(state.vessels.size, 0);
  // Removing an unknown vessel (already gone locally) is a harmless no-op.
  state.applyServerPush(serverPush({
    type: "vesselRemoved",
    data: { vesselId: "vessel-a" },
  }));

  // A server-initiated vessel move (the mining auto-return) merges like a
  // command response.
  const returning = sampleVessel("vessel-b", {
    returning: true,
    cargo: { resource: "biological", amount: 120 },
  });
  state.applyServerPush(serverPush({ type: "vessel", data: returning }));
  assertEquals(state.vessels.get("vessel-b"), returning);

  state.applyServerPush(serverPush({
    type: "asteroid",
    data: sampleAsteroid("asteroid-1", {
      remaining: 120,
      mining: {
        actionId: "event-mine",
        vesselId: "vessel-b",
        startedAt: 1_000,
        completesAt: 5_000,
      },
    }),
  }));
  assertEquals(state.asteroids.get("asteroid-1")?.remaining, 120);

  state.applyServerPush(serverPush({
    type: "asteroidRemoved",
    data: { asteroidId: "asteroid-1" },
  }));
  assertEquals(state.asteroids.size, 0);

  state.applyServerPush(serverPush({
    type: "notification",
    data: sampleNotification("notif-1"),
  }));
  assertEquals(
    state.notifications.get("notif-1"),
    sampleNotification("notif-1"),
  );

  // A recruitment completing lands crew state like a command response.
  state.applyServerPush(serverPush({
    type: "crew",
    data: { crew: 3, pendingHire: null, assignments: [] },
  }));
  assertEquals(state.crew, 3);
  assertEquals(state.pendingHire, null);

  // The daily deal reset replaces the shop wholesale (ROADMAP P1.12).
  state.applyServerPush(serverPush({ type: "deals", data: sampleDeals() }));
  assertEquals(state.deals, sampleDeals());

  // One notify per push, plus one for the applyVesselEvent merge.
  assertEquals(notified, 11);
});

Deno.test("older pushes cannot roll back a newer authoritative slice", () => {
  const state = new GameState();
  let notified = 0;
  state.subscribe(() => notified++);

  state.applyServerPush(serverPush({
    type: "resources",
    data: { ...ZERO_RESOURCES, construction: 20 },
  }, 20));
  state.applyServerPush(serverPush({
    type: "resources",
    data: { ...ZERO_RESOURCES, construction: 10 },
  }, 10));

  assertEquals(state.resources.construction, 20);
  assertEquals(state.latestRevision, 20);
  assertEquals(notified, 1);
});

Deno.test("late responses preserve newer pushes without losing unrelated data", () => {
  const state = new GameState();

  // A completion push wins over the older command response for that entity.
  const completed = sampleModule("module-a", { level: 2, pending: null });
  state.applyServerPush(serverPush({ type: "module", data: completed }, 12));
  state.applyModuleEvent(revisioned(
    sampleModule("module-a", {
      level: 1,
      pending: {
        actionId: "event-module",
        level: 2,
        dispatchedAt: 1_000,
        completesAt: 2_000,
      },
    }),
    11,
  ));
  assertEquals(state.modules.get("module-a"), completed);

  // A newer, unrelated resource push does not suppress useful vessel data
  // from an older response: revisions are compared per slice/entity.
  state.applyServerPush(serverPush({
    type: "resources",
    data: { ...ZERO_RESOURCES, fuel: 90 },
  }, 14));
  state.applyVesselEvent(revisioned(sampleVessel("vessel-a"), 13));
  assertEquals(state.vessels.get("vessel-a"), sampleVessel("vessel-a"));

  // A newer removal tombstone survives a late whole-window response, while
  // the response still supplies its window and unrelated entities.
  state.applyServerPush(serverPush({
    type: "asteroidRemoved",
    data: { asteroidId: "asteroid-gone" },
  }, 16));
  state.applyMapWindow(revisioned({
    window: sampleWindow({ centerCol: 500, centerRow: 500 }),
    motherships: [sampleMothership("player-2")],
    asteroids: [
      sampleAsteroid("asteroid-gone"),
      sampleAsteroid("asteroid-live"),
    ],
    vessels: [],
  }, 15));
  assertEquals(state.asteroids.has("asteroid-gone"), false);
  assertEquals(state.asteroids.has("asteroid-live"), true);
  assertEquals(state.motherships.has("player-2"), true);
  assertEquals(state.mapWindow?.centerCol, 500);
  assertEquals(state.latestRevision, 16);
});

Deno.test("applyDealsEvent replaces the shop state and notifies", () => {
  const state = new GameState();
  let notified = 0;
  state.subscribe(() => notified++);

  // An accept response: the same batch with one deal flipped to accepted.
  state.applyDealsEvent(revisioned(sampleDeals()));
  const accepted = sampleDeals();
  accepted.deals[0].accepted = true;
  state.applyDealsEvent(revisioned(accepted));

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
  state.applyCrewEvent(revisioned({
    crew: 2,
    pendingHire: {
      actionId: "event-hire",
      dispatchedAt: 1_000,
      completesAt: 31_000,
    },
    assignments: [{ moduleId: "module-refinery", assigned: 1, required: 2 }],
  }));
  assertEquals(state.crew, 2);
  assertEquals(state.pendingHire?.completesAt, 31_000);
  assertEquals(state.crewAssignments.get("module-refinery"), {
    moduleId: "module-refinery",
    assigned: 1,
    required: 2,
  });

  // The completion push: one more head, nothing pending — re-applying the
  // full-snapshot payload is idempotent.
  const completed = {
    crew: 3,
    pendingHire: null,
    assignments: [{ moduleId: "module-refinery", assigned: 2, required: 2 }],
  };
  state.applyCrewEvent(revisioned(completed));
  state.applyCrewEvent(revisioned(completed));
  assertEquals(state.crew, 3);
  assertEquals(state.pendingHire, null);
  assertEquals(state.crewAssignments.get("module-refinery")?.assigned, 2);
  assertEquals(notified, 3);
});

Deno.test("applyAsteroidEvent merges by asteroidId and notifies", () => {
  const state = new GameState();
  let notified = 0;
  state.subscribe(() => notified++);

  state.applyAsteroidEvent(revisioned(sampleAsteroid("asteroid-1")));
  state.applyAsteroidEvent(revisioned(sampleAsteroid("asteroid-2")));
  // A harvest re-stamps the same asteroid with a reduced deposit: replace,
  // not append.
  const harvested = sampleAsteroid("asteroid-1", { remaining: 60 });
  state.applyAsteroidEvent(revisioned(harvested));

  assertEquals(state.asteroids.size, 2);
  assertEquals(state.asteroids.get("asteroid-1"), harvested);
  assertEquals(notified, 3);
});

Deno.test("unreadNotificationCount counts only unread entries", () => {
  const state = new GameState();
  assertEquals(state.unreadNotificationCount(), 0);

  state.applyServerPush(serverPush({
    type: "notification",
    data: sampleNotification("notif-1"),
  }));
  state.applyServerPush(serverPush({
    type: "notification",
    data: sampleNotification("notif-2"),
  }));
  state.applyServerPush(serverPush({
    type: "notification",
    data: sampleNotification("notif-3", { read: true }),
  }));
  assertEquals(state.unreadNotificationCount(), 2);

  // A re-pushed entry replaces by id — never a duplicate feed line.
  state.applyServerPush(serverPush({
    type: "notification",
    data: sampleNotification("notif-1", { read: true }),
  }));
  assertEquals(state.notifications.size, 3);
  assertEquals(state.unreadNotificationCount(), 1);
});

Deno.test("notification pushes evict the oldest entry past the 100 cap", () => {
  const state = new GameState();

  for (let i = 0; i < 100; i++) {
    state.applyServerPush(serverPush({
      type: "notification",
      data: sampleNotification(`notif-${i}`, { createdAt: 1_000 + i }),
    }));
  }
  assertEquals(state.notifications.size, 100);
  assertEquals(state.notifications.has("notif-0"), true);

  // One more push past the cap evicts the single oldest entry (by
  // createdAt) — mirrors the backend's MAX_NOTIFICATIONS eviction
  // (game_state/state.rs) since no removal push exists for notifications
  // (CR1.2).
  state.applyServerPush(serverPush({
    type: "notification",
    data: sampleNotification("notif-100", { createdAt: 1_100 }),
  }));
  assertEquals(state.notifications.size, 100);
  assertEquals(state.notifications.has("notif-0"), false);
  assertEquals(state.notifications.has("notif-1"), true);
  assertEquals(state.notifications.has("notif-100"), true);
});

Deno.test("subscribeToNotifications fires once per fresh push, never for a replay or backlog", () => {
  const state = new GameState();
  const seen: string[] = [];
  const unsubscribe = state.subscribeToNotifications((n) =>
    seen.push(n.notificationId)
  );

  // load()'s backlog must not fire the listener (it would flood the toast
  // layer for a returning player's unread feed).
  state.load(revisioned({
    balance: SAMPLE_BALANCE,
    player: { id: "player-42", name: "Loaded Player" },
    resources: ZERO_RESOURCES,
    mapWindow: sampleWindow(),
    motherships: [],
    asteroids: [],
    vessels: [],
    modules: [],
    notifications: [sampleNotification("notif-backlog")],
    crew: { crew: 0, pendingHire: null, assignments: [] },
    deals: sampleDeals(),
  }));
  assertEquals(seen, []);

  // A fresh push fires the listener exactly once.
  state.applyServerPush(serverPush({
    type: "notification",
    data: sampleNotification("notif-1"),
  }, 2));
  assertEquals(seen, ["notif-1"]);

  // A replay still updates the feed but must not surface a duplicate toast.
  state.applyServerPush(serverPush({
    type: "notification",
    data: sampleNotification("notif-1", { read: true }),
  }, 2));
  assertEquals(state.notifications.get("notif-1")?.read, true);
  assertEquals(seen, ["notif-1"]);

  // syncNotifications()'s backlog (mark_notifications_read) must not fire it
  // either.
  state.syncNotifications(revisioned([
    sampleNotification("notif-backlog", { read: true }),
    sampleNotification("notif-1", { read: true }),
  ], 3));
  assertEquals(seen, ["notif-1"]);

  // Unsubscribing stops further delivery.
  unsubscribe();
  state.applyServerPush(serverPush({
    type: "notification",
    data: sampleNotification("notif-2"),
  }, 4));
  assertEquals(seen, ["notif-1"]);
});

Deno.test("syncNotifications replaces the feed wholesale and notifies", () => {
  const state = new GameState();
  state.applyServerPush(serverPush({
    type: "notification",
    data: sampleNotification("notif-1"),
  }));
  let notified = 0;
  state.subscribe(() => notified++);

  // The mark_notifications_read response: everything read.
  state.syncNotifications(revisioned([
    sampleNotification("notif-1", { read: true }),
    sampleNotification("notif-2", { read: true }),
  ], 2));

  assertEquals(state.notifications.size, 2);
  assertEquals(state.unreadNotificationCount(), 0);
  assertEquals(notified, 1);
});
