---
name: add-scene
description: Add a new TiledScene (game area/level) to Voidbound. Use when the user wants to create a new scene, level, map view, or game area — e.g. "add a battle scene", "create a trade screen", "new level".
---

# Adding a new TiledScene

All game areas in Voidbound are `TiledScene` subclasses. They share drag-to-pan,
pinch/scroll-to-zoom, tap-to-select, and HUD groups from the base class. Follow
these steps to add a new one.

## 1. Create the scene file

Create `src/<name>-level.ts` following this template:

```ts
import * as ex from "excalibur";

import { buildTileMap } from "./map-loader";
import { TileActor } from "./tile-actor";
import { TiledScene } from "./tiled-scene";

export class <Name>Level extends TiledScene {
  override onInitialize(engine: ex.Engine): void {
    super.onInitialize(engine); // MUST be first — sets engineRef used by addHudGroup

    // Optional: this.backgroundColor = ex.Color.Black;

    this.addHudGroup({
      anchor: "top-right",
      gap: 8,
      buttons: [
        // HudButtonDef entries — see src/ui/hud.ts
      ],
    });
  }

  protected override buildMap(): Promise<ex.TileMap> {
    return buildTileMap("<map-type>"); // must match a case in src-tauri/src/lib.rs
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

- `super.onInitialize(engine)` must be called **before** any `addHudGroup` call
  — `addHudGroup` depends on `engineRef` which `super` sets.
- Every `TileActor` you create in `setupActors` should receive
  `onPressed: onTilePressed` and
  `edgeFallthrough: this.supportsEmptyTileActor()` so taps route correctly
  through the base-class selection flow.
- If you need post-action cleanup (e.g. after a button handler runs), set
  `this.suppressNextPointerUp = true` and call `this.deselectActor()`.
- To give an actor a custom selection ring, pass `selection: "ui-selection-2"`
  (or any other `ui-selection*` tileset) in its `TileActorOptions`. Default is
  `ui-selection`. See `ShipLevel.commandModule` for an example.

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
`src-tauri/src/lib.rs`. `generate_map` returns `Result<TileMapData, String>`, so
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
Typically this lives in the bottom-right group alongside Mail/Items.

## 5. Finalize

Run `deno task fmt` per `CLAUDE.md` and fix any type errors before declaring
the task complete.

## Reference: existing scenes

- `src/map-level.ts` — space map with vessels/motherships, overrides
  `createEmptyTileActor` for Move/Deploy actions.
- `src/ship-level.ts` — mothership interior, black background, centered
  `commandModule` TileActor.
