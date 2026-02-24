# Gemini Steering Document: Voidbound

This document provides guidance for Gemini when working with the Voidbound
codebase. It outlines the project's architecture, technologies, and conventions.

## 1. Project Overview

Voidbound is a multiplayer online real-time strategy (MMORTS) game set in space.
The core gameplay revolves around players colonizing a new star system, building
and upgrading a mothership (their primary base), managing resources, and forming
alliances to expand their territory.

- **Genre:** MMORTS, Space Colonization, Strategy
- **Platform:** Cross-platform (Desktop & Web) via Tauri and modern web
  browsers.
- **Key Features:** Base building (mothership), resource gathering, territory
  expansion, alliances, seasonal progression.

---

## 2. Core Technologies

The project is a hybrid application combining a TypeScript/Excalibur.js frontend
with a Rust/Tauri backend.

### Frontend (`src/`)

- **Engine:** [Excalibur.js](https://excaliburjs.com/docs/) (v0.32)
  - A 2D game engine that manages the game loop, rendering, scenes, actors, and
    input.
  - The game uses a `FitScreenAndFill` display mode for a responsive,
    mobile-first layout.
- **Language:** [TypeScript](https://www.typescriptlang.org/)
  - Provides strict static typing for the entire frontend codebase.
- **Bundler:** [Vite](https://vitejs.dev/)
  - Provides a fast development server and builds the frontend assets. The
    configuration in `vite.config.ts` is specifically tailored for Tauri
    integration.
- **Asset Loading:** Sprites and animations are defined in code via a typed
  catalog in `src/resources.ts` — no external tileset or map files. All PNG
  spritesheets are discovered automatically by Vite's `import.meta.glob`.

### Backend (`src-tauri/`)

- **Framework:** [Tauri v2](https://tauri.app/v2/develop/)
  - A framework for building lightweight, cross-platform desktop apps that
    provides the bridge between the Rust backend and the JavaScript frontend.
- **Language:** [Rust](https://www.rust-lang.org/)
  - The backend logic is written in Rust for performance and safety.
  - **IPC (Inter-Process Communication):** Rust functions are exposed to the
    frontend as "commands" using the `#[tauri::command]` attribute. The frontend
    calls these commands using `invoke()` from the `@tauri-apps/api` library.

### Toolchain

- **Package Manager / Task Runner:** [Deno](https://deno.land/)
  - Manages npm dependencies (`deno install`) and runs development scripts
    (`deno task tauri dev`). Dependencies are listed in `package.json`; there
    is no separate `deno.json`.

---

## 3. Project Structure

```text
/
├── src/                  # Frontend (TypeScript, Excalibur.js)
│   ├── main.ts           # Game engine entry point
│   ├── tiled-scene.ts    # Abstract base scene: camera, pan/zoom, tap-to-select
│   ├── map-level.ts      # Space map scene: mothership, vessel dispatch
│   ├── ship-level.ts     # Mothership interior scene (compartments)
│   ├── tile-actor.ts     # TileActor class and TileRef format
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

To run the application in development mode with hot-reloading:

```bash
deno task tauri dev
```

- Vite dev server runs on `http://localhost:1420`.
- The Tauri desktop window will launch and load from this URL.

### Production Build

To create a production-ready build of the frontend:

```bash
deno task build
```

This command first runs `tsc` to type-check the code, then `vite build`.

### Code Formatting

Format all TypeScript and Rust code before committing:

```bash
deno fmt
```

### Type Checking

Always use `deno check` — never `npx tsc` or `tsc` directly:

```bash
deno check src/**/*.ts
```

When writing dimensions or grid sizes in comments, code, or documentation, use
`*` (e.g. `3*2`, `cols*rows`) — never the Unicode multiplication sign `×`,
which can be confused with the Latin letter `x`.

---

## 5. Architectural Principles

- **Entity-Component-System (ECS-like):** The frontend follows ECS-like
  principles. Game objects are implemented as "Actors" (entities) which are
  composed of various components that encapsulate data and logic.
- **Scene-Based Logic:** The game's structure is organized into different
  scenes. The primary game level scene is responsible for orchestrating camera
  controls, actor interactions, and setting up the game world.
- **Asset Management:** All spritesheets are PNG files under `src/assets/`.
  They are registered in the typed `TILESET_DEFS` catalog in `src/resources.ts`
  and loaded via `TilesetRegistry`, which builds Excalibur `SpriteSheet` and
  `Animation` objects at startup. To add a new spritesheet, drop the PNG into
  `src/assets/` and add one entry to `TILESET_DEFS`. Button-style tilesets
  (`ui-button-*.png`) require no code changes at all — they are discovered
  automatically.
- **Backend Communication (IPC):** The frontend acts as a client to the Rust
  backend, using asynchronous `invoke` calls to execute commands defined in
  Rust. This is used for tasks like fetching procedurally generated map data.
- **State Management:** Most state is managed locally within the frontend's
  scenes and actors.
- **Input Handling:** User input (mouse, touch, keyboard) is handled within the
  main game scene to support interactions like panning, zooming, and selecting
  objects.

---

## 6. Naming Conventions

- Large ships (ss-* sprites, 4*4 tiles): **motherships** (also "space stations")
- Small ships dispatched by motherships (cs-* sprites, 1*1 tiles): **vessels**
  (never "cargo ships" — their role is broader than cargo)

---

## 7. Codebase Guide

This section provides a high-level orientation to the project's key files and
directories.

- **`src/main.ts`**: The entry point for the frontend application. It
  initializes the Excalibur game engine, configures the display, and loads the
  starting scene.
- **`src/tiled-scene.ts`**: Abstract base class for all tile-map scenes.
  Implements drag-to-pan, pinch/scroll-to-zoom, and the tap-to-select actor
  system (including the empty tile actor pattern). Subclasses implement
  `buildMap()` and `setupActors()`. Key protected members available to
  subclasses: `tilemap`, `handleTilePressed`, `pendingActor`,
  `suppressNextPointerUp`, `deselectActor()`.
- **`src/map-level.ts`**: The space map scene. Contains the player mothership,
  enemy mothership, and vessel dispatch logic. Vessel movements are modelled as
  `VesselMoveEvent` structs — a server-authoritative shape designed so the same
  `applyVesselMoveEvent()` entry point works for both local actions and future
  server-pushed events.
- **`src/ship-level.ts`**: The mothership interior scene (compartments). Not yet
  populated.
- **`src/tile-actor.ts`**: Defines `TileActor`, the base class for all
  interactive map entities. Key features: animated sprite support via `TileRef`
  format (`"tileset-name:tile_id"`), selection ring, action button arcs, owner
  name labels, and `moveTo(col, row, speed, onComplete?)` for animated grid
  movement with automatic sprite-swap (idle ↔ moving). Public fields: `col`,
  `row`, `colSpan`, `rowSpan`, `ownerName`, `ownerId`.
- **`src/map-loader.ts`**: Calls the Rust `generate_map` IPC command and builds
  an `ex.TileMap` from the returned tile grid data.
- **`src/resources.ts`**: The single source of truth for all visual assets.
  Contains two things: (1) `TILESET_DEFS`, a typed catalog describing every
  spritesheet (grid dimensions, tile size, and for animated sheets the frame
  count and frame duration); and (2) `TilesetRegistry`, which builds
  `ex.SpriteSheet` and `ex.Animation` instances from those definitions and
  exposes them via `Resources.Tilesets.getGraphic(name, tileId)`.

  **Two tileset kinds:**
  - `static` — a sheet of distinct sprites; `tileId` selects which sprite.
  - `animated` — a single looping animation; `tileId=0` returns the full
    `ex.Animation`, any other `tileId` returns the individual frame sprite.

  **Adding a new tileset:**
  1. Drop the PNG in `src/assets/`.
  2. Add one `sd(...)` or `ad(...)` line to `TILESET_DEFS` in `resources.ts`.
  3. For `ui-button-*` sheets, no code change is needed at all.
- **`src-tauri/src/lib.rs`**: Tauri command definitions (e.g. `generate_map`).
- **`tauri.conf.json`**: Critical configuration for the desktop app, defining
  the window properties, build commands, and security settings.
- **`vite.config.ts`**: Configuration for the Vite build tool. Notable:
  `assetsInlineLimit: 0` is required so Excalibur can load image assets in
  production builds.
