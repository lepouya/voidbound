# Voidbound — Server Architecture Sketch

The intended server model behind the multiplayer-ready event pattern
(`AGENTS.md` § Conventions, `/add-game-event`). The in-process authoritative
state, snapshot, scheduler, and Tauri push channel are built; the durable event
log and network transport remain phase-3 work. This document keeps new event
shapes compatible with that destination. `VesselMoveEvent` (in
`src/state/game-state-types.ts`) / `gameState.applyVesselEvent()` is the
reference implementation of the client half, including the snapshot half:
`load_game_state` returns the active-vessel event list, and `VesselSync.sync()`
reconciles scene actors from it.

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
`VesselSync.sync()`).

## Request → event lifecycle

1. **Client sends an action request** — the _inputs_ to an action (e.g. "move
   vessel to col/row"), not the finished event. Locally today, the in-process
   Rust backend plays the server's role: action methods like `dispatchVessel`,
   `recallVessel`, and `buildModule` already send a request over Tauri IPC
   (`request_dispatch_vessel`, …), and `ServerState` verifies it and returns the
   authorized event. When the socket lands, only the transport and the broadcast
   fan-out change.
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
   is why `apply*Event` handles the "entity already exists" case). Locally
   today, the `server-push` Tauri event channel prototypes the bus: a backend
   scheduler thread settles time-based state (production ticks, build
   completions, vessel arrivals) as it comes due and emits `ServerPush` messages
   that `gameState.applyServerPush()` routes into these same entry points — see
   AGENTS.md § IPC / Rust backend.
5. **Clients apply** — `apply<Action>Event(event)` mutates shared game state;
   scene reconcilers render that state. UI housekeeping (deselect, close menus)
   stays in the local action method, so server-pushed events never fight with
   local input state.

## Time: clients never trust `Date.now()`

All event timestamps are server epoch ms. On connect, the client performs a
**server-time-offset handshake** (a ping/pong measuring round-trip and clock
delta) and maintains `serverNow() = Date.now() + offset`. Every place the client
compares "now" against event timestamps — the late-join lerp in
`VesselSync.sync()`, build-timer progress bars, cooldown displays — must use
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
  Clients apply in sequence order; a gap means "resync from snapshot". The
  in-process prototype stamps every snapshot, command response, and scheduler
  push batch with a global monotonic `revision` while holding the state lock
  (`Revisioned<T>` in `game_state/state.rs`). Emits may still interleave after
  the lock is released, so `GameState` compares that token per state slice and
  per entity, retaining newer entity updates/removal tombstones when an older
  full response arrives. A socket implementation should preserve the same
  append-time ordering token and add gap detection/resync once delivery is a
  real stream; do not replace it with emit-time ordering.
- **Idempotency**: event IDs are unique; applying the same event twice must be a
  no-op or a keyed replacement (the `applyVesselEvent` merge is the pattern).
- **Persistence** (ROADMAP phase 2) is a local prototype of the same idea: the
  save file is a versioned full-system snapshot, not the client projection. The
  format maps forward to the server-side snapshot schema, but Phase 2 saves are
  developer-only and are never imported into an online account or world.

## Persistent state, sessions, and local development

Three shapes must remain distinct:

```text
PersistentSystem      all durable players + world entities + timers + counters
Runtime server state  scheduler/outbox/AOI/delivery machinery rebuilt on startup
Client projection     one player plus owned and in-window world entities
```

`GameStateData` is a client projection and must never become the save format.
Likewise, the in-process `ServerState` currently mixes durable state with
runtime fields, so Phase 2 serializes an explicit persistent DTO rather than
deriving `Serialize` for that type. Runtime-only outbox, dirty/coalescing state,
AOI subscriptions, and derived indexes are rebuilt after load.

Phase 2 has one local persistent system containing multiple developer players.
`--player <name>` selects a session identity at startup; names are trimmed,
matched case-insensitively, and created on first use. A session identity never
changes mid-run. The local process holds exclusive ownership of the save — no
attempt is made to synchronize two Tauri backends. Creating a player is an
atomic system mutation that adds their profile and a deterministic, in-bounds
mothership spawn clear of existing ships and asteroids.

`--time-scale <factor>` and `--restore-backup <1..5>` are development-only
startup controls. Time scale never reaches an online server or rewrites existing
deadlines; a run's scale affects only new local durations and live production
cadence. Five rolling local backup generations protect the whole system; a
restore rolls every local player back together.

## Time and offline settlement

