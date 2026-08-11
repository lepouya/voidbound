# Last War: Survival — Competitive Research

## 1. Overview

- **Genre:** Mobile 4X / SLG (strategy-lite base-building + hero-collector),
  zombie-apocalypse theme.
- **Developer:** First Fun (HK) Ltd. / RiverGame — the two studios are closely
  linked: First Fun's founder acquired a 42% stake in RiverGame in 2021, and
  both companies' founders trace their lineage back to ELEX Technology (the
  studio behind _Clash of Kings_, sold for $433M in 2014). Last War is the
  flagship product of this partnership, alongside other titles in their "4X
  portfolio" (_Top Heroes_, etc.). Some coverage (PocketGamer.biz) credits
  RiverGame as the primary developer of the "Last War UA/onboarding strategy"
  specifically; other sources (Wikipedia) name First Fun HK LTD as developer of
  record. Publishing is handled by **FUNFLY PTE. LTD.** (Singapore-incorporated
  Feb 2024) — this is the name on both app store listings. Tencent holds an
  indirect ~10.71% stake via Beijing Yuanqu Entertainment Co., Ltd., one of the
  corporate entities in the ownership chain.
- **Release date:** August 2023 (soft launch revenue was tiny — $287,000 in the
  launch month).
- **Platforms:** iOS, Android, and a "Play on PC" version distributed via the
  Google Play Games PC client. No console release.
- **Scale:** One of the biggest mobile games in the world by revenue. Lifetime
  revenue crossed $1 billion on September 14, 2024,
  $2 billion on February 15, 2025, and is estimated around **$3.5 billion
  lifetime** by mid-2026 (AppMagic), with
  **$1.65 billion earned in 2025 alone** — its biggest year. Monthly revenue grew from ~$30M
  (Jan 2024) to a record **$212M in January 2025** (single-day record:
  $11.6M on Feb 14, 2025). Lifetime installs are estimated at **~192.5 million**. Revenue-per-download (~$18)
  and revenue-per-active-user (~$5/month) are both described as exceptional for
  the genre, where most titles sit in low single digits. Regional revenue is
  US-led (~30–33% of lifetime spend), then South Korea (~18–20%) and Japan
  (~17–18%); the game is notably **unavailable in mainland China**. By mid-late
  2026, AppMagic-tracked revenue had been declining for several consecutive
  months (e.g. $64.5M in a reported month vs. $71.4M the prior month),
  suggesting the game may be past its peak-growth phase and now in a
  maturing/declining-UA-efficiency stage.
- **Monetization model:** Free-to-play with heavy in-app purchases:
  resource/speedup bundles, gem packs, hero/gear packs, a permanent VIP level
  system (paid or resource-purchasable VIP points), weekly/monthly recurring
  subscriptions, seasonal Battle Passes (Advanced ~$4.99, Premium ~$19.99
  equivalent), a "Super Monthly Pass"
  ($24.99), and cosmetic skins reportedly priced from ~$100 up to $500+, with a
  "VIP 18" top spending tier said to require roughly $500,000 cumulative spend.
  Genre analysts describe strategy games (Last War prominent among them) as
  having overtaken RPGs as the top-spending mobile genre in 2024.

## 2. Core gameplay loop

A typical session (for a mid-progression player) looks like:

1. **Collect and reinvest** — open the app, collect resources that accrued while
   offline (food, iron/ore, gold/coins), and check on production buildings.
2. **Clear the queue** — spend accumulated resources on building upgrades, troop
   training, hero leveling, and Tech Center research, keeping
   build/training/research queues always occupied (a "never leave a queue empty"
   idle-optimization loop common to the genre).
3. **Check tasks/events** — work through daily "Main Tasks," chapter-progress
   missions, and whichever timed alliance or seasonal event is currently running
   (multiple run concurrently: e.g. a weekly _Frontline Breakthrough_
   skill-stage event, a rotating alliance event like _Zombie Siege_ or _Enemy
   Buster_, a season-long track like _Rare Soil War_).
