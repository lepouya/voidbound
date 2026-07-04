# Voidbound Roadmap

Development phases for the game design described in `README.md`. Settled design
principles live there; this file tracks the order features land in. Later phases
build directly on earlier ones — in particular, everything in phase 3 assumes
actions are already event-modeled (see the multiplayer-ready event pattern in
`CLAUDE.md`).

## Phase 1 — Local gameplay loop

Goal: a playable single-player loop, no persistence yet.

- Module placement grid in the ship view — `BuildModuleEvent` via
  `/add-game-event`; a `completesAt` field gives build timers for free.
- Module catalog from the README ship design, starting with the Command Module
  (already rendered) and the four resource producers (Ore Refinery, Electronics
  Fabricator, Hydroponics Bay, Fusion Reactor).
- The 4 resources (construction, high-tech, biological, fuel) with baseline
  production from the Command Module so a player can never get stuck.
- Resource bar HUD group — first real use of `HudGroupHandle.setBadge`.
- Mining external nodes: dispatch vessels to asteroids on the space map, return
  with cargo.
- Diminishing returns on repeated actions over a day (instead of hard energy
  caps), implemented locally first.

## Phase 2 — Persistence

Goal: game state survives a restart.

- Save/load via a Tauri command (local file), before any server exists.
- Versioned save format so later phases can migrate.

## Phase 3 — Server-authoritative events

Goal: the event pattern goes live over the network. The intended server model
(event log, verification, broadcast, snapshot + replay) is sketched in
`SERVER.md`.

- WebSocket event bus: server verifies, timestamps, and broadcasts events;
  clients feed them into the existing `apply*Event` entry points.
- Server-time-offset handshake so clients never trust `Date.now()` — pairs with
  the `arrivalAt` precomputation already in `VesselMoveEvent`.
- Snapshot + replay for late joiners (`applyVesselMoveEvent` already
  interpolates aged events).
- HTTP fallback for `generate_map` behind the same `buildTileMap` signature —
  unlocks the planned web-browser platform.
- Production hardening: set a real CSP in `tauri.conf.json` (currently `null`);
  drop the unused `withGlobalTauri: true`.

## Phase 4 — Alliances, seasons, worlds

Goal: the MMO layer.

- Alliance Embassy gameplay: joining, contribution, alliance boosts.
- Map difficulty scaling toward the center gates progress — alliances must gain
  power together to push inward.
- Cohort worlds: new players arrive in a fresh star system populated by players
  who started around the same time, so nobody is unrecoverably behind.
- Seasons: after a time or milestone, remaining players move on to a new system
  — the answer to server activity dying off as players leave. Enables world
  merging and ascension bonuses for players carrying over from a previous
  season.

## Unphased UX / polish backlog

Small items from the 2026-07-04 code review, schedulable whenever convenient:

- Zoom-at-cursor for wheel/pinch (currently zooms at screen center).
- Minimap for the 100\*100 space map.
- Fog of war / radar radius tied to the Operations Center concept.
- Notification badges wired to real event counts (Events/Mail buttons).
