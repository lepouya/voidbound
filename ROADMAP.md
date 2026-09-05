# Voidbound Roadmap

Development phases for the game design described in `README.md`. Settled design
principles live there; this file tracks the order features land in. Later phases
build directly on earlier ones — in particular, everything in phase 3 assumes
actions are already event-modeled (see the multiplayer-ready event pattern in
`AGENTS.md`; the server model is sketched in `SERVER.md`). Phase 0 is the
engine/tooling scaffolding all of that already sits on. **`PHASE3.md`** holds
the authoritative gameplay design behind Phase 3's task list below (mechanic
sketches, wire shapes, decision gates, and the design principles it hands
forward to Phases 4-7) — read it before picking up any P3.x task; this file
keeps only the terse per-task summary and dependency order.

**How to use this file:** tasks have IDs (`P<phase>.<n>`) so sessions and
commits can reference them — check off a task when it's committed and
`deno task format` + `deno task check` + `deno task lint` + `deno task test`
pass. Task IDs are stable references. Within a phase, tasks are listed in rough
dependency order, but anything without an explicit "needs" note can be picked up
independently. Done items keep only a one-line summary; follow-up work gets its
own task ID in the appropriate phase rather than living on as a note on the
finished task. Implementation detail lives in `AGENTS.md`, `SERVER.md`, and the
commit history.

## Phase 0 — Engine and tooling scaffolding

Goal: the technical foundation everything else is built on.

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
- [x] **P0.9 — Art pipeline tooling.** Python Pillow/librsvg CLIs +
      `art/gen_*.sh` orchestrators producing vector-rendered animated sheets
      (`vessel-1` multi-faction 3-state system, vector asteroids) and UI assets
      under `src/assets/`.
- [x] **P0.10 — Testing + CI infrastructure.** Deno pure-logic suite, Rust
      game-rule tests, Python pipeline tests, GitHub Actions workflow.
- [x] **P0.11 — Tooling/build setup.** Deno task runner, Vite config, Tauri
      config, strict `tsconfig.json`.
- [x] **P0.12 — Shared cross-scene game-state module.** The `gameState`
      singleton (subscribe/notify) both scenes import, synced from
      `load_game_state` during the loader phase; scenes tolerate slow/failed
      loads (AGENTS.md § Startup / loader phase).
- [x] **P0.13 — Dev-speed build/run target.** `deno task dev:fast` scales every
      scheduler timer (production, build/hire, mining, vessel travel) through
      the startup `--time-scale 5` argument; normal `deno task tauri dev` is
      unaffected.
- [x] **P0.14 — Raster/AI-art → vector migration.** Mothership-1, vessel-1 with
      its multi-faction/idle-flourish system, module-base, 64-frame tumbling
      asteroids, selection reticles, and ship interior tiles use P0.9's
      SVG/`rsvg-convert` pipeline; `deno task gen-art` regenerates every sheet
      in one command.

## Phase 1 — Core gameplay loop

Goal: a playable single-player loop, no persistence yet.

- [x] **P1.1 — Resource state + production tick.** The 4 resources as
      server-authoritative state with periodic production.
- [x] **P1.2 — Resource bar HUD group.** Screen-top resource counts with live
      label updates.
- [x] **P1.3 — Module placement + build timers.** Empty-tile Build placement UI
      backed by a server-verified build-timer event.
- [x] **P1.4 — Module catalog.** Rust-authoritative `MODULE_CATALOG` (cost,
      build time, production per type) with a display-only TS mirror.
- [x] **P1.5 — Local notifications + server-push channel.** Server-owned
      notification feed streamed to the client over a scheduler-driven push
      channel.
- [x] **P1.6 — Mining loop.** Server-seeded asteroids with single-slot mining
      jobs, scheduler auto-recall at mine-out, and dock-side deposits.
- [x] **P1.8 — Zoom-at-cursor.** Wheel/pinch zoom anchored at the pointer/pinch
      midpoint, clamped so the camera never drifts at min/max zoom.
- [x] **P1.9 — Minimap + full-size space map.** Geometry-only 1000\*1000 space
      map with minimap navigation (entity dots, viewport rect, tap-to-jump).
- [x] **P1.10 — Crew Quarters + crew capacity.** Crew as the third catalog stat:
      berths, timed recruitment, HUD surfacing, a 0-crew start, and explicit
      per-module assignment.
- [x] **P1.11 — Storage Bay capacity caps.** Per-resource caps as a catalog
      `stores` field, enforced server-side as protected stockpile thresholds;
      passive production pauses at the threshold while explicit gains may create
      exposed surplus. The resource bar shows count/cap.
