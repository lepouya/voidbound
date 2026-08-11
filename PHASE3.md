# Voidbound — Phase 3+ Gameplay Design

The settled gameplay design behind `ROADMAP.md`'s Phase 3 (local playable alpha)
and the design principles it hands forward to Phases 4-7. This document is the
**reconciled output** of three parallel AI research tracks (`research/claude/`,
`research/gpt/`, `research/gemini/`) plus direct user decisions made across that
reconciliation. Where the three tracks disagreed, this document states the
resolution and why; where nothing was decided, it says so explicitly rather than
picking a side silently.

**Status:** this is design, not implementation authorization. Per `AGENTS.md`'s
review gate, no ROADMAP task is implemented from this document directly — each
task still goes through `/roadmap-task`'s own process, including its
design-review pause for anything touching the server model. The `research/`
folders remain as the evidentiary trail (12+8+3-widened games, community
sentiment, per-track decision logs) if a future session needs to see _why_ a
call was made, but this document is now the thing to read first — it supersedes
needing to read all three research tracks to pick up Phase 3 work.

## 1. Product thesis

Voidbound is a hopeful, persistent **frontier-colonization strategy game**. The
player grows a mothership, explores an increasingly valuable star system, makes
meaningful research and expedition choices, and eventually participates in a
shared capital-world society. Conflict is a consequence of expansion and scarce
inner-system geography — not the opening fantasy, and never a license for
predatory progression loss.

The distinguishing loop is the mutual exchange between two places:

```text
Mothership: crew + modules + research + vessel configuration
       -> enables
Star system: mining + routes + expeditions + NPC sectors + discoveries
       -> returns resources, knowledge, relationships, and new choices
       -> changes the mothership
```

Voidbound's existing skeleton already matches this shape (Command Module gating,
the 4-resource discipline, the event-modeled action pattern) — Phase 3 is
filling in content within an already-sound loop, not inventing a new one.

## 2. Non-negotiable product values

Cross-track convergent (reached independently by the Claude and GPT tracks from
different evidence bases, then confirmed by the user) — treat these as a
standing charter to check every future task against, not a one-time list.

1. **Hopeful colonization and discovery, not generic survival.** The fiction is
   settlement, survey, route-making, stewardship, and discovery. Do not add
   hunger, temperature, panic, or deprivation meters merely because peer games
   use them for engagement.
2. **Understandable growth.** Every change is visible, its cause is legible, and
   the next useful action is obvious — `AGENTS.md`'s existing UX principle
   (state must be visible), reaffirmed as a content requirement, not just a UI
   convention.
3. **Meaningful play across session lengths.** A 5-10 minute return, an
   hours-away plan, and a longer active session must each yield legitimate
   progress. Active play grants choice and expression, never an unbounded
   raw-power advantage over idle play.
4. **No permanent early traps.** Research/ascension branches may open different
   paths, but normal play must provide a comprehensible respec — never gate
   recovery from an under-informed early choice behind a future cash shop.
5. **Failure is recoverable.** PvE costs time, fuel, cargo, or temporary vessel
   damage — never the only critical vessel, never protected progress, never a
   reset.
6. **No P2W, no gacha, no bait-and-switch marketing; resist system bloat.**
   Don't add a currency or subsystem just because a peer game has one — every
   new currency/resource must create a distinct player decision the existing
   four resources and credits cannot already express.

## 3. System geography and the capital

The star system has **four resource-grade approach bands plus the central
district**. Players start at the outer edge with grade-1 resources; value rises
inward while usable space becomes scarcer, naturally creating route choices,
choke points, and eventually conflict. The fifth and final district is the
central 200\*200 future capital — it is not a fifth normal asteroid-grade band.

**Working fiction (not yet locked; do not hard-code names or irreversible
content assumptions):** a **Capital World with orbital infrastructure**.

- The **Capital World** — a recoverable or inhabited planet at the system
  center, the emotional heart worth reaching and stewarding.
- **Precursor Relay** fragments in orbit — justify route discovery, signal
  restoration, and system-scale logistics.
- A **Helios Array** — inner-system hazards plus high-value energy/fuel
  opportunities.
- Moons, derelicts, and outposts distribute discoveries across the approach
  bands.

Each future season can foreground a different layer of the same capital complex
(survey/reclaim the world, restore relay routes, stabilize the array) rather
than inventing a new center every season. P3.10's sector theming should treat
the radial bands as the _approach_ to this complex, not an abstract difficulty
ramp — this gives the "how far are you willing to go" axis a concrete fiction
without changing its mechanical shape.

## 4. Phase 3 experience spine

