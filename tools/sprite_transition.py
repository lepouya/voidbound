#!/usr/bin/env python3
"""
Sprite Transition Spritesheet Generator

Creates animated transition spritesheets by compositing multiple transitions over a
shared base image. Each transition specifies its own alt image, type, and frame range.
Transitions can overlap — they are composited in the order they are declared.

Usage:
    python3 sprite_transition.py \\
        --base base.png \\
        --frames 16 \\
        --size 64 \\
        --transition roll_up:glow.png:0:8 \\
        --transition fade:highlight.png:4:12 \\
        --dest output.png

Design decisions:
  - Pillow is used over heavier libraries (OpenCV, numpy) since we only need basic
    per-pixel blending and cropping — no matrix ops or GPU acceleration needed.
  - All compositing uses RGBA to respect alpha transparency in both layers. The base
    image is never flattened; alt images are composited on top with alpha_composite so
    semi-transparent pixels blend correctly.
  - The spritesheet grid is always square: side = ceil(sqrt(num_frames)). Unused cells
    (when num_frames isn't a perfect square) are left transparent.
  - For roll transitions, only the visible strip of the alt image is cropped and
    composited per frame (avoids full-image copies with masking).
  - Transitions produce transparent overlay layers rather than complete frames. This
    lets multiple transitions stack: for each frame, we start with the base and
    alpha_composite each active transition's overlay on top, in declaration order.
    This means later transitions visually sit on top of earlier ones where they overlap.
  - Each transition is parameterized by a local progress value (0.0-1.0) derived from
    its own start/end frame range, making transition logic independent of absolute
    frame indices.

Dependencies: Pillow (`pip install Pillow`)
"""

import argparse
import math
import sys
from dataclasses import dataclass
from PIL import Image


# -- Image resizing ------------------------------------------------------------


