# Phase 2 Planning — Durable Progression and the Path to Phase 3

**Status:** Phase 2 implementation companion. It records the detailed rationale,
contracts, and edge cases behind the Phase 2 roadmap tasks. `ROADMAP.md` remains
the canonical task/status tracker and `SERVER.md` remains the canonical server
architecture contract; update this document when implementation reveals a
material design decision that needs that context in future sessions.

## Purpose

Phase 2 makes the local prototype survive an app restart. Its persistence model
must also be a faithful local stand-in for the durable, authoritative state that
Phase 3's server will own. It must not accidentally make the Phase 3 network
snapshot, the client's AOI-filtered view, or one Tauri process's runtime
machinery into the durable source of truth.

Phase 2 persistence is a **developer/prototype facility**, not an account or
online-progression feature. It supports fast, repeatable local playtests while
the game is being built; its contents are never imported into or trusted by an
online Phase 3 world.

The Rust code inside the Tauri app is authoritative only within this local
prototype. Once networking exists it runs on a player-controlled machine and is
therefore no more trustworthy than the TypeScript client; Phase 3 authority
means the equivalent rules and scheduler execute on infrastructure controlled by
the online service.

The main design rule is therefore:

> Persist domain state. Rebuild runtime state. Project wire state.

```text
          authoritative domain model
                     |
       +-------------+-------------+
       |                           |
 Phase 2 local file          Phase 3 durable store
       |                           |
       +-------------+-------------+
                     |
           snapshot/projection
                     |
client's player- and AOI-filtered GameStateData
```

`GameStateData` is a client projection, not a save format. It intentionally
omits unloaded foreign world data. Conversely, a save/server snapshot must
contain all durable state needed to rebuild the authoritative world.

## Terms and ownership boundaries

| Layer                   | Owns                                                                                            | Must not contain                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Persistent domain state | Player progression, world entities, absolute timers, ID allocators, durable ordering cursor     | Tauri handles, connections, queued pushes, camera/AOI session state |
| Save envelope           | Schema version, saved-at metadata, one persistent-system snapshot                               | Client display data or runtime caches                               |
| Runtime server state    | Mutex/scheduler coordination, outbox, AOI subscription, dirty/coalescing flags, derived indexes | The only copy of progression                                        |
| Client projection       | Current player plus owned and in-window world entities                                          | The complete system or authority to mutate it                       |

The existing `ServerState` presently combines the first and third layers, and
also assumes the hardcoded `player-1` throughout commands and projections. It is
appropriate for the in-process prototype, but it is the wrong type to make the
serialized contract. Phase 2 should add an explicit persistent DTO and
conversion/validation boundary instead of adding `Serialize` to `ServerState`.

## Proposed durable shape

The shape below is a semantic contract, not final Rust syntax. The v1 save can
use `BTreeMap` or sorted vectors at its boundary so serialized output and
migration fixtures are deterministic; runtime code may retain `HashMap` and
rebuild it on load.

```text
SaveEnvelopeV1
  schemaVersion: 1
  savedAt: epoch ms
  system: PersistentSystemV1

PersistentSystemV1
  systemId: stable local system id
  stateRevision: monotonic snapshot/replica revision
  world:
    motherships: map<mothership id, Mothership>
    vessels: map<vessel id, VesselState>
    asteroids: map<asteroid id, Asteroid>
  players: map<player id, PlayerState>

PlayerState
  identity
  resources
  lastProductionAt
  modules: map<module id, Module>
  crew and pendingHire
  notifications
  deal state
  nextModuleSeq, nextVesselSeq, nextNotificationSeq

SessionContext (runtime only, never part of the system save)
  playerId: selected local developer identity or authenticated Phase 3 identity
  connection/session id
  AOI subscription and outbound delivery state
```

For the local prototype, `players` supports multiple progressing developer
accounts in one shared local system. The seeded display-only enemy should be
replaced by a real local player whenever it needs to participate in a test.
Phase 3 replaces local account selection with authentication and associates a
request's authenticated identity with one `PlayerState`.

