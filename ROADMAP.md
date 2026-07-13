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

Goal: a playable single-player loop, no persistence yet. Core loop done (P1.7
moved to Phase 2 as P2.7): the loop runs end to end — build and level modules,
hire crew, mine asteroids, trade at the NPC shop — all server-verified, streamed
over the push channel, and windowed by interest area. Implementation detail:
CLAUDE.md §4 and SERVER.md. P1.15 is a post-review polish addition (CR6.1). A
full `/phase-review` followed the phase close (July 2026): 30 findings
(CR1.1–CR9.7), all landed over commits `f18db73..e394ed1` — the full review
document lives in git history (`CODE_REVIEW.md`, deleted after roll-up).

- [x] **P1.1 — Resource state + production tick.** The 4 resources as
      server-side state with periodic production; Command Module baseline output
      guarantees the player can never get stuck.
- [x] **P1.2 — Resource bar HUD group.** Screen-top resource counts with live
      label updates; later extended with caps (P1.11) and crew (P1.10).
- [x] **P1.3 — Module placement + build timers.** `BuildModuleEvent` + the
      empty-tile Build placement UI; its `completesAt` gives build timers for
      free.
- [x] **P1.4 — Module catalog.** Rust-authoritative `MODULE_CATALOG` with a
      display-only TS mirror; level-ups reuse the build-timer machinery, capped
      at the Command Module's level. Still open: per-level scaling is the
      doubling stub (→ P2.6); per-type module art (→ P6.1).
- [x] **P1.5 — Local notifications + server-push channel.** Server-owned
      notification feed + the scheduler push channel — the in-process prototype
      of P3.1's event bus. Still open: pressing Events dumps the feed to the
      console until the P6.3 feed panel; the Mail badge stays a placeholder
      until P3.5.
- [x] **P1.6 — Mining loop.** Server-seeded asteroids with single-slot mining
      jobs, scheduler auto-recall at mine-out, proportional early harvests, dock
      deposits. Still open: deposit bands and the mine rate are balancing stubs,
      and mixed deposits / multiple miners on large asteroids stay open doors (→
      P2.6); asteroid sprites are placeholder vectors (→ P6.2).
- **P1.7 — Diminishing returns.** Moved to Phase 2 as P2.7 (July 2026) — a daily
  damping curve can't be experienced or tuned while restarts wipe state.
- [x] **P1.8 — Zoom-at-cursor.** Wheel/pinch zoom anchored at the pointer/pinch
      midpoint, clamped so the camera never drifts at min/max zoom
      (`src/camera-math.ts`).
- [x] **P1.9 — Minimap + full-size space map.** Geometry-only 1000\*1000 space
      map with minimap navigation (entity dots, viewport rect, tap-to-jump).
      Still open: real starfield background (→ P6.2).
- [x] **P1.10 — Crew Quarters + crew capacity.** Crew as the third catalog stat:
      berths sum over settled levels, producer output scales by the pooled
      ship-wide staffing ratio with a 50% floor (the Command Module baseline is
      never damped — the anti-stuck guarantee), timed `request_hire_crew`
      recruitment, crew surfaced across the HUD (bar, hire buttons, understaffed
      badges); players start at 0 crew. Still open: hire cost/time, the 50%
      floor, the berth-vs-demand ratio, and optional per-crew biological upkeep
      are balancing stubs (→ P2.6); vessel crews (→ P5.3), combat casualties (→
      P5.5), and crew specialization / manual stationing (no task yet) were
      deliberately deferred.