- [x] **P1.12 — Trading Post + NPC shop.** Server-generated daily deal slots on
      the new Trading Post module (give ≠ get, rarity-boosted gets, a once-daily
      freebie, doubling-cost refreshes, slot count scaling with the post's
      level) — credits' entry into the economy.
- [x] **P1.13 — Map interest area: windowed world streaming + minimap
      declutter.** The client only holds world entities inside a 100\*100-tile
      AOI window (re-centered as the camera pans), with pushes footprint-
      filtered and the map view capped so unloaded space never scrolls into
      sight.
- [x] **P1.14 — Modal dialog/overlay system.** Screen-space modal layer (scrim +
      framed panel + row/cell content) opened via `TiledScene.openDialog()`,
      with generic scrolling and a pinned header row.
- [x] **P1.15 — Toast/snackbar notifications.** General transient-message
      primitive: an auto-fading bottom-center snackbar stack for info/error
      messages, rendered above the modal layer; every rejected player-action
      request surfaces an error toast (background request rejections stay
      console-only by design).
- [x] **P1.16 — Entity details panel.** The map's four "Details" stubs
      (own/enemy mothership, vessel, asteroid) open live modal panels rendered
      from `gameState`.
- [x] **P1.18 — One module per type.** Building rejects a second module of a
      type the player already owns; the build-offer UI hides those types.
- [x] **P1.19 — Toast on every notification.** Every server-push notification
      surfaces a toast on the active scene, not just rejected actions.
- [x] **P1.20 — Ship module details dialog.** Extends the P1.16 details-panel
      pattern to every ship module: level, a live build/upgrade countdown, and
      per-type stats (crew-staffing damped production, crew berths, next-level
      cost).
- [x] **P1.21 — Notifications tab (Mail panel, part 1).** Real scrollable-list
      dialog over the P1.5 feed; the bottom-right HUD action is "Mail". The
      dialog system provides generic scrolling and a pinned header row to the
      dialog system for any panel to use.
- [x] **P1.22 — Basic mothership warp/relocation.** Wires up the P1.16 Warp
      button: a draggable 4\*4 footprint picker (live occupancy + fuel-cost
      readout) relocates the mothership instantly via a server-verified command;
      occupancy/cost are re-verified against live state regardless of what the
      client's preview showed.
- [x] **P1.23 — Command Module & module vector art foundation.** Replace the
      shared `module-base` raster placeholder (`module-art-type: "base"`) with
      bespoke animated vector interior graphics for the Command Module
      (`command`), supporting a 6\*6 footprint with tiered visual upgrades
      across levels (e.g. expanding console decks, holographic tactical
      projections, and reinforcements). Establishes the 64-frame (`~4.2s` loop)
      vector animation standard for all interior rooms. Needs P0.9, P1.4.

## Phase 2 — Persistence and balancing

Goal: game state survives a restart, and the stubbed numbers become real.
Balancing lives in this phase because progression tuning requires persistent
progress. Durable and server contracts live in `SERVER.md`.

- [x] **P2.2 — Notification message structure.** Typed notification payloads,
      source event IDs, client formatting, durable movement completion markers,
      and per-player audience routing.
- [x] **P2.1 — Multi-account local-system save/load.** Versioned JSON snapshots
      persist the complete local system, with launch-selected developer
      profiles, deterministic clear spawns, exclusive ownership, backups, and
      recovery.
- [x] **P2.3 — Versioned save format + validation.** Version-dispatched save
      decoding, explicit future-version rejection, semantic validation, and
      hand-authored fixtures protect local-system snapshots. The first Phase 3
      durable-domain schema change supplies the first production migration under
      P3.1's contract; P4.0 and P4.3 build on this boundary.
- [x] **P2.4 — Autosave + recovery.** Revision-aware atomic snapshots at
      command/scheduler boundaries plus a best-effort exit flush; five rolling
      backups, rejected-file preservation, automatic fallback, and
      `--restore-backup <1..5>`.
- [x] **P2.5 — Deterministic offline catch-up.** System-wide, stable-order
      recovery advances meaningful deadlines, silently fills durable feeds, and
      caps/re-anchors offline progress at 24 hours.
- [x] **P2.6 — Balancing pass.** Server-authoritative, versioned balance catalog
      for progression, crew, storage, asteroid mining, and module costs/timers;
      level-30 module cap; radial asteroid grades and outer-band spawning.
- [x] **P2.7 — Diminishing returns.** Mining's extraction time, travel,
      single-slot deposits, and fleet cap already provide the intended soft
      limit. Battle/raid tuning remains with combat → P6.3.
- [x] **P2.8 — Crew understaffing UX pass.** Server-verified per-module
      assignment controls, visible allocation/output, a 1-minute hire, and the
      `(assigned + 1) / (required + 1)` unstaffed baseline; Trading Post
      operation requires its one assigned crew member.
