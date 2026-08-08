# Voidbound Roadmap

Development phases for the game design described in `README.md`. Settled design
principles live there; this file tracks the order features land in. Later phases
build directly on earlier ones — in particular, everything in phase 3 assumes
actions are already event-modeled (see the multiplayer-ready event pattern in
`AGENTS.md`; the server model is sketched in `SERVER.md`). Phase 0 is the
engine/tooling scaffolding all of that already sits on.

**How to use this file:** tasks have IDs (`P<phase>.<n>`) so sessions and
commits can reference them — check off a task when it's committed and
`deno task format` + `deno task check` + `deno task lint` + `deno task test`
pass. IDs are normally stable even when a task moves phase (e.g. P1.7 kept its
historical ID when it first moved); the Phase 3-7 IDs were deliberately
renumbered in August 2026 when the local playable-alpha phase was inserted ahead
of networking. Within a phase, tasks are listed in rough dependency order, but
anything without an explicit "needs" note can be picked up independently. Done
items keep only a one-line summary; any follow-up work gets its own task ID
(marked "split from P<phase>.<n>") in whichever phase it belongs to, rather than
living on as a note on the finished task. Implementation detail lives in
`AGENTS.md`, `SERVER.md`, and the commit history.

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
- [x] **P0.14 — Raster/AI-art → vector migration.** Mothership-1 (was `ss1`),
      vessel-1 (was `cs1`, plus its multi-faction/idle-flourish system),
      module-base, asteroids (now 64-frame tumbling), selection reticles, and
      ship interior tiles all moved to the SVG/`rsvg-convert` pipeline P0.9
      established; `deno task gen-art` regenerates every sheet in one command.

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
- **P1.7 — Diminishing returns.** Moved to Phase 2 as P2.7 (July 2026) — a daily
  damping curve can't be experienced or tuned while restarts wipe state.
- [x] **P1.8 — Zoom-at-cursor.** Wheel/pinch zoom anchored at the pointer/pinch
      midpoint, clamped so the camera never drifts at min/max zoom.
- [x] **P1.9 — Minimap + full-size space map.** Geometry-only 1000\*1000 space
      map with minimap navigation (entity dots, viewport rect, tap-to-jump).
- [x] **P1.10 — Crew Quarters + crew capacity.** Crew as the third catalog stat:
      berths, timed recruitment, HUD surfacing, and a 0-crew start. P2.8 later
      replaced the initial pooled staffing rule with explicit module assignment.
- [x] **P1.11 — Storage Bay capacity caps.** Per-resource caps as a catalog
      `stores` field, enforced server-side on production and mining deposits
      (current mining overflow is lost and notified); the resource bar shows
      count/cap. P2.13 reframes caps as protected stockpile thresholds instead
      of deleting an explicit gain.
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
      request now surfaces an error toast (background request rejections stay
      console-only by design).
- [x] **P1.16 — Entity details panel.** The map's four "Details" stubs
      (own/enemy mothership, vessel, asteroid) now open live modal panels
      rendered from `gameState`.
- [x] **P1.17 — Fix: vessel-recall cargo not reflected client-side.** Invalid —
      not reproducible (July 2026); closed without a code change.
- [x] **P1.18 — One module per type.** Building rejects a second module of a
      type the player already owns; the build-offer UI hides those types.
      (Playtest feedback, July 2026)
- [x] **P1.19 — Toast on every notification.** Every server-push notification
      now surfaces a toast on the active scene, not just rejected actions.
      (Playtest feedback, July 2026)
- [x] **P1.20 — Ship module details dialog.** Extends the P1.16 details-panel
      pattern to every ship module: level, a live build/upgrade countdown, and
      per-type stats (crew-staffing damped production, crew berths, next-level
      cost). (Playtest feedback, July 2026)
- [x] **P1.21 — Notifications tab (Mail panel, part 1).** Real scrollable-list
      dialog over the P1.5 feed, replacing the console dump; the HUD's old
      "Events" button is now bottom-right "Mail". Added generic scrolling and a
      pinned header row to the dialog system for any panel to use.
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
Balancing lives in this phase because progression tuning is only meaningful once
progress persists — the reason P1.7 moved here.

The pre-implementation planning companion was reconciled and retired after the
phase. Keep task status and completion notes here; keep durable/server contracts
in `SERVER.md`.

**Phase 2 review:** whole-repository review findings and fixes landed in
`f36463f..120cca9`; its remaining optional details-dialog refactor moved to
P3.5, and the planning audit promoted P2.13.

