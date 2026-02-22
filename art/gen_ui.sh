#!/bin/bash

# Selection reticle
python3 sprite_transition.py \
    -s ui/blank.png \
    -d ui-selection.png \
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
cp ui-selection.* ../src/assets/

# UI buttons (ui/button-*.png → ui-button-*.png)
# Any new button-*.png added to ui/ is picked up automatically.
for src in ui/button-*.png; do
    name="${src#ui/button-}"   # strip leading "ui/button-"
    name="${name%.png}"        # strip trailing ".png"
    python3 sprite_extract.py -s "$src" -c 3 -r 2 -z 64 -d "ui-button-${name}.png"
done
cp ui-button-*.png ../src/assets/
