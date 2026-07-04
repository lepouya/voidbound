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

## Ideas dump

- Set in space. Players arrive as colonizers on a new system. The mothership is
  constructed in space as they progress through the game. This is also their
  "base" in traditional RTS terminology.
- Each player works on building and expanding their mothership. There are
  different modules ("buildings" in RTS terminologies) that each serve a
  specific function. Each one can be upgraded by different criteria.
- There are aspects of resource collection. Both productivity from within the
  base elements (bays, modules, technologies, etc) and by mining external
  resources spread on the map.
- Keep the number of resources to a small set to avoid confusion or information
  exhaustion. At the moment I'm considering 4 main resources: (a) construction
  material: From rocky or iron-rich asteroids for example, (b) high-tech
  materials: Like for electronics and reactors and such from rare asteroids, (c)
  biological materials: water, food, and such, from icy asteroids or terrarium,
  and (d) fuel material: like hydrogen or methane. Not sure if uranium should be
  included here or if that's too much.
- Let's avoid having concepts such as amount of energy limited to a day. Instead
  maybe replace this by diminishing returns of repeating actions over the course
  of a day, and then have them reset at a specific point.
- We can have the resource nodes / capture asteroids, moons, planets /
  territories get higher level and more difficult as we get closer to the center
  of the map. This introduces a certain pacing to the game as alliances have to
  gain power together to be able to proceed towards the center.
- These games often have issues with new players finding it impossible to catch
  up to people who started much earlier than them. For this reason, we might
  want to have new players arrive at a new system to play in the same world as
  others who started around the same time.
- However, this means that the activity on a server slowly dies off as people
  leave the game, and some planets may no longer have enough people to sustain
  an enjoyable experience.
- One concept that some games introduce is "seasons", where after a certain
  amount of time or some milestones, the remaining players move on to a new
  system with a different setup. This also provides opportunity for merging
  worlds or resetting back to beginning. Perhaps with some specific bonuses for
  the players who ascended from a previous season.

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
