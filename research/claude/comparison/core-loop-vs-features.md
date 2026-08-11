# Core gameplay loop vs. additional features, across all 8 games

Synthesis of `games/*.md`. Per the user's request, this doc keeps two things
strictly separate: the **core loop** (what a player does every session, forever,
for the entire life of the account) and **additional/side features** (events,
mini-games, battle passes, crossovers — things layered on top that come and go).
Conflating them is exactly what makes it hard to tell "what Voidbound needs on
day one" from "what Voidbound could add in year two," which is the whole point
of doing this split.

## 1. The converged core loop

All eight games — despite spanning zombie apocalypse, frozen apocalypse,
historical conquest, fantasy kingdoms, and sci-fi merge — run the **same core
loop**. This is the single most important finding in this section: the genre has
converged on one template, and the differences between games are almost entirely
in theme and one "hook" mechanic layered on top, not in the loop's structure.

The template, assembled from all 8 docs' §2:

1. **Collect** — claim offline production and completed timers (building,
   research, troop training, hero dispatch).
2. **Queue** — spend the resources you just collected on the next
   building/research/troop-training item, keeping every queue slot occupied
   (idle queues are explicitly called out as wasted progress in nearly every
   game's guide ecosystem).
3. **Assign** — staff production buildings with workers/survivors (a health or
   morale stat to manage) and combat formations with heroes/commanders.
4. **World-map activity** — send troops/heroes out to gather resources, fight
   PvE targets, scout, or (once unlocked) raid other players.
5. **Alliance duties** — donate to alliance-wide research, send/receive help
   (timer speed-ups), respond to rally calls.
6. **Check events** — nearly every game has at least one active time-limited
   event with its own reward track, essentially always.

Every single game gates this loop behind **one central building** whose level
caps every other building/research/unit tier — Furnace (Whiteout Survival),
Bonfire (Dark War), Watchtower (Dark War's _real_ gate, per its guides),
Headquarters (State of Survival, Last War), City Hall (Rise of Kingdoms), Castle
(Lords Mobile), Settlement/Power Plant (Tiles Survive!), "the base" (Top War,
gated on merge-tech instead of a single building level). This is the mechanism
that keeps every one of a player's dozen concurrent systems roughly in lockstep
— nothing can run ahead of the account's overall level. **Voidbound already has
this exact pattern**: the Command Module (README §"Main command and personnel")
is precisely this gate — "the level of this module decides the maximum level for
all other modules." This is strong validation that Voidbound's existing design
is already sitting on the right skeleton, not a gap to fill.

Every game also converges on a **single headline power number** (Combat Power /
Squad Power / Might / Power) aggregating buildings + troops + heroes

- research + gear into one comparable score used for matchmaking and bragging
  rights. Guides across every game frame "why is my CP stalled" as a sequencing
  puzzle — find the underinvested layer. Voidbound doesn't have (and per its
  README's design principles, doesn't obviously need) a single aggregate score,
  since there's no PvP matchmaking to feed it yet in Phase 3 — worth flagging as
  a P3.9/P3.10 design question (does NPC difficulty scaling need a similar
  number?) rather than assuming Voidbound needs one just because every peer has
  one.

### Resource economy: how Voidbound's "exactly 4" compares

| Game               | Core resources                                          | Premium currency                   | Notes                                                                    |
| ------------------ | ------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| **Voidbound**      | 4 (construction, high-tech, biological, fuel) + credits | none (no monetization decided yet) | Deliberately capped at 4 "to avoid information exhaustion" (README)      |
| Whiteout Survival  | Wood, Meat, Coal, Iron (+ Steel later)                  | Frost Stars/Gems                   | Plus 2 gear currencies, event currencies (Hope, Explosive Arrowheads...) |
| Dark War: Survival | Wood, Food, Iron, Electricity, Coins                    | Rubies                             | Plus alliance currency                                                   |
| State of Survival  | Food, Wood, Metal, Gas (+Plasma late)                   | Biocaps                            |                                                                          |
| Last War: Survival | Food, Iron, Gold/Coins                                  | Gems                               | Plus Gold Bricks (pass), season currencies                               |
| Rise of Kingdoms   | Food, Wood, Stone, Gold                                 | Gems                               |                                                                          |
| Lords Mobile       | Food, Wood, Ore, Stone, Gold                            | Gems                               | 5 resources, the most of any game researched                             |
| Tiles Survive!     | Food, Wood/Lumber, Steel                                | Gems ("Waypoints"?)                | Sources disagree on naming                                               |
| Top War            | Gold, Food, Oil                                         | Gems                               | Plus tech/gold "chests" as a secondary gated currency                    |

Every peer game runs 3-5 base resources _plus_ a premium currency _plus_ usually
2+ event/gear-specific currencies that stack up over a game's life (Whiteout
Survival alone has at least 5 named event currencies by its 11th section). None
of them held the line at a small fixed set — they all grew currencies over time
as content was added. Voidbound's README explicitly worries about "information
exhaustion" and caps at 4 + credits with no stated plan to add more. **This
research is a point of validation, not a new idea**: the peer games are a
visible cautionary tale for what happens if that discipline erodes (see
`comparison/community-sentiment.md`'s "system bloat" theme, sharpest in Lords
Mobile).

