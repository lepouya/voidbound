# Voidbound — Code Review (July 2026, Phase 1 close-out)

**Scope:** Full-repo `/phase-review` pass. Phase 1 (including the P1.17–P1.22
playtest-driven additions that landed after the original Phase 1 `/phase-review`
roll-up) is now fully checked off in `ROADMAP.md`, so this is the pass that
closes it out for good.

**Baseline:** commit `7705a7f` (the previous review's roll-up commit) through
`f4fe81e` (current `mainline` HEAD) — 22 commits, dated July 2026.

**Verdict:** Healthy. The 22 commits since the last review maintain the
codebase's established discipline — every Rust↔TS wire-shape and catalog mirror
pair diffed clean, the settlement/push-channel plumbing is internally
consistent, and new features (Mail scroll/headerRow, mothership warp) carry
their own test coverage. Five findings survive verification: one real (if minor)
display bug, one slow client-side memory-growth edge case, and three small
hardening/housekeeping items. No design or correctness problems in the
server-authoritative model itself.

## Process and rationale

See the `/phase-review` skill (`.claude/skills/phase-review/SKILL.md`) for the
process this document follows. Seven mechanical doc/skill inaccuracies found
along the way were fixed directly during the review pass (listed below) rather
than tracked as items here.

## How to use this file

Stable IDs `CR<section>.<n>` (never renumbered — this is a fresh document, its
own ID namespace). Severity tags: **[fix]** (real defect), **[hardening]**
(defensive/debt), **[idea]** (optional). Check an item off only when committed
and `deno task format` + `deno task check` + `deno task lint` + `deno task test`
pass (plus `/verify` when runtime behavior changed), with a "Done:" note
describing what actually happened.

## Client bugs

- [x] **CR1.1 [fix] — Ship module details panel double-rounds the crew-staffing
      percentage, occasionally under-reporting production by 1 unit.**
      `src/ship/ship-module-details.ts`'s `buildRows()` derives a display
      percentage `staffPct = crewScaledAmount(100, crew, required)` (one floor)
      and then scales the production amount a second time via
      `Math.floor((amount * staffPct) / 100)` (a second floor), instead of
      calling `crewScaledAmount(amount, crew, required)` directly the way the
      backend (`crew_scaled` in `game_state/modules.rs`) and every other TS call
      site do. The double-floor can under-report by 1: e.g. a crew-demanding
      module at `required=7, staffed=1` (a level-7 producer with
      `crewRequiredPerLevel=1`, one crew member) producing `amount=128` per tick
      — the true value is `floor(128*8/14) = 73`, but the panel computes
      `staffPct = floor(800/14) = 57` then `floor(128*57/100) = 72`. Low
      severity (cosmetic, one panel, one resource line) but a genuine mismatch
      between what the player is shown and what actually accrues. Fix: call
      `crewScaledAmount(amount, gameState.crew, crewRequiredForModules(...))`
      per resource instead of re-deriving from the already-rounded percentage;
      keep `staffPct` only for the "(N% staffed)" label text. Done:
      `buildRows()` now computes `crewRequired` once and calls
      `crewScaledAmount(amount, gameState.crew, crewRequired)` per resource for
      the displayed amount; `staffPct` is derived separately (still via
      `crewScaledAmount(100, ...)`) and used only for the "(N% staffed)" label.
      `deno task format`/`check`/`lint`/`test` all pass (119 TS + 76 Rust
      tests). No runtime `/verify` needed — display-only arithmetic fix, no new
      code path.

- [x] **CR1.2 [hardening] — `gameState.notifications` has no local cap and only
      reconciles against the server's authoritative (100-entry-capped) list when
      Mail is opened with an unread item.** The backend caps
      `ServerState.notifications` at `MAX_NOTIFICATIONS = 100`
      (`game_state/state.rs`), evicting the oldest silently — evictions are
      never pushed as removals, only new entries are pushed
      (`ServerPush::Notification`). Client-side, `GameState.applyServerPush`'s
      `"notification"` case only ever adds/updates by id
      (`s.notifications.set(...)`, `src/state/game-state.ts`) with nothing that
      prunes. The only wholesale reconciliation is `MailDialog.markAllRead()` →
      `mark_notifications_read` → `gameState.syncNotifications(...)`, and that
      call is skipped outright when `unreadNotificationCount() === 0`
      (`src/scene/mail-dialog.ts`). A session that runs long without the player
      ever opening Mail (or one driven by an agent/automated playtest that never
      does) accumulates notification entries in the client `Map` past what the
      server itself still retains — slow, unbounded growth with no functional
      symptom today (the badge count and toasts both still read correctly from
      the over-populated table), but a latent leak worth closing before P2.1's
      save/load work has to reason about this table's size. Fix: cap client-side
      inserts at the same 100 (evict the oldest by `createdAt` on `set`), or
      note the asymmetry explicitly if a deliberate resync-on-next-load is
      preferred instead. Done: added `MAX_NOTIFICATIONS = 100` to
      `src/state/game-state.ts` (a "keep in sync" mirror of the Rust constant)
      and an `evictOldestNotifications()` helper called after every incremental
      `"notification"` push insert, evicting the oldest entry by `createdAt`
      once the table exceeds the cap. `load()`/`syncNotifications()` are
      untouched — both already replace the table wholesale from an
      already-capped server response, so no eviction is needed there. Added
      `notification pushes evict the oldest entry past the 100 cap` to
      `tests/game_state_test.ts`. `deno task format`/`check`/`lint`/`test` all
      pass (120 TS + 76 Rust tests). No runtime `/verify` needed — the push path
      and its table mutation are unchanged in shape, just capped.

## Backend/mirror hardening

- [x] **CR2.1 [hardening] — `MODULE_SPAN = 4` is duplicated between Rust and TS
      with no "keep in sync" tag, unlike every other mirrored constant in the
      codebase.** `src-tauri/src/game_state/modules.rs:262` and
      `src/ship/ship-modules.ts:40` both hardcode `4` independently — the Rust
      side uses it to compute `module_anchor_at`'s inset from `ROOM_SPAN`, the
      TS side uses it for `moduleAnchorAt(...)`'s footprint parameter and the
      `TileActor`'s rendered `width`/`height`. Every other cross-language
      constant in the repo (the module catalog, asteroid tiers, deal refresh
      costs, crew hire cost/time, `AOI_SPAN`, `WARP_FUEL_PER_TILE`) carries an
      explicit `// keep the two in sync` comment pointing at its counterpart;
      this one doesn't, so a future change to one side (e.g. a module footprint
      size change) could silently desync the room-inset math from the rendered
      sprite size. Fix: add the same comment convention to both constants (or
      derive one client-side from `SHIP_ROOM_GRID`'s `span` if that's ever
      intended to vary). Done: added the standard "Mirrors MODULE_SPAN in
      `<other file>` — keep the two in sync" doc comment to both `modules.rs`'s
      and `ship-modules.ts`'s `MODULE_SPAN` constants, matching the convention
      used by every other cross-language constant. Comment-only change, no
      behavior touched. `deno task format`/`check`/`lint`/`test` all pass (120
      TS + 76 Rust tests). No runtime `/verify` needed.

