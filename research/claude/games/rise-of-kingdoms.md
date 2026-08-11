# Rise of Kingdoms — Competitive Research

## 1. Overview

- **Genre:** Historical 4X grand-strategy MMO ("MMORTS") — real-time base
  building, civilization selection, and a persistent shared-world of PvE and
  PvP. Often described (including by third-party analysts) as "Age of Empires,
  but where diplomacy, politics, and your relationships actually matter."
- **Developer/Publisher:** Lilith Games (also known for AFK Arena).
- **Release date:** May 24, 2018 (iOS/Android, worldwide). A native
  Windows/macOS PC client followed April 6, 2022.
- **Platforms:** iOS, Android, PC.
- **Scale:** One of the most successful SLGs ever made. Cumulative global
  revenue has passed **$3.5 billion** (Sensor Tower, via Mobidictum); an earlier
  Udonis analysis put it at "more than $2 billion all-time" and "more than
  $20 million/month" in steady-state revenue years after launch.
  Google Play shows 50M+ downloads; Lilith has claimed 100M+ cumulative
  players (as of Dec 2023, per Wikipedia). Sensor Tower's 2025 US snapshots
  still show real live volume for a 7+ year old game — up to ~$1M/quarter in US
  revenue in single weeks, ~31K downloads/week, and up to ~230K weekly active US
  users in a quarter (Q2 2025) — evidence of a durable long tail, not just
  launch-era revenue.
