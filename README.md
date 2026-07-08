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
- Trading Post: Shopping and trading with NPCs

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
- Modules are the RTS "buildings": each serves a specific function and is
  upgraded by its own criteria (see Ship design above).
- Resources come from two places: production inside the base (bays, modules,
  technologies) and mining external nodes spread across the map.
- Exactly 4 resources, to avoid information exhaustion: (a) construction
  material — from rocky or iron-rich asteroids, (b) high-tech materials — for
  electronics and reactors, from rare asteroids, (c) biological materials —
  water, food, and such, from icy asteroids or terrariums, and (d) fuel material
  — like hydrogen or methane. (Open question: whether uranium fits here or is
  one resource too many.) Alongside the materials there is a generic trade
  currency — working name "credits", final name settled in the display layer —
  earned through trade rather than production or mining; its exact role isn't
  fleshed out yet.
- No hard daily energy caps. Repeating actions over the course of a day yields
  diminishing returns instead, resetting at a fixed point.
- Resource nodes (asteroids, moons, planets) get higher level and more difficult
  toward the center of the map, pacing the game: alliances have to gain power
  together to push inward.
- New players arrive in a fresh system alongside players who started around the
  same time, so nobody faces an impossible catch-up. Seasons keep those worlds
  alive as activity declines: after a time or milestone, remaining players move
  on to a new system, with opportunities for world merging and bonuses for
  players ascending from a previous season.

For the order these land in development, see [ROADMAP.md](ROADMAP.md).

## Running

First time:

```
deno install
```

Run in dev mode:

```
deno task tauri dev
```

### Other platforms

```
deno task tauri android init
deno task tauri android dev

deno task tauri ios init
deno task tauri ios dev
```
