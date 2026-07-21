# Voidbound Code Review — July 2026 (post-vector-art-migration)

**Scope:** full-repo review, baseline commit `c42bc38` (2026-07-21).
**Trigger:** since the last phase-review roll-up (`db90a58`, "Close Phase 1
review"), Phase 1 gained P1.23 plus a large unplanned pass converting nearly
every raster asset (mothership, vessel, module, asteroid, selection-reticle,
ship-interior-tile art) to an SVG-sourced vector pipeline, and `src/` went
through the domain-subdirectory reorg (`c943ba6`) and entity-sync-module split
(`6bf5216`) shortly before that. The user asked for a fresh review specifically
checking whether that restructuring — `src/ship` in particular — left tech debt
behind. **One-line verdict:** the restructuring itself is clean — no bugs, no
drift, and every Rust↔TS mirror pair is in sync; the debt it left was entirely
in **documentation** (AGENTS.md + four skills citing pre-refactor method/symbol
names), fixed inline during this pass, plus one ROADMAP gap (also fixed: see
CR-R.1). Two small `[hardening]` items remain in the art-tooling layer.

## Process and rationale

Produced by `/phase-review` (`.agents/skills/phase-review/SKILL.md`) — see there
for the method (design docs first, then every source file in dependency order,
then cross-check mirror pairs, then flag behavioral findings while fixing
mechanical doc drift immediately). Read in full: `README.md`, `SERVER.md`,
`ROADMAP.md`, `AGENTS.md`; every file under `src-tauri/src/`, `src/`, `tests/`,
`.agents/skills/`; every `tools/*.py` and `art/gen_*.sh`. Gates
(`deno task format/check/lint/test`, `python3 -m unittest discover -s
tools`)
all pass clean before and after this pass's edits.

## How to use this file

Stable IDs `CR<section>.<n>` (never renumbered). Severity: **[fix]** (real
defect), **[hardening]** (defensive/debt, not urgent), **[idea]** (optional).
Checkbox per item — check off only after the user has reviewed and playtested
per AGENTS.md's review gate, with a "Done:" note.

## Tools/pipeline

- [x] **CR-T.1 [hardening]** Six `tools/svg_*_gen.py` scripts
      (`svg_asteroid_gen.py`, `svg_mothership_gen.py`, `svg_vessel_gen.py`,
      `svg_module_base_gen.py`, `svg_module_command_gen.py`,
      `svg_reticle_gen.py`) each carry their own copy-pasted
      `find_rsvg_convert()` + `render_svg_*_to_image()` pair. `c76192a` (CR3.2)
      explicitly "standardized" this logic — but only inside `svg_ui_gen.py`;
      every generator written afterward re-implemented it independently rather
      than importing a shared helper, so the six copies have already drifted
      from each other (some probe hardcoded Homebrew/`/usr/local`/`/usr` paths
      in addition to `shutil.which`, some don't; error-message detail and
      exit-code handling differ). **Done:** extracted `tools/svg_rasterize.py`
      (`find_rsvg_convert()` + `render_svg_file_to_image()` +
      `render_svg_string_to_image()`, the latter delegating to the former),
      matching the best existing behavior (returncode diagnostics,
      missing-output-file check, the X_OK-checked Homebrew/`/usr/local`/`/usr`
      fallback search). All six generators — plus `svg_ui_gen.py` itself — now
      import from it instead of defining their own copy; `svg_ui_gen.py` and
      `svg_reticle_gen.py` alias the import to their existing local name
      (`render_svg_to_image`) to keep their call sites unchanged. Verified:
      `deno task gen-art` regenerates all six asset families byte-identical to
      before the refactor.
- [x] **CR-T.2 [hardening]** Of those six generators, only `svg_ui_gen.py` had a
      test file (`test_svg_ui_gen.py`: dimension checks + the
      missing-rasterizer/failed-rasterizer error-message assertions CR3.2
      added). The five newer generators had zero test coverage. **Done:** since
      CR-T.1 centralized the rasterizer into one module, added one
      `tools/test_svg_rasterize.py` covering it directly (missing binary, failed
      exit code, missing output file, the Homebrew-path fallback search, plus
      dimension/cleanup checks when `rsvg-convert` is actually installed) — this
      covers the behavior for all six consumers at once rather than duplicating
      the same tests six times. Moved the two rasterizer-specific tests out of
      `test_svg_ui_gen.py` (now redundant) into the new file. 35 Python tests
      pass (was 28; net effect of removing 2 duplicated tests and adding 9 new
      ones in `test_svg_rasterize.py`).
- [ ] **CR-T.3 [idea]** `deno task gen-art` (added this pass, P0.14) now invokes
      every `art/gen_*.sh` by blind glob, which only works safely because each
      script resolves its own paths independently of the caller's cwd. Four
      scripts do this via `cd "$(dirname "$0")"`;
      `gen_motherships.sh`/`gen_vessels.sh` instead derive a
      `SCRIPT_DIR`/`ROOT_DIR` pair from `${BASH_SOURCE[0]}` — both work today
      (verified: the glob loop ran all six clean), but `gen-art/SKILL.md`'s
      "Adding a new generator" section now states the shorter form as the
      preferred shape for new scripts. Optional: reconcile the two existing
      scripts to match, purely for consistency — not a functional bug.

## ROADMAP additions to consider

- [x] **CR-R.1 [idea]** A cluster of commits beyond just P1.23 — mothership-1
      (replacing legacy `ss1`), vessel-1 (replacing legacy `cs1`, plus its
      multi-faction/idle-flourish system), asteroids' 64-frame tumble animation,
      selection reticles, ship interior tiles/objects, and the module-sprite
      polish commits — had no task ID between them. Rather than granular entries
      per commit, landed as one retrospective item. **Done:** added `P0.14`
      (ROADMAP.md, Phase 0) as a single consolidated entry covering the whole
      raster/AI-art → procedural vector migration.

## Fixed during the review pass

Mechanical doc/skill drift — all caused by two earlier refactors (`c943ba6`
"Reorganize src/ TypeScript into domain subdirectories", `6bf5216` "Split
ship-level.ts and map-level.ts into one entity-sync module each") plus the P1.23
vector-art work, none of it caught by the last phase-review because it predates
or wasn't in scope of that pass:

- **AGENTS.md § Asset pipeline**: "Canonical animated sheet spec: 6*6 grid, 32
  frames... every animated tileset in the catalog uses this shape" was false —
  `ANIM_64_FRAMES` (8*8, 64 frames) now backs asteroids and the Command Module
  tiers (P1.23). Reworded to describe both specs and when the 64-frame one
  applies.
- **AGENTS.md § IPC**: cited `MapLevel.syncMotherships()`/`syncAsteroids()`/
  `syncVessels()` and `ShipLevel.syncModules()` — these methods moved to their
  own extracted classes (`MothershipSync`/`AsteroidSync`/`VesselSync` in
  `src/map/`, `ModuleSync` in `src/ship/ship-modules.ts`) during `6bf5216`, each
  now exposing a `sync()` method instead. Updated both call sites.
- **`.agents/skills/gen-art/SKILL.md`**: listed `art/gen_cs1.sh`/`gen_ss1.sh`,
  removed when vessel/mothership art moved to the vector pipeline (now
  `gen_vessels.sh`/`gen_motherships.sh`); the Python tools table was missing all
  six `svg_*_gen.py` scripts. Fixed the script list and table, and noted the
  CR-T.1 duplication so a future generator author knows what pattern to match.
- **`.agents/skills/add-tileset/SKILL.md`**: example referenced a
  `CANONICAL_ANIM` export that no longer exists (`tileset-geometry.ts` now
  exports `ANIM_32_FRAMES`/`ANIM_64_FRAMES`); the skill didn't mention the
  64-frame spec at all. Fixed the example and added the 64-frame variant with
  guidance on when to reach for it.
- **`.agents/skills/add-scene/SKILL.md`**: "See `ShipLevel.createModuleActor`"
  (moved to `ModuleSync.createActor`) and the same stale
  `syncMotherships`/`syncModules` references as AGENTS.md. Fixed both.
- **`.agents/skills/add-server-panel/SKILL.md`**: referenced `openShopDialog`/
  `buildShopRows` (actual: `ShopDialog.open()`/`buildRows()`, both methods of
  the extracted `ShopDialog` class) and `syncModules`'s `appliedLevelUpStatus`
  (actual: `ModuleSync.sync()`'s). Fixed all three.

## Verified-sound (no action)

- **Rust ↔ TS mirror pairs**, checked field-by-field: `ResourceKind`/
  `ResourceCounts`, `ModuleData`/`ModulePendingBuild`/`MODULE_CATALOG`,
  `AsteroidData`/`AsteroidMining`/`ASTEROID_TIERS`/`MINE_UNITS_PER_HOUR`,
  `CrewData`/`PendingHire`/`HIRE_COST_BIOLOGICAL`/`HIRE_TIME_MS`,
  `DealsData`/`DealData`/`DealRarity`/`DEAL_REFRESH_COSTS_CREDITS`,
  `MothershipData`/`MapWindow`/`MapWindowData`, `VesselMoveEvent`/
  `VesselCargo`, `Revisioned<T>`/`ServerPush`, `MODULE_SPAN`/`SHIP_ROOM_GRID`
  vs. `ROOM_ORIGIN`/`ROOM_SPAN`/`ROOM_PITCH`/`ROOM_COUNT`, `AOI_SPAN`,
  `WARP_FUEL_PER_TILE`. All in sync.
- **`GameState`'s per-entity revision tracking** (`mergeEntity`/
  `replaceEntities`/`removeEntity`, `game-state.ts`) against the Rust
  `Revisioned<T>`/outbox-drain model (`state.rs`) — the floor+tombstone logic
  correctly lets a late map-window response coexist with a newer, unrelated push
  without either rolling the other back.
- **`src/ship/*`** — the area the user specifically flagged. `ModuleSync`,
  `ShipLevel`, `ModuleDetailsDialog`, `ShopDialog`, `module-catalog.ts`,
  `trade-catalog.ts`: no bugs, mirrors correct, the extracted-Sync-class shape
  (narrow `*Host` interfaces, `sync()`/`createActor()`/action methods) is clean
  and matches the equivalent split in `src/map/`. The Command Module tier
  system's fractional anchor offset (`moduleVisuals`'s
  `(visuals.cols - MODULE_SPAN) / 2`, `ship-modules.ts`) is correct geometry
  (centering a growing sprite inside a fixed 6*6 room), not a rounding bug.
- **`src/map/*`, `src/ui/*`, `src/scene/*`, `src/state/*`, `src/resources/*`** —
  read in full, no bugs found.
- **Gates**: `deno task format/check/lint/test` and
  `python3 -m unittest discover -s tools` all pass (130 TS + 83 Rust + 28 Python
  tests green) both before and after this pass's doc fixes.
