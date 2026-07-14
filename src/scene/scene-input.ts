import * as ex from "excalibur";

/**
 * Callbacks a TiledScene supplies so SceneInputController can turn raw
 * pointer/wheel events into pan, zoom, and tap actions without knowing
 * anything about actors, HUD, or dialogs.
 */
export interface SceneInputHandlers {
  /** True while a modal dialog captures input — disables camera pan/zoom,
   *  but taps are still forwarded (the dialog needs pointer-up to work its
   *  own buttons/scrim). */
  isModalCaptured(): boolean;
  /** Pan the camera by a screen-space delta (handler divides by zoom). */
  pan(deltaScreenX: number, deltaScreenY: number): void;
  /** Zoom the camera to newZoom, keeping anchorWorld fixed on screen. */
  zoomAtAnchor(anchorWorld: ex.Vector, newZoom: number): void;
  /** Current camera zoom, for deriving a new zoom from a wheel/pinch factor. */
  currentZoom(): number;
  /** Dispatch a confirmed tap (pointer down+up with no drag in between). */
  onTap(screenPos: ex.Vector): void;
  /** A vertical scroll gesture (drag or wheel) while a modal dialog captures
   *  input: positive deltaY means "reveal more content below" (a finger
   *  dragging up, or a wheel/trackpad scrolling down — same convention as
   *  `pan`'s delta) — the dialog's scrollable content, if any, moves with
   *  it. See DialogDef.scroll in ui/dialog.ts. */
  onModalScroll(deltaY: number): void;
  /** Called whenever pointer state resets (tap dispatched, drag cancelled,
   *  scene deactivated) so the scene can discard gesture-scoped actor state
   *  (e.g. a pending world-button press that never got confirmed). */
  onPointerReset(): void;
}

/**
 * Owns the raw drag-vs-tap/pinch/wheel pointer state machine shared by every
 * TiledScene and registers the underlying Excalibur pointer/wheel/resize
 * listeners. Decides *whether* a gesture is a pan, a pinch-zoom, or a tap;
 * the `SceneInputHandlers` callbacks decide what that pan/zoom/tap *does*.
 */
export class SceneInputController {
  // Movement below this many screen px from the pointer-down position is
  // jitter, not a drag — touch taps on real devices wobble a few px.
  private static readonly DRAG_THRESHOLD_PX = 5;

  private hasDragged = false;
  private lastScreenPos: ex.Vector | null = null;
  private pinchDistance: number | null = null;
  /** Escape hatch for scenes: skip tap dispatch on the next pointer-up.
   *  World-space button presses are consumed automatically by the tap
   *  dispatch chain, so button handlers never need to set this. */
  suppressNextPointerUp = false;

  private cleanup: Array<() => void> = [];

  constructor(private readonly handlers: SceneInputHandlers) {}

  /** Reset all gesture-tracking state (tap dispatched, drag cancelled, scene
   *  deactivated) and notify the scene to discard gesture-scoped state. */
  reset(): void {
    this.hasDragged = false;
    this.lastScreenPos = null;
    this.pinchDistance = null;
    this.suppressNextPointerUp = false;
    this.handlers.onPointerReset();
  }

  private applyPinchZoom(a: ex.Vector, b: ex.Vector, engine: ex.Engine): void {
    if (this.pinchDistance === null || this.handlers.isModalCaptured()) {
      return;
    }
    const newDist = a.distance(b);
    const midpoint = engine.screen.screenToWorldCoordinates(
      a.add(b).scale(0.5),
    );
    this.handlers.zoomAtAnchor(
      midpoint,
      this.handlers.currentZoom() * (newDist / this.pinchDistance),
    );
    this.pinchDistance = newDist;
  }

