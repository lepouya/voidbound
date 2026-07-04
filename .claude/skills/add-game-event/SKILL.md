---
name: add-game-event
description: Implement a new game action using the multiplayer-ready event pattern (event interface + apply*Event method). Use whenever adding any action that mutates game state — vessel dispatch, module construction, resource transfer, combat action, alliance ops, etc.
---

# Multiplayer-ready game event pattern

**Rule:** Every action that will eventually be server-authoritative must be
modeled as an event struct from day one — even while running locally. This keeps
local and networked code paths identical, so when the server lands later, the
only change is the event source (local vs. socket push).

The pattern has three parts:

1. An **event interface** — plain data, everything a server would send.
2. An `apply<Action>Event(event)` **method** — consumes the event and mutates
   scene state. This is the entry point for both local actions and future
   server-pushed events.
3. A **local action method** that constructs the event and calls
   `apply<Action>Event` directly.

## 1. Define the event interface

Place the interface at the top of the scene file that owns the action.

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

- Reading local context (positions, selected actor, …)
- Constructing the event with `crypto.randomUUID()` for new IDs, `Date.now()`
  for `dispatchedAt`, and any server-style derived fields (`arrivalAt`, …)
- Calling `this.apply<Action>Event(event)` — NOT mutating scene state directly
- Handling post-action UI cleanup (deselect, suppress input, close menus)

```ts
private dispatchVessel(destCol: number, destRow: number): void {
  const dock = this.closestDockTile(destCol, destRow);
  const distPx = Math.hypot(
    (destCol - dock.col) * this.tilemap.tileWidth,
    (destRow - dock.row) * this.tilemap.tileHeight,
  );
  const now = Date.now();
  const event: VesselMoveEvent = {
    vesselId: crypto.randomUUID(),
    ownerId: "player-1",
    ownerName: "Player 1",
    mothershipId: "player-1",
    vesselType: "cs1",
    srcCol: dock.col,
    srcRow: dock.row,
    destCol,
    destRow,
    speed: this.vesselSpeed,
    dispatchedAt: now,
    arrivalAt: now + (distPx / this.vesselSpeed) * 1000,
  };
  this.applyVesselMoveEvent(event);

  // UI housekeeping — local only, NOT in applyVesselMoveEvent:
  this.deselectActor();
}
```

## Checklist before declaring done

- [ ] Event interface is `export`ed from the scene module.
- [ ] All fields a server would return are present (IDs, positions, timing).
- [ ] `apply*Event` is **public** and contains **zero** UI housekeeping.
- [ ] `apply*Event` handles the "entity already exists" case.
- [ ] Local action method constructs the event and calls `apply*Event`; does not
      touch scene state directly.
- [ ] `deno task fmt` passes (formats and type-checks).

## Reference

See `src/map-level.ts` for the canonical example: `VesselMoveEvent` +
`applyVesselMoveEvent` + `dispatchVessel` + `returnVessel`.
