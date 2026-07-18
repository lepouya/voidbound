# Voidbound Phase 1 Close-out Review — Pass 3

**Scope:** Whole-repository review after Phase 1, including design/steering
documents, Rust and TypeScript sources, tests, build/CI configuration, Python
and shell art tooling, generator scripts, and every checked-in skill. Generated
PNGs, lockfiles, and application icons were treated as generated artifacts;
their registrations and invariants were checked through source and tests.

**Baseline:** `54385c68430115c98344f6fd25c94e7d5ab1f1e7` (`54385c6`, clean
worktree)

**Date:** 2026-07-18

**Verdict:** The Phase 1 architecture is coherent and well covered for its
current single-player scope, but two state-ordering edges, four client-side
live-update defects, and a broken local SVG-render fallback should be closed
before persistence/networking and further art work make them harder to isolate.

## Process and rationale

This pass followed the checked-in `/phase-review` skill. It is a fresh close-out
pass after the two earlier Phase 1 reviews (30 findings from baseline `bc01266`,
then 5 findings from baseline `5065e6d`), not a carry-forward of either deleted
tracker.

## How to use this file

- IDs are stable and must never be renumbered.
- **[fix]** is a current defect, **[hardening]** is defensive work or debt, and
  **[idea]** is optional.
- Work one ID per commit (or a tightly coupled pair), titled with the ID.
- Check an item only after the change is committed and the gates in
  `/phase-review` pass. Append a `Done:` note describing the landed result.
- When every item is checked, roll durable facts into their permanent docs,
  record the review range in the Phase 1 roadmap header, and delete this file.

## 1. Backend bugs

- [x] **CR1.1 [hardening] — Authoritative updates have no revision, so an older
      response or push can overwrite newer client state.** `run_scheduler()` and
      `finish_command()` drain under the state lock but emit after releasing it;
      `SERVER.md` already notes that their pushes can arrive out of order.
      Independently, full command responses are applied last-writer-wins:
      `MailDialog.markAllRead()` replaces the notification table,
      `MapLevel.requestMapWindow()` replaces three world tables, and action
      responses replace resource/deal snapshots. A scheduler mutation after a
      command releases the lock but before its IPC response is applied can
      therefore land first and then be erased by the older response. Add a
      monotonically increasing authoritative revision (global or explicitly per
      domain) to snapshots, pushes, and full-state command responses, or
      serialize every outbound message through one ordered dispatcher; make
      `GameState` reject stale applications. Cover push/push and response/push
      inversions before P3.1 turns these shapes into network protocol.

      **Done:** Added a global, lock-assigned `Revisioned<T>` envelope to every
      game-state snapshot, command response, and push batch. `GameState` applies
      the token per whole-state slice and per entity, preserving newer entity
      updates/removal tombstones across late wholesale responses without
      discarding unrelated older response data. Added Rust batch-stamping and
      TypeScript push/push plus response/push inversion tests, updated the
      protocol/steering/skill docs, and runtime-verified the initial snapshot
      followed by a live production push.

- [ ] **CR1.2 [hardening] — Long elapsed intervals and extreme timestamps can
      overflow authoritative arithmetic.** `ServerState::accrue_production()`
      multiplies `scale_for_level(...) * ticks` and advances
      `last_production_at += ticks * tick_ms` without checked/saturating
      arithmetic; build, hire, travel, and mining deadlines similarly use plain
      `u64` addition, and `next_deadline()` adds to `last_production_at`.
      Ordinary live sessions are far below the limit, but P2.1/P2.5 will
      deserialize and catch up old or damaged saves, where debug builds can
      panic and release builds can wrap. Use checked/saturating helpers
      consistently, validate persisted timestamps, and add boundary tests near
      `u64::MAX` plus a very long offline-production window.

## 2. Client bugs

- [ ] **CR2.1 [fix] — Startup does not actually guarantee the push listener is
      ready before the initial snapshot.** `startServerPushListener()` starts
      the asynchronous `listen()` registration but returns `void`; `main.ts`
      immediately starts the loader while claiming the up-front call prevents
      missed pushes. A one-shot completion between `load_game_state` and
      listener readiness can be absent from the snapshot and never reach the
      client. Expose a shared listener readiness promise and have
      `GameStateResource.load()` await it before invoking `load_game_state`,
      while preserving the current catch-and-continue resilience if subscription
      fails. Add a dependency-injected ordering test for listener registration
      versus snapshot invocation.

