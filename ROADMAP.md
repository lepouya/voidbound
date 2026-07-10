# Voidbound Roadmap

Development phases for the game design described in `README.md`. Settled design
principles live there; this file tracks the order features land in. Later phases
build directly on earlier ones — in particular, everything in phase 3 assumes
actions are already event-modeled (see the multiplayer-ready event pattern in
`CLAUDE.md`; the server model is sketched in `SERVER.md`). Phase 0 is the
engine/tooling scaffolding all of that already sits on.

**How to use this file:** tasks have stable IDs (`P<phase>.<n>`) so sessions and
commits can reference them — check off a task when it's committed and
`deno task format` + `deno task check` + `deno task test` pass. Within a phase,
tasks are listed in rough dependency order, but anything without an explicit
"needs" note can be picked up independently.

## Phase 0 — Engine and tooling scaffolding

Goal: the technical foundation everything else is built on. Most of this is
already done — captured retroactively from the current code and git history
rather than from when it was actually planned, so task order here doesn't imply
build order. A later pass will try to associate each of these with the earlier
phase(s) it actually satisfies.

- [x] **P0.1 — Excalibur engine bootstrap + scene registration.** `main.ts`
      creates the single `ex.Engine` (390\*844 portrait, `FitScreenAndFill`,
      `pixelArt: true`), registers the `map`/`ship` scenes, and starts on `ship`
      with a shared `loader` and fade transition.
- [x] **P0.2 — `TiledScene` base class.** Camera drag-pan/pinch-zoom/clamp,
      tap-vs-drag disambiguation, actor/HUD/empty-tile tap dispatch priority,
      selection with animated camera recenter, HUD group wiring
      (`addHudGroup`/`addCommonHud`), resize and scene-load-failure handling —
      the shared foundation every scene extends.
- [x] **P0.3 — `TileActor` base entity.** Tile/movingTile rendering via
      `resolveGraphicLayers`, arc-arranged selection action buttons, corner
      badges, owner labels, `moveTo`/auto-facing with a path-line, upright
      (non-rotating) children, edge-fallthrough for multi-tile actors, and the
      empty-tile-actor (null tile) pattern.
- [x] **P0.4 — TileRef / tileset system.** String/object `TileRef` parsing
      (`tile-ref-parse.ts`), graphic resolution and multi-layer compositing
      (`tile-ref.ts`), the `TilesetRegistry` + pure-data geometry catalog
      (`tileset-geometry.ts`), and the prefix-based `autoRegister()` pattern so
      new `ui-button-*`/`module-*` PNGs need no registry code.
- [x] **P0.5 — UI component library (`src/ui/`).** `anchor`, `badge`, `button`,
      `hud`/`hud-layout`, `label`, `path-line` modules — shared primitives for
      both world-space TileActor UI and screen-space HUD.
- [x] **P0.6 — Map loading + IPC.** `buildTileMap()` invoking the Tauri
      `generate_map` command; the Rust side dispatches to a procedural 100\*100
      space map (`"map"`) or an `include_str!`-embedded pre-baked ship map
      (`"ship"`).
- [x] **P0.7 — MapLevel + ShipLevel scenes.** The two scenes playable today:
      space map with a mothership, an "enemy" ship, and empty-tile Move/Deploy;
      ship interior with a single Command Module. Action buttons beyond vessel
      dispatch are still `console.log` stubs.
- [x] **P0.8 — Vessel-move event pattern reference implementation.**
      `VesselMoveEvent`/`applyVesselMoveEvent`/`dispatchVessel`/`returnVessel`
      in `map-level.ts` — the one concrete instance of the multiplayer-ready
      event pattern that `/add-game-event` and `SERVER.md` generalize from.
- [x] **P0.9 — Art pipeline tooling.** Python Pillow CLIs (`sprite_extract`,
      `sprite_merge`, `sprite_transition`, `tmj_to_tilemap`) and the
      `art/gen_*.sh` orchestrators that turn source art and Tiled maps into the
      PNGs/JSON under `src/assets/`.
- [x] **P0.10 — Testing + CI infrastructure.** The deno pure-logic test suite
      (anchor, grid-math, hud-layout, tile-ref-parse, tileset-geometry cross
      check), the Python `tmj_to_tilemap` unittest suite, and the GitHub Actions
      CI workflow (frontend + rust jobs).
