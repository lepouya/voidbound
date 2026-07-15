#!/usr/bin/env python3
"""
Sprite Extractor

Status: not currently called by any art/gen_*.sh script. Kept on standby as
available infrastructure for a future single-source-sheet pipeline (see
sprite_merge.py's design-decisions comment, which already assumes sheets
arrive pre-extracted this way) — wire it into a script or delete it if that
need doesn't materialize.

Reads a padded spritesheet whose sprites are arranged in a known rectangular
grid, auto-detects each sprite's actual pixel content via alpha transparency,
crops out the padding, and saves a compact output spritesheet where every cell
is exactly size*size pixels.

Usage:
    python3 sprite_extract.py \\
        --source source.png \\
        --cols 4 \\
        --rows 3 \\
        --size 64 \\
        --dest output.png

Arguments:
    -s / --source   Path to the source spritesheet PNG (must have an alpha channel)
    -c / --cols     Number of sprite columns in the source grid
    -r / --rows     Number of sprite rows in the source grid
    -z / --size     Side length (px) of each sprite in the output sheet (square)
    -d / --dest     Output path for the compact spritesheet PNG

Design decisions:
  - Pillow's Image.getbbox() on the alpha channel is used to auto-detect sprite
    bounds per cell. This works reliably because the sprites have a mostly-circular
    shape on a fully-transparent background, so the alpha channel cleanly separates
    content from padding.
  - Each source grid cell is computed as (sheet_w // cols, sheet_h // rows). Integer
    division is intentional: any sub-pixel remainder at the right/bottom edge of
    the sheet is ignored, which matches how most art tools export padded sheets.
  - If a cell's bounding box is not square, it is center-padded with transparent
    pixels to make it square before resizing. This preserves the aspect ratio and
    centers the sprite, consistent with how sprite_transition.py handles non-square
    base images.
  - Fully-transparent cells (getbbox() returns None) are treated as empty sprite
    slots and produce a transparent size*size tile in the output. This allows
    source sheets with intentional blank entries.
  - The output grid has the same cols*rows layout as the input, so sprite indices
    remain identical and downstream tileset configs don't need to change column/row
    counts — only the cell size changes.
  - Resize uses Image.LANCZOS (high-quality downsampling) for production assets.

Dependencies: Pillow (`pip install Pillow`)
"""

import argparse
import sys
from PIL import Image


# -- Sprite extraction ---------------------------------------------------------


def extract_cell(
    sheet: Image.Image, col: int, row: int, cell_w: int, cell_h: int
) -> Image.Image:
    """
    Crop a single cell from the sheet at grid position (col, row).
    Returns an RGBA image of size cell_w * cell_h.
    """
    left = col * cell_w
    top = row * cell_h
    return sheet.crop((left, top, left + cell_w, top + cell_h))


def detect_sprite_bounds(cell: Image.Image) -> tuple[int, int, int, int] | None:
    """
    Find the bounding box of non-transparent pixels in a cell using the alpha
    channel. Returns (left, top, right, bottom) or None if the cell is empty.

    We split out the alpha channel and call getbbox() on it rather than the full
    RGBA image because getbbox() on an RGBA image treats any non-(0,0,0,0) pixel
    as content, which could misfire on pixels that are RGB-colored but alpha=0.
    Operating on the alpha channel alone ensures we only consider visible pixels.
    """
    _, _, _, alpha = cell.split()
    return alpha.getbbox()


def tight_crop(cell: Image.Image) -> Image.Image | None:
    """
    Crop the cell to only the pixels that contain sprite content.
    Returns None if the cell is fully transparent.
    """
    bbox = detect_sprite_bounds(cell)
    if bbox is None:
        return None
    return cell.crop(bbox)


