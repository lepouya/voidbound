---
name: add-game-event
description: Implement a new game action using the multiplayer-ready event pattern (event interface + apply*Event method). Use whenever adding any action that mutates game state — vessel dispatch, module construction, resource transfer, combat action, alliance ops, etc.
---

# Multiplayer-ready game event pattern

**Rule:** Every action that will eventually be server-authoritative must be
modeled as an event struct from day one — even while running locally. This keeps
local and networked code paths identical, so when the server lands later, the
only change is the event source (local vs. socket push).

See `SERVER.md` for the full server model this pattern targets — why fields must
be server-verifiable, why `apply*Event` must be idempotent (network redirects,
replay), and how timestamps drive late-join snapshot + replay.

The pattern has three parts (plus push-channel wiring — section 4 — whenever the
action creates a future deadline):

1. An **event interface** — plain data, everything a server would send.
2. An `apply<Action>Event(event)` **method** — consumes the event and mutates
   shared `gameState` (or local state for a truly scene-local action). This is
   the entry point for both command responses and future server-pushed events;
   scenes reconcile their actors from the resulting state.
3. A **local action method** that obtains the event — from the backend for
   server-verified actions, or by constructing it directly for purely local ones
   — and routes it into `apply<Action>Event`.

**Actions that touch resources or shared world state must be server-verified**
(never trust the client with resource math or with facts other players will
see): instead of constructing the event locally, the action method invokes a
Tauri command that verifies the request against `ServerState`
(`src-tauri/src/game_state/state.rs`, mutated via the owning domain module —
`modules.rs`, `world.rs`, `deals.rs`, `crew.rs`), and returns the authorized
event (for resource-touching actions, plus updated `ResourceCounts`, applied via
`gameState.syncResources`). Steps 1 and 2 are unchanged; the event interface
gains a Rust mirror struct (serde `rename_all = "camelCase"`) and the game rule
gets a `#[cfg(test)]` unit test. Canonical examples: `ModuleData` /
`request_build_module` / `request_levelup_module` (the self-snapshot payload
pattern — AGENTS.md § Multiplayer-ready event pattern) and `VesselMoveEvent` /
`request_dispatch_vessel` / `request_recall_vessel`. Constructing the event
locally (with `newEventId()` from `src/state/event-id.ts`) remains valid only
for actions with nothing to verify. No current action does this — every shipped
action is server-verified — but `newEventId()` is kept intentionally as the
escape hatch for the day one does; it is not dead code to remove.

**Every command-response interface** belongs in `src/state/game-state-types.ts`
as well, even when it only wraps a snapshot payload plus `ResourceCounts`;
import it through the `game-state.ts` re-export. This keeps Rust-mirrored wire
shapes pure and prevents one runtime feature module from becoming another
feature's type dependency. Examples: `ModuleActionResponse`,
`CrewActionResponse`, `DealActionResponse`, and `MothershipActionResponse`.

**Events that must survive scene switches or late joins** should also ride the
`load_game_state` snapshot: the backend records them in `ServerState`, the
snapshot returns the active list, the shared `gameState` holds the table and
merges command responses into it (`applyVesselEvent`), and the owning scene
reconciles its actors from the table on every notify plus a forced re-lerp in
`onActivate` (see `gameState.vessels` + `VesselSync.sync()`, invoked from
`MapLevel`). Such event interfaces live in `src/state/game-state-types.ts`
(re-exported by the pure `game-state.ts` barrel) instead of the scene file.

## 1. Define the event interface

Place the interface at the top of the scene file that owns the action — or in
`src/state/game-state-types.ts` when the event rides the `load_game_state`
snapshot (like `VesselMoveEvent`), since the pure shared-state module can't
import from scenes.

```ts
export interface <Action>Event {
  // --- Identity ---
  <entity>Id: string;         // e.g. vesselId, moduleId — UUID
  ownerId: string;            // player that owns the entity
  ownerName: string;          // display name

  // --- Action parameters (whatever the server would return) ---
  // e.g. srcCol, srcRow, destCol, destRow, speed, resourceType, amount, ...

  // --- Timing (critical for late-joining clients) ---
  dispatchedAt: number;       // server epoch ms when action was authorized
  completesAt?: number;       // pre-computed completion time, so late joiners
                              // can lerp to the current state without redoing
                              // the clock math locally
}
```

