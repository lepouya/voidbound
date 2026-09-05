# Voidbound — Phase 3+ Gameplay Design

The authoritative gameplay design behind `ROADMAP.md`'s Phase 3 local playable
alpha and the design constraints it establishes for Phases 4-7. README.md
supplies the product principles; this document translates them into Phase 3
scope. Requirements here control Phase 3 scope unless an item is explicitly
labeled as an open decision or working direction.

**Status:** this is design, not implementation authorization. Per `AGENTS.md`'s
review gate, no ROADMAP task is implemented from this document directly; each
task still goes through `/roadmap-task`'s own process, including its
design-review pause for anything touching the server model. The `research/`
folders are supporting evidence, not competing specifications.

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

The Command Module gates, four-resource discipline, and event-modeled action
pattern support this loop. Phase 3 develops that foundation into a complete
local campaign.

## 2. Non-negotiable product values

These values are the standing charter for every gameplay, economy, content, and
monetization task.

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

The 1000*1000 map uses **five concentric square zones**, as drawn in README.md.
Zones 1-4 are 100-tile-thick approach bands; zone 5 is the central 200*200
capital district, with no asteroid spawns. Players start in zone 1. Asteroid
levels are 1-3 / 4-6 / 7-9 / 10-12 across zones 1-4 respectively. **Zone,
asteroid level, and size tier are separate dimensions**; the old four resource
"grades" describe the implemented Phase-2 balance, superseded by P3.24. Named
sectors are authored situations within this geography, not extra level bands.
Solo raider levels are a separate, uncapped progression, not asteroid levels or
zone gates. Phase 3 must permit solo inward travel; alliances are later scope.

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

The "honeymoon-then-wall" pacing collapse is Phase 3's primary pacing risk.
Voidbound has no alliance layer during this phase to sustain engagement after
solo content thins out. Every content task (P3.3, P3.4, P3.10, arena, ascension)
must extend the meaningful decision runway rather than merely move the wall.
P3.21 treats an abrupt post-onboarding wait/prerequisite wall as a **P0
rebalance finding**, not a polish note.

## 5. Task-by-task design

Detail behind each `ROADMAP.md` Phase 3 task ID. The objective framework is
separate from the authored Chapter-1 integration: P3.3 supplies the reusable
framework and opening objectives, while P3.9 integrates the complete chapter
after its prerequisite, research, vessel, and expedition systems exist.

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
  expedition targets/progress, searchable POIs and their reservations/expiry,
  raider victory tracks, arena state, research, and ascension.
- A **profile/system ownership matrix** for every new domain (§6.13), including
  what another local profile may observe, what one profile may permanently
  consume or change, and how a profile-only ascension leaves the shared world
  and every other profile untouched.
- An authoritative **catalog-delivery contract** for every rule or preview the
  client must render: objective copy/rewards/unlocks, research entries,
  vessel/component stats, expedition time/fuel/odds/consequences, sector
  readiness, and combat breakdowns. Catalogs are versioned and validated before
  publishing the snapshot; the client carries no fallback gameplay numbers.
- A versioned, reproducible simulation artifact in the repository (data file +
  documented runner or workbook inputs/outputs + fixed scenario seeds), rather
  than an untracked balancing sheet. It must make normal-time and accelerated
  playtest assumptions explicit.
- The warp/travel contract: mothership relocation intentionally requires every
  vessel to be recalled and docked; say how that visible global pause coexists
  with otherwise per-vessel dispatch availability and fuel planning.
- The **offline-return contract** P3.22 will implement: which completed actions
  are summarized, how duplicate reporting is avoided, and how the summary points
  to a useful next decision rather than replaying historical toasts.
- A quantitative P3.21 exit protocol: minimum sample sizes per cohort, pass/fail
  thresholds for dead time and recovery, normal-time versus accelerated
  scenarios, the operational definition of content exhaustion, and the
  repository-owned format used to compare results across builds.

### P3.2 — In-app local profile flow

Replaces launch-flag identity selection with a pre-load profile chooser. Beyond
development/test scaffolding, a profile may **publish a defense snapshot for
P3.12's local asynchronous arena** — design the profile data shape so another
profile's state being read by an arena challenge is native from day one, not
bolted on later. The profile list may expose only deliberately public summary
data; resources, objectives, timers, research, and campaign progress remain
private. Preserve the P2.10 developer CLI controls and the §6.13 ownership
boundary.

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

