# OGame

## 1. Overview

- **Genre:** Browser-based space MMORTS / 4X-strategy — text-and-menu-driven
  resource management, building, research, and fleet combat. Frequently cited as
  one of the founding titles of the "browser strategy" genre and, per one MMO
  review site, "the premium browser and text-based game that space warmongers go
  to" — repeatedly positioned in coverage as a lighter, more accessible cousin
  of _EVE Online_ rather than of any mobile SLG.
- **Developer/Publisher:** Created by Alexander Rösner ("Legor"), a German
  developer who, dissatisfied with an existing similar browser game, built the
  original version in roughly two months. Developed and published since by
  **Gameforge AG** (Germany).
- **Release date:** October 3, 2002. Now in its third decade of continuous
  operation — one of the longest-running browser games still under active
  development.
- **Platforms:** Native web browser (originally PHP-driven, now PHP/AJAX with a
  modern single-page-style client) — no download or installation required. A
  companion mobile app exists on **iOS and Android** (App Store listing
  confirmed) that mirrors the browser game rather than replacing it; the core
  design still presupposes desktop/browser play patterns (multi-tab monitoring,
  forum/board integration).
- **Scale:** Sources describe "millions of active players" globally across 20+
  language communities, but no research source gave a hard current
  concurrent/monthly figure or revenue number (unlike the mobile SLG titles
  researched previously, which have Sensor Tower-grade financial data). OGame's
  structure is explicitly multi-server: the game runs many parallel, independent
  **"universes"** (servers) per language/region, each with its own galaxies,
  economy-speed multiplier, and player population — new universes are opened
  periodically, and (see §10) low-population universes are periodically merged
  or closed down. A 2025 global merge round consolidated universes across
  essentially every regional community Gameforge operates (Brazilian, Danish,
  Croatian, Dutch, Slovenian, Slovak, Portuguese, Russian, Polish, Romanian,
  Argentine, Spanish, Mexican, Czech, Taiwanese, US, Greek, Hungarian, Turkish,
  French, English, Italian, German), run in six timed merger groups between June
  and August 2025 — direct evidence that population decline and consolidation
  are an ongoing, structural part of OGame's live-service model rather than a
  one-off event.
- **Monetization model:** Free-to-play with an optional premium currency, **Dark
  Matter (DM)**, sold directly (packages found ranging roughly 200,000 DM for
  €4.90 up to 4,000,000 DM for €99.90, with bonus DM on larger purchases) or
  earned in small amounts through gameplay (chiefly Expeditions, see §5). DM
  purchases don't expire and aren't a subscription. DM buys: temporary "Officer"
  bonuses (§7), a Merchant NPC that converts resources, item/booster
  consumables, and build/research/fleet-timer reductions. Player sentiment on
  monetization is split — a Gameforge-owned marketing page argues "a clever free
  player can compete successfully," while independent review aggregation
  (Trustpilot, at 1.5/5 TrustScore) skews strongly negative, with recurring
  complaints that new players "don't get the tools to progress unless they pay"
  and get "crushed by paying players."

## 2. Core gameplay loop

OGame's defining structural trait is that its "loop" is not a tight minutes-long
session but a **check-in cadence built around long, uninterruptible real-time
timers** — this is the single biggest contrast with the mobile survival-SLG
genre already researched, where most timers are minutes and sessions are
designed to be resumed constantly on a phone.

A typical session:

1. **Check status across all planets** — production accrual, in-progress
   builds/research, fleet arrivals, incoming attack/espionage reports, mail.
2. **Queue the next action(s)** — start a building upgrade, queue research (the
   Research Lab can only run **one** research at a time empire-wide, even across
   multiple colonies with their own labs), or dispatch a fleet mission (attack,
   transport, espionage, colonize, harvest debris, or expedition).
3. **Log off and wait.** Build, research, and fleet-travel timers routinely run
   from minutes up to many hours, and on some server speed settings, multiple
   real-world days for top-tier buildings/ships — a widely-cited OGame trait in
   reviews and guides. This is fundamentally a **patience and scheduling game**:
   much of "skill" at higher levels is optimizing what to queue before a long
   real-life gap (sleep, work, school) and reacting quickly to time-sensitive
   threats (an incoming attack fleet, a completed expedition) within a narrow
   real-time window.