The selected player must not be a `PersistentSystem` field: it is a property of
one running session. Persisting a single `localPlayerId` would make the last
client to exit silently decide who every next client becomes, and has no Phase 3
equivalent. A local developer convenience may remember a preferred account
outside the system save, but every command still receives an explicit session
identity.

## Multiple local accounts and local hosting

Multiple accounts change the persistence unit from "one app's player state" to
"one star system containing player states." They also separate two requirements
that should not be conflated:

| Requirement                                   | Minimum capability                                           | Does it need a shared host?                        |
| --------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| Switch accounts across launches               | Account selection at startup; one persistent system file     | No                                                 |
| Let offline players progress together         | Scheduler advances every player in the persisted system      | No, if only one process opens the system at a time |
| Test two players' interactions simultaneously | Two sessions against the same authoritative in-memory system | Yes                                                |

The current Tauri layout is one app process owning one `GameServer`, so two
instances would each load a stale copy and race to overwrite the same save. File
locking avoids corruption but does not create shared authority. Concurrent
testing therefore needs one local host that owns the system, scheduler, and
autosave loop; every client session sends an authenticated-for-development
player identity to that host.

### Delivery decision

Phase 2 selects **sequential-only local accounts**: build the multi-player
domain model and a launch-time local account selector, while a single process
owns the system. This is enough to test distinct progressions and lets one
account's session advance the shared world's timers for every account. It does
not test live player interaction.

A dedicated local host or a locally runnable thin slice of P3.1 would exercise
the eventual topology, but both are deliberately deferred. Phase 3 can make that
host authoritative rather than asking Phase 2 to synchronize two
player-controlled Tauri backends.

### Startup identity and player creation — decided in principle

Phase 2 starts a local session with a command-line account selector:

```text
deno task tauri dev -- -- --player "Ada"
```

`--player <name>` selects the session's local developer identity. If that name
already exists in the persistent system, the session uses its progression; if it
does not, startup creates a complete new player profile atomically. Creation
includes that player's resources, ship interior/Command Module, per-player
counters, deals, notification feed, and one newly placed mothership. Existing
players and their world entities are never reseeded or reset.

The current default `player-1`/`Player 1` hardcoding becomes a development
fallback only when no argument is supplied, so the ordinary dev command remains
usable. Once a session starts, its selected identity is immutable until the app
is restarted.

**Account-name rule — decided:** local developer identities accept any simple
string that can be represented in the JSON save. Trim surrounding whitespace,
reject the resulting empty name, and match the remaining name
case-insensitively. Preserve the first accepted spelling as the display name.
There is deliberately no account/password/character-policy complexity in this
developer-only prototype.

### Startup configuration convention — decided

Use declared Tauri command-line arguments for session-start configuration:

```text
deno task tauri dev -- -- --player "Ada" --time-scale 5
```

The first `--` ends Tauri CLI options; the second ends Cargo runner arguments
and begins arguments for the application binary. `tauri dev` documents this
two-separator form. The app should declare and validate the arguments through
`tauri-plugin-cli`/`plugins.cli` configuration, then parse them in Rust before
constructing the local game server:

| Argument                  | Default                         | Validation                           | Scope                                |
| ------------------------- | ------------------------------- | ------------------------------------ | ------------------------------------ |
| `--player <name>`         | `Player 1` development fallback | local-name normalization rules above | selected session identity            |
| `--time-scale <factor>`   | `1`                             | finite number greater than zero      | local development host/session       |
| `--restore-backup <1..5>` | none                            | one retained backup generation       | whole local system, development-only |

`VOIDBOUND_TIME_SCALE` is therefore retired rather than retained as a competing
configuration path. `deno task dev:fast` remains a useful shortcut, but will
expand to the same `--time-scale 5` application argument instead of setting an
environment variable.

The backend, not the frontend, consumes these settings. The frontend learns the
selected player from `load_game_state` as it does today; it should never choose
an authoritative identity or time scale. Tauri's CLI plugin can expose parsed
matches to JavaScript too, but that is unnecessary for this design.

