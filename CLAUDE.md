# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

Voidbound is a multiplayer online RTS (Real-Time Strategy) game with space
colonization themes. Built as a hybrid web/desktop application using TypeScript
frontend with Excalibur.js game engine and Rust backend via Tauri.

## Development Commands

```bash
# Install dependencies (first time setup)
deno install

# Run development server with desktop app
deno task tauri dev

# Build for production
deno task build

# Mobile development
deno task tauri android init && deno task tauri android dev
deno task tauri ios init && deno task tauri ios dev
```

The Vite dev server runs on port 1420 with HMR on port 1421.

## Code Formatting

Always run `deno fmt <files>` on any source files you modify before considering
the task complete.

## Architecture

**Frontend (src/):**

- Uses Excalibur.js (v0.32) - a TypeScript 2D game engine
- `main.ts` - Game initialization and engine setup
- `level.ts` - Scene management with lifecycle hooks (onInitialize, onPreLoad,
  onActivate, etc.)
- `resources.ts` - Asset loading pipeline for sprites/images

**Backend (src-tauri/):**

- Tauri v2 provides the desktop/mobile wrapper
- Rust functions exposed to frontend via `#[tauri::command]` attribute in
  `lib.rs`
- Security capabilities configured in `capabilities/default.json`

**Rendering:**

- Game window: 390 x 844 (mobile portrait orientation)
- Display mode: Fit screen and fill
- Pixel art rendering enabled

## Excalibur.js Documentation

When working on game engine features, consult the Excalibur.js documentation at
https://excaliburjs.com/docs/ using WebFetch. Key reference pages include:

- https://excaliburjs.com/docs/actors — Actors, components, and entity system
- https://excaliburjs.com/docs/scenes — Scenes and scene management
- https://excaliburjs.com/docs/input — Input handling (keyboard, pointer,
  gamepad)
- https://excaliburjs.com/docs/graphics — Sprites, animations, and rendering
- https://excaliburjs.com/docs/physics — Collision detection and physics
- https://excaliburjs.com/docs/resources — Asset loading and resource management

Fetch the relevant documentation page before implementing or modifying
Excalibur.js features to ensure correct API usage.

## Tauri Documentation

When working on backend, desktop/mobile shell, or IPC features, consult the
Tauri documentation at https://tauri.app/ using WebFetch. Key reference pages
include:

- https://tauri.app/start/ — Getting started and project setup
- https://tauri.app/develop/ — Development guides
- https://tauri.app/develop/calling-rust/ — Invoking Rust commands from the
  frontend
- https://tauri.app/develop/calling-frontend/ — Calling frontend from Rust
  (events)
- https://tauri.app/plugin/ — Plugin system and official plugins
- https://tauri.app/distribute/ — Building and distributing the application
- https://tauri.app/reference/javascript/ — JavaScript/TypeScript API reference
- https://tauri.app/reference/rust/ — Rust API reference

Fetch the relevant documentation page before implementing or modifying Tauri
features to ensure correct API usage.

## Game Design Notes

From README.md ideas dump:

- Space setting with colonization mechanics
- Base building with upgrades
- Resource collection with limiting strategies (diminishing returns or daily
  caps)
- Map progression where resources increase in difficulty toward center
- New player protection via separate starting planets
- Seasonal progression system
- Alliance/dominion building for multiplayer cooperation
