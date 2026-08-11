#!/usr/bin/env python3
"""
SVG UI Generator

Reads an SVG vector file for UI button chrome (frames) or iconography (icons),
replaces placeholder color variables (#COLOR1 and #COLOR2) with user-configurable
hex colors for normal, active, and disabled states, renders them to precise
target pixel dimensions, and outputs compact spritesheets.

Usage:
    python3 svg_ui_gen.py \
        --source art/ui/icons/attack.svg \
        --cols 3 --rows 1 --size 64 \
        --dest src/assets/ui-icon-attack.png \
        --color1 "#FFFFFF" --color2 "#00d2ff"

Arguments:
    -s / --source           Path to a source SVG file
    -c / --cols             Number of columns in output sheet (default: 3 for normal, active, disabled)
    -r / --rows             Number of rows in output sheet (default: 1)
    -z / --size             Side length (px) of each sprite tile (square, default: 64)
    -d / --dest             Output path for the compact spritesheet PNG
    --states                Number of states to render, 1-3 in Normal/Active/
                             Disabled order (default: 3). Use 1 for sheets that
                             only ever show the normal state (e.g. cols=1),
                             so the unused states aren't rendered and discarded.
    --color1                Primary hex color (replaces #COLOR1 in SVG, default: #FFFFFF)
    --color2                Secondary hex color (replaces #COLOR2 in SVG, default: #00d2ff)
    --color1-active         Primary active hex color (optional override)
    --color2-active         Secondary active hex color (optional override)
    --color1-disabled       Primary disabled hex color (optional override)
    --color2-disabled       Secondary disabled hex color (optional override)

Design decisions:
  - #COLOR1 and #COLOR2 placeholders in SVG files allow 100% flexible color customization from CLI.
  - Generates 3 states by default (Normal, Active, Disabled) into a cols*rows grid;
    pass --states to render fewer when the sheet won't use all of them.
  - Auto-computes active (brightened) and disabled (desaturated/darkened) colors if explicit overrides are not provided.
  - SVG rendering uses `rsvg-convert` from librsvg. Install it with
    `brew install librsvg` on macOS or your distribution's librsvg package on
    Linux.
"""

import argparse
import colorsys
import os
import shutil
import sys
import tempfile

from PIL import Image
from svg_rasterize import render_svg_string_to_image as render_svg_to_image


def parse_hex_color(hex_str: str) -> tuple[int, int, int]:
    """Parse a hex color string like '#FFFFFF' or 'FFFFFF' to an RGB tuple."""
    hex_str = hex_str.lstrip("#")
    if len(hex_str) == 3:
        hex_str = "".join([c * 2 for c in hex_str])
    if len(hex_str) != 6:
        raise ValueError(f"Invalid hex color: {hex_str}")
    return (
        int(hex_str[0:2], 16),
        int(hex_str[2:4], 16),
        int(hex_str[4:6], 16),
    )


def rgb_to_hex(rgb: tuple[int, int, int]) -> str:
    """Convert an RGB tuple to a hex string like '#FFFFFF'."""
    return f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}"


def compute_active_color(hex_str: str) -> str:
    """Compute an active/pressed highlight color (brighter / more vibrant)."""
    r, g, b = parse_hex_color(hex_str)
    hue, light, sat = colorsys.rgb_to_hls(r / 255.0, g / 255.0, b / 255.0)
    # Increase lightness by 15%, cap at 1.0
    l_new = min(1.0, light * 1.15 if light > 0.1 else light + 0.15)
    s_new = min(1.0, sat * 1.1)
    r_new, g_new, b_new = colorsys.hls_to_rgb(hue, l_new, s_new)
    return rgb_to_hex((int(r_new * 255), int(g_new * 255), int(b_new * 255)))


def compute_disabled_color(hex_str: str) -> str:
    """Compute a disabled color (desaturated and darkened)."""
    r, g, b = parse_hex_color(hex_str)
    hue, light, sat = colorsys.rgb_to_hls(r / 255.0, g / 255.0, b / 255.0)
    # Desaturate to 20% and reduce lightness to 50%
    l_new = light * 0.55
    s_new = sat * 0.2
    r_new, g_new, b_new = colorsys.hls_to_rgb(hue, l_new, s_new)
    return rgb_to_hex((int(r_new * 255), int(g_new * 255), int(b_new * 255)))


