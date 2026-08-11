# Phase 3 decision workshop

An evolving record of user design decisions and unresolved questions. This is
not yet the P3.1 product specification; it records the intent that specification
must make testable.

## Decisions captured — 2026-08-10

### 1. Primary fantasy

Voidbound is a game of **hopeful colonization and discovery/exploration**. It
should not lead with the now-familiar “survival” fantasy. Military conflict is a
natural later consequence of expansion and scarce geography, rather than the
opening identity.

**Implication:** use language such as frontier, settlement, survey, discovery,
route, orbit, and stewardship in the P3.3 objective system. Avoid manufacturing
food/temperature/panic survival meters merely because comparator games use them.

### 2. Intended lifecycle pacing

The provisional target is a long-form progression arc:

| Lifecycle stage | Target duration | Primary emphasis                                                                                      |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------- |
| Early game      | 1-2 weeks       | Discovery, rapid unlocks, first expeditions, construction/resource/research braid.                    |
| Mid game        | About 4 weeks   | Deeper research, vessel specialization, inward expansion, meaningful territory/resource choices.      |
| Late game       | About 4 weeks   | Scarce inner real estate, capital approach, major conflict/cooperation stakes, ascension preparation. |

This is a provisional target to test, not a mandate for idle waits. The P3.1
first-30-minute/three-hour/several-day targets remain the first validation
milestones; P3.19 must decide whether the long arc earns its duration.

### 3. First “I get it” moment

The intended early breakthrough is the **first vessel expedition**. It should
not be a passive timer with a generic reward: it must make the star system feel
larger, return a discovery or choice, and materially feed the next ship/map
decision.

### 4. Session model

Support all three session shapes without treating any as inferior:

- A 5-10 minute return: collect outcomes, inspect changes, make the next plan.
- A several-hours-away plan: construction, research, mining, or expedition
  timers with clear commitments and results.
- An optional longer unwind session: active exploration, objective work, PvE
  encounters, route planning, and ship configuration.

**Design rule:** active play may create more choices and pursue more objectives,
but must not turn into an unlimited resource/power advantage that punishes an
idle player. Idle progress must be meaningful, but must not replace play.

### 5. Research structure

The initial research vision is a broad, multi-front tech tree:

- **Growth/development:** construction, mothership capabilities, crew, and
  unlocks.
- **Economy:** production, mining, storage, trade, fuel efficiency, and
  exploration logistics.
- **Battle/military:** vessel combat readiness, durability, tactics, and later
  military capabilities.

Later trees may cover dueling, battle strategy, joint operations, and other
population-dependent systems. The P3.4 local version should establish the first
three without pretending to have Phase 5/6 social mechanics already.

### 6. PvE failure rule

Pushing past the current limit should be encouraged. Failure may cost time,
fuel, cargo, or temporarily damage/delay a vessel; it must not permanently
destroy the only critical vessel, erase protected progress, or require a save
reset. The next attempt should be understandable: change preparation, research,
route, or encounter choice.

### 7. System geography and the future capital

The existing map has five radial bands. Players begin at the edge with grade-1
resources and move inward toward increasingly valuable resources. Usable real
estate becomes scarce toward the core, creating a natural future choke point and
conflict zone.

The central 200*200 area is the future **capital**. Its final name/theme remains
open: a controlled planet, a capital world, a stellar station, or another shared
center. Outer bands may be understood as orbital/planetary zones and moons.

**Phase boundary:** P3 uses this geography for solo NPC sectors and the campaign
climax. Later phases can make the capital a social control objective, with
alliances and central resource/presidency-like rewards.

### 8. Narrative delivery

Use systemic objectives and environmental lore first. Chapters/zones may add a
light authored frame, but Voidbound should not require a character-heavy linear
story to explain every action.

### 9. Ascension direction

