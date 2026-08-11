# voidbound

A multiplayer online RTS game with aspects of base building, slow-paced strategy
with focus on expansion and upgrading of the player's mothership, joining
alliances and building a dominion together with other players.

The genre is sometimes like MMORTS, but that can be open to a lot of
interpretations sometimes.

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
- Data Archive: Faster researches, lower resource requirements.

### Combat

- Vessel Shipyard: upgrade vessels. Durability, damage, cargo capacity, weapons
  capacity.
- Weapons Factory: Produce more kinetic projectile weapons.
- Drone Factory: Produce drone weapons.
- Plasma Factory: Produce laser / plasma weapons.
- Repair Shop: Repair the different type of weapons that were damaged during
  combat. Uses resources and time

### Defence

- Hangar Bay: Station weapons or vessels to defend the ship against attackers
- Shield Generator: Protective shielding around the ship. If the shield is
  breached, the station is forced to warp and relocate

## Design principles

- Set in space. Players arrive as colonizers on a new star system. The
  mothership is constructed in space as they progress through the game, and is
  their "base" in traditional RTS terminology.
- Hopeful colonization and discovery, not survival. The fiction is settlement,
  survey, route-making, stewardship, and discovery — not hunger, temperature,
  panic, or deprivation. Conflict is a consequence of expansion and scarce
  inner-system geography, not the opening fantasy.
- Modules are the RTS "buildings": each serves a specific function and is
  upgraded by its own criteria (see Ship design above).
- Resources come from two places: production inside the base (bays, modules,
  technologies) and mining external nodes spread across the map.
- Exactly 4 resources, to avoid information exhaustion: (a) construction
  material — from rocky or iron-rich asteroids, (b) high-tech materials — for
  electronics and reactors, from rare asteroids, (c) biological materials —
  water, food, and such, from icy asteroids or terrariums, and (d) fuel material
  — like hydrogen or methane, spent on travel and recovery actions: mothership
  warp/relocation is the first sink, with routine vessel dispatch and
  expeditions joining it in Phase 3. Uranium is deliberately not a fifth
  resource; a new currency/resource needs a distinct decision the four materials
  and credits cannot already express. Alongside the materials there is a generic
  trade currency — working name "credits", final name settled in the display
  layer — earned through trade rather than production or mining. It enters the
  economy at the Trading Post (credits-get deals are selling, credits-give deals
  are buying; paid deal refreshes are the sink); its wider role —
  player-to-player and alliance trade — isn't fleshed out yet.
- No hard daily energy caps. Mining is naturally bounded by travel, extraction
  time, deposits, and vessel availability; Phase 3 adds transparent per-target
  expedition fatigue and bounded daily challenge/arena reward ladders rather
  than a universal daily damping meter.
- Resource nodes (asteroids, moons, planets) get higher level and more difficult
  toward the center of the map, pacing the game: alliances have to gain power
  together to push inward. The current working direction (not yet locked; see
  `PHASE3.md`) for the map's center is a **Capital World with orbital
  infrastructure** — a recoverable/inhabited planet ringed by Precursor Relay
  fragments (route/signal restoration) and a Helios Array (inner-system
  hazard/energy) distributed across the approach bands.
- Asteroid mining: asteroids come in four classes matching the resource they
  yield — rocky (construction), metallic (high-tech; the "rare" class), icy
  (biological), and carbonaceous (fuel) — and three size tiers: small (1\*1
  tiles, common, 15–60 min to mine out), medium (2\*2, uncommon, 1–4 h), and
  large (3\*3, rare, 4–12 h). Mine-out time scales with the deposit at a shared
  extraction rate. Each asteroid holds a single resource and hosts a single
  mining vessel at a time — both rules may be revisited for large asteroids
  (mixed deposits, multiple miners), so implementations should keep that door
  open. A dispatched vessel mines until the deposit is exhausted and then
  returns on its own; recalling it early harvests proportionally to the time
  spent extracting. Mined-out asteroids disappear from the map.
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
  short sessions. Any future monetization must grant no gameplay power.

For the order these land in development, see [ROADMAP.md](ROADMAP.md). For the
full Phase 3+ gameplay design behind that roadmap — mechanic sketches, the
experience-pacing targets, and the decision gates still open — see
[PHASE3.md](PHASE3.md).

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
- `--time-scale <factor>` runs local scheduler timers at a positive speed
  multiplier (for example, `60`); it affects new durations and live production
  cadence without rewriting existing deadlines.
- `--list-players` prints saved local profiles and their Command Module levels,
  then exits.
- `--reset-player <name>` destructively recreates and selects one profile while
  preserving the shared local world and other profiles.
- `--reset-system` destructively replaces every local profile and all world
  progress with the deterministic fresh system.

The reset controls are startup-only and local; they are not gameplay actions or
part of the future online protocol.

### Other platforms

```
deno task tauri android init
deno task tauri android dev

deno task tauri ios init
deno task tauri ios dev
```