- [x] **P1.11 — Storage Bay capacity caps.** Per-resource caps as a catalog
      `stores` field; production and mining deposits clamp server-side (overflow
      is lost, and notified); the resource bar shows count/cap. Still open: cap
      numbers are stubs (→ P2.6); the README's "boosts production" perk was
      skipped; safe warehousing becomes meaningful with P5.5 combat. (The
      Armory's weapon-storage half moved to P5.4.)
- [x] **P1.12 — Trading Post + NPC shop.** Server-generated daily deal slots on
      the new Trading Post module (give ≠ get, rarity-boosted gets, a once-daily
      freebie, doubling-cost refreshes, slot count scaling with the post's
      level) — credits' entry into the economy. Full model: CLAUDE.md § IPC.
      Still open: every deal number is a balancing stub (→ P2.6); better
      exchange ratios at higher post level, featured/limited-stock deals, and
      credits' wider role (→ P4.6); per-type module art (→ P6.1).
- [x] **P1.13 — Map interest area: windowed world streaming + minimap
      declutter.** The client only holds world entities inside a 100\*100-tile
      AOI window, re-centered as the camera pans; pushes are footprint-filtered,
      and the map view is capped so unloaded space never scrolls into sight.
      Full model: SERVER.md § Interest management. Feeds P3.1 (per-connection
      windows) and P4.3 (fog of war = this window shrunk to a radar radius).
      Still open: asteroid deposit/rate balance (→ P2.6).
- [x] **P1.14 — Modal dialog/overlay system.** Screen-space modal layer —
      scrim + framed panel + row/cell content composed from the existing `ui/`
      primitives — opened via `TiledScene.openDialog()`; one dialog at a time,
      all pointer input captured, with `bindDialogRows` for state-bound
      rerendering (the P1.12 shop is the reference consumer). Still open: no
      scrolling — the content region is a distinct sub-rect a scrollable list
      can drop into (→ P6.3).
- [ ] **P1.15 — Toast/snackbar notifications.** A general-purpose transient
      on-screen message primitive (new `src/ui/toast.ts`, following the
      `dialog.ts`/`hud.ts` pattern) — first consumer is player-visible feedback
      for rejected server requests (five
      `console.warn("No rejection UI
      yet")` call sites today), but general
      enough for other future transient messages. (CR6.1)
- [ ] **P1.16 — Entity details panel.** Wire the four
      `console.log("Details
      ...")` stubs (own mothership, enemy
      mothership, vessel, asteroid — all in `map-level.ts`) to a real details
      dialog, following the `/add-server-panel` dialog pattern against data
      already in `gameState`. The own-mothership panel folds in the separate
      `console.log("Upgrade my
      spaceship")` stub as a Command-Module-level
      readout + upgrade action rather than a standalone button. Bundled cleanup:
      wire the own-mothership "Enter" button to `goToScene("ship")` (today a
      stub duplicating the already-working HUD "Ship" button); remove the dead
      empty-tile "Move" stub button (`Deploy` already dispatches a vessel to
      that tile — "Move" duplicated it with no distinct behavior); rename the
      own-mothership "Move" button's label to "Warp" to stop it colliding
      terminology-wise with vessel Move/Deploy (implementation lands with P4.7).
      (CR6.2)

## Phase 2 — Persistence and balancing

Goal: game state survives a restart, and the stubbed numbers become real.
Balancing lives in this phase because progression tuning is only meaningful once
progress persists — the reason P1.7 moved here.

- [ ] **P2.1 — Save/load via a Tauri command.** Serialize `ServerState` to a
      local file; load on startup in place of the seeded new-player state
      (falling back to the seeds when no save exists). Loading rides the
      existing loader phase and its resilience rules — a missing or corrupt save
      must never block game start. No server involved; SERVER.md frames the save
      file as a local prototype of the phase-3 snapshot. `ServerState`'s data
      structs already derive `Deserialize` (good prep), but `outbox`,
      `notified_arrivals`, `resources_dirty`, and `aoi` are runtime/session
      state, not persisted progress — they need `#[serde(skip)]` (or an
      equivalent reconstruct-on-load default) so a save doesn't serialize stale
      in-flight pushes or window state.
- [ ] **P2.2 — Notification message structure.** Switch
      `NotificationData.message` from server-composed English prose to a `kind`
      enum + structured params, with the client composing the display string
      from a lookup table (structure only — no additional languages shipped yet,
      just unblocked for later). Must land before P2.3 freezes the save format
      and before P3.1 freezes the socket protocol, since `message` is currently
      baked into both. (CR6.4)
- [ ] **P2.3 — Versioned save format.** Version field + migration path so later
      phases (and the phase-3 server snapshot format) can evolve without wiping
      saves. Needs P2.1, P2.2.
- [ ] **P2.4 — Autosave.** Persist without user action: save at scheduler settle
      boundaries and on exit, with atomic write-temp-then-rename so a crash
      never corrupts the save. Needs P2.1.
- [ ] **P2.5 — Offline catch-up.** On load, settle everything that came due
      while the app was closed through the same settlement paths the scheduler
      uses live: production accrual is already lazy, but build completions,
      vessel arrivals/returns, and mine-outs must settle in timestamp order and
      emit their notifications. Needs P2.1.
- [ ] **P2.6 — Balancing pass.** Replace the stubs with real curves: the
      `scale_for_level`/`scaleForLevel` doubling, `MINE_UNITS_PER_HOUR`,
      asteroid deposit bands and per-window density, and the P1.10 crew numbers
      (hire cost/time, the 50% output floor, the berth-vs-demand ratio, and
      whether crew consume biological upkeep — a good sink, but mind the death
      spiral). README targets: small asteroids mine out in 15–60 min, medium 1–4
      h, large 4–12 h. Also revisit the single-deposit / single-miner rules for
      large asteroids (README leaves that door open). Needs P2.1 — tuning
      requires persistent progress. `MAX_VESSELS` stays a flat stopgap until
      P5.9 replaces it with real cap-scaling.
- [ ] **P2.7 — Diminishing returns** _(moved from P1.7)_. Repeated actions yield
      less over the course of a day and reset at a fixed point — the README's
      alternative to hard energy caps. Local implementation first; the server
      re-verifies it in phase 3. Mining is the first action worth damping. Needs
      P2.1; lands naturally alongside P2.6.

## Phase 3 — Server-authoritative events

Goal: the event pattern goes live over the network, per `SERVER.md`.

- [ ] **P3.1 — WebSocket event bus.** Server verifies, timestamps, and
      broadcasts events; clients feed them into the existing `apply*Event` entry
      points. Local action methods switch from "build + apply" to "send request,
      apply the broadcast". Includes the rate limits SERVER.md's verification
      step sketches, and generalizes P1.13's single-client AOI into
      per-connection windows at the outbox drain loop. Needs P2.2 — the
      notification message wire shape must be restructured before this protocol
      freezes.
- [ ] **P3.2 — Server-time-offset handshake.** Clients never trust `Date.now()`
      — pairs with the `arrivalAt` precomputation already in `VesselMoveEvent`.
      Needs P3.1.
- [ ] **P3.3 — Snapshot + replay for late joiners.** Server side of the model:
      snapshot plus log suffix on join. The client half already works
      (`applyVesselMoveEvent` interpolates aged events). Needs P3.1; builds on
      the P2.3 versioned format.
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
- [ ] **P4.7 — Mothership warp/relocation.** Voluntary instant relocation to a
      new map location via the mothership's "Warp" button (renamed from "Move" —
      see P1.16); the main driver is repositioning near your alliance once P4.1
      lands. Consumes 1 "warp core" — a new minimal item type introduced by this
      task (ahead of P6.5's full inventory panel, which later becomes the
      general UI for this and future item types) — and requires no vessels
      currently deployed outside the mothership (all must be docked). Triggers
      CR1.4 (a moved mothership must not strand a vessel already in flight —
      already fixed generically via the `returning` flag on `VesselMoveEvent`,
      but re-verify against a live relocation). Needs P4.1.