`timeScale` is a development-only runtime control. It is not stored as player
progress, never accepted from a Phase 3 client, and never changes the online
server's real-time authority. Absolute deadlines created under a fast local run
remain persisted as their already-derived timestamps; changing the scale in a
later local run does not rewrite them.

**Time-scale resume rule — decided:** already-created absolute deadlines never
change. The scale selected for a new local run affects only newly scheduled
durations and that run's live production cadence; it does not model a persistent
simulated clock or rewrite existing timers. This deliberately simple behavior is
adequate for developer accounts and must be covered alongside the 24-hour
offline cap.

### Deterministic mothership spawn — decided in principle

New-player creation must place the new 4*4 mothership atomically while holding
the authoritative system lock. Its footprint must be in map bounds and clear of
every persisted mothership and asteroid; a small spawn-clearance gap is
recommended so a player does not begin visually jammed against an obstacle.
Failure to find a legal spawn must reject creation without leaving a partial
player profile.

World generation and player spawning are separate operations:

- A new local system generates/stores its asteroid field once from a persisted
  system seed. It does not seed asteroids per login or per new player.
- A new player receives a candidate sequence derived from the system seed and
  canonical player name. The first candidate whose footprint and clearance are
  free wins; a deterministic bounded search produces either a stable placement
  or a clear "no spawn space" error.
- The chosen position is persisted. Phase 3's server uses the same verified
  spawn rule, but selects the player from authentication rather than `--player`.

The existing fixed player/enemy placements and asteroid seeding from the current
mothership table are therefore temporary bootstrap behavior; they cannot remain
the source of truth once accounts can be created after world generation.

The recommendation is to make the data model, `SessionContext`, and every
request identity-aware immediately. Whether concurrent local hosting lands in
Phase 2 is a product/development-priority decision; it should not be hidden
inside P2.1's file-save work.

### Why this folds into Phase 3

- The full `PersistentSystem` is the material for a server-side snapshot.
- A Phase 3 event log is appended and applied to this state; it is not sent by
  the client and does not rely on the local file for authority.
- The online server settles builds, flights, mining, returns, and notifications
  while no client is connected. Reconnecting merely projects the already
  advanced authoritative state and its queued feed entries to that player.
- A joining client receives a projection of the persistent system at a log
  sequence, plus events after that sequence. It never receives the full save.
- `stateRevision` remains useful for replacement/push ordering. It must remain
  conceptually distinct from the future per-system **event-log sequence**:
  today's revision advances at command/scheduler boundaries, while a log
  sequence advances per appended event. Do not rename one into the other.

## Current-state audit

| Current `ServerState` field                                   | Durable?        | Phase 2 disposition                                                                                                         |
| ------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `revision`                                                    | Yes             | Persist; preserve monotonicity across restart.                                                                              |
| `resources`, `last_production_at`                             | Yes             | Persist; the production cursor is the offline-progression anchor.                                                           |
| `modules`, `motherships`, `vessels`, `asteroids`              | Yes             | Persist as domain entities, sorted/canonicalized at the boundary.                                                           |
| `next_module_seq`, `next_vessel_seq`, `next_notification_seq` | Yes             | Persist; otherwise a restart can create duplicate IDs.                                                                      |
| `crew`, `pending_hire`, `notifications`, deal fields          | Yes             | Persist, including timer state and unread state.                                                                            |
| `outbox`, `resources_dirty`                                   | No              | Clear/reinitialize after load. They are delivery/coalescing machinery.                                                      |
| `aoi`                                                         | No              | Reconstruct from the local player's mothership; Phase 3 owns one per connection.                                            |
| `notified_arrivals`                                           | **Conditional** | Do not blindly discard. Replace it with an event-source/deduplication rule, or rebuild it deterministically after recovery. |

The last row is an important correction to the original P2.1 wording. A parked
vessel remains in the table after arrival. The in-memory set prevents a later
settlement pass from generating the same arrival side effect again. It is
runtime data only _if_ a load can derive an equivalent set without losing or
duplicating a notification.

## Time and offline progression

### Proposed contract: deterministic `advance_to(now)`

