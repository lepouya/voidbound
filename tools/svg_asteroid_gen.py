#!/usr/bin/env python3
"""
SVG Asteroid Generator

Reads an asteroid base SVG file (e.g. asteroid-small.svg, asteroid-medium.svg,
asteroid-large.svg), renders it at 2x resolution using `rsvg-convert`, and
generates a 64-frame looping animated spritesheet in an 8x8 grid.

Each animation loop (~4.2s at 66ms/frame) features:
  1. 3D Tumbling & Zero-G Wobble:
     - Anisotropic scale oscillation (`scale_x` and `scale_y` out of phase)
       to simulate 3D tumbling across axes without 2D wheel-rolling artifacts.
     - Pendular angle tilt (`±3.5°`).
     - Zero-G Lissajous figure-8 drift around the tile center.
  2. Orbiting Debris & Space Dust Cloud:
     - Serene zero-G debris field where particles gently bob locally or orbit
       slowly across the 4.2s loop (`speed_cycles` in `[-1, 0, 1]`) without any
       jerky or spasmic movements.
     - 3D parallax layering: particles draw behind the rock during half of
       their orbit and in front during the other half.
  3. Cinema-Grade Anti-Aliasing:
     - Composited at 2x supersampled resolution and downsampled via Lanczos
       into the target tile size.

Usage:
    python3 svg_asteroid_gen.py \
        --source art/asteroids/asteroid-small.svg \
        --size 64 \
        --frames 64 \
        --cols 8 --rows 8 \
        --dest src/assets/asteroid-small.png
"""

import argparse
import math
import os
import random
import shutil
import sys
import tempfile

from PIL import Image, ImageDraw
from svg_rasterize import render_svg_file_to_image as render_svg_to_image


class OrbitingParticle:
    """A single orbiting pebble or space dust mote."""

    def __init__(
        self,
        radius_x: float,
        radius_y: float,
        tilt_deg: float,
        speed_cycles: int,
        phase_rad: float,
        size_min: float,
        size_max: float,
        is_pebble: bool,
        color_rgb: tuple[int, int, int],
        alpha_base: int,
        spin_cycles: int = 0,
    ):
        self.radius_x = radius_x
        self.radius_y = radius_y
        self.tilt_rad = math.radians(tilt_deg)
        self.speed_cycles = speed_cycles
        self.phase_rad = phase_rad
        self.size_min = size_min
        self.size_max = size_max
        self.is_pebble = is_pebble
        self.color_rgb = color_rgb
        self.alpha_base = alpha_base
        self.spin_cycles = spin_cycles

    def position_and_layer(
        self, t: float, center: float
    ) -> tuple[float, float, bool, float, int]:
        """
        Compute particle position, depth layer, orientation, and alpha at normalized time t in [0, 1).
        Returns: (x, y, is_foreground, angle_deg, alpha)
        """
        orbit_theta = self.phase_rad + self.speed_cycles * 2.0 * math.pi * t
        # Raw ellipse coordinates before tilt
        raw_x = self.radius_x * math.cos(orbit_theta)
        raw_y = self.radius_y * math.sin(orbit_theta)

        # Rotate ellipse around center by tilt_rad
        rot_x = raw_x * math.cos(self.tilt_rad) - raw_y * math.sin(self.tilt_rad)
        rot_y = raw_x * math.sin(self.tilt_rad) + raw_y * math.cos(self.tilt_rad)

        if self.speed_cycles == 0:
            # Local zero-G bobbing around station (±2.5px to ±4.5px harmonic float across the loop)
            drift_amp = (self.radius_x / 64.0) * 3.5
            pos_x = (
                center
                + rot_x
                + drift_amp * math.sin(2.0 * math.pi * t + self.phase_rad)
            )
            pos_y = (
                center
                + rot_y
                + drift_amp * math.cos(2.0 * math.pi * t + self.phase_rad)
            )
        else:
            pos_x = center + rot_x
            pos_y = center + rot_y

        # Depth check: if raw_y < 0, particle is in the upper half of orbit (behind asteroid)
        is_foreground = raw_y >= 0

        # Spin orientation
        angle_deg = (self.spin_cycles * 360.0 * t) % 360.0

        # Subtle alpha pulsation for dust motes
        if self.is_pebble:
            alpha = self.alpha_base
        else:
            pulse = math.sin(2.0 * math.pi * (t + self.phase_rad / (2.0 * math.pi)))
            alpha = int(max(40, min(255, self.alpha_base + 35 * pulse)))

        return pos_x, pos_y, is_foreground, angle_deg, alpha


