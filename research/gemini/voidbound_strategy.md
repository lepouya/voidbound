# Voidbound: Phase 3 Strategy & Vision

Based on research into games like _Whiteout Survival_ and _Dark War: Survival_,
this document outlines how those findings relate to Voidbound's design goals,
specifically for the **Phase 3 Local Playable Alpha**.

## 1. Relating Findings to Voidbound

### What Voidbound is Doing Differently (The Advantages)

1. **No Hard Energy Caps & Different Diminishing Returns:** Unlike mobile 4X
   games that use strict stamina systems or massive exponential timers
   (days/weeks) to force spending, Voidbound relies on diminishing returns
   (e.g., longer mining trips, storage caps that pause passive generation but
   allow active surplus). This creates a healthier, less predatory loop.
2. **Fixed Number of Resources:** Voidbound strictly caps resources at 4
   (Construction, High-Tech, Bio, Fuel) plus Credits. Mobile 4X games often
   suffer from "currency bloat" (dozens of specific upgrade materials) which
   confuses players. Voidbound's simplicity is a massive advantage.
3. **The Mothership Concept:** Instead of an abstract "city," the player is
   building a Mothership with specific, visual room layouts (Command Citadel,
   Hangar, etc.). This makes the "base" feel like a tangible entity that moves
   (via Warp) through the map.

### Mechanics That WOULD Work for Voidbound (Phase 3 Focus)

1. **The "Furnace" / Central Hub Concept:** The Command Module in Voidbound
   already acts like this (gating other modules). The concept of managing a
   central requirement (like Crew Quarters and Fuel) is strong.
2. **Clear Early-Game Objectives (The Tutorial Hook):** The early game in these
   mobile titles is incredibly sticky because it constantly gives the player
   short, achievable goals. Voidbound's **P3.3 (Objectives & First-Run
   Onboarding)** is critical. We need a clear, rewarding path for the first 30
   minutes (Build -> Hire -> Mine -> Trade).
3. **Research as Meaningful Choice:** In many mobile games, research is just a
   stat bump. Voidbound's **P3.4 (Research Lab)** should feature distinct
   branches (e.g., Economic, Military) that force players into early
   specialization rather than a single linear path.
4. **PvE "Side Stories", Minigames & Async PvP:** Minigames are crucial for
   killing time after the early base setup is complete. For Voidbound, this
   could take the form of async PvP (arena with teams), rallies, and
   puzzle/minigame elements introduced later on to break up the waiting.
5. **Ship Expansion (No Fog of War):** While traditional fog of war doesn't make
   sense in space, we can adapt the _Tiles Survive!_ clearing mechanic to the
   "ship" screen itself. This expansion will be tied strictly to the Command
   Module's level (e.g., upgrading to Level 2 automatically unlocks the next
   ring of usable tiles).

### Mechanics That WOULD NOT Work for Voidbound

1. **Predatory Wait Timers:** We want a playable, enjoyable local alpha.
   Building timers should pace the game, not halt it for a week.
2. **Whale-Driven PvP as the Only End Game:** Voidbound wants a strong
   solo/co-op experience. Phase 3 must prove the game is fun _without_ other
   players. The "Ascension" loop (P3.11) is our answer to the end-game: reaching
   the center, defeating a threat, and resetting with a bonus, rather than just
   grinding stats forever.
3. **Hero Gacha:** Voidbound focuses on ships, modules, and crew pools, not
   individual named heroes with rarity tiers.
4. **Detailed Survivor Simulation:** While morale and satiety systems are
   interesting, they are out of scope for Phase 3 and better suited for later
   phases or end-game content.

### The Ideal Player Experience Flow (Based on User Insight)

The game experience should be structured to deliver these specific hooks at the
right times:

- **Phase 1 (Early Game / The Hook):** Fast-paced, goal-driven development.
  Construction and resource gathering happen side-by-side. The player is
  constantly racing to figure out what to upgrade next. The game provides strict
  linear "Chapters" (do X, then Y, then Z) for tight early guidance (Objective
  System P3.3). Players start venturing out for small PvE missions, juggling
  resources, construction, and leveling up troops. The Research tree is
  introduced. The player feels themselves getting stronger and discovering new
  interactions in a protected, PvE-focused environment.
- **Phase 2 (Mid Game / The Social Expansion):** Introduces alliances, group
  content (rallies for strong monsters), asynchronous arena PvP, and alliance
  research. Players move closer together, capture early territory/resource
  generators, and start engaging in early PvP (attacking abandoned/unallied
  bases). Base protection wears off, but full-scale wars are avoided through
  treaties.
- **Phase 3 (Late Game / The Endgame War):** Stronger alliances merge, moving
  inward toward the center map resources. Culminates in a massive PvP war for
  the center (granting presidency/huge bonuses).
- **Phase 4 (Seasons):** A reset loop where everyone moves on together to a new
  map (server vs server wars), maintaining some permanent account-wide
  reward/ascension bonus.

## 2. Features Needed for a Successful Phase 3 (Local Alpha)

To achieve the goal of a complete, engaging 3-hour-to-several-day local arc, we
must focus on:

1. **The Core Gameplay Loop Validation:**
   - The player must clearly understand how to get the 4 resources.
   - The Trading Post (P1.12) and Expeditions (P3.8) must be viable alternatives
     to just waiting for passive production.
2. **Progression & Pacing (The Map):**
   - **P3.9 (NPC Opposition & Radial Progression):** The map must get visibly
     harder and more rewarding toward the center. This provides the primary
     long-term goal.
3. **Meaningful Resource Sinks:**
   - Fuel must matter. Warping (P1.22) and Expeditions (P3.8) need to cost
     enough fuel that the player has to actively seek out Carbonaceous
     asteroids.
4. **A Definite Conclusion:**
   - **P3.11 (Local Campaign Completion):** There must be a win state for the
     local alpha (e.g., reaching the center coordinates and surviving a final
     PvE encounter).

## 3. Separating Future Stages (Phase 4+)

What we must _deliberately ignore_ during Phase 3 to avoid scope creep:

- **Alliances (Phase 5):** Do not build chat, territory sharing, or alliance
  helps yet.
- **Player vs. Player (PvP) Combat (Phase 6):** Phase 3 combat (P3.10) is
  strictly PvE. Do not worry about offline raiding, defensive shields against
  players, or contested resource nodes yet.
- **Complex Player Economies (Phase 5):** The Trading Post is for NPC deals
  only. No player-to-player trading or auction houses.
- **Server Authority / WebSockets (Phase 4):** The game runs locally. We
  maintain the _pattern_ of server events, but do not actually build the network
  layer.