Loading a save must advance the authoritative state from its stored timeline to
the current server clock. It must produce the same durable result whether the
process was alive and the scheduler woke at every deadline, or closed for a week
and recovered in one call.

With multiple local accounts, this is a **system-wide** advance: opening an
account advances production, builds, crew hires, deals, vessels, mining, and
notifications for every player and world entity in the shared local system—not
only the identity selected for that session.

`advance_to(now)` should repeatedly process the earliest due instant until no
deadline is at or before `now`:

1. Advance/accrue continuous or interval production up to that instant using the
   state that existed immediately before it.
2. Apply every transition due at that instant in a fixed, documented causal
   order.
3. Sort same-kind transitions by stable entity/action ID, never by `HashMap`
   iteration order.
4. Record the durable outcomes and feed entries with the effective event time,
   rather than the later wall-clock time at which recovery happened.
5. Finish production accrual to `now` and rebuild runtime-only indexes.

The current `settle(now)` is a good live scheduler primitive but does not yet
meet that historical-replay contract: it performs category-wide passes at `now`,
and several passes collect from `HashMap`s without a stable order.

### Proposed same-timestamp order

This is deliberately a draft; it is needed because a completion can change
production, storage, capacity, or a downstream timer.

1. Production boundary through the instant, using pre-completion stats.
2. Module build/upgrade completion (including storage and Trading Post effects).
3. Crew-hire completion.
4. Vessel arrival (starts the already-reserved mining job when applicable).
5. Mining completion, which creates a return leg at its completion timestamp.
6. Return-vessel arrival, which deposits cargo.
7. UTC daily-deal rollover.

**Same-timestamp order — decided:** apply the list above exactly, with the daily
rollover last. Every same-kind tie is sorted by stable action/entity ID. This
makes later daily limits and diminishing returns replayable.

### Clock policy — open

Absolute epoch timestamps make offline progression straightforward while the
local clock advances, but desktop clocks can move backward or far forward. The
existing code re-anchors production when time moves backward and accepts past
timers. Phase 2 applies at most 24 hours of elapsed offline progression. If the
wall-clock gap is larger, it advances through the first 24 hours, records those
results, then discards the remainder: re-anchor `last_production_at` and every
unresolved timer pair forward by the skipped duration so their remaining
simulated time stays remaining rather than becoming immediately due on the next
restart. Daily state moves directly to the current UTC day without replaying the
discarded days. Log every cap/re-anchor event for developer diagnosis.

A local file is not a security boundary; Phase 3's server clock is the
anti-cheat authority.

## Events, IDs, notifications, and idempotency

`SERVER.md` requires every authoritative event to have a unique ID and be safe
to apply twice. The current entity snapshots have stable entity IDs, but several
time-based transitions lack a distinct **action/event ID**:

- `VesselMoveEventData` identifies the vessel but not an individual movement
  leg; a recall replaces the same vessel's current move.
- `ModulePendingBuild` and `PendingHire` have timestamps/target level but no
  action ID.
- `NotificationData` has a notification ID, but it is generated when the message
  is emitted and has no source-event reference.

### Proposed contract

Every player-requested or scheduler-created transition gets an immutable
`actionId`/`eventId` at authorization. A notification carries `sourceEventId`
and a structured payload. Recovery deduplicates by source event, not by
remembering an incidental in-memory vessel ID.

```text
Notification
  notificationId       # feed-entry identity
  sourceEventId        # the completion/arrival/warp/etc. it reports
  kind                 # closed, typed vocabulary
  params               # typed data needed for client rendering
  createdAt
  read
```

This supersedes server-composed English strings, satisfies P2.2's localization
goal, and provides the missing recovery/idempotency link Phase 3 will need. The
typed tagged-union representation is settled below.

### Per-player feed and delivery — decided

Notifications are durable, bounded **per-player** feed entries, not one global
local-app feed. A system-wide scheduler creates an entry for the affected player
at the effective event timestamp whether that player is selected, another local
player is selected, or the app was closed.

Runtime push delivery is separate from persistence:

- An outbox entry has an intended player/audience. The one Phase 2 webview only
  receives entries for its selected session identity.
