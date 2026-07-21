---
name: add-scene
description: Add a new TiledScene (game area/level) to Voidbound. Use when the user wants to create a new scene, level, map view, or game area — e.g. "add a battle scene", "create a trade screen", "new level".
---

# Adding a new TiledScene

All game areas in Voidbound are `TiledScene` subclasses. They share drag-to-pan,
pinch/scroll-to-zoom, tap-to-select, and HUD groups from the base class. Follow
these steps to add a new one.

## 1. Create the scene file

Create `src/<name>/<name>-level.ts` — its own domain directory alongside
`src/map/` and `src/ship/` — following this template. Shared framework pieces
live in `src/scene/`, cross-scene state in `src/state/`:

```ts
import * as ex from "excalibur";

import { buildTileMap } from "../scene/map-loader.ts";
import { TileActor } from "../scene/tile-actor.ts";
import { SceneMap, TiledScene } from "../scene/tiled-scene.ts";

export class <Name>Level extends TiledScene {
  override onInitialize(engine: ex.Engine): void {
    super.onInitialize(engine); // MUST be first — sets engineRef used by addHudGroup

    // Optional: this.backgroundColor = ex.Color.Black;

    // Standard HUD (resource bar top-left, Shop top-right, switch/Mail/Items
    // bottom-right) plus the scene-switch button back to wherever players
    // come from. Returns { resourceBar, topRight, bottomRight }
    // HudGroupHandles for badge/visibility control.
    this.addCommonHud({
      frameTile: "ui-frame-square:0",
      activeFrameTile: "ui-frame-square:1",
      disabledFrameTile: "ui-frame-square:2",
      tile: "ui-icon-<icon>:0",
      activeTile: "ui-icon-<icon>:1",
      disabledTile: "ui-icon-<icon>:2",
      width: 64,
      height: 64,
      label: "<Label>",
      onPressed: () => engine.goToScene("<other-scene>"),
    });

    // Scene-specific groups go through addHudGroup — HudButtonDef entries,
    // see src/ui/hud.ts.
  }

  protected override async buildMap(): Promise<SceneMap> {
    // Tilemap-backed scene (like ship). A geometry-only scene (like the
    // space map) instead returns { grid: await fetchGridGeometry("...") }
    // and renders a plain backgroundColor.
    const tilemap = await buildTileMap("<map-type>"); // must match a case in src-tauri/src/map.rs
    return { grid: tilemap, tilemap };
  }

  protected override setupActors(onTilePressed: (a: TileActor) => void): void {
    const edgeFallthrough = this.supportsEmptyTileActor();
    // Add TileActors with onPressed: onTilePressed, edgeFallthrough
    // Store references to key actors on `this` for use by initialCameraTarget.
  }

  // Optional overrides:

  protected override initialCameraTarget(): { pos: ex.Vector; zoom: number } {
    // Default: center of map at zoom 1. Override to focus on a key actor.
    return { pos: this.someActor.pos, zoom: 1 };
  }

  protected override supportsEmptyTileActor(): boolean {
    return true; // return true only if createEmptyTileActor is also overridden
  }

  protected override createEmptyTileActor(
    col: number,
    row: number,
    onPressed: (a: TileActor) => void,
  ): TileActor | null {
    // Return a TileActor to spawn + auto-select on tap of an empty tile, or null.
    return null;
  }
}
```

**Key rules:**

- `super.onInitialize(engine)` must be called **before** any `addCommonHud` /
  `addHudGroup` call — both depend on `engineRef` which `super` sets.
- Use `addCommonHud(switchButton)` for the standard HUD instead of redefining
  the Shop and scene-switch/Mail/Items groups; only the scene-switch button def
  is scene-specific. Reserve `addHudGroup` for groups unique to the scene.
- Every `TileActor` you create in `setupActors` should receive
  `onPressed: onTilePressed` and
  `edgeFallthrough: this.supportsEmptyTileActor()` so taps route correctly
  through the base-class selection flow.
