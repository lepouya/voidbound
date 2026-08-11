# Reference-game player lifecycle model

Recorded from the user's first-hand experience on 2026-08-10. This document uses
**lifecycle phase** to avoid confusion with Voidbound's numbered development
roadmap phases.

## Lifecycle Phase 1 — rapid solo discovery and compounding growth

The opening hook is not a single feature: it is the pressure and pleasure of
advancing several newly introduced systems in parallel. Construction, resource
gathering, troop/vessel development, missions, low-level PvE, and eventually
research all compete for attention. The player receives constant goals,
milestones, and story chapters, so they can see a useful next action while also
learning why systems interact.

Its emotional pattern is:

```text
New capability -> immediate use -> visible growth -> new constraint ->
goal/milestone explains response -> new capability
```

The pace is fast, content-rich, and largely solo. Progress feels like increasing
competence, not merely accumulating larger values.

### What makes it work

- Construction and resource acquisition are concurrent, interdependent goals.
- Each unlock introduces a system the player can use immediately.
- Objectives, chapters, and milestones prevent choice overload from becoming
  confusion.
- PvE missions give active, low-risk things to do while longer development is
  underway.
- Research arrives after the player has enough context for a larger tech tree to
  feel like discovery and planning rather than a menu of abstractions.

### Design hazards

- If goals become a checklist with no new decision, velocity becomes busywork.
- If construction, gathering, research, and combat all block on timers at once,
  the player loses the feeling of agency.
- The initial protection window is important in competitive games: novice
  learning is not interrupted by predation.

## Lifecycle Phase 2 — collective power and social map control

Alliances become the dominant multiplier. New modes include rally-only monsters,
asynchronous arena PvP, group research/contributions, rankings, chat, rally
events, relocation near the alliance, territory capture, and large map bonuses.
Players become stronger together and create treaties after early attacks make
perpetual conflict counterproductive. Attacks increasingly target abandoned or
unaffiliated bases. New players are normally protected for the early days.

The central shift is from “what should _I_ build next?” to “what should _we_
prepare, coordinate, defend, or capture?”

## Lifecycle Phase 3 — alliance consolidation and center conflict

Alliances merge, strong coalitions emerge, and organized groups move toward the
map center. The climax is a large PvP conflict over central resources and a
presidency/regency-style leadership reward with significant bonuses. Social
coordination, diplomacy, and alliance identity outweigh individual base
optimization.

## Lifecycle Phase 4 — seasonal/meta-world play

Some games move an entire population to a new map/season and add server-versus-
server wars. This renews the progression context after the center conflict and
creates a larger collective identity.

## Translation to Voidbound development

| Reference lifecycle         | What Voidbound should validate locally                                                                                                  | What must wait for online phases                                                                                           |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1: rapid solo discovery     | The complete first-30-minute/three-hour loop: concurrent ship growth, mining, research, low-risk PvE, expeditions, goals, and chapters. | Nothing social is needed to make this engaging.                                                                            |
| 2: collective growth        | Solo NPC/automated equivalents can test rally-shaped preparation, territory pressure, and complementary builds.                         | Alliances, chat, player rankings, player attacks, group research, territory ownership: Phase 5/6 after Phase 4 networking. |
| 3: consolidation/center war | Radial inward campaign, NPC territories, and a central major threat can validate the map climax and reward structure.                   | Coalition diplomacy, central PvP, presidency/regency, and player resource contention: Phase 5/6.                           |
| 4: seasons/SvS              | P3.11 local ascension validates reset/carry-over rules.                                                                                 | Cohort worlds, online seasons, world merges, and server-vs-server wars: Phase 5.                                           |

## Consequence for P3.1

The playable-alpha specification must explicitly reproduce the _feeling_ of
Lifecycle Phase 1 before it tries to add more systems:

1. Parallel short-term goals across ship, resource, and map layers.
2. A guided objective/chapter spine that introduces each system at its first
   useful moment.
3. Active PvE/expedition work available while passive development continues.
4. Research as a meaningful branching unlock layer, introduced only after the
   player has encountered its needs in play.
5. An inward map horizon that foreshadows the later collective center conflict,
   but resolves locally against NPCs in Phase 3.
