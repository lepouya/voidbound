# Voidbound Roadmap

Development phases for the game design described in `README.md`. Settled design
principles live there; this file tracks the order features land in. Later phases
build directly on earlier ones — in particular, everything in phase 3 assumes
actions are already event-modeled (see the multiplayer-ready event pattern in
`CLAUDE.md`; the server model is sketched in `SERVER.md`). Phase 0 is the
engine/tooling scaffolding all of that already sits on.

**How to use this file:** tasks have stable IDs (`P<phase>.<n>`) so sessions and
commits can reference them — check off a task when it's committed and
`deno task format` + `deno task check` + `deno task test` pass. IDs never
change, even when a task moves phases (e.g. P1.7 now lands in Phase 2). Within a
phase, tasks are listed in rough dependency order, but anything without an
explicit "needs" note can be picked up independently. Done items keep only a
one-line summary plus any notes that still matter for future work (marked "Still
open"); implementation detail lives in `CLAUDE.md`, `SERVER.md`, and the commit
history.

## Phase 0 — Engine and tooling scaffolding

Goal: the technical foundation everything else is built on. All done — captured
retroactively from the code and git history, so task order doesn't imply build
order. Current details live in CLAUDE.md §§ 2–4.

- [x] **P0.1 — Excalibur engine bootstrap + scene registration.** `main.ts`:
      portrait 390\*844 engine, shared loader, map/ship scenes, starts on ship.
- [x] **P0.2 — `TiledScene` base class.** Camera pan/zoom/clamp, tap-vs-drag
      input dispatch, selection, HUD group wiring.
- [x] **P0.3 — `TileActor` base entity.** Layered tile rendering, selection
      action buttons, badges, owner labels, `moveTo` with auto-facing + path
      line, empty-tile pattern.
- [x] **P0.4 — TileRef / tileset system.** String/object parsing, multi-layer
      compositing, `TilesetRegistry` + pure-data geometry catalog with
      prefix-based auto-registration.
- [x] **P0.5 — UI component library (`src/ui/`).** Shared primitives for
      world-space and HUD UI behind one barrel.
- [x] **P0.6 — Map loading + IPC.** `buildTileMap()` over the Tauri
      `generate_map` command.
- [x] **P0.7 — MapLevel + ShipLevel scenes.** The two playable scenes: space map
      and mothership interior.
- [x] **P0.8 — Vessel-move event pattern reference implementation.** The
      concrete instance of the multiplayer-ready event pattern that
      `/add-game-event` and `SERVER.md` generalize from.
- [x] **P0.9 — Art pipeline tooling.** Python Pillow CLIs + `art/gen_*.sh`
      orchestrators producing everything under `src/assets/`.
- [x] **P0.10 — Testing + CI infrastructure.** Deno pure-logic suite, Rust
      game-rule tests, Python pipeline tests, GitHub Actions workflow.
- [x] **P0.11 — Tooling/build setup.** Deno task runner, Vite config, Tauri
      config, strict `tsconfig.json`.
- [x] **P0.12 — Shared cross-scene game-state module.** The `gameState`
      singleton (subscribe/notify) both scenes import, synced from
      `load_game_state` during the loader phase; scenes tolerate slow/failed
      loads (CLAUDE.md § Startup / loader phase).

## Phase 1 — Core gameplay loop

Goal: a playable single-player loop, no persistence yet.

- [x] **P1.1 — Resource state + production tick.** The 4 resources as game state
      with periodic production; baseline production from the Command Module so
      the player can never get stuck.
- [x] **P1.2 — Resource bar HUD group.** Screen-top resource counts with live
      label updates.
- [x] **P1.3 — Module placement + build timers.** `BuildModuleEvent` (its
      `completesAt` gives build timers for free) + the empty-tile Build
      placement UI in the ship view.
- [x] **P1.4 — Module catalog.** Rust-authoritative `MODULE_CATALOG` with a
      display-only TS mirror; level-ups reuse the build-timer machinery, capped
      at the Command Module's level. Still open: per-level scaling is the
      doubling stub (→ P2.5); per-type module art (→ P6.1).
- [x] **P1.5 — Local notifications + server-push channel.** Server-owned
      notification feed + the scheduler push channel — the in-process prototype
      of P3.1's event bus. Still open: pressing Events dumps the feed to the
      console until the P6.3 feed panel; the Mail badge stays a placeholder
      until P3.5.
- [x] **P1.6 — Mining loop.** Server-seeded asteroids with single-slot mining
      jobs, scheduler auto-recall at mine-out, proportional early harvests, dock
      deposits. Still open: deposit bands and `MINE_UNITS_PER_HOUR` are
      balancing stubs, and mixed deposits / multiple miners on large asteroids
      stay open doors (→ P2.5); asteroid sprites are placeholder vectors (→
      P6.2).
- **P1.7 — Diminishing returns.** Moved to Phase 2 (July 2026): a daily damping
  curve can't be experienced or tuned while every restart wipes state, and it
  would sit on top of numbers that are still stubs — see Phase 2.
- [x] **P1.8 — Zoom-at-cursor.** Wheel/pinch zoom anchored at the pointer/pinch
      midpoint (`anchoredZoomPos` in `src/camera-math.ts`; clamp-before-pan so
      the camera never drifts at min/max zoom).
- [x] **P1.9 — Minimap + full-size space map.** Geometry-only 1000\*1000 space
      map with minimap navigation (entity dots, viewport rect, tap-to-jump).
      Still open: real starfield background (→ P6.2).
- [x] **P1.10 — Crew Quarters + crew capacity.** Crew as the third catalog stat:
      berths sum linearly over settled levels (Crew Quarters + a Command Module
      baseline), producers want 1 crew per level, and producer output scales by
      the pooled ship-wide staffing ratio with a 50% floor — the Command
      Module's baseline production is never damped (the anti-stuck guarantee).
      Timed `request_hire_crew` recruitment (linear biological cost per head,
      one at a time); crew/berths in the resource bar, the Hire Crew button on
      the Command Module + settled Crew Quarters, understaffed producers wear an
      output-percent badge, and players start at 0 crew (the first hire is a
      natural tutorial step later). Still open: hire cost/time, the 50% floor,
      and the berth-vs-demand ratio are balancing stubs, as is optional per-crew
      biological upkeep (→ P2.5); penalties beyond production, vessel crews (→
      P5.3), combat casualties (→ P5.5), and specialization / manual crew
      stationing (no task yet) were deliberately deferred.
- [x] **P1.11 — Storage Bay capacity caps.** Per-resource caps as a catalog
      `stores` field; production and mining deposits clamp server-side (overflow
      is lost and the notification says so); the resource bar shows count/cap.
      Still open: cap numbers are stubs (→ P2.5); the README's "boosts
      production" perk was skipped; safe warehousing becomes meaningful with
      P5.5 combat. (The Armory's weapon-storage half moved to P5.4.)
- [x] **P1.12 — Trading Post + NPC shop.** Deal-slot NPC shop on a new Trading
      Post module: server-generated daily deals over the 5 trade-eligible types
      (give ≠ get, rarity boosts the get side, give capped at a storage-cap
      fraction), a once-daily freebie, doubling-cost refreshes (5/day), slot
      count scaling with the post's level — credits' entry into the economy
      (README § Design principles updated). Full model: CLAUDE.md § IPC. The
      P1.14 dialog API held up from the consumer's seat; the state-bound
      rerender scaffolding was extracted as `bindDialogRows` (ui/dialog.ts) for
      the later panels (P6.3 feed, P3.5 mail, P5.1 research). Still open: every
      deal number — give base, cap fraction, rarity weights/bonuses, refresh
      costs, freebie band, credits-per-unit rate, unlock level, slot curve — is
      a balancing stub (→ P2.5); better exchange ratios at higher post level,
      featured/limited-stock deals, and credits' wider role (→ P4.6); per-type
      module art (→ P6.1).
- [x] **P1.13 — Map interest area: windowed world streaming + minimap
      declutter.** The client only holds world entities inside a 100\*100-tile
      AOI window, re-centered as the camera pans; pushes are footprint-filtered,
      and the map view is capped so unloaded space never scrolls into sight.
      Full model: SERVER.md § Interest management. Feeds P3.1 (per-connection
      windows) and P4.3 (fog of war = this window shrunk to a radar radius).
      Still open: asteroid deposit/rate balance (→ P2.5).
- [x] **P1.14 — Modal dialog/overlay system.** Screen-space modal layer
      (`src/ui/dialog.ts` + pure `dialog-layout.ts`, `MODAL_BASE_Z` above the
      HUD): scrim + framed panel + title/close + row/cell content composed from
      the existing `ui/` primitives, opened via `TiledScene.openDialog()`, which
      captures all pointer input while open. One modal at a time. Still open: no
      scrolling — the content region is a distinct sub-rect a scrollable list
      can drop into (→ P6.3); the P1.12 shop is the reference consumer.

## Phase 2 — Persistence and balancing

Goal: game state survives a restart, and the stubbed numbers become real.
Balancing lives in this phase because progression tuning is only meaningful once
progress persists — the reason P1.7 moved here.

- [ ] **P2.1 — Save/load via a Tauri command.** Serialize `ServerState` to a
      local file; load on startup in place of the seeded new-player state
      (falling back to the seeds when no save exists). Loading rides the
      existing loader phase and its resilience rules — a missing or corrupt save
      must never block game start. No server involved; SERVER.md frames the save
      file as a local prototype of the phase-3 snapshot.
- [ ] **P2.2 — Versioned save format.** Version field + migration path so later
      phases (and the phase-3 server snapshot format) can evolve without wiping
      saves. Needs P2.1.
- [ ] **P2.3 — Autosave.** Persist without user action: save at scheduler settle
      boundaries and on exit, with atomic write-temp-then-rename so a crash
      never corrupts the save. Needs P2.1.
- [ ] **P2.4 — Offline catch-up.** On load, settle everything that came due
      while the app was closed through the same settlement paths the scheduler
      uses live: production accrual is already lazy, but build completions,
      vessel arrivals/returns, and mine-outs must settle in timestamp order and
      emit their notifications. Needs P2.1.
- [ ] **P2.5 — Balancing pass.** Replace the stubs with real curves: the
      `scale_for_level`/`scaleForLevel` doubling, `MINE_UNITS_PER_HOUR`,
      asteroid deposit bands and per-window density, and the P1.10 crew numbers
      (hire cost/time, the 50% output floor, the berth-vs-demand ratio, and
      whether crew consume biological upkeep — a good sink, but mind the death
      spiral). README targets: small asteroids mine out in 15–60 min, medium 1–4
      h, large 4–12 h. Also revisit the single-deposit / single-miner rules for
      large asteroids (README leaves that door open). Needs P2.1 — tuning
      requires persistent progress.
- [ ] **P1.7 — Diminishing returns** _(moved from Phase 1, July 2026)_. Repeated
      actions yield less over the course of a day and reset at a fixed point —
      the README's alternative to hard energy caps. Local implementation first;
      the server re-verifies it in phase 3. Mining is the first action worth
      damping. Needs P2.1; lands naturally alongside P2.5.

## Phase 3 — Server-authoritative events

Goal: the event pattern goes live over the network, per `SERVER.md`.

- [ ] **P3.1 — WebSocket event bus.** Server verifies, timestamps, and
      broadcasts events; clients feed them into the existing `apply*Event` entry
      points. Local action methods switch from "build + apply" to "send request,
      apply the broadcast". Includes the rate limits SERVER.md's verification
      step sketches, and generalizes P1.13's single-client AOI into
      per-connection windows at the outbox drain loop.
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
      in P1.5). The P6.3 feed panel is the natural UI surface to reuse. Needs
      P3.1.
- [ ] **P3.6 — Production hardening.** Set a real CSP in `tauri.conf.json`
      (currently `null`); drop the unused `withGlobalTauri: true`. Do before the
      first public/networked build.
- [ ] **P3.7 — Login / player identity.** Accounts and authentication: the
      client learns who it is from the server instead of the local seed. Rides
      the loader phase — the resilience rules in CLAUDE.md § Startup already
      reserve room for a login flow, and identity still never changes
      mid-session. Pairs with P3.1: the socket needs an authenticated player
      behind it.

## Phase 4 — Alliances, seasons, worlds

Goal: the MMO layer.

- [ ] **P4.1 — Alliance Embassy gameplay.** Joining, contribution, and alliance
      boosts — the first alliance mechanics. Alliance entities join the P1.13
      always-sent AOI exemption here.
- [ ] **P4.2 — Map difficulty scaling toward the center.** Higher-level
      nodes/territories closer to the center gate progress — alliances must gain
      power together to push inward. The README lists moons and planets
      alongside asteroids as resource nodes; they'd first appear here as the
      higher-tier center content. Needs P4.1.
- [ ] **P4.3 — Operations Center: fog of war / radar.** The Operations Center
      module (README § Ship design): visibility radius on the space map tied to
      its level — P1.13's AOI window shrunk to a radar radius — plus its
      vessel-speed boost. Matters once other players' fleets share the map.
      Needs P3.1.
- [ ] **P4.4 — Cohort worlds.** New players arrive in a fresh star system
      populated by players who started around the same time, so nobody is
      unrecoverably behind.
- [ ] **P4.5 — Seasons.** After a time or milestone, remaining players move on
      to a new system — the answer to server activity dying off. Enables world
      merging and ascension bonuses for players carrying over. Needs P4.4.
- [ ] **P4.6 — Credits economy / player trade.** Flesh out the credits currency
      beyond the P1.12 NPC shop: player-to-player and alliance-level trade.
      Design is open — the README calls the currency's exact role "not fleshed
      out yet" — so settle the design before building. Needs P1.12, P4.1.

## Phase 5 — Technologies, combat, and defence

Goal: the README's Technologies, Combat, and Defence module categories.

- [ ] **P5.1 — Research Lab + tech tree.** Spend resources to unlock module
      blueprints, vessel stat upgrades, and efficiency bonuses; gates which
      later Phase 5 modules and vessel stats are available. Needs P1.4.
- [ ] **P5.2 — Fabrication Bay, Assembly Line, Data Archive.** Speed/cost
      multipliers applied respectively to module builds (P1.3), weapon
      production (P5.4), and research (P5.1). Needs P5.1.
- [ ] **P5.3 — Vessel Shipyard + vessel stats.** Durability, damage, cargo
      capacity, and weapons capacity as per-vessel upgradeable stats, replacing
      the flat `vesselSpeed` constant with a real stat block. P1.10's open door
      lands here too: vessel crews — dispatching/mining requiring crew aboard,
      tying fleet size to the crew pool. Needs P1.6.
- [ ] **P5.4 — Weapons Factory, Drone Factory, Plasma Factory + Armory.** Three
      weapon-type production lines (kinetic, drone, plasma) feeding the vessel
      weapons capacity from P5.3, plus the Armory's weapon-storage caps (moved
      out of P1.11's original scope). Event-modeled via `/add-game-event`. Needs
      P5.3.
- [ ] **P5.5 — PvP combat resolution.** Attacking another player's mothership or
      vessels: damage exchange using P5.4 weapons and P5.3 stats, resolved
      server-side so neither side can lie about the outcome. Crew casualties
      (P1.10's open door) belong to this resolution. Needs P3.1, P5.4.
- [ ] **P5.6 — Repair Shop.** Repairs weapon/vessel damage from P5.5 combat
      using resources and time, mirroring the P1.3 build-timer pattern. Needs
      P5.5.
- [ ] **P5.7 — Hangar Bay.** Station weapons/vessels at the mothership as a
      passive defense contribution to P5.5 combat resolution. Needs P5.5.
- [ ] **P5.8 — Shield Generator.** Protective shielding that absorbs damage in
      P5.5 combat; when breached, forces the mothership to warp and relocate.
      Needs P5.5.

## Phase 6 — Presentation and platforms

Goal: real art, real panels, more platforms. Client-side work that is largely
independent of the server phases — pull any of these earlier when placeholder
art or missing panels start hurting playtests.

- [ ] **P6.1 — Per-type module art.** Replace the shared `module-base` sprite
      with per-type module sprites (`/gen-art`; the `module-*` auto-register
      prefix already expects them). Needs P1.4.
- [ ] **P6.2 — Space map art.** Real starfield background for the geometry-only
      map scene, and real asteroid sprites (per class, per tier) replacing the
      tinted placeholder vectors. Needs P1.9.
- [ ] **P6.3 — Notification feed panel.** A real Events panel replacing the P1.5
      console dump — likely the game's first scrollable list UI, so build it as
      a reusable panel; P3.5's mail UI is the second consumer. Needs P1.5.
- [ ] **P6.4 — Mobile builds (Android/iOS).** Bring up
      `deno task tauri android|ios` (README § Other platforms). The game is
      mobile-first by design — portrait layout and touch input already hold — so
      this is mostly build wiring, performance, and on-device verification.
      Worth pulling early once the core loop stabilizes.