4. **Light PvE/skirmish action** — play a few rounds of the _Frontline
   Breakthrough_ stage-based mini-game (the "shooter"/wire-cutting-adjacent
   mechanic featured heavily in UA ads), send troops to gather resources from
   map tiles, or clear a Doom League/zombie stronghold stage.
5. **Alliance duties** — donate to Alliance Technology, send/request
   reinforcements, respond to rally calls, chat/coordinate for scheduled PvP
   windows (Alliance Wars, Capital Conquest, Server vs Server).
6. **Log off with timers running** — set a long build/research/training queue so
   meaningful progress continues offline; the loop repeats when timers complete
   or an alliance rally needs bodies.

Combat itself is described by multiple reviewers as running "mostly on
autopilot" — the player's decisions are in squad composition, hero selection,
and when/where to commit troops, not in real-time input, aside from the discrete
skill-based _Frontline Breakthrough_ mini-stages.

## 3. Base building & progression systems

- **Headquarters (HQ) progression:** the central building gates almost
  everything else; guides track HQ levels 1 through 35+, each unlock tied to new
  buildings, unit tiers, or systems.
- **Buildings:** resource producers (Field/Farm for food, Iron Mine, Smelter for
  ore, Coin Vault/Gold Mine), storage/protection buildings (Food Warehouse, Iron
  Warehouse — protect stock from raiding up to a cap), military buildings
  (Barracks, Drill Ground, Training Base, Component Factory, Hospital for
  wounded-troop healing), the **Tech Center** (main research hub, tracked
  "Pre-Season" through "Season 6" tiers as the game's seasonal content
  expanded), **Alliance Center**, **Drone Center** (Tactical Drone unit that
  fights alongside squads and scales with its own leveling), and a **Chip Lab**.
- **Hero system:** three military "branches"/unit archetypes — **Tank**
  (frontline damage-soak), **Missile Vehicle** (ranged backline damage), and
  **Aircraft** (agile, hits specific target types) — each hero belongs to one
  type and is recruited via a gacha "Tavern" system using recruit tickets.
  Rarity tiers run SR → SSR (Epic) → UR (Legendary); reported drop rates are
  roughly 4% for SSR and 1% for UR, with a pity system guaranteeing a Legendary
  roughly every 38 draws. Heroes progress via EXP leveling, star/tier promotion
  (consuming Hero Shards), skill upgrades, hero-specific "Exclusive Weapons,"
  and gear sets (e.g. "M5-A gear"); a "Hero Awakening" system (introduced with
  named heroes like Kimberly, DVA, Tesla in Season 6) adds a further late-game
  power layer. An SSR→UR promotion path also exists for upgrading existing
  heroes rather than only pulling new ones.
- **Tech tree:** organized into branches — guides commonly recommend an early
  Economy + Development focus (Development boosts research/construction speed
  broadly; Economy boosts passive resource production), delaying the Hero tech
  branch until roughly stage 30+, then a Units branch that upgrades
  infantry/vehicle/aircraft stats.
- **Power/Combat Power (CP) score:** an aggregate score (called "Power") that
  sums contributions from unit stats, hero level/promotion/gear, building levels
  (notably the three unit-type "Centers" — Tank/Missile/Aircraft Center — which
  grant HP/Attack/Defense/Command bonuses), the Tactical Drone, base
  "Decorations" (cosmetic-adjacent items that also grant stat bonuses, better at
  higher rarity), and permanent VIP level. Power is the game's visible headline
  stat, shown on player profiles and used to gate/seed PvP matchmaking and rally
  targeting.
- **Other progression systems named in guides:** a "Survivors" system,
  "Professions" (Engineer and War Leader specialization trees), a Wall of Honor,
  and Alliance Technology (alliance-wide research funded by member donations).

## 4. Resource economy

- **Core resources:** Food, Iron (Ore/Iron), and Gold/Coins are the three
  primary currencies, each with a matching production building (Field, Iron
  Mine/Smelter, Coin Vault/Gold Mine) and matching protective Warehouse (caps
  how much can be stolen by raiders).
- **Spend profile per resource:** Food is described as most needed for Support
  buildings; Iron most needed for Military buildings; Gold/Coins required for
  building construction and — most heavily — for Tech Center research.
