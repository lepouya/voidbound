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
- [x] **P0.13 — Dev-speed build/run target.** `deno task dev:fast` scales every
      scheduler timer (production, build/hire, mining, vessel travel) via
      `VOIDBOUND_TIME_SCALE`; normal `deno task tauri dev` is unaffected.

## Phase 1 — Core gameplay loop

Goal: a playable single-player loop, no persistence yet. Core loop done (P1.7
moved to Phase 2 as P2.7): the loop runs end to end — build and level modules,
hire crew, mine asteroids, trade at the NPC shop — all server-verified, streamed
over the push channel, and windowed by interest area. Implementation detail:
CLAUDE.md §4 and SERVER.md. P1.15/P1.16 are post-review polish additions (CR6.1,
CR6.2). A full `/phase-review` followed the phase close (July 2026): 30 findings
(CR1.1–CR9.7), all landed over commits `f18db73..e394ed1` — the full review
document lives in git history (`CODE_REVIEW.md`, deleted after roll-up). P1.17–
P1.22 are further additions from playtesting the closed phase (July 2026).

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
      of P3.1's event bus. Still open: pressing the HUD's Events button dumps
      the feed to the console until P1.21's Notifications tab lands and renames
      that button to Mail; P6.3's later curated-content Events panel is a
      different feature that reintroduces an Events button of its own.
- [x] **P1.6 — Mining loop.** Server-seeded asteroids with single-slot mining
      jobs, scheduler auto-recall at mine-out, proportional early harvests, dock
      deposits. By design (confirmed in playtest, July 2026): harvested cargo
      rides the vessel and only lands in the resource counts when it docks home
      — never mid-mining or mid-return — which is what makes a mining/returning
      vessel a meaningful looting target later (→ P5.5). Still open: deposit
      bands and the mine rate are balancing stubs, and mixed deposits / multiple
      miners on large asteroids stay open doors (→ P2.6); asteroid sprites are
      placeholder vectors (→ P6.2).
- **P1.7 — Diminishing returns.** Moved to Phase 2 as P2.7 (July 2026) — a daily
  damping curve can't be experienced or tuned while restarts wipe state.
- [x] **P1.8 — Zoom-at-cursor.** Wheel/pinch zoom anchored at the pointer/pinch
      midpoint, clamped so the camera never drifts at min/max zoom
      (`src/scene/camera-math.ts`).
- [x] **P1.9 — Minimap + full-size space map.** Geometry-only 1000\*1000 space
      map with minimap navigation (entity dots, viewport rect, tap-to-jump).
      Still open: real starfield background (→ P6.2).