def process_svg_states(
    svg_path: str,
    color1: str,
    color2: str,
    color1_active: str,
    color2_active: str,
    color1_disabled: str,
    color2_disabled: str,
    size: int,
    work_dir: str,
    num_states: int = 3,
) -> list[Image.Image]:
    """
    Read an SVG file and render up to 3 state tiles: Normal, Active, Disabled.
    Replaces #COLOR1 and #COLOR2 in the SVG string with state colors.
    """
    with open(svg_path, "r", encoding="utf-8") as f:
        base_svg = f.read()

    # Case-insensitive replacement of #COLOR1 and #COLOR2
    states = [
        ("Normal", color1, color2),
        ("Active", color1_active, color2_active),
        ("Disabled", color1_disabled, color2_disabled),
    ][:num_states]

    sprites = []
    for state_name, c1, c2 in states:
        svg_content = base_svg
        # Replace color tags
        for tag in ["#COLOR1", "#color1", "COLOR1_HEX"]:
            svg_content = svg_content.replace(tag, c1)
        for tag in ["#COLOR2", "#color2", "COLOR2_HEX"]:
            svg_content = svg_content.replace(tag, c2)

        img = render_svg_to_image(svg_content, size, size, work_dir)
        # For disabled state, optionally reduce alpha slightly if the SVG itself didn't dim enough
        if state_name == "Disabled":
            alpha = img.split()[3]
            alpha = alpha.point(lambda p: int(p * 0.7))
            img.putalpha(alpha)

        sprites.append(img)

    return sprites


def build_compact_sheet(
    sprites: list[Image.Image], cols: int, rows: int, size: int
) -> Image.Image:
    """Arrange sprites into a cols*rows grid where every cell is size*size."""
    sheet = Image.new("RGBA", (cols * size, rows * size), (0, 0, 0, 0))
    for idx, sprite in enumerate(sprites):
        if idx >= cols * rows:
            break
        col = idx % cols
        row = idx // cols
        sheet.paste(sprite, (col * size, row * size), sprite)
    return sheet


def main():
    parser = argparse.ArgumentParser(
        description="Generate UI button spritesheets from SVG files."
    )
    parser.add_argument("-s", "--source", required=True, help="Path to source SVG file")
    parser.add_argument(
        "-c", "--cols", type=int, default=3, help="Grid columns (default: 3)"
    )
    parser.add_argument(
        "-r", "--rows", type=int, default=1, help="Grid rows (default: 1)"
    )
    parser.add_argument(
        "-z", "--size", type=int, default=64, help="Cell size px (default: 64)"
    )
    parser.add_argument(
        "-d", "--dest", required=True, help="Output PNG spritesheet path"
    )
    parser.add_argument(
        "--color1", default="#FFFFFF", help="Primary color hex (default: #FFFFFF)"
    )
    parser.add_argument(
        "--color2", default="#00d2ff", help="Secondary color hex (default: #00d2ff)"
    )
    parser.add_argument("--color1-active", help="Primary active color hex override")
    parser.add_argument("--color2-active", help="Secondary active color hex override")
    parser.add_argument("--color1-disabled", help="Primary disabled color hex override")
    parser.add_argument(
        "--color2-disabled", help="Secondary disabled color hex override"
    )
    parser.add_argument(
        "--states",
        type=int,
        choices=[1, 2, 3],
        default=3,
        help="Number of states to render, Normal/Active/Disabled in that order (default: 3)",
    )

    args = parser.parse_args()

    color1_active = args.color1_active or compute_active_color(args.color1)
    color2_active = args.color2_active or compute_active_color(args.color2)
    color1_disabled = args.color1_disabled or compute_disabled_color(args.color1)
    color2_disabled = args.color2_disabled or compute_disabled_color(args.color2)

    if not os.path.exists(args.source):
        print(f"Error: source SVG not found: {args.source}", file=sys.stderr)
        sys.exit(1)

    # Use a temporary directory inside the workspace/current directory for rendering work
    work_parent = os.path.dirname(os.path.abspath(__file__))
    tmp_dir = tempfile.mkdtemp(prefix=".tmp_svg_gen_", dir=work_parent)

    try:
        sprites = process_svg_states(
            args.source,
            args.color1,
            args.color2,
            color1_active,
            color2_active,
            color1_disabled,
            color2_disabled,
            args.size,
            tmp_dir,
            args.states,
        )

        sheet = build_compact_sheet(sprites, args.cols, args.rows, args.size)
        os.makedirs(os.path.dirname(os.path.abspath(args.dest)), exist_ok=True)
        sheet.save(args.dest)
        print(
            f"Generated UI spritesheet ({args.cols}*{args.rows} grid, {args.size}*{args.size}px tiles): "
            f"{args.source} -> {args.dest}"
        )
    finally:
        if os.path.exists(tmp_dir):
            shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