**Required-field checklist** (borrow from `VesselMoveEvent`):

- **IDs** — action ID, actor ID, owner ID. Unique enough that the server can
  route server-push events to the right scene/entity.
- **State deltas** — source/destination, amounts, target, etc. Enough that
  `apply*Event` can reconstruct the result without any hidden local state.
- **Timestamps** — `dispatchedAt` and (for time-based actions) `completesAt` or
  `arrivalAt`. A client that joins mid-action must be able to lerp to the
  current position/progress from just these two numbers.

## 2. Write the `apply*Event` method

- Must be **public** — the eventual server-push handler will call it directly.
- Must be **idempotent / redirect-safe** where possible: merge keyed entities by
  ID rather than appending duplicates (see `GameState.applyVesselEvent`).
- Only mutates shared/local data — does NOT deselect actors, suppress input, or
  do any UI housekeeping. Those belong in the local action method (step 3), not
  here. Server-pushed events must not fight with local input state.

```ts
applyVesselEvent(message: Revisioned<VesselMoveEvent>): void {
  const event = message.data;
  // GameState first rejects an older revision for this vesselId; then:
  this.update((state) => {
    state.vessels.set(event.vesselId, event);
  });
}
```

## 3. Write the local action method

This is the private method called by UI buttons, keyboard shortcuts, etc. It is
responsible for:

- Reading local context (positions, selected actor, …) — only the _inputs_ to
  the action; everything derivable belongs to the verifier
- Obtaining the authorized event: `await invoke(...)` for server-verified
  actions, or — for purely local ones — constructing it with `newEventId()`
  (src/state/event-id.ts) for new IDs, `Date.now()` for `dispatchedAt`, and any
  server-style derived fields (`arrivalAt`, …)
- Routing the event into `apply<Action>Event` — NOT mutating shared/scene state
  directly. Snapshot-riding events route via the shared-state merge
  (`gameState.applyVesselEvent`-style), which notifies the scene's reconciler
- Handling post-action UI cleanup (deselect, suppress input, close menus)

```ts
private async dispatchVessel(destCol: number, destRow: number): Promise<void> {
  // UI housekeeping — local only, NOT in applyVesselEvent:
  this.deselectActor();
  try {
    // The backend verifies the destination and derives dock, speed, and
    // arrival time; the returned event is authoritative.
    const event = await invoke<Revisioned<VesselMoveEvent>>(
      "request_dispatch_vessel",
      { destCol, destRow },
    );
    gameState.applyVesselEvent(event); // fans out to syncVessels → apply*Event
  } catch (err) {
    console.warn("request_dispatch_vessel rejected:", err);
    this.showToast(errorToast(`Dispatch failed: ${err}`));
  }
}
```

## 4. Wire the push channel (timed / scheduler-settled actions)

If the action creates a **future deadline** — a build `completesAt`, a vessel
`arrivalAt`, a mining window — the command response is only half the story: the
scheduler must settle the deadline later and broadcast the result. In
`src-tauri/src/game_state/`:

- **Settlement**: add (or extend) a `settle_*` method in the owning domain
  module and call it from `settle()` (`state.rs`); include the new deadline in
  `next_deadline()` (`state.rs`) so the scheduler thread (`run_scheduler`, in
  `scheduler.rs`) sleeps until it.
- **Broadcast**: settlement and mutation paths queue messages into the
  `ServerState` outbox (`self.outbox.push(ServerPush::...)`) — never emit
  directly. The boundaries (scheduler wake, `finish_command`) drain + emit, so
  every settlement path broadcasts identically.
- **Command epilogue**: every command gets the revision returned by
  `finish_command(&app, server.inner(), s)` and wraps its success payload in
  `Revisioned::new(revision, data)`. The epilogue stamps/drains the outbox,
  releases the lock, emits, and wakes the scheduler Condvar so a nearer deadline
  the command just created is picked up (e.g. a short vessel flight).