- **Monetization:** Free-to-play with heavy IAP. Premium currency is **Gems**
  (~2,000 gems ≈ $10), which buy VIP Points (1 gem = 1 VIP point), Wheel of
  Fortune gacha pulls for commander sculptures, speedups, and SVIP shop
  discounts. Tiered packs: a $0.99 first-recharge hook, $4.99–$14.99 bundles,
  gem packs up to $99.99, a $9.99/month gem subscription, a VIP-5+-gated
  one-time $14.99 "Growth Fund," and a two-tier
  battle-pass-style "Lucerne Scrolls" ($4.99/$19.99 per season). Press reviewers
  were hostile to the monetization from the start (MMOHuts: 2/5, "greedy for the
  sake of greed"; Arkansas Democrat-Gazette: 4/10, "if you want to be the
  strongest governor, all it really takes is a credit card with a high limit")
  even as the game became one of mobile's highest-grossing strategy titles.

## 2. Core gameplay loop

A session braids four concurrent threads rather than one clean loop:

1. **Manage the city** — check build/research/troop-training queues, claim idle
   rewards, spend accumulated resources on the next queue item, collect
   VIP/daily login rewards.
2. **Dispatch on the open map** — send marches to gather resources (farms,
   lumber mills, quarries, goldmines as map tiles), clear barbarian camps/forts
   for commander XP and loot, or scout/attack other players.
3. **Tend commanders** — assign commanders to cities/marches/garrisons, spend
   sculptures/XP items to level them, adjust talent trees and equipment
   (armaments/inscriptions) between fights.
4. **Engage the alliance layer** — read alliance/kingdom chat, join or start
   rallies against barbarians/holy sites/enemy cities, claim alliance gift
   chests, check territory/flag status.

Push notifications (queue completions, rally calls, being attacked) pull players
back between sessions. RoK is explicitly designed around short "5-minute burst"
check-ins (Touch Tap Play's Luciano) punctuated by occasional much longer
real-time KvK/rally sessions.

## 3. Base building & progression systems

- **City Hall** gates every other building's max level and the Academy's max
  research tier. Milestones 16/21/25 gate major unlocks — CH16 opens Lost
  Kingdom/KvK migration eligibility, CH21 opens a civilization-specific elite
  unit choice (Archer/Cavalry/Infantry), CH25 opens top-tier research and units.
  Past CH8, players lose the newbie "Beginner's Teleport" that lets them
  relocate kingdoms, making CH8 a soft point of no return.
- **Commanders** are the deepest system in the game:
  - Obtained via Wheel of Fortune gacha, PvE/event sculptures, or direct
    purchase. Rarity: Advanced → Elite → Epic → Legendary.
  - Each has **4 base skills** unlocked by star level, plus (Epic/Legendary
    only) a **5th "Mastery" skill** unlocked once all four reach level 5.
  - **Specialties** (garrison, support, skirmish, peacekeeping, comprehensive)
    gate which **talent trees** a commander can invest in — a separate build
    layer from skill leveling.
  - **Pairing**: a march/garrison carries a primary + secondary commander; both
    commanders' skills trigger in sequence within the same combat turn, so team
    synergy is its own strategic layer, further customized by **armaments**
    (troop-type gear) and **inscriptions** (armament enhancements).
- **Power/CP score**: an aggregate (buildings + troops + commanders + tech) used
  for KvK matchmaking and as a rough PvP predictor. A recurring complaint
  (MMOHuts) is that "PVP isn't about tactics, just raw power," though
  formations/focus-fire/timing meaningfully offset raw power.
- **Tech tree (Academy)**: split into **Economic** (gathering/construction/
  research speed) and **Military** (unit stats, troop-tier unlocks, and Combat
  Tactics army-wide bonuses); tier access is gated by City Hall level.
- **Civilizations**: 15 selectable at account creation (China, Rome, Germany,
  Britain, France, Japan, Korea, Spain, Arabia, Ottoman, Byzantium, Greece,
  Egypt, Maya, Vikings). Each has unique architecture, a starting commander, an
  economic/military perk, and (CH21+) a unique elite unit (China's Chu-Ko-Nu,
  Rome's Legionnaire, Germany's Teutonic Knight, Britain's Longbowman). Largely
  flavor plus a modest stat lean — no civ is considered strictly best.

## 4. Resource economy

- **Four primary resources**: Food (feeds troops, gates training), Wood (early
  construction), Stone (later/stronger buildings), Gold (research, higher-tier
  troop training).
- **Gems** are the premium meta-resource, converted into VIP points, gacha
  pulls, and shop purchases rather than spent on buildings directly.
- **Production**: resource map tiles are gathered by marches parked on them;
  in-city production buildings also generate a passive baseline.
- **Storage/protection**: raw resources sit in the **Storehouse**, visible and
  plunderable above a protected cap that scales with Storehouse level.
  Converting resources to **item form** (resource packs) makes them
  plunder-immune with no storage limit — veterans habitually bank surplus as
  items.
- **Spend sinks**: construction/upgrades, troop training and healing (wounded
  troops go to the Hospital), research, and — the largest late-game sink —
  combat losses from failed rallies/wars.
- **Speedups** (time-reduction items, resource- or gem-sourced) function as a
  secondary currency on top of the four resources; whole guides exist around
  farming enough speedups to stay competitive without paying.

## 5. Combat systems

RoK's most distinctive system relative to lighter, more automated SLGs — not
just "biggest number wins," though power still dominates coarsely.

- **Turn structure**: battles resolve on a **1-second turn cycle**; each turn
  resolves one normal attack per army, unlimited simultaneous counterattacks,
  and commander skill "rage" generation together. Active skills cost 1,000 rage;
  paired commanders' skills fire sequentially within the same turn. Stated
  tactical principle: focus fire to minimize incoming counterattack damage.
- **Formations, armaments, inscriptions**: named troop formations (e.g. a
  "wedge" favoring attack, an "arch" favoring ranged units) grant stat bonuses,
  further tuned by armaments and inscriptions — the closest analog to a
  real-time tactics layer in the genre.
- **PvE**:
  - **Barbarians** (camps/forts) — low-stakes farming for commander XP/loot;
    "peacekeeping" specialty and passive-XP skills are the recommended picks.
  - **Holy Sites / Ancient Ruins / Altars of Darkness** — contestable map
    structures (outer zones 5–6 of the KvK map) granting continuous honor/XP to
    the holding alliance. Ancient Ruins: contestable every 2 days, held 1 hour.
    Altars of Darkness: held 2 hours. Periodic barbarian reinforcements pressure
    even a held site.
  - **Expedition** — a discrete staged singleplayer-vs-AI campaign: linear
    stages with objectives (defeat all enemies in a time limit, minimize losses,
    protect allies), star ratings, daily-claimable rewards for 3-starred stages.
    Troops/commanders already gathering or garrisoned on the open map can still
    fight Expedition battles without being pulled off their map task — designed
    as a side activity, not competing army use.
- **PvP**:
  - **Rallies** — the core large-scale assault tool: one player starts a rally
    (vs. a barbarian fort, holy site, or enemy city), allies join during a
    gather phase, the combined force dispatches together; total rally size is
    gated by Hall of War level.
  - **Kingdom vs. Kingdom (KvK / "Lost Kingdom")** — the seasonal
    server-vs-server endgame (full structure in § 10).
  - **Ark of Osiris (AoO)** — a biweekly cross-kingdom battleground: teams fight
    over Obelisks (starting bases), Altars/Shrines (steady point generators),
    Ruins (contested mid-map objectives), and the central Ark Site.
    Kingdom-title/holy-site/rune buffs are explicitly disabled inside AoO,
    making it a more level arena mode than the open world.

## 6. Alliance/social systems

The system reviewers/analysts most often single out as RoK's differentiator —
one industry analysis (Delphi Digital) compares its depth to EVE Online's:

- **Alliance structure**: R1 (trial/new) through R5 (leader), with R4 "officers"
  holding day-to-day permissions (kick/promote/demote, accept/reject requests,
  schedule events, invite, build alliance buildings/flags, view member
  coordinates). Guides advise choosing R4s for reliability and communication,
  not just power or spend.
- **Alliance tools**: chat with live translation, map pings for coordinating
  attacks, an alliance shop (spend donation-earned credits), shared alliance
  technology funded by member contributions, and territory flags that claim/hold
  map area.
- **Gifting**: certain IAP purchases by members unlock a claimable "alliance
  gift" chest for the whole alliance — per a first-person GameRefinery account,
  this meaningfully props up F2P/low-spend members, since heavy spenders
  indirectly subsidize the alliance.
- **Kingdom-level governance ("politics")** is the standout feature: each
  kingdom (server) has exactly **one King**, a singular contested seat with real
  authority. The king freely assigns **kingdom titles** — positive ones (Prime
  Minister, General, etc.) carrying research/building/training-speed buffs for
  the whole kingdom, and negative/punitive ones ("Traitor," "Fool") as a
  public-shaming mechanic with no real precedent in lighter SLGs. Delphi Digital
  frames this as a deliberate feudal pyramid (king → alliance leaders as "lords"
  → rank-and-file) where the one unpurchasable resource is _loyalty_ — gems,
  speedups, and commanders can all be bought, but not trust, which is why
  diplomacy and reputation carry weight distinct from raw spend.
- **Cross-alliance/kingdom diplomacy**: capturing high-value shared objectives
  (e.g. the Lost Temple) typically requires coordination _across_ multiple
  alliances in a kingdom — kingdom politics (truces, negotiated turn-taking, or
  kingdom-wide wars over "who deserves" a site) gates actual content access, not
  just flavor.

## 7. Additional/side features

Kept separate from the core loop above, per the brief:

- **The Mightiest Governor** — flagship recurring event: 6 stages over roughly a
  week (final stage 48 hours, others 24 hours each), repeating every 2 weeks
  with an 8-day gap between runs. Each stage tests a different activity
  (training, barbarian kills, gathering, power growth, eliminations); top
  placements award legendary commander sculptures (1st: 180, 2nd: 90, 3rd: 60,
  decreasing further down) plus gem rewards for broader brackets (top 100: 40
  gems + a sculpture; top 50: 200 gems).
- **Ark of Osiris** — biweekly cross-kingdom battleground (also PvP, § 5), but
  runs on its own event cadence rather than as persistent world content.
- **Lucerne Scrolls** — two-tier ($4.99/$19.99) seasonal battle-pass-style
  track, layered on top of (not replacing) daily VIP/login rewards.
- **Wheel of Fortune** — the primary commander gacha: spend gems or earned
  currency for randomized pulls, the main non-event source of legendary
  sculptures.
- **Expedition/Campaign mode** — a self-contained singleplayer stage-clear mode
  with its own reward track (Medals of the Conqueror), separate from open-world
  progression.
- **Collection/cosmetic layer**: SVIP shop (currency-for-discounted-item
  exchange), commander skins and sculptures-as-collectibles, periodic seasonal
  cosmetic events. This research did not find evidence of a deep dedicated
  cosmetic/skin economy on the scale of some other mobile titles.

## 8. Early game (first session / first few days)

RoK has a well-documented reputation for a **steeper learning curve than newer,
more streamlined SLGs** — consistent across independent guide sites, not just
this project's framing:

- New accounts get a **2-day Peace Shield**, an explicit build-up window before
  PvP exposure.
- Low-CH players can use a **Beginner's Teleport** into a "Nascent Kingdom"
  (freshly opened, younger population) — available only for the first 10 days
  and auto-revoked at City Hall 8, making early kingdom choice effectively
  permanent.
- Multiple independent sources converge on the same characterization: the game
  "starts small and seems easy, but introduces a lot of elements so it gets very
  complex," asking a new player to simultaneously choose a civilization, develop
  commanders, gather resources, join an alliance, train troops, and manage power
  growth "from the very first minutes" — guides consistently call this
  overwhelming rather than gradual. This differs materially from lighter
  competitors that heavily gate/drip-feed systems behind scripted tutorial
  chapters. Reception coverage also notes there's no real narrative to soften
  onboarding (Arkansas Democrat-Gazette: "there's no real narrative to speak
  of") — onboarding leans on mechanical tutorialization and community/guide-site
  knowledge transfer rather than a scripted campaign hand-hold.
- Near-universal early advice across guides: join an active alliance immediately
  — it materially accelerates building (help speedups) and protects new cities,
  treated as close to mandatory rather than optional.

## 9. Mid game

Once the initial building/tech rush tapers off, sustained play is carried by:

- **Grinding toward City Hall milestones** (16 for KvK eligibility, 21/25 for
  late unlocks) — a long, resource- and speedup-intensive march rather than a
  discrete "finished the tutorial" moment.
- **Commander collection and leveling** — an open-ended, effectively
  never-"complete" system; guides are explicit that missing the current meta
  commander creates real friction, "a steep grind (or spend) to fix it," making
  commander-chasing a persistent treadmill.
- **Alliance participation** — contributing to alliance tech, joining rallies
  against barbarian forts/holy sites, building reputation toward an R4 officer
  role.
- **Recurring events on a fixed cadence** (Mightiest Governor and Ark of Osiris,
  both every 2 weeks) are the mid-game's primary structured content rhythm, each
  a fresh gear-chase layered on open-ended growth.
- **Preparing for KvK** — once a kingdom nears ~100 days old, mid-game play
  increasingly orients around KvK readiness (power growth, alliance cohesion,
  migration decisions) over pure economic growth.

## 10. Late/end game

- **Kingdom vs. Kingdom (KvK / "Lost Kingdom")** is explicitly the endgame
  structure, not an occasional event:
  - Splits into a **pre-KvK phase** (activity inside the home kingdom, e.g. the
    "Eve of the Crusade" barbarian-conquest event) and the **KvK phase proper**,
    where players physically move into the shared "Lost Kingdom" map.
  - **Matchmaking**: Lilith computes aggregate power of each kingdom's top
    players (sources vary — top 300 vs. top 1000) to pair comparably strong
    kingdoms.
  - **Seasonal cadence**: first season starts once a kingdom is roughly 100 days
    old; subsequent seasons follow roughly every 2 months.
  - **Migration**: requires City Hall 16+, sufficient "Passport Pages" (scaled
    to displayed power — a deliberate friction cost against late/opportunistic
    migration), leaving your current alliance, and recalling all active marches
    home first. A separate "cross-season migration" path lets older accounts
    migrate backward into an earlier-numbered season's kingdom.
- **What top players actually do**: sustained, scheduled participation in large
  rallies and open-field battles during KvK windows, plus commander/gear
  min-maxing at the margins. For the very top bracket, guide/community sources
  describe spending routinely in the **$10K–$20K+** range per account, with
  players spending "$200/month on daily bundles" self-describing as merely
  "light spenders" — clear evidence the whale/F2P gap widens rather than
  compresses at the top.
- **Where it becomes a grind/treadmill**: community and analyst consensus
  (eternal-kingdom.net's "why players quit," corroborated by the App Store
  review scan and Wikipedia's reception summary) converges on three burnout
  vectors: (1) the spending gap needed just to keep pace, (2) KvK's multi-hour
  real-time coordination windows that ignore player time zones and start to feel
  like a second job, and (3) commander-gacha fatigue — chasing whatever the
  current meta demands. The recurring framing is that players disengage from the
  _cost of staying competitive_, not from the underlying strategy gameplay.
- KvK ends each season with territory/kingdom-level outcomes (holding the Ark
  Site/contested structures, kingdom rankings) before the next season's
  migration window opens. This research did not turn up granular detail on
  concrete season-end rewards beyond titles/rankings/sculptures already covered
  — flagged as a gap.

## 11. Community sentiment

- **App Store aggregate**: ~4.49–4.5/5 across 170K–2.48M+ ratings (figures vary
  by source/region snapshot) — a strong headline score despite loud monetization
  criticism, suggesting a large satisfied core alongside a vocal critical
  minority.
- **Praised** (App Store review scan via justuseapp.com, cross-checked against
  Apple's own aggregation): strategic depth and real-time battle mechanics,
  breadth of civilization/commander choice, "surprisingly good" graphics for
  mobile, the alliance system fostering "teamwork and community," and its light
  edutainment angle (historical figures/civs woven into progression).
- **Criticized, most to least frequent** (same review scan):
  1. **Pay-to-win** — the most repeated complaint; reviewers describe P2W as
     making the game "nearly unplayable" for committed F2P players, noting
     "everything costs money."
  2. **Player behavior/toxicity** — dominant alliances bullying smaller ones,
     high-power players attacking low-level newcomers with no bracketing
     protection beyond the initial Peace Shield, and "adult talk in kingdom chat
     around kids" given the game's broad-appeal marketing.
  3. **Technical friction** — app size creeping toward 2GB+, lag during
     large-scale KvK battles.
  4. **Missing features** — repeated requests for direct player-to-player
     trading, unsupported.
- **Press reception runs notably harsher than the player-review average**:
  MMOHuts (2/5) called monetization "greedy for the sake of greed" and argued
  PvP is decided by raw power over tactics; Arkansas Democrat-Gazette (4/10)
  cited the pay-to-win ceiling and lack of narrative. A positive counterpoint
  from Touch Tap Play called the game "ambitious" with "incredibly dynamic
  gameplay," explicitly praising that it's "playable in five-minute bursts if
  necessary" despite its systemic depth. Wikipedia's reception section is the
  best single secondary source aggregating these critic quotes.
- **"Why do people spend so much" discourse** (HubPages, a first-person
  GameRefinery account) frames spending less as irrational whale-baiting and
  more as chained sunk-cost design: partially-completed commander sculpture
  sets, limited-time offers timed right after a battle or a near-miss legendary
  pull, and alliance gift chests that make individual spending feel prosocial
  (subsidizing the alliance) rather than purely selfish — more sophisticated
  than a flat "pay more, win more" pitch.
- **Reddit (r/RiseofKingdoms) was not directly accessible in this session** —
  every fetch attempt (`www.reddit.com`, `old.reddit.com`, bare `reddit.com`)
  was blocked, and targeted searches for specific thread quotes didn't surface
  fetchable primary content before the session's search budget ran out. The "why
  players quit" themes above are sourced from a third-party synthesis site
  (eternal-kingdom.net), not primary subreddit quotes with attributable
  usernames — a real gap; a follow-up pass with working Reddit access would
  materially strengthen this section.
- **Named YouTube RoK creators/guide videos were not confidently identified** —
  searches returned generic guide playlists rather than specific, attributable
  channels. Written guide sites (BlueStacks, LDShop/LDPlayer,
  riseofkingdomsguides.com, rok.guide, heaven-guardian.com, theriagames.com)
  function as the de facto community guide ecosystem and were used as secondary
  sources throughout, but are not the "well-known YouTuber" primary sources the
  brief asked for — flagged as a second gap.

## 12. Sources

**Official/press/data:**
[Wikipedia](https://en.wikipedia.org/wiki/Rise_of_Kingdoms) ·
[App Store listing](https://apps.apple.com/us/app/rise-of-kingdoms/id1354260888)
·
[App Store reviews](https://apps.apple.com/us/app/rise-of-kingdoms/id1354260888?see-all=reviews)
·
[Google Play listing](https://play.google.com/store/apps/details?id=com.lilithgame.roc.gp&hl=en_IN)
·
[Mobidictum — $3.5B revenue](https://mobidictum.com/rise-of-kingdoms-3-5-billion-global-revenue/)
·
[Sensor Tower Q1 2025 US](https://sensortower.com/blog/2025-q1-unified-top-5-historical%20games-revenue-us-60188699241bc16eb8409802)
·
[Sensor Tower Q2 2025 US](https://sensortower.com/blog/2025-q2-unified-top-5-historical%20games-revenue-us-60188699241bc16eb8409802)
·
[Sensor Tower Google Play overview](https://app.sensortower.com/overview/com.lilithgame.roc.gp?country=US)
·
[justuseapp.com review scan](https://justuseapp.com/en/app/1354260888/rise-of-kingdoms/reviews)

**Fandom wiki** (search-snippet only in this session; direct fetch returned HTTP
402/blocked): [Commanders](https://riseofkingdoms.fandom.com/wiki/Commanders) ·
[Commander Guide](https://riseofkingdoms.fandom.com/wiki/Commander_Guide) ·
[Resources](https://riseofkingdoms.fandom.com/wiki/Resources) ·
[Ultimate Alliance Guide](https://riseofkingdoms.fandom.com/wiki/Ultimate_Alliance_Guide)
· [Lost Kingdom](https://riseofkingdoms.fandom.com/wiki/Lost_Kingdom) ·
[Events/The Mightiest Governor](https://riseofkingdoms.fandom.com/wiki/Events/The_Mightiest_Governor)
· [Holy Sites](https://riseofkingdoms.fandom.com/wiki/Holy_Sites) ·
[Expedition](https://riseofkingdoms.fandom.com/wiki/Expedition) ·
[Civilizations](https://riseofkingdoms.fandom.com/wiki/Civilizations)

**Guide sites & analysis** (fetched or search-surveyed):
[LDShop — Commander Tier List](https://www.ldshop.gg/blog/tier-list/rise-of-kingdoms-commander-tier-list.html)
·
[LDShop — Alliance Guide](https://www.ldshop.gg/blog/rise-of-kingdoms/alliance-giude.html)
·
[LDShop — Gems Guide 2026](https://www.ldshop.gg/blog/rise-of-kingdoms/rise-of-kingdoms-gems-guide.html)
·
[BlueStacks — Combat Guide](https://www.bluestacks.com/blog/game-guides/rise-of-kingdoms/rok-combat-guide-en.html)
(fetched) ·
[BlueStacks — Expedition Guide](https://www.bluestacks.com/blog/game-guides/rise-of-kingdoms/guide-expeditions-en.html)
·
[BlueStacks — Civilizations Guide](https://www.bluestacks.com/blog/game-guides/rise-of-kingdoms/rok-civilizations-guide-old-en.html)
·
[BlueStacks — Beginner's Guide](https://www.bluestacks.com/blog/game-guides/rise-of-kingdoms/rok-beginnners-guide-en.html)
·
[TouchScreenGaming — Formations Guide](https://touchscreengaming.com/formations-guide/)
·
[Pocket Gamer — Resources](https://www.pocketgamer.com/rise-of-kingdoms/resources/)
·
[Delphi Digital — "What Does It Feel Like To Be King?"](https://members.delphidigital.io/reports/rise-of-kingdoms-what-does-it-feel-like-to-be-king)
(fetched) ·
[AllClash — Titles Guide](https://www.allclash.com/titles-in-rise-of-kingdoms-how-to-handle-use-them/)
·
[riseofkingdomsguides.com — KvK Guide](https://riseofkingdomsguides.com/kvk-kingdom-vs-kingdom-guide-tips-for-all-seasons-in-rise-of-kingdoms/)
·
[riseofkingdomsguides.com — VIP Points Guide](https://riseofkingdomsguides.com/how-do-you-get-vip-points-in-rise-of-kingdoms/)
·
[riseofkingdomsguides.com — Beginner's Guide](https://riseofkingdomsguides.com/rise-of-kingdoms-beginners-guide/)
·
[Heaven Guardian — Migration Guide](https://heaven-guardian.com/rok-migration-guide-2026/)
·
[Heaven Guardian — Beginner's Guide](https://heaven-guardian.com/rise-of-kingdoms-beginners-guide/)
·
[Theria Games — City Hall Guide](https://theriagames.com/guide/rise-of-kingdoms-city-hall-guide/)
·
[Theria Games — Economic Tech Guide](https://theriagames.com/guide/rise-of-kingdoms-economic-technology-guide/)
·
[Theria Games — Military Tech Guide](https://theriagames.com/guide/rise-of-kingdoms-military-technology-guide/)
·
[Empire Build Academy — Research Guide](https://www.empirebuildacademy.com/research/rise-of-kingdoms)
·
[rok.guide — Mightiest Governor Guide](https://www.rok.guide/the-mightiest-governor-event/)
· [rok.guide — Ark of Osiris Guide](https://www.rok.guide/ark-of-osiris/) ·
[Udonis — Monetization Analysis](https://www.blog.udonis.co/mobile-marketing/mobile-games/rise-of-kingdoms-monetization)
(fetched) ·
[GameRefinery — Player Perspective on Monetization](https://www.gamerefinery.com/rise-of-kingdoms-a-player-perspective-on-monetization/)
(fetched) ·
[HubPages — Why People Pay So Much](https://discover.hubpages.com/games-hobbies/How-Come-People-Pay-So-Much-Money-in-Rise-of-Kingdoms)
·
[eternal-kingdom.net — Why Players Quit](https://eternal-kingdom.net/why-players-quit-rise-of-kingdoms)

**Access notes:** Reddit (`r/RiseofKingdoms`) was unreachable via WebFetch in
this session (blocked at every subdomain tried — `www.reddit.com`,
`old.reddit.com`, bare `reddit.com`), and named YouTube RoK creators could not
be confidently identified via search — both gaps are called out inline in § 11.
