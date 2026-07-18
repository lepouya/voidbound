---
name: gen-art
description: Run the Voidbound art pipeline to (re)generate PNG spritesheets and map JSON assets under src/assets/. Use when source art under art/ changes, when a new asset is authored in Tiled, or when setting up a new asset generation script.
---

# Voidbound art pipeline

All source art lives under `art/`. Processed assets — the ones Vite picks up and
`src/resources/resources.ts` registers — live under `src/assets/`. The bridge is
a set of Python scripts in `tools/` driven by shell scripts in `art/gen_*.sh`.

**Never edit `src/assets/` PNGs or generated JSON by hand.** Re-run the
appropriate generator script instead.

## Running an existing generator

Every generator is safe to run from any directory — each script does `set -e`
and `cd "$(dirname "$0")"` at the top, so output paths resolve correctly
regardless of cwd.

```bash
art/gen_ship_level.sh   # ship-tiles.png + ship-level.json (Tiled map)
art/gen_cs1.sh          # cs1-base.png, cs1-moving.png  (vessel sprites)
art/gen_ss1.sh          # ss1-base.png, ss1-damaged.png (mothership sprites)
art/gen_modules.sh      # module-base.png               (ship interior modules)
art/gen_ui.sh           # ui-selection*.png, ui-frame-*.png, ui-icon-*.png
art/gen_asteroids.sh    # asteroid-{small,medium,large}.png (placeholders)
```

If the argument `$ARGUMENTS` is a script short-name (e.g. `cs1`), run
`art/gen_<short>.sh`. Otherwise fall back to listing the available scripts.

## Python tools (in `tools/`)

All require Pillow. `svg_ui_gen.py` also requires librsvg's `rsvg-convert`
renderer; the deliberately unsupported macOS `sips` fallback must not be used.
On macOS, install both with `brew install pillow librsvg`. The system default is
Homebrew's `python@3.14` (`/opt/homebrew/bin/python3`), so no venv or PATH
workaround is needed. If a script reports a missing Pillow or renderer
dependency, run that command before retrying.

Scripts are called from `art/gen_*.sh` — you usually don't invoke them directly
except when writing a new generator.

| Script                 | Purpose                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------- |
| `sprite_extract.py`    | Extract + uniform-resize sprites from a padded source sheet (standby — no caller yet) |
| `sprite_merge.py`      | Merge sprites from multiple source sheets into one output sheet                       |
| `sprite_transition.py` | Generate animated spritesheets with fade/roll/scale/rotate transitions                |
| `svg_ui_gen.py`        | Render SVG UI frames/icons to normal/active/disabled spritesheets                     |
| `tmj_to_tilemap.py`    | Convert a Tiled `.tmj` file → `TileMapData` JSON asset                                |

### `tmj_to_tilemap.py` flags

```
-s SOURCE       Input .tmj file (required)
-d DEST         Output .json file (required)
-t TILESET      Tileset name used in TileRef output (e.g. "ship-tiles") (required)
-W tile_width   Override tile width in output (default: from TMJ)
-H tile_height  Override tile height in output (default: from TMJ)
```

Only **single-tileset** TMJ maps are supported — the script errors out on
multi-tileset maps. Horizontal, vertical, diagonal, and hexagonal-rotation Tiled
transforms are also rejected with the affected layer/cell and flag:
`TileMapData` stores string `TileRef`s and cannot preserve per-layer transforms.
Remove those transforms in Tiled before regenerating the map.

**`-W`/`-H` trick:** To store 32 px world tiles while the source sprites are 64
px, pass `-W 32 -H 32`. This gives extra zoom fidelity — the sprite renders at
64 px native but logical tile math uses 32 px. See `gen_ship_level.sh`.

## Adding a new generator

1. Author your source art under `art/<subdir>/`.
2. Create `art/gen_<name>.sh`:

   ```bash
   #!/bin/bash
   set -e
   cd "$(dirname "$0")"

   python3 ../tools/<tool>.py \
       -s <source> \
       -d ../src/assets/<output>.png \
       <flags...>
   ```

3. `chmod +x art/gen_<name>.sh`
4. Run it once and verify the output in `src/assets/`.
5. If the filename doesn't match an auto-register pattern (`ui-frame-*`,
   `ui-icon-*`, `module-*`), run the **`/add-tileset`** skill to register it in
   `src/resources/tileset-geometry.ts`.

## Checklist after regenerating

- [ ] New/updated files are in `src/assets/` (not committed to `art/`).
- [ ] Regeneration rewrites **every** output PNG with byte-level churn (renderer
      nondeterminism) even when visually unchanged — after a regen,
      `git checkout --` the semantically untouched PNGs so the diff only shows
      real changes.
- [ ] If a `tools/*.py` script changed, run
      `python3 -m unittest discover -s tools`.
- [ ] If the dev server is running, Vite HMR picks up regenerated **PNGs**
      (force a browser reload if you don't see it). Map JSON like
      `ship-level.json` is embedded in the Rust binary via `include_str!` and
      only refreshes on a cargo rebuild — restart `deno task tauri dev` to see
      map changes.
- [ ] For new tilesets not matching an auto-register pattern, also run
      `/add-tileset`.
- [ ] For Tiled map changes feeding a scene, ensure the Rust `generate_map` arm
      in `src-tauri/src/map.rs` still matches the shape (tile size, key name).
      The `ship` arm is the reference for TMJ-backed maps.
