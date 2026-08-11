# Comparison synthesis: loops, engagement, and progression

## Executive finding

The three reference games are not primarily “survival games” in the same sense.
They begin with an intimate survival fantasy, then expand into a persistent 4X
service. Their common successful pattern is a short, legible loop that turns
home-base growth into newly reachable map opportunities. Their recurring failure
mode is when the service layer (event timing, power ranking, monetization, and
social obligation) overtakes meaningful choice.

For Voidbound, the appropriate Phase 3 synthesis is: **make the mothership and
sector map mutually unlock each other, give every return a meaningful decision,
and deliver a finite, recoverable solo arc.** Do not reproduce the social or
commercial compulsion that keeps the references running indefinitely.

## Core loop versus supporting features

| Game            | Core gameplay loop                                                                               | Supporting engagement / side content                                     | Mature live-service layer                                                          |
| --------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Dark War        | Shelter power + heroes/troops + world gathering/rallies -> more power.                           | Survivor jobs, hero collection, beginner trials, gear.                   | Alliance territory, seasonal resources, server diplomacy, rankings [S05] [S07].    |
| Whiteout        | Furnace/building growth + resources + heroes/troops -> map and alliance power.                   | City presentation, idle collection, short activities, hero combinations. | Castle/state/SvS competition and later Fire Crystal progression [S01] [S02] [S03]. |
| Tiles Survive   | Claim tiles/biomes + worker/power network + exploration -> wider access and stronger shelter.    | Health/morale, collectibles, decoration, heroes, multiple maps.          | Conquest, rallies, gear, arena/goldmine, seasonal events [S08] [S10].              |
| Voidbound today | Build/upgrade mothership modules + crew staffing + mine/trade -> resources and further upgrades. | Mail, deal shop, map navigation, module details, ship/map visual growth. | Not yet appropriate: alliances, PvP, online seasons, curated events.               |

The strongest Phase 3 fit is Tiles Survive’s _outward progression_ plus
Whiteout’s _central visual goal_, adapted to Voidbound’s two existing spaces:
the Command Module/mothership and radial star system. Dark War’s structured
newcomer ladder is a useful onboarding model, but its alliance power dependence
is specifically out of scope.

## Similarities and differences

| Dimension          | Dark War                                   | Whiteout                                             | Tiles Survive                                            | Implication for Voidbound                                                                                |
| ------------------ | ------------------------------------------ | ---------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Central anchor     | Shelter/watchtower progression.            | Furnace/headquarters.                                | Shelter production network.                              | Command Module must be an evolving icon and unlock gate, not just a cap.                                 |
| External space     | Zombie map, gathering, rallies, territory. | Ice field, resources, monsters/chiefs.               | Tiles, biomes, multi-map exploration.                    | Radial sectors need accessible, visual reasons to go farther inward.                                     |
| People layer       | Survivors plus hero/march optimization.    | Survivors, heroes, troops.                           | Jobs plus health/morale, then heroes.                    | Crew staffing should create clear operational tradeoffs; avoid turning them into collectible stat cards. |
| Progression pacing | Timers, hero/gear, seasons.                | Timers, furnace gates, hero/troop, events.           | Expansion/building/power and events.                     | Use timed actions, but alternate waits with decisions and authored discoveries.                          |
| Social dependency  | Strong alliance is a major multiplier.     | Alliance is central to healing/progression/end game. | Alliance and conquest prominent after core shelter loop. | Keep solo path fully viable through P3.11; reserve alliances for P5.                                     |
| End state          | Ongoing seasons/competition.               | Ongoing levels and state events.                     | Ongoing seasonal competition.                            | Ship a recognisable P3.11 completion/ascension rather than an endless treadmill.                         |

## What seems to work

1. **An immediately understandable home-base promise.** A furnace, shelter, or
   tile camp makes progress visible [S01] [S02] [S10]. Voidbound already has a
   stronger fiction—a constructed mothership—but needs P3.15/P3.16 presentation
   and P3.3 goals to make its change readable.
2. **Alternation of “tend home” and “go outward.”** Base upgrades improve reach
   or capability; exploration brings back the next constraint or reward. Tiles
   Survive explicitly ties biomes, resources, and shelter strengthening together
   [S10].
3. **People as an emotional lens.** Worker roles and needs make abstract output
   legible. Frozen City demonstrates this without a multiplayer requirement
   [S14].
4. **A near-term goal plus a horizon.** Beginner trials or central upgrades tell
   the player what to do now while a farther map/season promises future
   capability [S05] [S07].
5. **Brief sessions that still leave state changed.** Idle gains and quick
   activities serve players between longer timers [S02].

## What does not transfer well

1. **Event-gated optimal play.** In all three references, later value can be
   coupled to scheduled events. It produces coordination but can make an
   ordinary session feel wasteful. Whiteout players explicitly report calendar
   fatigue and no authored ending [S03].
2. **Unbounded power gaps.** Store and community reports on Dark War, Whiteout,
   Tiles Survive, and Last Fortress describe perceived spending-driven gaps or
   inability to recover [S02] [S04] [S06] [S10] [S12]. Phase 3 should instead
   make setbacks recoverable by design.
3. **Deceptive first impression.** Dark War, Tiles Survive, and Last War all
   have player reports of a mismatch between advertised opening and deeper game
   [S04] [S06] [S10] [S16] [S17]. Voidbound’s first thirty minutes must be a
   genuine sample of mining, staffing, research, exploration, and tactical risk.
4. **Feature accumulation without agency.** Heroes, gear, VIP, currencies, side
   modes, and seasonal variants can obscure the main decision. Phase 3 needs
   fewer systems with visible causal links.

## Early, mid, and end-game contrast

| Stage | Dark War                                             | Whiteout                                                     | Tiles Survive                                           | Voidbound design requirement                                                                                                                                           |
| ----- | ---------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Early | Rapid shelter/hero unlocks and newcomer ladder.      | Rebuild around a memorable furnace; early town tasks.        | Claim nearby tiles and establish work/power.            | First 30 minutes: one crew member, one producer, mining, trade, first upgrade, and first sector choice must each be understandable and rewarding.                      |
| Mid   | Alliance/hero/gear efficiency and event preparation. | Furnace prerequisite chain, heroes/troops, alliance routine. | Biome/map progression and more complex shelter network. | First 3 hours: research creates mutually exclusive capability choices; expeditions and sector hazards create alternate plans—not merely bigger prices.                 |
| End   | Seasons and territory competition.                   | Fire Crystal/rank/event cycle; no finite ending reported.    | Conquest/PvP/event optimization.                        | Several days: reach the center, face a major NPC threat, make an ascension decision; completion validates the arc and never deletes the save without explicit consent. |

## Design hypotheses to validate in playtests

- Players can explain, without a guide, why their next module, crew assignment,
  research, expedition, or route is useful.
- Every timer either has a visible payoff, opens a concurrent decision, or is
  short enough not to become dead time.
- The player can make material progress in a 5-10 minute return session and can
  choose a satisfying longer session through an expedition or encounter.
- A failure costs time/opportunity/resources but never strands the local save.
- A fresh player reaches a distinct “I am exploring the system, not merely
  upgrading a base” moment in the first 30 minutes.
