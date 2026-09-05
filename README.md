# Voidbound

A mobile-first MMORTS about slow-paced expansion, mothership development,
frontier discovery, and alliances building a shared dominion.

## Ship design

The mothership is launched with the most basic functionality from the origin and
is constructed in space. This is akin to how a lot of real-life space stations
would be designed since the cost of launching a full ship with all features is
prohibitive.

Some of the modules in the ship to design and upgrade as we progress through the
game:

### Main command and personnel

- Command Module: This is the core room of the ship and placed at the center.
  The level of this module decides the maximum level for all other modules.
  Features and new modules unlock as we level up this module. Also provides
  basic production of resources so the player never gets "stuck".
- Crew Quarters: Increase the ship's crew capacity. If a ship doesn't have
  enough crew for its size and operational modules, it will take a production
  and functional penalty.
- Operations Center: Boosts radar detection, vessels speed
- Alliance Embassy: Joining and boosting for the alliance
- Trading Post: Shopping and trading with NPCs. A deal-slot shop rather than an
  open price list: a small set of randomized exchange deals over the 4 resources
  plus credits (give and get types always differ), refreshed on a fixed daily
  cycle, with rarity tiers making some deals notably player-favorable, one small
  free deal per day, and paid re-rolls at a doubling credits cost. More slots at
  higher module levels. Anything with a real counterparty player is the alliance
  economy's job, not the Trading Post's.

### Resources

- Ore Refinery: Produces construction material.
- Electronics Fabricator: Produces high-tech material.
- Hydroponics Bay: Produces biological material.
- Fusion Reactor: Produces fuel material.
- Storage Bay: Storage capacity, safe warehousing to keep material from being
  stolen, and possibly boosts production
- Armory: Storage capacity for weapons

### Technologies

- Research Lab: The center for technological advancement. Spend resources here
  to unlock new module blueprints, improve vessel stats, or increase efficiency.
- Fabrication Bay: Faster module construction, lower resource requirements.
- Assembly Line: Faster weapon construction, lower resource requirements.
- Data Archive: Faster research, lower resource requirements.

### Combat

- Vessel Shipyard: upgrade vessels. Durability, damage, cargo capacity, weapons
  capacity.
- Weapons Factory: Produce more kinetic projectile weapons.
- Drone Factory: Produce drone weapons.
- Plasma Factory: Produce laser / plasma weapons.
- Repair Shop: Repair weapons and vessels damaged during combat. Uses resources
  and time.

### Defence

- Hangar Bay: Station weapons or vessels to defend the ship against attackers
- Shield Generator: Protective shielding around the ship. If the shield is
  breached, the station is forced to warp and relocate

## Design principles

- Set in space. Players arrive as colonizers on a new star system. The
  mothership is constructed in space as they progress through the game, and is
  their "base" in traditional RTS terminology.
- Hopeful colonization and discovery, not survival. The fiction is settlement,
  survey, route-making, stewardship, and discovery; not hunger, temperature,
  panic, or deprivation. Conflict is a consequence of expansion and scarce
  inner-system geography, not the opening fantasy.
- Modules are the RTS "buildings": each serves a specific function and is
  upgraded by its own criteria.
- Resources come from two places: production inside the base (bays, modules,
  technologies) and mining external nodes spread across the map. Although there
  is a third aspect of gaining other players' resources via combat or attacking
  their ships.
- Exactly 4 resources, to avoid information exhaustion: (a) construction
  material — from rocky or iron-rich asteroids, (b) high-tech materials — for
  electronics and reactors, from rare asteroids, (c) biological materials —
  water, food, and such, from icy asteroids or terrariums, and (d) fuel material
  — like hydrogen or methane, spent on travel and recovery actions including
  mothership warp, vessel dispatch, and expeditions. Uranium is deliberately not
  a fifth resource; a new currency/resource needs a distinct decision the four
  materials and credits cannot already express. Alongside the materials there is
  a generic trade currency — working name "credits", final name settled in the
  display layer — earned through trade rather than production or mining. It
  enters the economy at the Trading Post (credits-get deals are selling,
  credits-give deals are buying; paid deal refreshes are the sink). P5.6 defines
  its wider role in player-to-player and alliance trade.
- No hard daily energy caps. Mining is naturally bounded by travel, extraction
  time, deposits, and vessel availability. Per-target expedition fatigue and
  bounded daily challenge/arena reward ladders provide activity limits without a
  universal daily damping meter.
