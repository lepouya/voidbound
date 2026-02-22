# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

Voidbound is a multiplayer online RTS game with space colonization themes. Built
as a hybrid web/desktop app using TypeScript + Excalibur.js frontend and Rust
backend via Tauri v2.

## Development Commands

```bash
deno install          # first-time setup
deno task tauri dev   # dev server + desktop app
deno task build       # production build (tsc && vite build)
```

Vite dev server: port 1420, HMR on port 1421.

## Code Formatting

Always run `deno fmt <files>` on any source files you modify before considering
the task complete.

When writing dimensions or grid sizes in comments, code, or documentation, use
`*` (e.g. `3*2`, `cols*rows`) — never the Unicode multiplication sign `×`,
which can be confused with the Latin letter `x`.

## Architecture

**Frontend (`src/`)** — TypeScript + Excalibur.js v0.32:

- Scenes manage the game world and camera (pan, pinch-zoom, clamped to map
  bounds)
- Actors represent interactive game entities (tile-based, selectable)
- Assets are `.png` spritesheets in `src/assets/`. Tileset metadata is defined
  in code in `src/resources.ts` (`TILESET_DEFS` + `TilesetRegistry`) — no
  `.tsj` or `.tmx` files, no Tiled plugin. To add a spritesheet: drop the PNG
  and add one line to `TILESET_DEFS`. `ui-button-*.png` files need no code
  change at all (picked up via `import.meta.glob`).
- Game window: 390*844 (mobile portrait), `FitScreenAndFill`, pixel art
  rendering

**Backend (`src-tauri/`)** — Tauri v2 + Rust:

- Rust commands (via `#[tauri::command]`) handle game logic and serve data to
  the frontend over Tauri IPC
- Map generation currently lives in Rust and returns tile grid data to the
  frontend

**Key config:**

- `vite.config.ts`: `assetsInlineLimit: 0` — required so Excalibur can load
  assets in production builds

## Documentation

Fetch docs before implementing engine or IPC features:

- Excalibur.js: https://excaliburjs.com/docs/
- Tauri: https://tauri.app/develop/

## Game Design

See `README.md`. Core ideas:

- **Setting**: players colonize a new star system; their "base" is a mothership
  built and expanded in space
- **Mothership**: has compartments (RTS "buildings") that serve specific
  functions and can be upgraded
- **Resources** (4 types): construction material (rocky/iron asteroids),
  high-tech materials (rare asteroids), biological materials (icy asteroids /
  terrarium), fuel (hydrogen/methane)
- **Map**: resource nodes are asteroids, moons, and planets; difficulty scales
  toward center, requiring alliances to progress
- **Diminishing returns** instead of hard daily caps on actions
- **New-player protection**: late joiners start in a new system with peers
- **Seasons**: after milestones, players move to a new system; ascension bonuses
  carry forward
