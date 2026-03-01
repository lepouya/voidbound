#!/bin/bash

# Base module room
python3 sprite_transition.py \
    -s modules/module-base.png \
    -d module-base.png \
    -n 32 \
    -z 256 \
    -t fade:modules/module-lights-all.png:0:15:1:0.5 \
    -t fade:modules/module-lights-all.png:16:31:0.5:1
cp module-base.png ../src/assets/