- Button presses are consumed by the tap flow automatically — button handlers
  never need to set `suppressNextPointerUp`. Call `this.deselectActor()` in a
  handler if the action should clear the current selection.
  `suppressNextPointerUp = true` remains as an escape hatch for interactions
  handled outside the button flow.
- To give an actor a custom selection ring, pass `selection: "ui-selection-2"`
  (or any other `ui-selection*` tileset) in its `TileActorOptions`. Default is
  `ui-selection`. See `ModuleSync.createActor` (src/ship/ship-modules.ts) for an
  example.

**Rendering server state:** scenes must not hardcode world content the backend
owns. Entities that ride the `load_game_state` snapshot (motherships, vessels,
asteroids, modules) are rendered by **reconciling** actors from the shared
`gameState` tables: write a `sync<Entities>()` method that diffs scene actors
against the table, seed it from the current snapshot in `setupActors`, and
re-run it via `gameState.subscribe()` so late loader fetches, command responses,
and server pushes all land the same way. Subscriptions stay live across scene
switches (scenes never unsubscribe), so changes made while the scene is inactive
arrive on their own — an `onActivate` forced re-sync is only needed for entities
whose current position is lerped from event timestamps (see
`MapLevel.onActivate` → `vesselSync.sync(grid, true)`). See
`MothershipSync`/`AsteroidSync`/`VesselSync` (src/map/) and `ModuleSync`
(src/ship/ship-modules.ts), each a small class wrapping one `sync()` method; for
a new server-owned entity type, follow `/add-game-event`.

## 2. Register the scene in `src/main.ts`

Add your class to the `scenes` object passed to `new ex.Engine({...})`:

```ts
scenes: {
  map: MapLevel,
  ship: ShipLevel,
  <name>: <Name>Level,
}
```

Navigate to it from any other scene with `engine.goToScene("<name>")` — usually
wired up to a HUD button's `onPressed`.

**Start scene:** `main.ts` calls `game.start("ship", { ... })`. Only change that
string if the new scene is meant to replace `ship` as the initial scene the game
boots into — otherwise leave it alone.

## 3. Add a Rust map generator case (if needed)

If your scene needs its own map data, add a case to `generate_map` in
`src-tauri/src/map.rs`. `generate_map` returns `Result<TileMapData, String>`, so
any helper you add should return the same (or an infallible `TileMapData`
wrapped with `Ok(...)` in the match arm). Two existing patterns:

- **Procedural** (like `"map"` → `generate_space_map()`): build a `TileMapData`
  directly in Rust; the match arm wraps it with `Ok(...)`.
- **Pre-baked** (like `"ship"` → `generate_ship_map()`): `include_str!` a JSON
  asset from `src/assets/` and `serde_json::from_str` it, mapping any parse
  error into the `Result`. Pair with the `/gen-art` skill + a Tiled `.tmj`
  source file if you need an authored map.

The string you pass to `buildTileMap("...")` must match the Rust match arm
exactly — unknown strings fall through to the `other =>` error branch.

## 4. Wire up navigation from other scenes

Add a HUD button to existing scenes that calls `engine.goToScene("<name>")`.
Existing scenes get their single scene-switch button from `addCommonHud`; if a
scene needs to reach more than one destination, add the extra button via a
scene-specific `addHudGroup` group.

## 5. Finalize

Run `deno task format`, `deno task check`, then `deno task lint` per `AGENTS.md`
and fix any failures before declaring the task complete.

## Reference: existing scenes

- `src/map/map-level.ts` — geometry-only space map (no tilemap), reconciles
  mothership/asteroid/vessel actors from the snapshot, overrides
  `createEmptyTileActor` for Move/Deploy actions.
- `src/ship/ship-level.ts` — mothership interior (tilemap-backed), black
  background, reconciles module actors (Command Module included) from the
  snapshot.
