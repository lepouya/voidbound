/** Pure cache-key comparison for WarpPicker's live footprint preview. Kept
 * free of Excalibur so same-position state updates can be regression-tested.
 */
export interface WarpPickerPreviewKey {
  col: number;
  row: number;
  /** Authoritative GameState revision observed when the preview was drawn. */
  stateRevision: number;
}

/** A preview must refresh when either its camera-derived tile or the
 * authoritative state it reads (occupancy and fuel) has changed. */
export function shouldRecomputeWarpPreview(
  previous: WarpPickerPreviewKey | null,
  next: WarpPickerPreviewKey,
): boolean {
  return previous === null ||
    previous.col !== next.col ||
    previous.row !== next.row ||
    previous.stateRevision !== next.stateRevision;
}