- [x] **P2.9 — Storage Bay production-boost perk.** A staffed Bay grants +5%
      passive building production per settled level; capacity remains
      unconditional and mining is unaffected.
- [x] **P2.10 — Developer reset controls.** Local startup-only profile/system
      reset, player listing, and timer-speed controls with explicit logs and CLI
      validation. These controls remain local-only and do not enter P4.6's
      online session protocol.
- [x] **P2.11 — Surface asteroid resource grade.** Asteroid actors show their
      radial grade and Details explains its deposit multiplier.
- [x] **P2.12 — UI defect cleanup.** Compact, screen-safe build offers;
      consistent recruitment timing; recovery icons; human-readable Mail module
      names; and per-module storage Details.
- [x] **P2.13 — Protected storage overflow.** Storage caps are protected
      thresholds: mining and deal gains retain an exposed surplus while passive
      production pauses at the threshold; HUD and asteroid Details explain it.
      P6.3 may loot only exposed surplus.

## Phase 3 — Local playable alpha

Goal: prove that Voidbound is understandable, engaging, and worth returning to
before freezing its design behind network infrastructure. The target is a
complete local single-player arc, with optional asynchronous same-device players
sharing one persisted system. Rust remains authoritative, all mutations keep the
multiplayer-ready event pattern, and the existing snapshot/revision/scheduler
boundaries remain intact; WebSockets, authentication, remote databases, and
simultaneous clients are deliberately deferred to Phase 4. **See `PHASE3.md` for
the full design** — mechanic sketches, wire shapes, the non-negotiable product
values, the capital-fiction working direction, and the decision gates still open
before numeric tuning. P3.9 composes the Chapter-1 experience from the
objective, prerequisite, research, vessel, and expedition systems. P3.21 is the
final Phase 3 gate and therefore follows P3.22-P3.24 despite its lower ID. P3.24
lands before P3.9/P3.11; IDs remain stable rather than being renumbered.

- [ ] **P3.1 — Playable-alpha experience specification.** Write the product
      target before adding more systems (`PHASE3.md` §1, §4, §8-§10): the
      intended first 30 minutes, first 3 hours, several-day arc, a
      simulation-ready resource/fuel/reward/time budget, a content-authoring
      budget, the P3.12 arena contract, and concrete playtest acceptance
      criteria. For every new durable domain, specify ownership/lifecycle, save
      migration + validation fixture, offline settlement, retention, and
      revisioned snapshot/push/apply contract. Define the profile-vs-system
      ownership matrix, a versioned server-delivered content-catalog contract
      for every client preview, interactive expedition choices/NPC contacts,
      P3.22's offline-return briefing, and numeric P3.21 sample sizes and exit
      thresholds. Commit a reproducible, versioned simulation artifact with
      fixed scenarios and explicit normal/accelerated time assumptions. Confirm
      the intentional rule that mothership warp requires recalling every vessel,
      despite otherwise per-vessel dispatch availability. This is a design-
      review gate for P3.3-P3.13, P3.20, and P3.22-P3.24, not a promise to
      implement every possible campaign feature. Incorporate README's five-zone
      geography, search lifecycle, asteroid level/size formulas, and raider
      counter/progression rules; resolve `PHASE3.md` §9's remaining search,
      mining, and raider gates and model the proposed numeric curves.
- [ ] **P3.2 — In-app local profile flow.** Replace launch-flag-only identity
      selection with a pre-load profile chooser that can create, select, and
      inspect local players in the shared persisted system. A profile may also
      publish a defense snapshot for P3.12's local asynchronous arena
      (`PHASE3.md` §5 P3.2) — design for that from day one. Identity remains
      fixed after the game loads and only one local process/session owns the
      world at a time: this is asynchronous same-device play, not simultaneous
      LAN multiplayer. Preserve the P2.10 developer CLI controls.
- [ ] **P3.3 — Objectives, rewards, and first-run onboarding.** Add persistent,
      event-modeled objectives that make the next useful action visible and
      grant authoritative rewards (`PHASE3.md` §6.1 defines the shared wire
      shape). Establish the claim framework and author the strict-linear first
      five objectives using existing systems: stabilize; hire crew; build/staff
      a producer; mine and return; trade. P3.9 composes the remaining Chapter-1
      steps once their systems exist. Needs P3.1, P1.3, P1.6, P1.10, P1.12.
- [ ] **P3.4 — Research Lab + tech tree.** Spend resources to unlock module
      blueprints, vessel stat upgrades, expedition capabilities, and efficiency
      bonuses across three parallel branches gated by Command Module level —
      growth/development, economy, battle/military (`PHASE3.md` §5 P3.4), not
      one linear tree. Needs P3.1, P1.4.
