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
chapter (up to and including the first expedition returning); after that, switch
to concurrent optional milestones so objectives explain priorities without
permanently replacing player choice. This is the answer to the open item
directly above, not a separate question.

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
first expedition is a relay fragment or derelict station, not a random roll —
its outcome is _guaranteed_ to be an NPC relationship plus an item/blueprint,
matching P3.3's "meaningful unlock every task" convention (design pillar/P3.3
section above) rather than starting the player on OGame's weighted table cold.
The weighted-outcome table applies from the second expedition onward, once the
player has a frame of reference for what a "normal" result looks like. **Decided
2026-08-10:** the guaranteed blueprint specifically unlocks the **Research Lab**
(not the Vessel Shipyard, and not a player choice between the two) — resolves
the "still open" question `docs/gpt/decision-workshop.md` left on this point.

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
```

`GameStateData` gains `expeditions: ExpeditionData[]`; `ServerPush` gains an
`expedition` variant carrying a `Revisioned<ExpeditionData>`, following the
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
  `outcome` populated.

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

**Open items:** the exact formula/weighting for the power stat; whether it's
player-visible as a raw number (genre-standard) or abstracted into a tier/label
(more in keeping with Voidbound's current understated-UI conventions) — worth a
design-review conversation rather than assuming the genre-standard raw-number
presentation.

**Added 2026-08-10:** design P3.10's combat resolver so it can be pointed at
either an NPC or a stored defense-team snapshot from another local profile — see
P3.2's note above and `user-notes.md`'s async-arena reclassification. Not a
requirement to build the arena mode itself in P3.10, just a reason not to
hardcode "opponent" as NPC-only in the resolver's shape.

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
  rewardSummary: ArenaReward; // ranking points, credits — never resource looting
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

**Noted for later, not designed now (2026-08-10):** `docs/gemini/`'s original
research floated adapting _Tiles Survive!_'s tile-clearing mechanic to the ship
interior itself — gating usable ship tiles to Command Module level instead of
the fixed 40*40 grid being fully available from minute one. Considered and
deliberately deferred rather than folded into P3.6/P3.9: worth recording as a
candidate for a future phase/task rather than designing Phase 3 around it now.

## Next steps

1. User reviews this document (and the rest of `docs/claude/`) alongside the
   concurrent `docs/gemini/` and `docs/gpt/` tracks.
2. Reconciliation pass across all three tracks produces the actual solid plan —
   out of scope for this document and this research track.
3. Per `AGENTS.md`, no Phase 3 task gets implemented from this document directly
   — the eventual solid plan still needs its own review, and each individual
   task still goes through `/roadmap-task`'s own process (including its
   design-review pause for anything touching the server model) when picked up.
