---
name: verify
description: Launch the Voidbound Tauri dev app and verify a change by observing it at runtime — window screenshots, streamed client console, temporary drive hooks. Use whenever a change needs to be seen working in the real app (new gameplay action, scene/actor rendering, push-channel behavior), since there is no scripted-click or scene-level test coverage.
---

# Verifying Voidbound at runtime

There is no runtime/scene test coverage — the running app is the safety net
(AGENTS.md § Testing). Verification here means: launch the dev app, drive the
changed code path, and capture what the window and the client console show. On
this machine there are **no accessibility permissions**, so taps/drags cannot be
scripted — flows are driven with temporary code hooks and observed via
screenshots.

**Model:** the checklist below is mechanical (launch, screenshot, tail logs,
grep for leftover hooks, run the gate) and doesn't need extra reasoning weight.
If the active model is materially more capable or costly than a routine
verification run requires, and the agent environment supports delegation,
delegate the whole run to a standard-capability subagent. Give it the change
under test, the code path to drive, the pass criteria, and these skill steps.
Otherwise follow the steps below directly — no need to delegate for its own
sake.

## 1. Launch — `tools/verify_dev.sh`

All process-lifecycle chains (launch, wait-for-build, log tail, forced reload,
shutdown) live in the checked-in `tools/verify_dev.sh` — use it instead of
re-deriving `ps`/`until`/`pkill` chains, which each need a fresh permission
approval:

```bash
tools/verify_dev.sh status     # stale-instance check: dev task, app, window id
tools/verify_dev.sh start      # launch `deno task tauri dev` in background,
                               # wait for the app process + window (refuses to
                               # start over an existing instance); first build
                               # takes minutes — give the call a large timeout
tools/verify_dev.sh wait       # wait for app + window to (re)appear, e.g.
                               # after a src-tauri/ edit relaunches the backend
tools/verify_dev.sh log -n 40                  # timestamped dev-task log tail
tools/verify_dev.sh log -s 17:26:37 -g vite    # lines since a time / matching
tools/verify_dev.sh reload     # touch src/main.ts -> Vite full page reload;
                               # prints the reload time + the log it produced
tools/verify_dev.sh stop       # kill app + dev task tree, confirm none remain
```

A stale instance from a previous session runs pre-edit JS and falsifies
screenshots — `start` enforces the zero-instance precondition and errors out if
one exists (`stop` first). The webview's `console.warn/error` stream into the
dev log as `[vite] (client) [console.warn] ...` — read them via
`verify_dev.sh log`; no devtools needed. Every log line is prefixed with a
wall-clock `HH:MM:SS` at emission time, so `log -s <time>` correlates directly
with the timestamps `verify_capture.sh` prints per frame.

### Rebuild/reload semantics (what an edit does to the running app)

- **Editing anything under `src-tauri/`** → the tauri watcher rebuilds and
  **relaunches the backend**: fresh in-memory `ServerState`, a new window
  (re-derive the window id below).
- **Editing frontend files** → Vite HMR reloads the page only; the backend keeps
  running, so server state (resources, vessels in flight, timers) survives and
  reaches the new page via the `load_game_state` snapshot — reloading mid-flow
  is itself a good snapshot/replay test. `verify_dev.sh reload` forces one
  without editing anything (a bare `touch` is enough for Vite).
- **After a backend relaunch** the window id changes — `verify_capture.sh`
  re-derives it per call; run `verify_dev.sh wait` to block until the new
  process + window are up before capturing.

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

`tools/verify_dev.sh stop` when done — it kills the app and the whole dev-task
tree and confirms nothing is left, so the next session's stale-instance check
starts clean.