- [ ] **P3.5 — Live countdown-details controller.** When P3.4 introduces the
      third 1 Hz state-bound details dialog, extract the shared open/close,
      `bindDialogRows`, and per-second rebuild lifecycle from the map and ship
      module panels. Preserve scene-owned tick dispatch and avoid adding another
      controller copy. Needs P1.16, P1.20, P3.4.
- [ ] **P3.6 — Module build prerequisites.** Generalize `unlock_command_level`
      into explicit prerequisites: other modules at a level, research, items, or
      objectives. Show unmet reasons instead of silently hiding a module.
      Command Module level-ups also mechanically unlock new usable interior room
      bands/slots through this same prerequisite UI (`PHASE3.md` §5 P3.6, §5
      P3.17) — not merely an art treatment. Move stopgap Command Module gates,
      including the Trading Post's level-3 gate, onto the richer system where
      the campaign design calls for it. Needs P1.4, P3.3, P3.4.
- [ ] **P3.7 — Vessel Shipyard + vessel stats and multi-tier progression.** Add
      a durable owned-vessel roster, replacing the transient dispatch-created,
      return-despawned vessel records. Every vessel has an ID, hull/tier,
      loadout, crew, damage, location, and visible status; dispatch explicitly
      selects a legal vessel and the ship sidebar reports the whole fleet. Add
      upgradeable durability, damage, cargo capacity, and speed in place of the
      flat vessel constants, as a small number of crew-linked, legible
      specializations rather than a broad collectible-hero system (`PHASE3.md`
      §5 P3.7 — a non-gacha named-captain layer stays a deliberately open later
      door, not P3.7 scope). Research and Shipyard upgrades unlock higher tiers
      (`vessel-2`, `vessel-3`) or specialized hulls within the existing faction
      and animation-state system; starter combat loadouts and a durable,
      non-random kinetic/drone/plasma component inventory support P3.11 before
      P6.2 adds the full weapon economy. Vessel crews tie dispatch, mining, and
      combat capacity to the player's crew pool. Needs P1.6, P3.4.
- [ ] **P3.8 — Expeditions + fuel economy.** Design and implement repeatable
      exploration, scouting, and salvage missions per `PHASE3.md` §5 P3.8 and
      §6.2's wire shape: a fixed relay-fragment first target with a guaranteed
      NPC-relationship + Research-Lab-blueprint outcome, a weighted outcome
      table from the second expedition on, research-gated slot capacity,
      diminishing returns for repeated targets, and a per-target survey-
      progress track that guarantees bounded progress regardless of the roll.
      Adverse outcomes cost cargo/fuel/time or impose a repairable vessel-damage
      state — never an outright vessel loss. Settle fuel's broader role across
      dispatch, expeditions, and P1.22 warp without adding a hard daily-energy
      cap; exact odds/formulas wait on `PHASE3.md` §8's simulation model. Add
      authoritative awaiting-choice outcomes with expiry/default behavior and a
      durable first NPC contact that explains the Research Lab unlock and next
      route. Needs P3.1, P3.4, P3.7, P1.22.
- [ ] **P3.24 — Searchable POIs + asteroid level progression.** Implement
      `PHASE3.md` §6.14: mothership-centered search, reuse before spawning,
      unused-POI expiry, reservation-safe offline settlement, footprint-safe
      spawn/warp, and AOI-visible results. Replace seeded-field mining with
      flavor + levels 1-12 + size tiers I-III: 600 base deposit, level doubling,
      1/4/9 size multipliers, 9:3:1 occurrence weights, and 1 resource/second
      starting extraction with research/vessel upgrades. Migrate existing saves,
      deliver authoritative previews, define cargo/recall behavior, and update
      the first mining objective. Radius (~50 tiles), expiry clock details, and
      tuning require P3.1 approval. Supplies P3.11's raider search substrate;
      permanent campaign landmarks retain their own lifecycle. Needs P3.1, P3.7,
      P3.8. Lands before P3.9 and P3.11.
- [ ] **P3.9 — Chapter-1 completion + branching handoff.** Complete the
      strict-linear chapter begun in P3.3: Command Module upgrade opens usable
      room slots; fixed relay-fragment expedition; Research Lab construction;
      first research choice; then a normal weighted second expedition with
      target-specific survey progress. Only then open Chapter 2's concurrent
      optional economy, research, and sector milestones. This composes existing
      systems; it does not create a second objective engine. Needs P3.3, P3.4,
      P3.6, P3.8, P3.24.
