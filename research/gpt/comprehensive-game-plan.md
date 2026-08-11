# Voidbound comprehensive game plan — GPT proposal

**Status:** reconciled planning proposal. It incorporates the other research
tracks' useful findings, but does not change `ROADMAP.md`, authorize
implementation, or replace the P3.1 experience-specification gate.

**Built from:** project constraints in the root documents; external comparison
research in this folder; and the user's first-hand genre experience recorded in
`player-lifecycle-model.md` and `decision-workshop.md`.

## 1. Product thesis

Voidbound is a hopeful, persistent **frontier-colonization strategy game**. The
player grows a mothership, explores an increasingly valuable star system, makes
meaningful research and expedition choices, and eventually participates in a
shared capital-world society. Conflict is a consequence of expansion and scarce
inner-system geography—not the opening fantasy, and never a license for
predatory progression loss.

The distinguishing loop is not “wait for a building.” It is the mutual exchange
between two places:

```text
Mothership: crew + modules + research + vessel configuration
       -> enables
Star system: mining + routes + expeditions + NPC sectors + discoveries
       -> returns resources, knowledge, relationships, and new choices
       -> changes the mothership
```

The comparison games demonstrate the appeal of a legible base, rapid early
discovery, outward progression, and social spectacle. They also show the risks
of event-schedule coercion, power gaps, misleading onboarding, too many systems,
and loss/predation as monetization pressure. Voidbound should deliberately take
the former and reject the latter. See `comparison.md` and `sources.md`.

## 2. Non-negotiable product values

1. **Hopeful colonization, not generic survival.** The fiction is settlement,
   survey, route-making, stewardship, and discovery. Do not add hunger,
   temperature, panic, or deprivation meters merely because they are common in
   competitor games.
2. **Understandable growth.** The player should always see what changed, why it
   matters, and what useful action comes next.
3. **Meaningful play for different schedules.** A 5-10 minute return, a
   several-hours-away plan, and an optional longer unwind session all yield
   legitimate progress. Active play grants choices and expression, not an
   unlimited raw-power advantage over idle play.
4. **No permanent early traps.** Branches may create different openings, but
   normal play provides a comprehensible respec path. A cash shop must never be
   the only escape from an avoidable choice.
5. **Failure is recoverable.** PvE can cost time, fuel, cargo, opportunity, or
   temporary vessel damage. It cannot destroy the only critical vessel, erase
   protected progress, or require a reset.
6. **Non-predatory social game.** No aggressive cash shop, deliberate slowdown
   sold as relief, currency proliferation, whale-dominated hierarchy, required
   fixed-time attendance, or mechanics designed to make players angry at one
   another. The working P5.9 constraint is **no real-money purchase that grants
   gameplay power**; cosmetics and non-powerful convenience remain a later
   product decision. Future monetization must meet these constraints.

## 3. Player lifecycle vision

This is a player-experience lifecycle, not the numbered development roadmap.

| Lifecycle               | Intended player experience                                                                                    | Voidbound local proof                                          | Later online realization                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- |
| 1. Discovery and growth | Fast, goal-directed braid of base building, resources, missions/PvE, research, and constant new capabilities. | Phase 3's core target.                                         | Continues as new players join a world.                          |
| 2. Collective expansion | Players grow together through complementary builds, group objectives, map bonuses, and coordination.          | NPC sectors and complementary solo choices can test the shape. | Alliances, group research, territory, player interactions.      |
| 3. Capital contention   | Strong groups converge on scarce inner-system space and contest a visible system center.                      | NPC capital approach, major threat, and campaign climax.       | Alliance capital event and diplomacy.                           |
| 4. World renewal        | A mature population renews goals through ascension/seasons and eventually cross-world competition.            | P3.11 validates reset/carry-over rules locally.                | Cohort worlds, seasons, merging, and server-versus-server play. |

The target to a first ascension is the full lifecycle: early game 1-2 weeks, mid
game about 4 weeks, and late game about 4 weeks. P3.19 must validate that this
duration is earned by decisions and discovery rather than timers. The first 30
minutes, first 3 hours, and first several days are intermediate proof points,
not the intended completion length.

## 4. System geography and capital

The star system has five radial bands. Players start at the outer edge with
grade-1 resources. Resource value rises inward while usable space becomes
scarcer, naturally creating route choices, choke points, and eventually
conflict. The central 200*200 area is the future capital.

