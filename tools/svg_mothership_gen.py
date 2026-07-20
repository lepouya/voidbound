#!/usr/bin/env python3
"""
SVG Mothership Generator (`svg_mothership_gen.py`)

Reads a vector mothership base SVG file (`mothership-1.svg`), renders it at 6x resolution
(`256px` per frame tile -> `1536x1536` total PNG for `6x6` grid) using `rsvg-convert`,
and generates a 32-frame looping animated spritesheet (`frameDuration: 66ms` = ~2.1s loop).

Design Decisions Documented:
  1. **Sleek Chiseled Capital Ship Architecture (`mothership-1`)**:
     Designed as a directional, high-end sci-fi capital ship (`facing -y at rotation 0`) with a razor
     command bridge delta wedge, chiseled faceted armor plating, recessed lateral hangar launch decks
     where vessels deploy, and heavy twin aft engine nacelles housing multi-engine anisotropic Mach Diamond
     plasma exhaust banks.
     Renamed from legacy `ss1` (`spaceship-1`). Number `1` designates the starting base mothership tier.
  2. **Multi-Engine Anisotropic / Mach Diamond Plumes**:
     Adapts and elevates the complex plume geometry from `vessel-1` to capital ship scale (`256x256`).
     Computes 4 main heavy anisotropic exhaust cones (with expanding outer boundaries, expanding/contracting
     Mach Diamond shockwave rings, and bright high-velocity inner cores) plus 2 auxiliary maneuvering thrusters.
     Dynamically animates plume length, width, shear, and Mach Diamond frequencies across all states.
  3. **Animation States (`base`, `idle`, `damaged`)**:
     Because the ship has a distinct bow (-y) and stern (+y), **the hull does NOT spin 360 degrees**
     (which would break directional orientation and loop continuity).
     - `base` (Intact Parked): Gentle zero-G harmonic float (`±1.2px`), pulsing multi-engine Mach Diamond
       exhaust banks (`l_outer` oscillating `18..24px`), strobing navigation beacons (`opacity = 0.4 + 0.6 * sin(t*4*pi)`),
       glowing dorsal reactor conduits (`opacity = 0.6 + 0.25 * cos(t*2*pi)`), and a smooth oscillating forward
       dual radar array (`rotate(sin(t*2*pi)*24, 128, 66)`).
     - `idle` (Sector Scanning Flourish): Triggered automatically by TileActor every 7 cycles (`14,784 ms`).
       The forward sensor bridge projects wide-angle sweeping radar arcs (`±55°` sweep across `t=0..1`) while
       conduits and beacons pulse intensely.
     - `damaged` (Battle Damaged): Shuddering zero-G float with sputtering/labored thruster plumes, jagged
       structural hull breaches (`DAMAGE_OPACITY = 1.0`), sparking ribs, and rapid emergency red hazard strobes (`#ff3232`).
  4. **100% Seamless Loop Boundaries**:
     Every single animated property across all states (`base`, `idle`, `damaged`) oscillates using integer
     multiples of `2 * pi` over `t in [0, 1)`. At frame 31 (`t = 31/32`), every value smoothly approaches exactly
     what frame 0 (`t = 0`) expects, guaranteeing zero jerkiness or frame mismatch.
  5. **Cycle Synchronization**:
     To ensure state swaps never snap mid-animation, the idle trigger timer in TileActor (`onPostUpdate`)
     is synchronized to exact multiples of the 32-frame animation loop duration (`32 * 66 ms = 2112 ms`).
     A timer of 7 cycles (`14,784 ms`) guarantees clean transitions on exact frame boundaries.
  6. **Faction Palettes (`self`, `allies`, `neutral`, `enemy`)**:
     Substitutes `{ACCENT_COLOR}`, `{HULL_PRIMARY}`, and `{HULL_SECONDARY}` before rasterization so
     every faction has unique capital ship identification tones.
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

    temp_svg = os.path.join(work_dir, f"mothership_{uuid.uuid4().hex}.svg")
    temp_png = os.path.join(work_dir, f"mothership_{uuid.uuid4().hex}.png")

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


def compute_anisotropic_plume(
    cx: float,
    base_y: float,
    l_outer: float,
    mid_w: float,
    shear_x: float,
    pulse_fast: float,
    pulse: float,
    is_aux: bool = False,
) -> tuple[str, str, str]:
    """Computes multi-layered anisotropic / Mach Diamond thruster exhaust geometry."""
    w_outer = 5.0 if not is_aux else 3.2
    tip_x = cx + shear_x
    outer_d = (
        f"M {cx - w_outer:.2f} {base_y:.2f} "
        f"C {cx - mid_w - 0.8:.2f} {base_y + l_outer * 0.35:.2f}, {tip_x - 1.2:.2f} {base_y + l_outer * 0.85:.2f}, {tip_x:.2f} {base_y + l_outer:.2f} "
        f"C {tip_x + 1.2:.2f} {base_y + l_outer * 0.85:.2f}, {cx + mid_w + 0.8:.2f} {base_y + l_outer * 0.35:.2f}, {cx + w_outer:.2f} {base_y:.2f} Z"
    )
    
    if is_aux:
        # Auxiliary thrusters return simple outer and inner cones
        w_inner = 1.8
        l_inner = l_outer * 0.65
        inner_d = (
            f"M {cx - w_inner:.2f} {base_y:.2f} "
            f"Q {tip_x:.2f} {base_y + l_inner * 0.7:.2f} {tip_x:.2f} {base_y + l_inner:.2f} "
            f"Q {tip_x:.2f} {base_y + l_inner * 0.7:.2f} {cx + w_inner:.2f} {base_y:.2f} Z"
        )
        return outer_d, "", inner_d

    # Main capital ship thrusters include central Mach Diamond shockwave rings
    diamond_y = base_y + l_outer * 0.45 + 1.0 * pulse_fast
    diamond_h = 4.0 + 1.2 * pulse
    diamond_w = 3.2 - 0.6 * pulse
    mid_x = cx + shear_x * 0.45
    mid_d = (
        f"M {mid_x:.2f} {diamond_y - diamond_h:.2f} "
        f"L {mid_x + diamond_w:.2f} {diamond_y:.2f} "
        f"L {mid_x:.2f} {diamond_y + diamond_h:.2f} "
        f"L {mid_x - diamond_w:.2f} {diamond_y:.2f} Z"
    )

    w_inner = 2.4
    l_inner = l_outer * 0.58
    tip_inner_x = cx + shear_x * 0.5
    inner_d = (
        f"M {cx - w_inner:.2f} {base_y:.2f} "
        f"Q {tip_inner_x:.2f} {base_y + l_inner * 0.7:.2f} {tip_inner_x:.2f} {base_y + l_inner:.2f} "
        f"Q {tip_inner_x:.2f} {base_y + l_inner * 0.7:.2f} {cx + w_inner:.2f} {base_y:.2f} Z"
    )
    return outer_d, mid_d, inner_d


def format_frame_svg(raw_svg: str, palette: dict[str, str], state: str, t: float) -> str:
    svg = raw_svg
    for key, val in palette.items():
        svg = svg.replace(f"{{{key}}}", val)

    # All oscillations use exact multiples of 2*pi across t=0..1 for 100% seamless looping
    if state == "base":
        float_x = math.sin(t * 2 * math.pi) * 0.8
        float_y = math.cos(t * 2 * math.pi) * 1.2
        ship_transform = f"translate({float_x:.2f}, {float_y:.2f})"
        
        thruster_opacity = 0.8 + 0.2 * math.sin(t * 2 * math.pi)
        plume_mid_opacity = 0.6 + 0.3 * math.sin(t * 4 * math.pi)
        core_glow_opacity = 0.85 + 0.15 * math.sin(t * 4 * math.pi)
        conduit_opacity = 0.65 + 0.25 * math.cos(t * 2 * math.pi)
        beacon_opacity = 0.5 + 0.5 * max(0.0, math.sin(t * 4 * math.pi))
        beacon_glow = 0.3 + 0.5 * max(0.0, math.sin(t * 4 * math.pi))
        
        pulse_l = math.sin(t * 4 * math.pi)
        pulse_fast_l = math.sin(t * 8 * math.pi)
        shear_l = 0.8 * math.sin(t * 2 * math.pi)
        
        pulse_r = math.sin(t * 4 * math.pi + 0.5)
        pulse_fast_r = math.sin(t * 8 * math.pi + 0.5)
        shear_r = 0.8 * math.sin(t * 2 * math.pi)
        
        # 4 Main Capital Ship Exhaust Nozzles (Port Outer cx=70, Port Inner cx=88, Stbd Inner cx=168, Stbd Outer cx=186)
        p1_o, p1_m, p1_i = compute_anisotropic_plume(70.0, 222.0, 18.0 + 4.0 * pulse_l, 4.2, shear_l, pulse_fast_l, pulse_l)
        p2_o, p2_m, p2_i = compute_anisotropic_plume(88.0, 222.0, 20.0 + 4.0 * pulse_l, 4.5, shear_l, pulse_fast_l, pulse_l)
        s1_o, s1_m, s1_i = compute_anisotropic_plume(168.0, 222.0, 20.0 + 4.0 * pulse_r, 4.5, shear_r, pulse_fast_r, pulse_r)
        s2_o, s2_m, s2_i = compute_anisotropic_plume(186.0, 222.0, 18.0 + 4.0 * pulse_r, 4.2, shear_r, pulse_fast_r, pulse_r)
        
        # 2 Auxiliary Maneuvering Thrusters (cx=114 & cx=142)
        a1_o, _, a1_i = compute_anisotropic_plume(114.0, 216.0, 14.0 + 2.0 * pulse_l, 2.5, shear_l * 0.5, 0.0, pulse_l, is_aux=True)
        a2_o, _, a2_i = compute_anisotropic_plume(142.0, 216.0, 14.0 + 2.0 * pulse_r, 2.5, shear_r * 0.5, 0.0, pulse_r, is_aux=True)
        
        radar_angle = math.sin(t * 2 * math.pi) * 24.0
        radar_transform = f"rotate({radar_angle:.2f}, 128, 66)"
        
        scanner_opacity = 0.0
        scanner_transform = "rotate(0, 128, 62)"
        damage_opacity = 0.0
        hazard_strobe = 0.0

    elif state == "idle":
        float_x = math.sin(t * 2 * math.pi) * 0.8
        float_y = math.cos(t * 2 * math.pi) * 1.2
        ship_transform = f"translate({float_x:.2f}, {float_y:.2f})"
        
        thruster_opacity = 0.9 + 0.1 * math.sin(t * 4 * math.pi)
        plume_mid_opacity = 0.75 + 0.25 * math.sin(t * 8 * math.pi)
        core_glow_opacity = 0.95 + 0.05 * math.sin(t * 8 * math.pi)
        conduit_opacity = 0.85 + 0.15 * math.sin(t * 8 * math.pi)
        beacon_opacity = 0.9 + 0.1 * math.sin(t * 8 * math.pi)
        beacon_glow = 0.6 + 0.4 * math.sin(t * 8 * math.pi)
        
        pulse_l = math.sin(t * 6 * math.pi)
        pulse_fast_l = math.sin(t * 12 * math.pi)
        shear_l = 1.0 * math.sin(t * 4 * math.pi)
        
        pulse_r = math.sin(t * 6 * math.pi + 0.5)
        pulse_fast_r = math.sin(t * 12 * math.pi + 0.5)
        shear_r = 1.0 * math.sin(t * 4 * math.pi)
        
        p1_o, p1_m, p1_i = compute_anisotropic_plume(70.0, 222.0, 22.0 + 6.0 * pulse_l, 4.6, shear_l, pulse_fast_l, pulse_l)
        p2_o, p2_m, p2_i = compute_anisotropic_plume(88.0, 222.0, 24.0 + 6.0 * pulse_l, 4.8, shear_l, pulse_fast_l, pulse_l)
        s1_o, s1_m, s1_i = compute_anisotropic_plume(168.0, 222.0, 24.0 + 6.0 * pulse_r, 4.8, shear_r, pulse_fast_r, pulse_r)
        s2_o, s2_m, s2_i = compute_anisotropic_plume(186.0, 222.0, 22.0 + 6.0 * pulse_r, 4.6, shear_r, pulse_fast_r, pulse_r)
        
        a1_o, _, a1_i = compute_anisotropic_plume(114.0, 216.0, 16.0 + 3.0 * pulse_l, 2.8, shear_l * 0.5, 0.0, pulse_l, is_aux=True)
        a2_o, _, a2_i = compute_anisotropic_plume(142.0, 216.0, 16.0 + 3.0 * pulse_r, 2.8, shear_r * 0.5, 0.0, pulse_r, is_aux=True)
        
        radar_angle = math.sin(t * 2 * math.pi) * 45.0
        radar_transform = f"rotate({radar_angle:.2f}, 128, 66)"
        
        scanner_opacity = 0.95
        # Forward sector scanner sweep oscillates smoothly over t=0..1
        scan_angle = math.sin(t * 2 * math.pi) * 55.0
        scanner_transform = f"rotate({scan_angle:.2f}, 128, 62)"
        damage_opacity = 0.0
        hazard_strobe = 0.0

    elif state == "damaged":
        # Shuddering zero-G float in damaged state (16 and 12 cycles complete smoothly at t=1)
        shudder_x = math.sin(t * 16 * math.pi) * 1.2
        shudder_y = math.cos(t * 12 * math.pi) * 1.4
        ship_transform = f"translate({shudder_x:.2f}, {shudder_y:.2f})"
        
        thruster_opacity = 0.3 + 0.3 * math.sin(t * 12 * math.pi)
        plume_mid_opacity = 0.2 + 0.2 * math.sin(t * 16 * math.pi)
        core_glow_opacity = 0.4 + 0.3 * math.sin(t * 12 * math.pi)
        conduit_opacity = 0.25 + 0.15 * math.sin(t * 16 * math.pi)
        beacon_opacity = 0.15
        beacon_glow = 0.05
        
        pulse_l = math.sin(t * 8 * math.pi)
        pulse_r = math.sin(t * 8 * math.pi + 1.0)
        
        p1_o, p1_m, p1_i = compute_anisotropic_plume(70.0, 222.0, 12.0 + 6.0 * pulse_l, 3.8, 0.0, 0.0, pulse_l)
        p2_o, p2_m, p2_i = compute_anisotropic_plume(88.0, 222.0, 14.0 + 6.0 * pulse_l, 4.0, 0.0, 0.0, pulse_l)
        s1_o, s1_m, s1_i = compute_anisotropic_plume(168.0, 222.0, 14.0 + 6.0 * pulse_r, 4.0, 0.0, 0.0, pulse_r)
        s2_o, s2_m, s2_i = compute_anisotropic_plume(186.0, 222.0, 12.0 + 6.0 * pulse_r, 3.8, 0.0, 0.0, pulse_r)
        
        a1_o, _, a1_i = compute_anisotropic_plume(114.0, 216.0, 8.0 + 3.0 * pulse_l, 2.0, 0.0, 0.0, pulse_l, is_aux=True)
        a2_o, _, a2_i = compute_anisotropic_plume(142.0, 216.0, 8.0 + 3.0 * pulse_r, 2.0, 0.0, 0.0, pulse_r, is_aux=True)
        
        radar_angle = math.sin(t * 4 * math.pi) * 8.0
        radar_transform = f"rotate({radar_angle:.2f}, 128, 66)"
        
        scanner_opacity = 0.0
        scanner_transform = "rotate(0, 128, 62)"
        damage_opacity = 1.0
        # Rapid emergency hazard strobes (8 cycles complete smoothly over t=0..1)
        hazard_strobe = 0.6 + 0.4 * max(0.0, math.sin(t * 8 * math.pi))

    else:
        raise ValueError(f"Unknown state: {state}")

    svg = svg.replace("{SHIP_TRANSFORM}", ship_transform)
    svg = svg.replace("{THRUSTER_OPACITY}", f"{thruster_opacity:.2f}")
    svg = svg.replace("{PLUME_MID_OPACITY}", f"{plume_mid_opacity:.2f}")
    svg = svg.replace("{CORE_GLOW_OPACITY}", f"{core_glow_opacity:.2f}")
    svg = svg.replace("{CONDUIT_OPACITY}", f"{conduit_opacity:.2f}")
    svg = svg.replace("{BEACON_OPACITY}", f"{beacon_opacity:.2f}")
    svg = svg.replace("{BEACON_GLOW}", f"{beacon_glow:.2f}")
    
    svg = svg.replace("{PLUME_P1_OUTER}", p1_o)
    svg = svg.replace("{PLUME_P1_MID}", p1_m)
    svg = svg.replace("{PLUME_P1_INNER}", p1_i)
    svg = svg.replace("{PLUME_P2_OUTER}", p2_o)
    svg = svg.replace("{PLUME_P2_MID}", p2_m)
    svg = svg.replace("{PLUME_P2_INNER}", p2_i)
    
    svg = svg.replace("{PLUME_S1_OUTER}", s1_o)
    svg = svg.replace("{PLUME_S1_MID}", s1_m)
    svg = svg.replace("{PLUME_S1_INNER}", s1_i)
    svg = svg.replace("{PLUME_S2_OUTER}", s2_o)
    svg = svg.replace("{PLUME_S2_MID}", s2_m)
    svg = svg.replace("{PLUME_S2_INNER}", s2_i)
    
    svg = svg.replace("{PLUME_A1_OUTER}", a1_o)
    svg = svg.replace("{PLUME_A1_INNER}", a1_i)
    svg = svg.replace("{PLUME_A2_OUTER}", a2_o)
    svg = svg.replace("{PLUME_A2_INNER}", a2_i)
    
    svg = svg.replace("{RADAR_TRANSFORM}", radar_transform)
    svg = svg.replace("{SCANNER_OPACITY}", f"{scanner_opacity:.2f}")
    svg = svg.replace("{SCANNER_TRANSFORM}", scanner_transform)
    svg = svg.replace("{DAMAGE_OPACITY}", f"{damage_opacity:.2f}")
    svg = svg.replace("{HAZARD_STROBE}", f"{hazard_strobe:.2f}")

    return svg


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate animated vector mothership spritesheet.")
    parser.add_argument("-s", "--source", required=True, help="Path to source mothership SVG file.")
    parser.add_argument("-z", "--size", type=int, required=True, help="Tile size in pixels (e.g. 256).")
    parser.add_argument("-n", "--frames", type=int, default=32, help="Number of animation frames (default: 32).")
    parser.add_argument("-c", "--cols", type=int, default=6, help="Grid columns (default: 6).")
    parser.add_argument("-r", "--rows", type=int, default=6, help="Grid rows (default: 6).")
    parser.add_argument("--state", choices=["base", "idle", "damaged"], required=True, help="Animation state.")
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

    sheet_w = args.cols * args.size
    sheet_h = args.rows * args.size
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))

    work_dir = tempfile.mkdtemp(prefix="voidbound_mothership_gen_")
    try:
        for frame_idx in range(args.frames):
            t = frame_idx / args.frames
            frame_svg = format_frame_svg(raw_svg, palette, args.state, t)
            frame_img = render_svg_string_to_image(frame_svg, args.size, args.size, work_dir)

            col = frame_idx % args.cols
            row = frame_idx // args.cols
            sheet.paste(frame_img, (col * args.size, row * args.size))
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)

    os.makedirs(os.path.dirname(os.path.abspath(args.dest)), exist_ok=True)
    sheet.save(args.dest, "PNG")
    print(f"Generated {args.dest} ({args.state}/{args.relation}, {args.frames} frames @ {args.size}x{args.size})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