- [ ] **P3.10 — NPC world schema + outer-sector vertical slice.** Turn P2.6's
      four approach zones and reserved central district into a data-driven solo-
      progression model, then ship one complete outer-sector slice with an NPC
      contact, hazard, guarded route/resource, expedition target, moon/planet
      landmark, and capital clue (`PHASE3.md` §5 P3.10, §6.13). Campaign
      discoveries, relationships, bosses, and route state are profile overlays;
      physical geography and asteroids remain shared-system state. NPC decisions
      remain authoritative and use future-compatible event shapes. P3.11 adds
      combat and P3.23 fills the approved campaign content budget. Needs P3.1,
      P3.4, P3.7, P3.8, P2.6.
- [ ] **P3.11 — PvE combat vertical slice.** Establish reusable combat rules
      (`PHASE3.md` §5 P3.11, §6.11): select a fitted vessel and starter
      kinetic/drone/plasma loadout, dispatch it, and resolve authoritatively —
      no real-time micromanagement. Legible previews (a named readiness tier
      plus a numeric Power value, never replacing the underlying config/route
      detail), damage and recovery, loss/failure without an unrecoverable save,
      and a combat report that names the next adjustment on a loss. Basic
      dock-side recovery belongs here; the specialized Repair Shop remains P6.4.
      Keep the resolver opponent-agnostic so P3.12 can reuse it unmodified. Add
      the searchable solo-raider progression: starter-beatable level 1, victory
      at N unlocks N+1, uncapped levels with 1.25x baseline difficulty growth,
      and kinetic > plasma > drone > kinetic counters. Persist profile victory
      credit exactly once; tune repeat/first-win rewards through P3.1 rather
      than assuming the arena daily ladder. Authored bosses remain P3.23. Keep
      player raiding, contested player asteroids, anti-cheat, and online
      concurrency in P6.3. Needs P3.7, P3.8, P3.10, P3.24.
- [ ] **P3.12 — Local asynchronous defense arena.** Add a same-device
      asynchronous PvP proof (`PHASE3.md` §5 P3.12, §6.12): a profile publishes
      an immutable defense snapshot (vessel loadout + crew assignment); another
      local profile, or a curated NPC/ghost defense before real opponents exist,
      challenges it through P3.11's resolver. Persist each profile's opt-in
      snapshot, daily cost/attempt ledger, component inventory, and capped
      result history; expose only a narrow opponent-list payload. A challenge
      copies an operational attacker's loadout and never dispatches, damages, or
      occupies either vessel. Reads across profiles but never mutates the
      defender — no looting, no live opponent, no shared-world contention. Wins
      grant deterministic kinetic/drone/plasma components on a daily bounded
      reward ladder (first free, progressively costlier, later attempts
      practice-only); losses grant nothing material. Needs P3.2, P3.7, P3.11.
- [ ] **P3.13 — Local campaign completion + ascension.** Give the sector a
      recognizable end condition — reaching the center and defeating a major
      threat — then offer a deliberately designed ascension loop (`PHASE3.md` §5
      P3.13): cosmetics/badges, historical ship identity, a better first
      expedition, and a capped ascension-research tree the player chooses a
      branch of, not a resource stockpile that makes a fresh player irrelevant.
      Specify exactly what resets before touching saves; study finite
      prestige/New-Game+ references first, since no researched peer game
      supplies a completion template. This validates the shape of later online
      seasons without requiring cohort worlds or world merging. Ascension may
      reset only the active profile and its campaign overlay, never the shared
      physical system or another profile; define active-action preconditions and
      profile-scoped confirmation/recovery first. Needs P3.2, P3.9, P3.10,
      P3.11, P3.23.
- [ ] **P3.14 — Dialog columns + Trading Post redesign.** Generalize dialog
      layout with a real multi-column grid, then render the P1.12 shop as three
      columns of bordered deal boxes: rarity-colored border and separate
      get/give rows. Later Mail and Events panels can reuse the layout. Needs
      P1.12, P1.14.
- [ ] **P3.15 — Minimap two-tier zoom revamp.** At normal zoom show the live
      100\*100 AOI window; zoomed fully out, show the 1000\*1000 system with
      player/NPC markers, regions, objectives, and interest-area outlines but
      omit individual asteroids. Needs P1.9, P1.13, P3.3, P3.10.
- [ ] **P3.16 — Context-sensitive resource bar + detail dialog.** On the ship,
      show the three construction materials plus crew; on the map, show fuel.
      Tapping either group opens the complete resource/cap/production breakdown.
      Needs P1.2, P1.10, P1.11.
- [ ] **P3.17 — Per-type module art and tiered visual progression.** Replace the
      shared `module-base` placeholders with bespoke 64-frame animated vector
      rooms across the current catalog and Phase 3's Research Lab and Vessel
      Shipyard, with visible tier upgrades as levels rise. This is where P3.6's
      room-band unlock becomes visible: a Command Module level-up should visibly
      open new interior tile rings, room slots, or ship regions (`PHASE3.md` §5
      P3.17). Needs P1.23, P3.4, P3.7.
