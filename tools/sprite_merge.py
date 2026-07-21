#!/usr/bin/env python3
"""
Sprite Merge

Combines sprites from multiple source spritesheets into a single output
spritesheet where every cell is a uniform size*size square.

Each source sheet is specified as a triplet: PATH:COLS:ROWS. The script reads
all sprites from every sheet in declaration order, resizes each one to the
target size, and arranges them into a square grid in the output sheet.

Usage:
    python3 sprite_merge.py \\
        --sheet sprites_a.png:6:6 \\
        --sheet sprites_b.png:4:4 \\
        --size 64 \\
        --dest merged.png

Arguments:
    -S / --sheet    Source spritesheet spec as PATH:COLS:ROWS (repeatable).
                    Each sheet may have a different sprite size; all sprites are
                    resized uniformly to --size before compositing.
    -z / --size     Side length (px) of each sprite in the output sheet (square).
    -d / --dest     Output path for the merged spritesheet PNG.

Design decisions:
  - Sprites are collected from all source sheets in declaration order and
    arranged left-to-right, top-to-bottom in a square output grid
    (side = ceil(sqrt(total_sprites))), matching sprite_transition.py's layout.
  - Each source sheet's cell size is computed as (sheet_w // cols, sheet_h //
    rows). This is the same integer-division approach used by sprite_extract.py,
    which gracefully ignores any sub-pixel remainder at sheet edges.
  - Sprite bounds are auto-detected via alpha transparency (same logic as
    sprite_extract.py): tight-crop to remove transparent padding, pad to square
    to preserve aspect ratio, then resize with LANCZOS filtering.
  - Fully-transparent cells are emitted as transparent size*size tiles so sprite
    indices stay stable and intentional blank slots are preserved.
  - Source sheets do not need to match each other in cell size, grid dimensions,
    or overall sheet dimensions.

Dependencies: Pillow (`pip install Pillow`)
"""

import argparse
import math
import sys
from PIL import Image


# -- Sprite extraction ---------------------------------------------------------


def extract_cell(
    sheet: Image.Image, col: int, row: int, cell_w: int, cell_h: int
) -> Image.Image:
    """Crop a single cell from the sheet at grid position (col, row)."""
    left = col * cell_w
    top = row * cell_h
    return sheet.crop((left, top, left + cell_w, top + cell_h))


def alpha_bbox(cell: Image.Image) -> tuple[int, int, int, int] | None:
    """
    Return the bounding box of non-transparent pixels in a cell, or None if
    the cell is fully transparent.

    We operate on the alpha channel alone (not the full RGBA image) because
    getbbox() on RGBA treats any non-(0,0,0,0) pixel as content, which would
    misfired on RGB-colored but alpha=0 pixels.
    """
    _, _, _, alpha = cell.split()
    return alpha.getbbox()


def pad_to_square(img: Image.Image) -> Image.Image:
    """
    Center img on a transparent square canvas whose side equals max(w, h).
    No-op for square images.
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
    Return a size*size RGBA sprite from a padded cell:
      1. Tight-crop to remove transparent margins.
      2. Pad to square to preserve aspect ratio.
      3. Resize to size*size with LANCZOS filtering.
    Returns a fully transparent size*size tile when the cell is empty.
    """
    bbox = alpha_bbox(cell)
    if bbox is None:
        return Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cropped = cell.crop(bbox)
    squared = pad_to_square(cropped)
    return squared.resize((size, size), Image.Resampling.LANCZOS)


# -- Source sheet loading ------------------------------------------------------


def is_built_in_keyword(spec: str) -> bool:
    spec_lower = spec.strip().lower()
    if spec_lower in ("transparent", "blank", "none"):
        return True
    if spec_lower.startswith("color(") and spec_lower.endswith(")"):
        return True
    if spec_lower.startswith("color="):
        return True
    if spec_lower.startswith("#") and len(spec_lower) in (4, 5, 7, 9):
        return True
    return False


def resolve_source_image(spec: str, size: int) -> Image.Image:
    spec_lower = spec.strip().lower()
    if spec_lower in ("transparent", "blank", "none"):
        return Image.new("RGBA", (size, size), (0, 0, 0, 0))

    color_str = None
    if spec_lower.startswith("color(") and spec_lower.endswith(")"):
        color_str = spec.strip()[6:-1].strip()
    elif spec_lower.startswith("color="):
        color_str = spec.strip()[6:].strip()
    elif spec_lower.startswith("#"):
        color_str = spec.strip()

    if color_str is not None:
        from PIL import ImageColor

        try:
            rgba = ImageColor.getcolor(color_str, "RGBA")
        except ValueError:
            try:
                rgb = ImageColor.getrgb(color_str)
                rgba = rgb if len(rgb) == 4 else rgb + (255,)
            except ValueError as e:
                print(
                    f"Error: invalid color specification '{color_str}' in '{spec}': {e}",
                    file=sys.stderr,
                )
                sys.exit(1)
        return Image.new("RGBA", (size, size), rgba)

    try:
        img = Image.open(spec).convert("RGBA")
    except Exception as e:
        print(f"Error opening image '{spec}': {e}", file=sys.stderr)
        sys.exit(1)
    return pad_to_square(img).resize((size, size), Image.Resampling.LANCZOS)


