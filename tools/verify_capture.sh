#!/bin/bash
# Screenshot helper for runtime verification (see .claude/skills/verify).
#
# Finds the running Voidbound window (CGWindowList — AppleScript ids fail on
# Tauri), captures it without stealing focus, and prints a wall-clock
# timestamp with every frame so number-bearing screenshots are usable as
# evidence. Optionally crops/upscales a region (HUD digits are unreadable at
# full-window scale) and supports burst mode for motion (vessel flights).
#
# usage: tools/verify_capture.sh [-o out.png] [-c X,Y,W,H] [-s SCALE]
#                                [-n COUNT] [-i SECONDS] [--id]
#   -o  output file (default verify-<HHMMSS>.png in cwd; put it in the
#       session scratchpad, not the repo)
#   -c  crop region in image pixels, upscaled by SCALE into <out>-crop.png
#   -s  crop upscale factor (default 3)
#   -n  burst: number of frames (suffix -1..N), default 1
#   -i  burst interval seconds, default 5
#   --id  print the window id and exit
set -euo pipefail

out="verify-$(date +%H%M%S).png"
crop=""
scale=3
count=1
interval=5
id_only=0
while [ $# -gt 0 ]; do
    case "$1" in
        -o) out="$2"; shift 2 ;;
        -c) crop="$2"; shift 2 ;;
        -s) scale="$2"; shift 2 ;;
        -n) count="$2"; shift 2 ;;
        -i) interval="$2"; shift 2 ;;
        --id) id_only=1; shift ;;
        *) echo "unknown flag: $1" >&2; exit 2 ;;
    esac
done

# Tallest voidbound window is the app (a second ~500px one can appear).
win_id=$(swift - <<'EOF'
import CoreGraphics
import Foundation
var best: (id: Int, h: Double)? = nil
if let list = CGWindowListCopyWindowInfo([.excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] {
  for w in list {
    if let owner = w[kCGWindowOwnerName as String] as? String, owner == "voidbound",
       let bounds = w[kCGWindowBounds as String] as? [String: Any],
       let h = bounds["Height"] as? Double, h > 100,
       let id = w[kCGWindowNumber as String] as? Int {
      if best == nil || h > best!.h { best = (id, h) }
    }
  }
}
if let b = best { print(b.id) }
EOF
)
if [ -z "$win_id" ]; then
    echo "no voidbound window found — is 'deno task tauri dev' running?" >&2
    exit 1
fi
if [ "$id_only" = 1 ]; then
    echo "$win_id"
    exit 0
fi

py=python3

capture_one() {
    local file="$1"
    echo "$(date "+%H:%M:%S") window=$win_id -> $file"
    screencapture -x -l"$win_id" "$file"
    if [ -n "$crop" ]; then
        local cropped="${file%.png}-crop.png"
        if "$py" -c "import PIL" 2>/dev/null; then
            "$py" - "$file" "$cropped" "$crop" "$scale" <<'EOF'
import sys
from PIL import Image
src, dest, region, scale = sys.argv[1:5]
x, y, w, h = (int(v) for v in region.split(","))
im = Image.open(src).crop((x, y, x + w, y + h))
im.resize((im.width * int(scale), im.height * int(scale))).save(dest)
EOF
            echo "         crop($crop) x$scale -> $cropped"
        else
            echo "Pillow not found; skipping crop" >&2
        fi
    fi
}

if [ "$count" -gt 1 ]; then
    for n in $(seq 1 "$count"); do
        capture_one "${out%.png}-$n.png"
        if [ "$n" -lt "$count" ]; then sleep "$interval"; fi
    done
else
    capture_one "$out"
fi