The current working fiction is a **Capital World with orbital infrastructure**:

- The **Capital World** provides the emotional heart: a recoverable or inhabited
  world worth reaching and stewarding.
- **Precursor Relay** fragments in orbit justify route discovery, signals,
  restoration, and system-scale logistics.
- A **Helios Array** provides inner-system hazards and high-value energy/fuel
  opportunities.
- Moons, derelicts, outposts, and relay segments distribute discoveries across
  the approach bands.

Each future season can foreground a different layer of the same capital complex:
survey/reclaim the world, restore relay routes, stabilize the Helios Array, then
contest stewardship. This preserves a coherent setting instead of inventing a
new center for every season.

This is a working proposal, not a locked setting decision. P3.9 should not
hard-code names or irreversible content assumptions until the capital-fiction
review is complete.

### Future capital event (not Phase 3)

The future online event concept is: an NPC holder establishes an approach-level
wall; alliances contest the objective; first capture flips the alliance from
offense to defense; it must hold against challengers for a short window (working
example: 30 minutes); successful control lasts one week. The reward is
alliance-wide, capped, and cooperative—not a personal power snowball.

The event requires a dedicated Phase 5/6 review for time-zone fairness,
participation limits, match/cluster rules, defender recourse, anti-snowball
rules, rewards, and safe treatment of nonparticipants. It must not be copied
into Phase 3 as a solo placeholder.

Temporary ministry positions are a possible social texture: modest personal
convenience boosts such as construction, logistics, research, or survey speed.
They must be optional, automatically/visibly rotated among applicants by
default, temporary, and never required for progression. A leader can add social
meaning, but cannot permanently hoard roles or force 10-minute attendance.

## 5. Phase 3: local playable alpha

### Goal

Prove that Voidbound is understandable, engaging, recoverable, and worth
returning to before it gains networking, remote accounts, real alliances, or
live shared-world PvP. Phase 3 includes an asynchronous local-defense arena: one
profile challenges another profile's published defense snapshot, without
looting, defender mutation, live opponents, or shared-world contention. Rust
remains authoritative; every mutation remains event-modeled, revisioned,
timestamped, and snapshot-replayable so no Phase 3 work becomes a dead end for
Phase 4.

### The initial experience spine

| Horizon                 | Required player experience                                                                                                                                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First 5 minutes         | Select a local profile, meet a functioning but sparse Command Module, see clear needs, and complete one visible change.                                                                                                                  |
| First 30 minutes        | Hire first crew; build and staff first producer; mine; trade; upgrade the Command Module; take the first vessel expedition; return with a relationship and a building-unlock reward.                                                     |
| First 3 hours           | Make a real research/path choice; improve a vessel; compare a safe resource route with a risky discovery; face the first NPC/hazard; recover from a failed attempt.                                                                      |
| Early to late lifecycle | Over roughly 1-2 weeks of early game, 4 weeks of mid game, and 4 weeks of late game: advance through bands, solve higher-order ship/map constraints, reach the NPC-held capital approach, overcome a major threat, and choose ascension. |

### P3.1 — experience specification (the immediate design gate)

Before implementation, write a testable specification containing:

- The canonical first-30-minute path: stabilize Command Module -> hire/assign
  crew -> build/staff producer -> mine -> trade -> Command Module capability
  upgrade -> relay-fragment expedition -> NPC relationship + Research Lab
  blueprint -> Research Lab -> first research entry -> second expedition with a
  normal weighted outcome and survey progress. Only then do strict objectives
  become concurrent explained milestones. This resolves the conflicting order,
  Lab/Shipyard fork, and chapter-boundary drafts that earlier research left
  open.
- First three-hour decision map: choices, information shown, reversible choices,
  expected waits, and available active alternatives.
- The 1-2/4/4-week provisional arc, completion condition, and absence/return
  behavior.
- Resource and fuel sinks, failure/recovery rules, core-currency budget, and
  no-predation boundaries. This must be a source/sink budget: fuel from every
  source; fuel spent on warp, expeditions, and recovery; expected early
  shortfall; and the player-visible alternatives that solve it.
