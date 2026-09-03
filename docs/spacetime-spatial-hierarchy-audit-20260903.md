# ATLAS spacetime spatial hierarchy audit — 2026-09-03

## Status and scope

This document audits the 33 leaf subregions used by the Person spacetime view before treating them as the X-axis unit.

- The hierarchy is **ATLAS internal historical-display taxonomy**, not UN M49 or another external standard.
- UN M49 is used only as a modern geographic reference. The UN itself describes M49 regions as statistical groupings and cautions that assignment does not imply political affiliation.
- The current Production spatial index contains **299 reviewed polity→subregion bindings**, and all 33 leaf codes are in active use.
- Width is **never** weighted by Person count, polity count, era density, or screen congestion.
- X ordering uses **representative longitude plus geographic continuity**. A 2-D world cannot be reproduced perfectly on one axis; when north/south regions overlap in longitude, continuity and historical readability break ties.
- Existing subregion codes and existing reviewed polity bindings are preserved in this change. Names marked “rename/split later” are audit findings, not automatic migrations.

Reference framework:
- UN Statistics Division, M49 geographic regions: https://unstats.un.org/unsd/methodology/m49/

## Macro order

**Americas → Europe → Africa → West Asia → Central Asia → South Asia → Southeast Asia → East Asia → Oceania**

The eastern edge is deliberately **Southeast Asia → East Asia → Oceania**. Oceania must not return to the left of East Asia.

## 33-leaf audit

