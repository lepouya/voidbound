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
- [x] **CR1.2 [fix] Arrival notifications stamped at settle time.**
      `settle_vessel_arrivals` passes `now_ms` to `push_notification` for both
      the docked and parked branches, while `settle_mining` deliberately
      back-stamps to `completes_at`. A lazily settled arrival gets a wrong feed
      timestamp. Fix: stamp with `vessel.arrival_at`; extend the
      arrival-notification test to assert the timestamp.
- [x] **CR1.3 [hardening] Cross-thread push emission can reorder.** Scheduler
      and command handlers both drain-then-emit after releasing the lock; two
      concurrent drains can interleave (e.g. an older `Resources` push arriving
      after a newer one). Harmless in-process, but exactly what P3.1's sequence
      numbers exist to prevent. Action: add a note to SERVER.md § Ordering so
      the socket implementation doesn't inherit the assumption; optionally emit
      under a small emission lock until then. Done: SERVER.md § Ordering now
      documents the in-process reordering and the sequence-number fix P3.1
      needs.
- [x] **CR1.4 [hardening] A moved mothership strands returning vessels.**
      Docked-arrival detection re-derives "is this a return" from `is_dock_tile`
      against the mothership's _current_ position; any future mothership move
      (voluntary Move button, P5.8 forced warp) between a return's dispatch and
      arrival leaves the vessel parked forever with its cargo. Impossible today
      (ships never move) — fix before any relocation feature lands, e.g. carry a
      `returning` flag on the event instead of re-deriving from geometry at
      arrival. Done: `VesselMoveEventData`/`VesselMoveEvent` gained a
      `returning` bool, stamped `false` at dispatch (`dispatch_vessel`,
      `mine_asteroid`) and `true` in `return_leg` (recall + mining auto-return);
      `settle_vessel_arrivals` and the client's
      `MapLevel.syncVessels`/`applyVesselMoveEvent` now read that flag instead
      of re-deriving docking from mothership geometry. Regression test
      `returning_vessel_docks_even_if_mothership_moved_after_dispatch` relocates
      the mothership mid-return and asserts the vessel still docks.
- [x] **CR1.5 [hardening] Vessels are free and unlimited.** `dispatch_vessel`
      has no cost, cooldown, or fleet cap; parked vessels persist forever in the
      table and snapshot. P5.3's vessel crews bound this properly — until then
      consider a cheap `MAX_VESSELS` guard (fold into P2.5). Done: added
      `MAX_VESSELS` (20) and `ServerState::player_vessel_count()`; both
      `dispatch_vessel` and `mine_asteroid` reject once the player's fleet is at
      the cap. Dispatch cost/cooldown remain open, tracked separately at CR6.5.
- [x] **CR1.6 [idea] "Asteroid mined out" notification names nothing** — no
      class/tier/location, unlike the other feed messages. Compose it like the
      mining-complete message does. Done: the message now reads "Asteroid mined
      out — {tier} {resource} deposit at ({col}, {row})", reusing
      `resource_display_name` and the same `(col, row)` location format
      `vessel-arrived` already uses. Regression test asserts the exact string on
      the seeded mining-completion asteroid.

## 2. TypeScript client — bugs and corner cases

- [x] **CR2.1 [fix] `TilesetRegistry.getGraphic` hides out-of-range tile ids.**
      The final `sheet.getSprite(col, row)!` turns a bad `tileId` into
      `undefined`-as-`Sprite` and a distant, contextless crash. Throw explicitly
      with tileset name + id, matching the `png()` helper's throw-early
      philosophy.
- [x] **CR2.2 [hardening] AOI safety invariant is comment-enforced only.**
      `MAP_VIEW_TILES_CAP / 2 + AOI_REQUERY_TILES < AOI_SPAN / 2` spans the
      language boundary (map-level.ts ↔ game_state.rs) with no test. Move the
      client constants into a pure module (with a TS mirror of `AOI_SPAN`) and
      add a test asserting the inequality — the same drift-catcher class as the
      tileset-geometry test. Done: constants moved to `src/aoi-config.ts` (with
      an `AOI_SPAN` mirror), `map-level.ts` imports from it, and
      `tests/aoi_config_test.ts` asserts the inequality; the Rust doc comment on
      `AOI_SPAN` now points at the new module and test.