Ascension should eventually help avoid stagnant, attrition-dominated worlds by
letting a player restart a cycle with a mix of new and ascended players. The
initial likely carry-over categories are badges, permanent but bounded ascension
bonuses, cosmetics/skins, and historical ship identity.

This needs a separate decision before P3.11: exactly what resets, what persists,
how new and ascended players coexist fairly, and whether local ascension is only
a campaign replay or a first sketch of an online world lifecycle.

### 10. Product values and anti-patterns

The desired strengths are base building, exploration, genuine social connection,
and special GM-curated events. Voidbound exists in part as a response to
predatory variants of this genre.

The following are product constraints, not merely tuning concerns:

- Do not create aggressive cash-shop pressure, deliberate slowdown, or
  artificial roadblocks whose purpose is to sell relief.
- Do not create an ecosystem in which “whales” can dominate, invalidate, or prey
  on ordinary players.
- Do not make players angry at each other as a retention mechanism.
- Do not overload the game with currencies, especially currencies whose main
  purpose is cash-shop conversion.
- Do not allow predation or loss of core player progress.

The future monetization decision in P5.9 remains open, but any model must pass
these constraints. The player-facing Phase 3 economy should stay small, legible,
and fully earnable through normal play.

### 11. Local profiles are development scaffolding

Asynchronous same-device profiles exist to support local development and
testing. They are not a player-facing social feature or a substitute for online
play. By the end of Phase 4, real sessions/networking should replace their
practical need.

### 12. Expedition interaction

The intended expedition is a **mix**:

1. Survey or select a route/target with a visible risk/reward proposition.
2. Travel asynchronously with a clear fuel/time commitment.
3. Return a discovery, branching choice, or optional short tactical PvE
   encounter—not only a numeric loot result.
4. Feed the outcome back into ship building, research, map knowledge, or the
   next route decision.

This permits both short return sessions and longer active play without turning
active play into unlimited power grinding.

### 13. Ascension should reduce repeated-bootstrap tedium

Pure prestige is unlikely to be enough: repeating the exact early base
initialization after the first campaign is not desired. Ascension should likely
grant a small mechanical head start alongside badges/cosmetics, while avoiding a
gap large enough to make fresh players irrelevant.

The unresolved design task is to choose the form: a faster bootstrap, a starting
choice, one retained exploration capability, a capped legacy perk, or another
benefit. This requires a fairness model before P3.11/Phase 5 seasons.

## Capital concept exploration

The capital must eventually support scarce inner real estate, a shared-control
objective, exploration lore, and a strong visual map climax. The user likes the
ideas of a capital planet, ancient station, relay/jump-gate nexus, and stellar
megastructure. They can be combined rather than treated as exclusive.

| Concept                | Fiction                                                                                           | Map/gameplay affordance                                                             | Future social meaning                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Capital World**      | A habitable or recoverable planet at the system center.                                           | Orbital bands, surface/moon zones, visible settlement/terraforming milestones.      | Planetary stewardship, governorship, or resource administration.                                                   |
| **Precursor Relay**    | An ancient system-scale gate/communication network orbiting the core.                             | Route unlocking, signal puzzles, expeditions to restore segments.                   | Whoever governs the relay shapes travel, logistics, or system-wide projects.                                       |
| **Helios Array**       | A colossal solar-harvesting/stellar-engineering structure.                                        | Inner-system heat/radiation hazards, power/fuel rewards, escalating approach zones. | Control is valuable but demands cooperative maintenance and defence.                                               |
| **Concordia** (hybrid) | A capital world whose orbit contains an ancient relay and a solar array built by prior colonists. | Different bands reveal planet, moons, relay fragments, and array infrastructure.    | A single “capital” with several complementary objectives; supports governance without a one-room king-of-the-hill. |

No name or fiction is chosen yet. P3 can present the center as a mysterious NPC-
controlled objective; Phase 5/6 can turn its control into a player/alliance
system only after the local campaign proves why reaching it is exciting.

### 14. Capital fiction choice