| # | Macro | Code | Current label | Reviewed bindings | Intended working scope / W→E map cue | Audit finding / later naming recommendation | Axis decision |
|---:|---|---|---|---:|---|---|---|
| 1 | Americas | north-america | 북아메리카 | 13 | Pacific/Alaska side → Atlantic side of northern continental America | Stable enough; document that Mesoamerica is excluded by ATLAS taxonomy | keep |
| 2 | Americas | mesoamerica-caribbean | 메소아메리카·카리브 | 9 | Mesoamerican mainland → Caribbean island arc | Mixed mainland+island logic; future split into Mesoamerica / Caribbean is preferable if leaf count expands | keep |
| 3 | Americas | south-america | 남아메리카 | 9 | Andes/Pacific side → Atlantic Brazil/Guianas | Stable continental historical-geographic unit | keep |
| 4 | Europe | britain-ireland | 영국·아일랜드 | 15 | Ireland/Atlantic fringe → eastern Britain | “영국” is state-like and can be anachronistic; future display label **브리튼·아일랜드** preferred | **1st in Europe** |
| 5 | Europe | iberia | 이베리아 | 6 | Atlantic Iberia → Mediterranean/Pyrenean side | Geographic peninsula logic is coherent | **2nd** |
| 6 | Europe | western-europe | 서유럽 | 15 | France/Low Countries western core → Rhine-side transition | Broad directional label overlaps M49-style terminology; future **서유럽 본토** or scope-specific label should be considered | **3rd** |
| 7 | Europe | italy | 이탈리아 | 17 | western/northern Italian peninsula → Adriatic/southern peninsula | Modern-country word used for a long historical peninsula; future **이탈리아반도** preferred | **4th** |
| 8 | Europe | central-europe | 중부유럽 | 18 | German/Alpine core → Bohemian/Carpathian transition | Reasonable historical-geographic unit; boundaries must remain project-defined | **5th** |
| 9 | Europe | northern-europe | 북유럽 | 10 | North Sea/Scandinavian west → Baltic/Fennoscandian east | Broad but coherent; overlaps longitude with Central Europe, so continuity is tie-breaker | **6th** |
| 10 | Europe | balkans | 발칸 | 15 | Adriatic/western Balkans → Black Sea/eastern Balkans | Future **발칸반도** label is geographically clearer | **7th** |
| 11 | Europe | eastern-europe-russia | 동유럽·러시아 | 9 | eastern European plain → Russia farther east | Over-wide mixed region; highest-priority future split into Eastern Europe and Rus/Russia-related leafs | **8th** |
| 12 | Africa | west-africa | 서아프리카 | 6 | Atlantic/Sahel west → Niger basin/eastern transition | Coherent historical-geographic unit | **1st in Africa** |
| 13 | Africa | north-africa-nile | 북아프리카·나일 | 8 | Maghreb west → Nile valley east | Two distinct historical zones combined; high-priority future split into Maghreb/North Africa and Nile | **2nd** |
| 14 | Africa | central-africa | 중앙아프리카 | 3 | Congo basin west/center → Great Lakes transition | Reasonable project unit; “Middle Africa” is M49 terminology but not adopted here | **3rd** |
| 15 | Africa | southern-africa | 남아프리카 | 2 | southwest/southern interior → southeast | South-facing region mapped by representative longitude; low binding count does not reduce width | **4th** |
| 16 | Africa | east-africa-horn | 동아프리카·아프리카의 뿔 | 1 | East African interior/coast → Horn | Mixed East Africa + Horn; future split if coverage grows | **5th** |
| 17 | West Asia | anatolia-caucasus | 아나톨리아·캅카스 | 4 | Anatolia west → Caucasus east | Two linked but distinct zones; future split possible, no immediate rename | keep 1st |
| 18 | West Asia | levant-mesopotamia | 레반트·메소포타미아 | 15 | eastern Mediterranean → Tigris-Euphrates basin | Historically contiguous but conceptually two zones; future split possible | keep 2nd |
| 19 | West Asia | arabia | 아라비아 | 2 | Red Sea side → Persian Gulf/Oman side | Coherent peninsula unit | keep 3rd |
| 20 | West Asia | iranian-plateau | 이란고원 | 4 | Zagros/western plateau → eastern Iranian plateau | Coherent historical-geographic unit | keep 4th |
| 21 | Central Asia | western-central-asia | 서부 중앙아시아 | 3 | Caspian/Transoxiana west → central oasis belt | Directional project unit; acceptable pending finer atlas geography | keep 1st |
| 22 | Central Asia | eastern-central-asia-steppe | 동부 중앙아시아·스텝 | 5 | eastern oasis/steppe belt → Inner Asian transition | “Central Asia + steppe” mixes region and biome; future **동부 중앙아시아** plus separate steppe logic should be reviewed | keep 2nd |
| 23 | South Asia | northwest-south-asia | 북서부 | 2 | Indus/Afghan-facing northwest → Punjab transition | Label is context-dependent; future **남아시아 북서부** preferred | **1st in South Asia** |
| 24 | South Asia | deccan-south-india | 데칸·남인도 | 4 | western/central Deccan → southern/eastern peninsula | Southward unit but generally west of the lower Ganges/Bengal anchor; map-longitude placement before Ganges | **2nd** |
| 25 | South Asia | north-india-ganges | 북인도·갠지스 | 5 | upper Ganges/north India → Bengal/lower Ganges east | Broad river/plain historical zone; future **북인도·갠지스권** preferred | **3rd** |
| 26 | Southeast Asia | mainland-southeast-asia | 대륙부 동남아시아 | 8 | Myanmar/western mainland → Vietnam/eastern mainland | Standard geographic distinction is useful for historical atlas display | keep 1st |
| 27 | Southeast Asia | maritime-southeast-asia | 해양부 동남아시아 | 6 | western Malay/Indonesian world → Philippines/eastern archipelagos | Broad but coherent maritime historical zone | keep 2nd |
| 28 | East Asia | china | 중국권 | 66 | Chinese interior west/center → eastern seaboard | Civilization-style label rather than physical geography; no immediate rename because bindings rely on this meaning | **1st in East Asia** |
| 29 | East Asia | manchuria-mongolia | 만주·몽골권 | 3 | Mongolian/Inner Asian west → Manchurian east | Combines two major zones and spans wide longitude; high-priority future split; nevertheless it belongs west of Korea/Japan on this axis | **2nd** |
| 30 | East Asia | korean-peninsula | 한반도 | 7 | peninsula west coast → east coast | Clear physical-geographic unit | **3rd** |
| 31 | East Asia | japan | 일본 | 7 | western Japanese archipelago → eastern/northern archipelago | Future **일본열도** preferred for historical-geographic neutrality | **4th** |
| 32 | Oceania | australasia | 오스트랄라시아 | 1 | Australia/New Zealand-facing western Oceania | Scope is potentially ambiguous; future audit should decide whether New Guinea belongs here or maritime SE Asia/Melanesia | keep 1st |
| 33 | Oceania | pacific-islands | 태평양 도서 | 1 | Melanesian/Micronesian west → Polynesian east | Extremely broad; future split into Melanesia/Micronesia/Polynesia when evidence coverage justifies it | keep 2nd |

## Immediate implementation decisions

1. **33 leafs stay 33** for this migration; no polity is silently remapped to a new code.
2. All leafs receive exactly one spatial unit.
3. Macro width equals the number of child leaf units.
4. Macro and leaf widths are independent of the current binding counts above.
5. Internal map-order corrections applied now:
   - Europe: Britain/Ireland → Iberia → Western Europe → Italy → Central Europe → Northern Europe → Balkans → Eastern Europe/Russia.
   - Africa: West Africa → North Africa/Nile → Central Africa → Southern Africa → East Africa/Horn.
   - South Asia: Northwest → Deccan/South India → North India/Ganges.
   - East Asia: China → Manchuria/Mongolia → Korean Peninsula → Japan.
   - World east edge: Southeast Asia → East Asia → Oceania.
6. Potential renames/splits are **not** performed in this migration. They require a separate polity-binding migration with exact read-back coverage.

## Follow-up priority

Highest-priority taxonomy refinements, after this structural X-axis migration is stable:

1. Eastern Europe/Russia split.
2. North Africa/Nile split.
3. Manchuria/Mongolia split.
4. Mesoamerica/Caribbean split.
5. East Africa/Horn split.
6. Pacific Islands refinement.
7. Historically neutral display labels: Britain/Ireland, Italy, Japan, Northwest South Asia.