def load_sprites_from_sheet(
    path: str, cols: int, rows: int, size: int
) -> tuple[list[Image.Image], int]:
    """
    Open a source spritesheet, extract every cell, and resize each sprite to
    size*size.  Returns (sprites, empty_count).
    """
    if is_built_in_keyword(path):
        tile = resolve_source_image(path, size)
        total = cols * rows
        empty_count = total if alpha_bbox(tile) is None else 0
        return [tile.copy() for _ in range(total)], empty_count

    sheet = Image.open(path).convert("RGBA")
    sheet_w, sheet_h = sheet.size
    cell_w = sheet_w // cols
    cell_h = sheet_h // rows

    if cell_w < 1 or cell_h < 1:
        print(
            f"Error: computed cell size {cell_w}*{cell_h} is too small for "
            f"a {sheet_w}*{sheet_h} sheet with {cols} cols * {rows} rows — {path}",
            file=sys.stderr,
        )
        sys.exit(1)

    sprites: list[Image.Image] = []
    empty_count = 0

    for row in range(rows):
        for col in range(cols):
            cell = extract_cell(sheet, col, row, cell_w, cell_h)
            sprite = extract_sprite(cell, size)
            sprites.append(sprite)
            if alpha_bbox(cell) is None:
                empty_count += 1

    return sprites, empty_count


# -- Spritesheet assembly -------------------------------------------------------


def build_spritesheet(sprites: list[Image.Image], size: int) -> Image.Image:
    """
    Arrange sprites into a square grid (side = ceil(sqrt(len(sprites)))).
    Unused trailing cells are left transparent.
    """
    grid_side = math.ceil(math.sqrt(len(sprites)))
    sheet = Image.new("RGBA", (grid_side * size, grid_side * size), (0, 0, 0, 0))
    for idx, sprite in enumerate(sprites):
        col = idx % grid_side
        row = idx // grid_side
        sheet.paste(sprite, (col * size, row * size))
    return sheet


# -- CLI -----------------------------------------------------------------------


def parse_sheet_spec(spec: str) -> tuple[str, int, int]:
    """Parse a PATH:COLS:ROWS or keyword spec and return (path, cols, rows)."""
    parts = spec.rsplit(":", 2)
    if is_built_in_keyword(spec):
        return spec, 1, 1
    if len(parts) == 2 and is_built_in_keyword(parts[0]):
        try:
            count = int(parts[1])
            return parts[0], count, 1
        except ValueError:
            pass
    if len(parts) == 3 and is_built_in_keyword(parts[0]):
        try:
            cols, rows = int(parts[1]), int(parts[2])
            return parts[0], cols, rows
        except ValueError:
            pass

    if len(parts) != 3:
        print(
            f"Error: --sheet must be PATH:COLS:ROWS (or KEYWORD[:COUNT]), got '{spec}'",
            file=sys.stderr,
        )
        sys.exit(1)
    path, cols_str, rows_str = parts
    try:
        cols, rows = int(cols_str), int(rows_str)
    except ValueError:
        print(
            f"Error: COLS and ROWS must be integers in '{spec}'",
            file=sys.stderr,
        )
        sys.exit(1)
    if cols < 1 or rows < 1:
        print(
            f"Error: COLS and ROWS must be at least 1 in '{spec}'",
            file=sys.stderr,
        )
        sys.exit(1)
    return path, cols, rows


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Merge sprites from multiple source spritesheets into one output "
            "sheet at a uniform target size."
        ),
        epilog=(
            "Each --sheet is PATH:COLS:ROWS. Source sheets may differ in cell "
            "size; all sprites are resized to --size before merging. Sprites are "
            "collected in declaration order and laid out in a square grid."
        ),
    )
    parser.add_argument(
        "-S",
        "--sheet",
        action="append",
        required=True,
        dest="sheets",
        metavar="PATH:COLS:ROWS",
        help="Source spritesheet spec (repeatable). E.g. sprites.png:6:6",
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
        help="Output path for the merged spritesheet PNG",
    )
    args = parser.parse_args()

    if args.size < 1:
        print("Error: --size must be at least 1", file=sys.stderr)
        sys.exit(1)

    all_sprites: list[Image.Image] = []
    total_empty = 0
    sheet_summaries: list[str] = []

    for spec in args.sheets:
        path, cols, rows = parse_sheet_spec(spec)
        sprites, empty_count = load_sprites_from_sheet(path, cols, rows, args.size)
        all_sprites.extend(sprites)
        total_empty += empty_count
        filled = cols * rows - empty_count
        sheet_summaries.append(
            f"  {path}: {filled}/{cols * rows} sprites ({cols}*{rows} grid)"
        )

    if not all_sprites:
        print(
            "Error: no sprites collected — check your --sheet arguments",
            file=sys.stderr,
        )
        sys.exit(1)

    output = build_spritesheet(all_sprites, args.size)
    output.save(args.dest)

    grid_side = math.ceil(math.sqrt(len(all_sprites)))
    total_filled = len(all_sprites) - total_empty
    print(
        f"Merged {total_filled}/{len(all_sprites)} sprites from {len(args.sheets)} sheet(s) "
        f"→ {grid_side}*{grid_side} grid ({output.width}*{output.height}px) → {args.dest}"
    )
    for summary in sheet_summaries:
        print(summary)
    if total_empty:
        print(f"  ({total_empty} empty cell(s) written as transparent tiles)")


if __name__ == "__main__":
    main()
