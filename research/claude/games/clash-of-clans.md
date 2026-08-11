# Clash of Clans

## 1. Overview

- **Genre:** Base-building strategy / asynchronous PvP village-attack game.
  Widely regarded as the genre's root ancestor for the entire mobile
  "base-building + async raid" category that later spawned the survival-SLG
  wave.
- **Developer/Publisher:** Supercell (Finnish studio, founded 2010;
  majority-owned by Tencent since 2016).
- **Release date:** Soft-launched 2012, global iOS launch August 2, 2012;
  Android launch October 7, 2013. As of this research (August 2026) the game is
  14 years old and still receiving monthly content updates.
- **Platforms:** iOS and Android (mobile-only; no official PC/console client,
  though it's playable on Google Play Games for PC and via Mac App Store as a
  "Mac" listing).
- **Scale:** One of the highest-grossing mobile games ever made — lifetime
  revenue is estimated at roughly
  **$5.9 billion** since launch (Business of Apps / Udonis, 2026 figures), with a peak year of **$1.36
  billion in 2015**
  (~~$5.5M/day at its height). Total installs are estimated around **888 million**. Recent (2025) monthly revenue has settled to roughly **$25–29M/month**
  (~~$280–320M annualized run rate), and the game reports an average of **~21.5
  million monthly active players**. It remains one of a small handful of mobile
  titles to have crossed both 500M+ downloads and $1B+ in a single year.
- **Monetization model:** Free-to-play with in-app purchases. Purchases are
  almost entirely **Gems** (the premium currency, sold in packs from roughly
  $0.99–$19.99+) used to speed up timers, instant-finish builds/training, or buy
  resources directly, plus a monthly **Gold Pass** subscription (~$4.99–$6.99)
  that adds a second progression track with bonus rewards. There is no
  loot-box/gacha purchase mechanic anywhere in the monetization — nothing is
  randomized-pull for real money.

## 2. Core gameplay loop

A typical CoC session: check the Home Village for finished timers (upgrades,
troop training, hero regeneration) → queue new building upgrades and troop
production → spend accumulated troops on a small number of attacks (search for a
matchmade opponent base or a Clan War target, deploy an army in a single
continuous real-time skirmish lasting up to 3 minutes, collect stars/loot) →
check Clan chat, donate/request troops → log off and let timers run in the
background (often for many real-world hours) → repeat. There is also a lighter
secondary loop around the Clan Capital (weekend raid weekends) and Builder Base
(a parallel, smaller base with its own separate progression and 1v1 "Versus
Battle" matchmaking).

**Structural contrasts with the survival-SLG loop already documented for this
project:**

- **No mandatory alliance/tech research tree.** There is no shared "Alliance
  Technology" or clan-wide tech tree players must feed resources into to unlock
  personal power — Clash's only clan-scale investment is the separate, opt-in
  Clan Capital mode and Clan Games (both bonus content, not gates on base
  progression).
- **No chapter/quest-driven tutorial funnel.** Progression is Town-Hall-gated
  (see §3) rather than delivered through a linear numbered quest chain with
  escalating scripted objectives; early guidance comes from a short scripted
  intro and "Achievements," not a chaptered main-quest UI.
- **No hero-gacha pulls, no VIP subscription ladder, no dozens of concurrent
  bolted-on subsystems.** The entire game surface is a handful of named systems:
  Home Village, Builder Base, Clan Capital, Clan Wars/War Leagues, Clan Games,
  Season Challenges, Gold Pass, Events. There is nothing resembling a "daily
  login calendar with 10 simultaneous currencies" structure.
- **Attacks are short, skill-expressive, real-time sessions**, not a
  stat-comparison auto-battle — the player manually places troops and spells
  during the raid, so an attack is an active few-minutes-long play session
  rather than an instant resolved-in-the-background result.
- **A single persistent base**, not an expanding empire of multiple settlements
  — all building happens on one Home Village plot per Town Hall (plus the
  separate Builder Base plot), rather than a state/zone map of many owned tiles.

## 3. Base building & progression systems

- **Town Hall gating is the spine of all progression.** The Town Hall (TH)
  building's level caps what every other building, troop, spell, hero, and trap
  can be upgraded to. As of this research the max Town Hall is **TH18**
  (released November 17, 2025; TH17 released ~November 2024, so Supercell has
  shipped a new Town Hall roughly annually in recent years). Each new Town Hall
  level typically adds one or two new defense buildings, a new trap, new
  troop/spell levels, higher caps on existing buildings, and (periodically) a
  new troop, hero, or pet.
- **No hero gacha.** Heroes are earned through base progression, not randomized
  pulls, purchased packs, or any currency-for-random-unit mechanic. As of 2026
  there are **six named Heroes**, each unlocked once by reaching its required
  Town Hall and building its housing structure, then leveled up individually
  with resources (Elixir or Dark Elixir) and time, capped by a dedicated **Hero
  Hall** building:
  - **Barbarian King** — unlocked at TH7 (melee, Dark Elixir)
  - **Archer Queen** — unlocked at TH9 (ranged, Dark Elixir)
  - **Minion Prince** — unlocked at TH9 (flexible support hero)
  - **Grand Warden** — unlocked at TH11 (army-wide aura support, Elixir)
  - **Royal Champion** — unlocked at TH13 (defense-targeting, Dark Elixir)
  - **Dragon Duke** — the newest hero, unlocked at TH15, added February/March
    2026 (aerial fighter)
  - The Hero Hall caps every hero's level by its own level (1 at TH7 rising to a
    hard cap around level 11–12 at TH18), and only **4 of the 6 heroes can be
    active/deployed at once** — a slot-management choice, not a collection-size
    flex. Heroes also regenerate (heal) over real time after being used,
    encouraging players not to spam them recklessly.
  - **Hero Equipment**, added in 2024, is the closest thing to an "item" system:
    Common Equipment (up to level 18) unlocks by upgrading the **Blacksmith**
    (TH8+); Epic Equipment (up to level 27) is earned from special events. All
    equipment upgrades are deterministic and instant once you hold enough
    **Ore** (a dedicated currency earned via Clan Wars, star bonuses, and the
    Trader) — there is no randomized pull for equipment either.
