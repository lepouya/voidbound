# Voidbound — Server Architecture Sketch

The intended server model behind the multiplayer-ready event pattern
(`CLAUDE.md` § Conventions, `/add-game-event`). Nothing here is built yet — this
exists so that every new `*Event` interface is written against the same model
and stays compatible when ROADMAP.md phase 3 lands. `VesselMoveEvent` /
`applyVesselMoveEvent` in `src/map-level.ts` is the reference implementation of
the client half.

## Model in one paragraph

The server owns an append-only **event log** per star system. Clients never
mutate shared state directly: they send **action requests**, the server
**verifies** them (ownership, resources, cooldowns, reachability), stamps them
with **authoritative timestamps**, appends them to the log, and **broadcasts**
the resulting event to every client in scope. Every client — including the one
that initiated the action — applies events through the same public
`apply<Action>Event()` entry points. A client that joins mid-game receives a
**snapshot** plus the log suffix since that snapshot, and replays it; because
events carry `dispatchedAt` / `completesAt`-style timestamps, replaying an aged
event lands the entity at its correct in-progress position (see the lerp in
`applyVesselMoveEvent`).

## Request → event lifecycle

1. **Client sends an action request** — the _inputs_ to an action (e.g. "move
   vessel to col/row"), not the finished event. Locally today, the private
   action method (e.g. `dispatchVessel`) plays the server's role: it builds the
   full event and applies it. When the socket lands, that method becomes "send
   request, wait for the broadcast".
2. **Server verifies** — the requester owns the entity, the action is legal
   (resources available, target in range, no conflicting in-flight action), and
   rate limits hold. Rejections return an error to the requester only.
3. **Server derives and stamps** — all server-computed fields are filled in
   here: event ID, `dispatchedAt` (server clock, epoch ms), precomputed
   completion times (`arrivalAt`, `completesAt`), and verified parameters like
   `speed`. Clients must treat these as facts, never recompute them.
4. **Append + broadcast** — the event goes into the log and out to every
   subscribed client over the WebSocket event bus. The initiating client gets no
   special-cased response; it applies the broadcast like everyone else (its
   local optimistic apply, if any, must be idempotent with the broadcast — which
   is why `apply*Event` handles the "entity already exists" case).
5. **Clients apply** — `apply<Action>Event(event)` mutates scene state only. UI
   housekeeping (deselect, close menus) stays in the local action method, so
   server-pushed events never fight with local input state.

## Time: clients never trust `Date.now()`

All event timestamps are server epoch ms. On connect, the client performs a
**server-time-offset handshake** (a ping/pong measuring round-trip and clock
delta) and maintains `serverNow() = Date.now() + offset`. Every place the client
compares "now" against event timestamps — the late-join lerp in
`applyVesselMoveEvent`, build-timer progress bars, cooldown displays — must use
`serverNow()`. This is why events precompute `arrivalAt` / `completesAt` on the
server instead of letting clients derive them: one authoritative clock, zero
disputes about when something finishes.

## Late join: snapshot + replay

A joining client receives:

1. A **snapshot** — current persistent state (map, motherships, modules,
   resources) as of log sequence number `N`.
2. The **log suffix** — all events with sequence `> N`, replayed in order
   through the normal `apply*Event` entry points.

For this to work, every event must be self-contained: `apply*Event` can
reconstruct the outcome from the event fields alone (IDs, source/destination,
amounts, timestamps) with no hidden local state — the required-field checklist
in `/add-game-event` exists to enforce exactly this. In-progress actions
(flights, builds) are replayed as aged events and interpolated to their current
progress, not fast-forwarded frame by frame.

## Scope and consistency

- **Event scope** is a star system (one season's world). Alliances and mail may
  later use separate narrower channels; game-state events stay on the system
  log.
- **Ordering** is total per log: sequence numbers, assigned at append time.
  Clients apply in sequence order; a gap means "resync from snapshot".
- **Idempotency**: event IDs are unique; applying the same event twice must be a
  no-op or a redirect (the existing-vessel redirect in `applyVesselMoveEvent` is
  the pattern).
- **Persistence** (ROADMAP phase 2) is a local prototype of the same idea: the
  save file is a snapshot, and the versioned format maps forward to the
  server-side snapshot schema.

## What this implies for new event interfaces

When writing a new `*Event` via `/add-game-event`, assume:

- Every field is something the **server** would compute or verify — if the
  client can lie about it, it doesn't belong in the event (send it in the
  request instead and let the server echo the verified value).
- Timestamps are server epoch ms and time-based actions precompute their
  completion time.
- `apply*Event` will one day be called by a socket handler with no scene context
  beyond the event itself.