- [x] **P0.11 — Tooling/build setup.** Deno as task runner (`format`/`check`
      tasks, each split into `:ts`/`:rs` halves), Vite config
      (`assetsInlineLimit: 0` for Excalibur, dev-server/HMR quirks), Tauri
      config wired to the Deno tasks, strict `tsconfig.json`.
- [x] **P0.12 — Shared cross-scene game-state module.** `MapLevel` and
      `ShipLevel` are separate scene instances with no mechanism to share data
      today — each only holds scene-local fields (e.g. `MapLevel`'s `vessels`
      map). P1.1's resource counts need to be readable/writable from both (mined
      in `MapLevel`, spent in `ShipLevel`), so this has to land first: a plain
      module (`src/game-state.ts` — `resources.ts` is already taken by the
      tileset registry) that both scenes import: the `gameState` singleton with
      a subscribe/update change-notification mechanism, synced from the backend
      `load_game_state` Tauri command during the loader/splash phase
      (`GameStateResource` in `game-state-loader.ts`). Scenes stay resilient to
      slow/failed loads (new player, future login flow): state starts on
      new-player defaults and subscribers re-stamp when a load lands — e.g.
      `MapLevel` re-stamps the mothership's owner identity. Blocks P1.1.

## Phase 1 — Core gameplay loop

Goal: a playable single-player loop, no persistence yet.

- [x] **P1.1 — Resource state + production tick.** The 4 resources
      (construction, high-tech, biological, fuel) as game state with a periodic
      production tick. Baseline production comes from the Command Module so the
      player can never get stuck. Needs P0.12.
- [x] **P1.2 — Resource bar HUD group.** Screen-top display of the resource
      counts — first real use of runtime HUD text updates
      (`HudGroupHandle.setLabel`, added for this since counts read better as
      labels under the icons than as corner badges), updated from the P1.1 tick.
      Needs P1.1.
- [x] **P1.3 — Module placement + build timers.** `BuildModuleEvent` via
      `/add-game-event` (its `completesAt` field gives build timers for free),
      plus the placement UI: `createEmptyTileActor` in the ship view with a
      Build button, mirroring the map view's Move/Deploy pattern.
- [x] **P1.4 — Module catalog.** Types, levels, and resource costs from the
      README ship design — Command Module and the four producers (Ore Refinery,
      Electronics Fabricator, Hydroponics Bay, Fusion Reactor), all formalized
      as one `MODULE_CATALOG` (`src-tauri/src/game_state.rs`, mirrored
      display-only in `src/module-catalog.ts`). Every module — Command Module
      included — is now server-owned `ModuleData` (id, type, level, pending
      build) reconciled onto the ship the same way motherships /vessels are;
      ShipLevel hardcodes no layout. Level 0 = first build still running;
      level-ups reuse the build-timer machinery (`request_levelup_module`) and
      are capped at the Command Module's own level. Cost, build time, and
      production all scale via one doubling-per- level stub (`scaleForLevel`) —
      real balancing is a later pass. Real art is still pending: every module
      renders with the `module-base` sprite regardless of type until per-type
      art lands (`/gen-art` + `module-*` auto-register). Needs P1.1, P1.3.
