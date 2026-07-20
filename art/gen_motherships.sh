#!/usr/bin/env bash
# Generate vector SVG mothership spritesheets (`mothership-1`) across states (`base`, `idle`, `damaged`)
# and relations (`self`, `allies`, `neutral`, `enemy`).
#
# Run from art/ or workspace root. Outputs: src/assets/mothership-1-<state>-<relation>.png

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

GEN_SCRIPT="tools/svg_mothership_gen.py"
SOURCE_SVG="art/motherships/mothership-1.svg"
DEST_DIR="src/assets"

RELATIONS=("self" "allies" "neutral" "enemy")
STATES=("base" "idle" "damaged")

echo "Generating mothership-1 vector spritesheets (3 states x 4 relations = 12 sheets)..."

for rel in "${RELATIONS[@]}"; do
  for st in "${STATES[@]}"; do
    dest_file="${DEST_DIR}/mothership-1-${st}-${rel}.png"
    python3 "${GEN_SCRIPT}" \
      -s "${SOURCE_SVG}" \
      -z 256 \
      -n 32 \
      -c 6 \
      -r 6 \
      --state "${st}" \
      --relation "${rel}" \
      -d "${dest_file}"
  done
done

echo "All 12 mothership-1 spritesheets generated successfully in ${DEST_DIR}/"
