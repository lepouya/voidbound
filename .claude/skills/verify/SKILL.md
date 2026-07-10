---
name: verify
description: Launch the Voidbound Tauri dev app and verify a change by observing it at runtime — window screenshots, streamed client console, temporary drive hooks. Use whenever a change needs to be seen working in the real app (new gameplay action, scene/actor rendering, push-channel behavior), since there is no scripted-click or scene-level test coverage.
---

# Verifying Voidbound at runtime

There is no runtime/scene test coverage — the running app is the safety net
(CLAUDE.md § Testing). Verification here means: launch the dev app, drive the
changed code path, and capture what the window and the client console show. On
this machine there are **no accessibility permissions**, so taps/drags cannot be
scripted — flows are driven with temporary code hooks and observed via
screenshots.

## 1. Launch

```bash
# Stale-instance check first: a ghost window from a previous session runs
# pre-edit JS and falsifies screenshots. Exactly zero instances should exist.
ps -eo pid,lstart,command | grep target/debug/voidbound | grep -v grep

deno task tauri dev   # run in background; first build takes a minute or two
```

Wait until `ps` shows exactly **one** `target/debug/voidbound` whose start time
is after your edits. The webview's `console.warn/error` stream into the dev
task's output as `[vite] (client) [console.warn] ...` — read the task output
file for client-side logs and errors; no devtools needed.

### Rebuild/reload semantics (what an edit does to the running app)

- **Editing anything under `src-tauri/`** → the tauri watcher rebuilds and
  **relaunches the backend**: fresh in-memory `ServerState`, a new window
  (re-derive the window id below).
- **Editing frontend files** → Vite HMR reloads the page only; the backend keeps
  running, so server state (resources, vessels in flight, timers) survives and
  reaches the new page via the `load_game_state` snapshot — reloading mid-flow
  is itself a good snapshot/replay test.

## 2. Window screenshots

Use the checked-in helper — it finds the app window (CGWindowList; AppleScript
window ids fail on Tauri), captures without stealing focus, and prints a
wall-clock timestamp with every frame:

```bash
tools/verify_capture.sh -o "$SCRATCH/step1.png"          # one frame
tools/verify_capture.sh -o "$SCRATCH/bar.png" \
    -c 60,130,390,90                                     # + HUD crop, upscaled
tools/verify_capture.sh -o "$SCRATCH/fly.png" -n 4 -i 5  # burst (motion)
tools/verify_capture.sh --id                             # window id only
```

Write captures to the session scratchpad, never into the repo. The `-c` crop
(image pixels, `X,Y,W,H`) is for reading small HUD text like resource-bar digits
— illegible at full-window scale; `-c 60,130,390,90` is the resource bar at
default window size. After a backend relaunch the window id changes — the script
re-derives it on every call, so nothing to fix up manually.

## 3. Driving flows without clicks

Add **temporary hooks marked `// TEMP-VERIFY`**, observe, then revert every one
of them:

- **Start scene**: `main.ts` `game.start("ship", ...)` → `"map"` (or wherever
  the change lives) to skip un-clickable navigation.
- **Auto-invoke the action**: a `setTimeout` in the scene's `onInitialize` that
  calls the same private action method the button calls (e.g.
  `this.mineAsteroid(id)`) — this exercises the full IPC → push → reconcile
  path; only the button-to-handler arrow is left unobserved.
- **Camera**: temporarily return a smaller zoom from `initialCameraTarget()` to
  fit the relevant world area in one screenshot.
- **Time compression**: hours-long timers (mining windows, build times) can be
  compressed by temporarily cranking the Rust constant (e.g.
  `MINE_UNITS_PER_HOUR`) — remember this relaunches the backend, and unit tests
  asserting real values will fail until reverted.

**Cleanup is part of the verification**: greping `src/` and `src-tauri/src/` for
`TEMP-VERIFY` must come back empty, then `deno task format` +
`deno task check` + `deno task test` must pass before reporting.

## 4. Known-good sanity checks and traps

- **Production tick**: a fresh backend with only the level-1 Command Module
  gains exactly +1 of each material per 5 s tick (credits stay 0), so
  resource-bar counts = seconds-since-backend-start / 5. Any deviation on a
  fresh instance is a real bug; measure with two timestamped screenshots.
- **Clock-step artifact**: on a long-running instance, counts drifting above the
  tick rate has (so far) been the wall clock stepping backwards (NTP):
  production re-anchors and re-credits the replayed window by design. Confirm
  against a fresh relaunch before treating it as a state-machine bug.
- **`Cannot kill actor ... never added to the Scene` warnings** are pre-existing
  owner-label churn from `TileActor.setOwner()`, not a new-bug signal.
- Screenshots of numbers are evidence only with a wall-clock timestamp taken at
  capture time (`verify_capture.sh` prints one per frame) — turn-to-turn latency
  makes "just now" estimates wrong by minutes.

## 5. Shut down

Kill the app and the dev task when done (`pkill -f target/debug/voidbound`), so
the next session's stale-instance check starts clean.
