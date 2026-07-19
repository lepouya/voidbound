#!/bin/bash
set -e
cd "$(dirname "$0")"

# Asteroid sprites (ROADMAP P1.6): 64-frame animated 8x8 sheets featuring
# 3D anisotropic tumbling, zero-G Lissajous drift, and serene debris fields.
# Grayscale vector base tinted per resource kind at render time (ASTEROID_TINTS
# in src/map/asteroid-catalog.ts). Map tiles are 32 px world with 2x resolution,
# so span 1/2/3 renders at 64/128/192 px tile size (512/1024/1536 px sheet size).
for tier_size in small:64 medium:128 large:192; do
    tier="${tier_size%:*}"
    size="${tier_size#*:}"
    python3 ../tools/svg_asteroid_gen.py \
        -s "asteroids/asteroid-${tier}.svg" \
        -z "$size" \
        -n 64 \
        -c 8 -r 8 \
        -d "../src/assets/asteroid-${tier}.png"
done