4. **React to push-style events** — combat reports, espionage reports, and
   Expedition results arrive as in-game "mail," and a large part of experienced
   play is checking mail/notifications multiple times a day to catch fleet-save
   windows (moving your fleet before an incoming attack lands) rather than
   reacting live.

Because rounds/battles resolve instantly and automatically the moment fleets
collide (no real-time or turn-based player control during combat itself, see
§5), there is no "twitch" skill component — the loop is entirely about economic
optimization, timing, and threat assessment between long waits, which one review
summarized as combat being "thrilling strategically" but unfolding "passively
without player interaction during battles."

## 3. Base building & progression systems

- **Planet-centric building, not a single fixed base.** Each planet (home planet
  plus any colonies) has its own independent building set: Metal Mine, Crystal
  Mine, Deuterium Synthesizer, Solar Plant/Fusion Reactor/Solar Satellites for
  energy, Metal/Crystal Storage and Deuterium Tank, Robotics Factory and
  Shipyard (build ships/defenses), Research Lab, Alliance Depot, Missile Silo,
  Terraformer (adds building field slots), and a Nanite Factory (late-game,
  halves further build times). There is no single canonical "town hall" gate
  structure the way most mobile SLGs use — the Research Lab and
  Shipyard/Robotics Factory levels act as the de facto tech gates instead.
- **Research tree** run through the Research Lab: named branches typically
  grouped as **Energy, Combat/Military, and Engineering/Production**
  technologies (Energy Technology, Laser/Ion/Plasma Technology, Espionage
  Technology, Computer Technology, Weapons/Shielding/Armour Technology,
  Astrophysics, Combustion/Impulse/Hyperspace Drive, Graviton Technology, and
  others). Each unlocks new buildings, ships, or defenses, or upgrades existing
  ship/defense performance (weapons, shields, speed). Only one research can run
  at a time across the whole player account regardless of how many Research Labs
  exist on different colonies.
- **A later expansion layer, "Lifeforms,"** was added well after launch: players
  unlock one of several alien species, each granting its own building set, tech
  tree branch, and production/combat bonuses layered on top of the base game —
  introduces a secondary population/food resource (§4) gating this content.
- **No hero-gacha system, confirmed.** There are no collectible heroes, no gacha
  pulls, and no hero-power stat anywhere in the researched material —
  progression is entirely buildings, research levels, fleet composition, and
  (via Lifeforms) species-specific tech.
- **What replaces "power score":** OGame's ranking system is a **multi-layered
  points/highscore system**, not one aggregate power number. The core formula is
  simple — 1,000 resources _spent_ (not held) equals 1 point — but it's split
  into separate rankings: **Economy** (value of mines/production buildings),
  **Research** (all resources ever invested in tech), and **Military** (current
  value of all ships/defenses; this one is dynamic and falls when ships are
  lost, plus separate "destruction points" earned for ships destroyed in combat,
  which signal an active raider independent of standing fleet size). A composite
  "Total" ranking sums these. This multi-axis scoring is explicitly framed by
  Gameforge's own material as fairer to different playstyles than one blended
  number, and it also directly gates PvP: Newbie Protection (§8) uses the points
  ratio between two players to decide who can legally attack whom.

## 4. Resource economy

- **Three raw resources:** **Metal** (primary/most abundant), **Crystal**
  (secondary, costs more, needed for ships and electronics-tier research), and
  **Deuterium** (scarcest — doubles as ship fuel and Fusion Reactor input). All
  three are mined continuously and passively per planet (a planet's mines
  produce whether the player is online or not) — no manual "collect" tap, unlike
  most mobile SLGs' resource-node gathering loop.
- **Production formulas** (per hour, at mine level L; confirmed via the
  community wiki):
  - Metal Mine: `30 * L * 1.1^L`
  - Crystal Mine: `20 * L * 1.1^L`
  - Deuterium Synthesizer: `10 * L * 1.1^L * (-0.002 * T + 1.28)`, where `T` is
    the planet's temperature — colder planets produce meaningfully more
    deuterium than hot ones, making planet _temperature_ (a fixed property of
    where a planet sits/its slot) a real strategic factor in where to colonize,
    not just distance/position.
  - All three scale exponentially with level, so each additional level costs
    progressively more but also produces progressively more — classic
    diminishing-then-compounding investment curve.