- A Player 1 completion while Player 2 is active remains in Player 1's feed and
  does not produce a Player 2 push, badge change, or toast.
- When Player 1 is selected in a later launch, `load_game_state` projects their
  persisted feed. It appears in Mail and the unread badge, but snapshot entries
  never replay as transient toasts.
- The existing bounded-feed policy applies independently to every player.

P2 does not retain an unbounded event log. Feed eviction must not make a past
transition replayable: durable entity/action state carries the completion marker
needed for idempotency. In particular, the current runtime-only
`notified_arrivals` set must become either a persisted movement-leg completion
marker or be exactly reconstructible from a persisted movement-leg event ID; the
100-entry notification feed cannot be its deduplication store.

## Save file lifecycle

### Proposed load sequence

1. Resolve the app-data save path; absence means new local system.
2. Read and parse the primary envelope; on any read, parse, migration, or
   semantic-validation failure, try rolling backups from newest to oldest.
3. Select a migration based on `schemaVersion` and validate the migrated
   persistent state, including references, uniqueness, bounds, catalog keys,
   resource constraints, and timer relationships.
4. Convert to runtime state with a new empty outbox, clean dirty flags, and a
   freshly centered AOI.
5. Run `advance_to(now)` and rebuild derived/deduplication indexes.
6. Discard recovery pushes: the first `load_game_state` snapshot already
   includes the recovered state and feed. This preserves the existing client
   rule that snapshot backlog does not toast.
7. Persist the recovered snapshot before serving normal commands, subject to the
   autosave failure policy.

Recovery advances the whole local system before selecting its client projection.
If the app starts as Player 2, that pass still completes Player 1's due work and
adds Player 1's feed entries to Player 1's persisted `PlayerState`. Only the
selected Player 2 projection is returned to the webview; Player 1 sees the
already-recorded entries in the Mail feed when a later session selects Player 1.
Historical feed entries loaded in a snapshot update the Mail badge/list but do
not replay as toasts.

Missing saves create a fresh seeded system. Unreadable, corrupt, unsupported, or
semantically invalid primary saves first recover the newest valid rolling backup
without blocking the loader. Only if every generation is invalid may the app
create a fresh system; it logs every rejection and preserves the failed files
for debugging rather than silently overwriting them.

### Proposed write sequence

- Capture a consistent persistent snapshot under the state lock.
- Serialize and write `<save>.tmp` in the same directory.
- Flush/sync the temporary file, then rotate a bounded set of complete,
  last-known-good backup generations before atomically renaming the temporary
  file over the main save. Sync the containing directory where the platform
  supports it.
- Perform I/O outside the gameplay lock; coalesce concurrent autosave requests
  to the newest snapshot.
- On shutdown, request a final best-effort flush without making shutdown hang
  indefinitely.

P2's snapshot replacement is intentionally simpler than P3's durable event
append transaction. It must nevertheless never write an invalid partial file.

### Recovery and rollback — decided in principle

Local progression must be recoverable during active development. Keep the
current save plus **five** complete rolling backup generations for the entire
local system—every account in the system rolls back together. Backups cover two
distinct failures:

- **Corruption/failed migration:** automatically load the newest valid backup,
  retain the rejected files with a timestamped `.broken`/`.rejected` suffix, and
  log which generation was recovered.
- **Valid but bad development change:** preserve earlier known-good generations
  so a developer can intentionally restore one after diagnosing a regression.
  Structural validation cannot detect every bad balance or rule change.

Do not overwrite the only prior good generation before the new primary has been
fully written and synced. The development-only startup argument
`--restore-backup <1..5>` selects a generation explicitly, validates it, then
restores it atomically as the new primary while rotating the previously current
save into the backup set. Automatic load only ever chooses the newest valid
generation.

## Versioning and migrations

The first file written must already be versioned. A separate task that adds the
version only after P2.1 creates saves is backwards: it turns the first format
change into an avoidable emergency migration.

### Proposed rules

- `schemaVersion` is a required integer at the envelope top level.
- Parse the historical version into a version-specific DTO, migrate one version
  at a time, then validate the latest model. Do not deserialize old JSON
  directly into the newest runtime/domain struct.
