#!/bin/bash

# Base sprite sheet
python3 sprite_transition.py \
    -s ss1/ss1-base.png \
    -d ss1-base.png \
    -n 32 \
    -z 256 \
    -t roll_up:ss1/ss1-base-alt.png:0:31 \
    -t fade:ss1/ss1-accelerating.png:0:5:0:1 \
    -t fade:ss1/ss1-accelerating.png:5:10:1:0 \
    -t fade:ss1/ss1-accelerating.png:8:15:0:1 \
    -t fade:ss1/ss1-accelerating.png:15:23:1:0 \
    -t fade:ss1/ss1-accelerating.png:21:26:0:1 \
    -t fade:ss1/ss1-accelerating.png:26:31:1:0
cp ss1-base.png ../src/assets/

# Damaged sprite sheet
python3 sprite_transition.py \
    -s ss1/ss1-damaged.png \
    -d ss1-damaged.png \
    -n 32 \
    -z 256 \
    -t roll_up:ss1/ss1-damaged-alt.png:0:31 \
    -t fade:ss1/ss1-accelerating.png:0:3:0:1 \
    -t fade:ss1/ss1-accelerating.png:3:7:1:0 \
    -t fade:ss1/ss1-accelerating.png:8:11:0:1 \
    -t fade:ss1/ss1-accelerating.png:11:15:1:0 \
    -t fade:ss1/ss1-accelerating.png:16:19:0:1 \
    -t fade:ss1/ss1-accelerating.png:19:23:1:0 \
    -t fade:ss1/ss1-accelerating.png:24:27:0:1 \
    -t fade:ss1/ss1-accelerating.png:27:31:1:0
cp ss1-damaged.png ../src/assets/
