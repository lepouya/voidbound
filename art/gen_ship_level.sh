#!/bin/bash
set -e
cd "$(dirname "$0")"
# Generate ship interior assets for the ship scene.

# Merge ship interior tilesheet sources → src/assets/ship-tiles.png
python3 ../tools/sprite_merge.py \
    -S maps/ship-tile-normal.png:3:3 \
    -S maps/ship-tile-cracked.png:3:3 \
    -S maps/ship-tile-objects.png:3:3 \
    -S maps/ship-objects.png:3:3 \
    -z 64 \
    -d ../src/assets/ship-tiles.png
# maps/ship-objects-2.png is intentionally unused: parked source art for a
# future object set, not a leftover to delete (review finding CR3.2).

# Convert Tiled map → src/assets/ship-level.json
# -W 32 -H 32: 32px world tiles with 64px sprite fidelity for zoom detail
python3 ../tools/tmj_to_tilemap.py \
    -s ship-level.tmj \
    -d ../src/assets/ship-level.json \
    -t ship-tiles \
    -W 32 \
    -H 32