The Phase 3 server scheduler runs while players are offline; reconnecting only
projects the already-settled state and its per-player feed. Phase 2 needs local
startup recovery instead. Its `advance_to(now)` processes the entire local
system, not just the selected player, in this deterministic same-timestamp
order:

1. Production boundary using pre-completion state.
2. Module completion.
3. Crew completion.
4. Outbound vessel arrival.
5. Mining completion.
6. Return-vessel arrival and cargo deposit.
7. Daily rollover.

Same-kind ties sort by stable action/entity ID. Phase 2 applies at most 24 hours
of offline progression, then permanently discards/re-anchors excess elapsed time
so repeated restarts cannot bypass the cap. It re-anchors unfinished timers with
their remaining simulated duration and moves daily state to the current UTC day
without replaying skipped rollovers. This cap is local-development behavior, not
an online anti-cheat mechanism.

## Action IDs, notifications, and delivery

Every authorized action and scheduler-created transition has an immutable action
or event ID. A per-player notification is a durable typed tagged-union payload
with its own feed ID and a `sourceEventId`; server-composed English is not wire
data. Entity/action completion state, rather than the bounded notification feed,
is the durable idempotency record — evicting old Mail entries must never replay
an arrival or completion.

The scheduler advances all players, but delivery is session/audience scoped. A
Player 1 completion while a local Player 2 session is active is appended to
Player 1's persisted feed and is not emitted as a Player 2 push, badge update,
or toast. On a later Player 1 load, the snapshot restores the feed and unread
badge; historical snapshot entries never replay transient toasts.

## Storage delivery path

Phase 2 uses a versioned JSON snapshot with validation, atomic writes, and
rolling backups. The local networked Phase 3 server uses embedded SQLite so it
starts with the Rust host and no separately installed database. Online
production uses PostgreSQL through configuration such as `DATABASE_URL`; the
game-domain model and persistence boundary, not a Phase 2 save import, bridge
the two.

Use relational state for players, memberships, modules, motherships, vessels,
asteroids, notifications, and AOI queries. Flexible typed payloads may use JSON
storage within that relational model. Each accepted action's transaction
verifies current state, appends its per-system event sequence, updates
materialized state, creates notifications, and records an outbox entry. DuckDB
is appropriate later for event/balance analysis, not the authoritative gameplay
store.

## Interest management (AOI)

A client never holds the whole world. The server keeps an **interest-area
window** per connection — today one in-process client, the `MapWindow` in
`ServerState::aoi` (`src-tauri/src/game_state/state.rs`), a 100\*100-tile square
— and filters both snapshot slices and entity pushes to it (ROADMAP P1.13):

- **Snapshots are windowed.** `load_game_state` (window re-centered on the
  player's mothership) and the `request_map_window` response return only
  in-window asteroids and foreign ships/vessels. Everything the player **owns is
  always sent** regardless of window — a mining vessel must keep existing beyond
  the edge; alliance entities join the exemption in P4.
- **Re-centering is client-driven, with hysteresis.** The client re-requests
  once its camera drifts more than a few tiles from the window center (never per
  frame) and replaces its world tables wholesale with the response, unloading
  everything that left the window. The response is authoritative for everything
  inside it — stale mining slots and deposits resolve on window re-entry, and no
  push is owed for out-of-window history.
- **Pushes are filtered at the drain boundary.** Entity pushes are tagged with a
  world footprint at queue time and dropped at outbox drain when they don't
  intersect the subscriber's window; own-entity and global pushes (resources,
  modules, notifications) carry no footprint and always go out. This is exactly
  the shape P3.1's per-connection subscriptions need: the drain loop gains a
  per-socket window instead of a single field.
- **The visible view stays strictly smaller than the window.** The client caps
  its zoom so the view never spans more tiles than the window minus the
  hysteresis margin — unloaded space can never scroll into sight. P4.3's fog of
  war is this same window shrunk to a radar radius.

## What this implies for new event interfaces

When writing a new `*Event` via `/add-game-event`, assume:

- Every field is something the **server** would compute or verify — if the
  client can lie about it, it doesn't belong in the event (send it in the
  request instead and let the server echo the verified value). This matters most
  for ROADMAP.md phase 5's combat events (P5.5): damage dealt, hit/miss, and
  remaining durability must all be server-computed, never client-declared —
  combat is the first genuinely adversarial user of this model, unlike
  cooperative actions like vessel movement.
- Timestamps are server epoch ms and time-based actions precompute their
  completion time.
- `apply*Event` will one day be called by a socket handler with no scene context
  beyond the event itself.