- **Energy is a live balance, not a stored resource.** Solar Plants, Fusion
  Reactors (output scales with Energy Technology level), and Solar Satellites
  (efficient but destructible in combat, since they sit in orbit rather than on
  the ground) generate it; going into negative energy (shown in red) throttles
  mine output proportionally across the board rather than halting it outright.
- **Storage & raid exposure:** Metal/Crystal Storage and the Deuterium Tank cap
  how much of each resource a planet can hold; resources beyond storage cap are
  still produced but become vulnerable, and a percentage of in-storage resources
  is always flagged as protected from raids regardless (exact protected-floor
  mechanic wasn't fully detailed in sources, but its existence was confirmed).
- **Colonization as resource multiplication:** the central way to scale economy
  long-term is not "build bigger mines forever" but **acquire more planets**.
  Each solar system has 15 orbital slots; a player's **Astrophysics** research
  level determines both how many total planets they may hold (a new colony slot
  roughly every 2 Astrophysics levels beyond the first) and which of the 15
  slots in a system are colonizable at all (wider slot ranges unlock at higher
  Astrophysics). A dedicated **Colony Ship** must be flown to a target slot to
  found each new colony. This makes Astrophysics one of the most strategically
  load-bearing research lines in the game, since it directly multiplies total
  production capacity rather than just improving a rate.
- **Dark Matter** functions as the premium/meta-currency layer described in §1 —
  separate from the three raw resources, earned in small amounts from
  Expeditions or purchased, spent on Officers, the Merchant NPC, and
  timers/boosts.
- **Lifeforms layer adds Population and Food** as a secondary resource pair
  gating that expansion's species-specific buildings and bonuses, on top of (not
  replacing) the Metal/Crystal/Deuterium/Energy core.

## 5. Combat systems

### PvP fleet combat

- **Fully automatic resolution**, not player-directed in real time. When an
  attacking fleet arrives, the battle simulates up to **6 rounds**; each round
  every ship fires at a randomly selected enemy target, using probabilistic
  hit/damage rolls plus a **Rapid Fire** mechanic (certain ship types get a
  chance to fire an extra shot against certain target types, which materially
  skews counter compositions — e.g., certain fodder ships are specifically
  chosen because they resist a given attacker's rapid fire). The battle ends
  early if one side is wiped out, or after 6 rounds with the side holding more
  remaining strength declared the winner (a draw is possible). Players queue a
  fleet mission and then simply receive a combat report — there is no live
  tactical control during the fight itself.
- **Debris fields:** a portion (roughly 30-80% depending on server settings) of
  the metal+crystal value of ships **destroyed** in a battle (on both sides) is
  converted into a debris field left in that system, harvestable by Recycler
  ships from any player. Only metal and crystal go into debris — deuterium is
  not recoverable this way.
- **Moon formation:** a debris field over 100,000 combined resources has a
  chance to spawn a **moon** around the contested planet — roughly 1% chance per
  100,000 resources in the field, capped at 20%. Moons host their own buildings
  (notably the Jump Gate, for near-instant fleet transfer between a player's own
  moons, and the Sensor Phalanx, for scanning fleet movements in nearby
  systems), making large PvP battles a route to strategically valuable new real
  estate, not just resource loss/gain.
- **"Farming":** raiding weaker or, especially, **inactive** players for their
  accumulated (unprotected) resources is a normal, named part of the metagame. A
  player inactive 7+ days is marked "(i)" and greyed-out in the galaxy view;
  after 4 total weeks inactive they're marked "(I)." Per the community wiki,
  "inactives are generally good for raiding, as you are far less likely to be
  scanned back or get hit in revenge, and most people can make a profit by
  raiding inactives on a regular basis" — i.e., farming inactive accounts is
  treated as a legitimate, low-risk income strategy rather than a fringe/exploit
  behavior. **Vacation Mode** is the player-side countermeasure: a planet in
  vacation mode cannot be attacked at all, meant for genuine extended absences.
- **Espionage / spy probes:** the cheap, disposable Espionage Probe (built in
  seconds from Crystal alone) is sent on an espionage mission to reveal a target
  planet's resources, defenses, fleet, and/or research (detail level scales with
  Espionage Technology and probe count sent). Every espionage attempt reports a
  **counter-espionage chance** (0-100%) that the probes get detected — driven by
  probe count sent, the Espionage Technology gap between attacker and defender,
  and the defender's ship count — and if detected the probes are destroyed in an
  automatic mini-battle, though the report is still delivered regardless of
  whether the probes survive.