- [x] **CR2.3 [fix] `src/event-id.ts` is dead code.** `newEventId()` has zero
      consumers since every action became server-verified. Either delete it (and
      the "purely local actions" branch in `/add-game-event`) or keep it as a
      consciously documented escape hatch. Kept: doc comment in `event-id.ts`
      and the `/add-game-event` skill now state explicitly that it's an
      intentional escape hatch, not dead code to clean up.
- [x] **CR2.4 [hardening] `Date.now()` call sites are the future P3.2 sweep.**
      `applyVesselMoveEvent`, the minimap's `vesselWorldPos`, and the countdown
      labels all read the local clock — correct in-process, wrong once the
      server is remote. Largely resolved by CR4.3 (single lerp module = single
      `serverNow()` seam); otherwise keep the list. Done: added `serverNow()` to
      `src/game-state.ts` (returns `Date.now()` today, doc comment points at
      SERVER.md § Time and P3.2) and routed all five call sites —
      `MapLevel.syncVessels`/`applyVesselMoveEvent`, the minimap's
      `vesselWorldPos` caller, and `ShipLevel.createModuleActor`/ `onPostUpdate`
      — through it, so P3.2's clock-offset handshake only has to change one
      function. CR4.3's fuller vessel-math dedup remains open separately.

## 3. Tools / art pipeline

- [x] **CR3.1 [idea] `gen_asteroids.sh` renders 3 button states into a 1*1
      sheet** — two of the three `svg_ui_gen.py` state renders are computed and
      discarded. Harmless; a `--states 1` flag would drop the waste. Done: added
      `--states N` (1-3, default 3) to `svg_ui_gen.py`, honored by
      `process_svg_states`; `gen_asteroids.sh` now passes `--states 1`.
      Regenerated PNGs are byte-identical to before. Regression test
      `test_process_svg_states_respects_num_states` added.
- [x] **CR3.2 [idea] `art/maps/ship-objects-2.png` is referenced by no
      generator.** Confirm it's intentionally parked source art or delete. Done:
      confirmed no generator references it (only `ship-objects.png`, without
      `-2`, is used by `art/gen_ship_level.sh`); kept as intentionally parked
      source art, documented with a comment in `gen_ship_level.sh` pointing back
      at this item.

## 4. Refactor / reuse / simplification

- [x] **CR4.1 [idea] Extract button-def factories.** The 6-line
      `frameTile/activeFrameTile/disabledFrameTile/tile/activeTile/
      disabledTile`
      block repeats ~15 times across map-level.ts, ship-level.ts,
      tiled-scene.ts; `MapLevel.createMothershipActor`'s local `roundButton()`
      already found the right shape. Promote `roundButton`/ `squareButton`
      helpers into `src/ui/button.ts`. Largest noise reduction available. Done:
      `roundButton(opts)`/`squareButton(opts)` added to `src/ui/button.ts` (icon
      name + label/badge/disabled/onPressed in, full frame+icon ButtonDef out);
      every call site in map-level.ts, ship-level.ts, tiled-scene.ts, and
      dialog.ts's close button converted.