- [ ] **CR2.2 [fix] — An open warp picker does not react to live occupancy or
      resource changes unless the camera crosses a tile boundary.**
      `WarpPicker.tick()` returns when `(col,row)` matches `lastComputed`, while
      `recompute()` reads `gameState.motherships`, `asteroids`, and fuel. An AOI
      response or push at the same camera position can leave a newly occupied
      footprint green, and a resource change can leave Confirm's affordability
      stale. The server rejects an invalid confirmation, but the live preview
      and button state are wrong. Subscribe/invalidate while the picker is
      active (and unsubscribe on close), or pass a relevant state revision into
      `tick()`; add a focused test for same-position state changes and
      runtime-verify the overlay.

- [ ] **CR2.3 [fix] — `labelPosition: "center"` still applies the below-button
      label's upward offset.** `spawnDialog()` places a centered label at
      `(0,0)` but first calls `resolveButtonLabel()`, whose default
      `labelOffset` is `(0,-1)` font sizes. P1.21's Mail tabs are therefore not
      vertically centered despite the public `ButtonDef` contract. Give centered
      labels a zero default offset while preserving an explicitly supplied
      `LabelDef.labelOffset`. Extract the placement/default resolver into pure
      logic if needed for a Deno regression test, then runtime-verify the tab
      strip.

- [ ] **CR2.4 [hardening] — Replayed notification pushes duplicate toasts even
      though the feed merge is idempotent.** In `GameState.applyServerPush()`,
      the notification is merged by ID, but every application calls all
      `notificationListeners`. A duplicate/replayed push therefore leaves one
      feed row yet shows another toast, contradicting the method's idempotency
      comment and `subscribeToNotifications()`'s “freshly-arrived” contract.
      Detect whether the notification ID was already present before firing the
      side-channel listeners (while still allowing the table entry to update),
      and extend the existing notification-listener test with duplicate/replay
      coverage.

## 3. Tools and pipeline

- [ ] **CR3.1 [hardening] — The TMJ converter silently treats Tiled transform
      flags as part of the tile ID.** Tiled stores horizontal/vertical/diagonal
      transform bits in the high bits of a layer GID. `tmj_to_tilemap.convert()`
      subtracts `firstgid` from the raw integer, producing a huge invalid
      `TileRef` if an authored tile is flipped or rotated. The current ship map
      has no flagged GIDs, so either decode them into a supported TileLayerDef
      representation or reject them with a precise error before writing output.
      Add fixtures for each flag and for a normal GID.

- [ ] **CR3.2 [fix] — The documented dependency-free macOS SVG rasterizer does
      not work on the current development machine.** `svg_ui_gen.py` selects
      `/usr/bin/sips` first and suppresses its diagnostics, but `sips` exits
      with “Cannot extract image from file” for the checked-in SVGs. With no
      `rsvg-convert` or `cairosvg` installed, `gen_ui.sh` cannot be reproduced
      and the two rendering tests fail. The skill currently promises that the
      Homebrew Python/Pillow setup is sufficient because macOS supplies `sips`.
      Choose and document a working local rasterizer (for example an explicit
      `librsvg` or CairoSVG dependency), remove the non-working fallback or
      limit it to systems where it is proven, preserve actionable subprocess
      stderr, and make the test suite skip only when the dependency is
      intentionally absent rather than failing ambiguously.

## 4. Refactor and reuse

- [ ] **CR4.1 [hardening] — Tauri action-response wire types are scattered
      through feature/runtime modules.** `ModuleActionResponse` lives in and is
      exported from `ship-modules.ts` solely so `map-details.ts` can import it;
      `CrewActionResponse`, `DealActionResponse`, and `MothershipActionResponse`
      live privately in three other runtime files. This creates a map-to-ship
      runtime dependency and separates Rust-mirrored wire shapes from the rest
      of the pure wire catalog. Move all four interfaces to
      `src/state/game-state-types.ts`, re-export them through `game-state.ts`,
      and update `/add-game-event` and `/add-server-panel` examples to make that
      the default home for command-response shapes.

## 5. Test-coverage additions