- **Buildings/defenses** upgrade individually with Gold/Elixir and real-time
  timers (minutes at low levels, multiple days at high levels); walls upgrade
  with Gold and are famously the single biggest late-game Gold sink.
- **Troop tiers:** the Barracks unlocks progressively more troop types as it's
  upgraded (roughly 19 troops trainable via the standard Barracks, plus Dark
  Elixir troops via the separate Dark Barracks, plus event-exclusive troops);
  the **Laboratory** (max level 15 as of TH17/18) is the sole place
  troop/spell/siege-machine _levels_ (not new unlocks) are researched, gated by
  both Lab level and Town Hall.
- **Pets** (unlocked via a Pet House, capped similarly to Hero Hall) are a
  smaller companion-creature system layered onto Heroes — again no
  randomization, straightforward unlock-then-upgrade.
- **Builder Base** is an actively maintained parallel mode with its own
  Town-Hall-equivalent ("Builder Hall"), its own building roster, its own 1v1
  asynchronous "Versus Battle" matchmaking, and its own currencies. A major 2026
  rework (sometimes called "Builder Base 2.0" in community coverage) lowered its
  unlock threshold from TH6 to **TH4** and added a second Builder, making it
  more accessible earlier — indicating Supercell still actively invests in it
  rather than treating it as legacy content.

## 4. Resource economy

- **Gold** and **Elixir** — the two primary resources, produced passively over
  time by Gold Mines/Elixir Collectors and stored in Gold Storages/Elixir
  Storages; used for most building upgrades and (Elixir) troop training.
- **Dark Elixir** — a slower, smaller-volume resource (produced by Dark Elixir
  Drills, unlocked around TH7) used specifically for Heroes and Dark Elixir
  troops — a deliberately scarcer, higher-value resource tier gating the game's
  strongest late units.
- **Gems** — the premium currency; earned slowly through achievements,
  obstacle-clearing, and events, or purchased directly. Spent on
  instant-finishing timers, buying Gold/Elixir/Dark Elixir directly, or
  Builder/Season boosts.
- **Capital Gold** — a separate currency exclusive to the Clan Capital sub-mode,
  capped at 25,000 per player in storage, earned via the daily Forge and weekend
  Capital Raids, spent only on Capital Peak district upgrades.
