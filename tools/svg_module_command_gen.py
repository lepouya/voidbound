#!/usr/bin/env python3
"""
SVG Command Module Generator (`svg_module_command_gen.py`)

Reads the standalone vector template `.svg` files from `art/modules/module-command-t{tier}.svg`
(featuring detailed office chairs, command consoles, monitor banks, and central tactical table),
and applies smooth 64-frame animation sweeps across marked `data-anim="..."` elements.

Each frame is rendered via `rsvg-convert` at 384x384 px (6*6 tiles @ 64 px cell size),
then arranged into an 8x8 sheet (3072x3072 px total).

Usage:
    python3 svg_module_command_gen.py --tier 1 --dest ../src/assets/module-command-t1.png
    python3 svg_module_command_gen.py --tier 2 --dest ../src/assets/module-command-t2.png
    python3 svg_module_command_gen.py --tier 3 --dest ../src/assets/module-command-t3.png
"""

import argparse
import math
import os
import re
import tempfile
from PIL import Image

from svg_rasterize import render_svg_string_to_image


def update_attr_for_data_anim(
    svg: str, anim_name: str, attr_name: str, new_value: str
) -> str:
    """Find any XML tag containing data-anim="anim_name" and set/replace attr_name="new_value"."""

    def repl(match):
        tag = match.group(0)
        pattern = f'{attr_name}="[^"]*"'
        if re.search(pattern, tag):
            return re.sub(pattern, f'{attr_name}="{new_value}"', tag)
        else:
            if tag.endswith("/>"):
                return tag[:-2] + f' {attr_name}="{new_value}"/>'
            elif tag.endswith(">"):
                return tag[:-1] + f' {attr_name}="{new_value}">'
            return tag

    return re.sub(r'<[^>]*?data-anim="' + re.escape(anim_name) + r'"[^>]*?>', repl, svg)


def animate_svg_frame(
    base_svg: str, frame_idx: int, total_frames: int, tier: int
) -> str:
    """Take base SVG template string and inject per-frame animation attributes."""
    t = frame_idx / float(total_frames)  # 0.0 to 1.0
    angle_deg = t * 360.0
    angle_rad = t * 2.0 * math.pi

    svg = base_svg

    # Center coordinates of the tactical table vary by tier
    if tier == 1:
        cx, cy = 128, 96
        base_core_r = 10.0
    elif tier == 2:
        cx, cy = 160, 148
        base_core_r = 13.0
    else:
        cx, cy = 192, 192
        base_core_r = 14.0

    # 1. Rotate rings
    svg = update_attr_for_data_anim(
        svg, "rotate-1", "transform", f"rotate({angle_deg:.1f}, {cx}, {cy})"
    )
    svg = update_attr_for_data_anim(
        svg, "rotate-2", "transform", f"rotate({-1.5 * angle_deg:.1f}, {cx}, {cy})"
    )
    svg = update_attr_for_data_anim(
        svg, "rotate-3", "transform", f"rotate({2.2 * angle_deg:.1f}, {cx}, {cy})"
    )

    # 2. Pulse monitor screens
    pulse1 = 0.65 + 0.35 * math.sin(angle_rad * 2.0)
    pulse2 = 0.65 + 0.35 * math.cos(angle_rad * 2.0)
    svg = update_attr_for_data_anim(svg, "pulse-1", "opacity", f"{pulse1:.2f}")
    svg = update_attr_for_data_anim(svg, "pulse-2", "opacity", f"{pulse2:.2f}")

    # 3. Core star radius breathing
    core_r = base_core_r + 2.5 * math.sin(angle_rad)
    svg = update_attr_for_data_anim(svg, "core-scale", "r", f"{core_r:.1f}")

    # 4. Floor power conduits pulsing inward
    offset = int((t * 32) % 32)
    for anim_name in ["dash-v", "dash-l", "dash-r"]:
        svg = update_attr_for_data_anim(
            svg, anim_name, "stroke-dashoffset", f"{-offset}"
        )

    return svg


def main():
    parser = argparse.ArgumentParser(
        description="Generate Command Module vector spritesheets from template SVGs."
    )
    parser.add_argument(
        "--tier",
        type=int,
        choices=[1, 2, 3],
        required=True,
        help="Visual tier (1, 2, or 3)",
    )
    parser.add_argument("--dest", type=str, required=True, help="Output PNG file path")
    parser.add_argument(
        "--source", type=str, default=None, help="Optional custom source SVG path"
    )
    parser.add_argument(
        "--frames",
        type=int,
        default=64,
        help="Number of animation frames (default: 64)",
    )
    parser.add_argument(
        "--cols",
        type=int,
        default=8,
        help="Number of columns in output grid (default: 8)",
    )
    parser.add_argument(
        "--rows", type=int, default=8, help="Number of rows in output grid (default: 8)"
    )
    parser.add_argument(
        "--size",
        type=int,
        default=None,
        help="Tile size in px (defaults by tier: 1:256, 2:320, 3:384)",
    )
    args = parser.parse_args()

    if args.size is None:
        args.size = {1: 256, 2: 320, 3: 384}[args.tier]

    assert args.frames <= args.cols * args.rows, "Frames must fit within cols * rows"

    source_path = args.source
    if not source_path:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        source_path = os.path.join(
            script_dir, f"../art/modules/module-command-t{args.tier}.svg"
        )
    source_path = os.path.abspath(source_path)

    if not os.path.exists(source_path):
        raise FileNotFoundError(f"Template SVG not found: {source_path}")

    with open(source_path, "r", encoding="utf-8") as f:
        base_svg = f.read()

    dest_path = os.path.abspath(args.dest)
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)

    with tempfile.TemporaryDirectory() as work_dir:
        print(
            f"Generating {args.frames} frames for Command Module Tier {args.tier} from {os.path.basename(source_path)} ({args.size}x{args.size} px)..."
        )
        frame_imgs = []
        for i in range(args.frames):
            if (i + 1) % 16 == 0 or i == 0:
                print(f"  Rendering frame {i + 1}/{args.frames}...")
            frame_svg = animate_svg_frame(base_svg, i, args.frames, args.tier)
            img = render_svg_string_to_image(frame_svg, args.size, args.size, work_dir)
            frame_imgs.append(img)

        print(
            f"Assembling {args.cols}x{args.rows} spritesheet ({args.cols * args.size}x{args.rows * args.size} px)..."
        )
        sheet_w = args.cols * args.size
        sheet_h = args.rows * args.size
        sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))

        for i, img in enumerate(frame_imgs):
            col = i % args.cols
            row = i // args.cols
            sheet.paste(img, (col * args.size, row * args.size))

        sheet.save(dest_path, "PNG")
        print(f"Successfully saved {dest_path}!")


if __name__ == "__main__":
    main()
