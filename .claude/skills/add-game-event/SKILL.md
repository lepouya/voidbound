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

The pattern has three parts:

1. An **event interface** — plain data, everything a server would send.
2. An `apply<Action>Event(event)` **method** — consumes the event and mutates
   scene state. This is the entry point for both local actions and future
   server-pushed events.
3. A **local action method** that obtains the event — from the backend for
   server-verified actions, or by constructing it directly for purely local ones
   — and routes it into `apply<Action>Event`.

**Actions that touch resources or shared world state must be server-verified**
(never trust the client with resource math or with facts other players will
see): instead of constructing the event locally, the action method invokes a
Tauri command that verifies the request against `ServerState` in
`src-tauri/src/game_state.rs`, mutates state there, and returns the authorized
event (for resource-touching actions, plus updated `ResourceCounts`, applied via
`gameState.syncResources`). Steps 1 and 2 are unchanged; the event interface
gains a Rust mirror struct (serde `rename_all = "camelCase"`) and the game rule
gets a `#[cfg(test)]` unit test. Canonical examples: `BuildModuleEvent` /
`request_build_module` and `VesselMoveEvent` / `request_dispatch_vessel` /
`request_recall_vessel`. Constructing the event locally (with `newEventId()`
from `src/event-id.ts`) remains valid only for actions with nothing to verify.

**Events that must survive scene switches or late joins** should also ride the
`load_game_state` snapshot: the backend records them in `ServerState`, the
snapshot returns the active list, the shared `gameState` holds the table and
merges command responses into it (`applyVesselEvent`), and the owning scene
reconciles its actors from the table on every notify plus a forced re-lerp in
`onActivate` (see `gameState.vessels` + `MapLevel.syncVessels()`). Such event
interfaces live in `src/game-state.ts` (pure module) instead of the scene file.

## 1. Define the event interface

Place the interface at the top of the scene file that owns the action — or in
`src/game-state.ts` when the event rides the `load_game_state` snapshot (like
`VesselMoveEvent`), since the pure shared-state module can't import from scenes.

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
- Must be **idempotent / redirect-safe** where possible: check for an existing
  entity first and update it rather than duplicating (see `applyVesselMoveEvent`
  redirecting an existing vessel).
- Only mutates scene state — does NOT deselect actors, suppress input, or do any
  UI housekeeping. Those belong in the local action method (step 3), not here.
  Server-pushed events must not fight with local input state.

```ts
applyVesselMoveEvent(event: VesselMoveEvent): void {
  const existing = this.vessels.get(event.vesselId);
  if (existing) {
    existing.moveTo(event.destCol, event.destRow, event.speed);
    return;
  }

  const vessel = new TileActor({ /* ... */ });
  this.vessels.set(event.vesselId, vessel);
  this.add(vessel);
  vessel.moveTo(event.destCol, event.destRow, event.speed);
}
```

## 3. Write the local action method

This is the private method called by UI buttons, keyboard shortcuts, etc. It is
responsible for:

- Reading local context (positions, selected actor, …) — only the _inputs_ to
  the action; everything derivable belongs to the verifier
- Obtaining the authorized event: `await invoke(...)` for server-verified
  actions, or — for purely local ones — constructing it with `newEventId()`
  (src/event-id.ts) for new IDs, `Date.now()` for `dispatchedAt`, and any
  server-style derived fields (`arrivalAt`, …)
- Routing the event into `apply<Action>Event` — NOT mutating scene state
  directly. Snapshot-riding events route via the shared-state merge
  (`gameState.applyVesselEvent`-style), which notifies the scene's reconciler
- Handling post-action UI cleanup (deselect, suppress input, close menus)

```ts
private async dispatchVessel(destCol: number, destRow: number): Promise<void> {
  // UI housekeeping — local only, NOT in applyVesselMoveEvent:
  this.deselectActor();
  try {
    // The backend verifies the destination and derives dock, speed, and
    // arrival time; the returned event is authoritative.
    const event = await invoke<VesselMoveEvent>("request_dispatch_vessel", {
      destCol,
      destRow,
    });
    gameState.applyVesselEvent(event); // fans out to syncVessels → apply*Event
  } catch (err) {
    console.warn("request_dispatch_vessel rejected:", err);
  }
}
```

## Checklist before declaring done

- [ ] Event interface is `export`ed (scene module, or game-state.ts if it rides
      the snapshot).
- [ ] All fields a server would return are present (IDs, positions, timing).
- [ ] `apply*Event` is **public** and contains **zero** UI housekeeping.
- [ ] `apply*Event` handles the "entity already exists" case.
- [ ] Local action method obtains the event (invoke or local construction) and
      routes it through `apply*Event`; does not touch scene state directly.
- [ ] Server-verified: Rust mirror struct + verifier on `ServerState` +
      `#[cfg(test)]` unit test; command registered in lib.rs.
- [ ] `deno task fmt` passes (formats and type-checks).

## Reference

See the canonical example: `VesselMoveEvent` (src/game-state.ts) +
`applyVesselMoveEvent` / `syncVessels` / `dispatchVessel` / `recallVessel`
(src/map-level.ts) + `dispatch_vessel` / `recall_vessel`
(src-tauri/src/game_state.rs). See `SERVER.md` for the architecture this pattern
is written against.
