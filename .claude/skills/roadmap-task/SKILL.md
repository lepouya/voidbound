---
name: roadmap-task
description: Work a ROADMAP.md task end to end — confirm the P<phase>.<n> task, design (pausing for review when the design touches the server model), implement via the right skills, gate, runtime-verify, check off, and commit titled with the task ID. Use when asked to "do P1.7", "pick up the next roadmap task", or land any feature tracked in ROADMAP.md.
---

# Working a roadmap task

`ROADMAP.md` is the phased task list (stable IDs `P<phase>.<n>`) tracking what's
built vs. planned. Every feature lands through the same ritual — this skill is
that ritual.

## 1. Identify the task

- If the user named an ID, read its entry **and** any "needs" notes — tasks are
  listed in rough dependency order, and an unmet dependency changes the plan.
- If they didn't, list the unchecked tasks in the current phase and confirm
  which one before starting; don't guess.
- Read the `README.md` sections the task references — settled design principles
  live there; `ROADMAP.md` only tracks the order features land in.

## 2. Design — pause for review when it touches the server model

Sketch the design before writing code. **If the design touches the (future)
server model** — new server-authoritative state, event or push shapes, snapshot
contents, anything `SERVER.md` covers — **present the design to the user for
review before committing.** This is a standing preference: a roadmap task was
once rejected at commit time because its design was still client-only. Pure
client/UI/tooling tasks don't need the pause.

## 3. Implement with the existing skills

- State-mutating action → `/add-game-event` (covers server verification and the
  push channel)
- New scene / game area → `/add-scene`
- New sprite or animation asset → `/add-tileset`; generated art → `/gen-art`

## 4. Gate

`deno task format`, then `deno task check`, then `deno task test` — all three
are ROADMAP.md's definition of done. If `tools/*.py` changed, also run
`python3 -m unittest discover -s tools`.

## 5. Verify at runtime

Run `/verify` and drive the new code path in the dev app — there is no
scene-level test coverage, so a task isn't done until it has been seen working.
Revert every `TEMP-VERIFY` hook (the `/verify` checklist enforces this).

## 6. Check off and commit

- Tick the task's checkbox in `ROADMAP.md` in the same commit as the change.
- Commit title: `Short description (P<phase>.<n>)` — matching history, e.g.
  `Asteroid mining loop (P1.6)`.
- If step 2's review pause applied, get the user's go-ahead before committing.
