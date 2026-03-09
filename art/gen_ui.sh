#!/bin/bash
set -e
cd "$(dirname "$0")"

# Selection reticle
python3 ../tools/sprite_transition.py \
    -s ui/blank.png \
    -d ../src/assets/ui-selection.png \
    -n 32 \
    -z 256 \
    -t fade:ui/selection-arrows.png:0:7:0:1 \
    -t fade:ui/selection-arrows.png:8:15:1:0 \
    -t fade:ui/selection-arrows.png:16:23:0:1 \
    -t fade:ui/selection-arrows.png:24:31:1:0 \
    -t rotate:ui/selection-outline.png:0:31:0:348 \
    -t scale:ui/selection-reticle.png:0:7:1:1.25 \
    -t scale:ui/selection-reticle.png:8:23:1.25:0.8 \
    -t scale:ui/selection-reticle.png:24:31:0.8:1

python3 ../tools/sprite_transition.py \
    -s ui/blank.png \
    -d ../src/assets/ui-selection-2.png \
    -n 32 \
    -z 256 \
    -t scale:ui/selection-2.png:0:7:1:1.1 \
    -t scale:ui/selection-2.png:8:23:1.1:0.9 \
    -t scale:ui/selection-2.png:24:31:0.9:1

# UI buttons (ui/button-*.png → ui-button-*.png)
# Any new button-*.png added to ui/ is picked up automatically.
for src in ui/button-*.png; do
    name="${src#ui/button-}"   # strip leading "ui/button-"
    name="${name%.png}"        # strip trailing ".png"
    python3 ../tools/sprite_extract.py -s "$src" -c 3 -r 2 -z 64 -d "../src/assets/ui-button-${name}.png"
done