### The hero/army layer

Every game has a gacha-or-earned hero-collection layer sitting on top of
anonymous troop counts: 3-5 heroes per squad, rarity tiers, star/shard
promotion, gear slots, and (in 6 of 8 games) a random-pull gacha as the primary
acquisition method. The two exceptions are notable:

- **Lords Mobile** unlocks heroes via campaign/event progression and direct
  purchase, not blind gacha pulls — called out in its own doc as unusual for the
  genre.
- **Rise of Kingdoms** calls them "commanders" with the deepest system of any
  game researched: 4 base skills + a 5th "Mastery" skill, specialty-gated talent
  trees, and a primary+secondary pairing system where both commanders' skills
  fire in the same combat turn.

Voidbound has no hero/gacha layer at all currently, and the README doesn't
describe one — crew are workers with a staffing formula (`crewScaledAmount`),
not named collectible individuals with skills. This is a real fork in the road
worth flagging explicitly in `voidbound-application.md` rather than assuming
Voidbound should grow one to "catch up" to the genre.

## 2. Additional/side features — kept separate, as requested

These are the things layered _on top of_ the core loop above — present in every
game, but not what a player does by default every session. Grouped by how
universal they are:

**Present in literally every game (the genre's non-negotiable feature set):**

- A **VIP level system** — a persistent, purchase-or-login-driven ladder of
  passive account-wide bonuses. Present in all 8.
- A **battle-pass-style seasonal track** (free + paid tiers) — present in 7 of 8
  (Rise of Kingdoms' "Lucerne Scrolls," Lords Mobile's "Kingdom Labors," Last
  War's Season Pass, etc.); Whiteout Survival's doc flags this as the one area
  of genuine ambiguity (multiple "pass-like" tracks but no source confirmed a
  single canonical "battle pass" by that name).
- A **near-continuous event calendar** — every game runs at least one
  time-limited event essentially always; several run 3-4 concurrently. Multiple
  docs identify this as _the_ mechanism that manufactures a reason to log in
  daily once the core building queue slows to hours/days.

**Common but not universal:**

- **Licensed-IP crossovers** as a major growth/retention lever — State of
  Survival (The Walking Dead, Tomb Raider, a Joker crossover — the Walking Dead
  crossover alone reportedly brought 20M new players) and Top War (Transformers,
  twice, explicitly credited with breaking revenue records). Not found in the
  other 6 — likely a function of publisher scale/budget more than genre
  necessity.
- **A dedicated mini-game distinct from the main loop** — Whiteout Survival's
  ice-fishing/treasure-digging ("to break up the monotony of the 4X grind," per
  one review), Dark War's "Into the Forbidden Zone" stage mode, Tiles Survive!'s
  Festive Pinball, State of Survival's Explorer Trail (arguably more a full
  singleplayer campaign than a mini-game).
- **Gifting/collectible/cosmetic layers** — base skins, avatar frames,
  decorations. Present in most games but explicitly called out as combat-inert
  (Last War's "Decorations" are the one exception — they're cosmetic _and_ grant
  stat bonuses, blurring the line).

**Genre-atypical differentiators (one game each):**

- **Top War's merge mechanic** — replaces the wait-timer as the primary upgrade
  action for buildings/troops. This is the single clearest example in the whole
  research set of a game taking the converged core loop and swapping one system
  for a genuinely different primitive, and it's reported as the single
  best-loved thing about the game even by critical reviewers.
- **Tiles Survive!'s tile-by-tile fog clearing** — the "one real point of
  differentiation" per its own doc's sourced press framing; otherwise the game
  is explicitly described by outside coverage as FunPlus reapplying its State of
  Survival template.
- **Rise of Kingdoms' turn-based tactical combat** (1-second turn cycle,
  formations, focus-fire) and **kingdom governance** (an elected King who hands
  out buff/debuff titles) — the deepest non-loop systems found in any game,
  compared by one industry analysis to EVE Online's politics.
- **Lords Mobile's sheer system count** — Labyrinth, Kingdom Tycoon, Familiars,
  Artifacts, Sigils, Colosseum, Guild Fest, and more, all running in parallel by
  mid-game. This is flagged in its own doc as a genuine community split: is it
  depth or bloat? (See `comparison/community-sentiment.md`.)

## 3. Round 2: what the core loop looks like once you leave mobile SLG

Four more games — Star Trek Fleet Command (space-set mobile SLG), EVE Online (PC
sandbox MMO), Clash of Clans (the base-builder root, no survival skin), OGame
(browser MMORTS, also space-themed) — were added specifically to test whether
§1's "converged core loop" finding holds outside the zombie/apocalypse-survival
subgenre, or was an artifact of researching eight reskins of the same game. **It
mostly holds, with two real exceptions.**

