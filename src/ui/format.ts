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

/**
 * Formats a millisecond duration for countdowns and estimates ("42s",
 * "3m 12s", "2h 5m"): the two largest nonzero units, with seconds dropped
 * once hours appear. Sub-second remainders round *up* — a countdown should
 * show "1s", not flash "0s" while time is still left — and anything at or
 * below zero is "0s".
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

/**
 * Formats an elapsed millisecond duration as a relative "ago" label (the
 * P1.21 Mail panel's notification timestamps): "just now" under a minute,
 * then the single largest unit ("42m ago", "3h ago", "5d ago"). Unlike
 * formatDuration (a countdown, rounds up so it never flashes "0s" early),
 * this floors — an elapsed time should never claim more has passed than
 * actually has.
 */
export function formatTimeAgo(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  if (totalSeconds < 60) return "just now";
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
