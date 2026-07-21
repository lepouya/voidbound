# Voidbound — AI Agent Steering Document

**Before considering any task complete**, run `deno task format` (formats TS,
Rust, and Python), `deno task check` (type-checks TS and Rust — there is no
Python type checker configured), then `deno task lint` (lints TS, Rust, and
Python). Never run `tsc`, `prettier`, `cargo fmt`, `cargo check`,
`cargo
clippy`, `ruff format`, or `ruff check` directly.

## User review and playtest gate

Passing the automated gates and the agent's own `/verify` run means a change is
**implemented**, not finished. For every app-affecting task — roadmap work,
code-review findings, bug fixes, refactors, and ad hoc changes alike:

1. Implement the change, run the required gates, and runtime-verify it.
2. Leave the worktree uncommitted and leave any `ROADMAP.md` or `CODE_REVIEW.md`
   checkbox unchecked.
3. Report what changed, what was verified, and what the user should exercise;
   then stop for the user's code review and in-app playtest.
4. Only after the user has reviewed and playtested the current implementation
   and explicitly told the agent to proceed may the agent mark the task done,
   update its checkbox/Done note, and commit it.

Never treat an agent-driven runtime verification as a substitute for the user's
playtest, and never commit first with the expectation that the user can review
the commit afterward. Documentation/steering-only changes still require the
user's review before commit; an in-app playtest is not applicable unless they
affect runtime behavior. The user may explicitly waive a playtest, but an agent
must not infer that waiver from silence or from a general request to implement a
task.

## 1. Project Overview

Voidbound is a mobile-first MMORTS set in space. Players colonize a star system,
build and upgrade a mothership (primary base), gather resources, and form
alliances. See `README.md` for full game design and `ROADMAP.md` for the phased
task list that tracks what's built vs. planned.

- **Platform:** Tauri desktop, portrait 390*844. Web browser is planned but not
  functional yet — all map data flows over Tauri IPC, so a pure web build needs
  an HTTP fallback for `generate_map` first.