- Retain hand-authored fixture saves for each historical version and test
  migration, recovery, and rejection cases.
- Unknown future versions are not guessed; preserve the file and start a fresh
  local system with an actionable log message.
- Schema migration is deterministic data transformation. Balance/catalog changes
  require an explicit policy: preserve absolute values, re-seed only new world
  content, or run a named migration. Never silently recompute earned player
  resources.

## Validation contract

`validate_timestamps` is a useful start but only checks deadline ordering. A
persisted save should also reject or repair according to a documented policy:

- duplicate IDs and mismatched map keys;
- missing owner/mothership/module references;
- coordinates/footprints outside map bounds or overlapping where prohibited;
- unknown catalog/resource/deal kinds;
- invalid levels, negative/impossible counts, and counter regressions;
- mining jobs whose vessel or asteroid is missing, or that disagree with the
  vessel's assigned asteroid;
- notification source IDs that cannot be interpreted under the chosen retention
  policy.

**Validation repair rule — decided:** only an explicit version migration repairs
a known historical shape. Unknown catalog data, broken references, impossible
coordinates, or invalid timer/action relationships reject that generation and
try a backup. Never silently delete player data to make a save load.

## Roadmap consequences — proposed, not yet copied to ROADMAP.md

1. Add a planning/design gate before persistence implementation: durable vs
   runtime boundary, multi-account session/host model, time ordering,
   validation, and migration policy must be settled.
2. Add a concrete multi-account local-session task: launch-time `--player`
   selection/creation, exclusive single-process ownership of the shared system,
   deterministic player spawning, and system-wide settlement. Concurrent local
   hosting remains Phase 3 work.
3. Do P2.2's structured notification/event provenance before the first save is
   written and before P3.1 freezes the socket wire format.
4. Fold P2.3's envelope versioning and migration harness into P2.1's first
   implementation; retain P2.3 as a follow-up only if it gains a concrete
   compatibility/migration deliverable.
5. Make P2.5 depend on the durable timer/action-ID rules, not merely P2.1.
6. Make P2.4 depend on the final envelope and recovery semantics so autosave
   cannot cement a provisional format.

## Open product and architecture decisions

These need discussion before the corresponding sections become settled design:

1. **Phase 3 carry-forward — decided:** Phase 2 local saves are never imported
   into an online account or world. They are developer/prototype progress only,
   including sped-up playtest accounts. Phase 3's server validates and executes
   every action and every offline settlement itself; a client reconnecting after
   a minute or a week observes that server-owned result rather than catching it
   up locally.
2. **Multiple local accounts — decided:** One local save is a persistent
   multi-player system and supports multiple developer identities. This enables
   account-specific progression, parallel long-running actions, and eventual
   interaction testing. An account's identity is selected at session launch; it
   does not change mid-session.
3. **Local-host concurrency — decided:** Phase 2 supports sequential account
   switching only. One Tauri process owns a local system at a time; it advances
   timers for every player in that system, then persists the shared result. Do
   not synchronize independent Tauri backends or permit last-writer-wins saves.
   A second process should fail clearly on an exclusive local-system lock.
   Concurrent interaction testing waits for Phase 3's real server/host, rather
   than building throw-away synchronization code.
4. **Local system identity — decided:** Phase 2 has one durable local system,
   `local-system-1`, containing every developer account. Keep `systemId` in the
   envelope so Phase 3 can map the same domain model to real star systems.
5. **Clock anomalies — decided:** Cap one offline recovery advance at 24 hours,
   log that the cap applied, and permanently discard/re-anchor elapsed time
   beyond that cap. Repeated restarts must not turn a multi-day absence into
   multiple capped advances. After applying the permitted interval, re-anchor
   production and every still-pending timer to the current wall clock while
   preserving its remaining simulated duration; daily state moves directly to
   the current UTC day without replaying skipped daily transitions.
6. **Notification payload — decided:** Use a closed Rust/TypeScript tagged union
   per kind, with a `sourceEventId` and typed parameters. The Phase 2 vocabulary
   is small and known; strong validation and exhaustive client rendering are
   more valuable than arbitrary JSON extensibility.
