# Code Review Findings & Action Plan

Full-project review performed 2026-07-04 (all TS/Rust/Python sources, docs,
skills, configs; suspicious findings verified against asset files on disk and
Excalibur 0.32 internals in node_modules).

**How to use this file:** work through items one by one across sessions. Check
off (`[x]`) each item when its fix is committed and `deno task fmt` passes.
Items are grouped by category and ordered by priority within each group. Each
item lists the evidence and a concrete fix plan.

---

## 1. Bugs

### 1.1 `module-*` tilesets registered with wrong grid (CONFIRMED)

- [x] Fix `moduleDefs` registration in `src/resources.ts`
- [x] Fix the documented pattern in `.claude/skills/add-tileset/SKILL.md`

**Evidence:** `art/gen_modules.sh` runs `sprite_transition.py` with
`-n 32 -z 256`, producing a 6\*6 grid of 32 frames (`module-base.png` on disk is
1536\*1536 — verified). But `src/resources.ts` (~line 105) auto-registers
`module-*` as `ad(name, src, 4, 4, 256, 16, 66)` — 4\*4 grid, 16 frames. The
SpriteSheet mis-slices the sheet, so the command module in the ship scene
animates through wrong cells (0-3, 6-9, 12-15, 18-21) and drops half the frames.

**Fix plan:**

1. Change `moduleDefs` to `ad(name, src, 6, 6, 256, 32, 66)`.
2. Update the auto-register table in `.claude/skills/add-tileset/SKILL.md`
   (`module-*.png` row: animated, 6\*6 grid, 256 px cells, 32 frames @ 66 ms)
   and remove the now-obsolete "every other animated tileset uses 32 frames"
   special-case note.
3. Add a guideline to CLAUDE.md: canonical animated sheet is 6\*6 / 32 frames @
   66 ms (see item 3.3).
4. Verify visually in the ship scene that the command module animation is smooth
   and complete.

### 1.2 HUD buttons have two live dispatch paths (double-fire risk)

- [x] Remove one of the two `onPressed` dispatch paths for HUD buttons

**Evidence:** `src/ui/hud.ts` (~line 224) registers `el.on("pointerup", ...)` on
each ScreenElement, AND `src/tiled-scene.ts` (~line 239) polls
`handle.tryPointerUp(screenPos)` on every confirmed tap — both call
`btn.onPressed()`. If Excalibur's ScreenElement pointer events fire (the comment
calls them "unreliable", implying they sometimes do), one tap runs the handler
twice. Harmless for `console.log` / `goToScene`, dangerous for a future "buy
item".

**Fix plan:** delete the `el.on("pointerup", ...)` registration in
`spawnHudGroup` and rely solely on the `tryPointerUp` poll from `TiledScene`
(the path we control). Keep the hit-test logic as is (it already accounts for
`hitPadding` via element width/height).

### 1.3 `returnVessel` bypasses the multiplayer event pattern

- [x] Route vessel returns through `VesselMoveEvent` / `applyVesselMoveEvent`

**Evidence:** the doc comment on `returnVessel` in `src/map-level.ts`
(~line 331) claims it "internally constructs a return VesselMoveEvent" — it
doesn't. It calls `vessel.moveTo()` directly, so a return would be invisible to
other clients. This is the one place the code violates the day-one event rule in
CLAUDE.md and `/add-game-event`.

**Fix plan:**

1. In `returnVessel`, construct a real `VesselMoveEvent` (same `vesselId`, dest
   = closest dock tile, fresh `dispatchedAt`/`arrivalAt`) and call
   `this.applyVesselMoveEvent(event)`.
2. Move the kill-on-arrival into the apply path: when a vessel's destination is
   a mothership dock tile, `applyVesselMoveEvent` schedules `kill()` +
   `vessels.delete()` on arrival (server-pushed returns must also despawn
   correctly).
3. Update the doc comment to match reality.

### 1.4 World-space action buttons fire on `pointerdown` instead of confirmed tap

- [x] Make TileActor arc buttons fire on tap confirmation (pointer-up, no drag)

**Evidence:** `src/tile-actor.ts` (~line 413) fires `btn.onPressed()` inside
`pointerdown`. Starting a drag-to-pan with a finger on a visible button triggers
the action immediately. Inconsistent with HUD buttons, which fire on confirmed
tap.

**Fix plan:** on button `pointerdown`, record the pressed button (and set
`suppressNextPress` as today) but defer `onPressed` to the scene's tap
confirmation. Simplest shape: `TileActor` exposes a
`pendingButton: ButtonDef | null`; `TiledScene.handleTap` checks the selected
actor's `pendingButton` before other handling and fires it there; any drag
(`hasDragged`) clears it. Coordinate with item 1.5 (same code path).