### PvE: Expeditions

Widely described as OGame's most distinctive PvE system — an automated "send a
fleet into the unknown and see what happens" mechanic with no direct combat
control:

- Fleets are sent to the unnumbered 16th "slot" of a galaxy system (beyond the
  normal 15 colonizable positions) — conceptually "deep space." A mission has
  three phases: outbound travel, a minimum ~1 hour exploration window, and
  return travel.
- **Slot count** (how many expeditions can run simultaneously) is
  `floor(sqrt(Astrophysics level))`: level 1-3 gives 1 slot, 4-8 gives 2, 9-15
  gives 3, 16-24 gives 4, 25+ gives 5 — plus the Admiral officer (§7) grants one
  additional slot on top, which is why most active players keep Admiral running
  near-permanently.
- **Outcome odds** (figures varied slightly between sources but were broadly
  consistent): roughly **32%** resources found, **22%** an abandoned ship
  discovered and added to the player's fleet, **~19%** nothing happens, **~9%**
  Dark Matter found (in small/medium/large tiers, ~300 up to ~1,800 DM), and a
  combined **~6-12%** chance of a hostile encounter (pirates, whose tech is
  calibrated a few levels below the sender, or "aliens," a notably tougher
  variant calibrated above the sender's tech). Within hostile encounters,
  there's a small (widely cited around **1%**, described in one source as up to
  1-in-300) chance of a catastrophic "black hole" event that destroys the
  **entire sent fleet outright with no return** — called out repeatedly as the
  single scariest and most talked-about risk in the system.
- **Fleet composition matters distinctly from combat fleets:** ships contribute
  "Expedition Points" toward the find-size roll based on their construction cost
  (roughly cost / 200), so cargo-heavy fleets (Large Cargos) with a handful of
  combat escorts (to survive the pirate/alien roll) is the standard build; a
  **Pathfinder**-class ship specifically doubles the maximum possible find size,
  and a **Discoverer** class (a player specialization, not a ship) adds a
  further multiplier. Colony Ships, Recyclers, and Deathstars contribute nothing
  useful to an expedition and are avoided.
- **System depletion:** repeatedly sending expeditions to the same galaxy system
  diminishes returns; the system's expedition "supply" regenerates at a rate of
  roughly 10 per day, so spreading expeditions across systems (or limiting to
  2-3/day per system) is standard optimization advice.

## 6. Alliance/social systems

- **"Alliance" is the exact, official term** used in-game and across all
  documentation — confirmed.
- Alliances have their own **rank hierarchy** (commonly Founder, Co-Leader,
  Diplomat, Member, though exact ranks are alliance-configurable), an **Alliance
  Page** listing membership, a private **Alliance Forum** for strategy
  coordination, and **circular messages** for mass announcements to the whole
  membership.