The server owns the research catalog and sends a versioned display projection
containing prerequisites, costs, duration, effects, respec policy, and preview
curves. The client never reconstructs those rules from local constants.

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
collectible-hero system. Basic kinetic, drone, and plasma components must all be
available for P3.11's counter cycle without waiting for Phase-6 factories. P3.7
also introduces the durable, non-random combat component inventory and loadout
slots that P3.12's arena rewards improve; this is equipment data, not a fifth
resource or a general Items-panel replacement. Leave named captains/specialists
as a deliberately-open later extension, not P3.7 scope. The Shipyard arrives
after the research foundation (P3.4) so it is a meaningful application of
choices, not a false initial fork.

### P3.8 — Expeditions + fuel economy

See §6.2 for the full mechanic and wire-shape sketch: a relay-fragment first
target with a guaranteed outcome, a weighted outcome table from the second
expedition on, per-target survey-progress bad-luck protection, and diminishing
returns for repeated targets. Adverse outcomes cost cargo, fuel, or time, or
impose a temporary, repairable vessel-damage state — **never an outright vessel
deletion** (product value #5).

The first NPC relationship is a durable, visible contact rather than an inert
identifier: its result explains who was reached, unlocks the Research Lab
blueprint, and points to the next route or objective. P3.10 expands contacts
into sector relationships. Expeditions that offer a choice pause in an
authoritative awaiting-choice state with a visible deadline and deterministic
default; P3.11 may supply optional combat choices without making it a P3.8
dependency.

### P3.9 — Chapter-1 completion + branching handoff

Complete the strict-linear authored sequence started in P3.3: Command Module
upgrade visibly opens room slots; fixed relay-fragment expedition; Research Lab
construction; first research choice; second, normal weighted expedition with
visible target survey progress. Only after that return does Chapter 2 open its
concurrent optional economy, research, and sector milestones. This task binds
already-built systems into the first-30-minute experience; it introduces no new
objective engine or expedition rule.

### P3.10 — NPC world layer + radial sector progression

Turn the four level-bearing approach zones and central capital district into
named, legible sectors — each adds a distinct _situation_ (a resource relation,
route constraint, hazard, NPC behavior, or capital clue), not just a bigger
number. Sector theming treats the bands as the approach to the Capital World
complex (§3). Deeper travel/range must itself change the risk/reward
proposition.

This task creates the data-driven world/content schema and one complete outer-
sector vertical slice: NPC contacts, hazards, guarded routes/resources, target
locations, and a capital clue — not combat resolution. P3.11 later makes the
combat-capable targets and recurring solo operation playable through the shared
resolver; P3.23 authors the remaining campaign-sized content budget after both
foundations are proven.

### P3.11 — PvE combat vertical slice

See §6.11. Select a fitted vessel and its starter kinetic/drone/plasma loadout,
dispatch it to a target; resolve authoritatively from that loadout, readiness,
and target conditions — no real-time unit micromanagement required. A failed
encounter returns a **combat report identifying the next adjustment** (research,
crew, route, configuration, timing), not a bare loss. Keep the resolver
**opponent-agnostic**: it must serve both NPC targets and P3.12's local-defense
arena unmodified. Searchable solo raiders (§6.11) supply the recurring combat
operation; no separate boss/wave farming subsystem is implied. Authored campaign
bosses remain P3.23 content. Rewards must resist unlimited farming; whether the
arena's daily ladder fits raiders is an explicit §9 decision.

### P3.12 — Local asynchronous defense arena

See §6.12 for the full mechanic, wire-shape sketch, and reward policy. One
profile publishes an immutable defense snapshot (vessel loadout + crew
assignment); another local profile — or a curated NPC/ghost defense profile
during early game, before real opponents exist — challenges it through P3.11's
resolver. No live opponent, no looting, no defender mutation, no shared-world
contention; this is a local combat/loadout proof, not a substitute for online
social play. Real sessions/networking replace its practical substrate in Phase
4, while P3.12 delivers the underlying challenge/resolve mechanism. Its opt-in
defense snapshot, daily attempt/cost ledger, combat-component inventory, and
capped attacker result history are durable profile state; only a narrow
opponent-list view crosses profiles.

### P3.13 — Local campaign completion + ascension

The local campaign reaches an NPC-held capital approach and resolves a major
threat or restoration milestone, then offers an explicit ascension choice. The
player must understand what resets before accepting it.

Required carry-over (exact tree shape and ceiling remain open): cosmetics,
badges, historical ship identity, a better first expedition, and a **capped
ascension-research tree** the player chooses a branch of (exploration,
construction, economy, or similar) — explicitly **not** a resource stockpile
that would make a fresh player irrelevant. Ascension should reduce
repeated-bootstrap tedium (some bounded mechanical head start) alongside the
cosmetic carry-over, without multiplying late-game power or making a fresh
player's campaign feel pointless.

The reset contract must use finite prestige, New-Game+, and roguelike carry-over
models rather than an indefinitely repeating live-population climax. Include a
status or title reward alongside the bounded mechanical carry-over.

Ascension is a profile-owned transaction. It may reset that profile's ship,
resources, vessels, objectives, research, and profile-specific campaign overlay
only; it must not reset the physical shared system, consume another profile's
campaign, or use the whole-system backup mechanism as its undo path. Before
implementation, define the exact active-action precondition and a profile-
scoped confirmation/recovery policy in the §9 gate.

### P3.14 — Dialog columns + Trading Post redesign

A real multi-column dialog grid, then the Trading Post as three columns of
bordered deal boxes.

### P3.15 — Minimap two-tier zoom revamp

The minimap uses the two view modes defined by `ROADMAP.md` P3.15.

### P3.16 — Context-sensitive resource bar + detail dialog

The resource HUD and details dialog follow the scene-specific behavior defined
by `ROADMAP.md` P3.16.

### P3.17 — Per-type module art and tiered visual progression

Bespoke animated rooms across the catalog plus Research Lab and Vessel Shipyard,
with visible tier upgrades as levels rise. **This is where P3.6's room-band
unlock becomes visible**: a Command Module level-up should visibly open new
interior tile rings, room slots, or ship regions — progression is spatially
tangible, not just a level number in a dialog. This is required Phase 3
progression feedback, not optional polish.

### P3.18 — Space map art and visual readability

Starfield, per-tier asteroid sprites, resource class distinguishable by shape
rather than tint alone, and the same visual language applied to sectors,
hazards, and NPC affiliations.

### P3.19 — Audio

Ambient sound, music, interaction feedback, action feedback, independent volume
controls, and a mute path as defined by `ROADMAP.md` P3.19.

### P3.20 — Progressive crew recruitment cost

An escalating curve tied to population size, not a flat per-hire price. Exact
coefficients come from Voidbound's simulation and playtesting.

### P3.22 — Offline-return briefing and campaign journal

On profile load after meaningful elapsed time, present one concise, dismissable
briefing that groups completed construction, research, mining, expedition,
repair, objective, and combat outcomes and highlights the next available
decision. It is derived from durable entity/action completion state plus typed
notifications, records a per-profile presentation cursor so the same interval is
not shown twice, and never replays historical push toasts. A lightweight
campaign journal keeps NPC contacts, discoveries, sector clues, and recent
reports inspectable after the briefing closes; it is not a second Mail feed or a
new source of authoritative progress. This task must land before P3.21.

### P3.23 — Authored sector campaign content

Fill the versioned content budget approved in P3.1 using P3.10's world schema
and P3.11's combat resolver: remaining named approach sectors, target variants,
NPC behaviors/relationships, hazards, routes, capital clues, optional
milestones, and the authored approach to P3.13's major threat. Deliver it in
reviewable data tranches with a content validator and explicit runway coverage;
do not bury a multi-week campaign inside one code-heavy world-framework task.
This task must land before P3.13 and P3.21.

### P3.24 — Searchable POIs + asteroid level progression

Implement §6.14's search/reuse/spawn/expiry framework and replace seeded-field
mining balance with level/flavor/size-tier deposits and upgradeable extraction.
Own the map search UI, footprint-safe warp integration, save migration, catalog
previews, AOI visibility, and Chapter-1 mining objective update here. Needs
P3.1, P3.7, P3.8; lands before P3.9 and P3.11. P3.10 authors permanent world
content and P3.11 supplies raider eligibility/resolution; neither should absorb
this separate mining/world-lifecycle migration.

### P3.21 — Structured local-alpha playtest + rebalance

See §10 for the full acceptance-test and instrumentation checklist. Treat an
abrupt post-onboarding wall as a P0 finding (§4). Sample first-session and
multi-hour-return cohorts separately rather than averaging distinct experience
horizons into one signal.

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
4. Search for a level-1 asteroid, dispatch a vessel, and receive its return.
   P3.3 initially uses existing mining; P3.24 updates this objective and P3.9
   verifies the final Chapter-1 timing with the new ten-minute base extraction.
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

export interface ObjectiveDefinitionData {
  objectiveId: string;
  title: string;
  description: string;
  progressLabel: string;
  rewards: ObjectiveRewardData[];
  unlockSummary: string;
}

export type ObjectiveRewardData =
  | { kind: "resource"; resourceType: ResourceKind; amount: number }
  | { kind: "blueprint"; blueprintId: string }
  | { kind: "component"; componentId: string; amount: number }
  | { kind: "unlock"; unlockId: string };
```

`GameStateData` gains `objectives: ObjectivesData`; `ServerPush` gains an
`objective` variant carrying `Revisioned<ObjectivesData>`. Objective progress
advances as a **side effect** of other commands settling (hiring crew, a build
completing, a mine completing, a trade accepted, a research entry completing, an
expedition returning) and scheduler settlement — there is no client-driven
"advance objective" command. A separate `request_claim_objective(objective_id)`
verifies `state: "completed"`, deposits the reward, transitions to `claimed`,
and advances `activeChapterId` when it was the chapter's last objective. The
definitions and typed reward previews ride the versioned Phase-3 content
catalog; the state payload references them by ID so display copy and
authoritative reward data are available without duplicating them into every
push. `ObjectiveRewardData` is the catalog's closed tagged union over existing
resources (including credits), blueprints, components, and explicit unlocks—not
an unstructured client-interpreted object.

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

export type ExpeditionOutcome =
  | { kind: "resources"; resources: Partial<Record<ResourceKind, number>> }
  | { kind: "blueprint"; blueprintId: string }
  | { kind: "npcRelationship"; npcId: string; relationshipStateId: string }
  | { kind: "hazard"; hazardId: string; consequenceId: string }
  | { kind: "nothing" }
  | { kind: "vesselDamaged"; damage: number; recoveryRuleId: string };

export interface ExpeditionChoiceOptionData {
  choiceId: string;
  label: string;
  consequencePreview: string;
  outcomeSetId: string;
  optionalCombatTargetId: string | null;
}

export interface ExpeditionChoiceData {
  options: ExpeditionChoiceOptionData[];
  expiresAt: number;
  defaultChoiceId: string;
}

export interface ExpeditionOutcomePreviewData {
  outcomeSetId: string;
  probabilityBasisPoints: number;
  expectedValueSummary: string;
  maximumDownsideSummary: string;
}

export interface ExpeditionPreviewData {
  travelDurationMs: number;
  resolutionDurationMs: number;
  returnDurationMs: number;
  fuelCost: number;
  outcomes: ExpeditionOutcomePreviewData[];
  guaranteedDiscoveryProgress: number;
}

export interface ExpeditionData {
  expeditionId: string;
  vesselId: string;
  targetId: string; // a concrete map target, not merely its archetype
  targetKind: ExpeditionTargetKind;
  state:
    | "outbound"
    | "resolving"
    | "awaiting-choice"
    | "returning"
    | "completed";
  dispatchedAt: number;
  arrivesAt: number;
  resolvesAt: number | null;
  returnsAt: number | null;
  outcomes: ExpeditionOutcome[] | null; // populated when resolution completes
  choice: ExpeditionChoiceData | null;
}

export interface ExpeditionTargetData {
  targetId: string;
  targetKind: ExpeditionTargetKind;
  col: number;
  row: number;
  riskTier: string;
  available: boolean;
  preview: ExpeditionPreviewData; // server-projected time, fuel, weighted
  // outcome categories, downside bounds, and guaranteed-progress amount
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

export interface NpcContactData {
  npcId: string;
  relationshipStateId: string;
  introducedAt: number;
  sourceExpeditionId: string;
  unlockedRouteIds: string[];
  availableInteractionIds: string[];
}
```

`GameStateData` gains `expeditionTargets`, active/recent `expeditions`, and
`expeditionProgress`, plus profile-owned `npcContacts`; `ServerPush` gains
matching self-snapshot variants. The server retains active expeditions plus a
capped recent-result history; the Mail feed remains the durable long-form
outcome record. P3.8 uses `NpcContactData` for the functional first contact;
P3.10 expands its interaction and relationship-state vocabulary.

`ExpeditionPreviewData` is produced by the server from the versioned expedition
catalog and contains every number shown before dispatch. `ExpeditionChoiceData`
contains stable choice IDs, display copy, an expiry timestamp, and the
server-declared default. The `request_resolve_expedition_choice` command takes
an expedition ID and choice ID and verifies the still-pending choice; offline
settlement applies the default after expiry. An optional combat choice
references a P3.11 target and is not generated until that resolver exists.

**Backend (`src-tauri/src/game_state/expeditions.rs`, new domain file):** an
`ExpeditionCatalog` (mirrors `modules.rs`'s cost/build-time shape) holds each
target kind's fuel cost, travel time, and weighted outcome table — the first
expedition is a fixed catalog entry with a 100%-weighted guaranteed outcome
bundle (relationship plus blueprint), not a special-cased branch in the command
handler. `request_dispatch_expedition(vessel_id, target_id)` verifies that the
selected durable vessel is free and docked, the concrete target is available,
and fuel is affordable; it then derives the outbound, resolution, and return
timestamps. The scheduler advances each lifecycle boundary like vessel
arrivals/mining completions: it rolls the catalog's weighted outcome table
(deterministic per `(player, expedition_id)` seed, matching `seed_asteroids`'s
convention). A direct outcome is applied immediately; a choice outcome enters
`awaiting-choice` until the verified choice or expiry default resolves it. Only
then does the server advance that target's `ExpeditionProgressData` and schedule
the same vessel's final return to docked availability.

**Outcome table categories** (resources / blueprint-or-derelict-find / nothing /
research lead / NPC hostile encounter / rare damage-setback), a research-gated
slot count, and diminishing returns for repeated same-target dispatches are all
**decided in shape**; exact percentages, the slot-scaling formula, and loss
severity are **not decided** — they need the §8 simulation model before tuning,
not a competitor's numbers copied verbatim.

### 6.3-6.10 — remaining task sketches

Research, Shipyard, prerequisite, and sector mechanics are defined at the design
level in §5 without separate wire-shape sketches. Write these during their own
`/roadmap-task` pass once P3.3/P3.8's patterns are proven out, reusing this
section's conventions (self-snapshot payloads, scheduler-settled side effects,
catalog-driven data).

### 6.11 — P3.11 combat and the shared vessel pool

**Every vessel-dispatched activity draws from the same limited vessel, crew, and
fitted-component pool. Named captains remain outside Phase 3.** Combat, mining,
expeditions, and any future physical trade route. P1.12's dockside Trading Post
deal is an immediate module action and does not occupy a vessel; Phase 3 does
not silently turn it into a trade-route system. A fitted vessel dispatched to
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
backed by one shared breakdown. Neither may replace visibility into the specific
configuration, route, or tactical requirement behind it.

**Solo raiders:** one dispatched vessel fights one NPC target. Level 1 is
unlocked from the start and beatable by the starting vessel with basic units;
content availability must not imply a compulsory combat step before the guided
chapter is ready. Defeating level N unlocks N+1 for that profile; there is no
designed maximum level. The baseline difficulty grows by `1.25^(N-1)`, with the
exact affected stats and numeric representation decided in P3.1. This is not a
win-probability multiplier. Persist the progression and settle win/unlock/reward
once, including offline completion; retries cannot duplicate credit.

Three specialties use the same counter cycle for player and NPC loadouts:
kinetic beats plasma, plasma beats drone, drone beats kinetic. A raider's
specialty is stronger than its other two weapon types. P3.7 supplies basic
components for all three before P6.2 introduces factories. Preview specialty,
counters, and readiness breakdown; the counter multipliers, mixed-loadout
resolution, and whether unlocks are shared across specialties remain §9 gates.
Use plasma as the planning label; final laser/plasma display naming is open.

### 6.12 — P3.12 local asynchronous defense arena

**Wire shape:**

```typescript
export interface DefenseTeamData {
  profileId: string;
  publishedAt: number;
  vesselLoadout: VesselLoadoutRef; // one-vessel P3 arena, immutable copy
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
  // A win grants deterministic kinetic/drone/plasma loadout components only — never
  // credits, never base resources, never a
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

The P3 arena is deliberately **one fitted vessel versus one fitted vessel**.
"Defense team" means that vessel plus its eligible crew and deterministic
kinetic/drone/plasma components; multi-vessel formations wait until a later
combat design explicitly earns their complexity.

`ArenaStateData` is durable per profile: its opt-in defense snapshot, daily
attempt counter/cost ladder, earned combat components, and capped recent-result
history all migrate, validate, and ride the active profile's revisioned snapshot
and push path. The defender's published snapshot is readable through a narrow
opponent-list payload only; private resources, timers, and activity never cross
the profile boundary.

**Activity-reward curve:** challenges reset their cost ladder every server day —
the first is free, the second through fifth become progressively more expensive
but stay worth taking, and later attempts in the same day are practice/show-off
only, with no P3 ranking UI or material reward. P3.11 also needs bounded
progression rewards, but its raider reward policy remains open (§9); share a
helper only if the reviewed policies actually match.

Publishing is explicitly opt-in, so a newly-created or unconfigured profile is
never exposed as a free opponent. Curated NPC/ghost defense profiles make the
mode usable before several local profiles have real loadouts. Ranking and
matchmaking remain deferred to P6.8, after online identity gives them a real
population and P4.7 supplies the safety boundary.

### 6.13 — profile-owned progress versus shared-system state

Phase 3's local profiles share one physical system but must not consume one
another's finite campaign. Use this ownership boundary:

| Domain                                                                        | Owner                      | Cross-profile rule                                                                                          |
| ----------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Map geometry, sector definitions, asteroid field                              | System                     | Shared physical world; mined asteroids and spawns remain globally visible.                                  |
| Modules, resources, crew, vessels, research, objectives                       | Profile                    | Private except for deliberately public identity/arena summaries.                                            |
| Discoveries, NPC relationships, guarded-route state, bosses, capital progress | Profile campaign overlay   | Two profiles may encounter the same authored location independently; one cannot consume another's campaign. |
| Ambient NPC traffic or renewable public targets                               | System                     | May be shared only when non-exclusive or deterministically renewable.                                       |
| Arena defense                                                                 | Profile-published snapshot | Opt-in, immutable cross-profile read; a challenge never mutates the defender.                               |
| Ascension                                                                     | Profile                    | Resets only the ascending profile and its campaign overlay.                                                 |

Every persistent domain still names its authoritative owner in P3.1. Any later
feature that adds competitive contested cross-profile writes belongs to online
multiplayer scope. P3.24 preserves existing exclusive mining reservations in the
shared local world; it does not add combat over another profile's targets.

### 6.14 — P3.24 searchable POIs and asteroid progression

README.md's search-first map replaces a densely pre-seeded list of mining and
repeatable combat options. P3.24 owns the generic search lifecycle and mining
conversion; P3.11 plugs solo raiders into it. Authored landmarks, the guaranteed
relay expedition, and profile campaign targets are not silently made temporary.

- Search from the player's mothership for a POI kind and level (asteroid flavor
  and raider specialty filters remain a UI decision). Reuse an eligible nearby
  target, otherwise spawn a valid one. The proposed radius is about 50 tiles;
  exact distance metric, boundary behavior, and no-valid-placement response are
  open. Asteroid levels must obey the destination zone even near a boundary.
- Search is a server-verified state-mutating action: validate unlocks, choose
  reuse/placement under the state lock, and return revisioned entity data. A
  result is not a reservation; dispatch revalidates and atomically claims use.
  Searching does not grant resources, victory, or progression.
- An unused spawned POI expires after one hour. P3.1 must define when the clock
  starts, whether reuse resets it, and what happens after an abandoned action.
  Reserved, outbound, and actively used targets must not expire underneath an
  action. Scheduler and offline settlement use the same lifecycle; removals
  carry revision tombstones. Depleted asteroids disappear as today.
- Spawn and warp validate whole footprints against map bounds, occupied ships,
  POIs, and the capital exclusion. A mothership cannot warp onto a spawned POI.
  Bound duplicate searches/spawn density without a universal daily energy cap;
  define contention, expiry races, and migration of the old seeded field.
- Search radius is independent of camera AOI. A roughly 50-tile radius around a
  mothership is not guaranteed to fit the current camera-centered 100*100
  window. Define how results remain inspectable/selectable and enter the normal
  revisioned AOI projection without widening all world broadcasts.

Asteroid deposit is `600 * 2^(level-1) * sizeMultiplier`, with levels 1-12, size
multipliers 1/4/9, footprints 1*1 / 2*2 / 3*3, and occurrence weights 9:3:1.
Flavor selects exactly one of the four resources. Starting extraction is 1
resource/second per asteroid; research and vessel upgrades increase it. Level-12
Tier III holds 11,059,200 resources (18,432 times level-1 Tier I), requiring 128
days at the base rate. These are proposed balance inputs to §8; do not silently
retain the older grade multiplier or 15-60-minute small-node range. Define
cargo-limited returns, remaining deposits, upgraded extraction, recall, and fuel
together with P3.7/P3.8; a huge deposit cannot imply infinite vessel cargo or
strand the only vessel for days.

Physical asteroid targets remain system-owned. Raider victory/unlock records are
profile-owned; P3.1 decides whether reusable raider bodies are shared renewable
targets or profile overlays. Neither search nor expiry may erase another
profile's campaign. Expedition discovery/fatigue tracks keep stable identity and
are not reset by spawning another temporary target.

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
- README mining inputs (600 base deposit, level doubling, size weights 9:3:1, 1
  resource/second), travel plus ten-minute first extraction within Chapter 1,
  cargo/recall cycles, upgrade rates, and high-level deposit lifetimes.
- Raider 1.25x and future elite 1.5x difficulty growth: define the scaled stats,
  counter effects, reward scaling, numerical limits, and attainable progression.
  Future elite projections do not authorize alliance mechanics in Phase 3.

The artifact records its inputs, outputs, formula version, and fixed scenario
seeds. It must separately model normal-time and accelerated local-playtest runs;
time scaling is a test convenience, never evidence that a daily reset or
multi-week campaign cadence has been validated at normal time.

**Do not import a competitor's numbers as the model.** OGame's expedition odds,
the `floor(sqrt(tech level))` slot formula, and specific reward percentages in
`research/` are reference inputs, not formulas. Voidbound-specific tuning must
use sustained-play simulation to show that no all-day loop dominates a normal
return cadence.

**Repair as the primary economic sink** is the leading hypothesis for where
fuel, credits, and resources drain back out of the economy through vessel and
troop repair after expedition anomalies and PvE damage. Adopt it only if the
model shows recoverable failure is neither a punitive tax nor a waiting wall.

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
5. The objective/research/vessel/expedition/combat/arena content catalogs and
   wire shapes' exact fields (§6's sketches are a starting point, not a locked
   schema), including schema-version failure behavior and every value the client
   previews before commitment.
6. The profile/system ownership matrix for NPCs, targets, campaign overlays,
   ascension, and cross-profile visibility (§6.13).
7. The interactive expedition-choice lifecycle, first-contact gameplay value,
   offline-return briefing contract, and typed journal entries.
8. P3.21's quantitative sample sizes, thresholds, content-exhaustion definition,
   and repository-owned results format.

9. Search radius/metric/filters, cross-zone eligibility, result/AOI delivery,
   reuse ordering, spawn limits, expiry clock semantics, reservation release,
   and existing-field save migration (§6.14).
10. Mining upgrade and cargo rules that make the proposed exponential deposits
    playable, including first-30-minute scheduling (§8).
11. Raider difficulty stats/counter coefficients, per-specialty vs. shared
    unlocks, repeat/first-win rewards and activity limits, target ownership, and
    safe numeric handling of uncapped levels. No arena daily cap is assumed.

**Before P3.13 (ascension):**

1. What resets, preserves, and unlocks exactly.
2. Which ascension-research branches exist, their ceiling, and normal-play
   respec cost.
3. How local ascension validates — without prematurely hardcoding — later online
   seasonal/cohort rules (§11).
4. The active-action precondition and profile-scoped confirmation/recovery path;
   whole-system backups must not roll back unrelated profiles.

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
- A combat loss report identifies the next actionable adjustment; level-1
  raiders are beatable with the starting vessel/basic units, and N+1 cannot be
  fought before the required victory credit. Repeat settlement grants no extras.
- Search reuses eligible targets before spawning, respects zone/footprint rules,
  and works across AOI boundaries. Unused POIs expire across offline returns;
  in-flight/active targets survive, and warp cannot overlap a POI.
- Mining previews match level/flavor/size deposits and upgraded extraction;
  cargo-limited returns and recalls preserve remaining deposits correctly.
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

P3.1 supplies the numeric thresholds and minimum cohort sizes before feature
implementation begins. P3.21 records raw observations and summarized pass/fail
results in a versioned repository artifact, with separate normal-time and
accelerated runs; accelerated completion never substitutes for the required
normal-time return-cadence sample.

## 11. Design principles for Phase 4 and beyond

Not Phase 3 scope — recorded here so later phases don't start from zero, and so
Phase 3 decisions don't accidentally foreclose them.

**Phase 4 (networking):** transport, identity, durable server storage, and
operational correctness only. P4.0 owns the relational event log/materialized
state/outbox foundation and P4.5 owns backup, recovery, and observability. Do
not use networking to solve an unclear loop, and do not treat it as permission
to add alliances or raids early.

**Phase 5 (alliances, worlds, economy):**

- Ship communication, cooperation, and transparent governance tooling _before_
  trying to hard-code every player etiquette norm. Support healthy
  player-created norms instead of relying only on brittle mandatory rules.
- **Ministry positions** (temporary, named roles granting a modest personal
  convenience bonus — e.g. construction/research speed): optional, never
  required for progression, transparent, and **automatically fair-rotated by
  default**; leader discretion may add social meaning but cannot become a
  durable power monopoly or force a 10-minute-attendance requirement.
- P5.5 (seasons/world merging) should use P3.13's local ascension findings
  rather than assume its reset rules transfer unchanged.
- Broad public mail/chat/recruitment does not ship without P4.7's blocking,
  reporting, moderation, audit, privacy, and anti-harassment path. Player safety
  is a release requirement, not post-launch polish.

**P5.10 — alliance elite raids:** cooperative NPC combat requires alliance
membership and multiple participants. Elite difficulty grows by `1.5^(N-1)`;
initiating level N requires a prior elite N-1 victory (level 1 is the entry).
Members may join an alliance member's higher-level raid without that unlock.
Before implementation, decide whether assisted victories advance the joiner's
initiation ceiling, independently of solo-raider progression. Specify rally
travel/commit/abort, participant and target reservations, offline resolution,
contribution/reward credit, recoverable losses, and shared-target expiry. This
is cooperative PvE, not P6.3 player raiding or the capital-control event.

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

- Apply a **72-hour new-player protection bubble**. It ends early only when that
  player initiates an active, synchronous PvP action, not from passive activity.
  Experienced or ascended players may deliberately remain protected by avoiding
  active PvP; PvP balance and matchmaking must account for that behavior.
- Reaffirm P2.13's protected-storage rule: only explicit exposed surplus may
  ever be lootable; core protected stock and campaign viability are never raid
  targets.

**Phase 5.9 (monetization):** the working constraint is **no real-money purchase
that grants gameplay power**; cosmetics and non-powerful convenience remain a
later product decision, but any model must pass the non-predatory values in §2.

**Phase 7.1 (curated events):** published rules, capped accessible rewards, and
a nonattendance-safe baseline are mandatory. Live content must add narrative or
cooperative variety without making ordinary sessions suboptimal through FOMO,
fixed-time obligation, or cash-shop escalation.

## 12. Research references

The competitive research, community sentiment, design workshops, and detailed
mechanic studies under `research/claude/`, `research/gpt/`, and
`research/gemini/` support this specification. They provide rationale and source
material when a requirement needs deeper review. If a research note conflicts
with this document, this document controls.
