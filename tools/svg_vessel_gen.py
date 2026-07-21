#!/usr/bin/env python3
"""
SVG Vessel Generator (`svg_vessel_gen.py`)

Reads a vector vessel base SVG file (`vessel-1.svg`), renders it at 2x resolution
using `rsvg-convert`, and generates a 32-frame looping animated spritesheet in a
6x6 grid (`frameDuration: 66ms` = ~2.1s loop).

Supports three animation states:
  1. `base` (Idle Parked): Gentle zero-G harmonic float (`±1.5px`) along with slow,
     calm navigation beacon strobes; thruster exhaust is off.
  2. `moving` (In-Flight): Active anisotropic/shearing plasma thruster plumes
     emerging from the dual nozzles (`scale_y` oscillating 58..64px) with intense
     engine core illumination and rapid navigation strobes.
  3. `idle` (Periodic 15s Flourish Trick): Triggered automatically by TileActor
     every 15s when parked. The vessel performs a smooth pendular roll/bank (`±8°`)
     from side to side while sweeping an active cockpit scanner beam back and forth.

Supports four faction relation palettes (`self`, `allies`, `neutral`, `enemy`)
by substituting `{ACCENT_COLOR}`, `{HULL_PRIMARY}`, and `{HULL_SECONDARY}` before
rasterization.
"""

import argparse
import math
import os
import shutil
import sys
import tempfile
from PIL import Image

from svg_rasterize import render_svg_string_to_image


RELATION_PALETTES = {
    "self": {
        "ACCENT_COLOR": "#00d2ff",  # Cyan / Blue
        "HULL_PRIMARY": "#223344",  # Dark Space Navy
        "HULL_SECONDARY": "#152230",
    },
    "allies": {
        "ACCENT_COLOR": "#54e05e",  # Green
        "HULL_PRIMARY": "#243828",  # Dark Forest Armor
        "HULL_SECONDARY": "#17261a",
    },
    "neutral": {
        "ACCENT_COLOR": "#e0e0e0",  # Silver / White
        "HULL_PRIMARY": "#2f363f",  # Graphite Gray
        "HULL_SECONDARY": "#1f242b",
    },
    "enemy": {
        "ACCENT_COLOR": "#ff3232",  # Crimson Red
        "HULL_PRIMARY": "#402222",  # Dark Crimson Armor
        "HULL_SECONDARY": "#2a1515",
    },
}


def compute_anisotropic_plume(
    cx: float,
    base_y: float,
    l_outer: float,
    mid_w: float,
    shear_x: float,
    pulse_fast: float,
    pulse: float,
) -> tuple[str, str, str]:
    w_outer = 3.0
    tip_x = cx + shear_x
    outer_d = (
        f"M {cx - w_outer:.2f} {base_y:.2f} "
        f"C {cx - mid_w - 0.5:.2f} {base_y + l_outer * 0.35:.2f}, {tip_x - 0.8:.2f} {base_y + l_outer * 0.85:.2f}, {tip_x:.2f} {base_y + l_outer:.2f} "
        f"C {tip_x + 0.8:.2f} {base_y + l_outer * 0.85:.2f}, {cx + mid_w + 0.5:.2f} {base_y + l_outer * 0.35:.2f}, {cx + w_outer:.2f} {base_y:.2f} Z"
    )
    diamond_y = base_y + l_outer * 0.45 + 0.5 * pulse_fast
    diamond_h = 2.5 + 0.8 * pulse
    diamond_w = 1.8 - 0.4 * pulse
    mid_x = cx + shear_x * 0.45
    mid_d = (
        f"M {mid_x:.2f} {diamond_y - diamond_h:.2f} "
        f"L {mid_x + diamond_w:.2f} {diamond_y:.2f} "
        f"L {mid_x:.2f} {diamond_y + diamond_h:.2f} "
        f"L {mid_x - diamond_w:.2f} {diamond_y:.2f} Z"
    )
    w_inner = 1.5
    l_inner = l_outer * 0.55
    tip_inner_x = cx + shear_x * 0.5
    inner_d = (
        f"M {cx - w_inner:.2f} {base_y:.2f} "
        f"Q {tip_inner_x:.2f} {base_y + l_inner * 0.7:.2f} {tip_inner_x:.2f} {base_y + l_inner:.2f} "
        f"Q {tip_inner_x:.2f} {base_y + l_inner * 0.7:.2f} {cx + w_inner:.2f} {base_y:.2f} Z"
    )
    return outer_d, mid_d, inner_d