- **Star Trek Fleet Command runs the identical converged loop** from §1 almost
  exactly (collect → queue → assign → world-map activity → alliance duties →
  events), just with space flavor on top: mining uses **Survey ships gated by
  warp range** instead of static resource-node tiles, and cargo protection is
  **per-ship** (a Protected Cargo hold vs. raidable Over-Protected Cargo) rather
  than a base-wide Warehouse cap. This is close to a direct precedent for
  Voidbound's own asteroid-mining/vessel system (P1.6, P2.13) — a real
  player-facing validation that "risk scales with how much you're greedily
  hauling in one trip" works as a mechanic.
- **Clash of Clans runs a recognizably related but genuinely leaner loop** — and
  specifically **lacks** several things §1 called near-universal: no mandatory
  alliance-wide tech tree, no VIP ladder, no gacha, no near- continuous
  multi-track event calendar (its side-feature list in §2 is close to the
  _entire_ additional-feature surface, not a subset of it). This is the
  strongest available evidence that the genre's usual bloat (§1's
  resource-currency table, the VIP/gacha/battle-pass trio) is a choice, not a
  structural requirement of "base-building + async attack/defense" as a genre.
  CoC has run for 14 years profitably on a visibly smaller system count than any
  of the 8 survival-SLGs.
- **OGame runs a structurally different loop** — not minutes-scale
  "collect/queue/repeat many times a day," but a **long-timer, low-touch,
  patience-and-scheduling loop**: builds/research/fleet travel routinely take
  hours to multiple real-world days, sessions are about reacting to push events
  (attack reports, expedition results) within narrow windows rather than
  constant re-engagement, and there's no near-continuous event calendar the way
  §1's mobile SLGs have one. This is the one game in the full 12-game set that
  doesn't fit the "converged core loop" at all — worth remembering as a reminder
  that the convergence in §1 is a **mobile platform/session-length artifact**,
  not an inevitable property of the base-building-plus-alliance-PvP genre shape
  itself.
- **EVE Online doesn't really have "a loop"** in the sense every other game
  researched does — it explicitly has several parallel, profession-shaped loops
  (industrialist, miner, mission-runner, PvP roamer) that look different session
  to session, unified only by "manage passive systems, pick an activity, manage
  risk, talk to people." Its closest analog to §1's central gating building
  doesn't exist either — progression is split across skill training (real-time,
  uncapped, continues while offline), ship tiers, and corporation/alliance
  standing, with no single "Command Module"-equivalent number. Not a template
  Voidbound can borrow directly (a single-player local alpha has no use for
  EVE's multi-profession sandbox breadth), but useful as the far end of "how
  different could this genre's loop be" — see `voidbound-application.md`'s
  round-2 notes for where its _social_ systems (not its loop) are actually
  relevant.

**Resource economy, updated:** none of the four round-2 games contradict §1's
resource-discipline point. Star Trek Fleet Command runs 3 base currencies plus 3
refined-material tiers plus 2 specialty tracks (Latinum, Data) — if anything, a
_deeper_ currency sprawl than the original 8. OGame runs 3 raw resources
(Metal/Crystal/Deuterium) plus one premium currency (Dark Matter) — genuinely
lean, closer to Voidbound's own count, though its multi-axis
Economy/Research/Military **points system** (rather than one CP number) is a
notable alternative worth reading alongside the "add a power score" decision
already made (see `voidbound-application.md`). Clash of Clans runs 2 base
resources (Gold, Elixir) plus one scarcer tier (Dark Elixir) plus one premium
currency (Gems) — the leanest of any of the 12 games researched, reinforcing
§1's point rather than complicating it.

**The hero/army layer, updated:** Clash of Clans and OGame both **confirm that a
competitive, long-running game in this genre doesn't require a hero-collection
layer at all** — CoC's 6 named Heroes are unlocked deterministically by Town
Hall progression (no gacha, no rarity-tier randomness), and OGame has no hero
system whatsoever, confirmed explicitly in its own doc. This strengthens Part
1's earlier finding (Lords Mobile was the only one of the original 8 without
gacha) into a firmer pattern: **two of four round-2 games skip
hero-collection/gacha entirely and neither suffers for it** commercially (CoC is
a top-5-all-time mobile earner; OGame has run 23+ years). Star Trek Fleet
Command, by contrast, deepens the pattern from Part 1 — named canon officers
with synergy groups, gacha recruitment tied to its Battle Pass — no new
information there, just another data point on the "6 of original 8 do this" side
of the ledger.

## 4. What this means, at a glance

The core loop is a solved problem in this genre — every game reached the same
answer independently, and Voidbound's existing design (Command Module gate,
4-resource discipline, event-modeled actions) is already compatible with it
rather than needing to be invented from scratch. The interesting design space
for Voidbound's Phase 3 is almost entirely in section 2: which of these
additional/side features are worth adopting (and when), which ones are
genre-standard monetization plumbing Voidbound doesn't need because it has no
monetization decision made yet, and which ones — like Top War's merge mechanic
or Rise of Kingdoms' governance layer — represent a genuine opportunity to
differentiate rather than reskin. That tradeoff is worked through in
`voidbound-application.md`.