def generate_particles_for_size(
    size: int, super_scale: int = 2
) -> list[OrbitingParticle]:
    """Generate deterministic set of orbiting pebbles and space dust motes for given tile size."""
    # Seed based on size so generation is 100% deterministic and stable across runs
    random.seed(1337 + size)
    canvas_size = size * super_scale
    center = canvas_size / 2.0

    particles: list[OrbitingParticle] = []

    # Scale counts per tier size
    if size <= 64:
        num_pebbles = 5
        num_dust = 8
    elif size <= 128:
        num_pebbles = 8
        num_dust = 14
    else:
        num_pebbles = 12
        num_dust = 20

    # Generate orbiting pebbles
    for k in range(num_pebbles):
        rx = center * (0.52 + 0.32 * (k / max(1, num_pebbles - 1)))
        ry = rx * random.uniform(0.72, 0.92)
        tilt = random.uniform(-28.0, 28.0)
        # Serene zero-G motion: 60% local floaters (0), 40% slow orbiters (-1, 1) across the 64-frame loop
        speed = random.choice([0, 0, 0, -1, 1])
        phase = random.uniform(0.0, 2.0 * math.pi)
        pebble_size = random.uniform(3.0, 7.0) * (size / 64.0) * super_scale
        gray = random.randint(110, 160)
        spin = random.choice([-1, 0, 1])
        particles.append(
            OrbitingParticle(
                radius_x=rx,
                radius_y=ry,
                tilt_deg=tilt,
                speed_cycles=speed,
                phase_rad=phase,
                size_min=pebble_size * 0.7,
                size_max=pebble_size * 1.3,
                is_pebble=True,
                color_rgb=(gray, gray, gray),
                alpha_base=random.randint(180, 240),
                spin_cycles=spin,
            )
        )

    # Generate glowing dust motes
    for k in range(num_dust):
        rx = center * (0.45 + 0.42 * random.random())
        ry = rx * random.uniform(0.65, 0.95)
        tilt = random.uniform(-35.0, 35.0)
        speed = random.choice([0, 0, 0, -1, 1])
        phase = random.uniform(0.0, 2.0 * math.pi)
        mote_size = random.uniform(1.2, 2.8) * (size / 64.0) * super_scale
        gray = random.randint(140, 190)
        particles.append(
            OrbitingParticle(
                radius_x=rx,
                radius_y=ry,
                tilt_deg=tilt,
                speed_cycles=speed,
                phase_rad=phase,
                size_min=mote_size * 0.8,
                size_max=mote_size * 1.2,
                is_pebble=False,
                color_rgb=(gray, gray, gray),
                alpha_base=random.randint(110, 165),
                spin_cycles=0,
            )
        )

    return particles


def draw_particle_onto_layer(
    layer: Image.Image, particle: OrbitingParticle, t: float, center: float
) -> None:
    """Draw a single particle onto the supersampled RGBA layer."""
    pos_x, pos_y, _, angle_deg, alpha = particle.position_and_layer(t, center)

    if particle.is_pebble:
        # Draw small faceted pebble shape (irregular polygon/ellipse)
        pw = int(max(2, round(particle.size_max)))
        ph = int(max(2, round(particle.size_min)))
        pebble_img = Image.new("RGBA", (pw * 3, ph * 3), (0, 0, 0, 0))
        draw = ImageDraw.Draw(pebble_img)
        cx, cy = (pw * 3) / 2.0, (ph * 3) / 2.0
        bbox = [cx - pw, cy - ph, cx + pw, cy + ph]
        draw.ellipse(bbox, fill=(*particle.color_rgb, alpha))
        if particle.spin_cycles != 0:
            pebble_img = pebble_img.rotate(angle_deg, resample=Image.Resampling.BICUBIC)

        paste_x = round(pos_x - pebble_img.width / 2.0)
        paste_y = round(pos_y - pebble_img.height / 2.0)
        layer.alpha_composite(pebble_img, (paste_x, paste_y))
    else:
        # Draw soft dust mote
        sr = max(1, round((particle.size_min + particle.size_max) / 2.0))
        draw = ImageDraw.Draw(layer)
        bbox = [pos_x - sr, pos_y - sr, pos_x + sr, pos_y + sr]
        draw.ellipse(bbox, fill=(*particle.color_rgb, alpha))