- Resource nodes (asteroids, moons, planets) get higher level and more difficult
  toward the center of the map, pacing the game: alliances have to gain power
  together to push inward. The map-center fiction is an explicitly open design
  direction in `PHASE3.md`: a **Capital World with orbital infrastructure** — a
  recoverable or inhabited planet ringed by Precursor Relay fragments
  (route/signal restoration) and a Helios Array (inner-system hazard/energy)
  distributed across the approach bands.
- Asteroid mining follows the level, flavor, and size-tier rules in **Combat and
  Exploration principles** below. One resource and one mining vessel per
  asteroid; recall harvests extraction to date, and depleted nodes disappear.
  Phase 3 replaces the existing seeded-field balance with searchable POIs
  (`ROADMAP.md` P3.24). Mixed deposits and multiple miners remain later
  extensions.
- New players arrive in a fresh system alongside players who started around the
  same time, so nobody faces an impossible catch-up. Seasons keep those worlds
  alive as activity declines: after a time or milestone, remaining players move
  on to a new system, with opportunities for world merging and bonuses for
  players ascending from a previous season.
- Non-predatory by design: no pay-to-win, no gacha/loot boxes, no bait-and-
  switch marketing, no currency proliferation. PvE failure costs time, fuel,
  cargo, or temporary vessel damage — never the only critical vessel, never
  protected progress, never a forced reset. Active play grants choice and
  expression, never an unbounded raw-power advantage over players who return in
  short sessions. Monetization must grant no gameplay power.

## Combat and Exploration principles

Each star system map is a 1000*1000 tile map, broken into five square bands (we
will call them "zones" here), culminating in a central area for the main capital
objective (not a fifth material type):

```
(each box represents 100*100 tiles)
┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
│ 1 │ 1 │ 1 │ 1 │ 1 │ 1 │ 1 │ 1 │ 1 │ 1 │
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│ 1 │ 2 │ 2 │ 2 │ 2 │ 2 │ 2 │ 2 │ 2 │ 1 │
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│ 1 │ 2 │ 3 │ 3 │ 3 │ 3 │ 3 │ 3 │ 2 │ 1 │
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│ 1 │ 2 │ 3 │ 4 │ 4 │ 4 │ 4 │ 3 │ 2 │ 1 │
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│ 1 │ 2 │ 3 │ 4 │ 5 │ 5 │ 4 │ 3 │ 2 │ 1 │
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│ 1 │ 2 │ 3 │ 4 │ 5 │ 5 │ 4 │ 3 │ 2 │ 1 │
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│ 1 │ 2 │ 3 │ 4 │ 4 │ 4 │ 4 │ 3 │ 2 │ 1 │
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│ 1 │ 2 │ 3 │ 3 │ 3 │ 3 │ 3 │ 3 │ 2 │ 1 │
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│ 1 │ 2 │ 2 │ 2 │ 2 │ 2 │ 2 │ 2 │ 2 │ 1 │
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│ 1 │ 1 │ 1 │ 1 │ 1 │ 1 │ 1 │ 1 │ 1 │ 1 │
└───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘
```

New players start in zone 1, where the real estate is plenty, but the resources
here are at the lowest grade. We can start warping in to the inner sections as
we get stronger and get more materials. Phase 3 proves solo inward progression;
alliance cooperation arrives in Phase 5.

Finding points of interest for mining and combat: To avoid littering the map
with non-player points of interest, we don't pre-populate the map with all of
the mining and combat options, but instead provide a "search" option for players
on the map to search for a specific level of a POI around their base (~50 tiles
radius?) and either point them to one that already exists in that vicinity, or
spawn a new one for them to use. If a spawned POI goes unused for 1 hour, it
will automatically de-spawn. Players cannot warp on top of a spawned POI.

There are three primary ways of obtaining resources by doing missions on the
map:

### 1. Mining

Asteroids are minable resources, the base starting asteroid of level 1 at Tier I
(small) asteroid has 600 of a resource and takes 10 minutes to mine, going at
rate of 1 resource per second per asteroid. There are researches and upgrades
that can speed up the mining process and they will be very necessary for higher
level asteroids.

Asteroids have 3 separate parameters to tune:

#### Flavor

This decides the contents of the asteroid:

- "Rocky" (gives construction resource)
- "Metallic" (high-tech resource)
- "Icy" (biological resource)
- "Carbonaceous" (for fuel resource)

#### Level

