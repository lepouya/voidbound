# Voidbound — AI Agent Steering Document

**Before considering any task complete**, run `deno task fmt` — formats TS and
Rust, then type-checks TS, in one step. Never run `tsc` or `prettier` directly.

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
  `deno task build`) that delegate to `package.json`. The only Deno-native task
  is `deno task fmt` in `deno.json`.
- **Bundler:** Vite. `vite.config.ts` sets `assetsInlineLimit: 0` — required so
  Excalibur can load image assets in production builds. HMR on port 1421 when
  running under Tauri dev.
- **Testing:** `deno task test` runs the pure-logic suite in `tests/` (anchor
  math, TileRef parsing, HUD layout, dock-tile math, and a
  PNG-dimensions-vs-catalog cross-check);
  `python3 -m unittest discover -s tools` covers the art-pipeline converter. CI
  (`.github/workflows/ci.yml`) runs fmt/type/test/cargo checks on push and PR.
  Logic that should be unit-tested lives in pure modules with no runtime
  Excalibur/Vite imports (`src/tileset-geometry.ts`, `src/grid-math.ts`,
  `src/game-state.ts`, `src/ui/tile-ref-parse.ts`, `src/ui/hud-layout.ts`,
  `src/ui/format.ts`) — Excalibur cannot load under Deno, so keep new testable
  logic in that shape. There is no runtime/scene coverage — the running app is
  still the safety net there.

## 2. Project Layout

```text
src/                  # Frontend (TypeScript + Excalibur.js)
  main.ts             # Engine init; registers scenes; starts on "ship"
  tiled-scene.ts      # Abstract base scene (camera, input, HUD, selection)
  map-level.ts        # Space map scene — canonical event-pattern example
  ship-level.ts       # Mothership interior scene — game starts here
  tile-actor.ts       # Base class for all interactive entities
  map-loader.ts       # buildTileMap() via Tauri IPC
  resources.ts        # TilesetRegistry; builds defs from tileset-geometry.ts
  tileset-geometry.ts # Pure-data tileset catalog (grid geometry + auto-rules)
  ui/                 # UI module library (always import from "./ui" barrel)
  assets/             # PNG spritesheets + pre-converted map JSON

src-tauri/            # Backend (Rust + Tauri)
  src/lib.rs          # #[tauri::command] definitions (generate_map, …)

tests/                # deno test pure-logic suite (run: deno task test)

art/                  # Source art (original PNGs, Tiled .tmj maps)
  gen_*.sh            # Art pipeline shell scripts → write to src/assets/
tools/                # Python art pipeline (Pillow); called from art/gen_*.sh
```

## 3. Conventions

### Code style

- **Always** `import * as ex from "excalibur"` — never named imports from
  excalibur. Same applies to Tauri: `import { invoke } from "@tauri-apps/api"`.
- UI library imports: always `from "./ui"` (barrel), never `from "./ui/button"`.
  See [src/ui/index.ts](src/ui/index.ts).
- **Dimensions/grids** use `*` not `×` in code, comments, and docs (e.g. `3*2`,
  `cols*rows`) — Unicode `×` is too close to Latin `x`.

### Naming

- **mothership** — large ships (`ss-*` sprites, 4*4 tiles). Also "space
  station".
- **vessel** — small ship dispatched by a mothership (`cs-*` sprites, 1*1
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
networked code paths stay identical. Canonical example: `VesselMoveEvent` /
`applyVesselMoveEvent()` in [src/map-level.ts](src/map-level.ts). **Use the
`/add-game-event` skill** when adding any new action. The server model this
pattern targets (event log, verification, broadcast, snapshot + replay,
server-time offsets) is sketched in `SERVER.md`.

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

### Z-ordering

HUD elements render above the world at `HUD_BASE_Z = 10_000` (see
[src/ui/hud.ts](src/ui/hud.ts)). HUD groups can pass `zOffset` to stack relative
to that base. World-space actors use Excalibur defaults; don't set `z` unless
you have a specific layering need.

### Asset pipeline

- **Never edit `src/assets/` PNGs or generated JSON by hand** — re-run the
  matching `art/gen_*.sh` script instead.
- **Canonical animated sheet spec:** 6*6 grid, 32 frames @ 66 ms per frame (cell
  size varies per asset). Every animated tileset in the catalog uses this shape
  — match it for new animated assets unless there's a specific reason not to.
- **Never `import` a PNG directly** — wrap with the `png("name")` helper in
  [src/resources.ts](src/resources.ts) instead.
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

- `buildMap(): Promise<ex.TileMap>` — return the tilemap
- `setupActors(onTilePressed)` — add `TileActor`s; pass `onTilePressed` as each
  actor's `onPressed`

May override: `createEmptyTileActor()`, `supportsEmptyTileActor()`,
`initialCameraTarget()`.

Useful protected members: `tilemap`, `handleTilePressed`, `pendingActor`,
`suppressNextPointerUp`, `deselectActor()`, `addHudGroup(def)`, and
`addCommonHud(switchButton)` — spawns the standard Shop/Events + Mail/Items HUD
around the given scene-switch button; prefer it over redefining those groups per
scene. Call both HUD helpers from `onInitialize` **after**
`super.onInitialize(engine)`.

**Adding a new scene:** use the `/add-scene` skill — it handles Rust map-arm
wiring, `main.ts` registration, and HUD setup.

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

Pure grid math shared by scenes (dock tiles) lives outside `ui/` in
[src/grid-math.ts](src/grid-math.ts).

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
[src/tile-actor.ts](src/tile-actor.ts)):

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
[src-tauri/src/lib.rs](src-tauri/src/lib.rs) dispatches on `map_type`:

- `"map"` — procedural 100*100 space map (test-tileset placeholder)
- `"ship"` — `include_str!`-embedded `src/assets/ship-level.json` (40*40, 32px
  world tiles, `ship-tiles` spritesheet)

`TileMapData`: `cols`, `rows`, `tile_width`, `tile_height`, `tiles: Vec<String>`
(row-major `TileRef` strings; empty string = no tile). Both `Serialize` and
`Deserialize` are derived. To swap `"ship"` to a network fetch later, replace
the `include_str!` call with a fetched string — the `Result` propagation is
already in place.

Tauri commands return `Result<T, String>` — propagate errors as strings, don't
`unwrap`/panic in command handlers.

## 5. Skills

Use these for common tasks rather than doing them from scratch:

- `/add-scene` — new `TiledScene` subclass (Rust arm + main.ts + HUD wiring)
- `/add-game-event` — multiplayer-ready event pattern
- `/add-tileset` — register a PNG as a tileset
- `/gen-art` — run or add an `art/gen_*.sh` pipeline script
