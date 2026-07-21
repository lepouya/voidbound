#!/bin/bash
set -e
cd "$(dirname "$0")"

# Base module room (vector foundation matching Command Module style)
echo "Generating Base Module vector room..."
python3 ../tools/svg_module_base_gen.py --source modules/module-base.svg --dest ../src/assets/module-base.png --frames 32 --cols 6 --rows 6 --size 256

# Command Module tiers
echo "Generating Command Module tiers (1-3)..."
for tier in 1 2 3; do
    python3 ../tools/svg_module_command_gen.py --tier "$tier" --dest "../src/assets/module-command-t${tier}.png"
done

echo "Module art generation complete!"
