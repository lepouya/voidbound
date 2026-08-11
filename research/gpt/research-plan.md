# Phase 3 market research plan

## Purpose

Define an evidence-backed direction for Voidbound's local playable alpha before
P3.1 is specified or any Phase 3 code is written. The target is an engaging,
recoverable, persistent solo campaign; it is not an attempt to clone the live
service/MMO layers of the comparison games.

## Scope guardrails from the project

- Phase 3 proves the first 30 minutes, first 3 hours, intermediate several-day
  checkpoints, a full multi-month arc to completion/ascension, and the local
  return loop before Phase 4 networking.
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
- [x] Reconcile the other two research tracks into the GPT plan: measurable
      content-runway testing, strict-then-branching objectives, authoritative
      objective data, fuel budgeting, readiness, recoverable expeditions, and
      finite-ascension research gaps.
- [x] Reconcile the wider Claude space/MMORTS set: spatial route risk, a small
      deterministic progression surface, local asynchronous defence, and future
      governance tools before hard-coded etiquette.
- [x] Resolve the first-run expedition as a relay fragment that guarantees an
      NPC relationship and Research Lab blueprint; retain derelict stations for
      the repeatable pool.
- [x] Record cross-track user decisions: strict-through-first-research-and-
      second-expedition then concurrent objectives; shared vessel-pool combat
      exclusivity; deterministic arena component rewards with no material loss
      consolation; and target-specific expedition survey-progress guarantees.
- [x] Extend the strict objective chapter through the first Research Lab entry
      and second expedition, then switch to concurrent milestones; this ensures
      players see the expedition -> research -> expedition loop before choice
      opens up.
- [x] Resolve retained cross-track choices: trade and Command Module capability
      upgrade precede the first expedition; Command Module levels unlock usable
      room bands/slots; repair is a source/sink experiment, not assumed balance.
- [ ] Review the dossier with the user; capture their first-hand experience and
      revise contested findings.
- [ ] Decide the Phase 3 expedition interaction and research-tree boundaries.
- [ ] Specify the Phase 3 local-defense arena and its no-looting, immutable-
      defender contract alongside P3.2/P3.10.
- [ ] Write the P3.1 content-runway matrix and fuel source/sink budget, then
      define its playtest measures, including diminishing-return and bad-luck
      protection for repeatable activities.
- [ ] Research finite prestige/New Game+/roguelike carry-over models before
      committing P3.11 reset and ascension rules.
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
- [ ] Write and simulate a single resource/fuel/reward model before choosing
      expedition odds, capacity formulas, arena rewards, or crew-cost curves.
- [ ] Define P3.10's combat decision model: player inputs, enemy behaviors,
      readiness explanation, combat report, failure lesson, and vessel-occupancy
      test cases.
- [ ] Define a data-authoring/content budget for objectives, sectors,
      expeditions, NPCs, and the multi-week campaign so the desired runway is an
      implementable plan rather than a feature list.
- [ ] Define P3.19 instrumentation and observation criteria, including first
      expedition time, confusion points, post-onboarding dead time, route
      diversity, recovery time, and differences between first-session and
      returning players.

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
- The first-ascension timing is decided as the full 1-2-week early, 4-week mid,
  and 4-week late lifecycle; P3.19 must validate that it is earned rather than
  timer-filled.
- How much tactical choice should a player make during a session, compared with
  asynchronous planning and collection?

## Decision log

| Date       | Decision                                                                                                                                                                                                                                                      | Rationale                                                                                                                              | Status   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 2026-08-10 | Start with external market research and a durable dossier before P3.1 code.                                                                                                                                                                                   | User request; Phase 3 itself requires an experience-specification gate.                                                                | Active   |
| 2026-08-10 | Treat worker/shelter mechanics, outward exploration, and a finite solo campaign as the Phase 3 core. Defer social competition and live operations.                                                                                                            | Cross-game synthesis; pending user review.                                                                                             | Proposed |
| 2026-08-10 | Use the reference games' lifecycle Phase 1 as the local-alpha experiential target; model later collective phases with NPCs only where needed to validate the campaign.                                                                                        | User first-hand experience; preserves the roadmap's Phase 4-6 boundaries.                                                              | Proposed |
| 2026-08-10 | Amend the GPT plan after cross-track review: strict first chapter then concurrent milestones; authoritative objectives; fuel budget and readiness model; recoverable, anti-farming expeditions; explicit post-onboarding-wall test.                           | Gemini supplied implementation detail; Claude supplied broader space references and the universal pacing-risk synthesis.               | Proposed |
| 2026-08-10 | Treat real-money gameplay power as prohibited working direction, and record the 72-hour new-player PvP protection rule for Phase 6.                                                                                                                           | User decisions recorded in the Claude track; aligns with the research's anti-predation findings.                                       | Proposed |
| 2026-08-10 | Include a local asynchronous defense arena in Phase 3: local profiles challenge immutable defense snapshots through the P3.10 resolver, without looting, defender mutation, live opponents, or shared-world contention.                                       | User direction; validates combat/loadout play without prematurely building online PvP.                                                 | Proposed |
| 2026-08-10 | Give recurring solo challenges and repeated expeditions transparent diminishing progression rewards, while every expedition advances bounded target-specific discovery progress.                                                                              | Prevents all-day farming and bad-luck dead ends without adding a new currency or fixed-time event pressure.                            | Proposed |
| 2026-08-10 | P3.10 is loadout-and-dispatch combat: select drones/troops and send them to a target; no real-time unit micromanagement in the first slice.                                                                                                                   | User direction; keeps the PvE resolver focused and reusable for the local-defense arena.                                               | Proposed |
| 2026-08-10 | The Phase 3 arena primarily uses other local profiles' defense snapshots, with curated ghost/NPC profiles for early onboarding. Its first server-day challenge is free; challenges 2-5 cost progressively more; later runs are chiefly ranking/show-off play. | User direction; makes the arena usable now while preventing it from becoming an infinite resource farm.                                | Proposed |
| 2026-08-10 | Combat dispatch requires a fitted vessel and its durable drone/troop loadout; the vessel is unavailable for economic work until it returns. Display both headline Power and its explanatory breakdown/tier.                                                   | User direction; makes combat an intentional economic tradeoff while retaining legible readiness.                                       | Proposed |
| 2026-08-10 | First ascension follows the full 1-2-week early, 4-week mid, and 4-week late lifecycle. Capital World/Relay/Helios fiction remains a working proposal.                                                                                                        | User direction; distinguishes intermediate P3 proof points from the intended campaign conclusion and keeps setting choices reversible. | Proposed |
