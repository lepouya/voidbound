# Voidbound — Full-Project Code Review (July 2026)

A whole-repo review performed at the close of ROADMAP Phase 1 (baseline: commit
`bc01266`, 2026-07-11), covering the TypeScript client (`src/`, `tests/`), the
Rust backend (`src-tauri/`), the art/tooling pipeline (`tools/`, `art/`), every
root design doc, and the `.claude/skills/` library.

**Verdict:** no critical bugs. The server-authoritative architecture matches
README.md / SERVER.md faithfully, the pure-module test split is consistently
held, and the Rust game rules are well-tested. The findings below are minor
correctness issues, drift, and improvement opportunities.

## Process and rationale

How the review was conducted — repeat this recipe for future review passes:

1. **Read the design docs first** (README.md, SERVER.md, ROADMAP.md, CLAUDE.md),
   so every code observation could be judged against the stated design rather
   than taste.
2. **Read every source file in full**, in dependency order: Rust backend (game
   rules first — it is authoritative), then TS core (state, scenes, actors),
   then `src/ui/`, then tests, then tools/art scripts, then skills.
3. **Cross-check every "keep the two in sync" mirror pair** (Rust struct ↔ TS
   interface, Rust constant ↔ TS display mirror) field by field.
4. **Verify doc claims against code** — file paths, function names, asset
   prefixes, template snippets in skills.
5. **Fix mechanical doc/skill inaccuracies immediately** (they only get staler);
   **flag everything behavioral** for review here instead of changing it
   silently.

**How to use this file:** items have stable IDs (`CR<section>.<n>`) so sessions
and commits can reference them — same convention as `ROADMAP.md`. Work items
over multiple sessions; check one off when it is committed and
`deno task format` + `deno task check` + `deno task test` pass (plus `/verify`
when the change affects runtime behavior). Severity guide: **[fix]** = real
defect worth correcting, **[hardening]** = defensive/debt, **[idea]** = optional
improvement. When an item graduates into a real `ROADMAP.md` task, check it off
here with a pointer to the task ID.

## 1. Rust backend — bugs and corner cases

- [x] **CR1.1 [fix] `load_game_state` can return stale `resources`.** The
      `GameStateData` literal reads `resources: s.resources` before
      `active_vessels(now)` runs `settle_vessel_arrivals`, which can deposit
      mining cargo — so the snapshot's counts can miss a deposit settled in the
      same call. Self-healing (the deposit marks `resources_dirty`, so
      `finish_command` pushes corrected counts immediately after), but the
      field-order dependency is subtle: the comments protect `notifications`
      ordering yet miss `resources`. Fix: call `s.settle(now)` once at the top
      of the command, then build the struct with no ordering dependencies. Add a
      Rust test: a vessel due to dock deposits into the same snapshot's counts.
- [ ] **CR1.2 [fix] Arrival notifications stamped at settle time.**
      `settle_vessel_arrivals` passes `now_ms` to `push_notification` for both
      the docked and parked branches, while `settle_mining` deliberately
      back-stamps to `completes_at`. A lazily settled arrival gets a wrong feed
      timestamp. Fix: stamp with `vessel.arrival_at`; extend the
      arrival-notification test to assert the timestamp.
- [ ] **CR1.3 [hardening] Cross-thread push emission can reorder.** Scheduler
      and command handlers both drain-then-emit after releasing the lock; two
      concurrent drains can interleave (e.g. an older `Resources` push arriving
      after a newer one). Harmless in-process, but exactly what P3.1's sequence
      numbers exist to prevent. Action: add a note to SERVER.md § Ordering so
      the socket implementation doesn't inherit the assumption; optionally emit
      under a small emission lock until then.
- [ ] **CR1.4 [hardening] A moved mothership strands returning vessels.**
      Docked-arrival detection re-derives "is this a return" from `is_dock_tile`
      against the mothership's _current_ position; any future mothership move
      (voluntary Move button, P5.8 forced warp) between a return's dispatch and
      arrival leaves the vessel parked forever with its cargo. Impossible today
      (ships never move) — fix before any relocation feature lands, e.g. carry a
      `returning` flag on the event instead of re-deriving from geometry at
      arrival.
- [ ] **CR1.5 [hardening] Vessels are free and unlimited.** `dispatch_vessel`
      has no cost, cooldown, or fleet cap; parked vessels persist forever in the
      table and snapshot. P5.3's vessel crews bound this properly — until then
      consider a cheap `MAX_VESSELS` guard (fold into P2.5).
- [ ] **CR1.6 [idea] "Asteroid mined out" notification names nothing** — no
      class/tier/location, unlike the other feed messages. Compose it like the
      mining-complete message does.

## 2. TypeScript client — bugs and corner cases

- [ ] **CR2.1 [fix] `TilesetRegistry.getGraphic` hides out-of-range tile ids.**
      The final `sheet.getSprite(col, row)!` turns a bad `tileId` into
      `undefined`-as-`Sprite` and a distant, contextless crash. Throw explicitly
      with tileset name + id, matching the `png()` helper's throw-early
      philosophy.