Asteroids come in level 1-12, the closer we get to the center, the higher level
asteroids would spawn. Each level contains twice as much material as the level
before it. The level distribution is:

- Zone 1: Levels 1,2,3
- Zone 2: Levels 4,5,6
- Zone 3: Levels 7,8,9
- Zone 4: Levels 10,11,12
- Zone 5: No asteroid spawns

As mentioned earlier, each level contains twice as much material as the level
before it, so a level 1 asteroid would have 600 base resource, a level 2
asteroid has 1200, until a level 12 contains 1,228,800 materials.

#### Tier

Asteroids come in 3 tiers for sizes:

- Tier I - Small asteroid: Common. Appears 9/13 times (~69.23%). Spans a 1*1
  area on the map. Has the base number of resources in it.
- Tier II - Medium asteroid: Uncommon. Appears 3/13 times (~23.08%). Spans a 2*2
  area on the map. Has 4x the amount of resources in it.
- Tier III - Large asteroid: Rare. Appears 1/13 times (~7.69%). Spans a 3*3 area
  on the map. Has 9x the amount of resources in it.

A `Level 12 Tier III` asteroid would have 18,432x the materials of a
`Level 1 Tier I` asteroid in it (and take that much longer to mine without
upgrades!) and would probably be hotly contested.

### 2. PvE combat

Similar to asteroids, players can engage on 1-1 solo battles via their vessels
with the raiders. Raiders have 2 separate parameters to tune:

#### Level

This is different than the leveling we saw on asteroid. The level of raiders is
unbounded and can go as high as the player is able to fight, but in order to
fight a raider at level N, you must have defeated the ones at level N-1 first.
This puts a natural cap to how far you can push, and can even be bragging rights
for comparison with others about your power level.

Level 1 raiders are automatically unlocked at the beginning and should be easily
beatable by the starting non-upgraded vessel and the basic units onboard. After
that, each level raider gets 1.25x harder than the one before it.

#### Flavor

Similar to how we have 3 different types of combat units, raiders come in 3
flavors, where their specialty weapon type is stronger than the other two:

- Kinetic projectile weapons: Strong against laser, weak against drone.
- Drone weapons: Strong against kinetic, weak against laser.
- Plasma weapons (laser terminology remains provisional): Strong against drone,
  weak against kinetic.

### 3. PvE raid / elite enemies / group combat

This mechanic only works after we have unlocked alliances and joined one. The
elite enemies are much more difficult and require multiple players to join
forces together to attack. The elite enemies follow the same leveling rule as
PvE combat: You can only initiate a raid on one if you have already beaten the
one at a lower level. However, a player is able to join a raid that another
alliance-member has initiated that is beyond their own max level. This is the
main mechanic where higher-level alliance members can help lift the lower level
players and spirit of team work. The elite raid enemies get more difficult at a
sharper rate than the normal enemies, each level being 1.5x harder than the
level before.

These are design targets, not a description of the current implementation.
`PHASE3.md` §6.14 records the POI lifecycle and mining integration, §6.11 the
solo-raider contract, and §9 the remaining decisions. The approximate search
radius remains open; the numeric growth curves are inputs to P3.1's simulation,
not evidence that campaign pacing is balanced. Expeditions remain the separate
discovery/relationship loop alongside these resource missions; alliance elite
raids arrive with P5.10, not the local Phase 3 campaign.

## Running

First time:

```
deno install
```

Run in dev mode:

```
deno task dev:app
```

Local-development startup controls:

- `--player <name>` selects (or creates) a local profile.
- `--time-scale <factor>` runs local scheduler timers at a speed multiplier
  (e.g. `60`); it affects new durations and live production rate without
  rewriting existing deadlines.
- `--list-players` prints saved local profiles and their Command Module levels.
- `--reset-player <name>` recreates and selects the profile while preserving the
  shared local world and other profiles.
- `--reset-system` replaces every local profile and all world progress with a
  fresh system.

The reset controls are startup only and local; they are not gameplay actions or
part of the online protocol.

### Other platforms

```
deno task tauri android init
deno task tauri android dev

deno task tauri ios init
deno task tauri ios dev
```

## Implementation details

- [ROADMAP.md](ROADMAP.md) for the order and task/phase planning in development.
- [SERVER.md](SERVER.md) for the server architecture and multiplayer pattern.
- [PHASE3.md](PHASE3.md) for the full Phase 3+ gameplay design behind that
  roadmap — mechanic sketches, experience-pacing targets, and explicitly open
  decision gates