  register(engine: ex.Engine): void {
    const pointer1 = engine.input.pointers.primary;
    const pointer2 = engine.input.pointers.at(1);

    const onP1Down = (evt: ex.PointerEvent) => {
      this.hasDragged = false;
      this.lastScreenPos = evt.screenPos.clone();
    };
    pointer1.on("down", onP1Down);

    const onP1Move = (evt: ex.PointerEvent) => {
      if (!this.lastScreenPos) return;
      if (this.pinchDistance !== null) {
        const p2 = pointer2.lastScreenPos;
        if (p2) this.applyPinchZoom(evt.screenPos, p2, engine);
        this.lastScreenPos = evt.screenPos.clone();
        return;
      }
      // Until the threshold is crossed, ignore the move entirely: the tap
      // stays a tap and the camera doesn't micro-jitter. lastScreenPos is
      // only updated once dragging starts, so before that it still holds the
      // pointer-down position.
      if (
        !this.hasDragged &&
        evt.screenPos.distance(this.lastScreenPos) <
          SceneInputController.DRAG_THRESHOLD_PX
      ) {
        return;
      }
      this.hasDragged = true;
      // Modal input capture: keep tracking the drag (so a press that slides
      // off a dialog button still cancels the tap) but never pan the camera —
      // forward it to the dialog as a scroll gesture instead.
      if (this.handlers.isModalCaptured()) {
        const delta = this.lastScreenPos.sub(evt.screenPos);
        this.handlers.onModalScroll(delta.y);
        this.lastScreenPos = evt.screenPos.clone();
        return;
      }
      const delta = this.lastScreenPos.sub(evt.screenPos);
      this.handlers.pan(delta.x, delta.y);
      this.lastScreenPos = evt.screenPos.clone();
    };
    pointer1.on("move", onP1Move);

    const onP1Up = () => {
      if (
        !this.hasDragged && this.lastScreenPos && !this.suppressNextPointerUp
      ) {
        this.handlers.onTap(this.lastScreenPos);
      }
      this.reset();
    };
    pointer1.on("up", onP1Up);

    const onP1Cancel = () => this.reset();
    pointer1.on("cancel", onP1Cancel);

    const onP2Down = (evt: ex.PointerEvent) => {
      // Only start a pinch if finger 1 is actually down. Use our tracked
      // position — pointer1.lastScreenPos can be stale/(0,0) if finger 1
      // never moved before finger 2 landed.
      if (!this.lastScreenPos) return;
      this.pinchDistance = this.lastScreenPos.distance(evt.screenPos);
      this.hasDragged = true;
    };
    pointer2.on("down", onP2Down);

    const onP2Move = (evt: ex.PointerEvent) => {
      if (this.pinchDistance === null) return;
      const p1 = pointer1.lastScreenPos;
      if (p1) this.applyPinchZoom(p1, evt.screenPos, engine);
    };
    pointer2.on("move", onP2Move);

    const endPinch = () => {
      this.pinchDistance = null;
    };
    pointer2.on("up", endPinch);
    pointer2.on("cancel", endPinch);

    // Trackpad scroll pans; trackpad pinch arrives as wheel + ctrlKey and zooms
    const onWheel = (evt: ex.WheelEvent) => {
      // Modal input capture: a wheel/trackpad scroll moves the dialog's
      // scrollable content, if any, instead of the camera or its zoom.
      if (this.handlers.isModalCaptured()) {
        this.handlers.onModalScroll(evt.deltaY);
        return;
      }
      if ((evt.ev as WheelEvent).ctrlKey) {
        // Clamp the per-event factor: a fast wheel can send deltaY > 100,
        // which would make the factor zero or negative. evt.x/y is the
        // pointer's world position, the zoom anchor.
        this.handlers.zoomAtAnchor(
          ex.vec(evt.x, evt.y),
          this.handlers.currentZoom() * ex.clamp(1 - evt.deltaY * 0.01, 0.5, 2),
        );
      } else {
        this.handlers.pan(evt.deltaX, evt.deltaY);
      }
    };
    engine.input.pointers.on("wheel", onWheel);

    this.cleanup = [
      () => pointer1.off("down", onP1Down),
      () => pointer1.off("move", onP1Move),
      () => pointer1.off("up", onP1Up),
      () => pointer1.off("cancel", onP1Cancel),
      () => pointer2.off("down", onP2Down),
      () => pointer2.off("move", onP2Move),
      () => pointer2.off("up", endPinch),
      () => pointer2.off("cancel", endPinch),
      () => engine.input.pointers.off("wheel", onWheel),
    ];
  }

  unregister(): void {
    for (const fn of this.cleanup) fn();
    this.cleanup = [];
  }
}
