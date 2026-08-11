# Early / mid / late game, across all 8 games

Synthesis of `games/*.md` §8-10, read against `user-notes.md`'s four-phase arc
(solo growth sprint → alliance/group content → center-map war → seasons/server
wars). That framing turns out to describe every game in this research set well,
so this doc uses it as the organizing structure rather than inventing a separate
one — the per-game research consistently confirms it independently.

## Phase 1 (early game): the solo growth sprint

Every game's onboarding follows the same shape, differing mainly in how tightly
it's scripted:

- **Chapter/mission-chain tutorials** that double as the main progression
  driver, not a disposable one-off flow — Dark War's tutorial literally uses the
  same "Chapter 1/2" task system that runs the rest of the game; State of
  Survival, Tiles Survive!, Whiteout Survival, and Last War all run guided
  main-quest chains with the same property (build X to level Y → unlock → next
  chapter).
- **Deliberately generous, front-loaded rewards.** Multiple independent reviews
  use nearly the same language: Dark War is praised for "meaningful unlocks
  occurring regularly" and "genuine momentum during the first week"; Whiteout
  Survival's reviewer calls out "early generosity... before the power gap widens
  later." This isn't incidental — it's a documented, repeated design choice
  across publishers.
- **A concrete "first 24-48 hours" checklist** genre-wide: build the essential
  3-5 buildings, clear tutorial quests for the resource payout, join an alliance
  immediately (near-universal advice, treated as "close to mandatory" in State
  of Survival's and Rise of Kingdoms' docs specifically), and — repeatedly — buy
  the cheap ($1-3) permanent second construction queue as the highest-value
  early purchase.