- [ ] **CR5.1 [hardening] — The active merge/transition art generators have no
      unit coverage.** The Python suite covers `svg_ui_gen.py` and
      `tmj_to_tilemap.py`, while `sprite_merge.py` and `sprite_transition.py`
      are used by the vessel, mothership, and module generation scripts without
      tests. (`sprite_extract.py` is correctly documented as standby and need
      not be pulled into scope.) Add small in-memory Pillow tests for
      resize/padding, grid layout, frame-range validation, transition endpoints,
      compositing order, and oversized-scale cropping; keep CLI-exit validation
      separate from pure helper tests.

## 6. ROADMAP additions to consider

No open additions. Every deliberate stub, placeholder, disabled action, and
future UI hook found in source maps to an existing task (including P2.8, P3.5,
P4.8, P5.1/P5.5, P6.1–P6.5, and P6.11). The open items above are defects or
hardening work, not new features.

## 7. Skills and steering improvements

No open findings after the mechanical corrections recorded in section 9.

## 8. Housekeeping

No open findings. The baseline worktree was clean; no unexplained generated art,
temporary verification hooks, stale review tracker, or untracked source was
present.

## 9. Fixed during the review pass

- [x] **CR9.1 — Updated canonical steering references after the `CLAUDE.md` →
      `AGENTS.md` consolidation.** ROADMAP/SERVER links, source mirror comments,
      verification helper comments, and Rust-to-TS type paths now point at
      `AGENTS.md`, `.agents/skills/`, and `game-state-types.ts` as appropriate.

- [x] **CR9.2 — Corrected stale pre-P1.21 HUD and notification wording.** The
      steering docs, state comments, Rust command/state comments, HUD test name,
      and `TiledScene.addCommonHud()` docs now describe Shop top-right and
      Mail's unread badge/panel instead of the removed Events feed button; the
      crew UX note now points to P2.8.

- [x] **CR9.3 — Repaired the server/event-pattern reference documentation.**
      `SERVER.md` and `/add-game-event` now reference `GameState.apply*Event()`
      plus scene reconcilers, current file locations, and the already-built
      in-process snapshot/push prototype instead of removed scene-level apply
      methods.

- [x] **CR9.4 — Brought skill completion gates and rejection UX up to current
      project policy.** Applicable skills now include `deno task lint`, and
      `/add-server-panel` no longer tells implementers to leave player-action
      rejections console-only after P1.15.

- [x] **CR9.5 — Corrected the SVG generator's input documentation.** The CLI
      accepts one SVG file, not a file-or-directory source.

- [x] **CR9.6 — Made `/phase-review` explicitly repeatable.** Removed embedded
      Phase 1 review history and clarified that material additions to a closed
      phase trigger a fresh pass with no carried-forward conclusions.

## Verified sound (no action)

- Every Rust/TypeScript wire mirror was compared field-by-field: player,
  resources, mothership, vessel/cargo, asteroid/mining, notification,
  crew/pending hire, deal/shop, module/pending build, AOI window/slices,
  `GameStateData`, and every `ServerPush` variant match.
- Rust-authoritative display mirrors match their TypeScript catalogs:
  `MODULE_CATALOG` and scaling/hire constants, asteroid tiers and mine rate,
  deal refresh costs/limits, warp fuel cost, room grid/module span, and AOI/view
  cap/hysteresis invariants.
- Resource spend/cap behavior, crew staffing split across settlement windows,
  module/deal/asteroid settlement ordering, vessel return/cargo semantics, AOI
  ownership exemptions, and command error propagation are internally consistent
  with README/AGENTS/SERVER.
- Scene input ownership, modal capture and scrolling, HUD/modal/toast z-order,
  actor reconciliation, TileRef parsing/animation behavior, and generated-asset
  registration agree with their documented contracts.
- CI is correctly wired for TypeScript format/check/lint/tests, Rust
  format/check/clippy/tests, and the Python art suite with Linux's explicit
  `rsvg-convert` dependency. The repository's task definitions preserve the
  required `assetsInlineLimit: 0` and generated asset exclusions. Local Python
  test execution is recorded under CR3.2 rather than treated as green.
- Source comments that intentionally leave doors open (placeholder art,
  balancing constants, Player/System Mail tabs, combat/message actions, web map
  fallback, and future panels) all have roadmap destinations; no new task was
  implied.
