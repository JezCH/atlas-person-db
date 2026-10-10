# POLITY-P2-08E-C — Song dynasty continuity versus Northern/Southern operated Polity identity

**2026-10-11 KST — source-backed model decision GATE, NON-EXECUTABLE; no canonical mutation or vocabulary creation in this unit.**

## Confirmed Source-backed historical facts

1. **Song dynasty lineage continued across the 1127 rupture.** Zhao Gou, Emperor Gaozong, was a son of Huizong and brother of Qinzong; Cambridge describes his restoration of Song imperial authority in the south, inaugurating the Southern Song (1127–1279). **Tao Jing-shen**, *The Move to the South and the Reign of Kao-tsung (1127–1162)*, *The Cambridge History of China*: https://www.cambridge.org/core/books/abs/cambridge-history-of-china/move-to-the-south-and-the-reign-of-kaotsung-11271162/E39FFED3578CF0BA1B97563FDB46DB1B
2. **Institutional/geographical rupture also was real.** The fall of North China to the Jurchen Jin in 1127 coincided with a major transformation of Song government and military institutions, not a spelling/renaming-only shift. **Journal of Chinese History**, *Military Institutions as a Defining Feature of the Song Dynasty*: https://www.cambridge.org/core/journals/journal-of-chinese-history/article/military-institutions-as-a-defining-feature-of-the-song-dynasty/D020A447BD8666C3304D7A315CB65DFD
3. Cambridge's periodization maintains chapters on the fall of the Northern Song in 1127 and the following move south and restoration; neither proves a newly founded unrelated dynasty. **Ari Levine**, *The Reigns of Hui-tsung and Ch'in-tsung and the Fall of the Northern Sung* (already normalized Source `a8766516-351a-4162-b477-0396f468eafe`), alongside Tao Jing-shen.
4. For polity/place temporal integrity, **1127** is the source-supported high-level Northern/Southern transition year; do **not** manufacture transition month/day or conflate it with Lin'an's eventual de facto capital status in 1138. [Source-backed existing P2-07D ruling and accepted decision](POLITY_P2_07D_NORTHERN_SOUTHERN_SONG_CONTINUITY_AND_OWNERSHIP_20261010.md).

**Interpretation:** Preserve TWO distinct *operated territorial-court Polity representations* while affirming ONE continuing Song ruling dynasty. This is not the assertion that Northern and Southern courts simultaneously ruled the same territory or were two vassals of a third Song state. The 1127 North/South rupture seed is already `KEEP_SEPARATE`; do not reopen/merge or use dynasty continuity to nullify the rupture decision.

## Production identity / source state actually verified

- Generic Song `1a1983fd-1850-5756-877c-3d2c17b85e1f`, Northern `407d91cf-7a97-45e3-81ea-d42a3cbfba35`, Southern `fe073a4c-d967-56e2-bb31-f74bdde1af87`.
- [P2-08E-B scholarly link accepted](POLITY_P2_08E_B_NORTHERN_SONG_SOURCE_APPLY_ACCEPTED_20261011.md): existing Northern Song Cambridge Polity Source 0→1, global `polity_sources` 254→255, canonical commit [#38069670948](https://github.com/JezCH/atlas-person-db/actions/runs/38069670948) and exact independent no-insertion replay [#38070277196](https://github.com/JezCH/atlas-person-db/actions/runs/38070277196) both passed.
- [Independent public readback #38070612532](https://github.com/JezCH/atlas-person-db/actions/runs/38070612532), artifact #11677035900: generic **2** (Taizu and Shenzong original activities), Northern **7**, Southern **5** (Gaozong both segments on Southern), all **14 UUID unique**; original source-linked legacy activities not reclassified in P2-08E-B.
- Protected [Production three-Polity preflight #38066554389](https://github.com/JezCH/atlas-person-db/actions/runs/38066554389), artifact #11674794701: `polity_identity_relation_types` **0 rows** and `polity_identity_relations` between three Song Polities **0**. Five live **structural** relation types only: `colonial_dependency_of`, `constituent_of`, `dominion_of`, `nominally_subordinate_to`, `vassal_of`. **These cannot truthfully represent dynastic continuity.**

## Schema & controlled vocabulary blocker — fact, not assumption

The same authenticated Production information-schema read identified:
- `polity_identity_relation_types`: `id uuid NOT NULL`, `code text NOT NULL`, `is_active boolean NOT NULL`. It currently contains **no** active/inactive rows, not an unknown conventional `successor_of`.
- `polity_identity_relations`: `id uuid`, `predecessor_polity_id uuid`, `successor_polity_id uuid`, `relation_type_id uuid`, nullable transition year/month/day/granularity/certainty/calendar, required `confidence`, nullable `notes`.
- `polity_identity_relation_sources`: exactly `polity_identity_relation_id uuid`, `source_id uuid`, required `source_locator_key text`.
- The existing Correction v2 writer **can assert a sourced identity relation only with an already-existing, semantically correct `relation_type_id`**. It cannot assign a nonexistent vocabulary UUID as a shortcut. Direct SQL/vocabulary invention inside a case-level data correction violates canonical write authority.

### Gate to reopen `assert_polity_identity_relation`

Before adding any source-backed relation, complete a **separately reviewed shared controlled-vocabulary and canonical migration/writer decision**:

1. Determine whether the relation should express a **diachronic continuation of the same ruling dynasty across distinct operated Polities**, not a claim that both Polities are **identical** sovereign actors or that Southern Song was a tributary/vassal/constituent of Northern Song.
2. Define precise forward/inverse semantics and direction `Northern Song → Southern Song`; test against other already reviewed continuity/rupture cases (for example Western/Eastern Jin) before introducing a reusable code. `dynastic_continuation` is a **hypothetical candidate name only — NOT an accepted Production relation type**. Historical dynasty lineage may warrant a separate lineage authority if the predecessor/successor table cannot encode it without semantic distortion.
3. Establish real Source evidence for **both** sides: the already-normalized Ari Levine Northern Song chapter and separately source-reviewed Tao Jing-shen Southern restoration scholarship. Prior exact six-URL census found Tao's exact URL absent; **this is not proof no semantic alternate Source exists**. Check live `sources` catalog and duplicates/aliases before any new bibliographic Source assertion.
4. If an accepted relation type and source provenance exist, author a **single separately reviewed source-linked Correction v2 identity assertion** with actual UUIDs, exact-before constraints, **transition YEAR 1127 ONLY**, no invented day/month. Run canonical dry-run and protected single write, immutable artifact, independent live replay, public/runtime/relationship readback.
5. Otherwise retain **documented unresolved vocabulary/lineage relation**; this scoped operation cannot be truthfully marked `FIXED` by adding a misleading structural `constituent_of` relation.

**No user authorization exists to retire/delete generic Song or to reassign Taizu/Shenzong Activities.** These two activities have legitimate original identity/source history and remain untouched unless individually reviewed under an explicit authorizing decision.

## Parent/global closure unchanged

P2-08E-B (Northern Song *direct Source*) **COMPLETE**. P2-08E-C (*dynastic relation/umbrella semantics*) **OPEN**. Parent `song-generic-polity-activity-ownership` **PARTIAL_REPAIR**, **not terminal**. #1895 registry stays **75 tracked / 63 terminal / 12 REVIEW_REQUIRED**. Continue independently executable remaining seeds and required acceptance blockers (Japan tombstones, Place authoritative database, France legacy approvals, Sweden designation), then a **fresh all-Production unseeded identity/source/duplicate/temporal/KO-collision census** and **Authoring→Runtime parity**; P14 geometry remains parked.
