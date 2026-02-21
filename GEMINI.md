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
- **Map/Level Design:**
  [@excaliburjs/plugin-tiled](https://excaliburjs.com/docs/tiled-plugin/)
  - Uses maps and tilesets created with the
    [Tiled Map Editor](https://www.mapeditor.org/).
  - Assets are stored as `.tmx` (maps) and `.tsj` (tileset definitions).

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

- **Task Runner:** [Deno](https://deno.land/)
  - Used for running development scripts (e.g., `deno task tauri dev`).
- **Package Manager:** `npm`
  - Manages Node.js dependencies listed in `package.json`.

---

## 3. Project Structure

```text
/
├── src/                  # Frontend (TypeScript, Excalibur.js)
│   ├── main.ts           # Game engine entry point
│   ├── level.ts          # Main game scene, input handling, camera logic
│   ├── tilemap.ts        # Tiled integration, actor definitions
│   ├── resources.ts      # Asset loading and management
│   └── assets/           # Game assets (images, tilesets)
│
├── src-tauri/            # Backend (Rust, Tauri)
│   ├── src/
│   │   └── main.rs       # Tauri application setup and command definitions
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

Ensure `deno` and `npm` are installed. The first time, run:

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

---

## 5. Architectural Principles

- **Entity-Component-System (ECS-like):** The frontend follows ECS-like
  principles. Game objects are implemented as "Actors" (entities) which are
  composed of various components that encapsulate data and logic.
- **Scene-Based Logic:** The game's structure is organized into different
  scenes. The primary game level scene is responsible for orchestrating camera
  controls, actor interactions, and setting up the game world.
- **Asset Management:** Game assets are centrally managed and loaded. The build
  process is configured to handle asset paths correctly for both development and
  production.
- **Backend Communication (IPC):** The frontend acts as a client to the Rust
  backend, using asynchronous `invoke` calls to execute commands defined in
  Rust. This is used for tasks like fetching procedurally generated map data.
- **State Management:** Most state is managed locally within the frontend's
  scenes and actors.
- **Input Handling:** User input (mouse, touch, keyboard) is handled within the
  main game scene to support interactions like panning, zooming, and selecting
  objects.

---

## 6. Codebase Guide

This section provides a high-level orientation to the project's key files and
directories.

- **`src/main.ts`**: The entry point for the frontend application. It
  initializes the Excalibur game engine, configures the display, and loads the
  starting scene.
- **`src/level.ts`**: This module contains the main game scene. It's the core of
  the frontend, responsible for bringing together the tilemap, actors, and user
  input.
- **`src/tilemap.ts`**: This module handles the integration with Tiled. It
  contains logic for parsing map data from the backend and defines the base
  classes for actors on the tile grid.
- **`src/resources.ts`**: Defines and configures all loadable game assets.
  Centralizing asset definitions here is a key convention.
- **`src-tauri/src/main.rs`**: The entry point for the backend Rust application,
  where the Tauri app is run and IPC commands are defined.
- **`tauri.conf.json`**: Critical configuration for the desktop app, defining
  the window properties, build commands, and security settings.
- **`vite.config.ts`**: Configuration for the Vite build tool, tailored for the
  Tauri development environment.
