# Code Review Findings & Action Plan

Full-project review performed 2026-07-04. All original findings (sections 1-4:
bugs, documentation inaccuracies, design-fidelity items, refactors) were fixed
across subsequent sessions and **verified complete on 2026-07-04** — code
inspected against each fix plan, `deno task fmt` clean, all `deno` and Python
tests passing. See git history (`CODE_REVIEW x.y` commit suffixes) for the
individual fixes; completed items have been removed from this file to keep it
focused on what's left.

Dropped by owner decision (not a todo): adding a LICENSE file.

---

## Remaining items

None — all review findings are resolved. R1 (test coverage beyond pure-data
modules) was completed by extracting the decision logic into pure modules
(`src/ui/tile-ref-parse.ts`, `src/ui/hud-layout.ts`, `src/grid-math.ts`) with
suites in `tests/`; the extraction also surfaced and fixed a latent half-button
offset in the (previously unused) `'center'` HUD stack direction.

---

## Future ideas (not action items yet)

- Zoom-at-cursor for wheel/pinch (currently zooms at screen center; feels off on
  trackpads).
- Resource bar HUD group — first real use of `HudGroupHandle.setBadge`.
  (Scheduled in ROADMAP.md phase 1.)
- Minimap for the 100\*100 space map.
- Module placement grid in the ship view — natural next `/add-game-event`
  exercise. (Scheduled in ROADMAP.md phase 1.)
- Save/persistence via a Tauri command before any server exists. (Scheduled in
  ROADMAP.md phase 2.)
- Fog of war / radar radius tied to the Operations Center concept.
- Production hardening: set a real CSP in `tauri.conf.json` (currently `null`);
  drop `withGlobalTauri: true` (unused — npm API package is used).
- Notification badges wired to real event counts (Events/Mail buttons).
