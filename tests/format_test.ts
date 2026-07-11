import { assertEquals } from "jsr:@std/assert@1";

import { formatCompactCount } from "../src/ui/format.ts";

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