- [x] **P2.2 — Notification message structure.** Typed notification payloads,
      source event IDs, client formatting, and durable movement completion
      markers. Still open: per-player persistence and audience routing → P2.1;
      socket delivery → P4.1.
- [x] **P2.1 — Multi-account local-system save/load.** Versioned JSON snapshots
      persist the complete local system, with launch-selected developer
      profiles, deterministic clear spawns, exclusive ownership, backups, and
      recovery. Still open: exhaustive version migrations/validation → P2.3;
      shutdown and recovery diagnostics hardening → P2.4; deterministic offline
      replay → P2.5.
- [x] **P2.3 — Versioned save format + validation.** Version-dispatched save
      decoding, explicit future-version rejection, semantic validation, and
      hand-authored fixtures protect local-system snapshots. Still open: the
      first real schema migration when a format changes (no task yet); P4.3's
      snapshot schema builds on this boundary.
- [x] **P2.4 — Autosave + recovery.** Revision-aware atomic snapshots at
      command/scheduler boundaries plus a best-effort exit flush; five rolling
      backups, rejected-file preservation, automatic fallback, and
      `--restore-backup <1..5>`. Still open: deterministic offline catch-up →
      P2.5.
- [x] **P2.5 — Deterministic offline catch-up.** System-wide, stable-order
      recovery advances meaningful deadlines, silently fills durable feeds, and
      caps/re-anchors offline progress at 24 hours.
- [x] **P2.6 — Balancing pass.** Server-authoritative, versioned balance catalog
      for progression, crew, storage, asteroid mining, and module costs/timers;
      level-30 module cap; radial asteroid grades and outer-band spawning. Still
      open: asteroid-grade presentation → P2.11; verification UI defects →
      P2.12; startup-only developer reset controls → P2.10.
- [x] **P2.7 — Diminishing returns** _(moved from P1.7)_. Mining's extraction
      time, travel, single-slot deposits, and fleet cap already provide the
      intended soft limit. Battle/raid tuning remains with combat → P6.3.
- [x] **P2.8 — Crew understaffing UX pass** _(split from P1.10)_.
      Server-verified per-module assignment controls, visible allocation/output,
      a 1-minute hire, and the `(assigned + 1) / (required + 1)` unstaffed
      baseline; Trading Post operation requires its one assigned crew member.
- [x] **P2.9 — Storage Bay production-boost perk** _(split from P1.11)_. A
      staffed Bay grants +5% passive building production per settled level;
      capacity remains unconditional and mining is unaffected.
- [x] **P2.10 — Developer reset controls.** Local startup-only profile/system
      reset, player listing, and timer-speed controls with explicit logs and CLI
      validation. Still open: retire local-only controls when P4.6's online
      sessions replace the local backend.
- [x] **P2.11 — Surface asteroid resource grade.** Asteroid actors show their
      radial grade and Details explains its deposit multiplier.
- [x] **P2.12 — UI defect cleanup** _(July 2026)_. Compact, screen-safe build
      offers; consistent recruitment timing; recovery icons; human-readable Mail
      module names; and per-module storage Details.
- [x] **P2.13 — Protected storage overflow.** Storage caps are now protected
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
simultaneous clients are deliberately deferred to Phase 4.

- [ ] **P3.1 — Playable-alpha experience specification.** Write the product
      target before adding more systems: the intended first 30 minutes, first 3
      hours, several-day arc, short/medium/long goals, failure and recovery
      rules, completion condition, and concrete playtest success criteria. This
      is a design-review gate for P3.3-P3.11, not a promise to implement every
      possible campaign feature.
- [ ] **P3.2 — In-app local profile flow.** Replace launch-flag-only identity
      selection with a pre-load profile chooser that can create, select, and
      inspect local players in the shared persisted system. Identity remains
      fixed after the game loads and only one local process/session owns the
      world at a time: this is asynchronous same-device play, not simultaneous
      LAN multiplayer. Preserve the P2.10 developer CLI controls.
- [ ] **P3.3 — Objectives, rewards, and first-run onboarding.** Add persistent,
      event-modeled objectives that make the next useful action visible and can
      grant authoritative rewards. The first campaign walks through hiring the
      starting crew member, building the first producer, mining, trading, and
      upgrading; optional goals and milestones continue after the tutorial so
      the framework is gameplay, not a disposable scripted overlay. Needs P3.1,
      P1.3, P1.6, P1.10. (Former P6.6; CR6.6)
- [ ] **P3.4 — Research Lab + tech tree.** Spend resources to unlock module
      blueprints, vessel stat upgrades, expedition capabilities, and efficiency
      bonuses. Research supplies meaningful progression choices and gates the
      rest of the local campaign rather than merely making existing numbers
      rise. Needs P3.1, P1.4. (Former P5.1)