- **New-player protection.** Bases are shielded from raiding for the first
  several days in every game with open PvP (matches the mechanism your notes
  describe — "bases are usually protected during phase 1 to avoid predation on
  newer players"). Rise of Kingdoms formalizes this furthest: a 2-day Peace
  Shield plus a 10-day-only "Beginner's Teleport" into a freshly-opened,
  lower-population kingdom.
- **The alliance/PvP layer is deliberately not open yet.** Across every game,
  real inter-player content (scouting, rallies, world-map raiding) is gated
  behind an early-game milestone — Dark War's Watchtower 7/Radar, Whiteout
  Survival's Furnace + map-age gates (Tundra Day 14, Sunfire Castle Day 53),
  Rise of Kingdoms' City Hall 16 for KvK eligibility. The first days are
  single-player-feeling by design, even in games that are ultimately built
  around alliance warfare.

**The one outlier: Rise of Kingdoms.** Every other game in this set heavily
scaffolds onboarding to avoid overwhelming a new player. RoK doesn't — its own
doc is explicit that multiple independent sources converge on "starts small and
seems easy, but introduces a lot of elements so it gets very complex," asking a
player to choose a civilization, develop commanders, gather, join an alliance,
train troops, and manage power growth "from the very first minutes," with no
real narrative to soften it. This is presented consistently as a genuine
weakness relative to its newer competitors, not a stylistic choice players
praise — worth remembering as a cautionary contrast when designing Voidbound's
own P3.1/P3.3 onboarding, which should look more like the scaffolded majority
than like RoK.

## Phase 2 (mid game): the wall, and what fills it

Every single game names the same transition point, almost verbatim across
sources: **timers stretch from minutes to hours-then-days**, and the tutorial's
steady stream of unlocks stops. Direct quotes: Dark War — "progression
dramatically slows... timers extending from minutes to days," named as the
primary drop-off point; State of Survival — "the game grinds to a halt, as you
suddenly need to wait hours... this is where the paywall kicks in"; Last War —
"nearly every action... is gated by a timer that quickly escalates to hours and
then days."

What fills the gap, consistently across all 8 games:

- **Alliance participation becomes load-bearing, not optional.** Every doc
  independently reaches this conclusion. Alliance Help (mutual timer speed-ups),
  alliance-funded research trees, and scheduled group content (Zombie Siege,
  Bear Hunt, Alliance Trap, barbarian rallies) replace solo base-building as the
  dominant activity. This is your Phase 2 exactly — the notes' "group
  contents... asynchronous arena pvp... alliance researches... rally events" all
  have a direct, named counterpart in every game researched.
- **The event calendar is the retention engine.** With building/research timers
  no longer providing a dense reward cadence on their own, the near-continuous
  event calendar (see `core-loop-vs-features.md` §2) is what several docs
  explicitly credit with keeping daily engagement high through the slowdown.
- **A secondary, semi-independent progression axis opens up** — hero/gear
  investment, decoupled from the base-building queue, giving players something
  to optimize even when queues are saturated by time-gates. Every game frames
  this as deliberate: "a common SLG technique for giving players something to
  chase even when building queues are saturated by time gates" (Last War's doc).
- **Bloat risk becomes visible here, not before.** This is the point where every
  parallel system unlocked so far is now running simultaneously. Lords Mobile's
  doc is the sharpest example — reviewers and community threads split explicitly
  on whether the resulting system count is "depth" or "bloat," sometimes within
  the same review. Community language: "way too much on the screen and way too
  many things to remember."

## Phase 3 (late/end game): the center-map war, and the treadmill under it

This is where your notes' Phase 3 — "alliances merge... everyone starts moving
inwards towards the center, eventually culminating in a large pvp war over the
hold on the central map resources" — is confirmed almost exactly by every game
with a mature enough playerbase to have reached it:

| Game               | Center-map/climax structure                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Whiteout Survival  | State vs. State (SvS) — monthly, Preparation phase then a Battle phase culminating in a Sunfire Castle capture that crowns a "President" |
| Dark War: Survival | State of Supremacy / Capital Clash — weekly points race culminating in a 4-hour Saturday siege; holding the Capital 90 min = auto-win    |
| State of Survival  | SvS/State Warfare — Preparatory/War/Recovery phases; the winning alliance appoints a **Governor** over the losing state                  |
| Last War: Survival | Alliance Wars / Server vs Server / Capital Conquest                                                                                      |
| Rise of Kingdoms   | Kingdom vs. Kingdom (KvK/"Lost Kingdom") — the explicit, seasonal endgame; matchmade by aggregate top-player power                       |
| Lords Mobile       | Kingdom Clash/KvK, War for Wonders (control a central Base+Forts)                                                                        |
| Tiles Survive!     | Arcadian Conquest / occupation scoring around a central "Arcadia" target                                                                 |
| Top War            | Capital Throne — weekly, hold-time requirements _shrink_ over 4 windows specifically to let a mid-tier alliance snipe a win late         |

Every one of these structures grants a **title or governance reward**
(President, Governor, Regency-equivalent) matching your notes' "grants some
presidency or regency over others" almost exactly — this is not a coincidence,
it's a converged design pattern for making the climax matter beyond raw loot.

**What top players actually do, once there:** re-optimizing the CP/Power stack,
coordinated multi-rally attacks (a single rally can't break a strong garrison; 5
simultaneous ones can — Dark War), and continual hero/gear chase cycles
(Whiteout Survival's ~80-day hero-generation power-creep cycle is the starkest
example — "leaving prior generations in the dust," with community guidance to
"focus on one key upgrade per gen and save the rest").

**Where it wears thin — the consistent complaint set:**

- **The spender/F2P gap is described as permanent and growing, not closable by
  playing longer**, in every game's late-game section without exception. Direct
  quotes: "a single Whale who has spent USD 50,000 can literally wipe out an
  entire alliance of F2P players" (Whiteout Survival); "a whale can literally
  1-shot a f2p player for all they have" (State of Survival, a 2+ year player);
  "whale players dominate regardless of skill or knowledge" (Last War).
- **No designed completion state, anywhere.** Every game researched is an
  open-ended live-service treadmill — "no source described a defined 'campaign
  completion' or end state" (Tiles Survive!); "as an infinite live-service SLG,
  there is no defined ending" (Last War). This is the single most load-bearing
  fact for Voidbound's own design: **Voidbound's README and ROADMAP explicitly
  want something none of these 8 games have** — P3.11's "recognizable end
  condition" and season/ascension loop. None of the peer games offer a template
  for that specific feature; it has to be designed from scratch, not adapted.
- **Server/state aging is a real, acknowledged problem the industry has standard
  answers to.** State of Survival's "State Merge" (periodic consolidation of
  depopulated old states, ~1 week's notice, running since October 2021) is the
  clearest, most transparent example — treated by the developer as a routine
  lifecycle event, not a failure. Last War's "Transfer Surge"/soft-merge system
  and a long-time player's "planned decay" critique (once a server locks into
  its season structure, it can no longer be organically revitalized) is the same
  problem handled less gracefully. This directly corresponds to your notes'
  Phase 4 and to Voidbound's own **P5.5 (online seasons and world merging)** —
  State of Survival's State Merge is the single best reference implementation
  found in this research for that task.
