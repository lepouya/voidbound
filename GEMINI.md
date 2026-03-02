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
  catalog in `src/resources.ts` — no external tileset or map files. All PNG
  spritesheets are discovered automatically via Vite's `import.meta.glob`.

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
  Dependencies are in `package.json`; there is no separate `deno.json`.

---

## 3. Project Structure

```text
/
├── src/                  # Frontend (TypeScript, Excalibur.js)
│   ├── main.ts           # Game engine entry point
│   ├── ui.ts             # Shared UI primitives: TileRef, ButtonDef, LabelDef, helpers
│   ├── hud.ts            # Screen-fixed HUD button groups (spawnHudGroup)
│   ├── tiled-scene.ts    # Abstract base scene: camera, pan/zoom, tap-to-select, HUD
│   ├── map-level.ts      # Space map scene: mothership, vessels, HUD
│   ├── ship-level.ts     # Mothership interior scene (modules)
│   ├── tile-actor.ts     # TileActor class
│   ├── map-loader.ts     # buildTileMap() via Tauri IPC
│   ├── resources.ts      # Asset loading and management
│   └── assets/           # Game assets (PNG spritesheets only)
│
├── src-tauri/            # Backend (Rust, Tauri)
│   ├── src/
│   │   └── lib.rs        # Tauri command definitions (generate_map, etc.)
│   ├── Cargo.toml        # Rust dependencies
│   └── tauri.conf.json   # Tauri application configuration
│
├── art/                  # Source files for assets (e.g., original images)
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

Format source files after modifying them:

```bash
deno fmt <files>
```

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
  start: MapLevel,
  // ship: ShipLevel,  // defined but not yet registered
}
```

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

The mothership interior scene (compartments). Not yet registered in `main.ts`.
Contains a single `commandModule` actor (4*4, `module-base:0`, col 13, row 13)
with an example `badges` array demonstrating a "Lv 2" label at bottom-left.

---

### `src/ui.ts`

Shared UI primitives used by both `tile-actor.ts` (world-space) and `hud.ts`
(screen-space).

**`TileRef` format:**

```ts
type TileRef = string; // "tileset-name" or "tileset-name:tile_id"
```

The `:tile_id` part is optional and defaults to `0`. On animated tilesets,
`tileId=0` returns the full looping `Animation`; any other value returns the
individual frame sprite at that index. On static tilesets, `tileId` always
selects the sprite at that grid position.

`parseTileRef(ref: TileRef): ex.Graphic` resolves a `TileRef` to an Excalibur
graphic. Used by `map-loader.ts` and `tile-actor.ts`.

**`CornerAnchor` type** — 9-position anchor grid shared by HUD and TileActor
badges: `"top-left"` / `"top-center"` / `"top-right"` / `"middle-left"` /
`"middle-center"` / `"middle-right"` / `"bottom-left"` / `"bottom-center"` /
`"bottom-right"`.

`anchorFractions(anchor: CornerAnchor): { hFrac, vFrac }` — converts an anchor
to 0/0.5/1 fractions. Used internally by `hud.ts` and `tile-actor.ts`.

**`LabelDef` interface** — configuration for a text label:

- `text`, `bordered?` (default true), `fontSize?`, `color?`, `labelOffset?`
- `backgroundColor?` — pill background color; default semi-transparent black.
  Pass any `ex.Color` to change it (e.g. blue for a level badge).

**`BadgeDef` type** — unified badge content used in `ButtonDef.badge` and
`TileActorBadgeDef.badge`:

- `number | string` — text shorthand (bordered, 80% font size)
- `LabelDef` — full text label control including `backgroundColor`
- `SpriteBadge` — `{ tile: TileRef; size?: number }` for an icon badge; `size`
  is the rendered edge length in world pixels (default 16)

**`ButtonDef` interface** — base button definition shared by world-space
TileActor buttons and screen-space HUD buttons. For HUD use, extend with
`HudButtonDef` (defined in `hud.ts`):

- `tile?`, `activeTile?`, `disabledTile?` — sprites for normal/active/disabled
  states
- `active?`, `disabled?` — initial state flags
- `badge?: BadgeDef` — small overlay at the button's top-right corner
- `label?: string | LabelDef` — label rendered below the button
- `onPressed` — callback

**`TileActorBadgeDef` interface** — a badge pinned to a corner/edge of a
TileActor sprite:

- `anchor: CornerAnchor` — which corner/edge of the sprite to attach to
- `badge: BadgeDef` — text or sprite content
- `offset?: ex.Vector` — additional pixel nudge in world space

**Rendering helpers (internal use):**

- `makeBorderedLabel(text, opts)` — returns a `GraphicsGroup` with an optional
  rounded-rect background; accepts `backgroundColor?`
- `makeLabelActor(label, pos, opts)` — creates an `ex.Actor` whose graphic is a
  bordered label; returns null when label is undefined
- `makeBadgeActor(badge, pos, opts)` — creates a badge actor from a `BadgeDef`;
  accepts optional `anchor` (default `(1,1)` = top-right, for button badges)
- `makeButtonGraphic(def, disabled, active, w, h)` — resolves the correct
  graphic and opacity for a button given its current state

---

### `src/hud.ts`

Screen-fixed HUD button groups using `ex.ScreenElement`.

**`HudAnchor`** — type alias for `CornerAnchor` (defined in `ui.ts`),
re-exported from `hud.ts` for backward compatibility.

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

- `tile?: TileRef | null` — sprite to display; omit or pass `null` for an
  invisible (empty) tile actor
- `movingTile?: TileRef` — alternative sprite shown while the actor is in motion
- `tilemap`, `col`, `row` — position; `width`, `height` — size in tiles (these
  become `colSpan`/`rowSpan` on the constructed actor)
- `ownerName?`, `ownerId?` — if provided, a label is rendered below the sprite
- `selection?` — selection ring tile; defaults to `"ui-selection:0"`, pass
  `null` to suppress
- `onPressed?` — callback fired when the actor body is tapped
- `buttons?: ButtonDef[]` — action buttons shown in an arc when selected; see
  `ButtonDef` in `src/ui.ts`
- `badges?: TileActorBadgeDef[]` — decorations pinned to corners/edges of the
  sprite; always visible, never intercept input (see `TileActorBadgeDef` in
  `src/ui.ts`)

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
3. For `ui-button-*` sheets, no code change is needed at all — they are
   discovered automatically and registered as static 3*2, 64px tilesets.

**Currently registered tilesets:**

| Name           | Kind     | Grid | Tile size | Notes                            |
| -------------- | -------- | ---- | --------- | -------------------------------- |
| `test-tileset` | static   | 4*1  | 32px      | Placeholder map tiles            |
| `ui-selection` | animated | 6*6  | 256px     | Selection ring                   |
| `ss1-base`     | animated | 6*6  | 256px     | Mothership (normal)              |
| `ss1-damaged`  | animated | 6*6  | 256px     | Mothership (damaged)             |
| `cs1-base`     | animated | 6*6  | 64px      | Vessel (idle)                    |
| `cs1-moving`   | animated | 6*6  | 64px      | Vessel (in motion)               |
| `ui-button-*`  | static   | 3*2  | 64px      | Action buttons (auto-registered) |

**Main API:** `Resources.Tilesets.getGraphic(name, tileId): ex.Graphic`

---

### `src-tauri/src/lib.rs`

Tauri command definitions. Currently: `generate_map(map_type)` — returns a
100*100 grid of 32*32px tiles as `TileRef` strings. The `map_type` parameter is
reserved for future map variants.

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
