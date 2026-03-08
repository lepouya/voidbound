#!/bin/bash

# Ship interior tile spritesheet
# Merges: ship-tile-normal, ship-tile-cracked, ship-tile-objects, ship-objects
# Each source sheet is 3*3 sprites; output cells are 64*64 px.
python3 sprite_merge.py \
    -S maps/ship-tile-normal.png:3:3 \
    -S maps/ship-tile-cracked.png:3:3 \
    -S maps/ship-tile-objects.png:3:3 \
    -S maps/ship-objects.png:3:3 \
    -z 64 \
    -d ship-tiles.png
cp ship-tiles.png ../src/assets/
