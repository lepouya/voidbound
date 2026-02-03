# voidbound

A multiplayer online RTS game with aspects of base building, slow-paced strategy with focus on expansion and upgrading of the player's base, joining alliances and building a dominion together with other players.

The genre is sometimes like MMORTS, but that can be open to a lot of interpretations sometimes.

## Ideas dump

- Set in space. Players arrive as colonizers on a new planet
- Each player sets up a base and expands from there by making new buildings that serve specific functions and upgrading buildings
- There are aspects of resource collection. Both productivity from within the base elements (buildings, technologies, etc) and by mining external resources spread on the map
- Keep the number of resources to a small set to avoid confusion or information exhaustion
- Let's avoid having concepts such as amount of energy limited to a day. Instead maybe replace this by diminishing returns of repeating actions over the course of a day, and then have them reset at a specific point
- We can have the resource nodes / capture buildings / territories get higher level and more difficult as we get closer to the center of the map. This introduces a certain pacing to the game as alliances have to gain power together to be able to proceed towards the center
- These games often have issues with new players finding it impossible to catch up to people who started much earlier than them. For this reason, we might want to have new players arrive at a new planet to play in the same world as others who started around the same time
- However, this means that the activity on a server slowly dies off as people leave the game, and some planets may no longer have enough people to sustain an enjoyable experience
- One concept that some games introduce is "seasons", where after a certain amount of time or some milestones, the remaining players move on to a new planet with a different setup. This also provides opportunity for merging worlds or resetting back to beginning. Perhaps with some specific bonuses for the players who ascended from a previous season

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
