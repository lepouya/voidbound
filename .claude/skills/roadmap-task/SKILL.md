---
name: roadmap-task
description: Work a ROADMAP.md task end to end — confirm the P<phase>.<n> task, design (pausing for review when the design touches the server model), implement via the right skills, gate, runtime-verify, stop for the user's code review and playtest, then check off, compact, and commit titled with the task ID. Use when asked to "do P1.7", "pick up the next roadmap task", or land any feature tracked in ROADMAP.md.
---

# Working a roadmap task

`ROADMAP.md` is the phased task list (stable IDs `P<phase>.<n>`) tracking what's
built vs. planned. Every feature lands through the same ritual — this skill is
that ritual.

## Ask, don't guess

Stop and ask the user whenever something genuinely needs their call — scope that
the task's entry doesn't settle, an unstated design choice, a pick between two
reasonable approaches, anything the referenced `README.md`/`SERVER.md` sections
leave open. This applies at every step below, not just step 1. Guessing past an
ambiguity is how a task comes back rejected at review; a short clarifying
question is cheap by comparison.

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
review before implementing.** This is a standing preference: a roadmap task was
once rejected at commit time because its design was still client-only. Pure
client/UI/tooling tasks don't need the pause — but see "Ask, don't guess" above
for anything else that comes up mid-design.

## 3. Implement with the existing skills

- State-mutating action → `/add-game-event` (covers server verification and the
  push channel)
- New scene / game area → `/add-scene`
- New sprite or animation asset → `/add-tileset`; generated art → `/gen-art`

## 4. Gate

`deno task format`, then `deno task check`, then `deno task lint`, then
`deno task test` — all four are ROADMAP.md's definition of done. If `tools/*.py`
changed, also run `python3 -m unittest discover -s tools`.

## 5. Verify at runtime

Run `/verify` and drive the new code path in the dev app — there is no
scene-level test coverage, so a task isn't done until it has been seen working.
Revert every `TEMP-VERIFY` hook (the `/verify` checklist enforces this).

## 6. Stop for the user's code review and playtest

The gate passing and `/verify` succeeding mean the task is _implemented_, not
_done_. **Never check off or commit until the user has reviewed the code and
playtested it themselves and explicitly told you to proceed** — this holds
unconditionally, not just when step 2's server-model pause applied. Report what
landed and how you verified it, then stop and wait. Committing on the strength
of your own gate/verify pass, without the user's sign-off, is a repeated failure
mode this skill exists to close off.

## 7. Check off, compact, and commit

Only once the user has given the go-ahead:

- Tick the task's checkbox in `ROADMAP.md` in the same commit as the change.
- **Compact the entry.** While a task is in flight its `ROADMAP.md` entry often
  carries the implementation plan and design decisions an agent needed _to build
  it_ — that detail is exactly what the next session's agent doesn't need and
  what clutters the document once the feature exists in code. Replace the entry
  with a one- or two-line summary of what actually landed, plus a "Still open"
  note listing only what a _future_ task needs to know — each item pointed at
  its target task (`→ P2.6`). Everything else (implementation detail, superseded
  decisions, historical rationale, alternatives considered) belongs in
  `CLAUDE.md`, `SERVER.md`, and the commit message, not the roadmap. When a door
  has no target task yet, say "no task yet" rather than inventing one.
- Any per-task design doc written during step 2 is scaffolding, not a
  deliverable: don't commit it — roll its unfinished/deferred items into the
  roadmap (the target tasks' entries or the "Still open" note) and delete the
  file.
- Commit title: `Short description (P<phase>.<n>)` — matching history, e.g.
  `Asteroid mining loop (P1.6)`.
