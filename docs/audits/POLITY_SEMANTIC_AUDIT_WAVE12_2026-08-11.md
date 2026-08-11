# ATLAS Polity Semantic Audit — Wave 12

> Status: AUDIT ONLY — NO PRODUCTION DB MUTATION
>
> Scope: historiographic period labels, conventional imperial labels, disputed/traditional polities, and back-projected polity names.

## 1. Core rule

ATLAS must separate three questions that historical prose often leaves mixed:

1. **Did a political authority actually exist?**
2. **Is the current string the best identity/name for that authority?**
3. **How certain are its chronology and territorial extent?**

A label can fail question 2 while the underlying Polity remains real. Conversely, a polity can be historically defensible while its precise map geometry is highly disputed.

Do not delete historically important uncertain polities merely because their location/borders are unresolved. Preserve the political entity and lower territorial/chronological confidence.

## 2. Individual decisions

| Activity UUID | Person | Current Polity | Period | Role | Decision | ATLAS treatment |
|---|---|---|---:|---|---|---|
| `71a7ae90-37c4-4372-9cda-c5dbfb0652e3` | Hatshepsut | Egyptian New Kingdom | -1479–-1458 | Pharaoh | `RECLASSIFY_TEMPORAL_LABEL` + `RESEARCH` | The New Kingdom is a standard historiographic period spanning the Eighteenth–Twentieth Dynasties, not the personal government or a name used as a discrete state identity by Hatshepsut. Preserve Hatshepsut's rule over the Egyptian state, but model `New Kingdom` and `Eighteenth Dynasty` as temporal/dynastic context. Final underlying Polity UUID (`Egypt`, a temporally bounded Egyptian state identity, etc.) should be decided consistently across all ancient Egyptian rulers before relink. |
| `9de7fa2a-e71a-431a-828f-c90f127f89d8` | Christina of Sweden | Swedish Empire | 1632–1654 | Queen | `SAME_POLITY_TEMPORAL_IMPERIAL_LABEL` + `RELABEL_REVIEW` | Scholarship describes Sweden's seventeenth-century Baltic imperial expansion and an imperial structure, while Christina is consistently Queen of Sweden. Do not model 1632 as the birth of a separate `Swedish Empire` polity if the underlying Kingdom of Sweden continues. Prefer Sweden/Kingdom of Sweden as political identity, with `Swedish Empire / Age of Greatness` as temporal imperial-state context and the overseas/Baltic possessions in Territory/Polity relations. |
| `36f43426-d0fd-4104-a72a-952d13ee9cba` | Hammurabi | Old Babylonian Empire | -1792–-1750 | King | `RELABEL` + `IDENTITY_RESEARCH` | `Old Babylonian` is fundamentally a scholarly period designation that covers multiple contemporary kingdoms; Hammurabi inherited and expanded the kingdom of Babylon. The map Polity should be the Babylonian political state/Kingdom of Babylon, whose territory expands dramatically during his reign, not the entire `Old Babylonian period` as if it were one state. Exact canonical UUID/name should be normalized with other Babylonian dynastic/state records. |
| `3da2b4b9-f0e8-4d21-8790-b1269dc40a71` | Rurik | Kievan Rus' | 862–879 | Prince | `RELINK` + `HISTORICITY/CHRONOLOGY_RESEARCH` | This is a back-projection. The Rus' Primary Chronicle tradition places Riurik's authority in the northern towns; the political shift to Kyiv is associated with Oleg after Riurik's death, conventionally 882. Do not assign Rurik's 862–879 rule to a Kyiv-centered `Kievan Rus'` territory. Research a neutral northern Rus/Novgorod-Ladoga authority identity and preserve source/tradition confidence. |
| `31e1e408-18ce-4dff-815d-3f17d9bd0fba` | Himiko | Yamatai | 180–248 | Queen | `KEEP_POLITY` + `TERRITORY_DISPUTED` + `CHRONOLOGY_REVIEW` | Yamatai/Yamatai-koku is defensible as a third-century chiefdom/political authority associated with Himiko. The major problem is not whether a polity existed but where it was located and how its authority related to other Yayoi chiefdoms. Keep the Polity; do not fabricate a precise polygon. Territory should remain unresolved/alternative-reconstruction until the Kyushu-vs-Kinai and related archaeological debates are explicitly modeled. |
| `cdc102da-63ab-47f7-b9ea-a8de1746fea2` | Meng Huo | Nanzhong | 225 | Regional leader | `OUT_OF_CURRENT_POLITY_LABEL` + `RESEARCH` | `Nanzhong` was the common macro-regional name for a diverse southwest frontier containing several political/cultural communities, not a single polity ruled by Meng Huo. Historical scholarship supports a powerful local Meng Huo associated with the 225 rebellion/campaign more strongly than the later romance's legendary narrative, but the current region-as-polity edge is invalid. Replace only after identifying the relevant local rebel/indigenous authority; preserve legend-vs-history evidence and do not turn all Nanzhong into his territory. |
| `26069772-c38b-4b99-ad61-4dac3e3bba48` | Trưng Trắc | Trung Sisters' Realm | 40–43 | Queen and military leader | `KEEP_UNDERLYING_POLITY` + `RELABEL_RESEARCH` | The 40–43 uprising did create a short-lived independent territorial government: Trưng Trắc was recognized/proclaimed sovereign and the regime controlled a substantial set of former Han-administered settlements before Han reconquest. The problem is the synthetic English identity `Trung Sisters' Realm`, not the absence of a polity. Preserve as a short-lived independent/rebel-successor Polity; choose a source-grounded canonical name later and keep the Trưng uprising as an Event. |
| `aef5de15-48cf-43cc-a47e-a264b28953d2` | Solomon | Kingdom of Israel | -970–-931 | King of Israel | `KEEP_RESEARCH_POLITY` + `HISTORICITY/TERRITORY_DISPUTED` | A tenth-century Israelite/Judahite monarchy under the David/Solomon tradition remains an active archaeological-historical debate. Scholarship no longer supports treating the biblical maximal empire as an uncontested map fact; some reconstructions see a smaller highland/Jerusalem-centered kingdom, while newer work argues for a more substantial United Monarchy. Keep the polity as a research entity, but downgrade chronology/territorial confidence and never draw the biblical maximal extent by default. Alternative reconstructions should be preserved in Authoring. |

