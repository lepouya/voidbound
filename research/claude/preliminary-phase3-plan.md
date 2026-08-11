# Preliminary Phase 3 plan (Claude track)

## Status: one of three inputs, not a final plan

Per the user (2026-08-10): this document is explicitly a **draft for one of
three concurrent research tracks** (`docs/claude/`, `docs/gemini/`,
`docs/gpt/`). Once all three exist, the user will reconcile them into a
single solid plan in a later pass — this document is that reconciliation's
raw material from the Claude track, not a substitute for it. It draws on
every file in `docs/claude/`: 12 `games/*.md` research docs, three
`comparison/*.md` synthesis docs, `user-notes.md`'s firsthand observations
and decisions, and `voidbound-application.md`'s five-part analysis.

Per `AGENTS.md`'s review gate, this is still planning, not implementation —
no code changes are authorized by this document, and it does not substitute
for the user's own read-through before any Phase 3 task actually gets picked
up via `/roadmap-task`. Where a task's design touches the server model,
`/roadmap-task`'s own design-review pause still applies regardless of
anything written here.

## Design pillars for Phase 3

Five things this research converged on that should shape every task below,
not just the ones they're mentioned under:

1. **Voidbound's existing skeleton already matches the genre's converged
   core loop** (`core-loop-vs-features.md`) — Command Module gating, 4-resource
   discipline, the event-modeled action pattern. Phase 3 isn't inventing a
   new loop shape, it's filling in content within an already-sound one.
2. **The "honeymoon-then-wall" pacing collapse is the single most
   consistently documented failure mode across every game researched**
   (`early-mid-late-game.md`) — and Voidbound is more exposed to it than any
   peer game, since Phase 3 has no alliance layer to catch a player once
   solo content thins out. Every task that adds content (P3.3, P3.4, P3.9,
   P3.11) should be evaluated against "does this extend the runway before
   the wall, or just move the wall earlier."
3. **Resist system bloat as new content lands.** Lords Mobile's "too many
   things to remember" complaint and Clash of Clans' commercially-proven
   counter-example (`voidbound-application.md` Part 3, Part 5) both argue
   the same direction: don't let P3.4's research tree, P3.8's expeditions,
   or P3.9's sector progression grow their own new currencies or bolted-on
   subsystems just because peer games did.