- [ ] **P4.8 — General item/credits shop.** A standalone shop (HUD "Shop"
      button, currently unwired) distinct from the per-module P1.12 Trading Post
      — spends credits on general goods rather than the Trading Post's give/get
      resource deals. Needs P1.12, and design follows P4.6's credits economy
      work. (CR6.2)

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
- [ ] **P5.9 — Vessel fleet cap scaling.** Replace CR1.5's flat `MAX_VESSELS`
      (20) stopgap with a real formula: a small base cap, +N from Hangar Bay
      (P5.7) and/or Armory (P5.4) levels, +N from a Research Lab (P5.1) unlock.
      Open idea, not yet committed design: a further +1 via a premium
      (real-money) shop purchase — track as a design question here, don't build
      until the monetization model is actually settled. Needs P5.1, P5.4, P5.7.
      (CR6.5)

## Phase 6 — Presentation and platforms

Goal: real art, real panels, more platforms. Client-side work that is largely
independent of the server phases — pull any of these earlier when placeholder
art or missing panels start hurting playtests.

- [ ] **P6.1 — Per-type module art.** Replace the shared `module-base` sprite
      with per-type module sprites (`/gen-art`; the `module-*` auto-register
      prefix already expects them). Needs P1.4.
- [ ] **P6.2 — Space map art.** Real starfield background for the geometry-only
      map scene, and real asteroid sprites (per class, per tier) replacing the
      tinted placeholder vectors. **Requirement:** asteroid class must be
      distinguishable by shape, not tint alone — today's placeholder vectors are
      colorblind-inaccessible (CR6.8). Needs P1.9.