- **New push shape**: add a `ServerPush` variant and mirror it in the TS
  `ServerPush` union in `src/state/game-state-types.ts` (comments mark the pair
  — keep in sync). Pushes already ride `Revisioned<ServerPush>`; route the
  variant in `gameState.applyServerPush()` into the **same** apply/sync entry
  point the command response uses (`applyVesselEvent`, `applyModuleEvent`, …) so
  pushed and locally-triggered changes are indistinguishable to scenes.
- **Player-visible completions** get a typed
  `push_notification(source_event_id, payload, now_ms)` — it queues both the
  notification push and the snapshot-riding feed entry (capped at 100); the Mail
  HUD badge updates automatically. Add the matching Rust and TypeScript
  tagged-union member plus client formatter.
- **Tests**: extend the `#[cfg(test)]` suite — at minimum that `next_deadline()`
  tracks the new deadline and that settling drains the expected pushes (see
  `next_deadline_tracks_ticks_builds_and_arrivals`).

Canonical example: the mining loop — `request_mine_asteroid` + `settle_mining`
emitting `ServerPush::Asteroid` / `ServerPush::AsteroidRemoved` and the
auto-recall `ServerPush::Vessel`.

## Checklist before declaring done

- [ ] Event interface is `export`ed (scene module, or game-state-types.ts if it
      rides the snapshot).
- [ ] All fields a server would return are present (IDs, positions, timing).
- [ ] `apply*Event` is **public** and contains **zero** UI housekeeping.
- [ ] `apply*Event` handles the "entity already exists" case.
- [ ] Local action method obtains the event (invoke or local construction) and
      routes it through `apply*Event`; does not touch shared/scene state
      directly.
- [ ] Server-verified: Rust mirror struct + verifier on `ServerState` +
      `#[cfg(test)]` unit test; command registered in lib.rs.
- [ ] Timed actions: deadline in `next_deadline()`, settlement queues outbox
      pushes, command ends with `finish_command`; TS `ServerPush` union +
      `applyServerPush` routing updated (section 4).
- [ ] Catalog data (if the action reads costs/rates/thresholds a player should
      see before committing — a build cost, a mining rate, a refresh price):
      Rust is the source of truth and applies the rule; the client only previews
      it. **Prefer sending the values over the wire** rather than hand-copying
      them: `load_game_state`'s versioned `balance` payload
      (`balance_catalog_data` in game_state/balance.rs → `applyBalanceCatalog`
      in src/state/balance-catalog.ts) is the template — add the field there,
      bump `schemaVersion`, and validate it client-side before install. ROADMAP
      P2.6 moved the module and asteroid catalogs onto this path precisely
      because hand-synced copies meant editing every balance number twice, with
      only review to catch a miss.

      A hand-synced mirror is still acceptable for values the UI styles rather
      than computes (`src/ship/trade-catalog.ts` ↔ game_state/deals.rs is one
      example). If you write one, put it in a **pure module** (no
      Excalibur/Vite imports, unit-tested under plain `deno test`), give every
      field a `// keep the two in sync` comment naming the exact Rust constant
      and file, and diff them field-by-field before finishing — there is no
      automated cross-language check.

      Where a client preview must reproduce a server *calculation* exactly
      (the P2.6 cost/production curves), the wire carries parameters, not
      results — so pin the two implementations with **matched tests that name
      each other**, as `production_follows_a_true_compounding_curve...` and
      "the production curve mirrors the server's compounding sequence" do.
- [ ] `deno task format`, `deno task check`, and `deno task lint` pass.
- [ ] Run **`/verify`** and drive the new action in the dev app — there is no
      scene-level test coverage, so the running app is the only end-to-end
      check.

## Reference

See the canonical examples: `VesselMoveEvent` (src/state/game-state-types.ts) /
`applyVesselEvent` (src/state/game-state.ts) + `VesselSync.sync` / `.dispatch` /
`.recall` (src/map/map-vessels.ts) + `request_dispatch_vessel` /
`request_recall_vessel` (src-tauri/src/game_state/world.rs, exposed via
commands.rs); and, for a timed scheduler-settled action, `AsteroidSync.mine`
(src/map/map-asteroids.ts) + `request_mine_asteroid` / `settle_mining`
(game_state/world.rs). See `SERVER.md` for the architecture this pattern is
written against.