- [ ] **P3.18 — Space map art and visual readability.** Add a real starfield and
      per-class/per-tier asteroid sprites. Asteroid resource class must remain
      distinguishable by shape rather than tint alone; extend the same visual
      language to P3.10 regions, hazards, and NPC affiliations. Needs P1.9,
      P3.10, P3.23.
- [ ] **P3.19 — Audio.** Add ambient/music plus SFX for input, construction,
      hiring, vessels, mining, objectives, expeditions, and combat. Provide
      independent volume controls and a mute path.
- [ ] **P3.20 — Progressive crew recruitment cost.** Replace the flat biological
      price with a readable curve that rises gradually with population, include
      it in the wire-delivered balance catalog, and tune it against campaign
      progression. Needs P3.1.
- [ ] **P3.22 — Offline-return briefing + campaign journal.** On profile load
      after meaningful elapsed time, summarize completed actions once, point to
      the next available decision, and retain inspectable contacts, discoveries,
      clues, and reports in a lightweight journal. Derive the briefing from
      durable action/entity state plus typed notifications, keep a per-profile
      presentation cursor, and never replay historical push toasts or create a
      second authority beside game state. Needs P3.1, P3.3, P3.4, P3.8, P3.10,
      P3.11.
- [ ] **P3.23 — Authored sector campaign content.** Fill P3.1's approved content
      budget using P3.10's schema and P3.11's resolver: the remaining named
      approach sectors, target variants, relationships, NPC behaviors, hazards,
      routes, capital clues, optional milestones, and authored approach to
      P3.13's major threat. Deliver versioned data in reviewable tranches with a
      content validator and explicit runway coverage. Needs P3.3, P3.4, P3.8,
      P3.9, P3.10, P3.11.
- [ ] **P3.21 — Structured local-alpha playtest + rebalance.** Run repeated
      fresh-profile tests at normal and accelerated time across the first 30
      minutes, first 3 hours, offline return, and campaign completion. Record
      confusion, dead time, dominant choices, unrecoverable states, and weak
      rewards; revise balance and UX until P3.1's acceptance criteria hold
      (`PHASE3.md` §10 has the full acceptance-test and instrumentation
      checklist). Treat an abrupt post-onboarding wait/prerequisite wall as a P0
      finding, and report first-session vs. multi-hour-return cohorts separately
      rather than averaging them. Exercise multiple same-device profiles in one
      shared system as a separate test, without treating it as proof of
      simultaneous multiplayer. Record raw sessions and pass/fail summaries in
      P3.1's versioned format; accelerated completion does not replace normal-
      time return-cadence samples. Needs the playable path through P3.2-P3.20,
      plus P3.22-P3.24. Validate search expiry/AOI/warp behavior, mining cargo
      and upgrade pacing, raider unlocks, and starter-loadout victories.

## Phase 4 — Networked server-authoritative events

Goal: after the local game proves its loop, put the existing authoritative event
pattern onto a real network transport per `SERVER.md`.

- [ ] **P4.0 — Standalone server + durable event-storage foundation.** Extract
      the authoritative Rust domains behind a network-service boundary and add
      the relational persistence model `SERVER.md` specifies: embedded SQLite
      for local network development, PostgreSQL in production, ordered schema
      migrations, transactional per-system event log, materialized snapshots,
      durable outbox, idempotency keys, and startup recovery. Preserve the
      separation between persistent state, runtime delivery state, and client
      projections; Phase 2 save files are not imported into online accounts.
      Needs a completed P3 local-alpha gate.
- [ ] **P4.1 — WebSocket event bus.** Server verifies, timestamps, and
      broadcasts events; clients feed them into the existing `apply*Event` entry
      points. Local action methods switch from "request + apply response" to
      "send request + apply broadcast". Add rate limits and generalize P1.13's
      single-client AOI into per-connection windows at the outbox drain loop.
      Consume P4.0's durable outbox and ordered event sequence rather than an
      in-memory-only queue. Needs P2.2, P4.0.
- [ ] **P4.2 — Server-time-offset handshake.** Clients never trust `Date.now()`;
      pair a ping/pong-derived offset with the authoritative timestamps already
      carried by events. Needs P4.1.
- [ ] **P4.6 — Login / player identity.** Add accounts and authentication; the
      client learns its immutable session identity from the server instead of a
      local profile seed. Integrate with the loader phase and authenticated
      socket; authorization scopes every command, subscription, mail recipient,
      and public profile projection. Needs P4.0, P4.1.