- [ ] **P6.3 — Notification feed panel.** A real Events panel replacing the P1.5
      console dump — likely the game's first scrollable list UI, so build it as
      a reusable panel; P3.5's mail UI is the second consumer. Needs P1.5.
- [ ] **P6.4 — Mobile builds (Android/iOS).** Bring up
      `deno task tauri android|ios` (README § Other platforms). The game is
      mobile-first by design — portrait layout and touch input already hold — so
      this is mostly build wiring, performance, and on-device verification.
      Worth pulling early once the core loop stabilizes.
- [ ] **P6.5 — Items/inventory panel.** A real panel behind the HUD "Items"
      button (currently unwired), covering item types beyond the 4 core
      resources — starting with P4.7's "warp core", the first item type
      introduced. Needs P4.7. (CR6.2)
- [ ] **P6.6 — Onboarding/tutorial sequence.** A full scripted first-run
      tutorial walking a new player through the core loop's natural early goals
      — `STARTING_CREW = 0` (`game_state/crew.rs`) already frames the first crew
      hire as one such step; the first module build and first mining trip are
      others. Needs P1.3, P1.6, P1.10. (CR6.6)
- [ ] **P6.7 — Audio.** Ambient/music plus SFX (button presses, build/level-up
      and hire completions, vessel arrivals, mining) — no sound exists in the
      game today. (CR6.7)

# Unsorted TODO items

Housekeeping and playtest feedback — not roadmap features, so no P<phase>.<n>
IDs; work these opportunistically alongside roadmap tasks.

## Codebase housekeeping

- [ ] **File-size refactor pass.** Several files have grown large enough to hurt
      context/readability. The subtasks below are the per-file/per-group
      breakdown, ranked by priority — tackle one per followup session.
- [x] **Split `src-tauri/src/game_state.rs`** (4400+ lines) — done: split into
      `src-tauri/src/game_state/{resources,modules,crew,deals,world,state,
      scheduler,commands}.rs` +
      `mod.rs`, each domain file keeping its own `impl ServerState` block and
      colocated `#[cfg(test)] mod tests` (plus a shared `test_support.rs` for
      cross-domain test helpers). No behavior change — `ServerState`'s fields
      and cross-file-called methods moved from module-private to `pub(crate)` to
      allow the sibling-module split; full format/check/lint/test gate passes
      (all 69 Rust tests relocated intact).
- [x] **Split `src/tiled-scene.ts`** (~870 lines) — done: camera zoom/pan/clamp
      math moved to `src/scene-camera.ts` (`SceneCamera`), and the raw
      pointer/drag/pinch/wheel state machine + Excalibur listener registration
      moved to `src/scene-input.ts` (`SceneInputController`, handlers-callback
      interface). `TiledScene` keeps tap-dispatch semantics
      (modal/HUD/actor/empty-tile priority chain) and orchestration, now ~675
      lines. No behavior change — verified on both scenes (`/verify`: drag-pan,
      wheel-zoom, actor tap-to-select + camera focus, empty-tile tap spawning
      Move/Deploy buttons); full format/check/lint/test gate passes.
