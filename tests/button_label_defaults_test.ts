import { assertEquals } from "@std/assert";

import {
  buttonLabelPlacement,
  defaultButtonLabelOffset,
} from "../src/ui/button-label-defaults.ts";

Deno.test("centered button labels default to no offset", () => {
  assertEquals(defaultButtonLabelOffset("center"), { x: 0, y: 0 });
});

Deno.test("below-button labels retain their upward default offset", () => {
  assertEquals(defaultButtonLabelOffset("below"), { x: 0, y: -1 });
  assertEquals(defaultButtonLabelOffset(undefined), { x: 0, y: -1 });
});

Deno.test("centered button labels support top, middle, and bottom alignment", () => {
  assertEquals(buttonLabelPlacement("center", "top", 28, 3), {
    y: -11,
    anchor: "top-center",
  });
  assertEquals(buttonLabelPlacement("center", "middle", 28, 3), {
    y: 0,
    anchor: "middle-center",
  });
  assertEquals(buttonLabelPlacement("center", "bottom", 28, 3), {
    y: 11,
    anchor: "bottom-center",
  });
});

Deno.test("below-button labels keep their placement regardless of face alignment", () => {
  assertEquals(buttonLabelPlacement("below", "bottom", 28, 3), {
    y: 17,
    anchor: "top-center",
  });
});