## Test-coverage additions

- [x] **CR3.1 [idea] — `GameState.subscribeToNotifications` (the P1.19
      toast-on-every-notification listener) has no test assertions.**
      `tests/game_state_test.ts`'s
      `applyServerPush routes each variant to the
      right table` test
      exercises the `"notification"` push's table update but never registers a
      `subscribeToNotifications` listener to assert it fires exactly once per
      fresh push (and not for the `load()`/ `syncNotifications()` backlog, per
      the method's own doc comment). A regression here — toasts silently
      stopping, or firing for the initial snapshot's unread backlog and flooding
      the toast layer — would ship unnoticed by the test suite. Add a case
      alongside the existing `applyServerPush`/`unreadNotificationCount` tests.
      Done: added
      `subscribeToNotifications fires once per fresh push, never for a
      backlog`
      to `tests/game_state_test.ts`, asserting the listener stays silent through
      a `load()` backlog and a `syncNotifications()` backlog, fires exactly once
      (with the pushed notification's id) for a fresh
      `applyServerPush({ type: "notification", ... })`, and stops firing after
      the returned unsubscribe function is called.
      `deno task
      format`/`check`/`lint`/`test` all pass (121 TS + 76 Rust
      tests). No runtime `/verify` needed — test-only addition, no source
      behavior changed.

## Tools/pipeline housekeeping

- [ ] **CR4.1 [idea] — `tools/sprite_extract.py` has no caller in any
      `art/gen_*.sh` script and no test file, unlike its three siblings.**
      `sprite_merge.py`, `sprite_transition.py`, and `svg_ui_gen.py` are all
      invoked from at least one `art/gen_*.sh` script and (for `svg_ui_gen.py`)
      have a dedicated `test_svg_ui_gen.py`; `tmj_to_tilemap.py` has
      `test_tmj_to_tilemap.py`. `sprite_extract.py` is referenced only in prose
      (its own docstring is echoed by `sprite_merge.py`'s design-decisions
      comment, and it's listed in the `/gen-art` skill's tool table) but nothing
      currently runs it. Not dead code to delete outright — it's plausibly kept
      as available infrastructure for a future single-source-sheet pipeline
      script, similar in spirit to `newEventId()`'s documented escape-hatch
      status — but unlike that function, nothing here says so explicitly. Either
      add a one- line comment stating it's intentionally on standby, wire it
      into a script, or remove it next time someone is in this file.

## Fixed during the review pass

Mechanical doc/skill inaccuracies, corrected directly rather than tracked as
items (per the `/phase-review` process):

- `src-tauri/src/game_state/state.rs`'s `time_scale()` doc comment said
  `` `deno task tauri dev:fast` `` — the real task (per `deno.json`) is
  `` `deno task dev:fast` ``. Fixed.
- `ROADMAP.md`'s "How to use this file" line and
  `.claude/skills/roadmap-task/SKILL.md`'s step 4 ("Gate") both listed only
  `format`+`check`+`test` as the definition of done, omitting `deno task lint` —
  which CI (`.github/workflows/ci.yml`) and CLAUDE.md's own top-line steering
  both already treat as required. Both fixed to list all four.
- `.claude/skills/gen-art/SKILL.md`'s Python-tools table omitted
  `svg_ui_gen.py`, even though `art/gen_ui.sh` and `art/gen_asteroids.sh` both
  call it. Added.
- `CLAUDE.md`'s Testing bullet described the `tests/` suite with five now-stale
  examples (anchor math, TileRef parsing, HUD layout, dock-tile math, the
  PNG-catalog cross-check) that undersell the current 16-file suite — missing
  any mention of `game_state_test.ts` (the largest file, 612 lines) or the
  module/asteroid/trade catalog mirror tests. Reworded as an explicit
  non-exhaustive ("e.g.") list naming the biggest omissions.
- `CLAUDE.md`'s list of pure, Deno-testable modules was missing five modules
  that already exist and already have dedicated test files:
  `src/map/aoi-config.ts`, `src/map/warp-footprint.ts`,
  `src/map/asteroid-catalog.ts`, `src/ship/module-catalog.ts`, and
  `src/ship/trade-catalog.ts`. Added.
- `.claude/skills/add-game-event/SKILL.md`'s catalog-mirror checklist said "the
  three existing instances are the template" and named
  `MODULE_CATALOG`/`ASTEROID_TIERS`/`DEAL_REFRESH_COSTS_CREDITS`, omitting the
  fourth existing mirror pair (`HIRE_COST_BIOLOGICAL`/`HIRE_TIME_MS`,
  `src/ship/module-catalog.ts` ↔ `game_state/crew.rs`, both sides already
  carrying "keep the two in sync" comments). Added it to the list and dropped
  the now-wrong "three."

## Verified-sound (no action)

- Every Rust↔TS wire-shape mirror was diffed field-by-field: `ResourceCounts`,
  `MothershipData`, `VesselMoveEventData`/`VesselMoveEvent`, `AsteroidData`,
  `AsteroidMining`, `ModuleData`/`ModulePendingBuild`, `DealData`/`DealsData`,
  `CrewData`/`PendingHire`, `NotificationData`, `MapWindow`/`MapWindowData`,
  `GameStateData`, the `ServerPush` enum/union, and every command's
  `*ActionResponse` shape (`ModuleActionResponse`, `CrewActionResponse`,
  `DealActionResponse`, `MothershipActionResponse`). All match.
- Every catalog/constant mirror was diffed value-by-value: `MODULE_CATALOG` (all
  8 entries), `ASTEROID_TIERS` (all 3 tiers), `DEAL_REFRESH_COSTS_CREDITS`,
  `HIRE_COST_BIOLOGICAL`/`HIRE_TIME_MS`, `WARP_FUEL_PER_TILE`,
  `MINE_UNITS_PER_HOUR`, and `AOI_SPAN` (which also has its own
  `tests/aoi_config_test.ts` safety-invariant assertion, CR2.2 from the prior
  review). All match. (CR2.1 above is the one _untagged_ duplicate found.)
- The P1.22 warp picker's client-side footprint-occupancy preview
  (`computeFootprintColors` against `gameState.motherships`/`asteroids`, both
  AOI-windowed) stays accurate even after panning the camera far from the ship's
  start position: `MapLevel.onPreUpdate`'s AOI re-centering hysteresis runs
  unconditionally on `camera.pos` (not gated by `warpPicker.isActive()`), so the
  window — and therefore the loaded mothership/asteroid data — follows the
  camera the picker's destination is derived from. No gap between what the
  preview can see and what it needs to.
- The settlement ordering contract (`accrue_production` → `settle_hire` →
  `settle_mining` → `settle_vessel_arrivals` → `settle_deals`,
  `ServerState::
  settle`) and each command's own partial-settle calls were
  checked for consistency with the "never credit a ratio/level change
  retroactively" invariant documented inline; all hold, backed by existing
  regression tests
  (`hire_settles_after_production_so_the_ratio_is_not_retroactive`,
  `production_is_not_retroactively_credited_before_a_build_completes`).
- `crew_scaled` (Rust) / `crewScaledAmount` (TS) — the core damping formula — is
  correct and matches between languages; the resource-bar staffing badge and
  `ModuleSync`'s understaffed-badge percentage both use it directly and are
  fine. Only the per-resource amount readout in `ship-module-details.ts`
  re-derives from the already-rounded percentage instead (CR1.1).