- [x] **P1.10 — Crew Quarters + crew capacity.** Crew as the third catalog stat:
      berths, a pooled ship-wide staffing ratio damping producer output, timed
      hire recruitment, HUD surfacing (bar, hire buttons, understaffed badges);
      players start at 0 crew. Full model: CLAUDE.md § IPC
      (`request_hire_crew`). Still open: hire cost/time, the 50% floor, the
      berth-vs-demand ratio, and optional per-crew biological upkeep are
      balancing stubs (→ P2.6); vessel crews (→ P5.3), combat casualties (→
      P5.5), and crew specialization / manual stationing were deliberately
      deferred. Open idea, still half-baked (playtest feedback, July 2026):
      richer understaffing UX (per-module indicators, crew prioritization,
      temporary reassignment) plus a much lower floor once one of those exists —
      no task ID yet, needs a design pass first.
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
      can drop into (→ P1.21's Notifications tab, the first consumer).
- [x] **P1.15 — Toast/snackbar notifications.** General transient-message
      primitive (`src/ui/toast.ts` + `TiledScene.showToast()`): auto-fading
      bottom-center snackbar stack, info/error kinds, rendered above the modal
      layer; every rejected player-action request (8 call sites — the count had
      grown past CR6.1's five) now surfaces an error toast. Background request
      rejections (`request_map_window`, `mark_notifications_read`) stay
      console-only deliberately. (CR6.1)
- [x] **P1.16 — Entity details panel.** The four map "Details" stubs (own/enemy
      mothership, vessel, asteroid) now open modal panels rendered live from
      `gameState` (pattern: CLAUDE.md § UI library, `dialog.ts`); the own-ship
      panel folds in the Command Module readout + Upgrade action, its "Enter"
      enters the ship scene, and its "Move" button is renamed "Warp" (relocation
      itself → P1.22). Still open: the enemy-ship Message and Attack buttons
      stay stubs (→ P3.5 / P5.5). (CR6.2)
- [ ] **P1.17 — Fix: vessel-recall cargo not reflected client-side.**
      Investigated (July 2026), not reproducible: a full static trace of the
      server→client push pipeline plus a live `/verify` repro (both a manual
      mid-mining recall and a full mine-out auto-recall, each through to
      docking) showed the deposit landing correctly and the resource bar
      updating immediately in both cases. Also confirmed while investigating:
      mining only starts accruing at actual arrival and cargo only deposits at
      actual dock — not earlier in either case, matching the intended design.
      Left unchecked pending a retest with more specific repro details. One real
      but _unconfirmed_ candidate surfaced along the way: the resource bar's
      compact "1.2k"-style rounding (`formatCompactCount`) can hide a small
      deposit once a stockpile passes 1000 — worth checking first on a retest.
      (Playtest feedback, July 2026)
- [x] **P1.18 — One module per type.** `request_build_module` rejects a second
      module of a type the player already owns (any level, pending or settled);
      the ship-scene build-offer UI hides types already placed instead of
      offering a button that would just error. (Playtest feedback, July 2026)
- [x] **P1.19 — Toast on every notification.** Every `notification` server-push
      now surfaces a toast on the active scene, not just rejected actions. Still
      open: P2.5's offline catch-up could flash many completions past
      `MAX_ACTIVE_TOASTS` at once on load (→ P2.5); the P1.21 feed is the full
      record either way. (Playtest feedback, July 2026)
- [ ] **P1.20 — Ship module details dialog.** Extend the P1.16 details-panel
      pattern to ship-scene modules (Command Module, Crew Quarters, Trading
      Post, etc.) — tapping a module opens a details dialog with its stats,
      level, and pending build/upgrade countdown, the same affordance the map
      entities already have. Needs P1.16. (Playtest feedback, July 2026)
- [ ] **P1.21 — Notifications tab (Mail panel, part 1).** Pulled forward from
      P3.5 (playtest feedback, July 2026): the Notifications tab doesn't need
      networking — it's just a real scrollable-list UI over the P1.5 feed,
      replacing the console dump, so it doesn't have to wait on P3.1. The first
      scrollable-list panel (P1.14's open door); P6.3's future Events panel can
      reuse the same list-rendering work. Also renames the HUD's "Events"
      button/badge/`openEventsFeed()` to "Mail" — that naming is a leftover
      misnomer now that "Events" means P6.3's curated-content panel, not
      notifications. P3.5 later adds the Player Mail / System Mail tabs to this
      same panel. Needs P1.5, P1.14.
- [ ] **P1.22 — Basic mothership warp/relocation.** Split from the original
      "mothership warp" task into an earlier, alliance-free half (dependency
      audit, July 2026): wires up the P1.16 "Warp" button stub. Destination
      picker: a draggable 4\*4 footprint overlay on the map, colored per cell —
      red (occupied by another mothership/asteroid), yellow (a neighbor cell in
      the footprint is red), green (clear) — confirm enabled only once the whole
      footprint is green; cancel backs out. Dragging the footprint
      pans/re-centers the P1.13 AOI window (reusing `request_map_window`) so the
      client has live occupancy data to color against; the server re-verifies
      the footprint is actually clear at confirm time (never trust the client's
      picker state) — same shape as P1.3's room-grid placement check, but
      against world entities instead of the room grid. Dragging the footprint is
      a distinct input mode from `TiledScene`'s normal drag-to-pan camera (§
      Input model, CLAUDE.md) — while the picker is open it needs to own drag
      gestures itself, the way an open dialog already captures all pointer
      input. Fuel cost scales with warp distance — the first real fuel sink
      (amounts are a balancing stub, → P2.6). Requires no vessels currently
      deployed outside the mothership (all must be docked); triggers CR1.4 (a
      moved mothership must not strand a vessel already in flight — already
      fixed generically via the `returning` flag on `VesselMoveEvent`, but
      re-verify against a live relocation). P4.7 later adds the alliance-driven
      framing and swaps the cost to a "warp core" item. Needs P1.16, P1.13. Open
      idea, not yet scoped (playtest feedback, July 2026): fuel is envisioned as
      the broader "leaves the system" currency — routine vessel dispatch (README
      § Design principles) and a future, undefined "expeditions" feature are
      planned further sinks alongside warp; no task ID yet, and retrofitting a
      cost onto today's free vessel dispatch needs its own design pass.

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
- **P3.4 — HTTP fallback for `generate_map`.** Moved to Phase 6, alongside P6.4
  (dependency audit, July 2026) — it has no actual dependency on Phase 3's
  networking work, only on the web-browser platform effort it unlocks.
- [ ] **P3.5 — Mail panel: Player Mail + System Mail tabs.** Adds the remaining
      two tabs to P1.21's Mail panel: **Player Mail** for player-to-player
      messaging (the enemy-ship "Message" button's real destination, P1.16's
      stub) and **System Mail** for server-composed announcements/GM messages.
      Split from the original "player-to-player mail" task (playtest feedback,
      July 2026) because these two need the networked event bus for real
      cross-player delivery, unlike P1.21's Notifications tab. "Events" (P6.3)
      is a separate, curated-content panel — not notifications. Needs P3.1,
      P1.21.
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
- [ ] **P4.7 — Alliance-aware warp + warp core item.** Refines P1.22's basic
      warp once alliances exist: the main draw becomes repositioning near your
      alliance (P4.1), and the fuel cost is swapped for 1 "warp core" — a new
      minimal item type introduced by this task, ahead of P6.5's full inventory
      panel (which later becomes the general UI for this and future item types).
      Needs P4.1, P1.22.
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
      (P1.10's open door) belong to this resolution. Open design idea, not yet
      committed: since P1.6 keeps mined cargo on the vessel until it docks and a
      mothership's resources sit in its counts, a mothership raid or catching a
      vessel mid-mining/mid-return is a looting opportunity, not just a damage
      exchange — needs its own design pass (what's stealable, whether a raid
      needs to "win" first, defender recourse). Needs P3.1, P5.4.
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
- [ ] **P6.3 — Curated Events panel.** Reframed from "notification feed" — that
      moved to P1.21's Mail panel (playtest feedback, July 2026). This is a
      distinct feature: server-curated live content (holiday specials, team
      contests) with its own definitions, scheduling, and participation/rewards
      — no existing backend to lean on, so needs its own design pass (a
      `/roadmap-task` design-review pause) before implementation, likely reusing
      P1.21's scrollable-panel work. Needs its own HUD button (P1.21 renamed the
      old "Events" button to "Mail", so this reintroduces an Events button
      pointed at the new panel). Needs P1.21.
- [ ] **P6.4 — Mobile builds (Android/iOS).** Bring up
      `deno task tauri android|ios` (README § Other platforms). The game is
      mobile-first by design — portrait layout and touch input already hold — so
      this is mostly build wiring, performance, and on-device verification.
      Worth pulling early once the core loop stabilizes.
- [ ] **P3.4 — HTTP fallback for `generate_map`** _(moved from Phase 3;
      dependency audit, July 2026)_. Fetch-based map source behind the same
      `buildTileMap` signature — unlocks the planned web-browser platform
      (update the CLAUDE.md Platform line when done). No real dependency on
      Phase 3's networking; it only ever depended on wanting a web build, so it
      belongs alongside P6.4's other-platforms work instead.
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
- [ ] **P6.8 — Dialog column layout + Trading Post shop redesign.** Generalize
      `dialog-layout.ts`/`dialog.ts` with real multi-column grid support (today
      is row/cell only), then rebuild the P1.12 shop as 3 columns of bordered
      deal boxes: border color by rarity (green common / blue uncommon / purple
      rare), two text rows per box ("+" get-side icon/amount, "-" give-side
      icon/cost). Future panels (P3.5 Mail, P6.3 Events) can reuse the column
      support. Needs P1.12, P1.14. (Playtest feedback, July 2026)
- [ ] **P6.9 — Minimap two-tier zoom revamp.** Replace the current fixed view
      (too small, mostly blank outside the loaded window) with two modes: at
      normal zoom, show the live 100\*100 P1.13 AOI window (everything loaded);
      zoomed all the way out, show the full 1000\*1000 map with only player
      markers, interest-area outlines, and background — omitting individual
      asteroids, since ~1920 of them at that scale is unreadable clutter, not a
      useful reference. Needs P1.9, P1.13. (Playtest feedback, July 2026)
- [ ] **P6.10 — Context-sensitive resource bar + expandable detail dialog.**
      Trim the always-on-screen resource bar per scene instead of showing all 5
      `ResourceKind`s everywhere: the ship scene shows the 3 material resources
      (construction/highTech/biological, no cap shown) plus crew (with cap); the
      map scene shows only fuel (the travel-relevant resource — P1.22's warp
      cost), freeing HUD space crew doesn't need there. Tapping either group
      opens a dialog with the full breakdown: all 5 resources with caps and live
      production rates. Needs P1.2, P1.10, P1.11. (Playtest feedback, July 2026)