- [ ] **P3.5 — Live countdown-details controller** _(from CR4.1)_. When P3.4
      introduces the third 1 Hz state-bound details dialog, extract the shared
      open/close, `bindDialogRows`, and per-second rebuild lifecycle from the
      map and ship module panels. Preserve scene-owned tick dispatch and avoid
      adding another controller copy. Needs P1.16, P1.20, P3.4. (Former P5.11)
- [ ] **P3.6 — Module build prerequisites** _(split from P2.6, July 2026)_.
      Generalize `unlock_command_level` into explicit prerequisites: other
      modules at a level, research, items, or objectives. Show unmet reasons
      instead of silently hiding a module. Move stopgap Command Module gates,
      including the Trading Post's level-3 gate, onto the richer system where
      the campaign design calls for it. Needs P1.4, P3.3, P3.4. (Former P5.10)
- [ ] **P3.7 — Vessel Shipyard + vessel stats and multi-tier progression.** Add
      upgradeable durability, damage, cargo capacity, and speed in place of the
      flat vessel constants. Research and Shipyard upgrades unlock higher tiers
      (`vessel-2`, `vessel-3`) or specialized hulls within the existing faction
      and animation-state system; starter combat loadouts support P3.10 before
      P6.2 adds the full weapon economy. Vessel crews tie dispatch, mining, and
      combat capacity to the player's crew pool. Needs P1.6, P3.4. (Former P5.3)
- [ ] **P3.8 — Expeditions + fuel economy.** Design and implement repeatable
      exploration, scouting, and salvage missions that send a vessel away for a
      server-timed duration, consume fuel, expose up-front risk/reward, and
      return choices or rewards through authoritative events. Settle fuel's
      broader role across dispatch, expeditions, and P1.22 warp without adding a
      hard daily-energy cap. Needs P3.1, P3.3, P3.7, P1.22. (Supersedes former
      P4.9)
- [ ] **P3.9 — NPC opposition + radial sector progression.** Turn P2.6's radial
      asteroid grades and reserved center into a solo progression map with
      persistent NPC factions, hazards, guarded resources, higher-level nodes,
      and territories toward the center. Introduce the README's moons and
      planets here. NPC decisions mutate the same authoritative simulation and
      emit the same event shapes a future remote player would. Needs P3.1, P3.4,
      P3.7, P2.6. (Local-play half of former P4.2)
- [ ] **P3.10 — PvE combat vertical slice.** Establish reusable combat rules by
      letting fitted vessels challenge a bounded set of NPC encounters. Include
      legible previews, damage and recovery, loss/failure without an
      unrecoverable save, rewards, and enough opposing behaviors to test
      tactical choices. Basic dock-side recovery belongs here; the specialized
      Repair Shop remains P6.4. Keep player raiding, contested player asteroids,
      anti-cheat, and online concurrency in P6.3. Needs P3.7, P3.8, P3.9.
- [ ] **P3.11 — Local campaign completion + ascension.** Give the sector a
      recognizable end condition—such as reaching the center and defeating a
      major threat—then offer a deliberately designed new-system/ascension loop
      with a small persistent bonus. Specify exactly what resets before touching
      saves. This validates the shape of later online seasons without requiring
      cohort worlds or world merging. Needs P3.3, P3.9, P3.10.
- [ ] **P3.12 — Dialog columns + Trading Post redesign.** Generalize dialog
      layout with a real multi-column grid, then render the P1.12 shop as three
      columns of bordered deal boxes: rarity-colored border and separate
      get/give rows. Later Mail and Events panels can reuse the layout. Needs
      P1.12, P1.14. (Former P6.8; playtest feedback, July 2026)
- [ ] **P3.13 — Minimap two-tier zoom revamp.** At normal zoom show the live
      100\*100 AOI window; zoomed fully out, show the 1000\*1000 system with
      player/NPC markers, regions, objectives, and interest-area outlines but
      omit individual asteroids. Needs P1.9, P1.13, P3.9. (Former P6.9; playtest
      feedback, July 2026)
- [ ] **P3.14 — Context-sensitive resource bar + detail dialog.** On the ship,
      show the three construction materials plus crew; on the map, show fuel.
      Tapping either group opens the complete resource/cap/production breakdown.
      Needs P1.2, P1.10, P1.11. (Former P6.10; playtest feedback, July 2026)
- [ ] **P3.15 — Per-type module art and tiered visual progression.** Replace the
      shared `module-base` placeholders with bespoke 64-frame animated vector
      rooms across the current catalog and Phase 3's Research Lab and Vessel
      Shipyard, with visible tier upgrades as levels rise. Needs P1.23, P3.4,
      P3.7. (Former P6.1)
