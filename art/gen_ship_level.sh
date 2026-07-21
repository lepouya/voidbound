#!/bin/bash
set -e
cd "$(dirname "$0")"
# Generate ship interior assets for the ship scene.

# Render vector SVG sources → maps/rendered/ship-*.png (1536x1536 px each)
echo "Rendering ship interior vector sheets to PNG..."
mkdir -p maps/rendered
for sheet in ship-tile-normal ship-tile-cracked ship-tile-objects ship-objects; do
    rsvg-convert -w 1536 -h 1536 "maps/${sheet}.svg" -o "maps/rendered/${sheet}.png"
done

# Merge ship interior tilesheet sources → src/assets/ship-tiles.png
python3 ../tools/sprite_merge.py \
    -S maps/rendered/ship-tile-normal.png:3:3 \
    -S maps/rendered/ship-tile-cracked.png:3:3 \
    -S maps/rendered/ship-tile-objects.png:3:3 \
    -S maps/rendered/ship-objects.png:3:3 \
    -z 64 \
    -d ../src/assets/ship-tiles.png
rm -rf maps/rendered

# Convert Tiled map → src/assets/ship-level.json
# -W 32 -H 32: 32px world tiles with 64px sprite fidelity for zoom detail
python3 ../tools/tmj_to_tilemap.py \
    -s ship-level.tmj \
    -d ../src/assets/ship-level.json \
    -t ship-tiles \
    -W 32 \
    -H 32