- [x] **P1.5 — Local notifications + server-push channel.** The Events HUD badge
      shows the live unread count of a server-owned notification feed (module
      build/level-up completions, vessel arrivals/returns), replacing the
      hardcoded "@" placeholder; pressing Events marks the feed read
      (`mark_notifications_read`) and dumps it to the console — a feed panel is
      later UI work (pairs with P3.5's mail). Delivery got reworked from pull to
      push while at it: a backend scheduler thread settles state at each
      deadline (production ticks included) and emits `ServerPush` Tauri events
      that `gameState.applyServerPush()` routes through the same entry points as
      command responses — the in-process prototype of P3.1's event bus. The
      `startGameStateSync` poll and `ShipLevel.requestRefresh()` are gone. (The
      Mail badge stays a placeholder until messaging exists — see P3.5.) Needs
      P1.3.
- [x] **P1.6 — Mining loop.** Asteroid resource nodes on the space map: three
      size tiers (`ASTEROID_TIERS`, README § Design principles) \* four resource
      classes, seeded deterministically as server-owned mutable data rather than
      baked into the `generate_map` tiles as originally sketched — depletion
      needs the same snapshot/push reconcile path motherships and modules
      already use (`MapLevel.syncAsteroids`). Dispatch via
      `request_mine_asteroid` (extends `VesselMoveEvent` with a mining
      assignment and cargo); the scheduler auto-recalls the miner at mine-out,
      an early `request_recall_vessel` harvests proportionally to extraction
      time, and docking deposits the cargo into P1.1 resources. Placeholder
      tinted vector sprites (`art/gen_asteroids.sh`); balancing (deposit bands,
      the shared `MINE_UNITS_PER_HOUR` rate) is stubbed like `scaleForLevel`.
      Needs P1.1.
- [ ] **P1.7 — Diminishing returns.** Repeated actions yield less over the
      course of a day and reset at a fixed point — the README's alternative to
      hard energy caps. Local implementation first; the server re-verifies it in
      phase 3. Needs P1.6 (mining is the first action worth damping).
- [ ] **P1.8 — Zoom-at-cursor.** Wheel/pinch zoom should anchor at the
      pointer/pinch midpoint instead of the screen center. Pure `TiledScene`
      input polish, independent of the rest of the phase.
- [ ] **P1.9 — Minimap.** Overview widget for the 100\*100 space map; becomes
      necessary once P1.6 spreads play across the map. Needs P1.6.
- [ ] **P1.10 — Crew Quarters + crew capacity.** Ship-wide crew capacity stat,
      scaled by module level; production and functional penalties apply when
      crew is short relative to ship size and active modules. Needs P1.4.
- [ ] **P1.11 — Storage Bay + Armory capacity caps.** Storage limits on the 4
      resources (Storage Bay) and on produced weapons (Armory, needs P5.4);
      upgrades raise caps and may boost production. Needs P1.4.
- [ ] **P1.12 — Trading Post + NPC shop.** Buy/sell the 4 resources with NPCs at
      a markup/markdown, independent of the Phase 4 alliance economy — the
      README's answer for players who need resources between mining runs. Needs
      P1.1.

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

## Phase 5 — Technologies, combat, and defence

Goal: the README's Technologies, Combat, and Defence module categories, none of
which have a task yet.

- [ ] **P5.1 — Research Lab + tech tree.** Spend resources to unlock module
      blueprints, vessel stat upgrades, and efficiency bonuses; gates which
      later Phase 5 modules and vessel stats are available. Needs P1.4.
- [ ] **P5.2 — Fabrication Bay, Assembly Line, Data Archive.** Speed/cost
      multipliers applied respectively to module builds (P1.3), weapon
      production (P5.4), and research (P5.1). Needs P5.1.
- [ ] **P5.3 — Vessel Shipyard + vessel stats.** Durability, damage, cargo
      capacity, and weapons capacity as per-vessel upgradeable stats, replacing
      the flat `vesselSpeed` constant with a real stat block. Needs P1.6.
- [ ] **P5.4 — Weapons Factory, Drone Factory, Plasma Factory.** Three
      weapon-type production lines (kinetic, drone, plasma) feeding the vessel
      weapons capacity from P5.3. Event-modeled via `/add-game-event`. Needs
      P5.3.
- [ ] **P5.5 — PvP combat resolution.** Attacking another player's mothership or
      vessels: damage exchange using P5.4 weapons and P5.3 stats, resolved
      server-side so neither side can lie about the outcome. Needs P3.1, P5.4.
- [ ] **P5.6 — Repair Shop.** Repairs weapon/vessel damage from P5.5 combat
      using resources and time, mirroring the P1.3 build-timer pattern. Needs
      P5.5.
- [ ] **P5.7 — Hangar Bay.** Station weapons/vessels at the mothership as a
      passive defense contribution to P5.5 combat resolution. Needs P5.5.
- [ ] **P5.8 — Shield Generator.** Protective shielding that absorbs damage in
      P5.5 combat; when breached, forces the mothership to warp and relocate.
      Needs P5.5.