| Horizon                       | Player question                                    | Required experience                                                                                                                                                            |
| ----------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| First 5 minutes               | "What am I saving, and what do I do?"              | A functioning but sparse Command Module, a visible need, and one completed visible change.                                                                                     |
| First 30 minutes              | "Can I operate this ship and make progress?"       | Hire first crew; build/staff first producer; mine; trade; upgrade Command Module; complete the first vessel expedition and receive a relationship + unlock, not a bare number. |
| First 3 hours                 | "What kind of expedition leader am I?"             | A real research/path choice; an improved vessel; a safe-vs-risky route tradeoff; the first NPC/hazard encounter; recovery from a failure.                                      |
| Full lifecycle (aspirational) | "Can I reach and change the heart of this system?" | Roughly 1-2 weeks early / 4 weeks mid / 4 weeks late game: advance through radial bands, reach the NPC-held capital approach, overcome a major threat, choose an ascension.    |

The full-lifecycle duration is **aspirational, not a mandate for idle waits**.
P3.21's repeated fresh-profile playtests validate the first-3-hours and
several-days horizons every pass; the multi-week middle/late stretches get
validated less often, by fewer, longer-running profiles.

### The five non-negotiable local loops

These must be available **concurrently by the end of the early-game chapter** —
a fast, goal-directed braid, not a serial queue where the player finishes one
system before meeting the next. The first 30 minutes deliberately introduces
them in a guided order; Chapter 2 then makes their choices concurrent.

1. **Operate** — assign scarce crew to modules, read output consequences,
   improve the mothership.
2. **Prepare** — choose a vessel configuration and expedition plan with an
   up-front travel time, fuel cost, risk, and expected reward.
3. **Explore** — move inward through legible radial sectors.
4. **Resolve** — bounded PvE decisions with a clear preview and a recoverable
   failure.
5. **Return and reframe** — harvest outcomes, see the ship visibly change, make
   the next unlock choice, leave with an explicit return hook.

### Design against the post-onboarding wall

The "honeymoon-then-wall" pacing collapse is the single most consistently
documented failure mode across every peer game researched (12 games across the
Claude track alone) — and Voidbound is **more exposed to it than any peer
game**, since Phase 3 has no alliance layer to catch a player once solo content
thins out. Every content-adding task (P3.3, P3.4, P3.10, arena, ascension)
should be evaluated against "does this extend the runway before the wall, or
just move the wall earlier." P3.21 treats an abrupt post-onboarding
wait/prerequisite wall as a **P0 rebalance finding**, not a polish note.

## 5. Task-by-task design

Detail behind each `ROADMAP.md` Phase 3 task ID. The objective framework is
deliberately separate from its final authored Chapter-1 integration: that breaks
the former dependency cycle between objectives, prerequisites, research, and
expeditions. P3.9 is the new integration task; former P3.9-P3.20 shifted to
P3.10-P3.21 accordingly.

### P3.1 — Playable-alpha experience specification

The design-review gate for everything below. Before implementation, it must
contain, at minimum:

- The canonical first-30-minute path (§6 below) and the expected player
  questions at each step.
- A first-three-hour decision map: choices, information shown, reversible
  choices, expected waits, and available active alternatives.
- The aspirational 1-2/4/4-week arc, its completion condition, and
  absence/return behavior.
- **A simulation-ready resource, fuel, reward, and time budget** (§8) — do not
  select expedition odds, a slot-capacity formula, arena reward amounts, or
  crew-cost curves before this model exists and shows no all-day loop dominates
  a normal return cadence. Repair costs are the leading primary-sink candidate
  (§8), but only if the model shows recoverable failure is neither a punitive
  tax nor a waiting wall.
- A readiness model for NPC content: display **both** a named tier and a numeric
  Power value, backed by one shared breakdown — neither may hide a
  configuration, route, or tactical requirement behind one larger number.
- The local-defense arena contract (§6.12): published snapshots, loadout
  validation, challenge resolution, and the explicit guarantee that a challenge
  neither loots nor mutates the defender.
- **A content-authoring/data budget** — how many objectives, sectors, research
  entries, expedition target archetypes, NPC behaviors, hazards, and capital
  clues are needed to sustain the claimed campaign duration. Without this, the
  campaign-length claim is a feature list, not a testable plan.
- A content-exclusion list (§7) and the acceptance tests P3.21 will run against
  (§10).
- **The early-vessel-availability check**: state what vessel ownership looks
  like in the first 30 minutes, since it likely means exactly one vessel — see
  §6.11's opportunity-cost note.
- A durable-domain contract for every new persistent entity: authoritative
  ownership and lifecycle, save-schema migration and validator fixture,
  offline-settlement behavior, retention/history policy, and its revisioned
  snapshot/push/apply shape. This applies to objectives, vessels/loadouts,
  expedition targets/progress, arena state, research, and ascension.
- A versioned, reproducible simulation artifact in the repository (data file +
  documented runner or workbook inputs/outputs + fixed scenario seeds), rather
  than an untracked balancing sheet. It must make normal-time and accelerated
  playtest assumptions explicit.
