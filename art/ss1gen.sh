#!/bin/bash

# Base sprite sheet
python3 sprite_transition.py \
    -s ss1/ss1-base.png \
    -d ss1-base.png \
    -n 32 \
    -t roll_up:ss1/ss1-base-alt.png:0:31 \
    -t fade:ss1/ss1-accelerating.png:0:10 \
    -t fade:ss1/ss1-accelerating.png:8:23 \
    -t fade:ss1/ss1-accelerating.png:21:31

# Damaged sprite sheet
python3 sprite_transition.py \
    -s ss1/ss1-damaged.png \
    -d ss1-damaged.png \
    -n 32 \
    -t roll_up:ss1/ss1-damaged-alt.png:0:31 \
    -t fade:ss1/ss1-accelerating.png:0:7 \
    -t fade:ss1/ss1-accelerating.png:8:15 \
    -t fade:ss1/ss1-accelerating.png:16:23 \
    -t fade:ss1/ss1-accelerating.png:24:31
