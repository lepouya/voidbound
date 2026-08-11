# Preliminary Phase 3 plan (Claude track)

## Status: one of three inputs, not a final plan

Per the user (2026-08-10): this document is explicitly a **draft for one of
three concurrent research tracks** (`docs/claude/`, `docs/gemini/`,
`docs/gpt/`). Once all three exist, the user will reconcile them into a single
solid plan in a later pass — this document is that reconciliation's raw material
from the Claude track, not a substitute for it. It draws on every file in
`docs/claude/`: 12 `games/*.md` research docs, three `comparison/*.md` synthesis
docs, `user-notes.md`'s firsthand observations and decisions, and
`voidbound-application.md`'s five-part analysis.

Per `AGENTS.md`'s review gate, this is still planning, not implementation — no
code changes are authorized by this document, and it does not substitute for the
user's own read-through before any Phase 3 task actually gets picked up via
`/roadmap-task`. Where a task's design touches the server model,
`/roadmap-task`'s own design-review pause still applies regardless of anything
written here.

## Design pillars for Phase 3

Five things this research converged on that should shape every task below, not
just the ones they're mentioned under:

1. **Voidbound's existing skeleton already matches the genre's converged core
   loop** (`core-loop-vs-features.md`) — Command Module gating, 4-resource
   discipline, the event-modeled action pattern. Phase 3 isn't inventing a new
   loop shape, it's filling in content within an already-sound one.
2. **The "honeymoon-then-wall" pacing collapse is the single most consistently
   documented failure mode across every game researched**
   (`early-mid-late-game.md`) — and Voidbound is more exposed to it than any
   peer game, since Phase 3 has no alliance layer to catch a player once solo
   content thins out. Every task that adds content (P3.3, P3.4, P3.9, P3.11)
   should be evaluated against "does this extend the runway before the wall, or
   just move the wall earlier."
3. **Resist system bloat as new content lands.** Lords Mobile's "too many things
   to remember" complaint and Clash of Clans' commercially-proven
   counter-example (`voidbound-application.md` Part 3, Part 5) both argue the
   same direction: don't let P3.4's research tree, P3.8's expeditions, or P3.9's
   sector progression grow their own new currencies or bolted-on subsystems just
   because peer games did.
