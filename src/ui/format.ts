// Pure number-display helpers — no runtime imports, so
// tests/format_test.ts can exercise them under plain `deno test`.

/**
 * Formats a count for tight HUD spots (e.g. the resource bar): whole numbers
 * below `compactFrom` as-is, then k/M/B with one decimal while it fits in ~4
 * glyphs ("12.3k", "999k", "1.2M"). Values are floored, never rounded up — a
 * HUD should not show resources the player doesn't have yet. `compactFrom`
 * defaults to 10000 (four digits stay readable alone) and clamps to a
 * minimum of 1000 (the smallest unit suffix); pass a lower value for spots
 * that pack two numbers into one label, like the bar's "count/cap".
 */
export function formatCompactCount(
  value: number,
  compactFrom = 10_000,
): string {
  const floored = Math.floor(value);
  const abs = Math.abs(floored);
  if (abs < Math.max(compactFrom, 1_000)) return String(floored);

  const units: Array<{ scale: number; suffix: string }> = [
    { scale: 1e9, suffix: "B" },
    { scale: 1e6, suffix: "M" },
    { scale: 1e3, suffix: "k" },
  ];
  for (const { scale, suffix } of units) {
    if (abs < scale) continue;
    // Floor at one-decimal precision, then drop a trailing ".0".
    const scaled = Math.floor((abs / scale) * 10) / 10;
    const text = scaled >= 100 ? String(Math.floor(scaled)) : String(scaled);
    return (floored < 0 ? "-" : "") + text + suffix;
  }
  return String(floored);
}