- **The "Town Hall sniping" / loot-protection mechanic (the genre's foundational
  anti-farming design):** resources sitting in the Town Hall itself, once the TH
  is destroyed, only ever yield roughly **10% of what's stored there** to the
  attacker — deliberately not the full village storage. On top of that, an
  **attacker-vs-defender Town Hall level differential** scales all available
  loot: attacking a base 4 TH levels below yields only ~5% of its available
  loot, 3 levels below ~25%, 2 levels below ~50%, 1 level below ~90%, same level
  100%, and attacking _up_ a level grants a 110% bonus. This system was
  explicitly designed to discourage high-level players from farming far-weaker
  bases ("bullying") and to keep matchmaking loot meaningful at every tier — a
  mechanic frequently cited in press/community retrospectives as one of Clash's
  most influential design contributions to the genre.
- **Spend sinks:** building/defense upgrades (the dominant sink at every stage),
  Wall upgrades (the single largest late-game Gold sink by a wide margin),
  troop/spell/siege-machine training and research, Hero/Pet leveling (Dark
  Elixir), and Hero Equipment (Ore).

## 5. Combat systems

- **PvE — Single Player Campaign ("Goblin Map"):** a fixed set of roughly 90
  preset NPC ("Goblin") village levels, each attackable for up to 3 stars, for a
  total possible 270 stars; used mainly as a risk-free army-testing ground and
  an early-game resource/gem source rather than an ongoing endgame activity. A
  separate seasonal "Goblin Map" event periodically resurfaces this content with
  bonus rewards.
- **PvP — the defining asynchronous attack/defense loop:** players design a
  static base layout that sits undefended while they're offline; other players'
  matchmaking search finds that saved layout and attacks it in a single
  real-time raid (deploy troops/spells/heroes, watch the AI-defended base
  respond automatically, resolve after ~3 minutes or full destruction). The
  defender is never present live — defense is entirely a base-design
  ("base-building-as-metagame") exercise, not a controlled unit. Attackers earn
  Stars (1–3, based on percentage destruction and Town Hall capture) and loot;
  defenders can view replays of attacks against them afterward and can
  retaliate.
- **Trophy pushing / ranking:** trophies are won/lost on attack outcomes and
  used to place players into Leagues (Bronze up through Legend League
  historically). A major **September 2025 overhaul removed trophies from normal
  multiplayer entirely**, splitting PvP into two modes: **Battle Mode**
  (unlimited attacks, Town-Hall-based matchmaking, no trophies, casual
  farming-focused) and **Ranked Battles** (unlocked at TH7, only 6 attacks/week,
  trophy- and league-based matchmaking, seasonal reset to 5,000 trophies at the
  top). This was a direct response to long-standing community complaints about
  forced league promotion, trophy-dropping exploits, and the lack of a permanent
  farming mode at the Legend League tier.
- **Base-design-as-metagame:** because defense is fully passive, a large portion
  of the skill expression and community content (YouTube "base reviews,"
  layout-sharing sites, war-base vs. trophy-base vs. farming-base archetypes)
  revolves around designing defensive layouts, not just attacking — a structural
  feature fairly unique to this asynchronous-defense model.
- **Builder Base** runs a parallel, simplified version of the same asynchronous
  attack/defense loop with its own troop roster and a single unified Versus
  Trophy ranking.

## 6. Alliance/social systems

- The in-game term is **Clan** (not "Alliance") — up to 50 members, led by a
  Leader with Co-Leader/Elder/Member ranks.
- **Clan Wars:** two clans (matched by overall strength) each field up to 50
  members; every member gets **2 attacks** against a mirrored opposing base
  during a fixed war window (1-day prep day + 1-day battle day); stars and
  destruction percentage from members' best attacks sum to decide the winner.
- **Clan War Leagues (CWL):** a monthly, promotion/relegation seasonal league
  structure where clans are grouped into divisions and fight a condensed round
  of wars (1 attack/day across ~7 days) against different opponents for
  league-tier rewards — the more competitive, higher-stakes war format layered
  on top of regular Clan Wars.