- **Concrete mechanical benefits of alliance membership** (not just social):
  access to **ACS** (Allied Combat/Defense System — the mechanism for multiple
  players' fleets to combine into a single coordinated attack or defense),
  alliance-exclusive class bonuses unavailable to unaffiliated players, and
  informal but load-bearing practices like shared moon networks (Jump Gates let
  allied players hop fleets between member-owned moons) and coordinated
  "fleet-save" scheduling to protect each other from incoming attacks. Guide
  material states plainly that "solo players are permanently at a disadvantage
  in OGame: no protection, no ACS possibility, no alliance bonuses" — alliance
  membership is close to structurally mandatory for competitive play, not an
  optional social layer.
- **Diplomacy** happens through **NAPs (Non-Aggression Pacts)** between
  alliances — explicitly **not** system-enforced; NAPs rely purely on mutual
  trust/reputation and are conventionally documented in writing (alliance forum
  posts or direct messages) precisely because the game itself won't stop a
  betrayal.
- **Official forums** exist per-language/per-universe
  (`board.<lang>.ogame
  .gameforge.com`) as the primary out-of-client community
  hub — used for official patch/event announcements, community guides/tutorials,
  alliance recruitment, and (per §10/§11) merge-process communication. Alliance
  tags are visible on forum profiles as a social signal outside the game client
  itself.

## 7. Additional/side features

Kept separate from the core loop (§2) and PvE combat (§5) per the requested
structure — these are convenience/monetization and event layers:

- **Officers** — premium, Dark-Matter-gated account-wide boosts, each with a
  distinct role (this is OGame's closest analog to a mobile game's "VIP"/booster
  system, but framed as five separate named specialists rather than one
  subscription tier):
  - **Commander** — unlocks the multi-item build queue (up to 5 queued at once)
    and an "Empire View" for managing all planets from one screen (without it,
    base management is more manual/per-planet).
  - **Engineer** — mainly a defensive-play tool: roughly halves defense
    casualties in combat (higher % of destroyed defenses rebuild instead of
    being permanently lost) and adds +10% energy production.
  - **Geologist** — the miner's pick: +10% resource production on every planet.
  - **Admiral (Fleet Admiral)** — +2 fleet mission slots, plus the extra
    Expedition slot noted in §5, and fleet-mission UI shortcuts.
  - **Technocrat** — +2 effective Espionage Technology levels and -25% research
    time.
  - Running **all five simultaneously** grants a "Staff" bonus on top: a further
    +2% resource production and +10% expedition loot.
  - Pricing example found: the Engineer officer costs roughly 5,000 DM/week or
    50,000 DM for three months — i.e., officers are rented in time blocks, not
    bought permanently.
- **Merchant** — a DM-purchased NPC action that converts one resource type into
  another, capped by storage capacity — a liquidity/flexibility tool for a
  resource-scarcity moment (e.g., deuterium-starved but metal-rich) rather than
  a passive bonus.
- **Events** — recurring limited-time content cited in current marketing
  material: named events like "Titan Clash" and periodic "Expedition Events"
  (temporarily improved expedition odds/rewards), plus anniversary celebrations
  (a large one for the 20th anniversary in 2022) and server-specific "speed
  universes" with accelerated multipliers as a standing alternate ruleset rather
  than a time-limited event.
- **New ship classes as a live-service addition, not launch content:** the
  Reaper and Pathfinder ships, and an account-wide **Class system** (Discoverer,
  and combat/mining specializations implied by references to bonuses like the
  Discoverer's extra colony/expedition multiplier) were called out repeatedly as
  relatively recent content additions keeping the aging game mechanically fresh.
- No loot-box/gacha collection system was found anywhere in research — Dark
  Matter purchases are direct (buy a fixed DM amount, or rent a named officer),
  not randomized pulls.

## 8. Early game (first session / first few days)

- **Onboarding is minimal by modern standards.** No source described a scripted
  tutorial sequence comparable to a mobile SLG's guided first session;
  new-player support instead comes from **community-written guides** hosted on
  the official forums (numbered "Tutorial" threads — e.g. "Tutorial 14: Noob
  Protection," "Tutorial 08: Espionage," "Tutorial 16/17: Premium Features" — a
  forum-thread-as-documentation pattern typical of 2000s browser games) and
  third-party wiki/guide sites. A player starts on a single home planet with
  baseline mines and must self-direct into the build → research → (eventually)
  fleet progression described in §2-3.
- **Newbie Protection** is the core new-player safety mechanic, and it's a
  **relative points-ratio shield**, not a flat immunity window: on newer
  universes, a player with 0-50,000 points is protected under roughly a 1:5
  ratio (can only be attacked by, and can only attack, players within 5x their
  own point total either direction); 50,000-500,000 points uses a looser 1:10
  ratio. In the galaxy view, players you're protected from show in red with an
  "(s)" marker; players who are protected from _you_ show green with "(n)."
  Protection is lost after 7 days of account inactivity (it returns on next
  login, i.e., it's not a permanently spent resource) — which is also precisely
  the inactivity threshold that flips a player into "farmable inactive" status
  for others (§5), meaning the same 7-day mark is simultaneously "protection
  lapses" and "you become prey," a notably harsh design compared to mobile SLGs'
  typically explicit, generous shield timers.
- **Vacation Mode** (see §5) is the deliberate, player-activated alternative for
  planned absences — full attack immunity but presumably at the cost of active
  play (exact production/timer effects while in vacation mode weren't detailed
  in sources beyond "cannot be attacked").
- Guides consistently frame the realistic minimum commitment as needing to check
  in **multiple times a day** even early on to keep queues full and react to
  threats — one current "is it worth starting" piece states the game is
  unsuitable for anyone investing "less than 15 minutes daily" on a
  competitive/established server, though a **freshly opened universe** (where
  everyone starts at zero simultaneously) is repeatedly recommended as the best
  on-ramp specifically because it removes the veteran-catch-up problem.

## 9. Mid game

Research material here was thinner than for early/late game, but a consistent
picture emerged:

- Mid game is where the **long-timer, patience-driven identity** of OGame is
  most pronounced and most different from mobile SLGs' mid-game content drip.
  There's no described mid-game "event calendar" comparable to the survival-SLG
  genre's weekly rally/gathering cycles — instead, sustained play is driven by:
  - **Colonization pressure** — pushing Astrophysics levels to unlock more
    colony slots and physically expanding the empire across systems (§4), which
    is the primary lever for meaningfully increasing total production once a
    single planet's mines hit diminishing returns.
  - **Expeditions as a steady, semi-passive income supplement** once
    Astrophysics is invested enough to open multiple slots — described in guide
    material as "a reliable passive income source — especially for miners and
    mid-game players," i.e., explicitly called out as the mid-game's answer to
    "what do I do with a fleet that isn't ready for real PvP yet."
  - **Alliance integration** becomes load-bearing around this stage — solo
    players plateau against alliance-backed rivals (§6), so joining/
    participating in an alliance's coordinated defense and farming targets is
    presented as close to mandatory for continued competitive growth rather than
    optional.
  - **Fleet-composition planning against known late-game threats** starts here
    even though the ships in question (Deathstars, Battlecruisers, Destroyers)
    are late-game-tier — mid-game defense doctrine (choosing Rocket Launcher vs.
    Light Laser fodder ratios, for instance) is explicitly built around
    anticipating what will eventually attack you, per fleet guide material.
- No source described any kind of gacha/hero-collection meta-progression layer
  active at this or any stage — consistent with §3's confirmation that the
  system simply doesn't exist in OGame.

## 10. Late/end game

- **Fleet scale and Deathstars:** top players field very large fleets; guide
  material specifically calls out that late-game attackers "often get attacked
  with Deathstars," among the strongest ships in the game, with Plasma Turrets
  cited as the only real standalone defense against them (requiring a genuinely
  balanced defensive composition rather than one counter-unit). Veteran players
  who've been on a universe since its opening are typically far larger than
  newer arrivals, which guide material notes makes simple, large-scale ship-type
  spam (e.g., pure Battlecruiser fleets) a viable, "most profitable" strategy at
  that scale rather than needing intricate composition.
- **Alliance warfare** is the dominant end-game social structure: coordinated
  fleet-save timing across a whole alliance, defensive fleet staging at
  strategically positioned members, and moon-to-moon Jump Gate networks for
  rapid alliance-wide fleet redeployment are all cited as hallmarks of
  successful top-tier alliances, alongside the diplomatic NAP layer (§6) for
  managing relations with rival alliances.
- **Universe merges are a real, structural end-game/live-service mechanic**,
  directly relevant to any game considering season/world-merge design:
  low-population universes (one forum thread cites a dying universe down to
  "around twenty active players... maybe 5-6 fleets trying to maintain
  interest") get formally merged into healthier target universes rather than
  simply left to decay or quietly shut down. Gameforge runs a documented
  **"Exodus" merge process**: source ("exodus") universes are fully migrated
  into a chosen target universe and then shut down/deleted; players get to
  choose (and can change, up until the move executes) which target universe
  their account migrates to, but the move itself happens once, is
  administratively scheduled in timed batches, and target-universe settings
  (economy speed multiplier, deuterium consumption rate, galaxy count, debris
  field percentage) are sometimes deliberately adjusted to better absorb the
  incoming merged population. The 2025 round (§1) ran as six sequential merger
  groups across essentially the entire set of regional communities over roughly
  two months (June-August 2025) — evidence this is a mature, repeatable, and
  apparently fairly routine operational process for Gameforge at this point, not
  an emergency one-off. One administrator's framing of a 2025 merge announcement
  leaned into the game's own space fiction ("a new opportunity has finally
  arrived for you to shake the dust off your ships and get a chance to send your
  fleet into deep space"), suggesting Gameforge treats merges as a marketed
  fresh-start event for affected players rather than purely an unglamorous
  server-consolidation task.
- No source described a formal "prestige"/full-universe-reset-to-zero mechanic
  distinct from merges — the closest analog to a "fresh start" that guides
  recommend is simply joining a **newly opened universe**, where by definition
  every player starts simultaneously at zero (§8).

## 11. Community sentiment

Coverage here is a mix of genuine sourced material and an honest gap: **the
subreddit r/ogame itself was not directly readable** — WebFetch cannot reach
reddit.com in this environment (consistent with prior research sessions in this
project), and WebSearch's domain filter also rejected reddit.com as a disallowed
host for this account, so no direct subreddit quotes could be gathered despite
two attempts. What follows draws instead from Gameforge's own official forums
(community-written, not corporate copy, even though hosted by the publisher), an
aggregate consumer review site, and independent game-review/wiki writeups.

- **Aggregate review sentiment is notably negative on Trustpilot** — a
  TrustScore of **1.5 out of 5**, with cited complaints clustering on pay-to-win
  dynamics ("new players don't get the tools to progress unless they pay for
  premium currency... invest a lot of time only to be crushed by paying players
  and can't progress further"), weak/paywalled customer support, and community
  moderation concerns (volunteer Game Operators described in one review as
  poorly managed). Note Trustpilot skews toward people motivated to leave a
  review after a bad experience, so this shouldn't be read as a representative
  sentiment average.
- **Independent MMO-review coverage is more balanced and structurally positive
  about the design**, even while flagging real weaknesses: one aggregator review
  praised "Excellent war and resource sim" and "Exciting social PVP gameplay" as
  core strengths, explicitly favorably comparing OGame's niche appeal to _EVE
  Online_'s, while listing "Slow progression rate," "Lack of graphics and
  visuals," and "No sounds and music" as its top three cons — i.e., the sparse,
  text-driven presentation is acknowledged as a real barrier for modern players
  even by reviewers who otherwise rate the strategic depth highly.
- **The long-timer pacing is the single most consistently cited defining trait
  across every source type** — official marketing, independent reviews, and
  forum/guide material alike all converge on describing OGame as demanding
  patience and real daily time investment (guide consensus: realistically 15-30+
  minutes/day minimum on a competitive server, with multiple check-ins needed to
  catch fleet-save windows and expedition returns) rather than being a
  background/idle game a player can genuinely ignore for long stretches — a
  sharp contrast with modern mobile SLGs' design-forward idle/offline-friendly
  framing.
- **Population decline is openly acknowledged by both players and Gameforge
  itself**, not just inferred from outside — the existence of a whole standing
  "merge" process (§10), forum petitions asking Gameforge to merge specific
  dying universes, and threads describing individual universes down to a literal
  handful of active fleets are all first-party evidence that sustaining
  population on any single server over years is a known, persistent challenge
  for this style of long-session, high-commitment MMORTS.
- **Retrospective/legacy framing:** independent coverage of 2000s browser games
  repeatedly credits OGame as foundational — "a pioneer in massive browser
  games" that "became the template for many browser games of that era" and is
  cited as having influenced the later evolution of the broader browser-strategy
  genre (one piece specifically draws a line from OGame's template through to
  games like _Forge of Empires_). No single widely-cited long-form video
  retrospective/documentary specifically about OGame was found (searches
  surfaced general browser-game history content and OGame's own promotional
  "First Look" gameplay video, but nothing matching a dedicated critical
  retrospective), which is itself worth noting: despite OGame's influence, it
  appears to have been the subject of substantially less critical/documentary
  treatment than its historical importance might suggest.

## 12. Sources

- [OGame — Wikipedia](https://en.wikipedia.org/wiki/OGame)
- [History Of OGame — OGame Wiki (Fandom)](https://ogame.fandom.com/wiki/History_Of_OGame)
  (title/summary surfaced via search; direct fetch blocked, HTTP 402)
- [Technology — OGame Wiki (Fandom)](https://ogame.fandom.com/wiki/Technology)
- [Research — OGame Wiki (Fandom)](https://ogame.fandom.com/wiki/Research)
- [Formulas — OGame Wiki (Fandom)](https://ogame.fandom.com/wiki/Formulas)
- [OGame Resources — Metal, Crystal, Deuterium & Energy Explained (Gameforge)](https://gameforge.com/en-GB/games/ogame-resources.html)
- [OGame Resources Overview — Sidian Wiki](https://sidian.app/s/ogame-wiki/economy/resources)
- [OGame Expeditions 2026 (Gameforge)](https://gameforge.com/en-GB/games/ogame-expeditions.html)
- [OGame Expeditions: The Complete Guide — ogame.life](https://ogame.life/ogame/blog/ogame-expeditions-the-complete-guide-to-fleet-composition-rewards-and-automation)
- [Expeditions — Sidian Wiki](https://sidian.app/s/ogame-wiki/guides/expeditions)
- [Moonchance — OGame Wiki (Fandom)](https://ogame.fandom.com/wiki/Moonchance)
  (title surfaced via search)
- [Debris Field — OGame Wiki (Fandom)](https://ogame.fandom.com/wiki/Debris_Field)
  (title surfaced via search)
- [Combat — OGame Wiki (Fandom)](https://ogame.fandom.com/wiki/Combat) (title
  surfaced via search; direct fetch blocked, HTTP 402)
- [Inactive Players — OGame Wiki (Fandom)](https://ogame.fandom.com/wiki/Inactive_Players)
  (title surfaced via search)
- [Newbie Protection — OGame Wiki (Fandom)](https://ogame.fandom.com/wiki/Newbie_Protection)
  (title surfaced via search)
- [Noob Protection — OGame Wiki (wiki.ogame.org)](http://wiki.ogame.org/index.php/Tutorial:Noob_Protection)
- [OGame 2026 — Is It Still Worth Starting? (Gameforge)](https://gameforge.com/en-GB/games/ogame-worth-2026.html)
- [Review of Ogame — mmommorpg.com](https://www.mmommorpg.com/browser-games/ogame/)
- [Gameforge Reviews — Trustpilot](https://uk.trustpilot.com/review/ogame.de)
  (fetch blocked, HTTP 403; rating/summary from search snippet)
- [FAQ Merging Universes — OGame Origin forum](https://board.origin.ogame.gameforge.com/index.php/Thread/3357-FAQ-Merging-Universes/)
  (redirected to forum.origin.ogame.gameforge.com)
- [Merges 2025 — OGame US forum](https://board.us.ogame.gameforge.com/index.php?thread%2F107151-merges-2025%2F=)
- [OGame Alliance Guide (Gameforge)](https://gameforge.com/en-GB/games/ogame-alliance-guide.html)
- [Alliance — OGame Wiki (Fandom)](https://ogame.fandom.com/wiki/Alliance)
  (title surfaced via search)
- [OGame Alliance Strategies Guide — ogame.life](https://ogame.life/ogame/blog/ogame-alliance-strategies-guide-building-a-top-team)
- [OGame Espionage System (Gameforge)](https://gameforge.com/en-GB/games/strategy-game-with-espionage-system.html)
- [OGame Espionage Guide 2026 (Gameforge)](https://gameforge.com/en-GB/games/ogame-spionage.html)
- [Espionage — OGame Wiki (Fandom)](https://ogame.fandom.com/wiki/Espionage)
  (title surfaced via search)
- [OGame Points System — Rankings, Economy and Military Explained (Gameforge)](https://gameforge.com/en-GB/games/ogame-points-system.html)
- [Points — OGame Wiki (Fandom)](https://ogame.fandom.com/wiki/Points) (title
  surfaced via search)
- [OGame Colonisation 2026 (Gameforge)](https://gameforge.com/en-GB/games/ogame-colonization.html)
- [Colonization — OGame Wiki (Fandom)](https://ogame.fandom.com/wiki/Colonization)
  (title surfaced via search)
- [Ogame's Best Strategies for Late-Game Success — ogame.life](https://ogame.life/ogame/blog/ogames-best-strategies-for-late-game-success/)
- [Defense Build Strategies — OGame Wiki (Fandom)](https://ogame.fandom.com/wiki/Defense_Build_Strategies)
  (title surfaced via search)
- [OGame — App Store (Apple)](https://apps.apple.com/us/app/ogame/id1593395507)
- [Dark Matter — OGame Wiki (Fandom)](https://ogame.fandom.com/wiki/Dark_Matter)
  (title surfaced via search)
- [The Ultimate Ogame Beginner's Guide for New Players — ogame.life](https://ogame.life/ogame/blog/the-ultimate-ogame-beginners-guide-for-new-players/)
  (title surfaced via search)
- WebSearch queries for "r/ogame reddit" sentiment and direct `www.reddit.com`
  WebFetch both failed/were blocked in this environment — no subreddit content
  could be retrieved for this doc.