def resize_to_square(img: Image.Image, size: int) -> Image.Image:
    """
    Resize an image to size*size pixels. If the source image is not square,
    it is first padded with transparent pixels equally on both sides of the
    shorter dimension so the content is centered, then resized.
    """
    w, h = img.size
    if w != h:
        side = max(w, h)
        padded = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        padded.paste(img, ((side - w) // 2, (side - h) // 2))
        img = padded
    return img.resize((size, size), Image.LANCZOS)


# -- Overlay generators --------------------------------------------------------
# Each generator returns a transparent RGBA overlay for a single frame, given the
# alt image and a local progress value t ∈ [0.0, 1.0] within that transition's
# frame range.


def overlay_fade(
    alt: Image.Image, t: float, alpha_from: float, alpha_to: float
) -> Image.Image:
    """
    Fade: linearly interpolates opacity from alpha_from to alpha_to over the
    transition range. Values are clamped to [0.0, 1.0].
    """
    alpha = max(0.0, min(1.0, alpha_from + (alpha_to - alpha_from) * t))
    faded = alt.copy()
    r, g, b, a = faded.split()
    a = a.point(lambda v: int(v * alpha))
    return Image.merge("RGBA", (r, g, b, a))


def overlay_roll(alt: Image.Image, t: float, direction: str) -> Image.Image:
    """
    Rolling-window overlay. A strip the height of the image slides across, entering
    from one edge and exiting the opposite.

    direction="up"   → enters from bottom, exits top
    direction="down" → enters from top, exits bottom
    """
    w, h = alt.size
    strip_h = h
    travel = 2 * h  # distance to fully enter + fully exit

    if direction == "up":
        strip_top = int(h - t * travel)
    else:
        strip_top = int(-h + t * travel)

    strip_bot = strip_top + strip_h

    # Clamp to image bounds
    vis_top = max(strip_top, 0)
    vis_bot = min(strip_bot, h)

    overlay = Image.new("RGBA", alt.size, (0, 0, 0, 0))
    if vis_top < vis_bot:
        region = alt.crop((0, vis_top, w, vis_bot))
        overlay.paste(region, (0, vis_top))
    return overlay


def overlay_scale(
    alt: Image.Image, t: float, scale_from: float, scale_to: float
) -> Image.Image:
    """
    Scale: linearly interpolates the alt image size from scale_from to scale_to,
    centered on the frame. A scale of 1.0 means original size; 0.5 means half; 2.0
    means double (pixels outside the frame are clipped).
    """
    w, h = alt.size
    scale = scale_from + (scale_to - scale_from) * t
    new_w = max(1, int(w * scale))
    new_h = max(1, int(h * scale))
    scaled = alt.resize((new_w, new_h), Image.LANCZOS)

    overlay = Image.new("RGBA", alt.size, (0, 0, 0, 0))
    paste_x = (w - new_w) // 2
    paste_y = (h - new_h) // 2

    if paste_x >= 0 and paste_y >= 0:
        # Scaled image fits within the frame
        overlay.paste(scaled, (paste_x, paste_y))
    else:
        # Scaled image is larger than the frame — crop to fit
        crop_x = max(0, -paste_x)
        crop_y = max(0, -paste_y)
        region = scaled.crop((crop_x, crop_y, crop_x + w, crop_y + h))
        overlay.paste(region, (max(0, paste_x), max(0, paste_y)))

    return overlay


def overlay_rotate(
    alt: Image.Image, t: float, angle_from: float, angle_to: float
) -> Image.Image:
    """
    Rotate: linearly interpolates rotation from angle_from to angle_to (in degrees),
    around the center of the sprite. The rotated image is cropped to the original
    frame size so pixels outside the bounds are clipped.
    """
    angle = angle_from + (angle_to - angle_from) * t
    # Pillow rotates counter-clockwise; expand=True avoids clipping during rotation
    rotated = alt.rotate(angle, resample=Image.BICUBIC, expand=True)
    # Crop the rotated image back to the original size, centered
    rw, rh = rotated.size
    w, h = alt.size
    left = (rw - w) // 2
    top = (rh - h) // 2
    cropped = rotated.crop((left, top, left + w, top + h))
    return cropped


OVERLAY_GENERATORS = {
    "fade": lambda alt, t, **kw: overlay_fade(alt, t, kw["alpha_from"], kw["alpha_to"]),
    "roll_up": lambda alt, t, **kw: overlay_roll(alt, t, "up"),
    "roll_down": lambda alt, t, **kw: overlay_roll(alt, t, "down"),
    "scale": lambda alt, t, **kw: overlay_scale(
        alt, t, kw["scale_from"], kw["scale_to"]
    ),
    "rotate": lambda alt, t, **kw: overlay_rotate(
        alt, t, kw["angle_from"], kw["angle_to"]
    ),
}


# -- Transition spec -----------------------------------------------------------


@dataclass
class TransitionSpec:
    kind: str
    alt: Image.Image
    start: int  # first frame (inclusive)
    end: int  # last frame (inclusive)
    params: dict  # extra keyword args passed to the overlay generator


def parse_transition(spec: str, sprite_size: int) -> TransitionSpec:
    """
    Parse a transition string. Standard format is TYPE:IMAGE:START:END.
    The scale type requires two extra fields: TYPE:IMAGE:START:END:SCALE_FROM:SCALE_TO.
    The alt image is resized (with square padding if needed) to sprite_size*sprite_size.
    """
    parts = spec.split(":")
    if len(parts) < 4:
        print(
            f"Error: transition must be TYPE:IMAGE:START:END[...], got '{spec}'",
            file=sys.stderr,
        )
        sys.exit(1)

    kind, img_path, start_str, end_str = parts[:4]
    extra = parts[4:]

    if kind not in OVERLAY_GENERATORS:
        print(
            f"Error: unknown transition type '{kind}'. "
            f"Choose from: {', '.join(OVERLAY_GENERATORS)}",
            file=sys.stderr,
        )
        sys.exit(1)

    def safe_float(val: str, default: float = 1.0) -> float:
        try:
            return float(val)
        except ValueError:
            return default

    params: dict = {}
    if kind == "fade":
        params["alpha_from"] = safe_float(extra[0]) if len(extra) > 0 else 1.0
        params["alpha_to"] = safe_float(extra[1]) if len(extra) > 1 else 1.0
    elif kind == "scale":
        params["scale_from"] = safe_float(extra[0]) if len(extra) > 0 else 1.0
        params["scale_to"] = safe_float(extra[1]) if len(extra) > 1 else 1.0
    elif kind == "rotate":
        params["angle_from"] = safe_float(extra[0], 0.0) if len(extra) > 0 else 0.0
        params["angle_to"] = safe_float(extra[1], 0.0) if len(extra) > 1 else 0.0
    elif extra:
        print(
            f"Error: transition '{kind}' takes no extra parameters, got '{spec}'",
            file=sys.stderr,
        )
        sys.exit(1)

    alt = Image.open(img_path).convert("RGBA")
    alt = resize_to_square(alt, sprite_size)

    start, end = int(start_str), int(end_str)
    if start >= end:
        print(
            f"Error: start frame must be < end frame, got {start}:{end}",
            file=sys.stderr,
        )
        sys.exit(1)

    return TransitionSpec(kind=kind, alt=alt, start=start, end=end, params=params)


# -- Frame generation ----------------------------------------------------------


def generate_frames(
    base: Image.Image, transitions: list[TransitionSpec], num_frames: int
) -> list[Image.Image]:
    """
    Build all frames by compositing active transitions over the base.

    For each frame index, every transition whose [start, end] range contains that
    index produces an overlay. Overlays are composited onto the base in declaration
    order, so later transitions appear on top of earlier ones.
    """
    frames = []
    for i in range(num_frames):
        frame = base.copy()
        for tr in transitions:
            if tr.start <= i <= tr.end:
                # Map frame index to local progress 0.0–1.0
                t = (i - tr.start) / (tr.end - tr.start)
                overlay = OVERLAY_GENERATORS[tr.kind](tr.alt, t, **tr.params)
                frame = Image.alpha_composite(frame, overlay)
        frames.append(frame)
    return frames


# -- Spritesheet layout --------------------------------------------------------


def build_spritesheet(
    frames: list[Image.Image], cell_w: int, cell_h: int
) -> Image.Image:
    """
    Arrange frames in a square grid. Grid side = ceil(sqrt(num_frames)).
    Sheet dimensions = cell_size * grid_side. Unused cells stay transparent.
    """
    grid_side = math.ceil(math.sqrt(len(frames)))
    sheet = Image.new("RGBA", (cell_w * grid_side, cell_h * grid_side), (0, 0, 0, 0))

    for idx, frame in enumerate(frames):
        col = idx % grid_side
        row = idx // grid_side
        sheet.paste(frame, (col * cell_w, row * cell_h))

    return sheet


# -- CLI -----------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(
        description="Generate a multi-transition spritesheet over a shared base image.",
        epilog="Each --transition is TYPE:IMAGE:START:END where TYPE is one of "
        f"{', '.join(OVERLAY_GENERATORS)} and START/END are frame indices (inclusive). "
        "The scale type requires two extra fields: scale:IMAGE:START:END:SCALE_FROM:SCALE_TO.",
    )
    parser.add_argument(
        "-s", "--base", required=True, help="Path to the base PNG image"
    )
    parser.add_argument(
        "-n", "--frames", type=int, required=True, help="Total number of frames"
    )
    parser.add_argument(
        "-z",
        "--size",
        type=int,
        required=True,
        help="Sprite size in pixels (each frame will be size*size)",
    )
    parser.add_argument(
        "-t",
        "--transition",
        action="append",
        required=True,
        dest="transitions",
        metavar="TYPE:IMAGE:START:END",
        help="Transition spec (repeatable). E.g. roll_up:glow.png:0:8 or scale:glow.png:0:8:0.5:2.0",
    )
    parser.add_argument(
        "-d", "--dest", required=True, help="Output path for the spritesheet PNG"
    )
    args = parser.parse_args()

    if args.frames < 2:
        print("Error: --frames must be at least 2", file=sys.stderr)
        sys.exit(1)

    if args.size < 1:
        print("Error: --size must be at least 1", file=sys.stderr)
        sys.exit(1)

    base = Image.open(args.base).convert("RGBA")
    base = resize_to_square(base, args.size)

    transitions = [parse_transition(spec, args.size) for spec in args.transitions]

    # Validate that all frame ranges fit within num_frames
    for tr in transitions:
        if tr.end >= args.frames:
            print(
                f"Error: transition end frame {tr.end} exceeds --frames {args.frames}",
                file=sys.stderr,
            )
            sys.exit(1)

    frames = generate_frames(base, transitions, args.frames)
    sheet = build_spritesheet(frames, args.size, args.size)
    sheet.save(args.dest)

    grid_side = math.ceil(math.sqrt(args.frames))
    print(
        f"Saved {args.frames} frames ({len(transitions)} transition(s)) "
        f"as {grid_side}x{grid_side} grid ({sheet.width}x{sheet.height}px) → {args.dest}"
    )


if __name__ == "__main__":
    main()