- [ ] **CR2.2 [hardening] AOI safety invariant is comment-enforced only.**
      `MAP_VIEW_TILES_CAP / 2 + AOI_REQUERY_TILES < AOI_SPAN / 2` spans the
      language boundary (map-level.ts ↔ game_state.rs) with no test. Move the
      client constants into a pure module (with a TS mirror of `AOI_SPAN`) and
      add a test asserting the inequality — the same drift-catcher class as the
      tileset-geometry test.
- [ ] **CR2.3 [fix] `src/event-id.ts` is dead code.** `newEventId()` has zero
      consumers since every action became server-verified. Either delete it (and
      the "purely local actions" branch in `/add-game-event`) or keep it as a
      consciously documented escape hatch.
- [ ] **CR2.4 [hardening] `Date.now()` call sites are the future P3.2 sweep.**
      `applyVesselMoveEvent`, the minimap's `vesselWorldPos`, and the countdown
      labels all read the local clock — correct in-process, wrong once the
      server is remote. Largely resolved by CR4.3 (single lerp module = single
      `serverNow()` seam); otherwise keep the list.

## 3. Tools / art pipeline

- [ ] **CR3.1 [idea] `gen_asteroids.sh` renders 3 button states into a 1*1
      sheet** — two of the three `svg_ui_gen.py` state renders are computed and
      discarded. Harmless; a `--states 1` flag would drop the waste.
- [ ] **CR3.2 [idea] `art/maps/ship-objects-2.png` is referenced by no
      generator.** Confirm it's intentionally parked source art or delete.

## 4. Refactor / reuse / simplification

- [ ] **CR4.1 [idea] Extract button-def factories.** The 6-line
      `frameTile/activeFrameTile/disabledFrameTile/tile/activeTile/
      disabledTile`
      block repeats ~15 times across map-level.ts, ship-level.ts,
      tiled-scene.ts; `MapLevel.createMothershipActor`'s local `roundButton()`
      already found the right shape. Promote `roundButton`/ `squareButton`
      helpers into `src/ui/button.ts`. Largest noise reduction available.
- [ ] **CR4.2 [idea] Small shared reconciler helper.** The four `sync*` methods
      share a skeleton (kill absentees, diff `applied*` map, rebuild changed).
      Full generalization isn't worth the quirks (selection carry-over, force
      re-lerp, hire hosts) — extract just the common diff loop so the next
      server-owned entity type (P4.1 alliances) is cheap.
- [ ] **CR4.3 [idea] Unify the vessel lerp.** The timestamp lerp exists three
      times: Rust `vessel_position`, TS `applyVesselMoveEvent`, TS minimap
      `vesselWorldPos`. A pure `vessel-math.ts` would deduplicate the TS copies,
      gain unit tests, and become the single `serverNow()` call site for P3.2
      (see CR2.4).
- [ ] **CR4.4 [idea] Rust micro-dedup.** `dispatch_vessel` / `mine_asteroid`
      duplicate outbound-event construction (share an `outbound_leg()` mirroring
      `return_leg()`); `ResourceCounts::add`/`spend` could share a
      `slot_mut(kind)`.
- [ ] **CR4.5 [hardening] No linter runs anywhere.** Add `deno task lint`
      (`lint:ts` = `deno lint`, `lint:rs` = clippy) following the task-halves
      convention, wire into CI. Since CLAUDE.md forbids running cargo directly,
      the task wrapper is also the only sanctioned clippy entry point.

## 5. Test-coverage additions

- [ ] **CR5.1** Rust: a failed paid refresh (insufficient credits) must not
      consume the daily refresh slot.
- [ ] **CR5.2** Rust: arrival-notification timestamp assertion (with CR1.2).
- [ ] **CR5.3** Rust/TS: AOI invariant test (with CR2.2).
- [ ] **CR5.4** TS: confirm `hud-layout`'s `center` direction has coverage; add
      if not.
- [ ] **CR5.5** Rust: `load_game_state`-ordering test (with CR1.1).

## 6. ROADMAP additions to consider

Each of these is an "add/annotate a task in ROADMAP.md" action — check off here
once the roadmap entry exists.

- [ ] **CR6.1 Player-visible command feedback.** Every rejected request is a
      `console.warn` ("No rejection UI yet" appears five times). A
      toast/snackbar surface on the dialog/HUD primitives; pays off in every
      later feature. Suggested home: Phase 2.
- [ ] **CR6.2 Wire or task the stub buttons.** Own-mothership **Enter** →
      `goToScene("ship")` is a one-liner today; **Details** (mothership / vessel
      / asteroid) is a natural dialog-based "entity details panel" task; HUD
      **Shop** / **Items** and empty-tile **Move** have no backing tasks at all
      — decide their fate.
- [ ] **CR6.3 Mothership relocation.** The Move button exists; P5.8 covers only
      _forced_ warp. Voluntary relocation (fuel cost, cooldown) needs a task —
      and it triggers CR1.4.