The preferred capital is a **Capital World with orbital infrastructure**. The
planet supplies the hopeful-colonization heart; its relay fragments, stations,
moons, and Helios infrastructure make the surrounding map an exploration space.
Future seasons may foreground different parts of this same capital complex
(survey/reclaim the world, restore relay routes, stabilize the array) rather
than replacing the capital's identity.

### 15. Capital lifecycle and control event

The capital need not have one static role forever. Its discovery, restoration,
survey, defence, and conflict aspects can cycle through seasons/ascension-era
world states, so the same center remains meaningful over a long-running game.

The future alliance event concept is:

1. A significant PvE holder/defence first establishes an approach-level wall and
   makes reaching the capital feel earned.
2. Alliances then contest the capital in a special event. The first successful
   captor goes immediately from offense to defence.
3. The captor must hold the objective for a defined window (working example: 30
   minutes) against all other contenders.
4. A successful holder gains stewardship/control for one week, until the next
   event cycle reopens the contest.

This is a future online design hypothesis, not a Phase 3 feature. P3 should
validate the radial approach, NPC capital threat, and campaign reward. Phase 5/6
must separately design participation limits, matchmaking, defender recourse,
time-zone fairness, anti-snowball rules, and rewards before real player conflict
is authorized.

### 16. Ascension carry-over preference

Preferred carry-over categories are:

- Cosmetics and historical ship identity.
- A better first expedition.
- An ascension-based research tree.

This reinforces the desired game fantasy: an ascended player begins a new cycle
as a more capable explorer with additional strategic options, rather than simply
with a stack of resources that invalidates a new player. The ascension research
tree needs a strict ceiling and benefits that broaden opening choices more than
they multiply late-game combat/economy.

Players choose the ascension-research branch (exploration, construction,
economy, or another bounded branch), but no choice should permanently penalize
them. Any respec/reset must be free or readily attainable through normal play;
it cannot be an exclusive cash-shop remedy for an avoidable design trap.

### 17. First expedition and procedural mission pool

The first expedition should investigate either a **relay fragment** or a
**derelict station**. It establishes the capital's orbital-infrastructure lore,
delivers a discovery that helps the next route/ship choice, and can introduce a
short optional PvE or hazard decision.

Its guaranteed outcome is an **NPC relationship**, plus an item or blueprint
that unlocks the next building—likely the first Research Lab or a military/
Vessel Shipyard path. The relationship supplies an emotional/systemic reason for
the expedition; the blueprint turns that discovery into immediate base-building
momentum.

The wider procedural mission pool should include all of the following:

- Derelict stations.
- Relay fragments.
- Moons and orbital outposts.
- Asteroid anomalies.
- NPC distress signals.

Each event needs several possible outcomes (survey data, resources, research
lead, encounter, route unlock, rescue/trade relationship, hazard) so procedural
content adds choices and story texture rather than becoming a generic loot
timer.

### 18. Capital stewardship reward preference

The future capital-holder reward should be **alliance-wide**. It reinforces the
intended cooperative event goal rather than converting capital control into a
single-player personal snowball. The precise reward must be capped, legible, and
anti-snowball-reviewed in the Phase 5/6 design pass.

The stewardship layer may also include temporary, named ministry positions.
Players apply for roles that grant a specific personal convenience bonus (for
example construction time/cost reduction or research speed). The capital leader
can either assign these positions for a longer term or rotate them among
applicants on a short cadence.

**Required safeguards:** positions must not be necessary for core progression,
their bonuses must remain modest and temporary, applications/rotation must be
transparent, and no one should need to watch a 10-minute timer to stay viable.
An automatic fair rotation/queue should be the default; leader discretion may
add social meaning but cannot become favoritism or a durable power monopoly.

## Still open

1. Which ministry roles and modest benefits sound interesting beyond
   construction, cost, and research speed?
2. Should the first expedition unlock the Research Lab, Vessel Shipyard, or let
   the player choose between their blueprints?