### 1.5 Forgetting `suppressNextPointerUp` in a button handler deselects the actor

- [x] Auto-suppress the pointer-up after any world-button press (framework
      level, not per-handler)
- [x] Fix ordering: check `suppressNextPointerUp` before polling HUD handles

**Evidence:** pressing e.g. the mothership's "Details" button (handler is a bare
`console.log`) ends with `handleTap` → no `pendingActor` → `handleEmptyTap` →
the mothership gets deselected. Only `dispatchVessel` remembers to set
`suppressNextPointerUp = true`. Every future handler must remember boilerplate
or inherit a subtle UX bug. Additionally, `src/tiled-scene.ts` `handleTap`
(~lines 239-242) polls HUD buttons **before** checking `suppressNextPointerUp`,
so a suppressed tap can still press a HUD button underneath.

**Fix plan:**

1. When a `TileActor` button press is dispatched (see 1.4), have the scene treat
   that pointer-up as consumed automatically — no handler-side flag needed for
   the common case.
2. Keep `suppressNextPointerUp` as an escape hatch, but move its check to the
   top of `handleTap`, before the HUD poll.
3. Update the "Input model" section of CLAUDE.md and the `/add-scene` skill
   accordingly (they currently instruct every handler to set the flag).

### 1.6 No drag threshold — real-device taps get swallowed as drags

- [x] Add a small movement threshold before a pointer-move counts as a drag

**Evidence:** `src/tiled-scene.ts` (~line 321) sets `hasDragged = true` on any
`move` event. Touch taps almost always jitter 1-3 px, so on real hardware many
taps will be misclassified as drags and do nothing.

**Fix plan:** track the pointer-down origin; only set `hasDragged = true` (and
start panning) once cumulative displacement exceeds ~5 px. Below the threshold,
ignore the move entirely so the camera doesn't micro-jitter.

### 1.7 Window resize is never handled

- [x] Recompute camera clamp bounds on resize
- [x] Reposition HUD groups on resize

**Evidence:** `TiledScene.setupScene` captures `drawW`/`drawH`/`minZoom` once;
`spawnHudGroup` computes positions from `engine.drawWidth/drawHeight` once at
spawn. Under `FitScreenAndFill` in a resizable desktop window, camera clamping
and HUD anchors go stale.

**Fix plan:**

1. Subscribe to Excalibur's screen resize event in `TiledScene`; recompute
   `drawW`, `drawH`, `minZoom`, then `clampCamera()`.
2. Either store each HUD group's `HudGroupDef` and respawn on resize, or add a
   `relayout(engine)` method to `HudGroupHandle` that recomputes element
   positions. Respawn-from-def is simpler and the groups are tiny.
3. Unsubscribe/guard appropriately per scene activation.

### 1.8 `applyVesselMoveEvent` ignores `dispatchedAt` / `arrivalAt`

- [x] Implement late-join lerp so the event fields keep their promise

**Evidence:** the `VesselMoveEvent` interface (and the `/add-game-event` skill)
promise that late-joining clients can lerp to the current position from
`dispatchedAt`/`arrivalAt`. The implementation always spawns at `srcCol/srcRow`
and plays the whole flight regardless of event age.

**Fix plan:** in `applyVesselMoveEvent`, when `Date.now() > dispatchedAt`,
compute progress `t = (now - dispatchedAt) / (arrivalAt - dispatchedAt)`
(clamped to [0, 1]), spawn the vessel at the interpolated world position, and
`moveTo` the destination from there (or snap to dest + arrival handling if
`t >= 1`). All events are local today so behavior is unchanged; the first
networked test becomes trivial.

### 1.9 `deno fmt` churns the generated map JSON

- [x] Exclude `src/assets/` from `deno fmt`

**Evidence:** `tools/tmj_to_tilemap.py` writes compact JSON
(`separators=(",", ":")`), but the committed `src/assets/ship-level.json` is
pretty-printed — `deno fmt` already reformatted it (1600+ line file). Every
regen + fmt cycle produces a giant no-op diff on a file that must never be
hand-edited.

**Fix plan:** add to `deno.json`:

```json
"fmt": { "exclude": ["src/assets/"] }
```

Then regenerate via `art/gen_ship_level.sh` to restore the compact form and
commit the stable representation.

### 1.10 Smaller corner cases (batch)

- [x] Surface scene-load failures: `setupScene()` is async and un-awaited in
      `onInitialize`; a `generate_map` error becomes an unhandled rejection and
      the scene silently never loads. Add a `.catch` that logs and shows a
      visible error (even a `console.error` + colored background is a start).