4. **No P2W, no gacha, no bait-and-switch marketing** — not a Phase 3
   mechanical concern directly (no monetization exists yet), but a
   values-level stance this research argues strongly for (`community-
   sentiment.md`, `voidbound-application.md` Part 3/Decisions #4) that
   should inform how every reward/progression system in Phase 3 is *shaped*,
   since retrofitting fairness onto a system designed around spend pressure
   is much harder than designing it in from the start.
5. **P3.11's campaign completion has no peer template and needs outside
   reference points** — every other game in this research is deliberately
   open-ended forever. This is the one place Phase 3 is doing something
   genuinely novel relative to the whole genre, not adapting a known
   pattern.

## Task-by-task notes

Organized by ROADMAP's own P3.1-P3.19 IDs and dependency order. Each entry:
a concrete recommendation, its research backing, and open items left for the
actual design-review conversation.

### P3.1 — Playable-alpha experience specification

**Recommendation:** Write the spec expecting the honeymoon-then-wall
pattern as the default failure mode to design against, not a hypothetical
risk. Concretely: define the "first 30 minutes / first 3 hours / several-day
arc" targets ROADMAP already asks for with an explicit runway estimate for
each later content system (P3.4's research tree, P3.8's expeditions, P3.9's
sectors, P3.11's campaign) and cross-check that the sum plausibly outlasts
where every peer game's solo content runs dry — since Voidbound, uniquely
among the 12 games researched, has no alliance layer waiting on the other
side.

**Backing:** `early-mid-late-game.md` (the wall pattern, named almost
identically across all 8 original games); `user-notes.md`'s Part 4 risk
flag (Phase 3 can only build "Phase 1"); Rise of Kingdoms as the negative
example for the opposite failure (too little scaffolding, `early-mid-late-
game.md`'s "Phase 1" outlier note) and EVE Online's "learning cliff" as a
second, harder version of the same warning (`voidbound-application.md` Part
5).

**Open items:** what specifically constitutes "content depth exhausted" for
playtesting purposes (P3.19 needs an operational definition, not just a
vibe check).

### P3.2 — In-app local profile flow

No direct research finding applies here — this is Voidbound-specific
plumbing (replacing launch-flag identity selection) with no peer-game
analog, since every researched game has server-side accounts from day one.
Not blocked by anything in this research; proceed on its own merits.

### P3.3 — Objectives, rewards, and first-run onboarding

**Recommendation:** Build the chapter/objective chain as the genre's
scaffolded majority does — a chaptered quest system that *is* the early
game, not a disposable tutorial overlay, with every task granting a
meaningful, visible unlock (not periodic/every-few-tasks). Keep chapter
granularity tight rather than dumping several systems on the player at once
(the Rise of Kingdoms anti-pattern). Continue Voidbound's existing UX
convention of stating reward/gate structure honestly up front — this
research found no peer game that does this as consistently as `AGENTS.md`'s
UX principles already require, so it's a place to defend an existing
strength, not import a new one.

**Backing:** `voidbound-application.md` Part 1 (P3.1/P3.3 section);
`early-mid-late-game.md`'s Phase 1 section (chapter-chain pattern, "genuine
momentum during the first week" language repeated across Dark War, Whiteout
Survival, Tiles Survive!).

**Open items:** whether P3.3's "optional goals and milestones continue after
the tutorial" (per its ROADMAP description) should include any of the
returning/escalating structure decided in scope for P3.9/P3.11 (see
Decisions #3 in `voidbound-application.md`), or stay purely one-shot.

### P3.4 — Research Lab + tech tree

**Recommendation:** Use parallel research trees gated by Command Module
level (not one linear tree) — every game researched runs 2-3 parallel
trees, and near-universal community guidance sequences an
economy/development-first, military-later default, which is a reasonable
starting curve for Voidbound's own tree. Resist adding a currency dedicated
to research beyond what the existing 4-resource system already provides
(design pillar 3).

**Backing:** `voidbound-application.md` Part 1 (P3.4 section, citing
Whiteout Survival's Growth/Economy/Battle split, Dark War's four-tree
system, Last War's sequencing advice).

**Open items:** none major — this is the most directly transferable finding
in the whole research set.

### P3.5 — Live countdown-details controller

Pure refactor task (extracting shared dialog-controller logic), no peer-game
research applies. Proceed independently.

### P3.6 — Module build prerequisites

**Recommendation:** Generalize `unlock_command_level` into an explicit
prerequisite system that always **shows the unmet reason**, never a silent
locked icon — this is already P3.6's own stated approach, and this research
strongly confirms it's correct: the "central building gates everything"
pattern is genre-universal (`core-loop-vs-features.md` §1), and every
instance of *opaque* gating in the peer games generated confused
third-party guide content trying to explain undocumented unlock rules
("Waterfall Training" in Last War's doc is the clearest example — a
mechanic guide sites reference but never fully document, evidence of poor
in-game legibility).

**Backing:** `voidbound-application.md` Part 1 (P3.6 section).

**Open items:** none major.

### P3.7 — Vessel Shipyard + vessel stats and multi-tier progression

**Recommendation:** Keep vessel/crew progression purely statistical
(tiers, cargo, speed, durability) as the default, but design with room for
a **non-gacha hero-shaped layer** (named captains/specialists with skills,
unlocked via progression or direct action, not randomized pulls) as a
deliberate, decided-open option — per the user's 2026-08-10 answer
("worth exploring, non-gacha"). Lords Mobile is the specific reference
model: heroes unlocked via campaign/event progression and direct purchase,
never blind pulls.

**Backing:** `voidbound-application.md` Decisions #2; `core-loop-vs-
features.md`'s hero/army-layer section (Lords Mobile and, from round 2,
Clash of Clans and OGame as three separate proofs that a competitive game
in this genre doesn't require gacha).

**Open items:** whether a hero-shaped layer actually gets built in P3.7
itself, or scoped as a later addition once the base statistical system
proves out — this wasn't decided, only that the door should stay open in
the design.

### P3.8 — Expeditions + fuel economy

**Recommendation:** This has the single strongest, most literal precedent
in the entire research set: **OGame's Expedition system.** Adopt its shape
directly as a starting point — a fleet/vessel sent to unclaimed space for a
timed window, a concrete weighted-outcome table (resources found / a
derelict discovered / nothing / a rare bonus / a hostile encounter, with a
small but real chance of total loss), a slot count that scales with a
research investment, and diminishing returns from repeatedly targeting the
same location to encourage spreading activity out. This maps almost exactly
onto ROADMAP's own P3.8 description ("consume fuel, expose up-front
risk/reward, return choices or rewards through authoritative events").

**Backing:** `voidbound-application.md` Part 5 and `early-mid-late-game.md`
Round 2 (both cite `games/ogame.md` §5 directly — read that section in full
when P3.8 design actually starts).

**Open items:** the exact odds table and loss severity need Voidbound-
specific tuning (OGame's numbers are a starting reference, not a formula to
copy verbatim); how fuel's other uses (mothership warp, P1.22) interact
with expedition fuel cost needs its own pass, per ROADMAP's existing note
that P3.8 should "settle fuel's broader role."

### P3.9 — NPC opposition + radial sector progression

**Recommendation:** Two concrete precedents to build from: **Rise of
Kingdoms' Expedition mode** (a staged singleplayer-vs-AI campaign, fightable
without pulling vessels off their economic map tasks — adopt this
"run alongside, not instead of" default unless there's a specific reason to
want the tension of choosing between them) and **Star Trek Fleet Command's
warp-range-gated mining**, which ties resource yield to how far into
contested space a node sits, not just its grade — a natural extension of
Voidbound's existing radial asteroid-grade design (P2.6) with an added "how
far are you willing to go" axis. The wave-escalation *structure* of Dark
War's Zombie Siege / Whiteout's Bear Hunt (repeatable, scaling difficulty,
clear win/loss state) is reusable for solo NPC encounters even stripped of
their alliance-cooperative framing — and per the user's 2026-08-10 decision,
some version of this returning/escalating structure should be **in scope
for Phase 3**, not deferred to P7.1.

**Backing:** `voidbound-application.md` Part 1 and Part 5; `00-task-list.md`
decisions log (RoK and STFC flags).

**Open items:** the power-score decision (below, shared with P3.10) directly
feeds this task's difficulty-scaling design.

### P3.10 — PvE combat vertical slice

**Recommendation:** Give P3.10 its own identity distinct from raw
combat-power grinding — **State of Survival's Explorer Trail** (a small,
troopless squad campaign explicitly separated from the main troop/PvP
layer, praised independently as "a fantastic single player experience" in
its own right) is the model to follow rather than making this just "the
same combat system pointed at NPCs." Per the user's 2026-08-10 decision, add
a headline aggregate power stat now (Command Module + module levels +
vessel tiers + research) even without PvP matchmaking yet to consume it —
NPC difficulty in P3.9/P3.10 and the P3.11 campaign's difficulty curve
should be legible against this number, the way every peer game's CP is
legible against its content.

**Backing:** `voidbound-application.md` Part 1 (P3.9/P3.10 section) and
Decisions #1.

**Open items:** the exact formula/weighting for the power stat; whether it's
player-visible as a raw number (genre-standard) or abstracted into a
tier/label (more in keeping with Voidbound's current understated-UI
conventions) — worth a design-review conversation rather than assuming the
genre-standard raw-number presentation.

### P3.11 — Local campaign completion + ascension

**Recommendation:** Treat this as the one task in Phase 3 that must be
designed from outside this research set. Every one of the 12 games
researched is deliberately open-ended with no completion state — the
genre's climax content (SvS, KvK, Capital Clash, EVE's null-sec sovereignty
warfare) is built to be repeated forever by a live population, not resolved
once by a solo player. The one partial exception worth holding onto:
**Clash of Clans' "maxed Town Hall" state** is a real, achievable, well-
defined completion point (even though Supercell periodically raises the
ceiling with new content) — a useful middle-ground reference between "open
forever" and "one true ending": closable, then reopened by later content,
rather than either extreme. What *does* transfer from the genre broadly:
every climax structure researched grants a **title/governance reward**
(President, Governor, Regency) on top of material rewards — worth keeping a
status/title reward in P3.11's design even in solo form, matching what
ROADMAP's own "reaching the center and defeating a major threat" phrasing
already implies.

**Backing:** `early-mid-late-game.md` (climax-structure table + the "no
usable peer template" finding, stated near-verbatim in three separate
docs); `voidbound-application.md` Part 1 and Part 5 (Clash of Clans
addition); `user-notes.md`'s Phase 3 mapping (validates P3.11 is aiming at
the right *shape* of climax even without a template for the mechanics).

**Open items:** this is the task most worth bringing outside references
into beyond this research set (roguelike/ARPG "prestige"/NG+ patterns were
suggested in `early-mid-late-game.md` as a starting point, not researched
in depth here) — flag this explicitly for whatever session actually designs
P3.11.

### P3.12 — Dialog columns + Trading Post redesign

UI/layout task, no peer-game mechanical research applies directly. Worth
noting only that every peer game's shop/deal UI (Dark War's pack shop,
Whiteout Survival's multiple parallel shops) reinforces that a dense,
scannable grid is the genre-standard shape for this kind of content — mild
validation for the "three columns of bordered deal boxes" direction already
in ROADMAP's description, nothing more specific to add.

### P3.13 — Minimap two-tier zoom revamp

No direct peer-game research applies — none of the 12 games researched use
a minimap system detailed enough in available sources to inform this
specifically. Proceed independently.

### P3.14 — Context-sensitive resource bar + detail dialog

No direct peer-game research applies. Proceed independently.

### P3.15 — Per-type module art and tiered visual progression

No peer-game research applies to art direction specifically. Worth noting
only that visible tier progression on buildings (bigger/more detailed
visuals at higher levels) is universal across every game researched —
confirms the direction, adds no new specifics.

### P3.16 — Space map art and visual readability

No direct peer-game research applies to art direction. Worth noting Rise of
Kingdoms' and Whiteout Survival's asteroid/resource-node visual language
(shape, not just tint, distinguishes resource class) as loosely relevant
prior art matching ROADMAP's own existing requirement ("asteroid resource
class must remain distinguishable by shape rather than tint alone").

### P3.17 — Audio

No peer-game research applies — audio wasn't a research focus for any of
the 12 games. Proceed independently.

### P3.18 — Progressive crew recruitment cost

**Recommendation:** An escalating curve tied to population size (not a flat
per-hire price) is confirmed as the genre-standard approach across every
comparable recruitment/training system researched — directly matches
P3.18's stated goal. No single game's exact curve was documented precisely
enough to copy a formula; the direction is validated, the specific numbers
need Voidbound-specific tuning against its own progression pacing.

**Backing:** `voidbound-application.md` Part 1 (P3.18 section).

**Open items:** the actual curve shape/coefficients — this needs Voidbound-
specific playtesting (P3.19), not further genre research.

### P3.19 — Structured local-alpha playtest + rebalance

**Recommendation:** Make the honeymoon-then-wall pattern an explicit,
named thing this playtest hunts for — not folded into generic "confusion,
dead time" observations. Concretely: does first-week pacing collapse
abruptly into a grind wall the moment scripted P3.3 content runs out, the
way every peer game's does? Given design pillar 2 (Voidbound has no
alliance layer to catch a player on the other side of that wall), this
failure mode is more dangerous for Voidbound during Phase 3 than for any
peer game — treat a "yes, it walls" result as a P0 rebalancing finding, not
a nice-to-have polish note. Second, explicit target per this research's
bimodal-sentiment finding (`community-sentiment.md` Round 2): expect
casual/first-session impressions and invested/multi-hour impressions to
diverge, and design the playtest protocol to capture both rather than
average them into one signal.

**Backing:** `early-mid-late-game.md` (the wall pattern); `community-
sentiment.md` Round 2 (bimodal sentiment as a cross-genre pattern).

**Open items:** none beyond what's already in ROADMAP's own P3.19
description — this research mainly sharpens *what to look for*, not new
mechanics to test.

## What this document deliberately leaves out

Per `voidbound-application.md` Part 2, this plan does not attempt to design
alliance mechanics, PvP raiding/rallies, seasons/world-merging, curated
events, or licensed-crossover-style content — all correctly deferred to
Phase 5/6/7 per ROADMAP's own structure, and this research validates rather
than challenges that phasing (see `user-notes.md`'s four-phase mapping).
Two things worth flagging for whoever picks up those later phases, since
they're now on file: **EVE Online's corp→alliance→coalition structure and
Council of Stellar Management** as a reference class for P5.1/P5.2 far
richer than any mobile SLG's, and **State of Survival's State Merge /
OGame's Exodus merge process** as two independently-converged real-world
answers for P5.5.

## Next steps

1. User reviews this document (and the rest of `docs/claude/`) alongside
   the concurrent `docs/gemini/` and `docs/gpt/` tracks.
2. Reconciliation pass across all three tracks produces the actual solid
   plan — out of scope for this document and this research track.
3. Per `AGENTS.md`, no Phase 3 task gets implemented from this document
   directly — the eventual solid plan still needs its own review, and each
   individual task still goes through `/roadmap-task`'s own process
   (including its design-review pause for anything touching the server
   model) when picked up.