- [ ] **P4.3 — Snapshot + replay for late joiners.** Send an authenticated
      player's snapshot plus log suffix on join, replayed through the normal
      apply entry points. The client half already handles aged events. Needs
      P4.1, P4.6; builds on P2.3.
- [ ] **P4.7 — Communication moderation + player safety.** Add reporting,
      blocking/muting, moderation-audit history, rate limits, moderation actions
      and appeals, privacy-safe retention, and anti-harassment escalation for
      mail, future chat/alliance recruitment, and public profiles. Define
      child-safety and data-retention policy before opening broad public
      communication. Needs P4.6.
- [ ] **P4.4 — Mail: Player Mail + System Mail.** Wire the two disabled P1.21
      tabs for cross-player messages and server/GM announcements. Notifications
      remain a separate existing tab, and P7.1 Events remains curated live
      content. Needs P4.1, P4.6, P4.7, P1.21.
- [ ] **P4.5 — Production hardening + operations.** Set a real CSP in
      `tauri.conf.json`, drop the unused `withGlobalTauri: true`, and define the
      public deployment's TLS/proxy boundary, secret handling, health/readiness
      checks, structured logs, metrics/alerts, database backups, restore drill,
      and migration rollback procedure before the first networked release. Needs
      P4.0, P4.1.

## Phase 5 — Alliances, online worlds, and economy

Goal: add the social and population-dependent MMO layer after network sessions
exist.

- [ ] **P5.1 — Alliance Embassy gameplay.** Joining, contribution, and alliance
      boosts; alliance entities join the P1.13 always-sent AOI exemption. Ship
      membership, roles, presence, communication, cooperation, and transparent
      governance tooling before hard-coding player etiquette rules (`PHASE3.md`
      §11); any temporary ministry-position convenience bonuses must be
      optional, modest, transparent, and automatically fair-rotated by default,
      never required for progression or a durable power monopoly. Needs P4.1,
      P4.4, P4.6, P4.7.
- [ ] **P5.2 — Alliance territories + contested center progression.** Extend
      P3.10's solo radial regions with alliance ownership, cooperative
      objectives, contested resources, and alliance-gated access toward the
      center. A future capital capture-and-hold event (`PHASE3.md` §11) is a
      design hypothesis for this boundary, not scoped here — needs its own
      fairness design pass (time-zone equity, participation limits, defender
      recourse, anti-snowball rules) before any implementation; avoid choices
      here that would make that later design harder (e.g. a capital capturable
      by a single solo action rather than an NPC-defended objective). Add shared
      projects, contribution attribution, cooperative NPC operations,
      reinforcement, and rally preparation here so alliance play has a positive
      shared-purpose loop before adversarial PvP. P5.10 owns playable elite
      raids and their progression/reward contract. Needs P5.1, P3.10, P3.11.
- [ ] **P5.3 — Operations Center: fog of war / radar.** Tie map visibility and
      vessel speed to module level, shrinking P1.13's AOI projection to the
      player's radar while preserving owned/alliance exemptions. Needs P4.1,
      P4.6, P5.1.
- [ ] **P5.4 — Cohort worlds.** Place new players in systems populated by peers
      who started around the same time. Needs P4.6.
- [ ] **P5.5 — Online seasons and world merging.** Move surviving players into
      new systems after a time or milestone, including merges and carry-over
      bonuses. Use P3.13's local ascension findings rather than assuming its
      reset rules transfer unchanged. Needs P5.4, P3.13.
- [ ] **P5.6 — Credits economy / player trade.** Extend P1.12's NPC deals into
      player and alliance trade; also settle higher-level exchange advantages
      and featured/limited-stock deals. Design before implementation. Needs
      P1.12, P5.1.
- [ ] **P5.7 — Alliance-aware warp + warp core item.** Make relocation useful
      for joining an alliance position and replace the temporary fuel cost with
      one warp core, introducing the minimal item type used later by P7.4. Needs
      P5.1, P1.22.
- [ ] **P5.8 — General item/credits shop.** Wire the HUD Shop to a standalone
      **earned-credits-only** store for general goods, distinct from Trading
      Post resource exchanges. It is not a real-money storefront; any later paid
      extension requires P5.9 first. Needs P1.12, P5.6.
- [ ] **P5.9 — Monetization model.** Decide whether real-money purchases fit
      Voidbound at all. The working constraint (`PHASE3.md` §2, §11) is no
      real-money purchase that grants gameplay power; cosmetics and non-powerful
      convenience remain open within that boundary. This decision must precede
      any real-money extension of P5.8; paid fleet capacity is out of bounds.
