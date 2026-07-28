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
tools/verify_dev.sh start      # launch `deno task tauri dev` in the foreground;
                               # keep the returned exec session open. Trailing
                               # args reach the app binary (see App CLI flags)
tools/verify_dev.sh wait       # wait for app + window to (re)appear, e.g.
                               # after start or a backend relaunch; first build
                               # can take minutes, so use a large timeout
tools/verify_dev.sh log -n 40                  # timestamped dev-task log tail
tools/verify_dev.sh log -s 17:26:37 -g vite    # lines since a time / matching
tools/verify_dev.sh reload     # touch src/main.ts -> Vite full page reload;
                               # prints the reload time + the log it produced
tools/verify_dev.sh stop       # kill app + dev task tree, confirm none remain
```

Run `start` as a long-lived exec call with a TTY and a short initial yield. It
must return a live session ID rather than exit; retain that ID for the whole
verification. In a separate call, run `wait`, then capture screenshots and read
logs while the start session remains open. Do not background or `nohup` the dev
task: the command runner cleans up background descendants when their launching
tool call returns, which makes the first window disappear before capture.

A stale instance from a previous session runs pre-edit JS and falsifies
screenshots — `start` enforces the zero-instance precondition and errors out if
one exists (`stop` first). The webview's `console.warn/error` stream into the
dev log as `[vite] (client) [console.warn] ...` — read them via
`verify_dev.sh log`; no devtools needed. Every log line is prefixed with a
wall-clock `HH:MM:SS` at emission time, so `log -s <time>` correlates directly
with the timestamps `verify_capture.sh` prints per frame.

### App CLI flags (`start` passes trailing args through)

`src-tauri/src/lib.rs` parses three startup flags, and `verify_dev.sh start`
forwards anything after the subcommand to the app binary:

```bash
tools/verify_dev.sh start --time-scale 60   # scheduler timers run 60x
tools/verify_dev.sh start --player "Tester" # profile to load/create
tools/verify_dev.sh start --restore-backup 2
```

`--time-scale` is the right tool for hours-long timers — it needs no code edit,
no backend relaunch, and leaves the unit tests alone. `--player` with an unknown
name creates a fresh profile inside the existing world, keeping every other
player's state.

### Save state — a backend relaunch is not a fresh player

The local system persists to
`~/Library/Application Support/com.voidbound.app/local-system.json` (plus five
`.bak` rotations and a `.lock`), so relaunching the backend **restores that
save**. "Fresh backend" and "fresh player" are different things: a relaunch
alone keeps whatever level, resources, and modules the last session ended with.

Verifying against a new player profile means clearing that directory — which is
destroying the user's own game, so back it up first and restore it after:

```bash
cp -a ~/Library/Application\ Support/com.voidbound.app/. "$SCRATCH/save-backup/"
rm -f ~/Library/Application\ Support/com.voidbound.app/local-system.json*
# ... run the verification ...
tools/verify_dev.sh stop     # MUST precede the restore
cp -a "$SCRATCH/save-backup/." ~/Library/Application\ Support/com.voidbound.app/
shasum ~/Library/Application\ Support/com.voidbound.app/local-system.json \
       "$SCRATCH/save-backup/local-system.json"   # confirm identical