7. **Retention/deduplication — decided:** Keep a bounded durable feed per
   player, plus durable per-entity action/movement completion state for
   idempotency. P2 does not retain a full historical log; Phase 3's server event
   log becomes the long-lived history.
8. **Failed-save recovery — decided:** Keep rolling last-known-good backup
   generations, automatically fall back to the newest valid one, and preserve
   rejected files for diagnosis. Provide an explicit development-only restore
   path, `--restore-backup <1..5>`, for a developer to choose an older
   generation after a valid-but-bad change. Retain five generations.
9. **P3 persistence technology — decided:** Use relational SQL state, not a
   split key-value/NoSQL source of truth. Phase 2 keeps its versioned local JSON
   snapshot; SQLite begins with the local networked Phase 3 server, and
   PostgreSQL is the online production target.

## Phase 3 database direction — proposed for discussion

Use the persistence substrate appropriate to each phase:

```text
Phase 2 local prototype                  versioned JSON snapshot + rolling backups
Local networked Phase 3 development      embedded SQLite file in the Rust host
Phase 3 online production               managed PostgreSQL via DATABASE_URL
Optional balancing/telemetry analysis   DuckDB over exported event/state data
```

SQLite runs inside the process, needs no separately installed service, and is a
good fit once the Phase 3 local host serializes authoritative writes. PostgreSQL
is the intended end product once the database is separated from the game server
and multiple online users/workers require server-grade concurrency. Phase 2 does
not take on SQLite work that will be superseded by Phase 3; it preserves the
same persistent-domain semantics in its JSON snapshot instead.

DuckDB remains a useful future analysis tool, especially for large event-log or
balance exports, but is not the authoritative gameplay store. It is optimized
for analytical workloads and its native read-write mode is deliberately scoped
to one process; that is the opposite of the online multi-worker direction.

PostgreSQL is not in tension with document-shaped data:

| Data / operation                                                                    | Initial representation                                                                               | Why                                                                                   |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Accounts, world membership, modules, motherships, vessels, asteroids, notifications | Normalized relational tables keyed and indexed by `system_id`/`player_id`                            | Ownership, joins, constraints, transactions, and AOI queries are core gameplay needs. |
| Player-profile preferences and extensible event/notification parameters             | Versioned typed application data; SQLite JSON text locally, PostgreSQL JSONB in production if useful | Flexible fields do not need a separate database.                                      |
| Authoritative event history                                                         | `system_events(system_id, sequence, event_id, type, payload, occurred_at)`                           | Preserves SERVER.md's snapshot + replay model.                                        |
| Current gameplay state / snapshot                                                   | Materialized relational state plus periodic snapshot metadata/blob as needed                         | Fast command validation and joins without replaying an entire world per request.      |
| Realtime delivery                                                                   | Transactional outbox rows, drained after the state/event transaction commits                         | No client sees an event that failed to persist.                                       |

One accepted action runs in one database transaction: verify against current
rows, append the event with the next system sequence, update materialized state,
create player-specific notifications, and enqueue outbox delivery. The scheduler
uses the same transaction path for due work. This preserves the event pattern
without forcing every command or late join to replay the complete history.

### Map/AOI and scale

Every authoritative world row carries `system_id`; owner and AOI access paths
are indexed from day one. Initial AOI queries can use ordinary bounded
coordinate/footprint columns and relational indexes—the current map is only
1000*1000 tiles, so PostGIS or a dedicated spatial database is premature.
Benchmark realistic entity density before adding specialized spatial indexes.

If one process later becomes insufficient, the stable seams are already clear:
database connection pooling, a scheduler lease so only one worker settles a
given system/deadline, outbox consumers for WebSocket fan-out, and partitioning
by `system_id`. A cache or message broker may join later for delivery/reads, but
neither becomes the authoritative game state.

### Portability rules