- A content-runway matrix for the first 30 minutes, three hours, several days,
  and the provisional longer arc. For each horizon, identify the new decision,
  its active alternative while a timer runs, and the content that follows it.
  “The guided objectives ended and only larger prices remain” is a P0 pacing
  failure, not an acceptable genre transition.
- A simulation-ready resource, fuel, reward, and time budget. It includes crew
  costs, construction/research waits, repair/recovery, expedition target
  fatigue, bounded discovery progress, recurring-challenge/arena rewards, and
  the meaningful active alternative during each wait. Do not copy a competitor's
  odds, capacity formula, or reward ladder before this model passes sustained
  play. Repair is the leading primary-sink candidate, but it passes only if the
  model shows recoverable failure is neither a punitive tax nor a waiting wall.
- A readable readiness model for NPC content. Display both a named tier and a
  numeric Power value backed by an explanatory breakdown; neither may hide a
  configuration, route, or tactical requirement behind one larger number.
  Specify the player inputs, enemy behaviors, counter/route choices, and loss
  report that make a failed encounter teach the next action.
- A local-defense arena contract: published defense snapshots, loadout
  validation, challenge resolution, rewards, and the explicit guarantee that a
  challenge neither loots nor mutates the defender. Its normal opponent pool is
  other local profiles; curated ghost/NPC defense profiles make it usable during
  early onboarding. It reuses P3.10's resolver; online matchmaking and live
  player conflict remain later work. Published defenses are opt-in immutable
  snapshots, challenges never mutate a defender, and the mode has a curated
  ghost/NPC pool so local profiles are not a usability dependency.
- An activity-reward policy. The arena's first challenge in each server day is
  free; challenges two through five become progressively more expensive but
  remain worthwhile, and later attempts are chiefly for local ranking/showing
  off rather than material progression. Arena wins receive deterministic
  drone/troop upgrade components; losses receive no material consolation, and
  base resources are not arena prizes. Apply the same bounded high-value window
  to recurring solo challenges, while expedition target fatigue remains
  target-specific. The exact cost/reward curve must be server-authoritative and
  visible before committing.
- A content-exclusion list: no live alliance, player raid, cash-shop pressure,
  real-time appointment, or shared-world player competitive ladder is needed to
  prove the local alpha.
- Acceptance tests: comprehension without a guide; no waiting-only dead end;
  distinct research/expedition approaches; recoverability; useful offline
  return; and a recognizable completion/ascension state.
- A data-authoring/content budget for the objectives, sectors, research choices,
  expedition archetypes, NPC behaviors, hazards, and capital clues needed to
  sustain the claimed campaign duration.
- P3.19 instrumentation: time to first expedition, first confusing prerequisite,
  guided-content endpoint, dead time, route/research/vessel diversity, recovery
  time, and offline-return time to next decision.

### P3.2-P3.3 — entry and objective foundation

- **P3.2 profiles:** provide an in-app pre-load local profile chooser. In
  addition to development scaffolding and asynchronous test coverage, a profile
  may publish a defense snapshot for the local asynchronous arena. Other local
  profiles are the normal opponent pool; curated ghost/NPC defense profiles
  cover the beginning phase. Preserve the CLI tools until real Phase 4 sessions
  replace the local-profile substrate; do not treat same-device profiles as a
  substitute for real social play.
- **P3.3 objectives/rewards:** persistent, event-modeled objectives become the
  product’s teaching layer, not a disposable tutorial. The first chapter is
  deliberately strict and short: expose one actionable objective at a time and
  introduce a system only when it can be used immediately. After the first
  expedition, switch to concurrent optional milestones so objectives explain
  priorities without replacing them. Objective state, progress, reward claims,
  and unlocks must be authoritative, revisioned snapshot data with an objective
  push/apply path; the HUD shows the next action and a dialog shows the chapter
  and claimable rewards. Objective progress is advanced by verified actions and
  scheduler settlement, not by a client “advance objective” action; a separate
  server-verified claim deposits the reward.

Suggested first chapter:

1. Stabilize the Command Module and read the resource bar.
2. Hire the first crew member and show crew capacity/assignment.
3. Build and staff a first producer; make its output visible.
4. Dispatch a vessel to a grade-1 asteroid and receive its return.
5. Use a Trade Post deal to solve a resource mismatch.
6. Upgrade the Command Module as a capability unlock, not merely a level number.
7. Follow a relay signal to the first expedition; receive an NPC relationship
   and Research Lab blueprint.
