# Voidbound — AI Agent Steering Document

## 1. Project Overview

This document provides guidance for AI agents working with the Voidbound
codebase. It outlines the project's architecture, technologies, and conventions
to ensure consistency and adherence to best practices.

Voidbound is a multiplayer online real-time strategy (MMORTS) game set in space.
Players colonize a new star system, build and upgrade a mothership (their
primary base), manage resources, and form alliances to expand their territory.

- **Genre:** MMORTS, Space Colonization, Strategy
- **Platform:** Cross-platform (Desktop & Web) via Tauri and modern web
  browsers.
- **Key Features:** Base building (mothership), resource gathering, territory
  expansion, alliances, seasonal progression.

---

## 2. Core Technologies

### Frontend (`src/`)

- **Engine:** [Excalibur.js](https://excaliburjs.com/docs/) (v0.32) — A 2D game
  engine that manages the game loop, rendering, scenes, actors, and input. The
  game uses `FitScreenAndFill` display mode with pixel art rendering. Game
  window: 390*844 (mobile portrait).
- **Language:** TypeScript — strict static typing across the entire frontend.
- **Bundler:** [Vite](https://vitejs.dev/) — fast dev server and production
  builds. `vite.config.ts` is specifically tailored for Tauri integration.
- **Asset Loading:** Sprites and animations are defined in code via a typed
  catalog in `src/resources.ts`. PNG spritesheets under `src/assets/` are
  discovered automatically via Vite's `import.meta.glob`. Pre-converted map
  data is also stored in `src/assets/` as JSON (e.g. `ship-level.json`),
  embedded at compile time via Rust's `include_str!`.

### Backend (`src-tauri/`)

- **Framework:** [Tauri v2](https://tauri.app/v2/develop/) — lightweight,
  cross-platform desktop app framework bridging Rust and JavaScript.
- **Language:** Rust — backend logic for performance and safety.
- **IPC:** Rust functions exposed to the frontend as commands via
  `#[tauri::command]`. The frontend calls them using `invoke()` from
  `@tauri-apps/api`.
- **Plugin:** `tauri-plugin-opener` is the only Tauri plugin currently in use.
  Keep this in mind when modifying `Cargo.toml` or `tauri.conf.json`.

### Toolchain

- **Package Manager / Task Runner:** [Deno](https://deno.land/) — manages npm
  dependencies (`deno install`) and runs dev scripts (`deno task tauri dev`).
  Dependencies are in `package.json`; task definitions are in `deno.json`.

---

## 3. Project Structure

```text
/
├── src/                  # Frontend (TypeScript, Excalibur.js)
│   ├── main.ts           # Game engine entry point
│   ├── ui/               # UI module library (import from "./ui" resolves to index.ts)
│   │   ├── index.ts      # Barrel re-export of all submodules
│   │   ├── anchor.ts     # AnchorPlacement, anchorFractions
│   │   ├── tile-ref.ts   # TileLayerDef, TileRef, parseTileRef, resolveGraphicLayers
│   │   ├── label.ts      # LabelDef, makeBorderedLabel, makeLabelActor
│   │   ├── badge.ts      # BadgeDef, TileActorBadgeDef, makeBadgeActor
│   │   ├── button.ts     # ButtonDef, makeButtonGraphic
│   │   ├── path-line.ts  # PathLineOptions, makePathLine
│   │   └── hud.ts        # HudGroupDef, HudGroupHandle, spawnHudGroup
│   ├── tiled-scene.ts    # Abstract base scene: camera, pan/zoom, tap-to-select, HUD
│   ├── map-level.ts      # Space map scene: mothership, vessels, HUD
│   ├── ship-level.ts     # Mothership interior scene (modules)
│   ├── tile-actor.ts     # TileActor class
│   ├── map-loader.ts     # buildTileMap() via Tauri IPC
│   ├── resources.ts      # Asset loading and management
│   └── assets/           # Game assets (PNG spritesheets + pre-converted map JSON)
│
├── src-tauri/            # Backend (Rust, Tauri)
│   ├── src/
│   │   └── lib.rs        # Tauri command definitions (generate_map, etc.)
│   ├── Cargo.toml        # Rust dependencies
│   └── tauri.conf.json   # Tauri application configuration
│
├── art/                  # Source files for assets (original images, Tiled maps)
├── tools/                # Art pipeline scripts (Python); run from art/ shell scripts
├── package.json          # Frontend npm dependencies
├── vite.config.ts        # Vite build configuration
├── tsconfig.json         # TypeScript configuration
└── README.md             # Project overview and game design notes
```

---

## 4. Development Workflow

### Initial Setup

Ensure `deno` is installed. The first time, run:

```bash
deno install
```

### Development

```bash
deno task tauri dev
```

- Vite dev server runs on `http://localhost:1420`, HMR on port 1421.
- The Tauri desktop window will launch and load from this URL.

### Production Build

```bash
deno task build
```

Runs `tsc` to type-check, then `vite build` to produce the production frontend.

---

## 5. Code Formatting and Type Checking

For type checking, always use `deno check` — never `npx tsc` or `tsc` directly:

```bash
deno check src/**/*.ts
```

When writing dimensions or grid sizes in comments, code, or documentation, use
`*` (e.g. `3*2`, `cols*rows`) — never the Unicode multiplication sign `×`, which
can be confused with the Latin letter `x`.

---

## 6. Architectural Principles

- **ECS-like structure:** Game objects are Actors (entities) composed of
  components that encapsulate data and logic.
- **Scene-based logic:** The game is organized into scenes. Each scene
  orchestrates camera controls, actor interactions, and world setup. See the
  `src/main.ts` section in the Codebase Guide for instructions on how to add and
  navigate to scenes.
- **Asset management:** All spritesheets are PNG files under `src/assets/`,
  registered in `TILESET_DEFS` in `src/resources.ts` and loaded via
  `TilesetRegistry`. See the Codebase Guide for how to add a new tileset.
- **Backend communication (IPC):** The frontend acts as a client to the Rust
  backend, using async `invoke()` calls for tasks like fetching map data.
- **State management:** Most state is managed locally within scenes and actors.
- **Input handling:** Mouse and touch input (drag-to-pan, pinch/scroll-to-zoom,
  tap-to-select) is handled in the `TiledScene` base class, not in individual
  subclasses.
- **Key config:** `vite.config.ts` sets `assetsInlineLimit: 0`, required so
  Excalibur can load image assets in production builds.

### Multiplayer-Ready Event Pattern

When implementing any game action that will eventually be server-authoritative
(e.g. vessel dispatch, module construction), always model it as an event struct
— even while running locally:

1. Define an event interface with all fields a server would return (IDs,
   positions, timestamps, etc.).
2. Write an `apply*Event()` method that consumes the event and mutates scene
   state. This becomes the server-push entry point later.
3. The local action constructs the event and calls `apply*Event()` directly.

Example: `VesselMoveEvent` / `applyVesselMoveEvent()` in `map-level.ts`. Fields:
`vesselId`, `ownerId`, `ownerName`, `mothershipId`, `vesselType`, `srcCol`,
`srcRow`, `destCol`, `destRow`, `speed`, `dispatchedAt`, `arrivalAt`.

This keeps local and networked code paths identical from day one.

---

## 7. Naming Conventions

- Large ships (ss-* sprites, 4*4 tiles): **motherships** (also "space stations")
- Small ships dispatched by motherships (cs-* sprites, 1*1 tiles): **vessels**
  (never "cargo ships" — their role is broader than cargo)

---

## 8. Codebase Guide

### `src/main.ts`

Entry point. Initializes the Excalibur engine (390*844, `FitScreenAndFill`,
pixel art) and registers the initial scene.

**Scene Management:** To add a new scene, define a class extending `TiledScene`,
register it in the `scenes` object, then navigate to it with
`engine.goToScene('<key>')`:

```ts
scenes: {
  map: MapLevel,
  ship: ShipLevel,
}
```

Both scenes are registered. The game starts on `"ship"` (the mothership
interior). Navigate between scenes with `engine.goToScene("map")` /
`engine.goToScene("ship")`.

---

### `src/tiled-scene.ts`

Abstract base class for all tile-map scenes. Provides:

- Drag-to-pan, pinch/scroll-to-zoom, camera clamped to map bounds
- Tap-to-select actor system
- Empty tile actor pattern (tap on a tile with no actor)

**Subclasses must implement:**

- `buildMap(): Promise<ex.TileMap>` — return the tilemap for this scene
- `setupActors(onTilePressed)` — add TileActors after the map loads; pass
  `onTilePressed` as each actor's `onPressed` callback

**Subclasses may override:**

- `createEmptyTileActor(col, row, onPressed): TileActor | null` — called when
  the player taps an empty tile; return a `TileActor` to spawn and select it, or
  `null` (default) to do nothing. `MapLevel` overrides this to offer Move/Deploy
  actions on any empty tile.

**Key protected members available to subclasses:**

- `tilemap` — the `ex.TileMap` instance, available after `buildMap()` resolves
- `handleTilePressed` — stable callback reference to pass as `onPressed` to each
  `TileActor`
- `pendingActor` — the actor that received a `pointerdown` this frame; checked
  on pointer-up to confirm a tap (as opposed to a drag)
- `suppressNextPointerUp` — set to `true` to skip selection logic on the next
  pointer-up (e.g. after a button action has already handled the interaction)
- `deselectActor()` — deselects the current actor and removes any empty tile
  actor
- `addHudGroup(def: HudGroupDef): HudGroupHandle` — spawn a screen-fixed button
  group and register it for pointer-up dispatch. Call from `onInitialize` after
  `super.onInitialize(engine)`.

---

### `src/map-level.ts`

The space map scene. Key details:

- **Mothership** placed at col 48, row 48 (4*4 tiles) on the 100*100 grid
- **`vesselSpeed = 32` px/s** (1 tile/s by default; intended to be upgradeable)
- Overrides `createEmptyTileActor()` to provide Move/Deploy buttons on empty
  tiles
- **`applyVesselMoveEvent(event)`** — public entry point for both local dispatch
  and future server-pushed events; creates a new vessel actor or redirects an
  existing one
- **`returnVessel(vessel, originalEvent)`** — private; sends a vessel back to
  the closest mothership dock tile, then kills the actor on arrival
- Two HUD groups added in `onInitialize`:
  - Top-right: Shop and Events buttons
  - Bottom-right: Ship, Mail, and Items buttons

---

### `src/ship-level.ts`

The mothership interior scene (compartments). Registered as `"ship"` in
`main.ts`; the game starts here. Background is black (`ex.Color.Black`).

Loads a **40*40 tile map** (32px world tiles, 64px sprite resolution) from
`src/assets/ship-level.json` via the Rust backend. Currently contains one
placeholder `module-base` TileActor (`commandModule`, 4*4 tiles, col 18, row 18
— centered on the 40*40 grid) with a bottom-left level badge. Replace with real
module actors as game content is built out. Two HUD groups mirror `MapLevel` but
with a Map button instead of Ship.

---

### `src/ui/`

UI module library. All public symbols are re-exported from `src/ui/index.ts`, so
consumers always `import { ... } from "./ui"` (or `"../ui"`) — never from
individual submodule paths.

#### `anchor.ts`

**`AnchorPlacement` type** — 9-position anchor grid shared by HUD and TileActor
badges: `"top-left"` / `"top-center"` / `"top-right"` / `"middle-left"` /
`"middle-center"` / `"middle-right"` / `"bottom-left"` / `"bottom-center"` /
`"bottom-right"`.

`anchorFractions(anchor: AnchorPlacement): { hFrac, vFrac }` — converts an
anchor to 0/0.5/1 fractions. Used internally by `hud.ts` and `tile-actor.ts`.

#### `tile-ref.ts`

**`TileRef` type:**

```ts
type TileRef = string | TileLayerDef;
```

String forms:

- `"tileset-name"` — tile 0 from the named tileset
- `"tileset-name:tile-id"` — specific tile by index
- `"ts1,ts2:1,ts3"` — comma-separated list; each segment is a layer stacked in
  painter's order (bottom → top); produces a `GraphicsGroup`

On animated tilesets, `tileId=0` returns the full looping `Animation`; any other
value returns the individual frame sprite. On static tilesets, `tileId` selects
the sprite at that grid position.

**`TileLayerDef` interface** — object form of a tile reference with optional
per-layer visual effects:

- `tile: string` — tileset name only (no `:tile-id` suffix; use `tileId` field)
- `tileId?: number` — tile index (default 0)
- `tint?: ex.Color` — multiplicative color blend; white has no effect
- `opacity?: number` — alpha 0–1
- `rotation?: number` — radians
- `flipHorizontal?`, `flipVertical?: boolean`
- `scale?: number | ex.Vector` — multiplier on natural pixel size; actor scale
  applies on top
- `offset?: ex.Vector` — pixel shift within the composite group; ignored by
  `buildTileMap` (tilemap tiles have no per-graphic offset)
- `blendMode?: GlobalCompositeOperation` — stored but NOT yet applied (reserved
  for future Material/shader work; Excalibur v0.32 has no per-graphic blend
  mode)
- `visible?: boolean` — when false, layer is excluded from the composite
  (default true)

Note: effects on `Animation` graphics mutate the shared cached instance (same
limitation as existing button/badge code). Effects on `Sprite` graphics are
applied to a clone.

**`parseTileRef(ref: TileRef): ex.Graphic`** — resolves a single `TileRef` to an
Excalibur graphic, applying `TileLayerDef` effects. Does not handle `offset` or
`visible` — use `resolveGraphicLayers()` when those matter.

**`resolveGraphicLayers(refs: TileRef | TileRef[]): ex.Graphic`** — composes one
or more `TileRef`s into a single graphic. Filters `visible:false` layers,
applies `TileLayerDef.offset` via `GraphicsGrouping.offset`. Use this instead of
`parseTileRef()` when working with `TileActor` tile options.

#### `label.ts`

**`LabelDef` interface** — configuration for a text label:

- `text`, `bordered?` (default true), `fontSize?`, `color?`, `labelOffset?`
- `backgroundColor?` — pill background color; default semi-transparent black.
  Pass any `ex.Color` to change it (e.g. blue for a level badge).

Rendering helpers:

- `makeBorderedLabel(text, opts)` — returns a `GraphicsGroup` with an optional
  rounded-rect background; accepts `backgroundColor?`
- `makeLabelActor(label, pos, opts)` — creates an `ex.Actor` whose graphic is a
  bordered label; returns null when label is undefined

#### `badge.ts`

**`BadgeDef` type** — unified badge content used in `ButtonDef.badge` and
`TileActorBadgeDef.badge`:

- `number | string` — text shorthand (bordered, 80% font size)
- `LabelDef` — full text label control including `backgroundColor`
- `SpriteBadge` — `{ tile: TileRef; size?: number }` for an icon badge; `size`
  is the rendered edge length in world pixels (default 16)

**`TileActorBadgeDef` interface** — a badge pinned to a corner/edge of a
TileActor sprite:

- `anchor: AnchorPlacement` — which corner/edge of the sprite to attach to
- `badge: BadgeDef` — text or sprite content
- `offset?: ex.Vector` — additional pixel nudge in world space

`makeBadgeActor(badge, pos, opts)` — creates a badge actor from a `BadgeDef`;
accepts optional `anchor: AnchorPlacement` (default `"top-right"`, for button
badges).

#### `button.ts`

**`ButtonDef` interface** — base button definition shared by world-space
TileActor buttons and screen-space HUD buttons. For HUD use, extend with
`HudButtonDef` (defined in `hud.ts`):

- `tile?`, `activeTile?`, `disabledTile?` — sprites for normal/active/disabled
  states
- `active?`, `disabled?` — initial state flags
- `badge?: BadgeDef` — small overlay at the button's top-right corner
- `label?: string | LabelDef` — label rendered below the button
- `onPressed` — callback

`makeButtonGraphic(def, disabled, active, w, h)` — resolves the correct graphic
and opacity for a button given its current state.

#### `path-line.ts`

**`PathLineOptions` interface** — visual style for a path line:

- `color?` — CSS color string (default: `"rgba(80, 232, 120, 0.85)"`)
- `thickness?` — stroke width in world pixels (default: 1)
- `knobRadius?` — endpoint knob radius in world pixels (default: 2)
- `dashPattern?` — `setLineDash` pattern; `[]` for solid (default: `[2, 4]`)

**`makePathLine(from, to, opts?): ex.Actor`** — creates a scene-level actor that
draws a straight dotted path between two world positions, with circular endpoint
knobs. Kill the returned actor to remove the line. Used by `TileActor.moveTo()`
for vessel movement paths; also available for any other world-space path
rendering.

#### `hud.ts`

Screen-fixed HUD button groups using `ex.ScreenElement`.

**`HudAnchor`** — type alias for `AnchorPlacement`.

**`HudButtonDef` interface** — extends `ButtonDef` with HUD-only sizing fields:

- `width?`, `height?` — button size in screen pixels (default 32)
- `hitPadding?` — inflates the pointer-event hit area (px, default 0)

**`HudGroupDef`** — layout spec for a button group:

- `anchor: HudAnchor` — one of 9 positions (e.g. `"top-right"`, `"bottom-left"`)
- `direction?: HudStackDir` — `"down"` / `"up"` / `"left"` / `"right"` /
  `"center"`; inferred from anchor if omitted
- `padding?` — gap from screen edge in px (default 8)
- `gap?` — gap between buttons in px (default 4)
- `offset?` — shift along the stacking axis before the first button (default 0)
- `zOffset?` — z draw order relative to other HUD groups
- `buttons: HudButtonDef[]`

**`HudGroupHandle`** — runtime control returned by `addHudGroup()`:

- `setVisible(visible)`, `setButtonDisabled(index, disabled)`,
  `setButtonActive(index, active)`,
  `setBadge(index, badge: BadgeDef | undefined)`, `remove()`

**`spawnHudGroup(engine, def)`** — low-level factory; prefer `addHudGroup(def)`
from a `TiledScene` subclass, which also registers the group for pointer-up
dispatch.

---

### `src/tile-actor.ts`

Defines `TileActor`, the base class for all interactive map entities.

**Sprite orientation convention:** All sprites are assumed to face **upward
(−y)** at rotation 0. This must hold for new sprites too — `moveTo()` and
`setFacing()` rely on it to rotate actors correctly toward their target.

**Construction — `TileActorOptions`:**

- `tile?: TileRef | TileRef[] | null` — sprite(s) to display; pass a single
  `TileRef` or an array to stack multiple layers; omit or pass `null` for an
  invisible (empty) tile actor
- `movingTile?: TileRef | TileRef[] | null` — alternative sprite(s) shown while
  the actor is in motion; same layer forms as `tile`
- `tilemap`, `col`, `row` — position; `width`, `height` — size in tiles (these
  become `colSpan`/`rowSpan` on the constructed actor)
- `ownerName?`, `ownerId?` — if provided, a label is rendered below the sprite
- `selection?` — selection ring tile; defaults to `"ui-selection:0"`, pass
  `null` to suppress
- `onPressed?` — callback fired when the actor body is tapped
- `buttons?: ButtonDef[]` — action buttons shown in an arc when selected; see
  `ButtonDef` in `src/ui/`
- `badges?: TileActorBadgeDef[]` — decorations pinned to corners/edges of the
  sprite; always visible, never intercept input (see `TileActorBadgeDef` in
  `src/ui/`)

**Public fields (all `readonly` — do not assign directly):**

- `col`, `row` — grid position at construction (top-left tile). **These do not
  update when `moveTo()` is called.** To get the actor's current world position,
  use `actor.pos` (center in pixels) and divide by `tileWidth`/`tileHeight`.
- `colSpan`, `rowSpan` — size in tiles (set from `width`/`height` options)
- `ownerName`, `ownerId`

**Key methods:**

- `moveTo(col, row, speed, onComplete?)` — animates the actor to the target
  tile. Also: auto-rotates to face the direction of travel; swaps to
  `movingTile` sprite during travel and back to base on arrival; draws a dotted
  green path line from departure to destination (removed on arrival). Cancels
  any in-flight movement before starting.
- `setFacing(angle)` — rotates the actor to face a given angle in radians (0 =
  up/−y). Action buttons and labels counter-rotate to stay upright.
- `select()` / `deselect()` — show/hide the selection ring and action buttons

**Note on upright children:** Owner labels, action buttons, and actor badges
always render upright in screen space and stay anchored at a fixed world-space
offset from the actor center, regardless of the actor's rotation.

---

### `src/map-loader.ts`

Calls the Rust `generate_map` IPC command and builds an `ex.TileMap` from the
returned tile grid data.

```ts
buildTileMap(mapType: string): Promise<ex.TileMap>
```

`mapType` is passed to the Rust backend for future map variants (e.g. `"space"`,
`"ship"`). The backend returns `cols`, `rows`, `tile_width`, `tile_height`, and
`tiles` (a flat array of `TileRef` strings, one per cell).

---

### `src/resources.ts`

Single source of truth for all visual assets. Contains `TILESET_DEFS` and
`TilesetRegistry`.

**Two tileset kinds:**

- `static` — a sheet of distinct sprites; `tileId` selects which sprite.
- `animated` — a single looping animation; `tileId=0` returns the full
  `ex.Animation`, any other `tileId` returns the individual frame sprite.

**Helper constructors (use these in `TILESET_DEFS`):**

- `sd(name, src, cols, rows, tileSize)` — define a static tileset
- `ad(name, src, cols, rows, tileSize, frames, frameDuration)` — define an
  animated tileset

The `src` argument must be the result of calling the local `png("sprite-name")`
helper (filename without path or `.png` extension), which looks up the asset in
Vite's glob and throws early if missing. Do not import PNGs directly.

**Adding a new tileset:**

1. Drop the PNG in `src/assets/`.
2. Add one `sd(...)` or `ad(...)` line to `TILESET_DEFS` in `resources.ts`.
3. For `ui-button-*` or `module-*` sheets, no code change is needed at all —
   they are discovered automatically (`ui-button-*` as static 3*2 64px tilesets;
   `module-*` as animated 4*4 256px tilesets, 16 frames at 66 ms/frame).

**Currently registered tilesets:**

| Name           | Kind     | Grid | Tile size | Notes                            |
| -------------- | -------- | ---- | --------- | -------------------------------- |
| `test-tileset` | static   | 4*1  | 32px      | Placeholder map tiles            |
| `ui-selection` | animated | 6*6  | 256px     | Selection ring                   |
| `ss1-base`     | animated | 6*6  | 256px     | Mothership (normal)              |
| `ss1-damaged`  | animated | 6*6  | 256px     | Mothership (damaged)             |
| `cs1-base`     | animated | 6*6  | 64px      | Vessel (idle)                    |
| `cs1-moving`   | animated | 6*6  | 64px      | Vessel (in motion)               |
| `ship-tiles`   | static   | 6*6  | 64px      | Ship interior floor/wall tiles   |
| `ui-button-*`  | static   | 3*2  | 64px      | Action buttons (auto-registered) |
| `module-*`     | animated | 4*4  | 256px     | Ship modules (auto-registered)   |

**Main API:** `Resources.Tilesets.getGraphic(name, tileId): ex.Graphic`

---

### `src-tauri/src/lib.rs`

Tauri command definitions. `generate_map(map_type) -> Result<TileMapData, String>` dispatches on `map_type`:

- `"map"` — returns a procedurally generated 100*100 space map (32*32px tiles,
  `test-tileset` placeholder rects).
- `"ship"` — deserializes `src/assets/ship-level.json` (embedded at compile
  time via `include_str!`) into a 40*40 grid of 32*32px world tiles referencing
  the `ship-tiles` spritesheet. To switch to a network fetch, replace the
  `include_str!` call in `generate_ship_map()` with a fetched string — the
  `Result` propagation is already in place.

`TileMapData` fields: `cols`, `rows`, `tile_width`, `tile_height`,
`tiles: Vec<String>` (flat row-major array of `TileRef` strings; empty string
means no tile at that cell).

---

### `tools/` and `art/gen_*.sh`

Python scripts for the art pipeline. All scripts use Pillow. Run the shell
scripts from any directory (each does `cd "$(dirname "$0")"` and `set -e`).

| Script | Purpose |
|---|---|
| `tools/sprite_extract.py` | Extract and uniform-resize sprites from a padded sheet |
| `tools/sprite_merge.py` | Merge sprites from multiple sheets into one output sheet |
| `tools/sprite_transition.py` | Generate animated spritesheets with fade/roll/scale/rotate transitions |
| `tools/tmj_to_tilemap.py` | Convert a Tiled `.tmj` file → `TileMapData` JSON asset |

`tmj_to_tilemap.py` flags: `-s SOURCE -d DEST -t TILESET [-W tile_width] [-H tile_height]`.
Only single-tileset maps are supported. `-W`/`-H` override the logical tile size
in the output (useful to store 32px world tiles while the sprites are 64px, giving
extra resolution on zoom).

Shell scripts in `art/` drive asset generation and write directly to `src/assets/`:

| Script | Output |
|---|---|
| `art/gen_ship_level.sh` | `ship-tiles.png` (sprite_merge) + `ship-level.json` (tmj_to_tilemap) |
| `art/gen_cs1.sh` | `cs1-base.png`, `cs1-moving.png` |
| `art/gen_ss1.sh` | `ss1-base.png`, `ss1-damaged.png` |
| `art/gen_modules.sh` | `module-base.png` |
| `art/gen_ui.sh` | `ui-selection.png`, `ui-selection-2.png`, `ui-button-*.png` |

---

### `tauri.conf.json`

Critical Tauri app configuration — window properties, build commands, and
security settings.

---

### `vite.config.ts`

Vite build config. `assetsInlineLimit: 0` is required so Excalibur can load
image assets in production builds. HMR uses port 1421 when running via Tauri's
dev host.

---

## 9. Game Design

See `README.md` for full details. Core ideas:

- **Setting**: Players colonize a new star system; their "base" is a mothership
  built and expanded in space.
- **Mothership**: Has modules (RTS "buildings") that serve specific functions
  and can be upgraded.
- **Resources** (4 types): construction material, high-tech materials,
  biological materials, and fuel. These can be gathered from resource nodes on
  the map (asteroids, etc.) or produced internally via specialized modules.
- **Map**: Resource nodes are asteroids, moons, and planets; difficulty scales
  toward the center, requiring alliances to progress.
- **Diminishing returns** instead of hard daily caps on actions.
- **New-player protection**: Late joiners start in a new system with peers.
- **Seasons**: After milestones, players move to a new system; ascension bonuses
  carry forward.

---

## 10. Documentation

Fetch docs before implementing engine or IPC features:

- Excalibur.js: https://excaliburjs.com/docs/
- Tauri: https://tauri.app/v2/develop/