def format_frame_svg(
    raw_svg: str, palette: dict[str, str], state: str, t: float
) -> str:
    svg = raw_svg
    for key, val in palette.items():
        svg = svg.replace(f"{{{key}}}", val)

    if state == "base":
        float_y = math.sin(t * 2 * math.pi) * 1.5
        hull_transform = f"translate(0, {float_y:.2f})"
        plume_opacity = 0.0
        plume_mid_opacity = 0.0
        l_outer, l_mid, l_inner = compute_anisotropic_plume(
            26.0, 53.0, 4.0, 2.2, 0.0, 0.0, 0.0
        )
        r_outer, r_mid, r_inner = compute_anisotropic_plume(
            38.0, 53.0, 4.0, 2.2, 0.0, 0.0, 0.0
        )
        core_glow = 0.2 + 0.1 * math.sin(t * 2 * math.pi)
        scanner_opacity = 0.0
        scanner_y = 20.0
        nav_port = 0.3 + 0.7 * max(0.0, math.sin(t * 4 * math.pi))
        nav_port_glow = 0.1 + 0.3 * max(0.0, math.sin(t * 4 * math.pi))
        nav_stbd = 0.3 + 0.7 * max(0.0, math.sin(t * 4 * math.pi + math.pi))
        nav_stbd_glow = 0.1 + 0.3 * max(0.0, math.sin(t * 4 * math.pi + math.pi))

    elif state == "moving":
        surge_y = math.sin(t * 8 * math.pi) * 0.5
        hull_transform = f"translate(0, {surge_y:.2f})"
        plume_opacity = 0.9 + 0.1 * math.sin(t * 8 * math.pi)
        pulse_l = math.sin(t * 8 * math.pi)
        pulse_fast_l = math.sin(t * 16 * math.pi)
        shear_l = 1.2 * math.sin(t * 6 * math.pi)
        l_outer_len = 9.0 + 3.0 * pulse_l + 1.0 * pulse_fast_l
        mid_w_l = 2.2 - 0.7 * pulse_l

        pulse_r = math.sin(t * 8 * math.pi + 0.6)
        pulse_fast_r = math.sin(t * 16 * math.pi + 0.6)
        shear_r = 1.2 * math.sin(t * 6 * math.pi + 0.9)
        r_outer_len = 9.0 + 3.0 * pulse_r + 1.0 * pulse_fast_r
        mid_w_r = 2.2 - 0.7 * pulse_r

        plume_mid_opacity = 0.5 + 0.25 * math.sin(t * 16 * math.pi + 0.3)
        l_outer, l_mid, l_inner = compute_anisotropic_plume(
            26.0, 53.0, l_outer_len, mid_w_l, shear_l, pulse_fast_l, pulse_l
        )
        r_outer, r_mid, r_inner = compute_anisotropic_plume(
            38.0, 53.0, r_outer_len, mid_w_r, shear_r, pulse_fast_r, pulse_r
        )
        core_glow = 0.9 + 0.1 * math.sin(t * 8 * math.pi)
        scanner_opacity = 0.0
        scanner_y = 20.0
        nav_port = 0.6 + 0.4 * math.sin(t * 8 * math.pi)
        nav_port_glow = 0.3 + 0.2 * math.sin(t * 8 * math.pi)
        nav_stbd = 0.6 + 0.4 * math.sin(t * 8 * math.pi + math.pi)
        nav_stbd_glow = 0.3 + 0.2 * math.sin(t * 8 * math.pi + math.pi)

    elif state == "idle":
        # Smooth bank/roll from side to side across the 2.1s loop
        angle = math.sin(t * 2 * math.pi) * 8.0
        hull_transform = f"rotate({angle:.2f}, 32, 32)"
        plume_opacity = 0.15 + 0.1 * math.sin(t * 4 * math.pi)
        plume_mid_opacity = 0.0
        pulse_l = math.sin(t * 4 * math.pi)
        pulse_r = math.sin(t * 4 * math.pi + 0.5)
        shear_l = 0.4 * math.sin(t * 2 * math.pi)
        shear_r = 0.4 * math.sin(t * 2 * math.pi)
        l_outer, l_mid, l_inner = compute_anisotropic_plume(
            26.0, 53.0, 4.0 + 1.0 * pulse_l, 2.2, shear_l, 0.0, pulse_l
        )
        r_outer, r_mid, r_inner = compute_anisotropic_plume(
            38.0, 53.0, 4.0 + 1.0 * pulse_r, 2.2, shear_r, 0.0, pulse_r
        )
        core_glow = 0.4 + 0.3 * math.sin(t * 4 * math.pi)
        scanner_opacity = 0.95
        # Scanner sweeps smoothly from y=16 down to y=34 and back up
        scanner_y = 16.0 + 18.0 * (0.5 - 0.5 * math.cos(t * 2 * math.pi))
        nav_port = 0.4 + 0.6 * max(0.0, math.sin(t * 6 * math.pi))
        nav_port_glow = 0.2 + 0.4 * max(0.0, math.sin(t * 6 * math.pi))
        nav_stbd = 0.4 + 0.6 * max(0.0, math.sin(t * 6 * math.pi + math.pi))
        nav_stbd_glow = 0.2 + 0.4 * max(0.0, math.sin(t * 6 * math.pi + math.pi))

    else:
        raise ValueError(f"Unknown state: {state}")

    svg = svg.replace("{HULL_TRANSFORM}", hull_transform)
    svg = svg.replace("{PLUME_OPACITY}", f"{plume_opacity:.2f}")
    svg = svg.replace("{PLUME_MID_OPACITY}", f"{plume_mid_opacity:.2f}")
    svg = svg.replace("{PLUME_L_OUTER}", l_outer)
    svg = svg.replace("{PLUME_L_MID}", l_mid)
    svg = svg.replace("{PLUME_L_INNER}", l_inner)
    svg = svg.replace("{PLUME_R_OUTER}", r_outer)
    svg = svg.replace("{PLUME_R_MID}", r_mid)
    svg = svg.replace("{PLUME_R_INNER}", r_inner)
    svg = svg.replace("{CORE_GLOW_OPACITY}", f"{core_glow:.2f}")
    svg = svg.replace("{SCANNER_OPACITY}", f"{scanner_opacity:.2f}")
    svg = svg.replace("{SCANNER_Y}", f"{scanner_y:.2f}")
    svg = svg.replace("{NAV_PORT_OPACITY}", f"{nav_port:.2f}")
    svg = svg.replace("{NAV_PORT_GLOW}", f"{nav_port_glow:.2f}")
    svg = svg.replace("{NAV_STBD_OPACITY}", f"{nav_stbd:.2f}")
    svg = svg.replace("{NAV_STBD_GLOW}", f"{nav_stbd_glow:.2f}")

    return svg


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate animated vector vessel spritesheet."
    )
    parser.add_argument(
        "-s", "--source", required=True, help="Path to source vessel SVG file."
    )
    parser.add_argument(
        "-z", "--size", type=int, required=True, help="Tile size in pixels (e.g. 64)."
    )
    parser.add_argument(
        "-n",
        "--frames",
        type=int,
        default=32,
        help="Number of animation frames (default: 32).",
    )
    parser.add_argument(
        "-c", "--cols", type=int, default=6, help="Grid columns (default: 6)."
    )
    parser.add_argument(
        "-r", "--rows", type=int, default=6, help="Grid rows (default: 6)."
    )
    parser.add_argument(
        "--state",
        choices=["base", "moving", "idle"],
        required=True,
        help="Animation state.",
    )
    parser.add_argument(
        "--relation",
        choices=["self", "allies", "neutral", "enemy"],
        required=True,
        help="Faction color relation.",
    )
    parser.add_argument(
        "-d", "--dest", required=True, help="Path to destination PNG spritesheet."
    )
    args = parser.parse_args()

    if not os.path.isfile(args.source):
        print(f"Error: Source SVG '{args.source}' does not exist.", file=sys.stderr)
        return 1

    if args.frames > args.cols * args.rows:
        print(
            f"Error: frames ({args.frames}) exceeds grid capacity ({args.cols * args.rows}).",
            file=sys.stderr,
        )
        return 1

    with open(args.source, "r", encoding="utf-8") as f:
        raw_svg = f.read()

    palette = RELATION_PALETTES[args.relation]
    super_scale = 2
    super_size = args.size * super_scale

    sheet_width = args.cols * args.size
    sheet_height = args.rows * args.size
    sheet = Image.new("RGBA", (sheet_width, sheet_height), (0, 0, 0, 0))

    work_dir = tempfile.mkdtemp(prefix="vessel_gen_")
    try:
        print(
            f"Rendering vessel '{args.source}' [{args.state} | {args.relation}] -> {args.dest} ({args.frames} frames @ {args.size}x{args.size}px)..."
        )
        for i in range(args.frames):
            t = i / float(args.frames)
            frame_svg = format_frame_svg(raw_svg, palette, args.state, t)
            super_img = render_svg_string_to_image(
                frame_svg, super_size, super_size, work_dir
            )
            downsampled = super_img.resize(
                (args.size, args.size), Image.Resampling.LANCZOS
            )
            col = i % args.cols
            row = i // args.cols
            sheet.alpha_composite(downsampled, (col * args.size, row * args.size))
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)

    os.makedirs(os.path.dirname(os.path.abspath(args.dest)), exist_ok=True)
    sheet.save(args.dest, "PNG")
    print(f"Saved -> {args.dest}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