8. Build the Research Lab.
9. Complete a first research entry.
10. Complete a second expedition; show its normal weighted outcome and survey
    progress.
11. Open concurrent optional milestones.

### P3.4-P3.7 — choice infrastructure

- **P3.4 Research Lab:** establish three initial visible branches:
  growth/development (mothership, crew, construction), economy (production,
  mining, storage, trade, fuel/logistics), and battle/military (vessel
  readiness, durability, tactics). Trees can have depth, but the first entries
  must solve needs the player has already encountered. Respec is normal-play
  accessible. Later population-dependent trees wait for later phases.
- **P3.5 details controller:** extract shared live-dialog behavior once research
  adds another ticking data panel.
- **P3.6 prerequisites:** reveal unmet module/research/objective requirements in
  the interface. Never silently hide a desired future possibility.
- **P3.7 Vessel Shipyard:** replace flat vessel constants with a small number of
  crew-linked, legible specializations (speed/range, cargo/extraction, and PvE
  resilience or tactics). Avoid a broad gacha-hero layer. Deterministically
  earned named captains/specialists are an optional later extension only if the
  base vessel system proves insufficient; they must not be randomized, rarity
  stacked, or required for ordinary progression. The Shipyard arrives after the
  research foundation so it is a meaningful application of choices, not a false
  initial fork.

### P3.8 — expeditions and fuel economy

The first expedition investigates a relay fragment. It is a four-part loop:

1. Choose a survey route/target and see time, fuel, risk, and expected value.
2. Commit to travel using authoritative timed state.
3. Resolve a discovery, branching choice, optional tactical/PvE encounter, or
   hazard—not only a loot timer.
4. Return an NPC relationship plus an item/blueprint that unlocks the Research
   Lab; the relationship and knowledge point to the next route.

After this, procedurally assembled missions draw from derelicts, relay
fragments, moons/outposts, asteroid anomalies, and NPC distress signals.
Outcomes may be route intel, research leads, resources, blueprints,
relationships, hazards, encounters, or trade opportunities. The content should
be data-driven and event-modeled so it can later be curated or social without a
rewrite. Use a visible outcome-category table and research-gated expedition
capacity; repeated expeditions to the same target must decline in value so route
choice stays meaningful. Randomness may cost cargo, time, fuel, or impose a
recoverable damage/rescue state, but never causes a total irreversible vessel
loss. Every completed expedition must also advance a visible target-specific
survey/discovery track, so a streak of adverse outcomes cannot consume fuel
without yielding a route, story, blueprint, or other bounded form of progress.
The target progress itself is revisioned snapshot data with a push/apply path;
it is bad-luck protection, not a new currency.

### P3.9-P3.10 — inward NPC campaign and PvE

- **P3.9:** turn five radial grades into named/legible sectors. Each band adds a
  different situation—resource relation, route constraint, hazard, NPC behavior,
  or capital clue—rather than just a larger resource number. NPC factions use
  the same authoritative state/event shapes that remote players will one day
  use. Deeper travel/range must itself change the risk/reward proposition, and
  the readiness model must state whether a player is broadly prepared. Combat
  dispatch consumes the selected vessel, so choosing combat versus mining,
  trading, or expedition work is an intentional, clearly advertised tradeoff.
  Other ship-side planning and objective actions must remain available while
  that vessel is away. Include a player-initiated recurring solo challenge/boss
  or wave operation; it must have diminishing progression rewards rather than a
  fixed-time event calendar or an infinite efficient farm.
- **P3.10:** combat begins by selecting a fitted vessel and its starter
  drone/troop loadout, then dispatching it to a target. The vessel is
  unavailable for economic work until it returns. Resolve the encounter
  authoritatively from that loadout, readiness, target conditions, and stated
  preparation choices; no real-time unit micromanagement is required in this
  first slice. A failed push must suggest a next adjustment (research, crew,
  route, configuration, or timing) and may damage the dispatched force or cost
  cargo/fuel, but cannot cause unrecoverable vessel or save loss. Keep the
  resolver opponent-agnostic: it must serve both NPCs and the P3 local-defense
  arena. A combat report must identify the relevant next adjustment rather than
  reporting a bare loss. The P3.1 economy model determines early vessel
  availability, ensuring occupied-vessel tension does not become a whole-game
  waiting state.