- [ ] **P5.10 — Alliance elite PvE raids.** Build cooperative NPC encounters on
      P5.2's rally foundation (`PHASE3.md` §11). Initiating elite level N
      requires victory at elite N-1; level 1 is initially available. Alliance
      members may join above their own initiation ceiling. Difficulty grows 1.5x
      per level, separately from solo raiders. Decide assisted-win unlock
      credit, scaled stats, participant limits, assembly/travel/abort rules,
      reservations and expiry, offline resolution, rewards, and recoverable
      losses before implementation. Needs P5.1, P5.2, P3.11, P3.24; no player
      raiding or capital-control event is implied.

## Phase 6 — Weapons, PvP combat, and defence

Goal: expand the local progression/combat foundation into adversarial online
combat and the README's remaining Technologies, Combat, and Defence modules.

- [ ] **P6.1 — Fabrication Bay, Assembly Line, Data Archive.** Apply speed/cost
      multipliers respectively to module builds, weapon production, and
      research. Needs P3.4; the Assembly Line effect also needs P6.2.
- [ ] **P6.2 — Weapons Factory, Drone Factory, Plasma Factory + Armory.** Add
      kinetic, drone, and plasma production feeding P3.7 vessel capacity, plus
      Armory weapon storage. Event-model every production action. Needs P3.7.
- [ ] **P6.3 — PvP combat resolution.** Extend P3.11's combat rules to player
      motherships and vessels with server-authoritative outcomes, crew
      casualties, contested-asteroid resolution, and explicit defender recourse.
      Design raiding separately: only P2.13's exposed surplus may be looted,
      never protected stock. Apply the decided 72-hour new-player protection
      bubble (`PHASE3.md` §11): it ends early only when that player initiates an
      active, synchronous PvP action, not on a passive timer alone — an accepted
      tradeoff, not an oversight, since experienced/ascended players can play
      around it deliberately. Needs P4.1, P4.6, P4.7, P3.11, P6.2.
- [ ] **P6.4 — Repair Shop.** Repair weapon/vessel damage using resources and
      time, following the build-timer pattern. Needs P6.3.
- [ ] **P6.5 — Hangar Bay.** Station weapons and vessels as passive mothership
      defence. Needs P6.3.
- [ ] **P6.6 — Shield Generator.** Absorb combat damage; a breached shield
      forces the mothership to warp and relocate. Needs P6.3.
- [ ] **P6.7 — Vessel fleet-cap scaling.** Replace the flat `MAX_VESSELS` 20
      stopgap with a base cap plus Hangar Bay, Armory, and research increases.
      Fleet capacity is gameplay power and is never a paid entitlement. Needs
      P3.4, P6.2, P6.5.
- [ ] **P6.8 — Online asynchronous arena.** Move P3.12's snapshot challenge onto
      authenticated profiles with fair opponent discovery, eligibility bands,
      seasonal/capped ranking, deterministic rewards, abuse prevention, and no
      looting or defender mutation. Preserve the one-vessel P3 resolver unless a
      separately reviewed formation design justifies expanding it. Needs P3.12,
      P4.6, P4.7.

## Phase 7 — Online content, presentation, and platforms

Goal: ship the remaining panels, platform work, and presentation features that
do not gate the local-alpha gameplay evaluation.

- [ ] **P7.1 — Curated Events panel.** Add server-curated live content such as
      holiday specials and cooperative contests, with definitions, scheduling,
      participation, rewards, and its own HUD button. Published rules, capped
      accessible rewards, a nonattendance-safe baseline, and no cash-shop/FOMO
      escalation are acceptance requirements. This is distinct from Mail
      notifications and requires a design-review pause. Needs P1.21, P4.1, P4.6,
      P4.7.
- [ ] **P7.2 — Mobile builds (Android/iOS).** Bring up
      `deno task tauri android|ios`, then verify portrait layout, touch input,
      performance, persistence, and audio on device.
- [ ] **P7.3 — HTTP fallback for `generate_map`.** Put a fetch-based map source
      behind the existing `buildTileMap` signature to unlock the planned web
      build. This is platform work, not a networking-phase dependency. Update
      AGENTS.md's Platform note when it lands.
- [ ] **P7.4 — Items/inventory panel.** Wire the HUD Items button to a panel for
      non-resource items, beginning with P5.7's warp core. Needs P5.7.
- [ ] **P7.5 — Mothership warp-out/warp-in animation.** Replace P1.22's instant
      visual teleport with clear transitions at the old and new positions. Needs
      P1.22.
- [ ] **P7.6 — Canonical ship interior layout.** Rearrange `ship-level.tmj` and
      room-grid coordinates into a capital-ship layout matching the mothership
      hull: Command Citadel at the bow, personnel/hydroponics on the wings,
      trade/storage by docks, and engineering/reactors aft. Needs P1.23.
