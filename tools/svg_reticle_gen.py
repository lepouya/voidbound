#!/usr/bin/env python3
"""
SVG Reticle Generator

Reads a selection reticle SVG file (e.g. selection-arrows.svg, selection-outline.svg,
selection-reticle.svg, selection-2.svg), substitutes #COLOR1 and #COLOR2 with hex
colors, automatically scales stroke-width across target sizes (64px, 128px, 192px, 256px)
so that line thickness in rendered screen pixels is exactly consistent among all 4 sizes,
and renders to a PNG using rsvg-convert.

Usage:
    python3 svg_reticle_gen.py \
        --source art/ui/selection-arrows.svg \
        --size 64 \
        --dest art/ui/rendered/selection-arrows-64.png \
        --color1 "#FFFFFF" --color2 "#00d2ff"
"""

import argparse
import os
import re
import shutil
import sys
import tempfile

from svg_rasterize import render_svg_string_to_image as render_svg_to_image


def adjust_stroke_widths(svg_content: str, size: int) -> str:
    """
    Scale all stroke-width values by (256.0 / size) so that lines maintain an exact,
    consistent thickness in rendered output screen pixels across all 4 sizes
    (64px, 128px, 192px, 256px).
    """
    scale_factor = 256.0 / float(size)
    if abs(scale_factor - 1.0) < 1e-4:
        return svg_content

    def repl(match):
        val = float(match.group(1))
        new_val = val * scale_factor
        return f'stroke-width="{new_val:.2f}"'

    return re.sub(r'stroke-width="([\d.]+)"', repl, svg_content)


def main():
    parser = argparse.ArgumentParser(
        description="Render SVG selection reticle to specific target dimensions."
    )
    parser.add_argument("-s", "--source", required=True, help="Source SVG file path")
    parser.add_argument(
        "-z",
        "--size",
        type=int,
        default=256,
        help="Target cell side length in px (default: 256)",
    )
    parser.add_argument("-d", "--dest", required=True, help="Destination PNG path")
    parser.add_argument(
        "--color1",
        default="#ff3232",
        help="Primary color hex (replaces #COLOR1, default: #ff3232)",
    )
    parser.add_argument(
        "--color2",
        default="#00d2ff",
        help="Secondary color hex (replaces #COLOR2, default: #00d2ff)",
    )
    parser.add_argument(
        "--no-adjust-strokes",
        action="store_true",
        help="Disable automatic stroke-width adjustment",
    )

    args = parser.parse_args()

    if not os.path.exists(args.source):
        print(f"Error: source SVG not found: {args.source}", file=sys.stderr)
        sys.exit(1)

    with open(args.source, "r", encoding="utf-8") as f:
        svg_content = f.read()

    # Substitute colors
    for tag in ["#COLOR1", "#color1", "COLOR1_HEX"]:
        svg_content = svg_content.replace(tag, args.color1)
    for tag in ["#COLOR2", "#color2", "COLOR2_HEX"]:
        svg_content = svg_content.replace(tag, args.color2)

    if not args.no_adjust_strokes:
        svg_content = adjust_stroke_widths(svg_content, args.size)

    work_parent = os.path.dirname(os.path.abspath(__file__))
    tmp_dir = tempfile.mkdtemp(prefix=".tmp_reticle_", dir=work_parent)

    try:
        img = render_svg_to_image(svg_content, args.size, args.size, tmp_dir)
        os.makedirs(os.path.dirname(os.path.abspath(args.dest)), exist_ok=True)
        img.save(args.dest)
        print(
            f"Rendered reticle base ({args.size}x{args.size}px): {args.source} -> {args.dest}"
        )
    finally:
        if os.path.exists(tmp_dir):
            shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