### P3.11 — local completion and ascension

The local campaign reaches an NPC-held capital approach and resolves a major
threat or restoration milestone. It then offers an explicit ascension choice.
The player must understand what resets before accepting it. Neither the exact
capital fiction nor the reset contract is decided by SLG research: before this
task is specified, study finite prestige/New Game+/roguelike carry-over models
and choose a local-campaign form that does not prematurely hardcode online
season rules.

Likely carry-over:

- Cosmetics, badges, ship history, and customization.
- A better first expedition.
- A capped ascension-research tree where the player chooses a branch.

Ascension benefits should broaden early strategic choices and remove repeated
bootstrap tedium, not multiply late power or make a fresh player irrelevant. The
exact reset/carry-over contract remains an open P3.11 design decision, but its
first use is intentionally the conclusion of the full multi-month lifecycle, not
a short several-day alpha loop.

### P3.12-P3.18 — readability and presentation are part of the loop

Ship/module art, starfield/asteroid readability, resource detail, minimap
context, Trading Post clarity, audio, and progressive crew cost must support the
campaign rather than wait as unrelated polish. Prioritize P3.12-P3.18 when they
remove a comprehension problem identified by P3.1/P3.19; do not let presentation
block the first vertical slice. In particular, every Command Module level must
visibly and mechanically unlock useful interior room bands or slots, with the
required level stated on locked areas. This makes progression spatially tangible
without requiring individual tile-clearing or a survival-style land-claim loop.

### P3.19 — playtest and rebalance gate

Run repeated fresh profiles at normal and accelerated time. Observe first 30
minutes, three hours, the early/mid/late lifecycle to campaign completion,
offline return, research variety, timer dead time, failure recovery, and all
three session lengths. Capture player confusion and dominant paths. Record where
scripted content ends, the next meaningful decision available afterward, and
whether the player encounters a wait/prerequisite wall; treat an abrupt
post-onboarding wall as a P0 rebalance finding. Sample both first-session and
multi-hour players rather than averaging their feedback into one signal. Run
sustained-play simulations against the repeatable expedition, solo-challenge,
and arena reward curves: a player or automation that runs all day must not earn
a material progression advantage over a player who completes the first five
worthwhile challenges in ordinary sessions. Do not advance to Phase 4 because
systems exist; advance only when P3.1 acceptance criteria hold.

Record quantitative observations alongside notes: time to first expedition,
first unclear prerequisite, time with no useful action, the end of guided
content, research/route/vessel choice diversity, failure cause/recovery time,
and time from offline return to the next decision. Report first-session and
multi-hour-return cohorts separately.

## 6. Phase 4: networked authoritative game

Once the local campaign works, move the existing event model to a real
transport:

- WebSocket event bus with rate limits and per-connection AOI.
- Server-time offset and ordered gap/resync behavior.
- Snapshot plus replay for late joiners.
- Player/system mail, production hardening, and account/session identity.

Do not use networking to solve an unclear loop. Phase 4 is transport, identity,
and operational correctness—not permission to add alliances or raids early.

## 7. Phase 5: society, worlds, and economy

Phase 5 turns the validated local center journey into cooperative world play:

- Alliance Embassy: membership, contribution, alliance boosts, and healthy
  social tooling.
- Alliance territories and inward access, preserving newcomer protection and
  avoiding permanent exclusion.
- Cohort worlds, then seasons/world merging informed by P3.11 rather than
  assumed from other games.
- Player/alliance trade and a deliberately designed credits economy.
- Alliance-aware warp and limited items/inventory.
- A monetization decision that preserves the no-gameplay-power-purchase
  constraint and the non-predatory charter.

Capital stewardship and ministry systems may begin here only after a dedicated
fairness design. Early social value should be cooperation, shared projects,
identity, and optional roles—not forcing every player into fixed-time duties.
Provide alliance governance and communication tools before attempting to
hard-code every resource etiquette rule; healthy player-created norms may be
more durable than brittle mandatory rules.

## 8. Phase 6: adversarial conflict and defence

Only after networked identity and healthy alliance/world foundations are proven:

- Add fabrication/assembly/data-archive modifiers and the fuller weapon economy.
- Extend P3 PvE rules into carefully bounded PvP, with server-authoritative
  resolution and defender recourse.