SQLite and PostgreSQL share relational concepts but not every SQL feature or
locking behavior. Keep the game-domain model database-neutral and put SQL behind
a narrow persistence/repository boundary. Use integer epoch-ms timestamps,
explicit stable IDs, and portable tables/indexes for the core state. Keep
engine-specific migrations separate when necessary, and run persistence
conformance tests against both engines before PostgreSQL becomes production.

Do not use a remote/network filesystem SQLite file. Local SQLite lives beside
the one local game-server process; online clients speak the game protocol to a
server, and production PostgreSQL lives with that server infrastructure.

### Why not split SQL and key-value now

A profile in a key-value store and a vessel in a document store look simple in
isolation, but one build, dispatch, alliance action, or notification often
changes several players/entities atomically. A split store makes those commands,
recovery, and event ordering materially harder. Both SQLite and PostgreSQL
handle the simple key-value cases too, while keeping the relationship-heavy
cases transactional.

Phase 2 intentionally retains the explicit versioned JSON envelope and its
five-generation backup/recovery model. SQLite begins only when the local
networked Phase 3 server exists; the Phase 2 file is not imported into it.

## Settled pre-implementation rules and follow-up design

The pre-P2.1/P2.5 policy decisions are now settled:

1. **Account names:** trim, reject empty, match case-insensitively, and preserve
   first spelling for display; otherwise accept simple JSON-representable names.
2. **Time scale:** never rewrite existing deadlines; a run's development-only
   scale affects only its new durations and live production cadence.
3. **Same timestamps:** production, modules, crew, outbound arrivals, mining,
   return/cargo arrivals, then daily rollover; stable-ID order within a kind.
4. **Save validation:** only explicit migrations repair known historical shapes;
   every other invalid state rejects that generation and falls back to backups.

### Specify as part of the named implementation task

5. **Structured notification catalog.** P2.2 must list every notification
   variant and its typed parameters (build/level completion, crew hire, mining
   start/depletion, vessel return, warp, deal refresh, and any existing kinds),
   then define its client display formatter. The tagged-union direction is
   settled; this is the exhaustive field design.
6. **Spawn planner constants.** Set the exact clearance gap, candidate-search
   bound, and system-seed scheme. The invariant is already settled: atomic,
   deterministic, in-bounds placement clear of motherships and asteroids.
7. **Recovery operations.** Define backup filenames, retention rotation, how a
   recovered primary is recorded, and the user-facing/log behavior when every
   generation fails. The five-generation and explicit-restore policy is settled.

### P2.1 implementation decisions

- **Spawn planner:** `local-system-1` uses the fixed seed
  `0x9E37_79B9_7F4A_7C15`; a normalized-name FNV-1a hash selects a deterministic
  sequence of at most 4,096 candidates. A new 4*4 mothership requires one clear
  tile from every ship and asteroid.
- **Snapshot lifecycle:** `local-system.json` is protected by an exclusive OS
  lock. Command and scheduler boundaries write a synced temporary snapshot,
  rotate five `.json.bak<N>` generations, then replace the primary. A corrupt
  primary falls back to the newest valid backup; `--restore-backup <1..5>`
  selects one deliberately. Final shutdown flushing and rejected-file
  preservation remain P2.4 hardening work.

### Deliberately deferred to Phase 3

8. **SQLite-to-PostgreSQL persistence boundary.** Define repositories,
   migrations, and cross-engine conformance tests when the local networked
   server lands. No Phase 2 save import is needed.
9. **Online scheduler ownership and scaling.** Scheduler leases, transactional
   outbox workers, connection pools, partitioning, and cloud deployment are
   Phase 3 concerns once a real server exists.
10. **Concurrent local clients.** Explicitly deferred: Phase 2 has one local
    process/session; Phase 3 provides the real shared host.

## Maintenance rule

Keep this document through Phase 2 implementation. It must not become a second
task tracker: checkboxes, task status, and completion notes belong only in
`ROADMAP.md`. When a material decision changes, update the relevant canonical
`ROADMAP.md`/`SERVER.md` contract and this document's detailed rationale in the
same reviewable change. Archive or remove it only after Phase 2 is complete and
its still-relevant conclusions have been folded into permanent documentation.
