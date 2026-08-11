# Phase 3 market research plan

## Purpose

Define an evidence-backed direction for Voidbound's local playable alpha before
P3.1 is specified or any Phase 3 code is written. The target is an engaging,
recoverable, persistent solo campaign; it is not an attempt to clone the live
service/MMO layers of the comparison games.

## Scope guardrails from the project

- Phase 3 proves the first 30 minutes, first 3 hours, several-day arc,
  completion/ascension, and local return loop before Phase 4 networking.
- Rust remains authoritative and every mutation remains compatible with the
  event/snapshot/scheduler model.
- Same-device profiles may share a persisted system asynchronously, but are not
  simultaneous multiplayer.
- Alliances, live events, monetization, PvP, online seasons, and mobile launch
  are future-phase concerns unless a local prototype is necessary to validate a
  specific loop.

## Deliverables

- [x] Build a source register with primary, secondary, and community evidence.
- [x] Record a structured deep dive for Dark War: Survival.
- [x] Record a structured deep dive for Whiteout Survival.
- [x] Record a structured deep dive for Tiles Survive!.
- [x] Identify and research comparable games across the relevant subgenres.
- [x] Compare core loops, supporting engagement systems, early/mid/end game,
      strengths, and recurring player criticism.
- [x] Translate findings into a Phase 3 product direction and a P3.1 outline.
- [x] Separate Phase 3 candidates from features that belong in Phases 4-7.
- [x] Consolidate current research and user decisions into a
      reconciliation-ready comprehensive game plan.
- [ ] Review the dossier with the user; capture their first-hand experience and
      revise contested findings.
- [ ] Decide the Phase 3 expedition interaction and research-tree boundaries.
- [ ] Decide the capital fiction and the local-campaign role of the 200*200
      core.
- [ ] Define ascension reset/carry-over rules before P3.11 design.
- [ ] Define normal-play research/ascension respec rules before adding any
      permanent-looking branch choices.
- [ ] Write a non-predatory economy and social-safety charter before considering
      P5.9 monetization or P6.3 player raids.
- [ ] Design-review the future capital-control event before Phase 5/6 work: PvE
      approach wall, capture/defence window, stewardship duration, fairness, and
      anti-snowball rewards.
- [ ] Design future capital ministry roles and automatic fair rotation without
      fixed-time attendance pressure or essential power advantages.
- [ ] Turn the agreed direction into the P3.1 experience specification.

## Research method

For each game, capture: publisher/platform/version context; verbatim mechanics
from official/game-guide sources; observed community sentiment from Reddit and
review discussions; and a clearly labelled design inference. Search and source
links are recorded in `sources.md`; no claim should silently rely on memory.

YouTube walkthroughs are used to validate UI flow, pacing, and feature sequence,
but not as authority for invisible rules. Reddit is used to locate recurring
player experience and friction, not to establish exact mechanics without a
supporting source.

## Open questions for the user

- Which moments in the three reference games made you want to return?
- Which waits, purchases, events, or social pressures felt good versus
  manipulative or tedious?
- Should Voidbound's local campaign have a finite victory/ascension in days,
  weeks, or a flexible playtime target?
- How much tactical choice should a player make during a session, compared with
  asynchronous planning and collection?

## Decision log

| Date       | Decision                                                                                                                                                               | Rationale                                                                 | Status   |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------- |
| 2026-08-10 | Start with external market research and a durable dossier before P3.1 code.                                                                                            | User request; Phase 3 itself requires an experience-specification gate.   | Active   |
| 2026-08-10 | Treat worker/shelter mechanics, outward exploration, and a finite solo campaign as the Phase 3 core. Defer social competition and live operations.                     | Cross-game synthesis; pending user review.                                | Proposed |
| 2026-08-10 | Use the reference games' lifecycle Phase 1 as the local-alpha experiential target; model later collective phases with NPCs only where needed to validate the campaign. | User first-hand experience; preserves the roadmap's Phase 4-6 boundaries. | Proposed |
