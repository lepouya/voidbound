#!/bin/bash

# Base sprite sheet
python3 sprite_transition.py \
    -s cs1/cs1-base.png \
    -d cs1-base.png \
    -n 32 \
    -z 64 \
    -t fade:cs1/cs1-base-alt2.png:0:7:0:1 \
    -t fade:cs1/cs1-base-alt2.png:8:15:1:0 \
    -t fade:cs1/cs1-base-alt2.png:16:23:0:1 \
    -t fade:cs1/cs1-base-alt2.png:24:31:1:0
cp cs1-base.* ../src/assets/

# Moving sprite sheet
python3 sprite_transition.py \
    -s cs1/cs1-base.png \
    -d cs1-moving.png \
    -n 32 \
    -z 64 \
    -t fade:cs1/cs1-base-alt.png:0:7:0:1 \
    -t fade:cs1/cs1-base-alt.png:8:15:1:0 \
    -t fade:cs1/cs1-base-alt.png:16:23:0:1 \
    -t fade:cs1/cs1-base-alt.png:24:31:1:0 \
    -t fade:cs1/cs1-accelerating.png:0:15:1:0 \
    -t fade:cs1/cs1-accelerating.png:16:31:0:1 \
    -t fade:cs1/cs1-accelerating-alt.png:8:15:0:1 \
    -t fade:cs1/cs1-accelerating-alt.png:16:23:1:0
cp cs1-moving.* ../src/assets/
