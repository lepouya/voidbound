# Code review — Phase 2 completion

**Scope:** Whole repository review after the completed Phase 2, including its
Phase 1 foundations and current forward-looking contracts.\
**Baseline:** `f36463f` (review corrections below are intentionally
uncommitted).\
**Date:** 2026-08-07.\
**Verdict:** The authoritative-state and client-replica foundations are sound;
the local save validator needs to reject states the game can never produce, and
a few boundary hardenings should land before Phase 3 expands their blast radius.

## Process and rationale

This tracker was produced using
[`/phase-review`](.agents/skills/phase-review/SKILL.md).

## How to use this file

Each stable ID is never renumbered. Use `[fix]` for a real defect, `[hardening]`
for defensive work or debt, and `[idea]` for optional work. Work one item (or a
tightly coupled pair) at a time; leave it unchecked and uncommitted after
implementation until the user has reviewed and playtested it. On approval,
append a `Done:` note, check it, rerun affected gates, and commit as
`Short description (CR<section>.<n>)`. Feature-sized work graduates to
`ROADMAP.md` with a pointer here.

## 1. Backend bugs

- [x] **CR1.1 [fix] — Save validation accepts domain states the authoritative
      commands cannot create.** `validate_player()` in
      `src-tauri/src/game_state/persistence.rs` checks room uniqueness and one
      Command Module, but not the P1.18 one-module-per-type invariant, module
      level ceilings/pending targets, or the fixed Command Module placement. The
      world validation likewise does not reject overlapping motherships or
      asteroids, and sequence counters are not checked against existing IDs.
      This contradicts the P2.3 semantic-validation contract: a corrupt save can
      load as a game state commands would have rejected. Extend validation for
      those invariants and add hand-authored rejected-save fixtures/tests for
      each class. **Done:** `validate_player()` and `validate_world()` now
      enforce the command/module progression, entity-footprint, generated-ID,
      and sequence invariants, with rejected-state regression coverage. Legacy
      unprefixed `event-N` IDs remain valid so pre-profile local saves continue
      to load; runtime verification loaded an existing save into the ship scene.

- [x] **CR1.2 [hardening] — `advance_to(u64::MAX)` does not make progress at a
      saturated deadline.** In `src-tauri/src/game_state/state.rs`, when the
      next transition and `now_ms` are both `u64::MAX`, `next > now_ms` is
      false; `advance_at(u64::MAX)` then leaves the saturated deadline in place
      and the loop repeats forever. Saturating deadline construction makes this
      reachable from an extreme but otherwise valid persisted timer. Detect the
      terminal deadline/no-progress case, settle it once, and regression-test
      it. **Done:** Saturated transition deadlines now take one terminal
      settlement pass and exit. A regression builds a module whose completion
      clamps to `u64::MAX`, then proves settlement completes it without looping.

## 2. Client bugs

- [x] **CR2.1 [hardening] — Asteroid Details has an independent 1000*1000 map
      mirror.** `src/map/map-details.ts` uses private `MAP_COLUMNS`/`MAP_ROWS`
      constants solely to derive resource grade, while the running scene already
      obtains server-owned grid geometry through `generate_map`. A map-size
      change can leave Details showing a grade different from the actor/server
      seeding. Pass the map dimensions through the dialog host (or
      derive/include the grade in authoritative data) and remove this extra
      numeric mirror. **Done:** `MapLevel` now supplies its server-loaded grid
      dimensions to `DetailsDialog`, so its grade calculation shares the actor's
      geometry; the local `1000*1000` constants are gone. Runtime verification
      rendered an asteroid's Details panel with its grade row.

## 3. Tools and pipeline

No open finding. The tileset catalog covers every generated PNG, the TMJ
converter rejects unsupported transforms, and the art scripts use stable
self-relative paths.

## 4. Refactor and reuse

- [ ] **CR4.1 [idea] — Extract the duplicated live-details-dialog controller
      when the third consumer lands.** `DetailsDialog` in
      `src/map/map-details.ts` and `ModuleDetailsDialog` in
      `src/ship/ship-module-details.ts` each own the same
      `{ buildRows, handle }` state, 1 Hz timer, open/close closure, and
      `bindDialogRows` setup. A small UI-agnostic helper would remove the
      repeated lifecycle edge cases. Keep it local for now; extract only when
      the next countdown-backed details panel arrives.