- Apply the already chosen 72-hour new-player protection bubble; it ends early
  only when that player initiates an active synchronous PvP action. It protects
  early learning without making passive account age the only safety rule.
- Enforce the protected-storage rule: only explicit exposed surplus may be
  lootable; core protected stock and campaign viability are not raid targets.
- Make attacks and expeditions consume fuel and create repair demand. A lost
  defense may expose only lootable surplus; recovery/repair must be affordable
  enough that a loss never strands the defender or erases their campaign path.
  Add repair, hangar, shield, and fleet-cap systems around that loop.
- Design/operate the capital capture-and-hold event here or at the Phase 5/6
  boundary, with a PvE approach wall, offense-to-defense handoff, short hold
  window, one-week alliance stewardship, and anti-snowball safeguards.

PvP must create stories and strategic pressure, not force player attrition. It
requires safe nonparticipant options, rules against repeated bullying, recovery
paths, and no pay-to-win control advantage.

## 9. Phase 7: live content, platforms, and presentation expansion

After the core social game is safe and fun:

- Curated GM events that add narrative, cooperative projects, or seasonal
  variation rather than fear-of-missing-out pressure.
- Mobile device validation; web map fallback; items panel; warp animation; and
  final ship interior layout.
- Continued art/audio/readability work that improves onboarding and context.

GM events are explicitly desired, but should have published rules, accessible
rewards, a nonattendance-safe baseline, and no cash-shop escalation loop.

## 10. Architecture and content rules

- Every state-changing objective, research, expedition, NPC action, combat
  result, ascension, and future ministry/capital action uses the authoritative
  event pattern: request -> server verification/derivation -> revisioned event
  -> client apply/reconcile -> snapshot/replay compatibility.
- Timers use authoritative timestamps and remain correct through offline local
  settlement now and online reconnect later.
- Keep persistent system state, runtime scheduler/delivery state, and client
  projection separate.
- World content is AOI-friendly: own entities persist across boundaries; NPC and
  capital sector state can be projected by interest area.
- Make objectives, expeditions, NPC encounters, research entries, and seasonal
  capital states data-driven with typed payloads. This enables content growth
  without converting the client into an authority.
- Do not add a currency or resource unless it creates a distinct player decision
  that the existing four resources and credits cannot express.

## 11. Decision and review gates

### Must decide before P3.1 is approved

1. Exact first-30-minute objective/expedition sequence.
2. First three-hour research and vessel choices, including respec policy.
3. Initial named sector/band identity and the NPC capital threat.
4. Core campaign completion condition and the definition of a recoverable loss.
5. The minimum viable objective/reward and expedition data shapes, including
   snapshot, push, claim, and apply behavior.
6. The fuel source/sink budget, expedition outcome categories, readiness model,
   and content-runway matrix.
7. The local-arena component-reward/loss-consolation policy, plus the
   data/content budget required to make the multi-week campaign claim credible.

### Must decide before P3.11

1. What ascension resets, preserves, and unlocks.
2. Which ascension branches exist, their ceiling, and normal-play respec cost.
3. How local ascension validates—but does not prematurely hardcode—online
   seasonal/cohort rules.

### Must decide before Phase 5/6 capital/social work

1. Capital-world name, seasonal capital states, and alliance stewardship
   fiction.
2. Catch-up and nonparticipant safety, plus implementation details for the
   chosen 72-hour new-player protection rule.
3. Alliance reward caps, ministry roles, fair automatic rotation, and leader
   powers.
4. Capture/defense timing, time-zone fairness, anti-snowball rules, and
   stewardship rewards.
5. The non-predatory economy and social-safety charter.

## 12. Reconciliation notes

When comparing this proposal to the other research plans, resolve disagreements
by preserving the product values first, then the Phase 3 proof requirement, then
scope/architecture cost. Useful questions are:

- Does the plan preserve the rapid discovery braid without feature overload?
- Does every social or combat proposal have a local proof or a reason to defer?
- Does any proposed economy, event, or respec mechanism violate the
  non-predatory constraints?
- Does the capital/world design create a compelling center before it creates a
  power hierarchy?
- Can a player who never participates in a fixed-time event still have a
  complete, respected progression path?

The next artifact after reconciliation should be the narrower P3.1 playable-
alpha experience specification, not code.
