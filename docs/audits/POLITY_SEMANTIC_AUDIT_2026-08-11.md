# ATLAS Polity Semantic Audit — 2026-08-11

> Status: AUDIT ONLY — NO PRODUCTION DB MUTATION
>
> Goal: normalize existing Person × Polity activities against the ATLAS historical-map semantics before any correction is applied.

## 1. ATLAS semantic rule

Historical accuracy has priority over completeness.

A `Polity` is a historically identifiable political actor that exercised independent or semi-independent political authority over people, territory, or a political order during a defined period. It is the entity to which time-indexed territory records may ultimately attach.

Do not automatically equate a Polity with a modern sovereign state, and do not automatically reject names containing Dynasty, Empire, Republic, Shogunate, Confederacy, etc. Classification is historical and contextual.

Keep separate where the evidence requires it:

- Polity — political actor / territorial authority
- Government or Regime — governing system or central governing apparatus
- Dynasty / House / Clan — lineage or ruling house
- Event / Revolt / Resistance / Settlement — historical process or event
- People / Ethnicity / Macro-region — cultural, ethnic, or geographic identity
- Territory Record — time-indexed extent/control of a Polity
- Person–Polity relation — `rules`, `serves`, `active_in`, `opposes`, `claims_rule`, or later evidence-based extension

A Person does not own geometry. The map path is conceptually:

`Person -> relation + role + period -> Polity -> Territory History -> Geometry`

## 2. Audit baseline and limitation

Frozen baseline available for this pass:

- LIVE audit snapshot date: 2026-08-05
- canonical persons: 291
- activity rows: 309

Later repository evidence shows that the database grew after this snapshot. Therefore this document is a baseline semantic audit, not a claim that all current Production rows have been reconciled.

Required final step before applying corrections:

1. obtain a fresh normalized Production snapshot;
2. diff it against this frozen baseline;
3. audit only the delta with the same rules;
4. refuse correction apply if any target Activity UUID has drifted or disappeared.

## 3. Decision vocabulary

- `KEEP` — current Polity meaning is suitable.
- `RELATION_FIX` — Polity is suitable, but the Person–Polity semantic relation must be recorded/changed.
- `RELINK` — current Activity points to the wrong semantic object and should point to another Polity.
- `SPLIT` — one Activity compresses historically distinct periods or authority scopes and should become multiple Activities.
- `OUT_OF_POLITY_MODEL` — current record describes a person-place, person-people, event, tradition, or similar relation rather than a defensible Person–Polity relation.
- `RESEARCH` — evidence is insufficient for an automatic correction.

No `RESEARCH` row may be automatically mutated.

## 4. Wave 1 — high-priority flagged activities