- **Premium/soft currencies:** Gems (spent on the VIP system, described by
  guides as the single most efficient use of gems in the game since VIP levels
  are permanent), Gold Bricks (battle pass currency), and season-specific
  currencies (e.g. "Rainforest Mushrooms" in Season 6) tied to seasonal event
  tracks.
- **Sinks:** building upgrades, troop training/healing, research, hero
  leveling/promotion/gear, speedup consumables (to skip timers), and the gacha
  Tavern (recruit tickets, purchasable with premium currency).
- **World-map resource gathering:** players send troops/vehicles out to gather
  from map resource tiles (echoing the genre-standard 4X "send a march to a
  resource node" loop), and a "radar power" stat unlocks access to better
  missions/nodes.

## 5. Combat systems

- **PvE — Frontline Breakthrough:** a weekly (Sunday) skill-based mini-game —
  the mechanic most visible in the game's UA ads (troop-lane dodging/shooting,
  barrel-destroying, buff-collecting) — structured as 5 sequential stages of
  increasing difficulty. Notably, heroes/tech/base power do **not** affect this
  mode: everyone starts with identical event troops, so it's a pure player-skill
  leaderboard event. Only 3 of 5 stages need clearing for full objective
  rewards; ranking ties are broken by troops kept alive.
- **PvE — Doom League / zombie strongholds:** the setting's core "zombie" PvE
  content, plus special-objective modes referred to in reviews as "Special Ops."
- **PvP — Rallies:** the standard 4X rally mechanic — one player initiates an
  attack on a target (enemy base or, in events, a boss/garrison), and alliance
  members join the same rally to combine troop counts. Guides recommend 3–5
  minute rally timers to give allies time to join without giving the target time
  to prepare defenses.
