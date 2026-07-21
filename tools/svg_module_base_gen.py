#!/usr/bin/env python3
"""
SVG Base Module Generator (`svg_module_base_gen.py`)

Reads the standalone vector template `.svg` file (`art/modules/module-base.svg`),
and applies smooth animation sweeps across marked `data-anim="..."` elements.

Each frame is rendered via `rsvg-convert` at 256x256 px (4*4 tiles @ 64 px cell size by default),
then arranged into a 6x6 sheet (1536x1536 px total for 32 frames).

Usage:
    python3 svg_module_base_gen.py --source ../art/modules/module-base.svg --dest ../src/assets/module-base.png --frames 32 --cols 6 --rows 6 --size 256
"""

import argparse
import math
import os
import re
import sys
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


def animate_svg_frame(base_svg: str, frame_idx: int, total_frames: int) -> str:
    """Take base SVG template string and inject per-frame animation attributes."""
    t = frame_idx / float(total_frames)  # 0.0 to 1.0
    angle_deg = t * 360.0
    angle_rad = t * 2.0 * math.pi

    svg = base_svg
    cx, cy = 128, 128

    # 1. Rotate magnetic confinement ring
    svg = update_attr_for_data_anim(
        svg, "rotate-ring", "transform", f"rotate({angle_deg:.1f}, {cx}, {cy})"
    )

    # 2. Pulse status LEDs and door indicator
    pulse1 = 0.65 + 0.35 * math.sin(angle_rad * 2.0)
    pulse2 = 0.65 + 0.35 * math.cos(angle_rad * 2.0)
    pulse_door = 0.55 + 0.45 * math.sin(angle_rad)
    svg = update_attr_for_data_anim(svg, "pulse-1", "opacity", f"{pulse1:.2f}")
    svg = update_attr_for_data_anim(svg, "pulse-2", "opacity", f"{pulse2:.2f}")
    svg = update_attr_for_data_anim(svg, "pulse-door", "opacity", f"{pulse_door:.2f}")

    # 3. Core pulse radius breathing
    core_r = 7.0 + 1.5 * math.sin(angle_rad)
    svg = update_attr_for_data_anim(svg, "core-pulse", "r", f"{core_r:.1f}")

    # 4. Floor power conduits pulsing outward from hub
    offset = int((t * 24) % 24)
    svg = update_attr_for_data_anim(
        svg, "dash-conduit", "stroke-dashoffset", f"{-offset}"
    )

    return svg


def main():
    parser = argparse.ArgumentParser(
        description="Generate Base Module vector spritesheet from template SVG."
    )
    parser.add_argument("--source", type=str, required=True, help="Source SVG path")
    parser.add_argument("--dest", type=str, required=True, help="Output PNG file path")
    parser.add_argument(
        "--frames",
        type=int,
        default=32,
        help="Number of animation frames (default: 32)",
    )
    parser.add_argument(
        "--cols",
        type=int,
        default=6,
        help="Number of columns in output grid (default: 6)",
    )
    parser.add_argument(
        "--rows", type=int, default=6, help="Number of rows in output grid (default: 6)"
    )
    parser.add_argument(
        "--size",
        type=int,
        default=256,
        help="Tile size in px (default: 256 for 4*4 tiles @ 64px)",
    )
    args = parser.parse_args()

    if not os.path.exists(args.source):
        print(f"Error: Source SVG file '{args.source}' not found.")
        sys.exit(1)

    with open(args.source, "r", encoding="utf-8") as f:
        base_svg = f.read()

    frames = args.frames
    cols = args.cols
    rows = args.rows
    tile_size = args.size

    sheet_width = cols * tile_size
    sheet_height = rows * tile_size

    sheet = Image.new("RGBA", (sheet_width, sheet_height), (0, 0, 0, 0))

    with tempfile.TemporaryDirectory() as work_dir:
        for idx in range(frames):
            frame_svg = animate_svg_frame(base_svg, idx, frames)
            frame_img = render_svg_string_to_image(
                frame_svg, tile_size, tile_size, work_dir
            )

            col = idx % cols
            row = idx // cols
            x = col * tile_size
            y = row * tile_size
            sheet.paste(frame_img, (x, y))

    os.makedirs(os.path.dirname(os.path.abspath(args.dest)), exist_ok=True)
    sheet.save(args.dest, "PNG")
    print(
        f"Successfully generated base module vector spritesheet at: {args.dest} ({sheet_width}x{sheet_height}, {frames} frames)"
    )


if __name__ == "__main__":
    main()