4. **No P2W, no gacha, no bait-and-switch marketing** — not a Phase 3 mechanical
   concern directly (no monetization exists yet), but a values-level stance this
   research argues strongly for (`community-
   sentiment.md`,
   `voidbound-application.md` Part 3/Decisions #4) that should inform how every
   reward/progression system in Phase 3 is _shaped_, since retrofitting fairness
   onto a system designed around spend pressure is much harder than designing it
   in from the start.
5. **P3.11's campaign completion has no peer template and needs outside
   reference points** — every other game in this research is deliberately
   open-ended forever. This is the one place Phase 3 is doing something
   genuinely novel relative to the whole genre, not adapting a known pattern.

## Non-negotiable product values

Added 2026-08-10, distilled from this track's own Part 3 rejections
(`voidbound-application.md`) plus design pillars 2-4 above — formalized as a
standing charter to check every future task against, not just a list of things
this round happened to reject. Worth noting this was reached **independently**
by the parallel `docs/gpt/` track (its `comprehensive-game-plan.md` §2) from a
much narrower game set (3 games vs. this track's 12) — convergent conclusions
from different evidence bases is a stronger signal than either track alone.

1. **Hopeful colonization and discovery, not generic survival.** Voidbound's
   fiction is settlement, survey, and stewardship — resist importing
   hunger/temperature/panic meters just because peer games use them for
   engagement, per design pillar 3's anti-bloat stance.
2. **Understandable growth.** Every change is visible, its cause is legible, and
   the next useful action is obvious — this is `AGENTS.md`'s existing UX
   principle (state must be visible), reaffirmed as a Phase 3 content
   requirement, not just a UI convention.
3. **Meaningful play across session lengths.** A 5-10 minute return, an
   hours-away plan, and a longer active session must each yield legitimate
   progress. Active play should grant choice and expression, never an unbounded
   raw-power advantage over idle play — a distinction P3.8's expedition design
   and P3.19's playtest should both explicitly check for.
4. **No permanent early traps.** Research/ascension branches may open different
   paths, but normal play must provide a comprehensible respec — never gate
   recovery from an under-informed early choice behind a future cash shop (ties
   directly to pillar 4 below).
5. **Failure is recoverable.** PvE costs time, fuel, cargo, or temporary vessel
   damage — never the only critical vessel, never protected progress, never a
   reset. Directly informs P3.10's "no unrecoverable vessel loss" requirement.
6. **No P2W, no gacha, no bait-and-switch marketing; resist system bloat.**
   Design pillars 3-4 above, restated as a standing rule rather than a
   per-pillar footnote.

## Decisions carried in from parallel tracks

Added 2026-08-10. The `docs/gpt/` track ran a direct decision-workshop with the
user (`decision-workshop.md`) that surfaced concrete answers this track's own
`user-notes.md` didn't independently capture. These are real user decisions, not
GPT's invention — recording them here so this track's task notes reflect the
same ground truth rather than treating questions as open that are already
answered. Full detail lives in `docs/gpt/decision-workshop.md`; the relevant
subset is folded into the P3.4/P3.8/P3.11 sections below.

- **Primary fantasy:** hopeful colonization/frontier and discovery, explicitly
  not the "survival" framing the three primary reference games use. Use language
  like frontier, settlement, survey, route, and stewardship in P3.3's objective
  copy.
- **Capital fiction:** a **Capital World with orbital infrastructure** — a
  recoverable/inhabited planet at the system center, with a Precursor Relay
  (route/signal restoration) and a Helios Array (inner-system hazard/energy)
  distributed across the approach bands. Not yet named; P3.9's sector design
  should treat the radial bands as approach to this complex rather than an
  abstract difficulty ramp.
- **First expedition target:** a relay fragment or derelict station, returning a
  guaranteed NPC relationship plus an item/blueprint that unlocks the first
  Research Lab — not a generic loot timer. (Decided 2026-08-10: Research Lab
  specifically, not Vessel Shipyard or a player choice; see P3.8's section
  below.)
- **Ascension carry-over:** cosmetics/badges, historical ship identity, a better
  first expedition, and a capped ascension-research tree the player chooses a
  branch of — explicitly not a resource stockpile that would make a fresh player
  irrelevant.
- **PvE failure rule:** pushing past the current limit should be encouraged;
  failure costs time/fuel/cargo or temporarily damages/delays a vessel, never
  destroys the only critical vessel or forces a reset (matches this track's own
  P3.10 recommendation independently).
- **Research structure:** three initial branches — growth/development, economy,
  and battle/military — matching this track's own P3.4 recommendation
  (Whiteout's Growth/Economy/Battle split) independently.
- **Vessel/combat dispatch exclusivity (resolved 2026-08-10):** Voidbound has a
  limited pool of vessels/troops/captains, not a decoupled troops-vs-workers
  split like Rise of Kingdoms' Expedition mode. Dispatching a vessel to combat
  makes it unavailable for mining, trade, or expedition work until it returns —
  `docs/gpt/decision-workshop.md` §12c's rule, confirmed directly by the user.
  This closes a real disagreement between tracks:
  `docs/gemini/
  voidbound_strategy.md` §3.6 states combat "do[es] not lock up
  or interrupt space map mining," reading RoK's parallel-troop-pool model onto
  Voidbound without accounting for the limited-pool constraint — that framing
  doesn't hold here and should not carry into the reconciled plan. See the
  corrections to P3.9 and P3.10 below.
- **Refined 2026-08-10 (from `docs/gpt/decision-workshop.md` §19, its own
  reconciliation pass):** the exclusivity above is per-unit, not a global
  lockout — "dispatching a fitted vessel occupies that vessel, but construction,
  objectives, and other available vessels remain usable." This refines the
  resolution above rather than reopening it: the pool is limited, not infinite,
  but it's still a pool once the player has more than one vessel/crew/captain.
  The real risk this surfaces: the first 30 minutes likely has exactly one
  vessel, so occupying it for combat could function as a whole-game pause during
  onboarding even though the intent is "opportunity cost, not dead end."
  `docs/gpt/p3.1-design-gate.md` names this directly ("P3.1 must state the
  early-vessel availability needed to make that true") — worth folding into this
  track's own P3.1 recommendation as an explicit check. **Still unresolved as of
  this pass:** `docs/gemini/voidbound_strategy.md` §3.6 was amended 2026-08-10
  for other content (the survey-track and daily-ladder backfills adopted below)
  but did not correct its "do not lock up or interrupt space map mining" line —
  it still reads as the parallel-pool framing this section rejects. Flag for
  whoever does the final cross-track reconciliation: two tracks and the user's
  own direct answer agree here; one track's document is stale on this specific
  point despite its own reconciliation pass touching the same section.
- **Partially fixed, still internally inconsistent (second amendment round,
  2026-08-10):** Gemini's next pass at `voidbound_strategy.md` did add the
  correct rule in its P3.10 section ("Dispatching a fitted vessel to combat or
  an expedition occupies that vessel exclusively until it returns; it cannot
  simultaneously mine asteroids or execute other dispatches") and its own README
  now describes it the same way. But the document's own "Five Non-Negotiable
  Local Loops" section, higher up, was never updated to match — it still reads
  "RoK Expedition style: combat runs in parallel without blocking space map
  mining," the exact framing the fix above rejects. This is no longer a
  cross-track disagreement (Gemini's own P3.10 section now agrees with GPT and
  the user); it's an internal inconsistency inside one file that survived a
  second reconciliation pass — worth a plainer flag than "still open" for
  whoever merges these documents, since the fix already exists elsewhere in the
  same file and just needs to be copied up.

## Task-by-task notes

Organized by ROADMAP's own P3.1-P3.19 IDs and dependency order. Each entry: a
concrete recommendation, its research backing, and open items left for the
actual design-review conversation.

### P3.1 — Playable-alpha experience specification

**Recommendation:** Write the spec expecting the honeymoon-then-wall pattern as
the default failure mode to design against, not a hypothetical risk. Concretely:
define the "first 30 minutes / first 3 hours / several-day arc" targets ROADMAP
already asks for with an explicit runway estimate for each later content system
(P3.4's research tree, P3.8's expeditions, P3.9's sectors, P3.11's campaign) and
cross-check that the sum plausibly outlasts where every peer game's solo content
runs dry — since Voidbound, uniquely among the 12 games researched, has no
alliance layer waiting on the other side.

**Backing:** `early-mid-late-game.md` (the wall pattern, named almost
identically across all 8 original games); `user-notes.md`'s Part 4 risk flag
(Phase 3 can only build "Phase 1"); Rise of Kingdoms as the negative example for
the opposite failure (too little scaffolding, `early-mid-late-
game.md`'s "Phase
1" outlier note) and EVE Online's "learning cliff" as a second, harder version
of the same warning (`voidbound-application.md` Part 5).

**Open items:** what specifically constitutes "content depth exhausted" for
playtesting purposes (P3.19 needs an operational definition, not just a vibe
check).

**Horizon table (added 2026-08-10):** the runway estimate above is easier to
review as required-experience-per-horizon than as prose — format worth adopting
for the actual P3.1 spec document itself, not just this note:

| Horizon          | Required player experience                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| First 5 minutes  | A functioning but sparse Command Module, a visible need, and one completed visible change.                                                                                     |
| First 30 minutes | Hire first crew; build/staff first producer; mine; trade; upgrade Command Module; complete the first vessel expedition and receive a relationship + unlock, not a bare number. |
| First 3 hours    | A real research/path choice; an improved vessel; a safe-vs-risky route tradeoff; the first NPC/hazard encounter; recovery from a failure.                                      |
| Several days     | Advance through radial bands; reach the NPC-held capital approach; overcome a major threat; choose an ascension.                                                               |

(Cross-checked against `docs/gpt/voidbound-phase-3-direction.md`'s own table —
same four horizons, independently arrived at from a narrower game set; converges
with this track's own P3.1 recommendation above rather than introducing a new
claim.)

**Pacing target decided (2026-08-10):** the provisional long-form arc from
`docs/gpt/decision-workshop.md` (early game 1-2 weeks, mid ~4 weeks, late ~4
weeks — roughly 10 weeks total) stays as the **aspirational** target for what
the finished local campaign should feel like, not something P3.19 has to run
end-to-end on every pass. P3.19's repeated fresh-profile playtests validate the
first-3-hours/several-days horizons above each time; the several-week middle and
late stretches get validated less often, by fewer, longer-running profiles
rather than every fresh-profile pass. Write this distinction into the actual
P3.1 spec's playtest-cadence section rather than leaving it implicit.

### P3.2 — In-app local profile flow

No direct research finding applies here — this is Voidbound-specific plumbing
(replacing launch-flag identity selection) with no peer-game analog, since every
researched game has server-side accounts from day one. Not blocked by anything
in this research; proceed on its own merits.

**Reclassification, then decision (2026-08-10, see `user-notes.md`):** the local
multi-profile system isn't only dev/test scaffolding — it's the substrate an
async PvP arena needs (read another profile's stored defense loadout, no live
opponent or shared state required). **Decided: build the arena within Phase 3**,
not as a fast-follow or a later-phase deferral — P3.2 needs to design for
another profile's state being read by an arena challenge from day one, not bolt
it on after the fact. This doesn't have a ROADMAP task ID yet; flag it for
whoever next edits `ROADMAP.md` to add one (candidate placement: adjacent to
P3.10, since it shares that task's combat resolver).

### P3.3 — Objectives, rewards, and first-run onboarding

**Recommendation:** Build the chapter/objective chain as the genre's scaffolded
majority does — a chaptered quest system that _is_ the early game, not a
disposable tutorial overlay, with every task granting a meaningful, visible
unlock (not periodic/every-few-tasks). Keep chapter granularity tight rather
than dumping several systems on the player at once (the Rise of Kingdoms
anti-pattern). Continue Voidbound's existing UX convention of stating
reward/gate structure honestly up front — this research found no peer game that
does this as consistently as `AGENTS.md`'s UX principles already require, so
it's a place to defend an existing strength, not import a new one.

**Backing:** `voidbound-application.md` Part 1 (P3.1/P3.3 section);
`early-mid-late-game.md`'s Phase 1 section (chapter-chain pattern, "genuine
momentum during the first week" language repeated across Dark War, Whiteout
Survival, Tiles Survive!).

**Open items:** whether P3.3's "optional goals and milestones continue after the
tutorial" (per its ROADMAP description) should include any of the
returning/escalating structure decided in scope for P3.9/P3.11 (see Decisions #3
in `voidbound-application.md`), or stay purely one-shot.

**Resolved 2026-08-10 (from `docs/gpt/`'s reconciliation pass):** the chapter
structure itself is strict-linear-then-branching, not strict-linear throughout.
Expose exactly one actionable objective at a time through the end of the first
chapter; after that, switch to concurrent optional milestones so objectives
explain priorities without permanently replacing player choice. This is the
answer to the open item directly above, not a separate question.

**Sub-question resolved 2026-08-10 by direct user decision** (this document had
surfaced it as a genuine three-way disagreement: GPT's `p3.1-design-gate.md` put
the boundary at Research Lab construction; Gemini's amended
`plan_p3_3_objectives.md` put it at the first expedition itself). The user's
answer is a fourth position, later than either: the strict-linear chapter
extends through **both the first and second expeditions, plus the first base
research entry completing** — not just building the Research Lab, and not just
the first expedition. Concretely, chapter 1's tail is now: first expedition
returns (guaranteed NPC relationship + Research Lab blueprint) → Research Lab
built → first research entry researched (using the growth/economy/battle branch
structure from P3.4) → second expedition dispatched and returns → _then_ switch
to concurrent optional milestones. This gives the player one demonstrated full
loop of "expedition unlocks research/next expedition" — not just the guaranteed
first-time sample — before handing over open-ended choice, which is a stronger
"the player has actually seen this loop repeat" bar than either other track's
answer. Recorded in `user-notes.md`; supersedes the "resolved from `docs/gpt/`'s
reconciliation pass" note directly above, which only got the _shape_
(strict-then-branching) right, not the exact boundary.

**Cross-track status as of the second amendment round (2026-08-10):**
`docs/gemini/plan_p3_3_objectives.md`'s independently-amended Chapter 1 catalog
now runs the exact same ten-step sequence as the user's decision above (through
`ch1_first_tech` and `ch1_second_expedition` before Chapter 1 completes) —
genuine convergence, not something this document is asserting alone.
`docs/gpt/decision-workshop.md` §22 and `docs/gpt/p3.1-design-gate.md`, however,
are now the stale ones: both still describe the strict-linear chapter ending
"through the first relay-fragment expedition" with no mention of the second
expedition or the first research entry — the same kind of one-track-
lagging-behind situation Gemini was in last round on the vessel-exclusivity
question, just reversed. Worth flagging for whoever does the final
reconciliation rather than treating GPT's document as still open on this point.
One loose thread even within Gemini's own file: its `plan_p3_3_objectives.md`
overview paragraph (above the actual chapter catalog) still says "up through the
first expedition," not updated to match its own ten-step catalog below it — an
internal inconsistency in that file, not a second disagreement.

#### Implementation sketch (added 2026-08-10)

`docs/gemini/plan_p3_3_objectives.md` sketched this task to full Rust/TS depth
independently; recording an equivalent sketch here for consistency with this
track's own P3.8/arena sketches, adopting Gemini's shape rather than inventing a
competing one where it already fits this codebase's conventions.

**Wire types (`game-state-types.ts`):**

```typescript
export type ObjectiveState = "locked" | "in-progress" | "completed" | "claimed";

export interface ObjectiveData {
  objectiveId: string; // e.g. "ch1_hire_crew"
  chapterId: string;
  state: ObjectiveState;
  currentProgress: number; // for count-based objectives, e.g. "mine N units"
  targetProgress: number;
  // reward is claimed via a separate command below rather than granted on
  // completion — matches this codebase's existing "claimable, not automatic"
  // reward convention (P1.12 deals, notification-driven Mail claims)
}

export interface ObjectivesData {
  activeChapterId: string;
  objectives: ObjectiveData[]; // the strict-linear phase sends one row; the
  // concurrent-milestone phase (post-first-expedition, per the Resolved note
  // above) sends the full active set
}
```

`GameStateData` gains `objectives: ObjectivesData`; `ServerPush` gains an
`objective` variant carrying `Revisioned<ObjectivesData>`.

**Backend (`src-tauri/src/game_state/objectives.rs`, new domain file):**

- An `ObjectiveCatalog` (mirrors `modules.rs`/`expeditions.rs`'s catalog shape)
  defines the chapter sequence and each objective's completion condition and
  claim reward — data, not scattered handler-side checks.
- Objective progress advances as a side effect of other commands settling
  (hiring crew, a producer's first completed build, a mine completing, a trade
  accepted, a Command Module level-up, the first expedition returning) rather
  than its own dispatch command — there's no `request_advance_objective`. Each
  relevant command handler and scheduler settlement path checks the active
  objective's completion condition after doing its own work and emits an
  `objective` push if it now completed, following the same
  drain-outbox-at-boundaries convention `AGENTS.md` §4 describes for
  `resources`/`module`/etc. pushes.
- `request_claim_objective(objective_id)` — verifies `state: "completed"`,
  deposits the reward, transitions to `claimed`, advances `activeChapterId` if
  it was the chapter's last objective, and returns the updated `ObjectivesData`.

**Frontend:** `gameState.applyObjectiveEvent()` alongside the existing
`apply*Event` methods; a persistent HUD widget (`AGENTS.md` §4's `addHudGroup`)
showing the current actionable objective, tapping into an Objectives dialog
built on `bindDialogRows` — a `completed` row surfaces a Claim button with its
reward badge, matching P3.3's "meaningful, visible unlock" requirement rather
than an automatic silent grant.

**Verification plan (once actually implemented via `/roadmap-task`):** fresh
profile shows Chapter 1's first objective on load; completing its condition
(e.g. hiring the first crew member) flips it to `completed` via push without a
manual refresh; claiming deposits the reward and reveals the next objective;
restart mid-chapter and confirm `load_game_state` restores the exact
`ObjectivesData` state; after the first expedition returns, confirm the switch
from one-at-a-time to the concurrent optional-milestone set.

### P3.4 — Research Lab + tech tree

**Recommendation:** Use parallel research trees gated by Command Module level
(not one linear tree) — every game researched runs 2-3 parallel trees, and
near-universal community guidance sequences an economy/development-first,
military-later default, which is a reasonable starting curve for Voidbound's own
tree. Resist adding a currency dedicated to research beyond what the existing
4-resource system already provides (design pillar 3).

**Backing:** `voidbound-application.md` Part 1 (P3.4 section, citing Whiteout
Survival's Growth/Economy/Battle split, Dark War's four-tree system, Last War's
sequencing advice).

**Open items:** none major — this is the most directly transferable finding in
the whole research set. The three-branch split (growth/development, economy,
battle/military) is also independently confirmed in the "Decisions carried in
from parallel tracks" section above — the `docs/gpt/` track's decision-workshop
landed on the identical three names from the user directly, not just from genre
research.

### P3.5 — Live countdown-details controller

Pure refactor task (extracting shared dialog-controller logic), no peer-game
research applies. Proceed independently.

### P3.6 — Module build prerequisites

**Recommendation:** Generalize `unlock_command_level` into an explicit
prerequisite system that always **shows the unmet reason**, never a silent
locked icon — this is already P3.6's own stated approach, and this research
strongly confirms it's correct: the "central building gates everything" pattern
is genre-universal (`core-loop-vs-features.md` §1), and every instance of
_opaque_ gating in the peer games generated confused third-party guide content
trying to explain undocumented unlock rules ("Waterfall Training" in Last War's
doc is the clearest example — a mechanic guide sites reference but never fully
document, evidence of poor in-game legibility).

**Backing:** `voidbound-application.md` Part 1 (P3.6 section).

**Open items:** none major.

### P3.7 — Vessel Shipyard + vessel stats and multi-tier progression

**Recommendation:** Keep vessel/crew progression purely statistical (tiers,
cargo, speed, durability) as the default, but design with room for a **non-gacha
hero-shaped layer** (named captains/specialists with skills, unlocked via
progression or direct action, not randomized pulls) as a deliberate,
decided-open option — per the user's 2026-08-10 answer ("worth exploring,
non-gacha"). Lords Mobile is the specific reference model: heroes unlocked via
campaign/event progression and direct purchase, never blind pulls.

**Backing:** `voidbound-application.md` Decisions #2;
`core-loop-vs-
features.md`'s hero/army-layer section (Lords Mobile and, from
round 2, Clash of Clans and OGame as three separate proofs that a competitive
game in this genre doesn't require gacha).

**Open items:** whether a hero-shaped layer actually gets built in P3.7 itself,
or scoped as a later addition once the base statistical system proves out — this
wasn't decided, only that the door should stay open in the design.

### P3.8 — Expeditions + fuel economy

**Recommendation:** This has the single strongest, most literal precedent in the
entire research set: **OGame's Expedition system.** Adopt its shape directly as
a starting point — a fleet/vessel sent to unclaimed space for a timed window, a
concrete weighted-outcome table (resources found / a derelict discovered /
nothing / a rare bonus / a hostile encounter, with a small chance of a costly
setback), a slot count that scales with a research investment (OGame's own
formula, `floor(sqrt(tech level))`, is a reasonable default rather than
inventing a new curve), and diminishing returns from repeatedly targeting the
same location to encourage spreading activity out. This maps almost exactly onto
ROADMAP's own P3.8 description ("consume fuel, expose up-front risk/reward,
return choices or rewards through authoritative events").

**Correction (2026-08-10):** the recommendation above originally copied OGame's
own framing verbatim — OGame's real ~1-2% roll destroys the entire fleet with no
return. That directly contradicts this track's own "Non-negotiable product
values" §5 ("failure is recoverable... never the only critical vessel") added
the same day, and `docs/gemini/`'s reconciliation pass already caught and fixed
this on their side: the low-probability bad outcome gets reframed as a
**recoverable** setback — cargo/fuel loss and a damaged-vessel state recoverable
via salvage/repair, never an outright vessel deletion. Adopt that fix here too;
the odds-table shape stays OGame's, the severity of its worst entry does not.

**Backing:** `voidbound-application.md` Part 5 and `early-mid-late-game.md`
Round 2 (both cite `games/ogame.md` §5 directly — read that section in full when
P3.8 design actually starts).

**Open items:** the exact odds table and loss severity need Voidbound- specific
tuning (OGame's numbers are a starting reference, not a formula to copy
verbatim); how fuel's other uses (mothership warp, P1.22) interact with
expedition fuel cost needs its own pass, per ROADMAP's existing note that P3.8
should "settle fuel's broader role."

**First target (from "Decisions carried in from parallel tracks" above):** the
first expedition target is a relay fragment or derelict station, not a random
roll — its outcome is _guaranteed_ to be an NPC relationship plus an
item/blueprint, matching P3.3's "meaningful unlock every task" convention
(design pillar/P3.3 section above) rather than starting the player on OGame's
weighted table cold. The weighted-outcome table applies from the second
expedition onward, once the player has a frame of reference for what a "normal"
result looks like. **Decided 2026-08-10:** the guaranteed blueprint specifically
unlocks the **Research Lab** (not the Vessel Shipyard, and not a player choice
between the two) — resolves the "still open" question
`docs/gpt/decision-workshop.md` left on this point.

**Narrowed 2026-08-10** (`docs/gpt/decision-workshop.md` §17/§19,
`docs/gpt/p3.1-design-gate.md`, both from GPT's own reconciliation pass): the
first-run target is specifically the **relay fragment**, not an "or derelict
station" fork — "a derelict station remains a normal repeatable-target
archetype, not the first-run fork." This settles the open either/or above in
favor of one fixed first target, matching this document's own earlier
"guaranteed outcome, not a special-cased branch in the command handler"
implementation note below more cleanly than a two-way fork would have.

#### Implementation sketch (added 2026-08-10)

Following the multiplayer-ready event pattern (`AGENTS.md` §3) and this
codebase's existing self-snapshot convention (`ModuleData`, `DealsData`) — an
in-flight expedition's whole state, including its eventual outcome, rides one
revisioned payload rather than a separate result type.

**Wire types (`game-state-types.ts`):**

```typescript
export type ExpeditionTargetKind =
  | "relay-fragment"
  | "derelict-station"
  | "moon-outpost"
  | "asteroid-anomaly"
  | "distress-signal";

// "vesselDamaged" is the low-probability "bad roll" outcome — costs time/cargo
// to recover via salvage/repair. No kind here deletes a vessel outright; see
// the 2026-08-10 correction above.
export type ExpeditionOutcomeKind =
  | "resources"
  | "blueprint"
  | "npcRelationship"
  | "hazard"
  | "nothing"
  | "vesselDamaged";

export interface ExpeditionOutcome {
  kind: ExpeditionOutcomeKind;
  // payload shape varies by kind: resource amounts, a blueprint/unlock id,
  // an npc relationship id, or a hazard/damage description
}

export interface ExpeditionData {
  expeditionId: string;
  vesselId: string;
  targetKind: ExpeditionTargetKind;
  state: "traveling" | "returned";
  dispatchedAt: number; // server timestamp, matches VesselMoveEvent convention
  arrivesAt: number;
  outcome: ExpeditionOutcome | null; // populated once state === "returned"
}

// Backfilled 2026-08-10 from docs/gpt/decision-workshop.md §12b: independent of
// the weighted outcome roll above, every completed expedition also advances a
// per-target-kind progress track, so a streak of bad rolls still yields a
// bounded, guaranteed unlock (route intel, a story beat, a blueprint) rather
// than pure dead loss. Protects against variance; not a new currency.
export interface ExpeditionProgressData {
  targetKind: ExpeditionTargetKind;
  discoveryProgress: number;
  discoveryThreshold: number; // milestone reward fires at progress >= threshold
}
```

`GameStateData` gains `expeditions: ExpeditionData[]` and
`expeditionProgress: ExpeditionProgressData[]`; `ServerPush` gains `expedition`
and `expeditionProgress` variants carrying `Revisioned<T>`, following the
existing `vessel`/`asteroid` push pattern exactly.

**Backend (`src-tauri/src/game_state/expeditions.rs`, new domain file):**

- An `ExpeditionCatalog` (mirrors `modules.rs`'s cost/build-time catalog shape)
  holds each target kind's fuel cost, travel time, and weighted outcome table —
  first-expedition target is a fixed catalog entry with a 100%-weighted
  guaranteed outcome, not a special-cased branch in the command handler.
- `request_dispatch_expedition(vessel_id, target_kind)` — verifies the vessel is
  free and docked, deducts fuel per the catalog entry, derives `arrivesAt` from
  travel time, records the expedition, returns `ExpeditionData`
  (`state: "traveling"`) wrapped in `Revisioned<T>`. Mirrors
  `request_dispatch_vessel`'s shape closely enough that it may be worth sharing
  the dock/fuel-verification helper rather than duplicating it.
- The scheduler (`scheduler.rs`) settles `arrivesAt` the same way it settles
  vessel arrivals and mining completions: roll the catalog's weighted outcome
  table (deterministic per `(player, expedition_id)` seed, matching
  `seed_asteroids`'s determinism convention), apply the outcome (deposit
  resources, install a blueprint unlock, record an NPC relationship, or flag
  vessel damage — never destroy the vessel outright per the PvE failure rule
  above), and emit a revisioned `expedition` push with `state: "returned"` and
  `outcome` populated. Every settlement also increments that target kind's
  `ExpeditionProgressData.discoveryProgress` regardless of which outcome rolled;
  crossing `discoveryThreshold` fires its bounded milestone reward and emits an
  `expeditionProgress` push alongside the `expedition` push.

**Frontend:** `gameState.applyExpeditionEvent()` alongside the existing
`apply*Event` methods; an `ExpeditionSync`-shaped reconciler if expeditions get
their own map/HUD presence, or a dialog opened from the vessel's action button
otherwise. Outcome display reuses `bindDialogRows`/`showToast` per the UI
library conventions in `AGENTS.md` §4 — a returned expedition with a `blueprint`
outcome should trigger the same "meaningful, visible unlock" toast/dialog
treatment P3.3's objective claims use, not a bare resource-count tick.

**Verification plan (once actually implemented via `/roadmap-task`):** dispatch
the first expedition, confirm fuel deducts and the vessel shows traveling state;
let it resolve, confirm the guaranteed NPC relationship + blueprint outcome
lands and the unlocked building becomes buildable; dispatch a second expedition,
confirm outcomes now vary per the weighted table; kill the app mid-flight and
reopen, confirm `load_game_state` restores the in-flight expedition's exact
`arrivesAt` rather than resetting it.

### P3.9 — NPC opposition + radial sector progression

**Recommendation:** Two concrete precedents to build from: **Rise of Kingdoms'
Expedition mode** (a staged singleplayer-vs-AI campaign, fightable without
pulling vessels off their economic map tasks — adopt this "run alongside, not
instead of" default unless there's a specific reason to want the tension of
choosing between them) and **Star Trek Fleet Command's warp-range-gated
mining**, which ties resource yield to how far into contested space a node sits,
not just its grade — a natural extension of Voidbound's existing radial
asteroid-grade design (P2.6) with an added "how far are you willing to go" axis.
The wave-escalation _structure_ of Dark War's Zombie Siege / Whiteout's Bear
Hunt (repeatable, scaling difficulty, clear win/loss state) is reusable for solo
NPC encounters even stripped of their alliance-cooperative framing — and per the
user's 2026-08-10 decision, some version of this returning/escalating structure
should be **in scope for Phase 3**, not deferred to P7.1.

**Correction (2026-08-10):** the "run alongside, not instead of" default above
is wrong for Voidbound and should not be adopted — see the vessel/combat
dispatch exclusivity resolution in "Decisions carried in from parallel tracks."
RoK's Expedition mode is precedent for the encounter _structure_ (staged,
scaling, clear win/loss state) only; its "doesn't pull vessels off economic
tasks" property does not transfer, since Voidbound's vessels are a shared,
limited pool. Choosing combat over mining/trading/expedition work for a given
vessel is meant to be "an intentional, clearly advertised tradeoff" (matching
this same document's P3.10 recommendation, which had this right already) — the
inconsistency was only in this section's framing of the RoK precedent, not in
the rest of this track's own conclusions.

**Backing:** `voidbound-application.md` Part 1 and Part 5; `00-task-list.md`
decisions log (RoK and STFC flags).

**Open items:** the power-score decision (below, shared with P3.10) directly
feeds this task's difficulty-scaling design.

**Capital tie-in (from "Decisions carried in from parallel tracks" above):**
sector naming/theming should treat the radial bands as the approach to the
**Capital World with orbital infrastructure** (a Precursor Relay and a Helios
Array distributed across the bands) rather than an abstract difficulty ramp —
this doesn't change P3.9's mechanical recommendation above, just gives the "how
far are you willing to go" axis a concrete fiction to attach hazard/reward
framing to.

### P3.10 — PvE combat vertical slice

**Recommendation:** Give P3.10 its own identity distinct from raw combat-power
grinding — **State of Survival's Explorer Trail** (a small, troopless squad
campaign explicitly separated from the main troop/PvP layer, praised
independently as "a fantastic single player experience" in its own right) is the
model to follow rather than making this just "the same combat system pointed at
NPCs." Per the user's 2026-08-10 decision, add a headline aggregate power stat
now (Command Module + module levels + vessel tiers + research) even without PvP
matchmaking yet to consume it — NPC difficulty in P3.9/P3.10 and the P3.11
campaign's difficulty curve should be legible against this number, the way every
peer game's CP is legible against its content.

**Backing:** `voidbound-application.md` Part 1 (P3.9/P3.10 section) and
Decisions #1.

**Confirmed 2026-08-10:** dispatching the fitted vessel for a combat encounter
occupies it exclusively — the same vessel cannot mine, trade, or run an
expedition until it returns (see the vessel/combat dispatch exclusivity
resolution above). The resolver's inputs should assume this, not a parallel-pool
model.

**Open items:** the exact formula/weighting for the power stat. **Resolved
2026-08-10** (per `docs/gpt/decision-workshop.md` §20, its own reconciliation
pass — this closes what this document left open above): display **both** a named
readiness tier and the numeric Power value, each backed by the same explanatory
breakdown — not a choice between raw-number-vs-tier presentation, both
simultaneously. Either form alone was already ruled out from replacing the
underlying configuration/route/tactical detail (the 2026-08-10 narrowing below);
this settles the remaining "which one" question by not choosing. **Narrowed
2026-08-10** (per `docs/gpt/comprehensive-game-plan.md` §5's readiness-model
rule): whichever presentation is chosen, the aggregate score must never
_replace_ visibility into the specific configuration, route, or tactical
requirement behind it — "one number that hides everything else" is ruled out.

**Added 2026-08-10:** design P3.10's combat resolver so it can be pointed at
either an NPC or a stored defense-team snapshot from another local profile — see
P3.2's note above and `user-notes.md`'s async-arena reclassification. Not a
requirement to build the arena mode itself in P3.10, just a reason not to
hardcode "opponent" as NPC-only in the resolver's shape.

**Backfilled 2026-08-10 (from `docs/gpt/comprehensive-game-plan.md` §5 and
`docs/gpt/p3.1-design-gate.md`):** a failed encounter must return a combat
report that names the relevant next adjustment (research, crew, route, loadout,
or timing) rather than a bare loss — this is the PvE failure rule's UX half, not
just its mechanical half (failure costs time/fuel/cargo, per the non-negotiable
product values above, but the report is what turns that cost into a lesson
instead of a dead end).

#### Arena mode architecture sketch (cross-cutting P3.2 + P3.10, added 2026-08-10)

**Decided 2026-08-10: build this in Phase 3**, not deferred (see
`user-notes.md`'s reclassification entry and P3.2's note above). Not a ROADMAP
task ID of its own yet — flag for whoever next edits `ROADMAP.md`. Sketched here
at the same level as P3.8's sketch above so whoever picks up the task ID has
something concrete to start from rather than a blank page.

**Wire types:**

```typescript
export interface DefenseTeamData {
  profileId: string;
  vesselLoadout: VesselLoadoutRef[]; // whatever P3.7 settles on for vessel config
  crewAssignment: CrewAssignmentRef[]; // mirrors P2.8's assignment shape
  powerScore: number; // the P3.10-decided headline aggregate stat
}

export interface ArenaResultData {
  challengeId: string;
  attackerProfileId: string;
  defenderProfileId: string;
  outcome: "attackerWin" | "defenderWin";
  resolvedAt: number;
  // Resolved by direct user decision (2026-08-10): a win grants deterministic
  // drone/troop loadout components only — never credits, never base
  // resources, never a randomized pull. Per GPT's decision-workshop.md §21
  // reasoning (which the user endorsed over Gemini's re-amended "components
  // and credit rewards" version): a credits/resource payout would make
  // repeated same-device arena challenges an efficient shortcut around the
  // ship/map economy, which the daily cost ladder above is specifically
  // trying to prevent. A loss grants nothing material; its recoverability
  // comes from the vessel/save being untouched plus the P3.10 combat report
  // above, not a consolation prize. Gemini's `voidbound_strategy.md` is the
  // one that needs correcting to match on the final reconciliation pass.
  rewardSummary: ArenaReward | null; // null on a loss
}
```

**Backend:**

- `request_set_defense_team(loadout)` — the analog of an objective/module
  self-snapshot command: verifies the loadout against the profile's actual
  vessels/crew, stores it, returns the updated `DefenseTeamData`. Read, not
  contested — a profile's own defense team is always settable regardless of what
  other profiles are doing.
- `request_arena_challenge(defender_profile_id)` — reads the defender's stored
  `DefenseTeamData` (not their live resource/production state — deliberately a
  snapshot, since the "defender" isn't present to react), reuses P3.10's combat
  resolver with the attacker's current loadout on one side and the stored
  snapshot on the other, and returns a revisioned `ArenaResultData`. Critically:
  this reads across profiles but never mutates the defender's state — no
  looting, no resource transfer, matching the design-pillar distinction between
  this and P6.3's live PvP raiding.
- No scheduler involvement needed — unlike expeditions/vessels, arena combat
  resolves synchronously within the command handler, since both sides' state is
  already known at request time.

**Frontend:** a defense-team configuration dialog (crew/vessel picker, reusing
P3.7's vessel-config UI once it exists) and an opponent-list dialog populated
from other local profiles' `DefenseTeamData` — both fit the existing
`bindDialogRows` pattern (`AGENTS.md` §4) rather than needing new UI primitives.

**Activity-reward curve (backfilled 2026-08-10 from
`docs/gpt/decision-workshop.md` §12b, a real decided constraint this sketch was
missing):** arena challenges reset their cost ladder every server day — the
first challenge is free, the second through fifth become progressively more
expensive but stay worth taking for an ordinary player, and later attempts in
the same day are not meant to be materially progression-positive, existing
chiefly for local ranking/showing off. `request_arena_challenge` needs a
per-profile-per-day challenge counter to derive cost/reward from, and
`ArenaResultData.rewardSummary` needs to reflect the tapering curve rather than
a flat payout — per the win/loss reward resolution above, "tapering" means the
deterministic component payout shrinks with each same-day win, not that later
wins start paying credits/resources instead. This is the same shape of safeguard
P3.9's recurring solo challenge needs (diminishing returns so it can't become an
efficient all-day farm) — both should probably share one cost-ladder helper
rather than each task inventing its own.

**Open items:** whether local profiles need an opt-in "publish my defense team"
step before another profile can challenge them (probably yes, so a
freshly-created profile with no configured loadout isn't a free win); what
"ranking" means with only a handful of local profiles rather than a real
population (likely deferred until Phase 4 gives this a real matchmaking pool,
even if the underlying challenge/resolve mechanism ships in Phase 3).

### P3.11 — Local campaign completion + ascension

**Recommendation:** Treat this as the one task in Phase 3 that must be designed
from outside this research set. Every one of the 12 games researched is
deliberately open-ended with no completion state — the genre's climax content
(SvS, KvK, Capital Clash, EVE's null-sec sovereignty warfare) is built to be
repeated forever by a live population, not resolved once by a solo player. The
one partial exception worth holding onto: **Clash of Clans' "maxed Town Hall"
state** is a real, achievable, well- defined completion point (even though
Supercell periodically raises the ceiling with new content) — a useful
middle-ground reference between "open forever" and "one true ending": closable,
then reopened by later content, rather than either extreme. What _does_ transfer
from the genre broadly: every climax structure researched grants a
**title/governance reward** (President, Governor, Regency) on top of material
rewards — worth keeping a status/title reward in P3.11's design even in solo
form, matching what ROADMAP's own "reaching the center and defeating a major
threat" phrasing already implies.

**Backing:** `early-mid-late-game.md` (climax-structure table + the "no usable
peer template" finding, stated near-verbatim in three separate docs);
`voidbound-application.md` Part 1 and Part 5 (Clash of Clans addition);
`user-notes.md`'s Phase 3 mapping (validates P3.11 is aiming at the right
_shape_ of climax even without a template for the mechanics).

**Open items:** this is the task most worth bringing outside references into
beyond this research set (roguelike/ARPG "prestige"/NG+ patterns were suggested
in `early-mid-late-game.md` as a starting point, not researched in depth here) —
flag this explicitly for whatever session actually designs P3.11. Partially
narrowed 2026-08-10: the "Decisions carried in from parallel tracks" section
above records the user's actual carry-over preference (cosmetics/badges, ship
history, a better first expedition, a capped ascension-research tree) — still
needs a P3.11 design pass to turn into an exact contract (what resets, exact
tree shape/ceiling), but this is no longer a blank slate the way the
in-research-set peer template gap made it look.

### P3.12 — Dialog columns + Trading Post redesign

UI/layout task, no peer-game mechanical research applies directly. Worth noting
only that every peer game's shop/deal UI (Dark War's pack shop, Whiteout
Survival's multiple parallel shops) reinforces that a dense, scannable grid is
the genre-standard shape for this kind of content — mild validation for the
"three columns of bordered deal boxes" direction already in ROADMAP's
description, nothing more specific to add.

### P3.13 — Minimap two-tier zoom revamp

No direct peer-game research applies — none of the 12 games researched use a
minimap system detailed enough in available sources to inform this specifically.
Proceed independently.

### P3.14 — Context-sensitive resource bar + detail dialog

No direct peer-game research applies. Proceed independently.

### P3.15 — Per-type module art and tiered visual progression

No peer-game research applies to art direction specifically. Worth noting only
that visible tier progression on buildings (bigger/more detailed visuals at
higher levels) is universal across every game researched — confirms the
direction, adds no new specifics.

**Reclassified 2026-08-10:** this track's original research (see "What this
document deliberately leaves out" below) floated `docs/gemini/`'s tile-clearing
idea — gating usable ship tiles to Command Module level instead of the full
40*40 grid being available from minute one — and deliberately deferred it out of
Phase 3. That deferral was wrong. Both `docs/gpt/comprehensive-game-plan.md` §5
("Command Module growth should visibly open useful interior space or a new
mothership region where practical, so progression is spatially tangible rather
than only a level number") and `docs/gemini/voidbound_strategy.md` §2 ("Tangible
Spatial Ship Expansion" — CM level-ups "visibly open new interior tile rings and
physical room slots") independently landed on the same requirement for Phase 3
itself, not a later phase. Two tracks converging on the same requirement from
different framings is the same strength-of-signal this document already treats
as decisive elsewhere (see the non-negotiable product values intro). Fold this
into P3.15/P3.16's scope: Command Module level-ups should visibly unlock new
usable ship-interior area (tile rings, room slots, or a new mothership region),
not just raise a level number in a dialog — this is a room-grid/build-placement
concern as much as an art one, so it also touches P3.6's prerequisite-visibility
work (the unmet reason for a locked room should read "reach Command Module level
N" the same way a locked module type does).

**Cross-track status (second amendment round, 2026-08-10):** GPT's own
reconciliation pass confirmed this the same way — its "Confirmed" §26
(`docs/gpt/decision-workshop.md`) and its `p3.1-design-gate.md` "Resolved
cross-track decisions" both independently state Command Module levels
mechanically unlock room bands/slots in Phase 3, not individual tile-clearing.
Three-track convergence now, not two. Gemini's own document, though, still
carries an unresolved internal contradiction on this exact point even after its
second amendment: `voidbound_strategy.md`'s new "Synthesis & Gap Review Summary"
table lists "Gap 3: Spatial CM Ring Expansion & Audio SFX" as "Deferred to
future visual and audio polishing passes" — directly opposite its own §2
"Tangible Spatial Ship Expansion," which requires it as a P3.1 spec item. Same
shape of problem as the vessel-exclusivity note above: not a cross-track
disagreement anymore (three tracks agree it belongs in Phase 3), just one file
talking past itself.

### P3.16 — Space map art and visual readability

No direct peer-game research applies to art direction. Worth noting Rise of
Kingdoms' and Whiteout Survival's asteroid/resource-node visual language (shape,
not just tint, distinguishes resource class) as loosely relevant prior art
matching ROADMAP's own existing requirement ("asteroid resource class must
remain distinguishable by shape rather than tint alone").

### P3.17 — Audio

No peer-game research applies — audio wasn't a research focus for any of the 12
games. Proceed independently.

### P3.18 — Progressive crew recruitment cost

**Recommendation:** An escalating curve tied to population size (not a flat
per-hire price) is confirmed as the genre-standard approach across every
comparable recruitment/training system researched — directly matches P3.18's
stated goal. No single game's exact curve was documented precisely enough to
copy a formula; the direction is validated, the specific numbers need
Voidbound-specific tuning against its own progression pacing.

**Backing:** `voidbound-application.md` Part 1 (P3.18 section).

**Open items:** the actual curve shape/coefficients — this needs Voidbound-
specific playtesting (P3.19), not further genre research.

### P3.19 — Structured local-alpha playtest + rebalance

**Recommendation:** Make the honeymoon-then-wall pattern an explicit, named
thing this playtest hunts for — not folded into generic "confusion, dead time"
observations. Concretely: does first-week pacing collapse abruptly into a grind
wall the moment scripted P3.3 content runs out, the way every peer game's does?
Given design pillar 2 (Voidbound has no alliance layer to catch a player on the
other side of that wall), this failure mode is more dangerous for Voidbound
during Phase 3 than for any peer game — treat a "yes, it walls" result as a P0
rebalancing finding, not a nice-to-have polish note. Second, explicit target per
this research's bimodal-sentiment finding (`community-sentiment.md` Round 2):
expect casual/first-session impressions and invested/multi-hour impressions to
diverge, and design the playtest protocol to capture both rather than average
them into one signal.

**Backing:** `early-mid-late-game.md` (the wall pattern);
`community-
sentiment.md` Round 2 (bimodal sentiment as a cross-genre pattern).

**Open items:** none beyond what's already in ROADMAP's own P3.19 description —
this research mainly sharpens _what to look for_, not new mechanics to test.

**Backfilled 2026-08-10 (`docs/gpt/comprehensive-game-plan.md` §5,
`docs/gpt/p3.1-design-gate.md`):** the "sharpens what to look for" above was
still qualitative; GPT's reconciliation pass turned it into a concrete
instrumentation list worth adopting as P3.19's actual observation checklist
rather than reinventing one when the task is picked up — time to first
meaningful ship/map choice and first expedition; first confusing prerequisite
and time spent with no useful action; the objective completion/claim sequence
and the point guided content ends; route/research/vessel-choice diversity;
failure cause, recovery time, and whether the combat/expedition report taught a
next action; offline-return outcome and time to the next decision; each recorded
separately for first-session vs. multi-hour-returning cohorts rather than
averaged. This operationalizes P3.1's own open item above ("what specifically
constitutes 'content depth exhausted'") rather than leaving it a vibe check.

## What this document deliberately leaves out

Per `voidbound-application.md` Part 2, this plan does not attempt to design
alliance mechanics, PvP raiding/rallies, seasons/world-merging, curated events,
or licensed-crossover-style content — all correctly deferred to Phase 5/6/7 per
ROADMAP's own structure, and this research validates rather than challenges that
phasing (see `user-notes.md`'s four-phase mapping). Two things worth flagging
for whoever picks up those later phases, since they're now on file: **EVE
Online's corp→alliance→coalition structure and Council of Stellar Management**
as a reference class for P5.1/P5.2 far richer than any mobile SLG's, and **State
of Survival's State Merge / OGame's Exodus merge process** as two
independently-converged real-world answers for P5.5.

**Superseded 2026-08-10:** this entry originally deferred `docs/gemini/`'s
tile-clearing idea (gating usable ship tiles to Command Module level instead of
the fixed 40*40 grid being available from minute one) to a future phase. That
was wrong — see P3.15's "Reclassified 2026-08-10" note above, which pulls it
back into Phase 3 scope once two independent tracks converged on requiring it.

**Future capital-control event, not designed now (backfilled 2026-08-10 from
`docs/gpt/comprehensive-game-plan.md` §4/§8 and `docs/gpt/decision-workshop.md`
§15/§18 — this track's own research never captured this, worth recording here so
a later phase doesn't start from zero):** once a real player population exists,
the capital is meant to host a periodic alliance-vs-alliance control event, not
stay a purely solo NPC objective forever. Working shape: an NPC-held approach
wall establishes a baseline difficulty; the first alliance to capture the
objective flips immediately from attacker to defender; it must hold for a
bounded window (a working example is 30 minutes) against all challengers; a
successful holder gets one week of stewardship before the next cycle reopens the
contest. The reward is meant to be alliance-wide and capped — explicitly not a
personal power snowball — and may include temporary, automatically-rotated
ministry positions (modest, optional convenience bonuses like
construction/research speed) rather than a durable personal power grant. None of
this is a Phase 3 concern — it needs its own fairness design pass (time-zone
equity, participation limits, anti-snowball rules, defender recourse) before
Phase 5/6 implementation — but P3.9's sector theming and P3.11's campaign climax
should both avoid choices that would make this later design harder (e.g.
treating the capital as capturable by a single solo action rather than an
NPC-defended objective).

**Governance principle for later phases (backfilled 2026-08-10 from
`docs/gpt/decision-workshop.md` §19 and independently echoed by
`docs/gemini/voidbound_strategy.md`'s "STFC Rules of Engagement" framing):**
Phase 5's alliance/social layer should ship communication, cooperation, and
transparent governance tooling _before_ trying to hard-code every player
etiquette norm — "healthy player-created norms may be more durable than brittle
mandatory rules." Two tracks converged on this independently (GPT from first
principles, Gemini citing Star Trek Fleet Command's specific model); worth
carrying forward as a design constraint on P5.1/P5.2 alongside the EVE Online
governance reference already noted above, not just a stray observation.

**Economic-sink hypothesis, upgraded to cross-track candidate (backfilled
2026-08-10 from `docs/gemini/voidbound_strategy.md` §7, then confirmed by
`docs/gpt/`'s own second amendment round):** Gemini's amended plan proposes
vessel/troop repair costs (from expedition anomaly failures and PvE combat
damage) as the primary natural credits/resource sink — "continuously absorbing
excess production without artificial fee inflation." This started as one track's
proposal, but `docs/gpt/decision-workshop.md` §27 and
`docs/gpt/p3.1-design-gate.md`'s "Resolved cross-track decisions" section now
independently name repair "the leading primary-sink candidate" too — genuine
convergence, not a lone idea anymore. Both tracks agree it's still an
**experiment, not an approved balance answer**: GPT is explicit that "it passes
only if the model shows recoverable failure is neither a punitive tax nor a
waiting wall," which is the right bar — flag for the actual P3.1 economy-model
simulation and P3.19 playtest to prove out, not something to hardcode into an
implementation yet.

## Decision gates (added 2026-08-10, structure adopted from `docs/gpt/`)

This track's task-by-task notes above carry their open items inline, scattered
per task — reviewable task-by-task, but harder to audit as a whole before a gate
is actually approved. `docs/gpt/comprehensive-game-plan.md` §11 consolidates the
same kind of open items into one pre-gate checklist instead; adopting that
structure here rather than leaving it as a GPT-only artifact, since the
reconciled plan will need one regardless of which track's prose wins.

### Must decide before P3.1 is approved

1. Exact first-30-minute objective/expedition sequence — **the chapter-1
   boundary is resolved** (see P3.3's "Sub-question resolved 2026-08-10" note:
   both expeditions plus the first research entry, not just one expedition or
   Research Lab construction); the remaining piece is turning that shape into
   exact per-step copy/timing, not the boundary itself.
2. First-three-hour research and vessel choices, including respec policy
   (P3.4/P3.7).
3. Initial named sector/band identity and the NPC capital threat (P3.9),
   informed by the Capital World/Precursor Relay/Helios Array working fiction.
4. Core campaign completion condition and the definition of a recoverable loss
   (P3.10/P3.11's failure-rule application).
5. The objective/expedition wire shapes' exact fields (this document's P3.3/P3.8
   sketches are a starting point, not a locked schema).
6. The fuel/credits source-sink budget across mining, trade, production, warp,
   expedition, repair, and recovery — still genuinely open, though Gemini's
   repair-cost-as-primary-sink hypothesis above is a candidate answer to
   evaluate, not adopt untested.
7. The readiness/CP-score presentation — **resolved 2026-08-10:** display both a
   named tier and the numeric Power value, backed by one shared breakdown (see
   P3.10 above); the remaining open piece is the breakdown's exact
   formula/weighting, not the presentation format.
8. Backfilled 2026-08-10 (`docs/gpt/comprehensive-game-plan.md` §11, its own
   reconciliation pass): a data-authoring/content budget — how many objectives,
   sectors, research entries, expedition target archetypes, NPC behaviors,
   hazards, and capital clues are needed to sustain the claimed multi-week
   campaign runway. Without this, the campaign-length claim (design pillar 2's
   "does this extend the runway or just move the wall earlier" test) is a
   feature list, not a testable plan.
9. Backfilled 2026-08-10: the vessel-dispatch-exclusivity early-game risk
   flagged above — P3.1 must state what vessel availability looks like in the
   first 30 minutes so combat-vs-economic-work is a real "opportunity cost," not
   an accidental dead end while the player owns exactly one vessel.

### Must decide before P3.11

1. What ascension resets, preserves, and unlocks (the carry-over categories
   above are decided; the exact tree shape/ceiling is not).
2. Which ascension-research branches exist and their normal-play respec cost.
3. How local ascension validates, without prematurely hardcoding, later
   seasonal/cohort rules.

### Must decide before Phase 5/6 capital/social work

1. Capital-world name and final fiction (Capital World with orbital
   infrastructure is the working answer, not locked).
2. The future capital-control event's participation limits, time-zone fairness,
   and anti-snowball rules (sketched above under "What this document
   deliberately leaves out," not designed).
3. Ministry-role scope, fair automatic rotation, and leader powers.
4. The 72-hour new-player protection bubble's exact implementation (decided in
   principle per `user-notes.md`, not yet specified).

## Reconciling disagreements across tracks

Added 2026-08-10; principle adopted from `docs/gpt/comprehensive-game-plan.md`
§12.

The vessel-dispatch-exclusivity conflict resolved above (this document vs.
`docs/gemini/`) needed a real tie-break, not just documentation — worth stating
the standing rule explicitly for whoever does the next reconciliation pass
across a disagreement this document didn't catch. In priority order: preserve
the non-negotiable product values first (the "Non-negotiable product values"
section above), then the Phase 3 proof requirement (does the resolution still
let Phase 3 prove the loop solo, without silently requiring Phase 5/6 systems),
then scope/architecture cost (prefer the answer that reuses an existing pattern
— e.g. the shared combat resolver, the existing self-snapshot event shape — over
one that invents a new one). The vessel-exclusivity resolution follows this
order correctly by inspection: it's what the limited-resource-pool product
reality requires (values), it doesn't require anything beyond local state to
prove (Phase 3 proof), and it reuses P3.10's resolver as already designed
(architecture cost) — worth using as the worked example if this principle needs
re-explaining later.

## Next steps

1. User reviews this document (and the rest of `docs/claude/`) alongside the
   concurrent `docs/gemini/` and `docs/gpt/` tracks.
2. Reconciliation pass across all three tracks produces the actual solid plan —
   out of scope for this document and this research track.
3. Per `AGENTS.md`, no Phase 3 task gets implemented from this document directly
   — the eventual solid plan still needs its own review, and each individual
   task still goes through `/roadmap-task`'s own process (including its
   design-review pause for anything touching the server model) when picked up.