- **F2P's realistic ceiling is consistently "mid-tier alliance participation,"
  not top-server competitiveness** — stated almost identically across Dark War,
  Tiles Survive!, and State of Survival's docs.

## Cross-cutting pattern: the honeymoon-then-wall shape is universal, and it's the #1 churn risk

Every game in this research set has the same shape: a strong, generous,
densely-rewarded first-week experience, followed by an abrupt,
consistently-named slowdown once the scripted content runs out. This is the
single most repeated structural fact across all 8 docs' early/mid-game sections
— not a one-off critique of any single title. See `community-sentiment.md` for
how this shows up in player complaints specifically.

## What this means for Voidbound's Phase 3

Per `user-notes.md`'s own analysis (restated and confirmed by this deeper
per-game read): **Phase 3 (local playable alpha) can only ever build "Phase 1"**
— the solo growth sprint — since there's no alliance layer to transition into
yet, and P3.11's campaign completion is Voidbound's from-scratch answer to what
"Phase 3" (the center-map war) means for a single, unaccompanied player. Two
concrete risks this comparison surfaces that weren't visible from the
genre-pattern framing alone:

1. **The honeymoon-then-wall shape is exactly what P3.19's playtest should be
   hunting for**, since it's the most consistent, well-documented churn
   mechanism in the entire genre — and Voidbound has no alliance layer yet to
   catch a player once solo content thins out the way every peer game's mid-game
   does.
2. **None of the 8 games offer a design template for P3.11's completion
   condition** — every peer treats "no ending" as the correct design for an
   infinite live-service game. Voidbound's ambition here (a real ending, plus a
   deliberately-designed new-cycle/ascension loop) is closer to a traditional
   single-player game's structure than to anything in this genre, and should
   probably be designed by looking outside this specific research set
   (roguelike/ARPG "prestige"/NG+ patterns, for instance) rather than by further
   study of these 8 titles.

## Round 2: four more data points on the same arc

Star Trek Fleet Command, EVE Online, Clash of Clans, and OGame were added to
widen past the survival-SLG subgenre (see `00-task-list.md`). All four confirm,
extend, or usefully complicate the findings above rather than overturning them.

**New-player protection: a second model worth knowing about.** Every game in the
original 8 (and Star Trek Fleet Command) uses a flat time-based shield — matches
the 72-hour bubble already decided for Voidbound (see `user-notes.md`,
`voidbound-application.md`). **OGame uses a different model entirely: a relative
points-ratio shield** (a player can only attack, or be attacked by, others
within roughly 5x-10x their own point total, scaling by point tier) rather than
a flat timer — and, sharply, **protection lapses after 7 days of inactivity,
which is the exact same threshold that flips a player into "farmable inactive"
status for everyone else**. This isn't a recommendation to change Voidbound's
already-decided flat 72-hour bubble — but it's worth having on record as a
second real-world model (ratio-based rather than time-based) in case the
"ascended players can play around the flat timer" tradeoff the user already
accepted ever needs revisiting.