## 3. Detailed identity consequences

### Hatshepsut / New Kingdom

The New Kingdom is useful metadata and chronology, but it should not force a separate Polity UUID merely because Egyptology divides history into Old/Middle/New Kingdom periods.

Before changing the Hatshepsut row, audit other Egyptian rulers and decide one consistent identity policy:

- long-duration `Egypt` identity with temporal state/dynasty labels;
- or historically bounded Egyptian state identities where genuine political collapse/reunification justifies new UUIDs.

What is forbidden is using modern period names mechanically as if every period boundary were a state succession.

### Christina / Swedish Empire

The imperial expansion is map-relevant. Do not throw it away.

Preferred semantic direction:

`Christina -> Kingdom of Sweden -> rules`

while:

- `Swedish Empire / Age of Greatness` = temporal imperial context;
- Baltic/German possessions = territory and subordinate/possession relations;
- territorial expansion/contraction = time-indexed records.

This gives the same visual information without inventing a new state at 1632.

### Hammurabi / Old Babylonian

`Old Babylonian` cannot be a universal political identity because the same scholarly period contained Babylon, Larsa, Eshnunna, Mari and other competing kingdoms.

Hammurabi's relevant political identity is the Babylonian kingdom he inherited and expanded. The territory should change through the reign; it should not be a static polygon equal to all Babylonia from year one.

### Rurik / Kievan Rus'

The current label creates a particularly bad map error: it would show a Kyiv-centered polity under a ruler whose traditional authority belongs to the north before the conventional 882 Kyiv takeover.

This is the same class of error already found in:

- `Liu Bei -> Shu Han` before 221;
- `Cao Cao -> Cao Wei` before Cao Pi's 220 imperial foundation.

Rule: **do not back-project a later successful polity name over the founder/precursor phase.**