def pad_to_square(img: Image.Image) -> Image.Image:
    """
    If img is not square, center it on a transparent square canvas whose side
    equals the larger of the two dimensions. No-op for square images.
    """
    w, h = img.size
    if w == h:
        return img
    side = max(w, h)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(img, ((side - w) // 2, (side - h) // 2))
    return square


def extract_sprite(cell: Image.Image, size: int) -> Image.Image:
    """
    Given a padded cell image, return a size*size RGBA sprite:
      1. Tight-crop to remove transparent margins.
      2. Pad to square so the aspect ratio is preserved during resize.
      3. Resize to size*size with LANCZOS filtering.
    Returns a fully transparent size*size tile if the cell is empty.
    """
    cropped = tight_crop(cell)
    if cropped is None:
        return Image.new("RGBA", (size, size), (0, 0, 0, 0))
    squared = pad_to_square(cropped)
    return squared.resize((size, size), Image.LANCZOS)


# -- Spritesheet assembly -------------------------------------------------------


def build_compact_sheet(
    sprites: list[Image.Image], cols: int, rows: int, size: int
) -> Image.Image:
    """
    Arrange sprites into a cols*rows grid where every cell is size*size.
    Sprites are placed left-to-right, top-to-bottom, matching the source order.
    """
    sheet = Image.new("RGBA", (cols * size, rows * size), (0, 0, 0, 0))
    for idx, sprite in enumerate(sprites):
        col = idx % cols
        row = idx // cols
        sheet.paste(sprite, (col * size, row * size))
    return sheet


# -- CLI -----------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Extract sprites from a padded spritesheet, auto-detect bounds via "
            "alpha transparency, and output a compact sheet at a target size."
        ),
        epilog=(
            "The source sheet must be a PNG with an alpha channel. Sprite content "
            "is detected per-cell by finding non-transparent pixel bounds, so the "
            "source background must be fully transparent outside each sprite."
        ),
    )
    parser.add_argument(
        "-s", "--source", required=True, help="Path to the source spritesheet PNG"
    )
    parser.add_argument(
        "-c",
        "--cols",
        type=int,
        required=True,
        help="Number of sprite columns in the source grid",
    )
    parser.add_argument(
        "-r",
        "--rows",
        type=int,
        required=True,
        help="Number of sprite rows in the source grid",
    )
    parser.add_argument(
        "-z",
        "--size",
        type=int,
        required=True,
        help="Output sprite size in pixels (each cell will be size*size)",
    )
    parser.add_argument(
        "-d",
        "--dest",
        required=True,
        help="Output path for the compact spritesheet PNG",
    )
    args = parser.parse_args()

    if args.cols < 1 or args.rows < 1:
        print("Error: --cols and --rows must be at least 1", file=sys.stderr)
        sys.exit(1)
    if args.size < 1:
        print("Error: --size must be at least 1", file=sys.stderr)
        sys.exit(1)

    sheet = Image.open(args.source).convert("RGBA")
    sheet_w, sheet_h = sheet.size

    cell_w = sheet_w // args.cols
    cell_h = sheet_h // args.rows

    if cell_w < 1 or cell_h < 1:
        print(
            f"Error: computed cell size {cell_w}*{cell_h} is too small for "
            f"a {sheet_w}*{sheet_h} sheet with {args.cols} cols * {args.rows} rows",
            file=sys.stderr,
        )
        sys.exit(1)

    sprites: list[Image.Image] = []
    empty_count = 0

    for row in range(args.rows):
        for col in range(args.cols):
            cell = extract_cell(sheet, col, row, cell_w, cell_h)
            sprite = extract_sprite(cell, args.size)
            sprites.append(sprite)
            if detect_sprite_bounds(cell) is None:
                empty_count += 1

    output = build_compact_sheet(sprites, args.cols, args.rows, args.size)
    output.save(args.dest)

    total = args.cols * args.rows
    filled = total - empty_count
    print(
        f"Extracted {filled}/{total} sprites (source cell {cell_w}*{cell_h}px → {args.size}*{args.size}px) "
        f"into {args.cols}*{args.rows} grid ({output.width}*{output.height}px) → {args.dest}"
    )
    if empty_count:
        print(f"  ({empty_count} empty cell(s) written as transparent tiles)")


if __name__ == "__main__":
    main()