- [x] Pinch start with stale pointer1: `onP2Down` in `src/tiled-scene.ts`
      (~line 342) uses `pointer1.lastScreenPos`, which may be stale/(0,0) if
      finger 2 lands before finger 1 ever moved. Guard: only start a pinch if
      pointer1 is actually down; otherwise ignore pointer 2.
- [x] Wheel zoom can compute a negative factor: `1 - evt.deltaY * 0.01` goes
      negative for `deltaY > 100` (fast wheel). Clamp the factor (e.g. to [0.5,
      2] per event) before multiplying.
- [x] `vessels` map leak: entries are only deleted in `returnVessel`'s
      completion callback. Any other kill path leaks the map entry. Consider
      centralizing removal (e.g. a `removeVessel(id)` helper, or subscribing to
      the actor's `kill` event). Folds naturally into item 1.3's rework.
- [x] `crypto.randomUUID()` requires a secure context — fine under Tauri, can
      throw when serving the vite dev build over plain http on a LAN device. Add
      a tiny fallback ID helper if/when remote-device testing matters.

---

## 2. Documentation inaccuracies

### 2.1 The "Animations mutate the shared cached instance" caveat is wrong

- [x] Correct the caveat everywhere it appears

**Evidence:** `TilesetRegistry.getGraphic` constructs a **fresh** `ex.Animation`
on every call (`src/resources.ts` ~line 162). Verified against Excalibur 0.32
internals: animation-level tint/scale are applied via renderer state at draw
time (`Graphic._preDraw`), not written into the shared frame sprites. So effects
on Animations are per-instance and safe. The stale caveat appears in:

- `CLAUDE.md` ("Caveat: effects on `Animation` graphics mutate the shared cached
  instance")
- `src/ui/tile-ref.ts` (~lines 80-82, parseTileRef doc)
- `src/ui/button.ts` (~lines 66-67)
- `src/ui/badge.ts` (~lines 74-75)
- `src/map-loader.ts` (~lines 21-22, fitToTile doc)
- Auto-memory (`MEMORY.md` notes for this project)

**Fix plan:** one sweep updating all comments to the truth: "Sprites are shared
sheet instances (clone before mutating); Animations are constructed fresh per
getGraphic call, so per-instance effects are safe." Note the flip side:
fresh-per-call also means animations are not synchronized across consumers and
each has its own timer — document that instead, it's the actual gotcha.

### 2.2 `returnVessel` doc comment describes behavior the code doesn't have

- [x] Fixed as part of item 1.3 (comment updated when code is fixed)

### 2.3 CLAUDE.md claims web browser support that can't work today

- [x] Reword the Platform line or plan the web fallback

**Evidence:** CLAUDE.md says "Platform: Tauri desktop + web browser", but all
map data flows through Tauri IPC (`invoke("generate_map")`). A pure web build
has no backend and cannot load any scene.

**Fix plan:** short-term, reword to "Tauri desktop (web browser planned —
requires an HTTP fallback for `generate_map`)". Long-term (roadmap item): a
fetch-based map source behind the same `buildTileMap` signature.

### 2.4 `/gen-art` skill: HMR claim is false for the embedded map JSON

- [x] Add an explicit note about `include_str!` + cargo rebuild

**Evidence:** the skill's checklist says Vite HMR picks up regenerated assets.
True for PNGs; false for `src/assets/ship-level.json`, which is embedded into
the Rust binary via `include_str!` and only refreshes on a cargo rebuild
(restart `deno task tauri dev`).

**Fix plan:** update the checklist in `.claude/skills/gen-art/SKILL.md`: "PNGs
hot-reload via Vite; `ship-level.json` is embedded in Rust — restart `tauri dev`
(cargo rebuild) to see map changes."

### 2.5 README typos

- [x] Fix "requirments" → "requirements" (Fabrication Bay, Assembly Line) and
      "resource reqs" → "resource requirements" (Data Archive)

---

## 3. Design fidelity & guideline additions

Implementation is faithful to the README plan at this stage (event-modeled
actions, mothership/vessel vocabulary, portrait-mobile layout, command module
centerpiece). Gaps are "not built yet", not "built wrong" — except 1.3 above.

### 3.1 Promote the README "Ideas dump" into a structured roadmap

- [x] Create `ROADMAP.md` (or a README section) with phases

**Suggested phases:** (1) local gameplay loop — modules, resources, build
timers; (2) persistence — save/load via a Tauri command; (3)
server-authoritative events — WebSocket event bus, server time offsets,
snapshot + replay for late joiners; (4) alliances, seasons, world merging. Move
the README bullet ideas under the phase where they land.

### 3.2 Write a short server-architecture sketch

- [x] Document the intended server model that the event pattern presupposes (see
      `SERVER.md`)

**Why:** future event interfaces will be more consistent if the model (event
log, authoritative timestamps, verification, broadcast, late-join snapshot) is
written down once. Natural companion: pair `arrivalAt` precomputation with a
server-time-offset handshake so clients never trust `Date.now()`.

### 3.3 Guideline additions to CLAUDE.md

- [x] Canonical animated sheet spec: 6\*6 grid, 32 frames @ 66 ms (after 1.1)
- [x] Note that generated files under `src/assets/` are fmt-excluded (after 1.9)
- [x] Updated input-model rules once 1.4/1.5 land (auto-suppression replaces
      per-handler `suppressNextPointerUp` boilerplate)
- [x] Map JSON changes need a Rust rebuild in dev (mirror of 2.4)

---

## 4. Refactors / simplification

### 4.1 Deduplicate HUD group definitions between scenes

- [x] Extract a shared `addCommonHud()` helper

**Evidence:** `MapLevel.onInitialize` and `ShipLevel.onInitialize` define nearly
identical Shop/Events (top-right) and Mail/Items (bottom-right) groups; only the
big scene-switch button differs.

**Fix plan:** a protected helper on `TiledScene` (or a free function) taking the
scene-switch button def; both scenes call it. New scenes get the standard HUD
for free (`/add-scene` skill updated to mention it).

### 4.2 Kill the button-label boilerplate

- [x] Default button labels to `bordered: false, labelOffset: (0, -1)`

**Evidence:** `{ bordered: false, labelOffset: ex.vec(0, -1) }` is repeated on
~15 buttons across both scenes.

**Fix plan:** either make those the defaults when a label is attached to a
`ButtonDef` (resolve in `makeButtonGraphic`/label creation for buttons), or add
a `btnLabel(text)` helper in `src/ui/label.ts`. Prefer the default — callers
then pass plain strings.

### 4.3 Collapse the Rust rect table

- [x] Replace 170 lines of `Rect` struct literals in `src-tauri/src/lib.rs` with
      a `Rect::new(x, y, w, h, tile)` constructor or a
      `[(u32, u32, u32, u32, &str); N]` table + map

### 4.4 Deduplicate tileset auto-registration

- [x] Extract `autoRegister(prefix, makeDef)` in `src/resources.ts`

**Evidence:** the `buttonDefs` and `moduleDefs` glob-filter blocks are
copy-paste twins.

### 4.5 Add a minimal test suite + CI

- [ ] `deno test` for pure logic: `parseTileRef`, `resolveGraphicLayers`,
      `anchorFractions`, HUD layout math (`anchorLayout` / stacking),
      `closestDockTile`
- [ ] Python: a small test for `tmj_to_tilemap.py` (fixture .tmj → expected
      JSON)
- [ ] CI workflow: `deno fmt --check`, `deno check src/**/*.ts`, `cargo check`
      (and `cargo fmt --check`)
- [ ] Add a LICENSE file (repo currently has none)

**Note:** the registry/asset mismatch in 1.1 is exactly the class of drift a
tiny "PNG dimensions match TILESET_DEFS" test would catch — worth writing as a
`deno test` that reads PNG headers (width/height are in the IHDR chunk, no image
lib needed) and cross-checks `cols*tileSize` / `rows*tileSize`.

---

## 5. Future ideas (from README review — not action items yet)

- Zoom-at-cursor for wheel/pinch (currently zooms at screen center; feels off on
  trackpads).
- Resource bar HUD group — first real use of `HudGroupHandle.setBadge`.
- Minimap for the 100\*100 space map.
- Module placement grid in the ship view — natural next `/add-game-event`
  exercise (`BuildModuleEvent` with `completesAt` gives build timers for free).
- Save/persistence via a Tauri command before any server exists.
- Fog of war / radar radius tied to the Operations Center concept.
- Production hardening: set a real CSP in `tauri.conf.json` (currently `null`);
  drop `withGlobalTauri: true` (unused — npm API package is used).
- Notification badges wired to real event counts (Events/Mail buttons).

---

## Review notes

- Everything else cross-checked in CLAUDE.md, MEMORY, and the three skills
  against the code was **accurate** — the steering docs are in unusually good
  shape.
- All PNG assets verified against their registry rows; only `module-*` (item
  1.1) mismatches.
- Excalibur claims verified against `node_modules/excalibur` v0.32.0 source:
  `SpriteSheet.getSprite` throws on out-of-range (good errors for bad tileIds);
  `Animation._drawImage` delegates to the current frame graphic with
  animation-level transform/tint applied via renderer state.