def render_asteroid_frame(
    base_rock: Image.Image,
    particles: list[OrbitingParticle],
    t: float,
    super_size: int,
    final_size: int,
) -> Image.Image:
    """
    Render one complete animation frame at normalized time t in [0, 1).
    Composited at `super_size` and downsampled to `final_size`.
    """
    center = super_size / 2.0
    bg_layer = Image.new("RGBA", (super_size, super_size), (0, 0, 0, 0))
    fg_layer = Image.new("RGBA", (super_size, super_size), (0, 0, 0, 0))

    # 1. Draw particles into background or foreground layer depending on orbit depth
    for p in particles:
        _, _, is_foreground, _, _ = p.position_and_layer(t, center)
        target_layer = fg_layer if is_foreground else bg_layer
        draw_particle_onto_layer(target_layer, p, t, center)

    # 2. Transform base rock: Anisotropic Scale + Pendular Tilt + Zero-G Lissajous Drift
    # Anisotropic scaling: width and height oscillate out of phase (sin vs cos)
    scale_x = 1.0 + 0.045 * math.sin(2.0 * math.pi * t)
    scale_y = 1.0 + 0.045 * math.cos(2.0 * math.pi * t)
    target_w = max(1, round(super_size * scale_x))
    target_h = max(1, round(super_size * scale_y))

    scaled_rock = base_rock.resize((target_w, target_h), Image.Resampling.BICUBIC)

    # Pendular tilt angle: ±3.5 degrees
    tilt_deg = 3.5 * math.sin(2.0 * math.pi * t)
    rotated_rock = scaled_rock.rotate(
        tilt_deg, resample=Image.Resampling.BICUBIC, expand=True
    )

    # Zero-G Lissajous drift around center
    drift_x = round((super_size / 64.0) * 2.2 * math.sin(2.0 * math.pi * t))
    drift_y = round((super_size / 64.0) * 1.6 * math.sin(4.0 * math.pi * t))

    rock_layer = Image.new("RGBA", (super_size, super_size), (0, 0, 0, 0))
    paste_x = round(center - rotated_rock.width / 2.0) + drift_x
    paste_y = round(center - rotated_rock.height / 2.0) + drift_y
    rock_layer.alpha_composite(rotated_rock, (paste_x, paste_y))

    # 3. Composite all layers: background particles -> rock -> foreground particles
    combined = Image.new("RGBA", (super_size, super_size), (0, 0, 0, 0))
    combined.alpha_composite(bg_layer)
    combined.alpha_composite(rock_layer)
    combined.alpha_composite(fg_layer)

    # 4. Lanczos downsample to final tile size
    return combined.resize((final_size, final_size), Image.Resampling.LANCZOS)


def generate_animated_asteroid_sheet(
    svg_path: str,
    size: int,
    frames: int,
    cols: int,
    rows: int,
    dest_path: str,
    work_dir: str,
) -> None:
    """Main generation routine: builds 64 frames and packs into cols*rows sheet."""
    super_scale = 2
    super_size = size * super_scale

    print(
        f"Rendering vector base: {svg_path} at {super_size}x{super_size}px (2x supersampled)..."
    )
    base_rock = render_svg_to_image(svg_path, super_size, super_size, work_dir)

    particles = generate_particles_for_size(size, super_scale)
    print(
        f"Generated {len(particles)} orbiting debris/dust particles for {size}x{size}px tier."
    )

    sheet_width = cols * size
    sheet_height = rows * size
    sheet = Image.new("RGBA", (sheet_width, sheet_height), (0, 0, 0, 0))

    print(
        f"Rendering {frames} frames into {cols}x{rows} grid ({sheet_width}x{sheet_height}px)..."
    )
    for i in range(frames):
        t = i / float(frames)
        frame_img = render_asteroid_frame(base_rock, particles, t, super_size, size)
        col = i % cols
        row = i // cols
        sheet.alpha_composite(frame_img, (col * size, row * size))

    os.makedirs(os.path.dirname(os.path.abspath(dest_path)), exist_ok=True)
    sheet.save(dest_path, "PNG")
    print(f"Saved animated asteroid spritesheet ({frames} frames) → {dest_path}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate animated 3D tumbling asteroid spritesheet from SVG."
    )
    parser.add_argument(
        "-s", "--source", required=True, help="Path to source asteroid SVG file."
    )
    parser.add_argument(
        "-z",
        "--size",
        type=int,
        required=True,
        help="Tile size in pixels (64, 128, or 192).",
    )
    parser.add_argument(
        "-n",
        "--frames",
        type=int,
        default=64,
        help="Number of animation frames (default: 64).",
    )
    parser.add_argument(
        "-c", "--cols", type=int, default=8, help="Grid columns (default: 8)."
    )
    parser.add_argument(
        "-r", "--rows", type=int, default=8, help="Grid rows (default: 8)."
    )
    parser.add_argument(
        "-d", "--dest", required=True, help="Path to destination PNG spritesheet."
    )
    args = parser.parse_args()

    if not os.path.isfile(args.source):
        print(
            f"Error: Source SVG file '{args.source}' does not exist.", file=sys.stderr
        )
        return 1

    if args.frames > args.cols * args.rows:
        print(
            f"Error: Number of frames ({args.frames}) exceeds grid capacity ({args.cols * args.rows}).",
            file=sys.stderr,
        )
        return 1

    work_dir = tempfile.mkdtemp(prefix="asteroid_gen_")
    try:
        generate_animated_asteroid_sheet(
            svg_path=args.source,
            size=args.size,
            frames=args.frames,
            cols=args.cols,
            rows=args.rows,
            dest_path=args.dest,
            work_dir=work_dir,
        )
    finally:
        if os.path.exists(work_dir):
            shutil.rmtree(work_dir)

    return 0


if __name__ == "__main__":
    sys.exit(main())