### Yamatai

Uncertain geometry is not grounds for deleting the Polity.

Authoring should allow:

- identity: Yamatai/Yamatai-koku;
- ruler relation: Himiko;
- location hypothesis A: northern Kyushu;
- location hypothesis B: Kinai/Yamato region;
- confidence/evidence on each reconstruction;
- Runtime default may omit precise territory or show a broad uncertainty indicator until policy is chosen.

### Solomon / United Monarchy

The project must distinguish:

- `historical polity existence/scale hypothesis`;
- `traditional regnal chronology`;
- `territory reconstruction`.

These are not one yes/no question. A person/polity record can remain while territory is disputed.

## 4. Source basis

### Egypt
- Cambridge histories of Egypt treat the New Kingdom as a chronological era spanning multiple dynasties, including the Eighteenth Dynasty; Hatshepsut is treated within that dynastic Egyptian state, not as ruler of a polity literally named `New Kingdom`.

### Sweden
- Michael Roberts, *The Swedish Imperial Experience 1560–1718*, Cambridge: analyzes the empire Sweden built in the Baltic/Germany and its administrative imperial structure.
- Cambridge biographical scholarship consistently identifies Christina as Queen of Sweden; seventeenth-century Sweden is described as the expanding metropolitan state/great power.

### Babylon
- *The Cambridge Ancient History*, “Hammurabi and the End of His Dynasty”: Hammurabi inherited an existing kingdom centered on Babylon and expanded it.
- Cambridge scholarship explicitly uses `Old Babylonian` for multiple contemporaneous kingdoms such as Eshnunna, demonstrating that the period label is not one polity.

### Rus'
- *The Cambridge History of Russia*, “The origins of Rus' (c.900–1015)”: the Primary Chronicle tradition places Riurik in the northern towns; Oleg later moves south and takes Kyiv.
- Cambridge's recent Ukraine history likewise identifies Oleg's 882 Kyiv rule as the conventional founding step of Kyivan Rus.

### Yamatai
- Archaeological scholarship reviewed in Cambridge journals explicitly describes Yamatai as Himiko's elusive chiefdom and treats its location as a major unresolved historiographical/archaeological problem.

### Nanzhong / Meng Huo
- John E. Herman, “The Kingdoms of Nanzhong: China's Southwest Border Region Prior to the Eighth Century,” *T'oung Pao* 95 (2009): Nanzhong was the common name for a broad southwest region containing several sophisticated and divergent cultures/political communities.
- Recent *Journal of Chinese History* work links Meng Huo to a strong local chieftain/clan tradition in the region; separate scholarship shows how the later Seven Captures/geographic tradition accumulated legendary layers.

### Trưng Trắc
- Vietnamese official historical summaries and academic treatments agree that the revolt expelled Han officials across a broad area, Trưng Trắc was proclaimed/recognized sovereign, and a short independent government lasted until Han reconquest in 43.

### Solomon
- Finkelstein/Piasetzky radiocarbon work argues against assigning the later northern monumental state to a vast Solomonic empire and favors a smaller early highland kingdom.
- Faust/Farber's 2025 Cambridge volume emphasizes that the old consensus on a large United Monarchy disappeared but also argues that newer archaeological evidence supports a more nuanced historical United Monarchy.

## 5. New general rule

ATLAS must support:

`Polity identity confidence != Territory reconstruction confidence`

Examples:
- Yamatai: polity defensible, location highly disputed.
- Solomon's Israel: political tradition/historical polity can be retained, scale and boundaries disputed.
- Trưng polity: short-lived political authority defensible, canonical naming needs normalization.

Likewise:

`historiographic period != Polity identity`

Examples:
- New Kingdom
- Old Babylonian period
- Swedish great-power/imperial period

This should become an explicit audit/correction rule before schema mutation.

## 6. Coverage increment

New exact frozen Activity UUIDs audited in this Wave: **8**

Previous covered total: **207 / 309**

New covered total: **215 / 309 = 69.58%**

Frozen rows remaining without any audit decision: **94**

No Production mutation is authorized by this document.