- [x] **CR4.2 [idea] Small shared reconciler helper.** The four `sync*` methods
      share a skeleton (kill absentees, diff `applied*` map, rebuild changed).
      Full generalization isn't worth the quirks (selection carry-over, force
      re-lerp, hire hosts) — extract just the common diff loop so the next
      server-owned entity type (P4.1 alliances) is cheap. Done: added
      `TiledScene.reconcileActors()` (src/tiled-scene.ts) — the kill-absentee +
      diff-and-rebuild skeleton, with `onAdd`/`onRemove` hooks for
      entity-specific bookkeeping — and converted `MapLevel.syncMotherships`/
      `syncAsteroids` (the two that fit the plain shape) to use it, dropping ~20
      duplicated lines. `syncVessels` (redirect-in-place lerp, arrival-based
      respawn skip) and `syncModules` (multiple side-derived applied maps,
      selection carry-over) keep their own loops, as the quirks note
      anticipated. Verified with `/verify`: map scene renders both motherships
      and a selected asteroid's Details/Mine buttons+badge, and Mine correctly
      dispatches a vessel and rebuilds the asteroid actor with no console
      errors.
- [x] **CR4.3 [idea] Unify the vessel lerp.** The timestamp lerp exists three
      times: Rust `vessel_position`, TS `applyVesselMoveEvent`, TS minimap
      `vesselWorldPos`. A pure `vessel-math.ts` would deduplicate the TS copies,
      gain unit tests, and become the single `serverNow()` call site for P3.2
      (see CR2.4). Done: added `src/vessel-math.ts`
      (`vesselMoveProgress`/`vesselWorldPos`, structurally typed against
      `VesselMoveEvent` via a `VesselLeg` interface) with
      `tests/vessel_math_test.ts`; `MapLevel.applyVesselMoveEvent` (dropping its
      local `tileCenter` helper) and the minimap's `vesselWorldPos` both now
      call it, so `serverNow()` is the only clock read left in either call site.
      The Rust `vessel_position`/`move_progress` mirror is unchanged
      (cross-language, not a TS duplicate) but is cross-referenced in the new
      module's doc comment. Verified with `/verify`: dispatched a vessel and
      watched it animate along its path on the map scene with no console errors;
      CLAUDE.md's pure-module list updated to include the new file.
- [x] **CR4.4 [idea] Rust micro-dedup.** `dispatch_vessel` / `mine_asteroid`
      duplicate outbound-event construction (share an `outbound_leg()` mirroring
      `return_leg()`); `ResourceCounts::add`/`spend` could share a
      `slot_mut(kind)`. Done: added `ServerState::outbound_leg()` (owns vessel
      id assignment, owner identity, arrival-time derivation,
      `returning:
      false`), used by both `dispatch_vessel` and
      `mine_asteroid`; added `ResourceCounts::slot_mut(kind)`, used by both
      `add` and `spend`. Pure internal refactor — no wire-format or behavior
      change; covered by the existing dispatch/mine/recall Rust test suite (all
      69 tests pass).
