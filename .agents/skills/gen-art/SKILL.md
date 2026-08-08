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

Every generator is safe to run from any directory — each script resolves its own
paths internally, so output paths are correct regardless of cwd (see "Adding a
new generator" for the required shape).

```bash
art/gen_ship_level.sh   # ship-tiles.png + ship-level.json (Tiled map)
art/gen_vessels.sh      # vessel-1-<state>-<relation>.png (12 sheets: 3 states * 4 relations)
art/gen_motherships.sh  # mothership-1-<state>-<relation>.png (12 sheets: 3 states * 4 relations)
art/gen_modules.sh      # module-base.png + module-command-t{1,2,3}.png (ship interior modules)
art/gen_ui.sh           # ui-selection*.png, ui-frame-*.png, ui-icon-*.png
art/gen_asteroids.sh    # asteroid-{small,medium,large}.png (vector, animated)
```

If the argument `$ARGUMENTS` is a script short-name (e.g. `cs1`), run
`art/gen_<short>.sh`. Otherwise fall back to listing the available scripts.
`deno task gen-art` (P0.14) discovers and runs **every** `art/gen_*.sh` script
by glob — no registration step, so a new generator (see below) is picked up
automatically. Use it to regenerate the whole asset catalog after a shared-tool
change.

## Python tools (in `tools/`)

All require Pillow. `svg_ui_gen.py` also requires librsvg's `rsvg-convert`
renderer; the deliberately unsupported macOS `sips` fallback must not be used.
On macOS, install both with `brew install pillow librsvg`. The system default is
Homebrew's `python@3.14` (`/opt/homebrew/bin/python3`), so no venv or PATH
workaround is needed. If a script reports a missing Pillow or renderer
dependency, run that command before retrying.

Scripts are called from `art/gen_*.sh` — you usually don't invoke them directly
except when writing a new generator.

| Script                      | Purpose                                                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `sprite_extract.py`         | Extract + uniform-resize sprites from a padded source sheet (standby — no caller yet)                                         |
| `sprite_merge.py`           | Merge sprites from multiple source sheets into one output sheet                                                               |
| `sprite_transition.py`      | Generate animated spritesheets with fade/roll/scale/rotate transitions                                                        |
| `svg_rasterize.py`          | Shared `rsvg-convert` invocation + binary lookup — every `svg_*_gen.py` below imports it; not itself called from a `gen_*.sh` |
| `svg_ui_gen.py`             | Render SVG UI frames/icons to normal/active/disabled spritesheets                                                             |
| `svg_vessel_gen.py`         | Render `vessel-1` SVG source to a 32-frame animated sheet per state/relation                                                  |
| `svg_mothership_gen.py`     | Render `mothership-1` SVG source to a 32-frame animated sheet per state/relation                                              |
| `svg_module_base_gen.py`    | Render the shared `module-base` SVG source to a 32-frame animated sheet                                                       |
| `svg_module_command_gen.py` | Render the Command Module's 3 tier SVGs to 64-frame animated sheets                                                           |
| `svg_asteroid_gen.py`       | Render asteroid tier SVGs to 64-frame animated sheets with tumbling motion                                                    |
| `svg_reticle_gen.py`        | Render selection-reticle SVGs to animated sheets across footprint spans                                                       |
| `tmj_to_tilemap.py`         | Convert a Tiled `.tmj` file → `TileMapData` JSON asset                                                                        |

Every `svg_*_gen.py` script renders through `svg_rasterize.py`'s
`find_rsvg_convert()` +
`render_svg_file_to_image()`/`render_svg_string_to_image()` — a new generator
should import these rather than writing its own copy (CR-T.1 found six
independent, already-drifted copies before this module existed).
`test_svg_rasterize.py` covers the rasterizer's error paths (missing binary,
failed exit code, no output file) once for every consumer.

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

**Rule:** `deno task gen-art` invokes every `art/gen_*.sh` file by blind glob
(`for f in art/gen_*.sh; do "$f"; done`) — there is no per-script registration.
This means every script matching that name **must** be independently executable
and resolve its own paths from its own location, never from the caller's cwd, so
it behaves identically whether run standalone, from `art/`, from the repo root,
or via the glob loop. `cd "$(dirname "$0")"` (below) is the one shape every
generator uses (`gen_motherships.sh`/`gen_vessels.sh` briefly diverged with a
root-relative `SCRIPT_DIR`/`ROOT_DIR` derivation; reconciled — CR-T.3).

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

3. `chmod +x art/gen_<name>.sh` — required: the glob loop invokes the file
   directly (`"$f"`), not via `bash art/gen_<name>.sh`.
4. Run it once (standalone, and via `deno task gen-art` from the repo root) and
   verify the output in `src/assets/`.
5. If the filename doesn't match an auto-register pattern (`ui-frame-*`,
   `ui-icon-*`, `module-*`), run the **`/add-tileset`** skill to register it in
   `src/resources/tileset-geometry.ts`.

## Checklist after regenerating

- [ ] New/updated files are in `src/assets/` (not committed to `art/`).
- [ ] Regeneration rewrites **every** output PNG with byte-level churn (renderer
      nondeterminism) even when visually unchanged — inspect the diff and keep
      only intentional generated-asset changes. Restoring an existing asset is
      destructive, so obtain the user's approval before doing so.
- [ ] If a `tools/*.py` script changed, run
      `deno task format`/`check`/`lint`/`test` (their `:py` halves cover
      `ruff format`/`mypy tools/`/`ruff check`/
      `python3 -m unittest discover -s tools`).
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