- [x] **Split `src/ship-level.ts` and `src/map-level.ts` together** (~790 / ~590
      lines) — done: one class per synced entity type/system, each owning its
      actor map(s), rebuild-diff state, and action requests, constructed with a
      narrow host-callback interface (add/onTilePressed/deselectActor/etc.,
      mirroring the tiled-scene.ts split's SceneCamera/SceneInputController
      pattern) so it never reaches back into the scene directly. Ship:
      `src/ship-modules.ts` (`ModuleSync` — module reconcile, build/level-up/
      hire-crew) + `src/ship-shop.ts` (`ShopDialog` — Trading Post rows,
      accept/refresh); `ship-level.ts` is now ~75 lines of wiring. Map:
      `src/map-motherships.ts` (`MothershipSync`), `src/map-asteroids.ts`
      (`AsteroidSync` — also owns Mine, since it dispatches a vessel from the
      asteroid's own button), `src/map-vessels.ts` (`VesselSync` — dispatch/
      recall/redirect-in-place lerp); `map-level.ts` is now ~230 lines of wiring
      (AOI window hysteresis, minimap spawn, empty-tile hook). The shared "kill
      absentees, diff, rebuild changed" skeleton behind motherships/asteroids
      moved out of `TiledScene.reconcileActors` into a standalone
      `src/actor-sync.ts` (`reconcileActors`), since it no longer needed scene
      access beyond an `add` callback — vessels and modules keep their own loops
      (real quirks: redirect-in-place lerp + arrival-based respawn skip;
      multiple side-derived applied maps + selection carry-over). No behavior
      change — verified on both scenes (`/verify`: ship Command Module selection
      showing Hire Crew/Level Up with live costs, an empty-room build-offer
      ghost; map mothership/enemy/asteroid rendering, a dispatched vessel flying
      and arriving, the minimap); full format/check/lint/test gate passes.
- [x] **Split `src/game-state.ts`** (~770 lines) — done: every wire-shape
      type/interface (mirroring the Rust structs/enums) moved to
      `src/game-state-types.ts` (~415 lines, pure module, no runtime imports),
      re-exported via `export *` from `game-state.ts`, which now holds only
      `serverNow()`, the `GameState` class, and the shared singleton (~385
      lines). No behavior change — all existing imports from `./game-state.ts`
      keep working unchanged (matches the `tile-ref.ts`/`tile-ref-parse.ts`
      pure-types-plus-consumer pattern); full format/check/lint/test gate passes
      (all 101 TS + 69 Rust tests untouched).
- [ ] **Split `src/tile-actor.ts`** (~550 lines) — worth a look eventually, not
      urgent yet. Independent of the other items here.
- [ ] **Split `src/ui/dialog.ts`** (~470 lines) — worth a look eventually, not
      urgent yet. Independent of the other items here.
- [ ] Bump default Python to 3.14 (see the `/gen-art` PATH workaround for the
      current 3.12 pin). Might need to pip install some of the needed packages.
      There is a bunch of places and scripts that seem to rely on us running py
      3.12, and we want to fix these to run on current system default of 3.14
- [ ] Reorganization of ts source code: A lot of files on top level, might be
      better to put them in subdirectories of relevant modules together.
- [ ] `/verify` skill should just use the sonnet/default model instead of
      current, specially when we are using a heavy-weight like Fable.

## Gameplay/UX polish

- Resource bar improvement.
- Minimap sucks.
- Clicking on modules, dialogs, details.
- Shop should be a row of 3 buttons with borders showing rarity.
- Only one of each type of building.
- Resource harvesting progress.
- Mail (+ notifications tab) vs events (game events to participate in).
- Enter and upgrade buttons on ship in map view.
- Mothership teleport/move.
- Clicking outside of dialog should dismiss it.
- Rename "gift" -> "free" in the trading post
- Dev testing speedup: Like maybe 2x or even 5x on construction and resource
  collection while I'm running a test. That way I can test out the mechanics
  quickly without waiting for too long