- [ ] **CR6.4 Notification i18n before P3.1.** `NotificationData.message` is
      server-composed English prose baked into the wire format and (post P2.2)
      into saves. Switch to `kind` + structured params with client-side
      composition before the socket protocol and save format freeze; note in
      SERVER.md.
- [ ] **CR6.5 Vessel cap / dispatch cost stopgap** (see CR1.5) — fold into P2.5.
- [ ] **CR6.6 Onboarding/tutorial task** (Phase 6?) — code comments already call
      the first hire "a natural tutorial step later"; nothing tracks it.
- [ ] **CR6.7 Audio task** (Phase 6) — no sound/music task exists.
- [ ] **CR6.8 Colorblind accessibility requirement on P6.2.** Asteroid class is
      currently communicated by tint alone; per-class sprite shapes fix it —
      state it as a requirement of that task so it isn't lost.
- [ ] **CR6.9 Tooling task for CR4.5** (lint) if it doesn't land directly.

## 7. Skills and steering improvements

- [ ] **CR7.1 [idea] New skill: `/add-server-panel`.** The dialog +
      `bindDialogRows` + status-enum UX pattern (distinct-blocker labels like
      `levelUpStatus`/`hireStatus`) that the P1.12 shop established — P6.3 feed,
      P3.5 mail, and P5.1 research will each re-derive it otherwise.
- [ ] **CR7.2 [idea] Catalog-mirror checklist in `/add-game-event`.** The
      Rust-constant ↔ TS display mirror ↔ "keep in sync" comment ↔ cross-check
      test ritual has three instances (module/asteroid/trade catalogs) and a
      known failure mode (drift); make it a checklist step.
- [ ] **CR7.3 [idea] Promote the UX principles into CLAUDE.md.** "Countdowns on
      timers, badges on degraded state, buttons everywhere the player would
      look, zero-and-earned starting states" currently lives only in session
      memory; it demonstrably shaped P1.10–P1.14 and belongs in CLAUDE.md §
      Conventions where any session or contributor sees it.

## 8. Housekeeping

- [ ] **CR8.1** Add a LICENSE; fill `Cargo.toml` `authors`/`description` (pairs
      with P3.6 before anything goes public).
- [ ] **CR8.2** Note in ROADMAP P2.1: `ServerState`'s data structs already
      derive `Deserialize` (good prep), but `outbox`, `notified_arrivals`,
      `resources_dirty`, and `aoi` need `#[serde(skip)]`-style handling when
      save/load lands.

## 9. Fixed during the review pass (2026-07-11)

Doc/skill accuracy fixes applied immediately, per the process rule that
mechanical drift is corrected on sight:

- [x] **CR9.1** CLAUDE.md: `generate_map` attributed to `src-tauri/src/map.rs`
      (was lib.rs); Tauri import convention updated to the real subpath form
      (`@tauri-apps/api/core`).
- [x] **CR9.2** `src/game-state.ts`: `GameStateData` mirror comment pointed at
      game_state.rs (was lib.rs).
- [x] **CR9.3** `tests/tileset_geometry_test.ts`: removed the dangling reference
      to a deleted CODE_REVIEW doc (this file is its successor).
- [x] **CR9.4** `/add-tileset`: auto-register table rewritten for the real rules
      (`ui-frame-*` / `ui-icon-*`, 3\*1 state sheets, pointer to
      `AUTO_TILESET_RULES`).
- [x] **CR9.5** `/add-scene`: template matched to reality — `SceneMap` return
      shape, `.ts` import extensions, real frame/icon button form,
      `{ resourceBar, topRight, bottomRight }` return, map.rs, geometry-only
      variant note, updated scene reference blurbs.
- [x] **CR9.6** `/gen-art`: added `gen_asteroids.sh`, corrected gen_ui.sh
      outputs and auto-register prefixes, map.rs in the checklist.
- [x] **CR9.7** `/add-game-event`: canonical example `BuildModuleEvent` →
      `ModuleData` (self-snapshot pattern); noted the local-construction branch
      currently has zero users (see CR2.3).

## Verified-sound (no action)

Recorded so future reviews don't re-litigate them:

- Every Rust ↔ TS mirror pair diffed field-by-field is in sync (module catalog,
  asteroid tiers/rate, deal refresh table, hire constants, `crew_scaled` math,
  all wire shapes).
- SERVER.md's claims about current code all check out; `applyVesselMoveEvent`
  really lives in map-level.ts (distinct from `gameState.applyVesselEvent`).
- README design fidelity: Trading Post rules (give ≠ get at generation _and_
  acceptance, freebie, doubling refreshes, level-scaled slots), asteroid
  classes/tiers/durations (unit-tested against the README bands), metallic
  rarest at 1/8 weight, crew production-only penalty with "functional"
  consciously deferred, single-slot/single-resource asteroid rules kept as data
  so the large-asteroid door stays open.
- gen_ui.sh per-resource icon accents exactly match `ASTEROID_TINTS`.
- Scheduler/Condvar loop has no busy-wake or deadlock path; `finish_command`
  runs on error paths too, so partial-settle pushes still drain.