```

Stop the app _before_ restoring: `persist_on_exit` writes the save on shutdown
and would overwrite whatever you just put back.

Clear the file when the world itself is under test (spawn placement, asteroid
seeding, first-boot state); prefer `--player` when you only need a fresh player
in the world that's already there.

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

## 2. Window screenshots — and state dumps when they aren't enough

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

### When a screenshot can't tell you why

A screenshot proves what rendered; it often can't distinguish _why_. "Empty
space" reads identically whether the actors are missing, the state table is
empty, or the camera is parked somewhere else entirely — and those have
completely different causes. A one-line `console.warn` dumping the relevant
state settles it immediately, and streams into the dev log like any other client
console output:

```ts
// TEMP-VERIFY
console.warn(
  "TEMP-VERIFY asteroids=",
  gameState.asteroids.size,
  "ownShip=",
  this.mothershipSync.ownShip?.pos?.toString(),
  "camera=",
  this.camera.pos.toString(),
);
```

That one line is what turned "the map looks empty after a retry" into a located
bug (the camera never re-centred, so the AOI window followed it into the empty
core and despawned everything). Reach for a state dump as soon as a screenshot
leaves you guessing between two explanations — don't burn captures trying to
infer it visually.

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
- **Time compression**: use the `--time-scale` flag (§ 1), not a code edit.
  Editing a Rust constant like `MINE_UNITS_PER_HOUR` relaunches the backend and
  breaks the unit tests asserting the real value until reverted; the flag costs
  neither.
- **Step through a multi-part flow with one hook.** A single module-level
  constant the hook switches on beats a pile of one-off `setTimeout`s: change
  the constant, Vite reloads the page, the backend (and all its state) survives,
  and one hook covers a dozen checks across a run.

  ```ts
  // TEMP-VERIFY: "" | "command" | "build" | "do-hire"
  const TEMP_VERIFY_STEP = "do-hire";
  ```

  Do **not** try to read the step from a URL query parameter — the Tauri
  window's URL isn't yours to set.
- **Dialog buttons**: put the timer on the button's own `onPressed` closure
  inside the dialog builder, so the genuinely wired handler runs rather than a
  reimplementation of it. Same guarantee as above: only the pointer dispatch
  goes unobserved.
- **Error and recovery paths** need a failure that _clears_, or Retry has
  nothing to recover from. A module-level one-shot is enough:

  ```ts
  let attempts = 0; // TEMP-VERIFY: fail the first attempt only
  if (attempts++ === 0) throw new Error("TEMP-VERIFY forced failure");
  ```

  Injecting a permanent failure only ever shows the error state; the half worth
  seeing is the app coming back.

**Confirm the action was accepted — never infer it from a screenshot.** Calling
an action method directly skips the client-side resolution the button does
first, so arguments that look right can still be rejected (e.g. passing a tapped
tile where `request_build_module` wants the module's anchor). A rejection
surfaces as a console warning and _no visible change at all_. After every driven
action, check `verify_dev.sh log -g "rejected"`.

**Cleanup is part of the verification**: greping `src/` and `src-tauri/src/` for
`TEMP-VERIFY` must come back empty, then `deno task format` +
`deno task check` + `deno task lint` + `deno task test` must pass before
reporting. `git diff --stat` on the files you hooked is a good second check —
anything you added and removed cleanly should show no diff at all.

## 4. Known-good sanity checks and traps

- **Production tick**: a **cleared save** (§ 1 — not merely a relaunched
  backend) starts at 100 of each material with only the level-1 Command Module,
  which produces 12/min of each — one per 5 s tick, credits staying 0. Measure
  across two timestamped screenshots ~60 s apart and expect +12; a shorter
  window quantises badly against the 5 s tick. Any deviation on a genuinely
  fresh profile is a real bug. On a restored save the rate reflects whatever
  modules and crew that save has, so it proves nothing on its own — derive the
  expected rate from the module levels, or clear the save.
- **Understaffed producers halve their output**, so a producer's contribution on
  a fresh profile (0 crew) is half its catalogued rate. The Command Module is
  never damped. A level-1 refinery alongside the starting Command Module gives
  12 + (24 / 2) = 24/min of construction, not 36.
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

Send Ctrl-C to the retained start session when done and poll it until it reports
completion, then run `tools/verify_dev.sh stop` as a cleanup confirmation and
fallback. This lets Tauri exit through its attached terminal first; `stop` kills
any surviving app/dev-task processes and confirms nothing is left, so the next
session's stale-instance check starts clean.

If you cleared the save (§ 1), restore it now — after `stop`, never before — and
`shasum` it against the backup. A verification run that leaves the user's game
replaced by a throwaway profile has broken something real, however green the
gates are.
