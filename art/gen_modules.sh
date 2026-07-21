#!/bin/bash
set -e
cd "$(dirname "$0")"

# Base module room
python3 ../tools/sprite_transition.py \
    -s modules/module-base.png \
    -d ../src/assets/module-base.png \
    -n 32 \
    -z 256 \
    -t fade:modules/module-lights-all.png:0:15:1:0.5 \
    -t fade:modules/module-lights-all.png:16:31:0.5:1

# Command Module tiers
echo "Generating Command Module tiers (1-3)..."
for tier in 1 2 3; do
    python3 ../tools/svg_module_command_gen.py --tier "$tier" --dest "../src/assets/module-command-t${tier}.png"
done

echo "Module art generation complete!"