- **Clan Games:** a periodic (roughly monthly) clan-wide points event where
  members complete individual challenge tasks (not attacks against other
  players) to fill a shared clan point pool for tiered reward chests — the
  closest thing to a "clan-wide cooperative goal," but scoped as a temporary
  event rather than a permanent tech tree.
- **Clan Capital:** a separate, persistent shared base the whole clan
  collectively upgrades using Capital Gold, explored via weekend **Capital
  Raids** (attacking rival clans' Capital districts) — unlocked once the clan
  hits level 2 and the player is at least TH6.
- **Donations:** members can request troops/spells/siege machines via clan chat
  (a request cooldown of ~10 minutes, up to 6 troops donated per request by
  default, extendable via a Donation Limit clan perk) and donate to each other;
  a "Quick Donate" option lets a player instantly fill a request for a flat
  1-Gem cost regardless of the troop's normal training cost.
- **Chat:** clans have a persistent private chat channel (message history
  visible even before joining), used for donation requests, war coordination,
  and general socializing; there's no cross-clan global chat.
- **Explicitly absent (by contrast with the survival-SLG genre):** no clan-wide
  research/tech tree that gates individual player power, no VIP/subscription
  ladder tied to social rank, no mandatory alliance quest chains.

## 7. Additional/side features

Kept deliberately separate from the core loop (§2) because — in sharp contrast
to the survival-SLG genre's dozens of concurrently bolted-on systems — this is
close to the _entire_ additional-feature list for Clash of Clans:

- **Seasonal Events / Season Challenges:** each roughly month-long season has a
  themed reskin (cosmetic obstacles/decorations) and a two-tier Season Challenge
  track — a **free tier** open to everyone and a **paid Gold tier** (bundled
  with the Gold Pass) offering substantially better rewards for completing the
  same challenges.
- **Gold Pass:** the game's battle-pass equivalent (~$4.99–$6.99/month). Grants
  a Builder Boost (faster Builder Base crafting), a season-long loot boost (up
  to +20% loot from battles), and the paid Gold-tier Season Challenge rewards.
  Notably this is a flat-fee monthly pass, not a gacha or loot-box mechanic.
- **Collection systems:** cosmetic **Hero Skins** (over 50 as of 2026, purchased
  or earned via events — cosmetic only, no gameplay effect) and **Sceneries**
  (village backdrop cosmetics) — a pure vanity/collection layer with zero stat
  impact.
- **Friendly Challenges / Friendly Wars:** informal, no-stakes practice attacks
  against clanmates for testing strategies, watchable live or via replay.
- **Practice Mode:** a risk-free sandbox for testing attack strategies against
  AI-controlled versions of real bases.
- **Esports:** an official competitive scene since 2019 with organized
  tournaments and prize pools — cited by industry retrospectives as a longevity
  factor extending the game's audience beyond casual players.
- **No VIP ladder, no separate premium subscription tier beyond Gold Pass, no
  dozens of overlapping timed-currency systems** — the side-feature surface area
  is notably small and stable release-over-release compared to the survival-SLG
  genre's typical feature sprawl.

## 8. Early game (first session / first few days)

Onboarding is a short scripted sequence (attack a tutorial goblin base, place
your first buildings) followed almost immediately by open-ended play — there is
no multi-hour chaptered main-quest funnel. Early Town Hall levels (1–3) have
short timers (seconds to minutes), so new players cycle through several building
upgrades and Single Player Campaign attacks in a single sitting, quickly
unlocking their first Clan join, first troop types, and (by TH7) their first
Hero. Guidance leans on an Achievements list (which also grants meaningful early
Gems) rather than a directed quest chain. Builder Base's 2026 accessibility
rework (TH4 unlock) specifically targets giving new/early players a second,
lower-stakes progression track sooner.

## 9. Mid game

Once the tutorial-adjacent early Town Halls are behind a player (roughly
TH7–TH12), the sustaining loop becomes managing multiple concurrent long-running
timers (building upgrades, Lab research, Hero leveling), joining a war-active
Clan for regular Clan Wars/CWL participation, refining a base layout for both
farming and war defense, and balancing "farming" (accumulating Gold/Elixir/Dark
Elixir via attacks) against upgrade costs that grow steeply each Town Hall.
Ranked Battles (post-2025 overhaul) give a structured weekly competitive outlet
without needing to grind constant attacks, while Battle Mode remains available
for unlimited casual farming. Clan Capital's weekend Raid Weekends and monthly
Clan Games provide recurring bounded-time group activities layered on top.

## 10. Late/end game

Unlike the survival-SLG genre's typically open-ended power creep, Clash of Clans
has a **comparatively finite, closable building/hero roster per Town Hall era**
— a maxed TH18 base with every building, wall, troop, spell, hero, and pet at
cap is an achievable, well-defined state, and "max TH[current]" is a recognized
community milestone (there are entire guide sites — e.g. Clash Guides With Dusk,
TrophyCoach — dedicated to "max levels lists" per Town Hall). That said, the
ceiling keeps moving: Supercell has shipped a new Town Hall roughly annually in
recent years (TH16 → TH17 ~Nov 2024 → TH18 Nov 2025), so a "finished" max base
is finished only until the next Town Hall update resets the ceiling — genuinely
closable in the short term, but not permanently. Endgame activity for
maxed/near-maxed players centers on Ranked Battles/Legend League competitive
climbing, leading or participating in high-tier Clan Wars/CWL, refining base
layouts (an ongoing metagame independent of raw levels), and the Clan Capital's
endless district-upgrade ladder, which — unlike the Home Village — has more room
to keep growing since it's clan-scale and collectively funded.

## 11. Community sentiment

- **Reddit (r/ClashOfClans):** direct fetch of reddit.com failed again in this
  research session (consistent with prior sessions on this project — WebFetch
  cannot reach reddit.com), so subreddit sentiment below is drawn from secondary
  press coverage (Sportskeeda, esports.net, etc.) that references community
  reaction rather than primary quotes.
- **Recurring praise (via press coverage and app store framing):** the game's
  longevity itself is treated as a point of pride/nostalgia by long-time players
  (10th/12th-anniversary retrospective coverage frames it as unusually "sticky"
  for a mobile title); the September 2025 Ranked/Battle Mode split was reported
  as a positive response to years of community pressure around forced league
  promotion, trophy-dropping, and the lack of a stable Legend League farming
  mode.
- **Recurring complaints:**
  - **Pay-to-win debate is active and split.** Some community voices call the
    game "completely pay to win," citing spenders progressing 3–5x faster and
    grievances that new Hero Equipment releases increasingly favor paying
    players; other reviewers push back, arguing spending buys convenience/speed
    rather than power a free player categorically cannot reach, and note the
    game is comparatively generous with free Gems from
    achievements/obstacle-clearing.
  - **Balance-update backlash:** a June 2024 balance pass (Hog Riders, Bowlers,
    etc.) and later nerfs (Gauntlet, Ice Arrow, Healing Tome equipment in a 2025
    update) both drew notable community frustration, with one Sportskeeda piece
    characterizing sentiment as "game over for F2P players."
  - **Matchmaking/trophy frustration** (pre-Ranked-Mode-split): community and
    even Supercell's own forums (`forum.supercell.com` thread "Clash of Clans
    Matchmaking and Trophy System Is UNFAIR") documented long-standing
    complaints that climbing leagues meant facing disproportionately
    higher-Town-Hall opponents, and that Legend League offered no true unlimited
    farming mode — directly motivating the 2025 rework.
  - Common Sense Media and general app-review coverage flag **social-safety
    concerns around open clan chat** (potential for inappropriate interactions
    between players, including minors) and note the game's **addictive,
    timer-driven design** as a recurring critical theme in parental/reviewer
    commentary.
- **App Store standing:** 4.8/5 stars across roughly 2.8 million ratings on the
  iOS App Store, with an Editors' Choice award — a strong aggregate score
  despite the pay-to-win debate playing out in written reviews and community
  threads.
- **YouTube ecosystem:** a large, well-established creator community exists
  around the game. Confirmed creators researched here: **Judo Sloth Gaming**
  (Andrew, UK-based, ~1.54M subscribers — tutorials, troop/Hero-Skin explainers,
  update sneak peeks, "let's play" content) and **Galadon Gaming** (US-based,
  ~1.92M subscribers — broader gaming channel with strategy/guide content
  covering Clash and other titles). "Clash with Eric – OneHive" is referenced in
  secondary listicles (e.g. Sportskeeda's "Top 5 Clash of Clans YouTubers") as a
  recognized guide/strategy creator, though this research could not
  independently verify subscriber counts or channel specifics beyond that
  listicle mention.

## 12. Sources

- [Clash of Clans - App Store (Apple)](https://apps.apple.com/us/app/clash-of-clans/id529479190)
- [Clash of Clans – Apps on Google Play](https://play.google.com/store/apps/details?id=com.supercell.clashofclans&hl=en_US)
- [Clash of Clans Player Count, Revenue & Stats (2026) — Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/clash-of-clans-player-count)
- [Clash of Clans Revenue And Usage Statistics (2026) — Business of Apps](https://www.businessofapps.com/data/clash-of-clans-statistics/)
- [Supercell Revenue by Year (2015–2026) — Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/supercell)
- [Town Hall/Unlocks — Clash of Clans Wiki (Fandom)](https://clashofclans.fandom.com/wiki/Town_Hall/Unlocks)
  (linked via search; direct fandom.com fetch returned HTTP 402 in this session)
- [Barbarian King — Clash of Clans Wiki (Fandom)](https://clashofclans.fandom.com/wiki/Barbarian_King)
- [Archer Queen — Clash of Clans Wiki (Fandom)](https://clashofclans.fandom.com/wiki/Archer_Queen)
- [Hero Hall — Clash of Clans Wiki (Fandom)](https://clashofclans.fandom.com/wiki/Hero_Hall)
- [Hero Hall in Clash of Clans Explained — TrophyCoach](https://trophycoach.com/clash-of-clans/guides/hero-hall-explained)
- [Which Hero to Upgrade First in Clash of Clans (2026) — TrophyCoach](https://trophycoach.com/clash-of-clans/guides/hero-upgrade-order)
- [Dragon Duke — Clash of Clans Wiki (Fandom)](https://clashofclans.fandom.com/wiki/Dragon_Duke)
- [Minion Prince — Clash of Clans Wiki (Fandom)](https://clashofclans.fandom.com/wiki/Minion_Prince)
- [Hero Equipment — Introducing Hero Equipment (Supercell blog)](https://supercell.com/en/games/clashofclans/blog/news/introducing-hero-equipment/)
- [Blacksmith — Clash of Clans Wiki (Fandom)](https://clashofclans.fandom.com/wiki/Blacksmith)
- [The Blacksmith: Hero Equipment & Ore — Supercell Support Portal](https://ingame.support.supercell.com/clash-of-clans/en/articles/hero-equipment-ore-4.html)
- [Clash of Clans Loot Penalty Explained — Clash for Dummies](https://clashfordummies.com/2015/06/04/clash-of-clans-loot-penalty-explained/)
- [Clash of Clans Available Loot Calculator — Pixel Crux](https://pixelcrux.com/Clash_of_Clans/Available_Loot/Calculator)
- [Clash of Clans September 2025 update: Removal of trophies, new attack modes — Sportskeeda](https://www.sportskeeda.com/mobile-games/clash-clans-september-2025-update-removal-trophies-new-attack-modes-and-more)
- [Supercell introduces Clash of Clans Ranked mode — Sportskeeda](https://www.sportskeeda.com/mobile-games/supercell-introduces-clash-clans-ranked-mode-major-matchmaking-trophy-overhaul-explained)
- [Battle and Ranked Modes Are Coming To Clash! — Supercell blog](https://supercell.com/en/games/clashofclans/blog/news/battle-and-ranked-modes-are-coming-to-clash-/)
- [Clash of Clans Matchmaking and Trophy System Is UNFAIR — Supercell forum](https://forum.supercell.com/showthread.php/1886887-Clash-of-Clans-Matchmaking-and-Trophy-System-Is-UNFAIR)
- [Clash of Clans Town Hall 17 Guide — Gaming on Phone](https://gamingonphone.com/guides/clash-of-clans-town-hall-17-guide-upgrade-priorities-best-bases-attack-strategies-tips/)
- [THE TOWN HALL 17 UPDATE IS HERE! — Supercell blog](https://supercell.com/en/games/clashofclans/blog/game-updates/the-town-hall-17-update-is-here-2/)
- [Everything You Need To Know About TH18 Update — AllClash](https://www.allclash.com/everything-you-need-to-know-about-th18-update/)
- [What is Builder Base in Clash of Clans? 2026 Guide — CoC Strategies Hub](https://www.cocstrategieshub.com/what-is-builder-base-in-clash-of-clans)
- [Clan Capital Full Release Notes — Supercell blog](https://supercell.com/en/games/clashofclans/blog/release-notes/clancapital-releasenotes/)
- [Clash of Clans: The Complete Clan Capital Guide and Tips — Gaming on Phone](https://gamingonphone.com/guides/clash-of-clans-clan-capital-the-complete-guide/)
- [Clash of Clans Clans Guide: Ranks, Donations & Perks Explained — Skycoach](https://skycoach.gg/blog/clash-of-clans/articles/clans-guide)
- [How To Donate Troops In Clash of Clans — 1v9](https://1v9.gg/blog/clash-of-clans-coc-how-to-donate-troops-guide)
- [Single Player Campaign Guide for Clash of Clans — IGV blog](https://blog.igv.com/solo-clash-of-clans-campaign-guide/)
- [Army Camp — Clash of Clans Wiki (Fandom)](https://clashofclans.fandom.com/wiki/Army_Camp)
- [Barracks — Clash of Clans Wiki (Fandom)](https://clashofclans.fandom.com/wiki/Barracks)
- [Clash of Clans Troop Tier List August 2026 — Skycoach](https://skycoach.gg/blog/clash-of-clans/articles/troop-tier-list)
- [Looking back on 10 years of Clash of Clans — Game Developer](https://www.gamedeveloper.com/game-platforms/looking-back-on-10-years-of-clash-of-clans)
- [Clash of Clans is celebrating 10 years with an exaggerated retrospective — GameSpot](https://www.gamespot.com/articles/clash-of-clans-is-celebrating-10-years-with-an-exaggerated-retrospective/1100-6506068/)
- [Clash of Clans has turned 12 years old today — esports.net](https://www.esports.net/news/mobile-games/clash-of-clans-12-years-old/)
- [How Clash of Clans Has Thrived for 12 Years? — FoxData](https://foxdata.com/en/blogs/how-clash-of-clans-has-thrived-for-12-years/)
- [A Look at the Evolution of Mobile Strategy Games — Back2Gaming](https://www.back2gaming.com/features/look-evolution-mobile-strategy-games/)
- [Is Clash of Clans Pay-to-Win? F2P vs P2W Breakdown — esports.net](https://www.esports.net/news/mobile-games/is-clash-of-clans-pay-to-win/)
- [Clash of Clans App Review — Common Sense Media](https://www.commonsensemedia.org/app-reviews/clash-of-clans)
- ["Game over for F2P players": Clash of Clans community unhappy with latest balance updates — Sportskeeda](https://sportskeeda.com/esports/game-f2p-players-clash-clans-community-unhappy-latest-balance-updates)
- [70 Clash of Clans YouTubers You Must Follow in 2026 — Feedspot](https://videos.feedspot.com/clash_of_clans_youtube_channels/)
- [Judo Sloth Gaming — YouTube](https://www.youtube.com/@JudoSloth/videos)
- [Judo Sloth — Clash of Clans Wiki (Fandom)](https://clashofclans.fandom.com/wiki/Judo_Sloth)
- [Top 5 Clash of Clans YouTubers — Sportskeeda](https://www.sportskeeda.com/esports/top-5-clash-clans-youtubers)

**Note on access limitations:** `reddit.com` was unreachable via WebFetch in
this session (consistent with prior sessions on this project), so subreddit
sentiment is sourced secondhand through press coverage that references community
reaction rather than direct post quotations. The Clash of Clans Fandom wiki
(`clashofclans.fandom.com`) also returned HTTP 402 (Payment Required) on every
direct WebFetch attempt in this session; wiki-sourced facts above were instead
reconstructed from WebSearch result snippets that quoted or summarized wiki
pages, and from third-party guide sites that mirror wiki data (TrophyCoach,
GamingOnPhone, Skycoach, Clasher.us, etc.). YouTube was not directly fetchable
either; creator information comes from channel-listing/aggregator pages
(Feedspot, Sportskeeda) rather than the channels themselves.
