// Pure button-label defaults. Keep this separate from label.ts so Deno tests
// do not need to load Excalibur just to cover placement policy.

/** Vertical alignment for a label rendered on a button face. */
export type ButtonLabelVerticalAlign = "top" | "middle" | "bottom";

/** Default label offset in font-size units for a button label position. */
export function defaultButtonLabelOffset(
  position: "below" | "center" | undefined,
): { x: number; y: number } {
  return { x: 0, y: position === "center" ? 0 : -1 };
}

/**
 * Placement and anchor for a button label. A below-button label stays
 * top-anchored; labels on the button face can align to its top, middle, or
 * bottom edge.
 */
export function buttonLabelPlacement(
  position: "below" | "center" | undefined,
  verticalAlign: ButtonLabelVerticalAlign | undefined,
  buttonHeight: number,
  labelPad: number,
): { y: number; anchor: "top-center" | "middle-center" | "bottom-center" } {
  if (position !== "center") {
    return { y: buttonHeight / 2 + labelPad, anchor: "top-center" };
  }

  switch (verticalAlign ?? "middle") {
    case "top":
      return { y: -buttonHeight / 2 + labelPad, anchor: "top-center" };
    case "bottom":
      return { y: buttonHeight / 2 - labelPad, anchor: "bottom-center" };
    case "middle":
      return { y: 0, anchor: "middle-center" };
  }
}
