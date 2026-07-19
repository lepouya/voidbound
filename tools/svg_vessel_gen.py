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
import subprocess
import sys
import tempfile
import uuid
from PIL import Image


RELATION_PALETTES = {
    "self": {
        "ACCENT_COLOR": "#00d2ff",      # Cyan / Blue
        "HULL_PRIMARY": "#223344",      # Dark Space Navy
        "HULL_SECONDARY": "#152230",
    },
    "allies": {
        "ACCENT_COLOR": "#54e05e",      # Green
        "HULL_PRIMARY": "#243828",      # Dark Forest Armor
        "HULL_SECONDARY": "#17261a",
    },
    "neutral": {
        "ACCENT_COLOR": "#e0e0e0",      # Silver / White
        "HULL_PRIMARY": "#2f363f",      # Graphite Gray
        "HULL_SECONDARY": "#1f242b",
    },
    "enemy": {
        "ACCENT_COLOR": "#ff3232",      # Crimson Red
        "HULL_PRIMARY": "#402222",      # Dark Crimson Armor
        "HULL_SECONDARY": "#2a1515",
    },
}


def find_rsvg_convert() -> str | None:
    path = shutil.which("rsvg-convert")
    if path:
        return path
    for check_dir in ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin"]:
        candidate = os.path.join(check_dir, "rsvg-convert")
        if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
            return candidate
    return None


def render_svg_string_to_image(svg_content: str, width: int, height: int, work_dir: str) -> Image.Image:
    rsvg = find_rsvg_convert()
    if not rsvg:
        raise RuntimeError("Error: 'rsvg-convert' not found. Please install librsvg (`brew install librsvg`).")

    temp_svg = os.path.join(work_dir, f"vessel_{uuid.uuid4().hex}.svg")
    temp_png = os.path.join(work_dir, f"vessel_{uuid.uuid4().hex}.png")

    with open(temp_svg, "w", encoding="utf-8") as f:
        f.write(svg_content)

    cmd = [rsvg, "-w", str(width), "-h", str(height), temp_svg, "-o", temp_png]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"rsvg-convert failed: {res.stderr}")

    img = Image.open(temp_png).convert("RGBA")
    try:
        os.remove(temp_svg)
        os.remove(temp_png)
    except OSError:
        pass
    return img


def format_frame_svg(raw_svg: str, palette: dict[str, str], state: str, t: float) -> str:
    svg = raw_svg
    for key, val in palette.items():
        svg = svg.replace(f"{{{key}}}", val)

    if state == "base":
        float_y = math.sin(t * 2 * math.pi) * 1.5
        hull_transform = f"translate(0, {float_y:.2f})"
        plume_opacity = 0.0
        plume_tip_y = 53.0
        plume_inner_tip_y = 53.0
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
        plume_tip_y = 61.0 + 3.0 * math.sin(t * 8 * math.pi)
        plume_inner_tip_y = 58.0 + 2.0 * math.sin(t * 8 * math.pi + 0.5)
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
        plume_tip_y = 55.0
        plume_inner_tip_y = 54.0
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
    svg = svg.replace("{PLUME_TIP_Y}", f"{plume_tip_y:.2f}")
    svg = svg.replace("{PLUME_INNER_TIP_Y}", f"{plume_inner_tip_y:.2f}")
    svg = svg.replace("{CORE_GLOW_OPACITY}", f"{core_glow:.2f}")
    svg = svg.replace("{SCANNER_OPACITY}", f"{scanner_opacity:.2f}")
    svg = svg.replace("{SCANNER_Y}", f"{scanner_y:.2f}")
    svg = svg.replace("{NAV_PORT_OPACITY}", f"{nav_port:.2f}")
    svg = svg.replace("{NAV_PORT_GLOW}", f"{nav_port_glow:.2f}")
    svg = svg.replace("{NAV_STBD_OPACITY}", f"{nav_stbd:.2f}")
    svg = svg.replace("{NAV_STBD_GLOW}", f"{nav_stbd_glow:.2f}")

    return svg


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate animated vector vessel spritesheet.")
    parser.add_argument("-s", "--source", required=True, help="Path to source vessel SVG file.")
    parser.add_argument("-z", "--size", type=int, required=True, help="Tile size in pixels (e.g. 64).")
    parser.add_argument("-n", "--frames", type=int, default=32, help="Number of animation frames (default: 32).")
    parser.add_argument("-c", "--cols", type=int, default=6, help="Grid columns (default: 6).")
    parser.add_argument("-r", "--rows", type=int, default=6, help="Grid rows (default: 6).")
    parser.add_argument("--state", choices=["base", "moving", "idle"], required=True, help="Animation state.")
    parser.add_argument("--relation", choices=["self", "allies", "neutral", "enemy"], required=True, help="Faction color relation.")
    parser.add_argument("-d", "--dest", required=True, help="Path to destination PNG spritesheet.")
    args = parser.parse_args()

    if not os.path.isfile(args.source):
        print(f"Error: Source SVG '{args.source}' does not exist.", file=sys.stderr)
        return 1

    if args.frames > args.cols * args.rows:
        print(f"Error: frames ({args.frames}) exceeds grid capacity ({args.cols * args.rows}).", file=sys.stderr)
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
        print(f"Rendering vessel '{args.source}' [{args.state} | {args.relation}] -> {args.dest} ({args.frames} frames @ {args.size}x{args.size}px)...")
        for i in range(args.frames):
            t = i / float(args.frames)
            frame_svg = format_frame_svg(raw_svg, palette, args.state, t)
            super_img = render_svg_string_to_image(frame_svg, super_size, super_size, work_dir)
            downsampled = super_img.resize((args.size, args.size), Image.Resampling.LANCZOS)
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
