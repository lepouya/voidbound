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

# Clean vector UI frames and icons (ui/frames/*.svg and ui/icons/*.svg)
COLOR1="#FFFFFF"
COLOR2="#00d2ff"

for src in ui/frames/*.svg; do
    [ -e "$src" ] || continue
    name="${src#ui/frames/}"
    name="${name%.svg}"
    python3 ../tools/svg_ui_gen.py -s "$src" -c 3 -r 1 -z 64 -d "../src/assets/ui-frame-${name}.png" --color1 "$COLOR1" --color2 "$COLOR2"
done

for src in ui/icons/*.svg; do
    [ -e "$src" ] || continue
    name="${src#ui/icons/}"
    name="${name%.svg}"
    # Resource icons carry a per-resource accent so they stay tellable at
    # the tiny resource-bar size; everything else uses the shared accent.
    accent="$COLOR2"
    case "$name" in
        construction) accent="#ff9d45" ;;
        biological)   accent="#54e05e" ;;
        fuel)         accent="#ff5470" ;;
        credits)      accent="#ffd75e" ;;
    esac
    python3 ../tools/svg_ui_gen.py -s "$src" -c 3 -r 1 -z 64 -d "../src/assets/ui-icon-${name}.png" --color1 "$COLOR1" --color2 "$accent"
done
