---
name: phase-review
description: Run a full-project code review at the close of a ROADMAP phase — read everything, cross-check docs and mirrors, record findings as a checkboxed CODE_REVIEW.md worked over later sessions, then roll it up and delete it. Use when a phase's tasks are all checked off, or when asked for a "full review" / "phase review" / "audit" of the whole repo.
---

# End-of-phase full-project review

A whole-repo review pass run after a ROADMAP phase closes. Re-run it when a
closed phase later receives material additions: each pass reviews the current
repository from scratch rather than carrying forward the prior pass's
point-in-time conclusions. The output is a top-level `CODE_REVIEW.md` tracker
that later sessions work through item by item; when every item is done, the
tracker is rolled up and **deleted** — its history lives in git.

## 1. Review pass

Read in this order, taking notes but changing nothing behavioral yet:

1. **Design docs first** — README.md, SERVER.md, ROADMAP.md, AGENTS.md — so
   every code observation is judged against the stated design, not taste.
2. **Every source file in full, in dependency order**: Rust backend (game rules
   first — it is authoritative), then TS core (state, scenes, actors), then
   `src/ui/`, then `tests/`, then `tools/` + `art/gen_*.sh`, then
   `.agents/skills/`.
3. **Cross-check every "keep the two in sync" mirror pair** field by field —
   Rust struct ↔ TS interface, Rust constant ↔ TS display mirror, and any
   invariant whose halves live on opposite sides of the language boundary.
4. **Verify doc claims against code** — file paths, function names, asset
   prefixes, and especially skill templates/snippets, which drift the fastest.
5. **Fix mechanical doc/skill inaccuracies immediately** (they only get staler)
   and record them in the tracker's "fixed during the review pass" section.
   **Flag everything behavioral** as a tracker item instead of changing it
   silently — the review's deliverable is the findings, not unreviewed fixes.

Also look for: corner cases the tests miss, dead code, missing tasks implied by
UI stubs or code comments ("later", "no task yet"), patterns repeated 3+ times
that want a helper or a skill, and anything a future phase will make harder to
change (wire shapes, save formats, message text).

## 2. Write `CODE_REVIEW.md`

Top-level file, sections in this shape:

- **Header**: scope, baseline commit, date, one-line verdict.
- **Process and rationale**: point here (`/phase-review`) rather than restating
  it.
- **How to use this file**: stable IDs `CR<section>.<n>` (never renumbered, so
  commits and sessions can reference them — same convention as ROADMAP.md);
  severity tags **[fix]** (real defect), **[hardening]** (defensive/debt),
  **[idea]** (optional); checkbox per item.
- **Finding sections**, grouped: backend bugs, client bugs, tools/pipeline,
  refactor/reuse, test-coverage additions, ROADMAP additions to consider,
  skills/steering improvements, housekeeping — then the pre-checked "fixed
  during the review pass" section.
- **"Verified-sound (no action)"**: what was checked and found correct, so the
  next review doesn't re-litigate it.

Each item states the problem, the evidence (file/function), and a suggested fix
— enough that a cold session can pick it up from the ID alone.

## 3. Work the items (later sessions)

- Pick items by ID ("do CR1.1 and CR5.5"); one commit per item (or tightly
  coupled pair), titled `<Short description> (CR<id>)` — matching how ROADMAP
  commits carry `(P<id>)`.
- Check an item off only when committed and `deno task format` +
  `deno task check` + `deno task lint` + `deno task test` pass, plus `/verify`
  when runtime behavior changed.
- **Append a "Done:" note to the item** saying what actually happened —
  especially when it deviates from the suggestion (fix turned out unnecessary,
  kept-as-is with documentation, folded into a ROADMAP task). These notes are
  the input to step 4's roll-up.
- Items that grow into real features graduate to `ROADMAP.md` tasks; check them
  off here with a pointer to the task ID.

## 4. Roll up and delete

When every box is ticked (verify each claim against the code, not just the
checkboxes — grep for the named symbols/tests, then run the full gates):

- Confirm every durable fact from the "Done:" notes already lives in its
  permanent home: ROADMAP tasks, AGENTS.md/SERVER.md notes, skill updates, code
  comments. Anything homeless gets moved now.
- Add one line to the reviewed phase's ROADMAP header noting the review
  happened, with the commit range, so future sessions can find the full document
  in git history.
- **Delete `CODE_REVIEW.md`.** The next review pass starts fresh, whether it
  follows another phase or later additions to the same one; stale trackers that
  linger become the exact doc-drift this process exists to catch. A prior
  tracker's "verified-sound" facts were point-in-time and are intentionally not
  carried forward — re-verify, don't trust.
