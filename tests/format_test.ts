import { assertEquals } from "@std/assert";

import {
  formatCompactCount,
  formatDuration,
  formatTimeAgo,
} from "../src/ui/format.ts";

Deno.test("small counts render as plain floored integers", () => {
  assertEquals(formatCompactCount(0), "0");
  assertEquals(formatCompactCount(7), "7");
  assertEquals(formatCompactCount(42.9), "42");
  assertEquals(formatCompactCount(9_999), "9999");
});

Deno.test("thousands get a k suffix with one floored decimal", () => {
  assertEquals(formatCompactCount(10_000), "10k");
  assertEquals(formatCompactCount(12_345), "12.3k");
  assertEquals(formatCompactCount(99_990), "99.9k");
});

Deno.test("three-digit scaled values drop the decimal", () => {
  assertEquals(formatCompactCount(123_456), "123k");
  assertEquals(formatCompactCount(999_999), "999k");
});

Deno.test("millions and billions use M and B", () => {
  assertEquals(formatCompactCount(1_000_000), "1M");
  assertEquals(formatCompactCount(2_340_000), "2.3M");
  assertEquals(formatCompactCount(1_250_000_000), "1.2B");
});

Deno.test("values are floored, never rounded up past the true count", () => {
  // 19.99k must not display as "20k".
  assertEquals(formatCompactCount(19_990), "19.9k");
  assertEquals(formatCompactCount(999_999_999), "999M");
});

Deno.test("negative values keep the sign", () => {
  assertEquals(formatCompactCount(-5), "-5");
  assertEquals(formatCompactCount(-12_345), "-12.3k");
});

Deno.test("a lower compactFrom compacts small thousands (bar count/cap)", () => {
  assertEquals(formatCompactCount(985, 1_000), "985");
  assertEquals(formatCompactCount(1_000, 1_000), "1k");
  assertEquals(formatCompactCount(3_000, 1_000), "3k");
  assertEquals(formatCompactCount(2_950, 1_000), "2.9k");
  // The threshold clamps at 1000, the smallest unit suffix.
  assertEquals(formatCompactCount(500, 0), "500");
});

Deno.test("durations under a minute render seconds only", () => {
  assertEquals(formatDuration(0), "0s");
  assertEquals(formatDuration(1_000), "1s");
  assertEquals(formatDuration(59_000), "59s");
});

Deno.test("sub-second remainders round up, never down to a premature 0s", () => {
  assertEquals(formatDuration(1), "1s");
  assertEquals(formatDuration(59_001), "1m");
  assertEquals(formatDuration(-5_000), "0s");
});

Deno.test("durations under an hour render minutes and seconds", () => {
  assertEquals(formatDuration(60_000), "1m");
  assertEquals(formatDuration(192_000), "3m 12s");
  assertEquals(formatDuration(3_599_000), "59m 59s");
});

Deno.test("durations with hours drop the seconds", () => {
  assertEquals(formatDuration(3_600_000), "1h");
  assertEquals(formatDuration(7_500_000), "2h 5m");
  assertEquals(formatDuration(7_500_999), "2h 5m");
  assertEquals(formatDuration(43_200_000), "12h");
});

Deno.test("time-ago: under a minute (or negative) is 'just now'", () => {
  assertEquals(formatTimeAgo(0), "just now");
  assertEquals(formatTimeAgo(59_000), "just now");
  assertEquals(formatTimeAgo(-5_000), "just now");
});

Deno.test("time-ago: floors to the largest unit, never rounds up", () => {
  assertEquals(formatTimeAgo(60_000), "1m ago");
  assertEquals(formatTimeAgo(119_999), "1m ago");
  assertEquals(formatTimeAgo(3_599_000), "59m ago");
  assertEquals(formatTimeAgo(3_600_000), "1h ago");
  assertEquals(formatTimeAgo(86_399_000), "23h ago");
  assertEquals(formatTimeAgo(86_400_000), "1d ago");
  assertEquals(formatTimeAgo(259_200_000), "3d ago");
});
