#!/bin/bash
set -e
cd "$(dirname "$0")"

# Placeholder asteroid sprites (ROADMAP P1.6): grayscale vector blobs rendered
# as single-tile static sheets — the client tints them per resource kind
# (ASTEROID_TINTS in src/map/asteroid-catalog.ts). Map tiles are 32 px world with
# 2x sprite resolution, so span 1/2/3 renders at 64/128/192 px. Replace with
# real per-class art later.
for tier_size in small:64 medium:128 large:192; do
    tier="${tier_size%:*}"
    size="${tier_size#*:}"
    python3 ../tools/svg_ui_gen.py \
        -s "asteroids/asteroid-${tier}.svg" \
        -c 1 -r 1 -z "$size" --states 1 \
        -d "../src/assets/asteroid-${tier}.png"
done