- **PvP — Garrison/reinforcement defense:** allied players can send "garrison"
  reinforcement troops into a teammate's base; attackers must overcome both the
  garrison and the base owner's troops in one strike, so alliances plan
  reinforcement coverage in advance. A known player tactic ("garrison-join
  trick") is joining a rally instantly by first garrisoning inside a shielded
  ally's base.
- **PvP — Squad formations:** three formation archetypes align with the
  hero-type system — Missile (ranged/backline pressure, good in rallies), Tank
  (frontline/defensive, good for holding Capitals and Cannons), and presumably
  an Aircraft-oriented formation, though guides focus mainly on Missile vs. Tank
  use cases.
- **Large-scale PvP events:** Alliance Wars, Server vs Server (SvS), Capital
  Conquest / "Capital Clash" (alliance-coordinated territory control), and
  season-specific PvP events (Rare Soil War in Season 2, Goldust Conquest in
  Season 3, Copper War in Season 4, Trade Train in Season 5, Faction Warfare &
  Altars in Season 6).
- **Non-aggression pacts (NAPs):** most servers reportedly settle into informal
  or explicit non-aggression agreements protecting top alliances, sometimes
  escalating to restrictive terms ("NAP 5") that a reviewer characterized as
  enabling top alliances to bully smaller ones without consequence.

## 6. Alliance/social systems

- **Alliances** are effectively mandatory for meaningful late-game play —
  solo/unaffiliated players are described as vulnerable to raiding and locked
  out of most high-value PvP and reward content.
- **Alliance Technology:** a shared research tree funded by member resource
  donations, benefiting the whole alliance.
- **Alliance events:** a large named roster — Duel VS, Alliance Train, Enemy
  Buster, Zombie Siege, Marshal's Guard, Sky Predator, Capital Conquest — run on
  rotating schedules to keep alliance-level cooperative content fresh.
- **Reinforcement/garrison system** (see § Combat) is the core mechanical
  expression of alliance interdependence.
- **Chat and coordination:** in-game alliance chat plus a **built-in
  translator**, explicitly marketed as a feature to support the game's
  international, cross-language alliance population.
- **Server structure and its social consequences:** servers ("Warzones") host a
  fixed population that plays out a competitive arc across "Seasons." A
  **Transfer Surge**/ticket system (50 Transfer Tickets, fixed cost regardless
  of player "transfer score") lets players pay to migrate to a different server
  within their server grouping during an application window; as of roughly May
  2026 the game introduced a "soft merge" system where high-population servers
  share matchmaking pools with neighboring servers during specific seasons. One
  long-time-player review characterized this system critically as "planned
  decay": once Season 1 locks a server, players can no longer revitalize old,
  dying servers with fresh accounts the way they once could, so servers
  gradually bleed activity and push remaining players toward starting over on
  newer servers — effectively abandoning sunk investment. Third-party community
  tools (LW Atlas, FarmOps' Last War Server Tracker) exist specifically to track
  alliance/player rankings, power, and kills across this cross-server structure.

## 7. Additional/side features

_(kept separate from the core loop per template — these are things layered on
top, not the every-session grind)_

- **Battle Pass / Season Pass:** one per 8-week Season, with Free / Advanced
  (~$4.99-equivalent) / Premium (~$19.99-equivalent) tracks; rewards include
  gems, speedups, resources, hero shards, and season-specific currency.
- **Recurring subscription packs:** a "Super Monthly Pass" ($24.99, renews
  indefinitely, always purchasable — distinct from time-limited event passes),
  plus weekly passes.
- **Hero Trial / Champion Duel / Queen's Revenge / Wanted Boss / Rampage
  Bosses:** rotating seasonal PvE/collection-adjacent events distinct from the
  main Doom League and Frontline Breakthrough content.
- **Cosmetics:** base "Decorations" (which double as minor stat buffs — not
  purely cosmetic) and premium visual skins, some priced $100–$500+.
- **Black Market, Honor Shop, Season Store, Hot Deals:** multiple parallel
  in-game shops for spending various earned/premium currencies.
- **Exploration Quest:** a side questline system referenced in guide indexes,
  distinct from the mainline chapter/task progression.
- **VIP system:** technically a progression system but functions largely as a
  monetization/side-track layer — permanent levels (up to 18) purchased with
  gems (earnable or bought), unlocking passive bonuses and account-wide perks.
- **Waterfall Training:** a named alliance-adjacent training feature referenced
  in guide indexes (exact mechanics unclear from available sources — flagged as
  an area with thin available documentation).

## 8. Early game (first session / first few days)

- **Tutorial framing:** the very first minutes are dominated by the
  **shooter/puzzle mini-game** — the same mechanic featured in UA ads — before
  the game "gradually unfolds" the deeper 4X base-building layer. Industry
  analysis (PocketGamer.biz, citing the Rivergame/First Fun UA strategy) states
  the onboarding deliberately spends "over 60% of the first 4–5 minutes of
  gameplay" on this action mini-game rather than base-building, explicitly to
  smooth the transition from the hyper-casual ad creative into the real game and
  avoid an early drop-off. A scripted narrator character walks new players
  through the puzzle missions before introducing building, resource management,
  and eventually map-based battles.
- **Chapter Progress missions:** the first tier of guided quests, teaching game
  basics while handing out resources, speedups, and a few free troops; once
  cleared they hand off to ongoing "Main Tasks."
- **Recommended first-24-hours player behavior** (per community guides, not
  official): complete tutorial quests for the large early resource payout, build
  the essential five (Headquarters, Farm, Lumberyard/equivalent, Iron Mine,
  Barracks), play 10–15 rounds of the shooter mini-game for XP/gold, and join a
  starter alliance to benefit from a new-player protection window.
- **7-day "marathon" event:** a first-week structure with three new task
  sections opening daily across the first five days, rewarding
  resources/XP/special items — a fairly standard mobile-SLG new-player retention
  funnel.
- **Reported onboarding retention:** industry analysis (Naavik) put Last War's
  D1 retention at 34% (vs. 42% for Whiteout Survival), suggesting the mismatch
  between ad creative and actual early gameplay does cost some early retention
  despite the deliberate onboarding pacing designed to bridge that gap.

## 9. Mid game

- Sustained play is driven by the always-keep-queues-full base-upgrade loop,
  layered with the game's dense rotating event calendar (multiple named alliance
  events and seasonal PvP events running concurrently — see §§ 5–7), so there is
  rarely a moment with "nothing to do."
- The **Season structure** (Pre-Season through at least Season 6 as of research)
  periodically introduces new mechanics, hero awakenings, gear tiers, and PvP
  event types (Rare Soil War, Goldust Conquest, Copper War, Trade Train, Faction
  Warfare & Altars), giving the mid-game a sense of periodic reinvention rather
  than a flat grind.
- Hero collection/gacha and the SSR→UR promotion path give a secondary,
  semi-independent progression axis alongside base/tech leveling — a common SLG
  technique for giving players something to chase even when building queues are
  saturated by time gates.
- Community guides consistently frame the mid-game as the point where players
  must commit to an alliance and to a squad-type specialization (e.g. "focus one
  troop type" rather than spreading thin), and where the gap between F2P and
  paying players starts to be strategically relevant (though not yet as stark as
  endgame).

## 10. Late/end game

- **Time-gating becomes the dominant mechanic:** reviewer/community consensus
  (Reddit summary via secondary source, player reviews) is that "nearly every
  action... is gated by a timer that quickly escalates to hours and then days,"
  which is precisely where paid speedups become load-bearing for competitive
  players.
- **Top-player activity:** large-scale coordinated alliance PvP — Alliance Wars,
  Server vs Server, Capital Conquest — plus continual power-score optimization
  (hero gear, awakening, drone leveling, VIP level) to stay competitive in
  rally/garrison combat.
- **Whale dominance:** multiple independent sources describe endgame competitive
  PvP as effectively decided by spend rather than skill/knowledge — one
  long-form player review states plainly that in top-level events "whale players
  dominate regardless of skill or knowledge," and that F2P spending "often means
  subsidizing the entertainment of those with nearly unlimited budgets" (citing
  an alleged ~$500,000 cumulative-spend "VIP 18" tier as an extreme data point).
- **Server lifecycle / "planned decay":** per the same long-term-player account,
  once a server locks into its Season structure, it can no longer be organically
  revitalized by new low-level players joining (a prior workaround under the old
  system), so servers gradually lose population as players quit or pay to
  transfer to newer/healthier servers, leaving late servers grinding down toward
  irrelevance. This is presented as the single most serious structural complaint
  from invested long-term players, more than any single monetization mechanic.
- **NAP-protected top alliances:** at the very top of a server's competitive
  ladder, informal or explicit non-aggression pacts between leading alliances
  can freeze meaningful PvP progress for everyone below them, per player
  accounts.
- **No stated "completion":** as an infinite live-service SLG, there is no
  defined ending; endgame is an open-ended power/rank treadmill bounded only by
  server population decline and the player's own spend ceiling.

## 11. Community sentiment

**On the ads specifically — the game's most talked-about characteristic:**

- The game is widely known as a "fake mobile game ad" case study: ads depict a
  hyper-casual, math/troop-merge or wire-cutting-style shooter that "has little
  to do with the actual base-building 4X game" (Naavik/Sensor Tower framing) —
  reviewers estimate the advertised content represents somewhere between "1%"
  and "20%" of actual playtime, depending on the source.
- The developers eventually leaned into the criticism rather than hide from it:
  the Q4 2024 Antony Starr (Homelander from _The Boys_) campaign directly joked
  about the gap, with the tagline **"It's called Last War. It's going viral
  because the developers made a real game based off the fake game in the ads."**
  Public reaction to the Starr ads themselves (per Forbes and social coverage)
  ranged from bafflement to memeification — commenters joked about "cheap
  Homelander laser VFX," questioned why an actor of his stature would take the
  role, and speculated the ads were AI-generated; per Sensor Tower's Creative
  Gallery data, the celebrity ads reportedly underperformed the original
  mini-game-style ads in impression share despite the press attention.
- The game also used Korean celebrities Shin Dong-yup and Joo Hyun-young in
  region-specific campaigns.

**On gameplay quality:**

- Player reviews are notably split. One long-form review (Ruthless Reviews) that
  played for weeks found the advertised action genuinely present in some form
  (the Frontline Breakthrough mode) and praised real strategic depth in squad
  composition ("There's real strategy in team composition and power management.
  Winning tough battles feels earned, not handed to you"), landing on a
  recommendation for players who like resource optimization over twitch
  reflexes.
- Other coverage is much harsher: a PlayScored review reportedly scored the ads
  a 2/10 and gameplay a 5/10, and ArcadePunks characterized the aggressive
  monetization plus bait-and-switch marketing as making the game "impossible to
  recommend enthusiastically."
- A recurring specific criticism (via secondary Reddit-sentiment summaries) is
  that heroes' voice lines feel AI-generated, contributing to what one review
  called a "manufactured feel rather than a handcrafted one," and that the game
  is mechanically near-identical to sibling/competitor titles (_Dark War
  Survival_, _Whiteout Survival_) sharing the same UI/mechanic DNA.

**On monetization:**

- Consistent, cross-source theme: aggressive pay-to-win pressure, especially at
  the top competitive tier. Reddit-sentiment summaries and player reviews
  repeatedly flag: escalating time-gates that push toward paid speedups, a gacha
  hero system where the best heroes are gated behind low-probability draws or
  premium currency, and a power gap between payers and F2P players described by
  one summary as "insurmountable" at the top end.
- App Store reviews (4.7★ average across ~448,000 ratings — a high score despite
  the criticism above, worth noting as a real signal of a satisfied broad base)
  skew positive in aggregate, with specific praise for the game being "super
  fun" especially with an active/supportive alliance, and multiple players
  reporting a genuinely enjoyable F2P or low-spend (<$10) experience. Complaints
  clustered on: unresponsive customer support (in-game ticketing and email both
  cited as going unanswered), lag on older devices, high battery drain, and a
  sentiment that "developers no longer care about players" once big spenders are
  secured.

**On the social/alliance layer:**

- This is the most consistently praised system across sources — reviewers and
  community summaries alike single out alliance cooperation, politics, and
  territorial rivalry as the game's most genuine, least-manufactured source of
  engagement, distinct from (and, some argue, better than) the
  base-building/gacha layers underneath it.

**On the business/marketing story more broadly:**

- Industry press (PocketGamer.biz, Naavik, gamemakers.com) treats Last War less
  as a game-design case study and more as a **user-acquisition and monetization
  case study**: the "hide the 4X layer behind hypercasual ad creative" strategy
  is widely cited as a genre-redefining (if ethically contested) UA innovation,
  credited with pulling much broader, less "hardcore-strategy-gamer" audiences
  into the 4X genre at scale, at some real cost to long-term retention (D30
  retention ~4% vs. Whiteout Survival's ~8%, per Naavik's Sensor Tower-sourced
  analysis) relative to slower-growing competitors.

## 12. Sources

- [Last War: Survival Game — Wikipedia](https://en.wikipedia.org/wiki/Last_War:_Survival_Game)
- [Last War:Survival — App Store (Apple)](https://apps.apple.com/us/app/last-war-survival/id6448786147)
- [Last War:Survival Game — Google Play](https://play.google.com/store/apps/details?id=com.fun.lastwar.gp&hl=en_US)
- [Last War:Survival — AppMagic data overview](https://appmagic.rocks/google-play/last-war-survival-game/com.fun.lastwar.gp)
- [Why Last War Is Winning the 4X Game — Naavik](https://naavik.co/digest/how-last-war-is-winning-the-4x-game/)
- [Cracking the 4X Code: First Fun and RiverGame's Billion-Dollar Strategy — gamemakers.com](https://www.gamemakers.com/p/cracking-the-4x-code-first-fun-and)
- [Game Analysis: Exploring Rivergame's Last War UA scaling strategy — PocketGamer.biz](https://www.pocketgamer.biz/game-analysis-exploring-rivergames-last-war-ua-scaling-strategy/)
- [Last War: Survival surpasses $2bn after record player spending in early 2025 — PocketGamer.biz](https://www.pocketgamer.biz/last-war-survival-surpasses-2bn-after-record-player-spending-in-early-2025/)
- [Last War: Survival Revenue & Player Count Statistics — Udonis blog](https://www.blog.udonis.co/statistics/last-war-survival)
- [Last War Survival: The Secrets Behind Its $2.6 Billion Revenue — MAF](https://maf.ad/en/blog/last-war-survival/)
- [AppMagic: Top Mobile Games by Revenue and Downloads (multiple monthly editions) — gamedevreports.substack.com](https://gamedevreports.substack.com/p/appmagic-top-mobile-games-by-revenue-738)
- [Antony Starr's 'Fake Mobile Game' Adverts, Explained — Forbes](https://www.forbes.com/sites/callumbooth/2024/10/24/anthony-starrs-fake-mobile-game-adverts-explained/)
- [Last War: Survival — Thoughts After Half a Year Playing It (long-form player review) — GitHub Gist](https://gist.github.com/Adachi91/60a458ec3fbf542be5ec6cada0c41e7e)
- [Last War Survival Game Review: My Honest Take After Playing for Weeks — Ruthless Reviews](https://www.ruthlessreviews.com/featured-posts/last-war-survival-game-review-my-honest-take-after-playing-for-weeks/)
- [Is Last War: Survival a Real Game? Complete Analysis — ArcadePunks](https://www.arcadepunks.com/is-last-war-survival-a-real-game-complete-analysis/)
- [Last War: Survival Review: Ads vs. Reality — PlayScored](https://playscored.com/review/last-war-survival-review)
- [Last War Survival Game Reddit: An Honest Review — Tenteck](https://tenteck.com/last-war-survival-game-reddit-review/)
- [How Does Last War: Survival Game Make Huge Profits? — FoxAdvert](https://foxadvert.com/en/digital-marketing-blog/how-does-last-war-survival-game-make-huge-profits-despite-half-of-its-ratings-being-1star/)
- [Last War: Survival Guides & Strategies — Last War Vault](https://lastwarvault.com/guides/)
- [Last War Alliance War Mastery — Last War Handbook](https://lastwarhandbook.com/guides/alliance-war-mastery)
- [Last War Frontline Breakthrough Guide — buffbuff.com](https://buffbuff.com/blog/last-war-frontline-breakthrough-guide)
- [Frontline Breakthrough Event Guide — lastwargame.online](https://www.lastwargame.online/en/frontline-breakthrough-event/)
- [Hero Guide for Last War: Survival Game — BlueStacks](https://www.bluestacks.com/blog/game-guides/last-warsurvival-game/lws-heroes-guide-en.html)
- [11 Proven Ways to Gain Power Fast in Last War Survival — MedievalFun](https://medievalfun.com/last-war-survival-game-how-to-increase-power-fast/)
- [7 Buildings to Prioritize Early in Last War Survival — MedievalFun](https://medievalfun.com/important-buildings-in-last-war-survival-game/)
- [Last War Tech Tree Research Guide — ldshop.gg](https://www.ldshop.gg/blog/last-war-survival/last-war-tech-tree-research-guide.html)
- [Last War VIP Guide: All 18 Levels, Benefits & Best Strategy — ldshop.gg](https://www.ldshop.gg/blog/last-war-survival/last-war-vip-guide.html)
- [Last War Season Passes Buying Guide — ldshop.gg](https://www.ldshop.gg/blog/last-war-survival/season-passes-buying-guide.html)
- [Server Merge & Migration Guide — Last War Vault](https://lastwarvault.com/guides/general/server-merge-migration-guide/)
- [Last War: Survival Transfer Surge Guide — topuplist.com](https://topuplist.com/blogs/detail/last-war-survival-transfer-surge-guide)
- [Last War: The best beginner strategy for your first 24 hours — MedievalFun](https://medievalfun.com/last-war-the-beginner-strategy-for-your-first-24-hours/)
- [Your First 24 Hours in Last War: Survival — Last War Vault](https://lastwarvault.com/guides/general/first-24-hours-guide/)

**Note on access limitations:** Reddit (r/LastWarMobileGame and reddit.com
generally) and the Last War Fandom wiki could not be fetched directly in this
research session (blocked/paywalled responses from both), so subreddit and
wiki-sourced sentiment above is drawn from secondary sources (Tenteck's
Reddit-sentiment roundup, FoxAdvert) that explicitly summarize/quote Reddit
discussion rather than from primary thread access. This is flagged as a real
coverage gap — a follow-up pass with direct Reddit/Fandom access would
strengthen §11 in particular.