- [x] **CR4.5 [hardening] No linter runs anywhere.** Add `deno task lint`
      (`lint:ts` = `deno lint`, `lint:rs` = clippy) following the task-halves
      convention, wire into CI. Since CLAUDE.md forbids running cargo directly,
      the task wrapper is also the only sanctioned clippy entry point. Done:
      added `lint`/`lint:ts`/`lint:rs` to deno.json; CI's frontend job runs
      `lint:ts`, the rust job runs `cargo clippy -- -D warnings` (with a new
      `clippy` toolchain component). Fixed everything the linters actually
      caught to keep both clean: `deno.json` gained an `imports` map so tests
      use bare `@std/assert`/`@std/path` specifiers instead of inline `jsr:`
      prefixes (`no-import-prefix`); `vite.config.ts`'s config callback dropped
      an unused `async` (`require-await`); `ship-level.ts`'s `openShopDialog`
      got a documented `deno-lint-ignore prefer-const` for a `let` that's
      structurally forward-referenced in a closure; and Rust's
      `room_origin_at`/`drain_pushes` picked up clippy's suggested
      `Range::contains`/`is_none_or` forms, while `outbound_leg` (CR4.4) had its
      8 positional args (over clippy's 7-arg threshold) collapsed into
      `src`/`dest` tuples. CLAUDE.md's steering line and toolchain/testing
      sections updated to mention `lint`. Verified with
      `deno task format && deno task check && deno task lint && deno task test`
      (all green, 69 Rust + 101 Deno tests).

## 5. Test-coverage additions

- [x] **CR5.1** Rust: a failed paid refresh (insufficient credits) must not
      consume the daily refresh slot. Done: `refresh_deals` already spent
      credits via `spend_trade` before incrementing `deal_refreshes_used`, so no
      code change was needed — added regression test
      `failed_paid_refresh_does_not_consume_the_daily_slot` asserting an
      unaffordable second refresh returns `Err` and leaves
      `deal_refreshes_used`/credits untouched.
- [x] **CR5.2** Rust: arrival-notification timestamp assertion (with CR1.2).
- [x] **CR5.3** Rust/TS: AOI invariant test (with CR2.2).
- [x] **CR5.4** TS: confirm `hud-layout`'s `center` direction has coverage; add
      if not. Done: `center` was already covered on both axes (`middle-left`
      vertical, `top-center` horizontal), but the `offset` parameter was never
      exercised for the `center` direction — added
      `'center' offset shifts the symmetric group along the axis` to
      `tests/hud_layout_test.ts`.
- [x] **CR5.5** Rust: `load_game_state`-ordering test (with CR1.1). Done:
      already covered by
      `snapshot_reflects_a_deposit_settled_within_the_same_call` (added
      alongside the CR1.1 fix itself, commit `8f1b12d`) — it settles a mining
      job to the point where the vessel is in flight on its return leg, then
      calls `snapshot()` at the exact arrival instant and asserts the returned
      `resources` already reflects the cargo deposit that docking settles inside
      that same call. No code change needed; the checkbox was simply never
      ticked.

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

- [x] **CR7.1 [idea] New skill: `/add-server-panel`.** The dialog +
      `bindDialogRows` + status-enum UX pattern (distinct-blocker labels like
      `levelUpStatus`/`hireStatus`) that the P1.12 shop established — P6.3 feed,
      P3.5 mail, and P5.1 research will each re-derive it otherwise. Done: added
      `.claude/skills/add-server-panel/SKILL.md`, distilling the shop's six-step
      shape (wire types → status enum → `build<Panel>Rows` →
      `open<Panel>Dialog` + `bindDialogRows` → server-verified action methods →
      wiring a HUD/entity button) with a checklist and pointers into
      `ship-level.ts`/`dialog.ts`; registered it in CLAUDE.md § Skills.
- [x] **CR7.2 [idea] Catalog-mirror checklist in `/add-game-event`.** The
      Rust-constant ↔ TS display mirror ↔ "keep in sync" comment ↔ cross-check
      test ritual has three instances (module/asteroid/trade catalogs) and a
      known failure mode (drift); make it a checklist step. Done: added a
      "Catalog mirror" bullet to `/add-game-event`'s checklist naming the
      display-mirror-pure-module requirement, the per-field "keep the two in
      sync" comment, and the manual field-by-field diff (no automated
      cross-language check exists) — with `MODULE_CATALOG`/`ASTEROID_TIERS`/
      `DEAL_REFRESH_COSTS_CREDITS` cited as the three existing instances to
      pattern-match against.
- [x] **CR7.3 [idea] Promote the UX principles into CLAUDE.md.** "Countdowns on
      timers, badges on degraded state, buttons everywhere the player would
      look, zero-and-earned starting states" currently lives only in session
      memory; it demonstrably shaped P1.10–P1.14 and belongs in CLAUDE.md §
      Conventions where any session or contributor sees it. Done: added a "UX
      principles (state must be visible)" subsection to CLAUDE.md § 3
      Conventions (between Input model and Z-ordering) with the four checks and
      a pointer at `/roadmap-task` step 2.

## 8. Housekeeping

- [x] **CR8.1** Add a LICENSE; fill `Cargo.toml` `authors`/`description` (pairs
      with P3.6 before anything goes public).
- [x] **CR8.2** Note in ROADMAP P2.1: `ServerState`'s data structs already
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
