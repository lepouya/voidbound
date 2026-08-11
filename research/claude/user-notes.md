# User's firsthand observations

Primary-source notes from the user's own play experience across Dark War:
Survival, Whiteout Survival, Tiles Survive!, and the genre generally. This is
the one thing the automated research agents categorically could not get
(reddit.com was unreachable — see `00-task-list.md`'s decisions log), so treat
this file as higher-trust than any secondary source in `games/*.md` wherever
they conflict. New entries get appended with a date heading rather than
overwriting — this is a running log, not a single snapshot.

## 2026-08-10 — The four-phase arc across these SLGs

The user's framing of how a session-to-session play experience evolves over the
life of a server, observed across the games tried so far. This cuts across
individual games rather than being specific to one — treat it as the cross-game
pattern the per-game `games/*.md` "early/mid/late game" sections should be
checked against.

> The phases of the game are interesting.

**Phase 1 — solo growth sprint.** The hook is constant goal-driven development.
There's a lot to do, and it's happening fast: construction and resource
gathering side by side, then a widening set of things to build and upgrade
racing against available resources. The game heavily scaffolds this phase with
constant goals, milestones, and story chapters. It escalates: soon you're
venturing out on small missions, fighting low-level PvE enemies at increasing
difficulty, juggling that against resource gathering, construction, and troop
leveling. Research is introduced as a level-gated, complex tech tree layered on
top. It's fast-paced with a lot of concurrent content — the feeling is getting
stronger, discovering new things, learning mechanics, and figuring out how they
interact.

**Phase 2 — alliance / group content.** The game introduces alliances, group
content (monsters too strong to solo, requiring rallies), asynchronous PvP arena
(set a defense team, choose targets among other players' defense teams to
challenge), alliance research (a parallel tech tree requiring everyone to
contribute), rankings, chat, and rally events. Players get stronger together,
relocate with their alliance, and start capturing map territory and large
resource generators/bonuses. This is also when player-vs-player
raiding/pillaging opens up — in practice this mostly lands on abandoned or
unallied players, since alliances quickly learn to avoid constant mutual war and
settle into treaties instead. New players are shielded from this — bases are
protected during Phase 1 (the first several days).

**Phase 3 — the center-map war.** Happens much later: alliances merge, stronger
ones emerge, and everyone moves inward toward the center, culminating in a large
PvP war over control of central map resources — control grants something like
presidency/regency over others plus large bonuses. This phase is where the game
shifts decisively toward social/alliance mechanics and cooperative play over
individual growth.

**Phase 4 — seasons / server-vs-server.** Some games add a season structure:
everyone moves on together into a new map, plus server-vs-server war layered on
top.

## Why this matters for Voidbound's roadmap

Striking alignment worth carrying into `voidbound-application.md`: this
user-observed four-phase arc maps closely onto Voidbound's _own_ existing phase
boundaries, which were arrived at independently —

- User Phase 1 (solo growth sprint, guided goals, escalating PvE, research
  unlock) ≈ Voidbound **Phase 3** (P3.1 onboarding/objectives, P3.4 research
  tree, P3.9 NPC opposition, P3.10 PvE combat).
- User Phase 2 (alliances, rallies, alliance research, territory capture,
  opportunistic raiding of the undefended) ≈ Voidbound **Phase 5** (P5.1
  Alliance Embassy, P5.2 alliance territories) and **Phase 6** (P6.2/P6.3
  weapons + PvP combat resolution — note P6.3 already scopes raiding to "only
  P2.13's exposed surplus may be looted, never protected stock," which is
  Voidbound's version of the new-player shielding this pattern describes).
- User Phase 3 (center-map war, alliance mergers, regency bonuses) ≈ Voidbound's
  **P3.11 local campaign completion** (solo version: "reaching the center and
  defeating a major threat") is deliberately the single-player analog of this,
  per its own description — validates that P3.11 is aiming at the right shape of
  climax even though the online alliance-war version is a later phase (P5/P6)
  concern.
- User Phase 4 (seasons, server-vs-server) ≈ Voidbound **P5.5** (online
  seasons/world merging) and README's season/world-merge design principle.

This is a strong signal that the local-alpha (Phase 3) goal of "prove the loop
before freezing design behind networking" should specifically nail the
**Phase-1-shape** experience (escalating solo goals, PvE, research-gated growth)
since that's the only phase Voidbound's own Phase 3 can actually test solo — the
alliance/territory-war/season phases are structurally impossible to prototype
without other players, and Voidbound's roadmap already defers them correctly.
The risk to flag in the synthesis doc: if Phase-1-shape content runs out too
fast (the common late-game complaint across `games/*.md` — see State of Survival
and Lords Mobile's endgame sections) _before_ a real alliance layer exists to
catch the player, a solo Voidbound player has nowhere to go. P3.9's
NPC-opposition sector progression and P3.11's ascension loop are the current
answers to that; worth double-checking they're paced to fill the gap left by an
entire missing Phase 2/3.

## 2026-08-10 (cont'd) — Design decisions from the follow-up round

**Protection bubble (resolved).** Every new player/account gets a **72-hour
protection bubble**. Taking any **active, synchronous PvP action** breaks the
bubble early and drops that player into the free-for-all zone — it's not a
passive timer-only shield, it's forfeited by the player's own aggression.
Explicit tradeoff acknowledged and accepted: this gives experienced/ascended
players (who know the mechanic and can play around it deliberately) an edge over
genuinely new players who might trigger it accidentally. This is P6.3 (PvP
combat resolution) scope — not yet in `ROADMAP.md`, but now decided in principle
and should be written into P6.3's design when that task is actually picked up,
alongside P6.3's existing exposed-surplus-only looting rule (P2.13) as the
second half of Voidbound's new-player-protection design.

**Peer research scope: go wide, not deep-in-survival.** The user does not want
this research to stay anchored in the "zombie/apocalypse-survival SLG" subgenre
just because the three primary games happen to be reskins of it — that specific
subgenre is explicitly called "overdone." Direction: broaden the peer set to
cover the wider space of base-building/MMORTS-adjacent games, including
non-mobile and non-"survival"-themed ones, especially anything closer to
Voidbound's actual space setting. See `00-task-list.md` §2 for the added
candidates and reasoning (Star Trek Fleet Command, EVE Online, Clash of Clans,
OGame).

## 2026-08-10 (cont'd) — Async PvP arena reclassified as Phase-3-reachable

Originally filed (below, and in `voidbound-application.md` Part 2) as part of
"alliance mechanics wholesale" deferred to P5/P6 alongside rallies, garrisons,
and territory capture — that was too conservative. The user flagged (2026-08-10,
prompted by `docs/gemini/voidbound_strategy.md` §1.4 independently floating the
same idea): **asynchronous PvP arena — set a defense team, attack another
account's stored defense team — doesn't need live networking or a shared world
at all.** It only needs to read another local profile's persisted loadout (crew
assignment, vessel tier, research picks) as a defense snapshot and run it
through an authoritative combat resolver. No live opponent, no shared/contested
resources, no looting, none of what makes P6.3's raiding genuinely wait on
Phase 4.

Concretely, this means Voidbound's local multi-profile setup (P3.2) — currently
scoped as pure dev/test scaffolding per the GPT track's decision-workshop item
11 — could double as the actual substrate for a real async-arena feature: each
local profile is a legitimate, readable "defender" snapshot for another local
profile to challenge. It would also reuse whatever combat-resolution engine
P3.10 builds for PvE, just pointed at a stored defense config instead of an NPC,
rather than needing a second combat system.

**Reclassification:** async PvP arena moves out of the "wait for Phase 5/6"
bucket into "architecturally reachable within/adjacent to Phase 3" — not
something to silently continue deferring to P6.3 alongside live raiding. Live
PvP raiding (looting, protection bubbles, contested world state) still genuinely
needs Phase 4/6 — this carve-out is specific to the stored-defense,
no-shared-state arena shape.

**Decided (2026-08-10, follow-up):** build it within Phase 3, not as a
fast-follow or later-phase deferral. See `preliminary-phase3-plan.md`'s
P3.2/P3.10 sections and its arena architecture sketch. Needs a ROADMAP task ID —
not yet assigned, candidate placement adjacent to P3.10 since it shares that
task's combat resolver.

## 2026-08-10 (cont'd) — Vessel/combat dispatch exclusivity, resolving a track conflict

Asked directly because the three tracks disagreed:
`docs/gpt/decision-workshop.md` §12c records that a vessel dispatched to combat
is unavailable for mining, trade, or expedition work until it returns, while
`docs/gemini/
voidbound_strategy.md` §3.6 states PvE combat "do[es] not lock up
or interrupt space map mining" (borrowing Rise of Kingdoms' decoupled
troops-vs-workers model). This track's own `preliminary-phase3-plan.md` hadn't
taken a position either way.

**Resolved:** Voidbound has a limited pool of vessels/troops/captains — not a
decoupled pool like RoK's. Dispatching a vessel to combat occupies it
exclusively; GPT's rule is correct, Gemini's parallel-combat framing doesn't
hold for Voidbound. See `preliminary-phase3-plan.md`'s corrections to P3.9 and
P3.10 and the new "Reconciling disagreements across tracks" section for the
tie-breaking principle used to settle this.

**Refinement noticed 2026-08-10, same day:** after the user separately asked
`docs/gpt/` to amend its own plan, GPT's reconciliation pass added the correct
nuance this note didn't spell out — exclusivity is per-unit, not a global
lockout. Only the _dispatched_ vessel is occupied; other available vessels/crew
and all non-vessel work (construction, objectives, research) continue normally.
This doesn't change the resolution above, but it does surface a real open risk:
the first 30 minutes likely has exactly one vessel, so P3.1 needs to explicitly
account for early vessel availability or the "opportunity cost" design intent
could function as an accidental dead end during onboarding. Also noted:
`docs/gemini/voidbound_strategy.md` was amended the same day for unrelated
content but never corrected its "doesn't lock up mining" line — still stale on
this point as of this entry.

## 2026-08-10 (cont'd) — P3.3 strict-linear chapter boundary, a three-way disagreement resolved

After the user had GPT and Gemini amend their own plans too, this track's own
`preliminary-phase3-plan.md` re-check turned up a genuine three-way disagreement
neither prior pass had caught: where does P3.3's strict-linear chapter 1
actually end and concurrent milestones begin? `docs/gpt/p3.1-design-gate.md`
puts the boundary at Research Lab construction (one step past the first
expedition returning). `docs/gemini/
plan_p3_3_objectives.md`'s amended chapter
catalog puts it earlier, at the first expedition step itself, moving Research
Lab construction into the first branching Chapter 2+ milestone.

**Resolved by the user directly**, and later than either: the strict-linear
chapter extends through **both the first and second expeditions, plus the first
base research entry completing** — not just one expedition, and not just
Research Lab construction. This gives the player one full demonstrated cycle of
"expedition unlocks research/next expedition" before handing over open choice,
not just the guaranteed first-time sample. See `preliminary-phase3-plan.md`'s
P3.3 section for the resulting chapter-1 tail sequence.

**Convergence noted after the second amendment round (2026-08-10):** all three
tracks had another round of user Q&A and re-amended their plans. Gemini's
independently-amended `plan_p3_3_objectives.md` landed on the identical ten-step
chapter-1 sequence to the decision above (through the second expedition and
first research entry) — real convergence, not just this track's record of the
answer. GPT's `decision-workshop.md`/`p3.1-design-gate.md` have not caught up
yet and still describe the boundary as ending at the first expedition. Also
worth recording: this same round, GPT and Gemini both independently confirmed
the shared-vessel-pool/repair-as-primary-sink points already logged above (no
longer single-track proposals), while a genuine new disagreement surfaced on
arena rewards — GPT holds firm that arena wins pay only deterministic
components, never credits; Gemini's second pass added "credit rewards" back into
its own arena section.

**Resolved directly by the user (2026-08-10):** arena wins pay deterministic
components only, matching GPT's position — the user agreed with "the direction
both [Claude and GPT] are going." Gemini's `voidbound_strategy.md` is the
document that needs correcting on the final reconciliation pass, not this
track's or GPT's. See `preliminary-phase3-plan.md`'s arena sketch for the
resolved wire-type comment.

## Open items for the user to weigh in on further

- Anything specific to Dark War: Survival, Whiteout Survival, or Tiles Survive!
  individually (vs. the genre-general pattern above) — the user confirmed this
  is still worth doing (2026-08-10: "yes, sure") but hasn't supplied it yet.
  This can only come from the user directly (Reddit access is blocked to every
  research agent) — add whenever convenient, no rush.