| Activity UUID | Person | Current Polity | Period | Role | Semantic diagnosis | Decision | Provisional target / action | Context to preserve | Confidence |
|---|---|---|---:|---|---|---|---|---|---|
| `84d64b9b-b52c-4c2f-ae44-cd65bc69f143` | Tokugawa Ieyasu | Tokugawa Shogunate | 1603–1616 | Shogun | `bakufu` is the central warrior government, but scholarship also treats early-modern Japan as a layered `bakuhan state`; nationwide shogunal authority and autonomous domains coexist. A blind `Shogunate -> Japan` replacement would erase this hierarchy. | `RESEARCH` | Model nationwide Japan/bakuhan authority and direct shogunal lands/domains before relink. | Tokugawa Shogunate as government/regime; Tokugawa house; daimyo domains | high that current semantics need hierarchy review; medium on final target |
| `2251143e-bfbc-4cd4-a24e-58c1d16fc748` | Hojo Tokimune | Kamakura Shogunate | 1268–1284 | Shikken | Shikken ruled through the Kamakura bakufu while imperial/court authority also existed. This is not safely analogous to a modern unitary presidency. | `RESEARCH` | Determine whether ATLAS should model Kamakura bakufu as a political-authority Polity, or Japan + parallel authority layers. | Kamakura bakufu; shikken office; imperial court relationship | medium |
| `6b488bfa-e918-4be1-8127-57ffb2bc776e` | Toyotomi Hideyoshi | Toyotomi Regime | 1582–1598 | Military leader and Kampaku | Current row collapses the unification process and the later unified state. Scholarship identifies 1590 as the point by which Hideyoshi had subdued all provinces and treats the period as state-building toward a unified Japan. | `SPLIT` + `RESEARCH` | At minimum separate pre-1590 consolidation from 1590–1598 nationwide rule. Final pre-1590 Polity authority requires research. | Toyotomi regime; changing direct/hegemonic territory | high for split; medium on pre-1590 target |
| `fc051734-cdbb-4cc0-b569-4795d23bfef2` | Oda Nobunaga | Oda Clan | 1568–1582 | Daimyo and de facto national leader | A clan/lineage is not itself the territorial scope. Scholarship describes daimyo territorial domains and Nobunaga's incomplete pursuit of national military hegemony. | `SPLIT` + `RESEARCH` | Replace clan-as-polity with evidence-based territorial/political authority by period; do not paint all Japan from 1568. | Oda clan as dynasty/house context; Owari/Mino and later hegemonic extent | high |
| `4777f7fe-cecd-4699-9e48-a327f58bc0a7` | Uesugi Kenshin | Uesugi Clan | 1548–1578 | Daimyo | Clan label is lineage, while a daimyo's relevant map object is the territorial/political domain actually governed. | `RELINK` + `RESEARCH` | Identify historically defensible territorial polity/domain and exact period boundaries before mutation. | Uesugi clan as house context | high that current label is wrong; medium on final target |
| `b9940b97-626c-4ccd-b05f-79dbd842621b` | Charles de Gaulle | French Fifth Republic | 1959–1969 | President | The Fifth Republic is the constitutional regime established under the 1958 Constitution; de Gaulle was President of the French Republic. | `RELINK` | France / French Republic; relation `rules`; keep Fifth Republic as regime metadata. | Fifth Republic / Constitution of 1958 | very high |
| `09a44ab8-bba6-4e82-9347-6905865b3371` | William I of Orange | Dutch Revolt | 1568–1584 | Revolt leader and stadtholder | `Dutch Revolt` is an event/process, not a polity. The period spans changing territorial control and institutions in Holland/Zeeland and the rebel Netherlands. | `SPLIT` + `RELINK` | Reconstruct period-specific rebel political authorities; do not use the event name as Polity. | Dutch Revolt as Event; Prince of Orange; stadtholder offices | very high current label invalid; medium on exact splits |
| `15bc86a6-8e2d-4463-bebd-33b3201c9fce` | Lady Trieu | Jiaozhi resistance | 248 | Rebel leader | `resistance` names an uprising, not a political-territorial actor. | `RELINK` or `OUT_OF_POLITY_MODEL` | Research the 248 uprising's territorial authority. If no defensible rebel polity existed, represent the uprising as Event and connect Lady Trieu with `opposes`/event semantics rather than inventing a polity. | Lady Trieu uprising; Jiaozhi regional context | high current label invalid; low/medium final target |
| `5583bb6e-e6b1-4890-b20b-196735d004b4` | Ingolfr Arnarson | Settlement of Iceland | 874–900 | Founder and settler | `Settlement of Iceland` is a process, not a polity. Scholarship also cautions that early Iceland lacked centralized territorial state authority and the historicity of Ingolfr as an individual is debated. | `OUT_OF_POLITY_MODEL` + `RESEARCH` | Prefer Person–Place / settlement-tradition relation unless evidence supports a specific political authority. Do not invent `Iceland` as his ruled polity. | Iceland settlement; Reykjavik; historicity/tradition confidence | very high current label invalid |
| `06b85a9c-741f-4454-96dc-d62be5abe88d` | Vercingetorix | Gaul | -52 | King of the Arverni and leader of the Gallic Confederation | `Gaul` is a macro-region; source evidence distinguishes his Arvernian kingship and a multi-people Gallic coalition. | `SPLIT` or `RELINK` + `RESEARCH` | Evaluate Arverni as one Polity relation and coalition leadership as a separate temporary authority/event/confederation relation. | Gallic War; coalition leadership | high current `Gaul` too broad |
| `2cd9ea93-d911-444b-abab-5d7d72310bdd` | Brennus (Galatia) | Gallic Coalition | -280–-279 | Chieftain | Scholarship describes a large migratory Celtic-speaking movement under Brennus and later offshoots. A mobile military coalition is not automatically a territorial Polity. | `RESEARCH` | Determine whether this belongs to a people/coalition/event authority model rather than territorial Polity. | Celtic migration/campaign; later Galatian offshoots | medium |
| `9f91d916-55b5-416b-9e88-8c0fa67220f7` | Kupe | Maori | 900–1200 | Navigator and ancestral figure | `Maori` is a people/ethnocultural identity, not one polity; authoritative New Zealand reference material presents Kupe through multiple tribal traditions as an explorer/ancestor tied strongly to places and traditions. | `OUT_OF_POLITY_MODEL` | Remove the pseudo-Polity relation only after a Person–People/Tradition/Place path exists; preserve the record until then. | Maori traditions; Hawaiki; named places; historicity/traditional status | very high |

## 5. Control examples — do not overcorrect

These rows demonstrate why string heuristics are forbidden:

- `Enomoto Takeaki -> Republic of Ezo` — a short-lived territorial political authority; likely `KEEP` pending normal source review.
- `Charles V -> Holy Roman Empire` and `Charles V -> Spanish Monarchy` — simultaneous composite rule can be historically real; do not collapse automatically.
- `Cnut the Great -> England / Denmark / Norway` — overlapping crowns can be real simultaneous Polity relationships.
- `Ming Dynasty`, `Qing Dynasty`, `Sui Dynasty` — the English word `Dynasty` does not by itself prove a dynasty-only object; in historiography these labels can name state-polities.
- `Habsburg Monarchy`, `Crown of Castile`, `Spanish Monarchy` — composite-monarchy and Crown terminology requires substantive historical review, not lexical filtering.
- `Senones`, `Eburones`, `Massagetae`, `Lakota`, `Cree`, `Mapuche`, etc. — ethnonyms may or may not refer to a politically organized community at the relevant date. Each requires evidence before relink/deletion.

## 6. Evidence used in Wave 1

### Japan

- John Whitney Hall, “The bakuhan system,” *The Cambridge History of Japan*, vol. 4. Treats the Edo shogunate's nationwide aspects separately from daimyo domains and discusses the scholarly concept `bakuhansei-kokka` (bakuhan state).
- *The New Cambridge History of Japan*, “Regional Authority during the Tokugawa Period.” Describes authority delegated from the shogunate to autonomous daimyo domains.
- Asao Naohiro et al., “The sixteenth-century unification,” *The Cambridge History of Japan*. Describes Nobunaga's incomplete national military hegemony and the state created by Oda/Hideyoshi as military hegemony over daimyo territorial claims.
- “Foreign faith and rising state: An examination of state-building dynamics in late 16th-century Japan,” *Political Science Research and Methods*. States that by 1590 Hideyoshi had effectively subdued all provinces and that unified-state consolidation is principally associated with his rule.

### France

- Presidency of the French Republic (Elysee), Constitution of 4 October 1958 and Charles de Gaulle presidential history. The Fifth Republic is the constitutional regime; de Gaulle was elected President of the Republic.

### Netherlands

- Christine Kooi, “War,” *Reformation in the Low Countries, 1500–1620*, Cambridge University Press. Describes the revolt, territorial gains by rebels, breakdown of the alliance, and eventual north/south territorial bifurcation.
- *Texts Concerning the Revolt of the Netherlands*, Cambridge University Press. Contemporary documents distinguish William of Orange, the States, Holland/Zeeland, and evolving unions from the Revolt as an event label.

### Iceland

- University of Iceland / Arni Magnusson Institute materials on settlement and `Landnamabok`; modern scholarship cautions against treating the later settlement narrative as a simple direct record of ninth-century political institutions.
- *International Organization*, “Wisdom Is Welcome Wherever It Comes From: War, Diffusion, and State Formation in Scandinavia.” Describes settlement-era/Commonwealth Iceland as lacking centralized territorial state authority; chieftain power was personal/follower-based rather than territorial.

### Kupe

- Te Ara — The Encyclopedia of New Zealand, “First peoples in Maori tradition” and “Kupe.” Presents multiple tribal traditions, Kupe as explorer/ancestor, and strong place/tradition associations rather than a single Maori polity.

### Lady Trieu / Gaul / Brennus

- Cambridge scholarship on Vietnam identifies Lady Trieu as a rebel/resistance figure; `Jiaozhi resistance` is therefore an event label rather than demonstrated polity identity.
- Classical scholarship distinguishes Vercingetorix's Arverni identity from the wider Gallic coalition.
- Cambridge scholarship on the Attalids describes Brennus's force as part of a large migratory Celtic-speaking movement whose later offshoots entered Anatolia.

## 7. Next audit waves

### Wave 2 — ethnonym / tribal-polity review

Priority candidates from the frozen snapshot include:

- Lakota
- Cree
- Mapuche
- Lemhi Shoshone
- Northwestern Shoshone
- Senones
- Eburones
- Massagetae
- Catuvellauni
- Iceni
- Iroquois Confederacy
- Tecumseh's Confederacy

Goal: distinguish actual organized political communities/confederacies from broad ethnicity labels.

### Wave 3 — composite monarchy / dynasty-name review

- Habsburg Monarchy
- Spanish Monarchy
- Crown of Castile
- Ming / Qing / Sui / Yuan naming
- Tsardom of Russia -> Russian Empire transitions
- other dynasty/state labels

Goal: preserve real state identity while separating house/dynasty metadata only where historically justified.

### Wave 4 — warlord / rebel / transitional authority review

- late Han warlords
- Red Turban regimes
- temporary kingdoms / rebel states
- pirate republics
- colonial / resistance records

Goal: determine whether each row points to the polity served, the polity ruled, a temporary territorial authority, or merely an event/context.

## 8. Correction gate

No Production mutation may occur from this audit document alone.

Before the first correction change set:

- fresh Production UUID snapshot required;
- target UUID and before-state must match audit expectation;
- `RESEARCH` rows must be resolved or explicitly deferred;
- correction must be expressed as a reviewed, idempotent correction manifest/change set;
- dry-run must report row-count changes, semantic collisions, orphan references, and split results;
- apply must run in bounded historical change sets, not one unreviewed global UPDATE;
- post-apply verification must include map/runtime semantics, not only SQL success.
