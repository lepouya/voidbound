# Voidbound Roadmap

Development phases for the game design described in `README.md`. Settled design
principles live there; this file tracks the order features land in. Later phases
build directly on earlier ones — in particular, everything in phase 3 assumes
actions are already event-modeled (see the multiplayer-ready event pattern in
`CLAUDE.md`; the server model is sketched in `SERVER.md`).

**How to use this file:** tasks have stable IDs (`P<phase>.<n>`) so sessions and
commits can reference them — check off a task when it's committed and
`deno task fmt` + `deno task test` pass. Within a phase, tasks are listed in
rough dependency order, but anything without an explicit "needs" note can be
picked up independently. (The 2026-07-04 code review's remaining ideas were
absorbed here; the review file itself is retired — see git history for
`CODE_REVIEW.md`.)

## Phase 1 — Local gameplay loop

Goal: a playable single-player loop, no persistence yet.

- [ ] **P1.1 — Resource state + production tick.** The 4 resources
      (construction, high-tech, biological, fuel) as game state with a periodic
      production tick. Baseline production comes from the Command Module so the
      player can never get stuck.
- [ ] **P1.2 — Resource bar HUD group.** Screen-top display of the 4 resource
      counts — first real use of `HudGroupHandle.setBadge`, updated from the
      P1.1 tick. Needs P1.1.
- [ ] **P1.3 — Module placement + build timers.** `BuildModuleEvent` via
      `/add-game-event` (its `completesAt` field gives build timers for free),
      plus the placement UI: `createEmptyTileActor` in the ship view with a
      Build button, mirroring the map view's Move/Deploy pattern.
- [ ] **P1.4 — Module catalog.** Types, levels, and resource costs from the
      README ship design — Command Module (already rendered) and the four
      producers first (Ore Refinery, Electronics Fabricator, Hydroponics Bay,
      Fusion Reactor). Producer levels feed the P1.1 tick; costs are spent by
      P1.3 builds. Art via `/gen-art` + the `module-*` auto-register pattern.
      Needs P1.1, P1.3.
- [ ] **P1.5 — Local notifications.** Wire the Events HUD badge to real counts:
      module build completions (P1.3), vessel arrivals. Replaces the hardcoded
      "@" placeholder badge. (The Mail badge stays a placeholder until messaging
      exists — see P3.5.) Needs P1.3.
- [ ] **P1.6 — Mining loop.** Asteroid resource nodes in the space-map
      `generate_map` arm; dispatch a vessel to a node, mine, return with cargo
      that deposits into P1.1 resources. Event-modeled (extend `VesselMoveEvent`
      or add a `MineEvent`). Needs P1.1.
- [ ] **P1.7 — Diminishing returns.** Repeated actions yield less over the
      course of a day and reset at a fixed point — the README's alternative to
      hard energy caps. Local implementation first; the server re-verifies it in
      phase 3. Needs P1.6 (mining is the first action worth damping).
- [ ] **P1.8 — Zoom-at-cursor.** Wheel/pinch zoom should anchor at the
      pointer/pinch midpoint instead of the screen center. Pure `TiledScene`
      input polish, independent of the rest of the phase.
- [ ] **P1.9 — Minimap.** Overview widget for the 100\*100 space map; becomes
      necessary once P1.6 spreads play across the map. Needs P1.6.

## Phase 2 — Persistence

Goal: game state survives a restart.

- [ ] **P2.1 — Save/load via a Tauri command.** Serialize the phase-1 game state
      to a local file; load on startup. No server involved.
- [ ] **P2.2 — Versioned save format.** Version field + migration path so later
      phases (and the phase-3 server snapshot format) can evolve without wiping
      saves. Needs P2.1.

## Phase 3 — Server-authoritative events

Goal: the event pattern goes live over the network, per `SERVER.md`.

- [ ] **P3.1 — WebSocket event bus.** Server verifies, timestamps, and
      broadcasts events; clients feed them into the existing `apply*Event` entry
      points. Local action methods switch from "build + apply" to "send request,
      apply the broadcast".
- [ ] **P3.2 — Server-time-offset handshake.** Clients never trust `Date.now()`
      — pairs with the `arrivalAt` precomputation already in `VesselMoveEvent`.
      Needs P3.1.
- [ ] **P3.3 — Snapshot + replay for late joiners.** Server side of the model:
      snapshot plus log suffix on join. The client half already works
      (`applyVesselMoveEvent` interpolates aged events). Needs P3.1; builds on
      the P2.2 versioned format.
- [ ] **P3.4 — HTTP fallback for `generate_map`.** Fetch-based map source behind
      the same `buildTileMap` signature — unlocks the planned web-browser
      platform (update the CLAUDE.md Platform line when done).
- [ ] **P3.5 — Player-to-player mail.** First messaging feature; wires the Mail
      HUD badge to a real unread count (completes the notification work started
      in P1.5). Needs P3.1.
- [ ] **P3.6 — Production hardening.** Set a real CSP in `tauri.conf.json`
      (currently `null`); drop the unused `withGlobalTauri: true`. Do before the
      first public/networked build.

## Phase 4 — Alliances, seasons, worlds

Goal: the MMO layer.

- [ ] **P4.1 — Alliance Embassy gameplay.** Joining, contribution, and alliance
      boosts — the first alliance mechanics.
- [ ] **P4.2 — Map difficulty scaling toward the center.** Higher-level
      nodes/territories closer to the center gate progress — alliances must gain
      power together to push inward. Needs P4.1.
- [ ] **P4.3 — Fog of war / radar.** Visibility radius on the space map tied to
      the Operations Center module level; matters once other players' fleets
      share the map. Needs P3.1.
- [ ] **P4.4 — Cohort worlds.** New players arrive in a fresh star system
      populated by players who started around the same time, so nobody is
      unrecoverably behind.
- [ ] **P4.5 — Seasons.** After a time or milestone, remaining players move on
      to a new system — the answer to server activity dying off. Enables world
      merging and ascension bonuses for players carrying over. Needs P4.4.