- [ ] **P3.16 — Space map art and visual readability.** Add a real starfield and
      per-class/per-tier asteroid sprites. Asteroid resource class must remain
      distinguishable by shape rather than tint alone; extend the same visual
      language to P3.9 regions, hazards, and NPC affiliations. Needs P1.9, P3.9.
      (Former P6.2; CR6.8)
- [ ] **P3.17 — Audio.** Add ambient/music plus SFX for input, construction,
      hiring, vessels, mining, objectives, expeditions, and combat. Provide
      independent volume controls and a mute path. (Former P6.7; CR6.7)
- [ ] **P3.18 — Progressive crew recruitment cost.** Replace the flat biological
      price with a readable curve that rises gradually with population, include
      it in the wire-delivered balance catalog, and tune it against campaign
      progression. (Playtest feedback, July 2026)
- [ ] **P3.19 — Structured local-alpha playtest + rebalance.** Run repeated
      fresh-profile tests at normal and accelerated time across the first 30
      minutes, first 3 hours, offline return, and campaign completion. Record
      confusion, dead time, dominant choices, unrecoverable states, and weak
      rewards; revise balance and UX until P3.1's acceptance criteria hold.
      Exercise multiple same-device profiles in one shared system as a separate
      test, without treating it as proof of simultaneous multiplayer. Needs the
      playable path through P3.2-P3.18.

## Phase 4 — Networked server-authoritative events

Goal: after the local game proves its loop, put the existing authoritative event
pattern onto a real network transport per `SERVER.md`.

- [ ] **P4.1 — WebSocket event bus.** Server verifies, timestamps, and
      broadcasts events; clients feed them into the existing `apply*Event` entry
      points. Local action methods switch from "request + apply response" to
      "send request + apply broadcast". Add rate limits and generalize P1.13's
      single-client AOI into per-connection windows at the outbox drain loop.
      Needs P2.2 and a completed P3 local-alpha gate. (Former P3.1)
- [ ] **P4.2 — Server-time-offset handshake.** Clients never trust `Date.now()`;
      pair a ping/pong-derived offset with the authoritative timestamps already
      carried by events. Needs P4.1. (Former P3.2)
- [ ] **P4.3 — Snapshot + replay for late joiners.** Send a snapshot plus log
      suffix on join, replayed through the normal apply entry points. The client
      half already handles aged events. Needs P4.1; builds on P2.3. (Former
      P3.3)
- [ ] **P4.4 — Mail: Player Mail + System Mail.** Wire the two disabled P1.21
      tabs for cross-player messages and server/GM announcements. Notifications
      remain a separate existing tab, and P7.1 Events remains curated live
      content. Needs P4.1, P1.21. (Former P3.5)
- [ ] **P4.5 — Production hardening.** Set a real CSP in `tauri.conf.json` and
      drop the unused `withGlobalTauri: true` before the first public/networked
      build. (Former P3.6)
- [ ] **P4.6 — Login / player identity.** Add accounts and authentication; the
      client learns its immutable session identity from the server instead of a
      local profile seed. Integrate with the loader phase and authenticated
      socket. Needs P4.1. (Former P3.7)

## Phase 5 — Alliances, online worlds, and economy

Goal: add the social and population-dependent MMO layer after network sessions
exist.

- [ ] **P5.1 — Alliance Embassy gameplay.** Joining, contribution, and alliance
      boosts; alliance entities join the P1.13 always-sent AOI exemption. Needs
      P4.1. (Former P4.1)
- [ ] **P5.2 — Alliance territories + contested center progression.** Extend
      P3.9's solo radial regions with alliance ownership, cooperative
      objectives, contested resources, and alliance-gated access toward the
      center. Needs P5.1, P3.9. (Online half of former P4.2)
- [ ] **P5.3 — Operations Center: fog of war / radar.** Tie map visibility and
      vessel speed to module level, shrinking P1.13's AOI projection to the
      player's radar while preserving owned/alliance exemptions. Needs P4.1.
      (Former P4.3)
- [ ] **P5.4 — Cohort worlds.** Place new players in systems populated by peers
      who started around the same time. Needs P4.6. (Former P4.4)
- [ ] **P5.5 — Online seasons and world merging.** Move surviving players into
      new systems after a time or milestone, including merges and carry-over
      bonuses. Use P3.11's local ascension findings rather than assuming its
      reset rules transfer unchanged. Needs P5.4, P3.11. (Former P4.5)