- The warp/travel contract: mothership relocation intentionally requires every
  vessel to be recalled and docked; say how that visible global pause coexists
  with otherwise per-vessel dispatch availability and fuel planning.

### P3.2 — In-app local profile flow

Replaces launch-flag identity selection with a pre-load profile chooser. Beyond
development/test scaffolding, a profile may **publish a defense snapshot for
P3.12's local asynchronous arena** — design the profile data shape so another
profile's state being read by an arena challenge is native from day one, not
bolted on later. Preserve the P2.10 developer CLI controls.

### P3.3 — Objectives, rewards, and first-run onboarding

Build the persistent, event-modeled objective/claim framework and author the
first five strict-linear objectives: stabilize the Command Module; hire crew;
build/staff a producer; mine and return; trade. These are the actions already
available before Phase-3 systems land. See §6.1 for the shared wire shape.
Objectives are the product's teaching layer, not a disposable tutorial overlay:
every task grants a meaningful, visible unlock.

### P3.4 — Research Lab + tech tree

Three parallel branches gated by Command Module level (not one linear tree):
**growth/development** (mothership, crew, construction), **economy**
(production, mining, storage, trade, fuel/logistics), and **battle/military**
(vessel readiness, durability, tactics). The first entries in each must solve
needs the player has already encountered, not needs invented for the tree.
Respec is normal-play accessible (product value #4). No dedicated research
currency — spend the existing four resources. Later, population-dependent trees
(dueling, joint operations) wait for Phase 5/6.

### P3.5 — Live countdown-details controller

Pure refactor: once P3.4 introduces a third 1 Hz state-bound details dialog,
extract the shared open/close, `bindDialogRows`, and per-second rebuild
lifecycle from the map and ship module panels.

### P3.6 — Module build prerequisites

Generalize `unlock_command_level` into an explicit prerequisite system that
always **shows the unmet reason**, never a silent locked icon — the "central
building gates everything" pattern is genre-universal, and every instance of
_opaque_ gating in peer games produced confused community documentation trying
to explain undocumented unlock rules.

**Command Module levels mechanically unlock new usable interior room bands or
slots** — this is not merely an art treatment (see P3.17). Locked areas state
the required Command Module level through this same prerequisite UI, and each
level-up visibly expands what can be built. This does **not** require individual
tile-clearing or a separate survival-style land-claim loop — the room bands are
a fixed unlock schedule per level, not a player-driven claim mechanic.

### P3.7 — Vessel Shipyard + vessel stats and multi-tier progression

Replace today's dispatch-created, return-despawned vessel events with a durable
owned-vessel roster. A vessel has an ID, hull/tier, fitted loadout, crew
assignment, damage, and a visible status/location such as docked, traveling,
mining, expeditioning, in NPC combat, or repairing. `VesselMoveEvent` becomes an
activity of that persistent vessel, not the vessel itself. The ship sidebar
shows every owned vessel and its current location/status; any dispatch
explicitly chooses a docked vessel, while a vessel already outside can only take
actions that are legal from its current state/location or be recalled.

Keep progression purely statistical (tiers, cargo, speed, durability) as the
default: a small number of crew-linked, legible specializations (speed/range
scout, cargo/extraction miner, combat/tactics PvE hull) rather than a broad
collectible-hero system. P3.7 also introduces the durable, non-random combat
component inventory and loadout slots that P3.12's arena rewards improve; this
is equipment data, not a fifth resource or a general Items-panel replacement.
Leave named captains/specialists as a deliberately-open later extension, not
P3.7 scope. The Shipyard arrives after the research foundation (P3.4) so it is a
meaningful application of choices, not a false initial fork.

### P3.8 — Expeditions + fuel economy

See §6.2 for the full mechanic and wire-shape sketch: a relay-fragment first
target with a guaranteed outcome, a weighted outcome table from the second
expedition on, per-target survey-progress bad-luck protection, and diminishing
returns for repeated targets. Adverse outcomes cost cargo, fuel, or time, or
impose a temporary, repairable vessel-damage state — **never an outright vessel
deletion** (product value #5).

### P3.9 — Chapter-1 completion + branching handoff

Complete the strict-linear authored sequence started in P3.3: Command Module
upgrade visibly opens room slots; fixed relay-fragment expedition; Research Lab
construction; first research choice; second, normal weighted expedition with
visible target survey progress. Only after that return does Chapter 2 open its
concurrent optional economy, research, and sector milestones. This task binds
already-built systems into the first-30-minute experience; it introduces no new
objective engine or expedition rule.

### P3.10 — NPC world layer + radial sector progression

Turn the four resource-grade approach bands and central capital district into
named, legible sectors — each adds a distinct _situation_ (a resource relation,
route constraint, hazard, NPC behavior, or capital clue), not just a bigger
number. Sector theming treats the bands as the approach to the Capital World
complex (§3). Deeper travel/range must itself change the risk/reward
proposition.

This task creates NPC contacts, hazards, guarded routes/resources, target
locations, and the capital approach — not combat resolution. P3.11 later makes
the combat-capable targets and recurring solo operation playable through the
shared resolver.

### P3.11 — PvE combat vertical slice

See §6.11. Select a fitted vessel and its starter drone/troop loadout, dispatch
it to a target; resolve authoritatively from that loadout, readiness, and target
conditions — no real-time unit micromanagement required. A failed encounter
returns a **combat report identifying the next adjustment** (research, crew,
route, configuration, timing), not a bare loss. Keep the resolver
**opponent-agnostic**: it must serve both NPC targets and P3.12's local-defense
arena unmodified. This task also adds the player-initiated recurring solo
challenge/boss or wave operation on the same daily bounded reward ladder as the
arena — diminishing progression value, not a fixed-time event calendar or an
infinite efficient farm.

### P3.12 — Local asynchronous defense arena

See §6.12 for the full mechanic, wire-shape sketch, and reward policy. One
profile publishes an immutable defense snapshot (vessel loadout + crew
assignment); another local profile — or a curated NPC/ghost defense profile
during early game, before real opponents exist — challenges it through P3.11's
resolver. No live opponent, no looting, no defender mutation, no shared-world
contention; this is a local combat/loadout proof, not a substitute for online
social play. Real sessions/networking replace its practical substrate in Phase
4, but the underlying challenge/resolve mechanism ships now. Its opt-in defense
snapshot, daily attempt/cost ledger, combat-component inventory, and capped
attacker result history are durable profile state; only a narrow opponent-list
view crosses profiles.

### P3.13 — Local campaign completion + ascension

_(Renumbered from P3.12.)_ The local campaign reaches an NPC-held capital
approach and resolves a major threat or restoration milestone, then offers an
explicit ascension choice — the player must understand what resets before
accepting it.

Likely carry-over (decided; exact tree shape/ceiling still needs a design pass):
cosmetics/badges, historical ship identity, a better first expedition, and a
**capped ascension-research tree** the player chooses a branch of (exploration,
construction, economy, or similar) — explicitly **not** a resource stockpile
that would make a fresh player irrelevant. Ascension should reduce
repeated-bootstrap tedium (some bounded mechanical head start) alongside the
cosmetic carry-over, without multiplying late-game power or making a fresh
player's campaign feel pointless.

This is the one Phase 3 task with **no usable peer template** — every researched
game (12 across the widened set) is deliberately open-ended forever; the genre's
climax content is built to be repeated by a live population, not resolved once
by a solo player. Study finite prestige/New-Game+/roguelike carry-over models
(not further SLG research) before finalizing the reset contract. A status/title
reward (even in solo form) is worth keeping, matching the genre-wide pattern of
climax content granting a governance-flavored reward on top of material ones.

### P3.14 — Dialog columns + Trading Post redesign

_(Renumbered from P3.13.)_ Unchanged from prior scope: a real multi-column
dialog grid, then the Trading Post as three columns of bordered deal boxes.

### P3.15 — Minimap two-tier zoom revamp

_(Renumbered from P3.14.)_ Unchanged from prior scope.

### P3.16 — Context-sensitive resource bar + detail dialog

_(Renumbered from P3.15.)_ Unchanged from prior scope.

### P3.17 — Per-type module art and tiered visual progression

_(Renumbered from P3.16.)_ Bespoke animated rooms across the catalog plus
Research Lab and Vessel Shipyard, with visible tier upgrades as levels rise.
**This is where P3.6's room-band unlock becomes visible**: a Command Module
level-up should visibly open new interior tile rings, room slots, or ship
regions — progression is spatially tangible, not just a level number in a
dialog. Two independently-run research tracks converged on this exact
requirement for Phase 3 itself (not later polish) — treat it as decided, not a
stretch goal.

### P3.18 — Space map art and visual readability

_(Renumbered from P3.17.)_ Unchanged from prior scope: starfield, per-tier
asteroid sprites, resource class distinguishable by shape not tint alone,
extended to sectors/hazards/NPC affiliations.

### P3.19 — Audio

_(Renumbered from P3.18.)_ Unchanged from prior scope.

### P3.20 — Progressive crew recruitment cost

_(Renumbered from P3.19.)_ An escalating curve tied to population size, not a
flat per-hire price — confirmed as the genre-standard approach; exact
coefficients need Voidbound-specific playtesting, not further genre research.

### P3.21 — Structured local-alpha playtest + rebalance

_(Renumbered from P3.20.)_ See §10 for the full acceptance-test and
instrumentation checklist. Treat an abrupt post-onboarding wall as a P0 finding
(§4). Sample first-session and multi-hour-return cohorts separately rather than
averaging their feedback into one signal — this research's own finding is that
these two impressions reliably diverge across the genre.

## 6. Mechanic sketches

Implementation-level detail for the tasks above, following the multiplayer-
ready event pattern (`AGENTS.md` §3) and this codebase's self-snapshot
convention (`ModuleData`, `DealsData`) — an entity's whole state, including its
eventual outcome, rides one revisioned payload rather than a separate result
type. These are sketches to start from during `/roadmap-task`, not locked
schemas.

### 6.1 — P3.3 objective foundation + P3.9 chapter completion

Chapter 1 is **strict-linear** (exactly one actionable objective exposed at a
time). P3.3 establishes the engine and its first five objectives using only
already-available systems; P3.9 later composes the remaining authored sequence
after prerequisites, research, persistent vessels, and expeditions exist. This
is intentionally two tasks, not a weakened first-30-minute promise.

1. Stabilize the Command Module and read the resource bar.
2. Hire the first crew member; show crew capacity/assignment.
3. Build and staff a first producer; make its output visible.
4. Dispatch a vessel to a grade-1 asteroid and receive its return.
5. Use a Trading Post deal to resolve a resource mismatch.

P3.9 then continues the same chapter:

6. Upgrade the Command Module — a capability unlock, not merely a level number
   (visibly opens room slots, per P3.6).
7. Follow a relay signal to the **first expedition** (a fixed relay fragment,
   not a derelict-station-or-choice fork); it guarantees an NPC relationship and
   a Research Lab blueprint.
8. Build the Research Lab.
9. Research the **first tech entry** (the player's first pick across
   growth/economy/battle).
10. Dispatch and return the **second expedition** — this is where the weighted
    outcome table and survey-progress meter (§6.2) are first demonstrated, since
    the first expedition's outcome was fixed.

Chapter 1 completes here. Chapter 2+ switches to **concurrent optional
milestones** across economy, research, and sector-progression branches, so
objectives explain priorities without permanently replacing player choice.

**Wire shape:**

```typescript
export type ObjectiveState = "locked" | "in-progress" | "completed" | "claimed";

export interface ObjectiveData {
  objectiveId: string; // e.g. "ch1_hire_crew"
  chapterId: string;
  state: ObjectiveState;
  currentProgress: number; // for count-based objectives, e.g. "mine N units"
  targetProgress: number;
}

export interface ObjectivesData {
  activeChapterId: string;
  objectives: ObjectiveData[]; // one row during strict-linear phase; the full
  // active set once Chapter 2+ opens concurrent milestones
}
```

`GameStateData` gains `objectives: ObjectivesData`; `ServerPush` gains an
`objective` variant carrying `Revisioned<ObjectivesData>`. Objective progress
advances as a **side effect** of other commands settling (hiring crew, a build
completing, a mine completing, a trade accepted, a research entry completing, an
expedition returning) and scheduler settlement — there is no client-driven
"advance objective" command. A separate `request_claim_objective(objective_id)`
verifies `state: "completed"`, deposits the reward, transitions to `claimed`,
and advances `activeChapterId` when it was the chapter's last objective.

### 6.2 — P3.8 expedition mechanic

Four-part loop: choose a target (visible time/fuel/risk/expected value) → commit
to travel (authoritative timed state) → resolve a discovery, choice, or optional
tactical encounter → return an outcome that feeds the next ship/map decision.

**Wire shape:**

```typescript
export type ExpeditionTargetKind =
  | "relay-fragment"
  | "derelict-station"
  | "moon-outpost"
  | "asteroid-anomaly"
  | "distress-signal";

// "vesselDamaged" is the low-probability adverse outcome — costs time/cargo
// to recover via salvage/repair. No kind here deletes a vessel outright.
export type ExpeditionOutcomeKind =
  | "resources"
  | "blueprint"
  | "npcRelationship"
  | "hazard"
  | "nothing"
  | "vesselDamaged";

export interface ExpeditionOutcome {
  kind: ExpeditionOutcomeKind;
  // payload varies by kind: resource amounts, a blueprint/unlock id, an NPC
  // relationship id, or a hazard/damage description
}

export interface ExpeditionData {
  expeditionId: string;
  vesselId: string;
  targetId: string; // a concrete map target, not merely its archetype
  targetKind: ExpeditionTargetKind;
  state: "outbound" | "resolving" | "returning" | "completed";
  dispatchedAt: number;
  arrivesAt: number;
  resolvesAt: number | null;
  returnsAt: number | null;
  outcome: ExpeditionOutcome | null; // populated when resolution completes
}

export interface ExpeditionTargetData {
  targetId: string;
  targetKind: ExpeditionTargetKind;
  col: number;
  row: number;
  riskTier: string;
  available: boolean;
}

// Bad-luck protection and target fatigue are per concrete target, independent
// of the weighted outcome roll. Every completed expedition advances that
// target's track regardless of outcome, so a streak of bad rolls still yields a
// bounded, guaranteed unlock. Not a new currency.
export interface ExpeditionProgressData {
  targetId: string;
  discoveryProgress: number;
  discoveryThreshold: number; // milestone reward fires at progress >= threshold
  repeatReturns: number;
}
```

`GameStateData` gains `expeditionTargets`, active/recent `expeditions`, and
`expeditionProgress`; `ServerPush` gains matching self-snapshot variants. The
server retains active expeditions plus a capped recent-result history; the Mail
feed remains the durable long-form outcome record.

**Backend (`src-tauri/src/game_state/expeditions.rs`, new domain file):** an
`ExpeditionCatalog` (mirrors `modules.rs`'s cost/build-time shape) holds each
target kind's fuel cost, travel time, and weighted outcome table — the first
expedition is a fixed catalog entry with a 100%-weighted guaranteed outcome, not
a special-cased branch in the command handler.
`request_dispatch_expedition(vessel_id, target_id)` verifies that the selected
durable vessel is free and docked, the concrete target is available, and fuel is
affordable; it then derives the outbound, resolution, and return timestamps. The
scheduler advances each lifecycle boundary like vessel arrivals/mining
completions: it rolls the catalog's weighted outcome table (deterministic per
`(player, expedition_id)` seed, matching `seed_asteroids`'s convention), applies
the outcome, advances that target's `ExpeditionProgressData`, and returns the
same vessel to docked availability at the final boundary.

**Outcome table categories** (resources / blueprint-or-derelict-find / nothing /
research lead / NPC hostile encounter / rare damage-setback), a research-gated
slot count, and diminishing returns for repeated same-target dispatches are all
**decided in shape**; exact percentages, the slot-scaling formula, and loss
severity are **not decided** — they need the §8 simulation model before tuning,
not a competitor's numbers copied verbatim.

### 6.3-6.10 — remaining task sketches

Research/Shipyard/prerequisite/sector mechanics above are decided at the design
level (§5) without needing their own wire-shape sketch yet — write these during
their own `/roadmap-task` pass once P3.3/P3.8's patterns are proven out, reusing
this section's conventions (self-snapshot payloads, scheduler-settled side
effects, catalog-driven data).

### 6.11 — P3.11 combat and the shared vessel pool

**Combat, mining, trade, and expeditions all draw from the same limited
vessel/troop/captain pool** — confirmed directly by the user, not a decoupled
troops-vs-workers split like some peer games use. A fitted vessel dispatched to
combat is unavailable for every other dispatch until it returns.

This is **per-unit exclusivity, not a global lockout**: only the dispatched
vessel is occupied — construction, objectives, research, and any _other_
available vessel continue normally. The real risk this creates: the first 30
minutes likely has exactly one vessel, so occupying it for combat could function
as a whole-game pause during onboarding even though the intent is "opportunity
cost, not dead end." P3.1 must state what vessel availability looks like in the
first 30 minutes to make that true.

A failed encounter returns a **combat report** naming the next adjustment
(research, crew, route, configuration, timing) — this is the PvE failure rule's
UX half, not just its mechanical half (product value #5 covers the cost; the
report is what turns that cost into a lesson instead of a dead end).

**Readiness display:** show **both** a named tier and a numeric Power value,
backed by one shared breakdown — resolved directly rather than choosing between
the two presentations. Neither may replace visibility into the specific
configuration, route, or tactical requirement behind it.

### 6.12 — P3.12 local asynchronous defense arena

**Wire shape:**

```typescript
export interface DefenseTeamData {
  profileId: string;
  publishedAt: number;
  vesselLoadout: VesselLoadoutRef[]; // immutable copy, never a live reference
  crewAssignment: CrewAssignmentRef[]; // immutable copy of eligible crew roles
  powerScore: number; // the P3.11 headline aggregate stat
}

export interface ArenaStateData {
  defenseTeam: DefenseTeamData | null;
  challengeDayIndex: number;
  worthwhileAttemptsUsed: number;
  componentInventory: CombatComponentStack[];
  recentResults: ArenaResultData[]; // capped; persistent only for the attacker
}

export interface ArenaResultData {
  challengeId: string;
  attackerProfileId: string;
  defenderProfileId: string;
  outcome: "attackerWin" | "defenderWin";
  resolvedAt: number;
  // Resolved directly by the user: a win grants deterministic drone/troop
  // loadout components only — never credits, never base resources, never a
  // randomized pull, so repeated same-device challenges can't become a
  // shortcut around the ship/map economy. A loss grants nothing material;
  // its recoverability comes from the vessel/save being untouched plus the
  // P3.11 combat report, not a consolation prize.
  rewardSummary: ArenaReward | null; // null on a loss
}
```

**Backend:** `request_set_defense_team(loadout)` verifies the loadout against
the profile's actual vessels/crew and stores it — read, not contested; a
profile's own defense team is always settable regardless of what other profiles
are doing. `request_arena_challenge(defender_profile_id, attacker_vessel_id)`
validates a selected operational attacker vessel, copies its current loadout for
this synchronous simulation, reads the defender's stored `DefenseTeamData`, and
returns a revisioned `ArenaResultData` plus the attacker's updated
`ArenaStateData`. It reads across profiles but **never mutates the defender's
state** — no looting, no resource transfer, distinct from a future P6.3's live
PvP raiding. An arena challenge does not dispatch, damage, or occupy either
vessel: it is a loadout proof using snapshots, while P3.11's NPC combat is the
shared-vessel timed operation. No scheduler involvement is needed because both
sides' state is already known at request time.

`ArenaStateData` is durable per profile: its opt-in defense snapshot, daily
attempt counter/cost ladder, earned combat components, and capped recent-result
history all migrate, validate, and ride the active profile's revisioned snapshot
and push path. The defender's published snapshot is readable through a narrow
opponent-list payload only; private resources, timers, and activity never cross
the profile boundary.

**Activity-reward curve:** challenges reset their cost ladder every server day —
the first is free, the second through fifth become progressively more expensive
but stay worth taking, and later attempts in the same day are practice/show-off
only, with no P3 ranking UI or material reward. This is the same shape of
safeguard P3.11's recurring solo challenge needs; the two share one cost-ladder
helper.

**Open items:** whether local profiles need an opt-in "publish my defense team"
step before another profile can challenge them (probably yes, so a
freshly-created profile with no configured loadout isn't a free win); curated
NPC/ghost defense profiles to make the mode usable before several local profiles
with real loadouts. Ranking/matchmaking remains deferred until Phase 4 gives it
a real population.

## 7. Content exclusion list for Phase 3

No live alliance, player raid, cash-shop pressure, real-time appointment, or
shared-world player-competitive ladder is needed to prove the local alpha.
P3.12's arena is a local, snapshot-based proof — not a substitute for any of the
above, and not a reason to pull them forward.

## 8. Required simulation model before numeric tuning

Before selecting expedition percentages, a slot-capacity formula, arena/
solo-challenge reward amounts, or crew-cost coefficients, build one
authoritative, versioned design model (a repository-owned workbook or equivalent
data + runner) covering, for each of the first 30 minutes, three hours, several
days, and the aspirational longer campaign:

- Resource and fuel sources, sinks, caps, expected balances, and recovery path.
- Construction, research, mining, expedition, repair, and combat wait windows,
  and the active alternative available during each.
- Expedition target fatigue, bounded discovery progress, and bad-luck
  protection.
- Recurring solo-challenge and arena reward curves.
- Crew-cost and vessel-capacity curves.

The artifact records its inputs, outputs, formula version, and fixed scenario
seeds. It must separately model normal-time and accelerated local-playtest runs;
time scaling is a test convenience, never evidence that a daily reset or
multi-week campaign cadence has been validated at normal time.

**Do not import a competitor's numbers as the model.** OGame's expedition odds,
the `floor(sqrt(tech level))` slot formula, and any specific reward percentage
quoted anywhere in `research/` are starting references, not formulas to copy
verbatim — they need Voidbound-specific tuning against this model, confirmed by
sustained-play simulation that no all-day loop dominates a normal return
cadence.

**Repair as the primary economic sink** is the leading hypothesis for where
fuel/credits/resources drain back out of the economy (vessel/troop repair from
expedition anomalies and PvE damage) — independently proposed and then
cross-confirmed by two research tracks. It passes only if this model shows
recoverable failure is neither a punitive tax nor a waiting wall; it is an
experiment to validate, not an approved balance answer.

## 9. Decision gates still open

Tracked here so a design-review pass has one list to check rather than hunting
through §5/§6 for open items.

**Before P3.1 is approved:**

1. The exact resource/fuel/reward/time simulation model (§8) — not yet built.
2. First-three-hour research and vessel choices, including the exact respec
   cost.
3. Initial named sector/band identity and the NPC capital threat.
4. Core campaign completion condition and the exact definition of a recoverable
   loss for P3.12/P3.13.
5. The objective/expedition/arena wire shapes' exact fields (§6's sketches are a
   starting point, not a locked schema).

**Before P3.13 (ascension):**

1. What resets, preserves, and unlocks exactly.
2. Which ascension-research branches exist, their ceiling, and normal-play
   respec cost.
3. How local ascension validates — without prematurely hardcoding — later online
   seasonal/cohort rules (§11).

## 10. P3.21 acceptance tests and instrumentation

**Acceptance tests:**

- A fresh player completes the 30-minute spine without external documentation or
  a forced real-time wait that leaves no useful action.
- At three hours, two players can make different research/expedition choices and
  explain their tradeoffs; neither is objectively trapped by an early hidden
  choice.
- After a normal offline return, the player sees a concise outcome summary and
  has a new decision within one minute.
- Any early/mid-campaign failure can be recovered with known actions and bounded
  cost; no reset is required.
- A combat loss report identifies the next actionable adjustment.
- Sustained-play testing confirms diminishing returns prevent all-day
  expedition/challenge/arena farming from becoming the dominant route to
  progression.

**Instrumentation to record every pass**, first-session and multi-hour-return
cohorts reported **separately**, not averaged:

- Time to first meaningful ship/map choice and first expedition.
- First confusing prerequisite and time spent with no useful action.
- The point where guided content ends and whether a wait/prerequisite wall
  follows it (a wall here is a **P0** finding).
- Route/research/vessel-choice diversity across playtest profiles.
- Failure cause, recovery time, and whether the report taught a next action.
- Offline-return outcome and time to the next decision.

## 11. Design principles for Phase 4 and beyond

Not Phase 3 scope — recorded here so later phases don't start from zero, and so
Phase 3 decisions don't accidentally foreclose them.

**Phase 4 (networking):** transport, identity, and operational correctness only.
Do not use networking to solve an unclear loop, and do not treat it as
permission to add alliances or raids early.

**Phase 5 (alliances, worlds, economy):**

- Ship communication, cooperation, and transparent governance tooling _before_
  trying to hard-code every player etiquette norm — two research tracks
  converged on this independently (one from first principles, one citing Star
  Trek Fleet Command's "Rules of Engagement" model). Healthy player-created
  norms may be more durable than brittle mandatory rules.
- **Ministry positions** (temporary, named roles granting a modest personal
  convenience bonus — e.g. construction/research speed): optional, never
  required for progression, transparent, and **automatically fair-rotated by
  default**; leader discretion may add social meaning but cannot become a
  durable power monopoly or force a 10-minute-attendance requirement.
- P5.5 (seasons/world merging) should use P3.13's local ascension findings
  rather than assume its reset rules transfer unchanged.

**Phase 5/6 boundary — future capital-control event** (a design hypothesis, not
designed to implementation level): an NPC-held approach wall establishes a
baseline difficulty; the first alliance to capture the objective flips
immediately from attacker to defender; it must hold for a bounded window (a
working example is 30 minutes) against all challengers; a successful holder gets
roughly one week of stewardship before the next cycle reopens the contest. The
reward is alliance-wide and capped — explicitly not a personal power snowball.
This needs a dedicated fairness design pass (time-zone equity, participation
limits, defender recourse, anti-snowball rules) before any implementation;
P3.10's sector theming and P3.13's campaign climax should avoid choices that
would make this later design harder (e.g. treating the capital as capturable by
a single solo action rather than an NPC-defended objective).

**Phase 6 (adversarial conflict):**

- Apply the already-decided **72-hour new-player protection bubble** — it ends
  early only when that player initiates an active, synchronous PvP action (not a
  passive-timer-only shield). Explicit tradeoff accepted: experienced/ascended
  players who know the mechanic can play around it deliberately; this is a known
  cost of the design, not an oversight.
- Reaffirm P2.13's protected-storage rule: only explicit exposed surplus may
  ever be lootable; core protected stock and campaign viability are never raid
  targets.

**Phase 5.9 (monetization):** the working constraint is **no real-money purchase
that grants gameplay power**; cosmetics and non-powerful convenience remain a
later product decision, but any model must pass the non-predatory values in §2.

## 12. Provenance

This document reconciles:

- `research/claude/` — 12-game competitive research, community-sentiment and
  core-loop-vs-features synthesis, the user's own firsthand play notes
  (`user-notes.md`), and a Phase 3 draft plan amended across three cross-track
  reconciliation rounds.
- `research/gpt/` — a decision-workshop directly with the user (27 numbered
  captured decisions), a product-thesis-first comprehensive plan, and a narrower
  but internally consistent P3.1 design-gate outline.
- `research/gemini/` — 8-game deep dives and a strategy document that
  independently converged on several of the same conclusions (the P3.3 chapter
  boundary, the shared-vessel-pool rule, repair-as-sink), plus the most detailed
  single-task implementation sketch of the three tracks
  (`plan_p3_3_objectives.md`).

Where the three tracks disagreed, this document resolves in favor of: a direct
user decision, where one exists; otherwise cross-track convergence; otherwise
the better-reasoned position with its mechanism stated explicitly. Two
disagreements were resolved directly by the user during reconciliation
(vessel-dispatch exclusivity; arena reward composition) and are recorded above
as settled, not as open questions. See `research/claude/user-notes.md` for the
fuller blow-by-blow if a future session needs to understand _why_, not just
_what_.