- **Frontend:** TypeScript + [Excalibur.js v0.32](https://excaliburjs.com/docs/)
  (`FitScreenAndFill`, `pixelArt: true`)
- **Backend:** Rust + [Tauri v2](https://tauri.app/v2/develop/). Only plugin in
  use: `tauri-plugin-opener`.
- **Toolchain:** [Deno](https://deno.land/) runs scripts (`deno task tauri dev`,
  `deno task build`) that delegate to `package.json`. The Deno-native tasks —
  `format`, `check`, `lint`, `test` — live in `deno.json`; each is split into
  per-language halves (e.g. `format:ts` runs `deno fmt`, `format:rs` runs
  `cargo fmt`, `format:py` runs `ruff format tools/`) and the bare task runs
  every half in sequence. `format`/`lint`/`test` have `:ts`/`:rs`/`:py` halves;
  `check` has only `:ts`/`:rs` — no Python type checker is configured.
- **Bundler:** Vite. `vite.config.ts` sets `assetsInlineLimit: 0` — required so
  Excalibur can load image assets in production builds. HMR on port 1421 when
  running under Tauri dev.
- **Testing:** `deno task test` runs three halves: the pure-logic TS suite in
  `tests/` (e.g. anchor/camera/dialog/HUD/minimap/grid math, TileRef parsing, a
  PNG-dimensions-vs-catalog cross-check, the `GameState` apply/sync entry
  points, and the module/asteroid/trade catalog mirrors), the Rust game-rule
  tests via cargo, and the Python art-pipeline suite
  (`python3 -m unittest
  discover -s tools`, covering `tmj_to_tilemap.py`,
  `sprite_merge.py`/`sprite_transition.py`, and the shared `svg_rasterize.py`
  rasterizer every `svg_*_gen.py` script imports). `deno task test:ts` /
  `test:rs` / `test:py` run one half alone. `deno task format`/`lint` similarly
  run TS + Rust + Python (`ruff format`/`ruff check tools/`); `deno task check`
  stays TS + Rust only — no Python type checker is configured. CI
  (`.github/workflows/ci.yml`) runs format/check/lint/test/cargo checks on push
  and PR (the frontend job runs `test:ts`; the rust job runs cargo test itself)
  — it does not yet run the Python suite or `ruff`. Logic that should be
  unit-tested lives in pure modules with no runtime Excalibur/Vite imports
  (`src/resources/tileset-geometry.ts`, `src/scene/grid-math.ts`,
  `src/state/game-state.ts`, `src/state/game-state-types.ts`,
  `src/scene/camera-math.ts`, `src/map/minimap-math.ts`,
  `src/map/vessel-math.ts`, `src/map/aoi-config.ts`,
  `src/map/warp-footprint.ts`, `src/map/asteroid-catalog.ts`,
  `src/ship/module-catalog.ts`, `src/ship/trade-catalog.ts`,
  `src/ui/tile-ref-parse.ts`, `src/ui/hud-layout.ts`, `src/ui/dialog-layout.ts`,
  `src/ui/format.ts`) — Excalibur cannot load under Deno, so keep new testable
  logic in that shape. There is no runtime/scene coverage — the running app is
  still the safety net there.

## 2. Project Layout

```text
src/                  # Frontend (TypeScript + Excalibur.js)
  main.ts             # Engine init; registers scenes; starts on "ship"
  scene/              # Shared TiledScene framework (camera, input, tile actors)
    tiled-scene.ts    # Abstract base scene (camera, input, HUD, selection)
    tile-actor.ts     # Base class for all interactive entities
    map-loader.ts     # fetchGridGeometry()/buildTileMap() via Tauri IPC
  state/              # Cross-scene game state + IPC snapshot/push plumbing
    game-state.ts     # gameState singleton; apply*Event methods
  map/                # Space map scene — canonical event-pattern example
    map-level.ts
  ship/               # Mothership interior scene — game starts here
    ship-level.ts
  resources/          # Tileset/asset registry
    resources.ts        # TilesetRegistry; builds defs from tileset-geometry.ts
    tileset-geometry.ts # Pure-data tileset catalog (grid geometry + auto-rules)
  ui/                 # UI module library (always import from "./ui" barrel)
  assets/             # PNG spritesheets + pre-converted map JSON

src-tauri/            # Backend (Rust + Tauri)
  src/lib.rs          # Tauri entry point; registers the command handlers
  src/game_state/     # ServerState + gameplay commands (game rules live here);
                      #   mod.rs, state.rs (ServerState + push/settle plumbing),
                      #   scheduler.rs, commands.rs, and one file per domain —
                      #   modules.rs, world.rs, deals.rs, crew.rs, resources.rs
  src/map.rs          # generate_map command (map data)

tests/                # deno test pure-logic suite (run: deno task test:ts)

art/                  # Source art (original PNGs, Tiled .tmj maps)
  gen_*.sh            # Art pipeline shell scripts → write to src/assets/
tools/                # Python art pipeline (Pillow); called from art/gen_*.sh
```

## 3. Conventions

### Code style

- **Always** `import * as ex from "excalibur"` — never named imports from
  excalibur. Tauri is the exception: named imports from its subpath modules
  (`import { invoke } from "@tauri-apps/api/core"`, `listen` from
  `@tauri-apps/api/event`).
- UI library imports: always `from "./ui"` (barrel), never `from "./ui/button"`.
  See [src/ui/index.ts](src/ui/index.ts).
- **Dimensions/grids** use `*` not `×` in code, comments, and docs (e.g. `3*2`,
  `cols*rows`) — Unicode `×` is too close to Latin `x`.

### Naming

- **mothership** — large ships (`mothership-*` sprites, 4*4 tiles). Also "space
  station".
- **vessel** — small ship dispatched by a mothership (`vessel-*` sprites, 1*1
  tiles). Never "cargo ship" — their role is broader.
- Tileset names: lowercase-kebab, stable, used directly in `TileRef` strings.

### Sprite orientation

**All sprites must face upward (−y) at rotation 0.** `TileActor.moveTo()` and
`setFacing()` assume this. New art that doesn't hold this invariant will render
rotated wrong during movement.

### Excalibur v0.32 gotcha: `Actor.width` / `Actor.height`

These already return world-scaled values (`localBounds.width * globalScale`).
**Do not multiply by `this.scale.x/y`** — that double-counts scale and breaks
arc radii, circumradii, and any world-space math.

### Multiplayer-ready event pattern

Every state-mutating action must be modeled as an event from day one (event
interface + public `apply<Action>Event` + local action method) so local and
networked code paths stay identical. The canonical examples are all
**server-verified**: the local action method sends a request to the backend,
which verifies it and returns the authorized event — required for any action
that touches resources or shared world state. The wire types live in
[src/state/game-state-types.ts](src/state/game-state-types.ts), with their apply
entry points in [src/state/game-state.ts](src/state/game-state.ts):
`VesselMoveEvent` (`applyVesselEvent()`) and `ModuleData` (`applyModuleEvent()`
— covers both `request_build_module` and `request_levelup_module`). Both ride
the `load_game_state` snapshot — the snapshot + replay model that keeps progress
correct across scene switches and, later, late joins — and scenes reconcile
their actors from the applied state via the `sync*` methods (see § IPC). A
`ModuleData` event doubles as the entity's full current snapshot rather than a
separate `<Action>Event` type, since a module's whole state (including its
pending build's `dispatchedAt`/`completesAt`) _is_ what a server push would
send; this is the pattern to follow for other persistent, levelable/mutable
entities — `DealsData` (§ IPC) already follows it. **Use the `/add-game-event`
skill** when adding any new action. The server model this pattern targets (event
log, verification, broadcast, snapshot + replay, server-time offsets) is
sketched in `SERVER.md`.

### Input model (handled by `TiledScene`, don't reimplement)

- Drag-to-pan, pinch/scroll-to-zoom, camera clamped to map bounds
- Tap-to-select via `pendingActor` (set on pointerdown, committed on pointerup)
  — distinguishes taps from drags
- Action buttons (world-space and HUD) fire on confirmed tap (pointer-up, no
  drag), and a world-button press consumes the whole tap automatically — button
  handlers never need to set any flag. `suppressNextPointerUp = true` remains as
  an escape hatch for interactions handled outside the button flow
- Empty tile actor system — subclasses override `createEmptyTileActor()` to
  spawn an invisible actor with action buttons when the player taps empty space
  (see `MapLevel` for the canonical Move/Deploy use)
- `edgeFallthrough` on a `TileActor` (+ scene opt-in via
  `supportsEmptyTileActor()`) makes taps on the empty _interior_ of a multi-tile
  actor fall through to the tile beneath. Required for things like the
  mothership where you want to deploy vessels "next to" it by tapping around its
  edges.

### UX principles (state must be visible)

Established during P1.10 review and confirmed since; apply these four checks
when designing a feature's UI half (see `/roadmap-task` step 2) — don't wait for
review to add them:

- **Timed actions show a live countdown**, never a static "in progress" label
  (e.g. "Recruiting (12s)"). `TileActor.setButtonLabel()` exists for per-second
  label ticks without rebuilding the actor.
- **Degraded/penalized states get a visible indicator** on the affected entity
  (e.g. an understaffed producer wears an output-percent badge).
- **Action buttons go on every entity where a player would look for them**, not
  just one canonical host (Hire Crew lives on Crew Quarters as well as the
  Command Module).
- **Starting states are empty-and-earned**, not seeded, where that makes a good
  early goal or future tutorial step (crew starts at 0).

### Z-ordering

HUD elements render above the world at `HUD_BASE_Z = 10_000` (see
[src/ui/hud.ts](src/ui/hud.ts)). HUD groups can pass `zOffset` to stack relative
to that base. Modal dialogs render above the HUD at `MODAL_BASE_Z = 20_000` (see
[src/ui/dialog.ts](src/ui/dialog.ts)) — the scrim sits at the base and the panel
content rides above it as its children. Toasts render above dialogs at
`TOAST_BASE_Z = 30_000` (see [src/ui/toast.ts](src/ui/toast.ts)). World-space
actors use Excalibur defaults; don't set `z` unless you have a specific layering
need.

### Asset pipeline

- **Never edit `src/assets/` PNGs or generated JSON by hand** — re-run the
  matching `art/gen_*.sh` script instead.
- **Canonical animated sheet specs:** the default is 6*6 grid, 32 frames @ 66 ms
  per frame (`ANIM_32_FRAMES` in
  [tileset-geometry.ts](src/resources/tileset-geometry.ts); cell size varies per
  asset) — match it for new animated assets unless there's a specific reason not
  to. Higher-detail assets (asteroids, per-tier Command Module interiors) use
  the 8*8, 64-frame `ANIM_64_FRAMES` spec instead, established by P1.23 — reach
  for it only when 32 frames is visibly insufficient (slow, large-footprint
  loops), not by default.
- **Never `import` a PNG directly** — wrap with the `png("name")` helper in
  [src/resources/resources.ts](src/resources/resources.ts) instead.
- Generated files under `src/assets/` are excluded from `deno fmt`
  (`fmt.exclude` in `deno.json`) so regen + fmt cycles stay diff-free — commit
  them in the compact form the pipeline writes.
- In dev, regenerated PNGs hot-reload via Vite, but map JSON (e.g.
  `ship-level.json`) is embedded in the Rust binary via `include_str!` — map
  changes need a cargo rebuild (restart `deno task tauri dev`).
- Use the `/gen-art` skill to run or create a pipeline script, and
  `/add-tileset` to register a new PNG as a tileset.

## 4. Architecture notes

### Scene lifecycle (`TiledScene` subclasses)

Subclasses **must** implement:

- `buildMap(): Promise<SceneMap>` — return `{ grid, tilemap? }`: the
  `TileGridGeometry` all camera/tap/actor math reads, plus an optional real
  `ex.TileMap` for rendering. A tilemap-backed scene (ship) returns
  `{ grid: tilemap, tilemap }` (an `ex.TileMap` satisfies the geometry
  structurally); a geometry-only scene (the space map) returns just the grid and
  renders a plain `backgroundColor`.
- `setupActors(onTilePressed)` — add `TileActor`s; pass `onTilePressed` as each
  actor's `onPressed`

May override: `createEmptyTileActor()`, `supportsEmptyTileActor()`,
`initialCameraTarget()`.

Useful protected members: `grid`, `tilemap` (null in geometry-only scenes),
`handleTilePressed`, `pendingActor`, `suppressNextPointerUp`, `deselectActor()`,
`panCameraTo(x, y)`, `registerHudTarget(target)` — enrolls a custom screen-space
widget (e.g. the minimap) into HUD tap dispatch and resize relayout —
`addHudGroup(def)`, `addCommonHud(switchButton)` — spawns the standard Shop +
scene-switch/Mail/Items HUD around the given scene-switch button; prefer it over
redefining those groups per scene — `openDialog(def)` / `closeDialog()` — the
modal layer (ROADMAP P1.14): one dialog at a time, all pointer input captured
while open (dialog buttons run the confirmed-tap logic; camera pan/zoom and
everything underneath is blocked; a tap on the scrim outside the panel dismisses
it), closed automatically on scene switch — and `showToast(toast)` — transient
snackbar messages (ROADMAP P1.15): a bottom-center stack of auto-fading pills
that never capture input, cleared on scene switch; pass a string for info or an
`errorToast(message)` for rejections. Call the HUD helpers, `openDialog`, and
`showToast` from `onInitialize` (or later) **after**
`super.onInitialize(engine)`.

**Adding a new scene:** use the `/add-scene` skill — it handles Rust map-arm
wiring, `main.ts` registration, and HUD setup.

### Startup / loader phase

Startup-time backend work (game-state sync, a future login flow) must ride the
shared Excalibur `loader` as an `ex.Loadable` (see `GameStateResource` in
src/state/game-state-loader.ts) — never block or gate `game.start()`; the
loading screen exists precisely so slow work happens behind it. A loadable must
catch its own errors and resolve anyway: a failed or slow backend must never
block game start (the player continues on new-player defaults). Scenes must
tolerate the snapshot landing late or never — read `gameState` defaults at init
and `subscribe()` to re-stamp visuals when a load lands. Player identity never
changes mid-game (re-launching is the only way to switch users), so this
resilience only covers the initial load, not live identity swaps.

### UI library (`src/ui/`)

One barrel (`src/ui/index.ts`) re-exports everything. Modules:

- `anchor.ts` — `AnchorPlacement` 9-position type + `anchorFractions()`
- `tile-ref.ts` — `parseTileRef()`, `resolveGraphicLayers()` (use the latter for
  `TileActor.tile`); re-exports the `TileRef`/`TileLayerDef` types
- `tile-ref-parse.ts` — pure TileRef types + parsing helpers (no runtime
  imports; unit-tested). Not in the barrel — app code imports via tile-ref
- `format.ts` — pure number-display helpers (`formatCompactCount`; no runtime
  imports; unit-tested). In the barrel, unlike the other pure modules
- `label.ts` — `LabelDef`, `makeBorderedLabel`, `makeLabelActor`
- `badge.ts` — `BadgeDef` (number | string | LabelDef | SpriteBadge),
  `TileActorBadgeDef` (corner-pinned on TileActors)
- `button.ts` — `ButtonDef` base (shared by world + HUD), `makeButtonGraphic`
- `path-line.ts` — `makePathLine()` dotted world-space path actor
- `hud.ts` — `HudGroupDef`, `HudGroupHandle`, `spawnHudGroup` (wrapped by
  `TiledScene.addHudGroup()`)
- `hud-layout.ts` — pure HUD layout math (`layoutButtonCenters`; no runtime
  imports; unit-tested). Not in the barrel — hud.ts consumes it
- `dialog.ts` — `DialogDef`, `DialogHandle`, `spawnDialog`, `MODAL_BASE_Z`
  (ROADMAP P1.14). Modal scrim + framed panel + title/close + row/cell content
  composed from the other primitives; row cells hold a button, a tile + label,
  or centered text. Don't call `spawnDialog` from scenes — use
  `TiledScene.openDialog()`, which owns the modal slot and input capture. Also
  `bindDialogRows(handle, subscribe, buildRows)` — rebuild a dialog's rows on
  every state-store notify (store-agnostic; unsubscribe from `onClose`). The
  scaffold for every server-driven panel: P1.12's shop is the reference
  consumer; P1.16's entity details panels (`src/map/map-details.ts`) add a
  once-a-second `setRows` tick on top of `bindDialogRows` for live countdown
  re-renders — the pattern for any dialog showing a pending timer. Two more
  pieces, generic to any dialog (ROADMAP P1.21 added both; P1.21's Mail panel,
  `src/scene/mail-dialog.ts`, is a worked example of both, not a special case):
  `headerRow` — one `DialogRowDef` pinned below the title, above the scrollable
  rows, that never scrolls (Mail's tab strip: button cells with
  `labelPosition: "center"`, `button.ts`); and
  `scroll: { rowHeight,
  visibleRows }` — `rows` becomes the full list, with
  only a `visibleRows` window (uniform row height) rendered at a time,
  scrollable by drag or mouse wheel via `DialogHandle.scrollBy(deltaY)` (wired
  through `SceneInputHandlers.onModalScroll`, `scene-input.ts`) and a
  scroll-position thumb on the content region's right edge — see
  `dialog-layout.ts`'s `computeScrollWindow`. P6.3's Events panel and P5.1's
  research panel are next to use `bindDialogRows`/`scroll`/`headerRow`
- `dialog-layout.ts` — pure dialog frame/row/cell math (`layoutDialogFrame`,
  `layoutCellRects`; no runtime imports; unit-tested). Not in the barrel —
  dialog.ts consumes it and re-exports its types
- `toast.ts` — `ToastDef`, `ToastHandle`, `spawnToast`, `errorToast`,
  `TOAST_BASE_Z` (ROADMAP P1.15). Transient snackbar pills stacked
  bottom-center: auto-fading, never capture pointer input, render above the
  modal layer (so dialog-launched rejections stay visible). Stack layout reuses
  hud-layout's `layoutButtonCenters`. Don't call `spawnToast` from scenes — use
  `TiledScene.showToast()`, which owns the stack. First consumer: error toasts
  on every rejected player-action request (the background `request_map_window` /
  `mark_notifications_read` rejections stay console-only deliberately)

Pure grid math shared by scenes (dock tiles) lives outside `ui/` in
[src/scene/grid-math.ts](src/scene/grid-math.ts).

Full field lists live in the source — read `src/ui/<file>.ts` when you need the
exact interface rather than duplicating it here.

### `TileRef` system

String forms, parsed by `parseTileRef`:

- `"name"` — tile 0 of the named tileset
- `"name:id"` — specific tile index
- `"ts1,ts2:1,ts3"` — comma-separated layers, painter's order (bottom → top)

Object form `TileLayerDef` supports per-layer `tint`, `opacity`, `rotation`,
`flipHorizontal/Vertical`, `scale`, `offset`, `visible`, `tileId`. See
[src/ui/tile-ref.ts](src/ui/tile-ref.ts) for the full interface.

On **animated** tilesets, `tileId=0` returns the full looping `ex.Animation`;
non-zero returns the individual frame sprite. On **static** tilesets, `tileId`
is the grid index.

**Caveat:** `Sprite` graphics are shared spritesheet instances (effects are
applied to a clone). `Animation` graphics are constructed fresh on every
`getGraphic` call, so per-instance effects are safe — but each consumer runs its
own animation timer, so separate instances are **not frame-synchronized**.

### `TileActor`

Base class for all interactive map entities. Key options (full list in
[src/scene/tile-actor.ts](src/scene/tile-actor.ts)):

- `tile` / `movingTile` — `TileRef | TileRef[] | null`; the array form stacks
  layers, null makes the actor invisible (empty tile pattern)
- `buttons` — action buttons shown in an arc when the actor is selected
- `badges` — `TileActorBadgeDef[]` pinned to sprite corners
- `ownerName` / `ownerId` — renders a label below the sprite
- `edgeFallthrough` — see Input model above

Key methods: `moveTo(col, row, speed, onComplete?)` auto-rotates, swaps to
`movingTile`, draws a `makePathLine` from source to destination;
`setFacing(angle)`; `select()` / `deselect()`.

`readonly col`/`row` are the **construction** position — they do **not** update
during `moveTo`. Derive current tile from `actor.pos` divided by
`tileWidth`/`tileHeight`.

Labels, buttons, and badges always render upright regardless of actor rotation.

### IPC / Rust backend

`generate_map(map_type) -> Result<TileMapData, String>` in
[src-tauri/src/map.rs](src-tauri/src/map.rs) (registered in lib.rs) dispatches
on `map_type`:

- `"map"` — geometry-only 1000*1000 space map (ROADMAP P1.9): empty `tiles`, no
  `ex.TileMap` client-side — the scene renders a plain background and treats the
  grid as coordinate math; a minimap widget (`src/map/minimap.ts` + pure
  `src/map/minimap-math.ts`) covers navigation
- `"ship"` — `include_str!`-embedded `src/assets/ship-level.json` (40*40, 32px
  world tiles, `ship-tiles` spritesheet)

`TileMapData`: `cols`, `rows`, `tile_width`, `tile_height`, `tiles: Vec<String>`
(row-major `TileRef` strings; empty string = no tile). Both `Serialize` and
`Deserialize` are derived. To swap `"ship"` to a network fetch later, replace
the `include_str!` call with a fetched string — the `Result` propagation is
already in place.

**The backend is authoritative for game state** (`ServerState` in
src-tauri/src/game_state/state.rs): all resource math — production accrual,
module catalog costs/build times/production, and build verification — plus
mothership placement, the module table, and the vessel table (positions implicit
in event timestamps) live Rust-side, never in TS, because the client can be
tampered with. The client renders what commands return and asks for actions:

Every authoritative snapshot, command response, and push is wrapped in
`Revisioned<T>` (`revision` + `data`). The server assigns the global monotonic
revision while holding the state lock; `GameState` compares it per state slice
and entity (including removal tombstones), so out-of-order IPC responses and
push emissions cannot roll newer client state back. Preserve this envelope on
new commands and push variants.

- `load_game_state` — identity + resource counts (production lazily accrued on
  read, summed per settled module level) + mothership placements + the asteroid
  field (`AsteroidData` — tier, resource class, remaining deposit, active mining
  job; mined-out asteroids leave the list) + every module (`ModuleData`, Command
  Module included — level, and a `pending` build/upgrade timer if one is
  running) + the active-vessel event list + the notification feed (the snapshot
  half of SERVER.md's snapshot + replay). Fetched once during the loader phase
  (`GameStateResource`); after that the client never polls — server-side changes
  arrive over the push channel below. The map/ship scenes hardcode no world
  content: `MothershipSync`/`AsteroidSync`/`VesselSync` (src/map/) and
  `ModuleSync` (src/ship/ship-modules.ts) reconcile actors from the snapshot via
  their `sync()` methods, so server-side changes (a moved mothership, a new
  player, a module leveling up) reach the client through the same path. **World
  slices are interest-area windowed** (ROADMAP P1.13, SERVER.md § Interest
  management): only asteroids and foreign ships/vessels inside a 100\*100-tile
  `MapWindow` (`ServerState::aoi`, re-centered on the player's mothership at
  load) are sent; everything the player owns is always sent regardless of
  window.
- `request_map_window(center_col, center_row)` — re-centers the interest area as
  the map camera pans and returns the window's entities; `MapLevel.onPreUpdate`
  calls it with hysteresis (camera drift > 8 tiles from the window center, never
  per frame) and `gameState.applyMapWindow` replaces the
  mothership/asteroid/vessel tables wholesale, so the reconcilers despawn
  everything that left the window. Entity pushes are footprint-filtered against
  the same window at outbox drain (own-entity and global pushes are exempt). The
  map scene's zoom floor (`tileViewCapZoom`, src/scene/camera-math.ts) caps the
  visible view at 80 tiles on the longer axis — strictly inside the window, so
  unloaded space never scrolls into sight.
- **Push channel** (`server-push` Tauri event; ROADMAP P1.5) — the backend tells
  the client when state changes, the in-process prototype of P3.1's WebSocket
  bus: a scheduler thread (`run_scheduler` in game_state/scheduler.rs) sleeps
  until the next deadline — production tick, build `completesAt`, vessel
  `arrivalAt`, mining `completesAt`, the 00:00 UTC deal reset — settles state,
  and emits revisioned `ServerPush` messages (`resources`, `module`,
  `vesselRemoved`, `vessel`, `asteroid`, `asteroidRemoved`, `notification`,
  `crew`, `deals`); a Condvar wakes it early when a command creates a nearer
  deadline (e.g. a short vessel flight). Mutations queue pushes into a
  `ServerState` outbox and the boundaries (scheduler wake, command return via
  `finish_command`) drain + emit, so every settlement path broadcasts
  identically. Client side, `startServerPushListener` (game-state-loader.ts)
  routes each push into `gameState.applyServerPush()` — the same apply/sync
  entry points command responses use. Notifications (build/level-up completions,
  vessel arrivals/returns) are server state riding the snapshot, capped at 100
  entries; the Mail HUD badge (tiled-scene.ts `addCommonHud`) shows the live
  unread count.
- `mark_notifications_read` — marks the whole feed read and returns the updated
  list (applied via `gameState.syncNotifications`), clearing the Mail badge in
  every scene. Opening P1.21's Mail panel invokes it after rendering the live,
  scrollable Notifications tab.
- `request_build_module(col, row, module_type)` — verifies the catalog type, its
  Command-Module-level unlock, placement (room grid), and level-1 cost, deducts
  resources, returns the new `ModuleData` (level 0, pending its first
  completion) plus updated counts (`ModuleActionResponse`).
- `request_levelup_module(module_id)` — verifies ownership, that no
  build/upgrade is already pending, and that the target level doesn't exceed the
  Command Module's own level (README § Ship design), deducts the level-scaled
  cost, returns the updated `ModuleData` plus updated counts.
- `request_hire_crew()` — timed crew recruitment (ROADMAP P1.10): one hire in
  flight at a time, the new head must fit crew capacity
  (`crew_capacity_per_level` summed over settled module levels), and a linear
  biological cost (scales with the new head count — a repeat purchase, not the
  doubling-per-level stub) gates it; returns `CrewData` (head count + pending
  recruitment) plus updated counts (`CrewActionResponse`). Crew berths damp
  producer output through a pooled ship-wide staffing ratio at production
  accrual — `output * (0.5 + 0.5 * staffed/required)` — floored at 50% so
  understaffing punishes but never kills; the Command Module's baseline output
  is never damped (the anti-stuck guarantee: a new player can progress at 0
  crew). Hire cost/time and the 50% floor are balancing stubs (→ P2.6); richer
  understaffing UX (per-module indicators, crew prioritization, temporary
  reassignment) is tracked by ROADMAP P2.8.
- `request_dispatch_vessel(dest_col, dest_row)` /
  `request_recall_vessel(vessel_id)` — verify the move, derive dock, speed, and
  arrival time (recalls depart from the server-lerped current position), record
  it in the vessel table, and return the authorized `VesselMoveEvent`. Vessels
  that finish a return onto a dock tile are pruned lazily, like production —
  depositing any mining cargo they carry into the resource counts.
- `request_mine_asteroid(asteroid_id)` — the mining loop (ROADMAP P1.6):
  verifies the asteroid's single mining slot is free, reserves it at dispatch
  (two vessels can't race for one deposit), sends a vessel to the footprint tile
  nearest the dock, and derives the extraction window (remaining deposit /
  `MINE_UNITS_PER_HOUR`, starting on arrival). At mine-out the scheduler
  auto-recalls the miner with the full harvest as `cargo` on a pushed `vessel`
  event; `request_recall_vessel` earlier harvests proportionally to extraction
  time (mid-outbound recalls just free the slot). Asteroid changes reach the
  client as `asteroid`/`asteroidRemoved` pushes into `gameState.asteroids`,
  reconciled by `AsteroidSync.sync()` (src/map/map-asteroids.ts).
- `request_accept_deal(deal_id)` / `request_refresh_deals()` — the Trading Post
  NPC deal shop (ROADMAP P1.12). Deals are server-generated, deterministic per
  (player, UTC day, slot, generation) like `seed_asteroids`, and ride the
  snapshot as `DealsData` (day index, refreshes used, slots) — the whole shop is
  one ModuleData-style self-snapshot payload, applied by
  `gameState.applyDealsEvent()` from command responses and the daily-reset
  `deals` push alike (`settle_deals`: fresh batch with the freebie in slot 0,
  refresh counter reset). Give ≠ get is enforced at generation _and_ acceptance;
  accept additionally verifies a settled Trading Post, the give-side cost, and
  that the get side fits storage — rejected outright, never clamp-and-lose:
  explicit player actions differ deliberately from P1.11's passive-overflow
  rule. Refreshes replace every slot (an unclaimed freebie is forfeited; a
  refresh batch never mints one) at a doubling credits cost, hard-capped per
  day; slot count grows with the post's settled level, and a mid-batch level-up
  appends the new slots immediately (`top_up_deal_slots` — append-only: existing
  deals and their accepted state are never rerolled, so leveling can't dodge the
  refresh cost). The shop dialog is opened from the settled post's Trade button
  (`ShipLevel.openShopDialog`) and re-renders from `gameState.deals` via
  `bindDialogRows` (see § UI library).

Gameplay constants (production tick, the module catalog's per-type cost/build
time/production, the asteroid tier catalog + mine rate, room grid, map geometry,
vessel speed) live in game_state/ (modules.rs, world.rs, state.rs); the ones the
UI renders have display-only TS mirrors — comments mark each pair; keep them in
sync (the asteroid mirror is `src/map/asteroid-catalog.ts`: tier bands, class
names, sprite tints, duration estimates; the deal-shop mirror is
`src/ship/trade-catalog.ts`: refresh costs and rarity styling — deal sizing has
no mirror, amounts arrive on the wire). The module catalog's
cost/build-time/production all scale per level through one shared
doubling-per-level stub (`scale_for_level`/`scaleForLevel`) — real balancing is
a later pass, as is the asteroid deposit/rate balance. Mothership placement is
data, not a constant: it is seeded in `ServerState::new` and reaches the client
only via the snapshot — the asteroid field seeds the same way (deterministic
`seed_asteroids`). The game-rule logic is covered by the Rust tests (part of
`deno task test`).

Tauri commands return `Result<T, String>` — propagate errors as strings, don't
`unwrap`/panic in command handlers.

## 5. Skills

Use these for common tasks rather than doing them from scratch:

- `/add-scene` — new `TiledScene` subclass (Rust arm + main.ts + HUD wiring)
- `/add-game-event` — multiplayer-ready event pattern
- `/add-server-panel` — server-driven dialog panel (state list + status-enum
  buttons), the Trading Post shop's pattern
- `/add-tileset` — register a PNG as a tileset
- `/gen-art` — run or add an `art/gen_*.sh` pipeline script
- `/verify` — launch the dev app and verify a change at runtime (window
  screenshots, streamed client console, temporary TEMP-VERIFY drive hooks) — the
  substitute for the missing runtime/scene test coverage
- `/roadmap-task` — work a `ROADMAP.md` task end to end (design review for
  server-model changes, skill chaining, gates, `/verify`, checkbox + commit
  titled with the task ID)
- `/phase-review` — full-project review at the close of a ROADMAP phase (read
  everything, cross-check docs/mirrors, findings tracked in a temporary
  CODE_REVIEW.md that is rolled up and deleted when done)