- [ ] **P5.6 — Credits economy / player trade.** Extend P1.12's NPC deals into
      player and alliance trade; also settle higher-level exchange advantages
      and featured/limited-stock deals. Design before implementation. Needs
      P1.12, P5.1. (Former P4.6)
- [ ] **P5.7 — Alliance-aware warp + warp core item.** Make relocation useful
      for joining an alliance position and replace the temporary fuel cost with
      one warp core, introducing the minimal item type used later by P7.4. Needs
      P5.1, P1.22. (Former P4.7)
- [ ] **P5.8 — General item/credits shop.** Wire the HUD Shop to a standalone
      credits store for general goods, distinct from Trading Post resource
      exchanges. Needs P1.12, P5.6. (Former P4.8; CR6.2)
- [ ] **P5.9 — Monetization model.** Decide whether real-money purchases fit
      Voidbound at all. This business decision shapes P5.8 and blocks any
      premium fleet-cap extension in P6.7. (Former P4.10)

## Phase 6 — Weapons, PvP combat, and defence

Goal: expand the local progression/combat foundation into adversarial online
combat and the README's remaining Technologies, Combat, and Defence modules.

- [ ] **P6.1 — Fabrication Bay, Assembly Line, Data Archive.** Apply speed/cost
      multipliers respectively to module builds, weapon production, and
      research. Needs P3.4; the Assembly Line effect also needs P6.2. (Former
      P5.2)
- [ ] **P6.2 — Weapons Factory, Drone Factory, Plasma Factory + Armory.** Add
      kinetic, drone, and plasma production feeding P3.7 vessel capacity, plus
      Armory weapon storage. Event-model every production action. Needs P3.7.
      (Former P5.4)
- [ ] **P6.3 — PvP combat resolution.** Extend P3.10's combat rules to player
      motherships and vessels with server-authoritative outcomes, crew
      casualties, contested-asteroid resolution, and explicit defender recourse.
      Design raiding separately: only P2.13's exposed surplus may be looted,
      never protected stock. Needs P4.1, P3.10, P6.2. (Former P5.5)
- [ ] **P6.4 — Repair Shop.** Repair weapon/vessel damage using resources and
      time, following the build-timer pattern. Needs P6.3. (Former P5.6)
- [ ] **P6.5 — Hangar Bay.** Station weapons and vessels as passive mothership
      defence. Needs P6.3. (Former P5.7)
- [ ] **P6.6 — Shield Generator.** Absorb combat damage; a breached shield
      forces the mothership to warp and relocate. Needs P6.3. (Former P5.8)
- [ ] **P6.7 — Vessel fleet-cap scaling.** Replace the flat `MAX_VESSELS` 20
      stopgap with a base cap plus Hangar Bay, Armory, and research increases.
      Any premium +1 remains gated on P5.9. Needs P3.4, P6.2, P6.5. (Former
      P5.9; CR6.5)

## Phase 7 — Online content, presentation, and platforms

Goal: ship the remaining panels, platform work, and presentation features that
do not gate the local-alpha gameplay evaluation.

- [ ] **P7.1 — Curated Events panel.** Add server-curated live content such as
      holiday specials and cooperative contests, with definitions, scheduling,
      participation, rewards, and its own HUD button. This is distinct from Mail
      notifications and requires a design-review pause. Needs P1.21, P4.1.
      (Former P6.3)
- [ ] **P7.2 — Mobile builds (Android/iOS).** Bring up
      `deno task tauri android|ios`, then verify portrait layout, touch input,
      performance, persistence, and audio on device. (Former P6.4)
- [ ] **P7.3 — HTTP fallback for `generate_map`.** Put a fetch-based map source
      behind the existing `buildTileMap` signature to unlock the planned web
      build. This is platform work, not a networking-phase dependency. Update
      AGENTS.md's Platform note when it lands. (Former P3.4)
- [ ] **P7.4 — Items/inventory panel.** Wire the HUD Items button to a panel for
      non-resource items, beginning with P5.7's warp core. Needs P5.7. (Former
      P6.5; CR6.2)
- [ ] **P7.5 — Mothership warp-out/warp-in animation.** Replace P1.22's instant
      visual teleport with clear transitions at the old and new positions. Needs
      P1.22. (Former P6.11; playtest feedback, July 2026)
- [ ] **P7.6 — Canonical ship interior layout.** Rearrange `ship-level.tmj` and
      room-grid coordinates into a capital-ship layout matching the mothership
      hull: Command Citadel at the bow, personnel/hydroponics on the wings,
      trade/storage by docks, and engineering/reactors aft. Needs P1.23. (Former
      P6.12)