## 5. Test-coverage additions

- [ ] **CR5.1 [hardening] — Give every remaining cross-language numeric mirror a
      deliberate contract test or wire source.** The balance payload eliminated
      most drift, but grade-band geometry (`world.rs` ↔ `asteroid-catalog.ts`),
      AOI span (`world.rs` ↔ `aoi-config.ts`), ship-room/dock geometry, vessel
      interpolation, warp fuel preview, refresh costs, and notification cap
      still rely on separately maintained implementations. Existing same-name
      tests are useful but do not compare the two language halves. Prefer
      carrying player-visible parameters on the existing balance/map payload;
      where that is not worthwhile, add explicitly paired tests and document the
      counterpart.

- [ ] **CR5.2 [hardening] — CI never exercises the production frontend build.**
      `.github/workflows/ci.yml` runs Deno checks/tests and Rust checks against
      a stub `dist`, but does not run `deno task build` (TypeScript's `tsc` plus
      Vite production bundling). Add a frontend build step after dependency
      installation so a production-only Vite/config/asset regression cannot
      merge unnoticed.

## 6. ROADMAP additions to consider

- [ ] **CR6.1 [hardening] — Reconcile `PHASE_2_PLANNING.md` with the implemented
      phase and retire or promote it.** Review every proposed, decided, and open
      item in `PHASE_2_PLANNING.md` against the code and the canonical
      README/SERVER/AGENTS/ROADMAP documents. For any Phase-2 commitment or
      scope gap that is not actually implemented, add the appropriate stable
      ROADMAP task(s), expanding Phase 2 only where the work still belongs there
      and otherwise placing it in the dependent future phase with correct
      prerequisites. If all actionable work is already complete or represented,
      migrate every durable decision or contract missing from the canonical docs
      to its proper home, then delete `PHASE_2_PLANNING.md` once no information
      needs to persist there. Record the precise outcome in this item's Done
      note.

## 7. Skills and steering improvements

No open finding. The review corrected current template drift below.

## 8. Housekeeping

No open finding.

## Fixed during the review pass

- [x] **CRF.1 — Corrected the mirror inventory in `AGENTS.md`.** It no longer
      calls the trade catalog and staffing formula the only hand-synced values;
      it now names the broader set of intentional display/math mirrors.
- [x] **CRF.2 — Corrected the `time_scale()` code comment.** It now describes
      the current startup `--time-scale` configuration instead of saying
      `deno task dev:fast` sets the retired environment variable.
- [x] **CRF.3 — Corrected `/add-game-event` examples.** They now name the typed
      notification API and the current balance catalog assembly/validation
      files, and no longer call the trade catalog the only display mirror.
- [x] **CRF.4 — Corrected `/add-tileset`'s auto-registration table.** It now
      includes the existing mothership and vessel filename rules.
- [x] **CRF.5 — Removed destructive asset-reset guidance from `/gen-art`.** It
      now requires diff inspection and user approval before restoring a
      generated asset.
- [x] **CRF.6 — Corrected `/verify`'s startup-flag description.** It no longer
      claims `lib.rs` accepts only three flags.

## Verified-sound (no action)

- Rust and TypeScript wire shapes are aligned field-by-field for the current
  snapshot, `Revisioned`, entity self-snapshots, command responses, typed
  notification payloads, and `ServerPush` variants.
- Balance schema versions agree at 5; the client validates and installs the
  whole payload atomically before publishing a snapshot. Module and asteroid
  preview curves are exercised by matched Rust/TypeScript tests.
- Revision floors, per-entity revisions, and removal tombstones preserve newer
  pushes against older snapshots/responses; tests cover pre-snapshot pushes,
  late responses, and map-window replacement.
- Offline settlement follows the documented stable order, rebuilds runtime
  delivery state, caps recovery at 24 hours, and has Rust coverage for its
  deadline, persistence, backup, and multi-profile behaviors.
- The loader subscribes to pushes before its snapshot request and surfaces a
  failed balance/snapshot load as a non-dismissable retry dialog rather than an
  empty playable state.
- UI dialog, HUD, tile parsing, map/camera/minimap math, actor reconciliation,
  and generated asset geometry have focused pure tests; the current full test
  suite passes.