**P3.8 (Expeditions): OGame's Expedition system is a near-literal precedent,
closer than anything in the original research set.** Fleets sent to unclaimed
deep space, an exact outcome-odds table (~32% resources, ~22% a found ship, ~19%
nothing, ~9% premium currency, ~6-12% hostile encounter, with a small but real
chance — roughly 1% — of losing the **entire sent fleet with no return**), a
slot count that scales with a research stat (`floor(sqrt(Astrophysics level))`),
and diminishing returns from repeatedly hitting the same target requiring
players to spread attempts out. This is close to exactly the shape ROADMAP
describes for P3.8 ("repeatable exploration, scouting, and salvage missions that
send a vessel away for a server-timed duration, consume fuel, expose up-front
risk/reward, and return choices or rewards through authoritative events") —
worth a direct read of OGame's Expedition mechanics specifically when P3.8 is
designed, not just a general "risk/reward missions" gesture.

**P5.5 (seasons/world merging): OGame's "Exodus" merge process is a second, even
more directly documented precedent alongside State of Survival's State Merge.**
Six sequential regional merger groups ran June-August 2025 across nearly every
one of Gameforge's language communities — a mature, routine,
clearly-communicated operational process (players choose their target universe,
settings get tuned to absorb the incoming population), not an emergency measure.
Combined with State of Survival's State Merge, Voidbound now has two
independently-converged real-world implementations of the same problem to study
for P5.5, from two very differently-run live-service games.

**Clash of Clans complicates the "no game in this genre has a completion state"
finding, usefully.** Unlike every survival-SLG and unlike OGame/EVE's fully
open-ended structures, CoC has a **comparatively finite, closable building/hero
roster per Town Hall era** — a "maxed TH18" account is a real, achievable,
well-defined state with dedicated community "max levels" guide content, even
though Supercell resets that ceiling by shipping a new Town Hall roughly
annually. This is still not a template for P3.11's _narrative_ completion
condition (CoC's "finished" is a checklist-completion state, not a story
climax), but it's evidence that "closable, then re-opened by new content" is a
viable middle ground between "open-ended forever" and "one true ending" — worth
holding alongside the roguelike/NG+ framing above as a second reference shape
for P3.11/ascension design.

**EVE Online's early game confirms the honeymoon-then-wall pattern has an even
worse opposite failure mode.** Where every survival-SLG over-scaffolds
onboarding (arguably to a fault — see the RoK contrast earlier in this doc), EVE
famously **under-scaffolds** it: "In Eve, you don't have a learning curve, you
have a cliff" is the most-repeated line about the game across every source type
in its own doc, and core knowledge is widely considered to live outside the game
client entirely (wikis, Discord, spreadsheets). This is a second failure mode
worth naming for P3.1/P3.3 alongside the honeymoon-then-wall pattern:
**onboarding can fail by being too thin, not just by collapsing after being too
generous.** Voidbound's existing UX principles (state the wait before committing
to it, visible degraded states) already push toward the scaffolded end of that
spectrum, which this research continues to validate as the right side to err on.

**OGame's and Clash of Clans' late-game read differently from every
survival-SLG's, and it's informative.** Neither describes the "permanent,
structurally widening whale gap" language that dominates the original 8's
late-game sections (see `community-sentiment.md`) — CoC's pay-to-win discourse
is described as genuinely _split_, not one-sided, and OGame's negative sentiment
clusters on new-player-progression friction more than on an unbeatable
veteran-whale ceiling specifically. This is a useful counter-example to keep in
view: the "permanent widening P2W gap" pattern that Part 3 of
`voidbound-application.md` argues Voidbound should avoid is common in this
genre, but **not universal even among long-running, successful games** — CoC in
particular demonstrates a live-service base- builder can run profitably for 14
years without that specific complaint dominating its community sentiment.
