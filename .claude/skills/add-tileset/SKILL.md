---
name: add-tileset
description: Register a new PNG spritesheet as a Voidbound tileset for use via TileRef strings. Use when adding a new sprite, animation, UI button, or module asset to the game.
---

# Adding a new tileset

All visual assets in Voidbound go through `src/resources.ts` as typed
`TilesetDef` entries and are consumed via `TileRef` strings like
`"my-sprite:0"`. Follow these steps to register a new one.

## 1. Get the PNG into `src/assets/`

Drop the PNG file at `src/assets/<name>.png`. Subdirectories are fine — keys are
relative to `src/assets/` without the extension, so
`src/assets/weapons/sword.png` is referenced as `"weapons/sword"`.

If the asset comes from source art in `art/`, use the **`/gen-art`** skill to
run the right pipeline script — art scripts write directly to `src/assets/`.

**Sprite orientation:** All sprites must face **upward (−y)** at rotation 0.
`TileActor.moveTo()` and `setFacing()` assume this convention.

## 2. Choose a tileset kind

- **`static`** — a sheet of distinct sprites. `TileRef "name:N"` selects sprite
  `N` (row-major). Use for UI buttons, tile atlases, or any sheet where each
  cell is independent.
- **`animated`** — a single looping animation using the first `frames` cells of
  the sheet. `TileRef "name:0"` returns the full `ex.Animation`; `"name:N"`
  where `N > 0` returns the individual frame sprite at index N. Use for
  continuously animated entities (ships, modules, selection reticles).

## 3. Auto-registered patterns (no code change needed!)

If the filename matches one of these patterns, you're **done** after step 1 —
`src/resources.ts` discovers it automatically:

| Filename pattern  | Auto-registered as                                  |
| ----------------- | --------------------------------------------------- |
| `ui-button-*.png` | static, 3*2 grid, 64 px cells                       |
| `module-*.png`    | animated, 6*6 grid, 256 px cells, 32 frames @ 66 ms |

So `src/assets/ui-button-trade.png` immediately becomes usable as the `TileRef`
`"ui-button-trade:0"` (etc.) with no edit to `resources.ts`.

## 4. Otherwise, add a row to `TILESET_DEFS`

Open `src/resources.ts` and add one line to the `TILESET_DEFS` array using
`sd(...)` for static or `ad(...)` for animated:

```ts
// static: sd(name, src, cols, rows, tileSize)
sd("my-atlas", png("my-atlas"), 4, 4, 32),

// animated: ad(name, src, cols, rows, tileSize, frames, frameDuration)
ad("my-fx", png("my-fx"), 6, 6, 128, 32, 66),
```

**Important:**

- Always wrap the path with `png("name")` — this is the local helper that
  resolves a Vite-glob asset URL and throws at startup if the PNG is missing.
  **Never import PNGs directly.**
- The `name` field is the key used in every `TileRef` referring to this tileset.
  Pick a stable, lowercase-kebab name.

## 5. Use it

Reference the tileset by `TileRef` strings anywhere a `TileRef` is accepted
(`TileActor.tile`, `ButtonDef.tile`, map cells, badges, …):

```ts
"my-atlas:0"; // sprite 0 from the atlas
"my-atlas:7"; // sprite 7
"my-atlas:0,my-fx:0"; // layered: my-atlas as base, my-fx on top
```

For per-layer effects (tint, opacity, rotation, flip, scale, offset), use the
object form `TileLayerDef` instead of the string form. See `src/ui/tile-ref.ts`.

## 6. Finalize

Run `deno task fmt` per `CLAUDE.md`. If the scene using the new tileset is
running, the Vite dev server will hot-reload — no manual rebuild needed.

## Troubleshooting

- **`PNG not found in assets: "..."`** at startup — the filename in `png(...)`
  doesn't match a file under `src/assets/` (without extension). Check spelling
  and subdirectory.
- **`Tileset not found: "..."`** at runtime — the `TileRef` name doesn't match
  any entry in `TILESET_DEFS`. Make sure step 4 was done, or that the filename
  matches an auto-register pattern from step 3.
- **Sprite appears rotated** — your source art probably doesn't face upward at
  frame 0. Re-author or re-run the art pipeline with a fix.
