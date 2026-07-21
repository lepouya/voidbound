"""
Shared SVG rasterization helper for the Voidbound art pipeline.

Every `tools/svg_*_gen.py` generator renders through `rsvg-convert` (librsvg).
Before this module existed, each generator carried its own copy-pasted
`find_rsvg_convert()` + render function, and the copies had already drifted
from each other (some checked hardcoded Homebrew/Linux install paths beyond
`shutil.which`, some didn't; error-message detail and exit-code handling
differed) — see CR-T.1 in CODE_REVIEW.md. This module is the one
implementation every generator imports instead.

Two render entry points, matching the two shapes generators actually need:
  - `render_svg_file_to_image`   — an existing SVG file on disk (e.g. a
    static base asset with no per-frame templating, like the asteroid rock).
  - `render_svg_string_to_image` — an in-memory SVG XML string (e.g. a
    per-frame template with placeholders already substituted); writes it to
    a temp file and delegates to the file-based renderer.
"""

import os
import shutil
import subprocess
import uuid
from PIL import Image

# Checked after PATH (shutil.which) — Homebrew's Apple Silicon and Intel
# install prefixes, plus the common Linux path, so a shell that hasn't
# picked up PATH changes yet (a fresh terminal, a subprocess with a
# trimmed env) still finds a Homebrew-installed rsvg-convert.
_FALLBACK_PATHS = (
    "/opt/homebrew/bin/rsvg-convert",
    "/usr/local/bin/rsvg-convert",
    "/usr/bin/rsvg-convert",
)


def find_rsvg_convert() -> str | None:
    """Locate the rsvg-convert binary: PATH first, then common install prefixes."""
    path = shutil.which("rsvg-convert")
    if path:
        return path
    for candidate in _FALLBACK_PATHS:
        if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
            return candidate
    return None


def render_svg_file_to_image(
    svg_path: str, width: int, height: int, work_dir: str
) -> Image.Image:
    """Render an existing SVG file to an RGBA PIL Image at exact target dimensions."""
    rsvg_bin = find_rsvg_convert()
    if not rsvg_bin:
        raise RuntimeError(
            "SVG rendering requires rsvg-convert from librsvg; install it with "
            "`brew install librsvg` on macOS."
        )

    tmp_png = os.path.join(work_dir, f"temp_render_{uuid.uuid4().hex}.png")
    try:
        result = subprocess.run(
            [rsvg_bin, "-w", str(width), "-h", str(height), svg_path, "-o", tmp_png],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            diagnostics = (
                result.stderr.strip() or result.stdout.strip() or "no diagnostic output"
            )
            raise RuntimeError(
                f"rsvg-convert failed with exit code {result.returncode}: {diagnostics}"
            )
        if not os.path.exists(tmp_png):
            raise RuntimeError(
                "rsvg-convert exited successfully but did not produce a PNG output file."
            )
        return Image.open(tmp_png).convert("RGBA")
    finally:
        if os.path.exists(tmp_png):
            os.remove(tmp_png)


def render_svg_string_to_image(
    svg_content: str, width: int, height: int, work_dir: str
) -> Image.Image:
    """Render an SVG XML string to an RGBA PIL Image at exact target dimensions."""
    tmp_svg = os.path.join(work_dir, f"temp_render_{uuid.uuid4().hex}.svg")
    try:
        with open(tmp_svg, "w", encoding="utf-8") as f:
            f.write(svg_content)
        return render_svg_file_to_image(tmp_svg, width, height, work_dir)
    finally:
        if os.path.exists(tmp_svg):
            os.remove(tmp_svg)
