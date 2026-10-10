# POLITY-P2-08E-A — Song polity Source / identity-relation authenticated preflight

**2026-10-11 KST — read-only schema/source gate. No canonical mutation in this unit.**

## Scope

P2-08D left the Song family at generic Song **2** / Northern Song **7** / Southern Song **5** direct Activities, with the two generic reign Activities now independently source-backed. Northern Song still had **0 direct Polity-level Source links** in the last protected census, while the three Song representations had **0 recorded identity-continuity relations**.

This unit does **not** relink the two remaining generic Song Activities, retire/delete generic Song, merge Northern/Southern Song, or invent a dynasty-continuity relation code.

## Model decision already fixed

The historical rupture decision remains:

- Northern Song and Southern Song are separate operated political-entity representations because 1127 produced a major territorial/court/institutional rupture.
- The ruling Zhao Song dynasty nevertheless continued across 1127.
- Therefore a simultaneous structural `polity_relations` assertion is not automatically appropriate. The current structural-relation contract explicitly reserves that table for hierarchy/dependency/constituency relations and says rename/state-form/continuity belongs to identity/designation history.
- The current unified Correction v2 implementation already supports source-linked `assert_polity_identity_relation`, but the **live relation-type vocabulary must be read from Production before selecting a code**.

## Independent scholarly basis to test against the Source catalogue

The authenticated Production preflight searches exact canonical URLs for these Cambridge sources:

1. Lau Nap-yin and Huang K’uan-chung, *Founding and Consolidation of the Sung Dynasty under T’ai-tsu (960–976), T’ai-tsung (976–997), and Chen-tsung (997–1022)*, **The Cambridge History of China**.
   - https://www.cambridge.org/core/books/abs/cambridge-history-of-china/founding-and-consolidation-of-the-sung-dynasty-under-taitsu-960976-taitsung-976997-and-chentsung-9971022/69C8668AF27659D52EBF293C0412504C
2. Ari Levine, *The Reigns of Hui-tsung (1100–1126) and Ch’in-tsung (1126–1127) and the Fall of the Northern Sung*, **The Cambridge History of China**.
   - https://www.cambridge.org/core/books/abs/cambridge-history-of-china/reigns-of-huitsung-11001126-and-chintsung-11261127-and-the-fall-of-the-northern-sung/C1186B649A07ED96C45F2EB2D7318D54
3. Tao Jing-shen, *The Move to the South and the Reign of Kao-tsung (1127–1162)*, **The Cambridge History of China**.
   - https://www.cambridge.org/core/books/abs/cambridge-history-of-china/move-to-the-south-and-the-reign-of-kaotsung-11271162/E39FFED3578CF0BA1B97563FDB46DB1B
4. *Sung government and politics*, **The Cambridge History of China**. The chapter notes Li T’ao’s official-court-history-derived *Long Draft* as a chronological history of the **Northern Sung from 960 through 1127**, and Li Hsin-ch’uan’s work as early Southern Sung history from 1127.
   - https://www.cambridge.org/core/books/cambridge-history-of-china/sung-government-and-politics/B360D3EB6D72ADEE74E46FD8570548EC
5. Nicolas Tackett, *The Origins of the Chinese Nation*, Cambridge University Press. Cambridge describes the **Northern Song Dynasty (960–1127)** as the period studied.
   - https://www.cambridge.org/core/books/origins-of-the-chinese-nation/D3B5D6FDAB2060CEF6C173C797E1557C
6. *Military Institutions as a Defining Feature of the Song Dynasty*, **Journal of Chinese History**. It explicitly characterizes the 1127 Northern/Southern split as an enormous institutional shift while treating both as the Song dynasty.
   - https://www.cambridge.org/core/journals/journal-of-chinese-history/article/military-institutions-as-a-defining-feature-of-the-song-dynasty/D020A447BD8666C3304D7A315CB65DFD

The first source already exists in Production from P2-08C/P2-08D evidence. This preflight determines which of the other exact URLs already have normalized Source rows before any new Source assertion.

## Authenticated read-only additions

The existing Song OIDC audit now returns, in the same repeatable-read read-only transaction:

- exact three Song Polity bundles and current Polity Sources;
- all current Song-family Activities, Activity Sources and Runtime rows;
- all existing Song identity relations;
- **the full live `polity_identity_relation_types` rows** as JSON;
- **the full live structural `polity_relation_types` rows** as JSON for contrast;
- exact Source rows matching the six reviewed Cambridge canonical URLs;
- current information-schema columns for:
  - `polity_identity_relation_types`
  - `polity_identity_relations`
  - `polity_identity_relation_sources`
  - `polity_relation_types`
  - `polity_relations`
  - `polity_relation_sources`
  - `polity_sources`

No `INSERT`, `UPDATE`, `DELETE`, Source allocation, relation UUID allocation or direct Polity Source write is performed.

## P2-08E-A acceptance

The unit is complete only when the merged main workflow succeeds against the exact deployed main SHA and its artifact proves the live rows above.

The follow-up P2-08E write decision must then be made from that artifact:

1. **Northern Song direct provenance:** reuse an existing normalized scholarly Source when exact match exists; otherwise assert one reviewed Source first. Do not direct-SQL into `polity_sources`; use/extend one canonical writer with exact-before semantics.
2. **Identity continuity:** use only a live supported identity-relation type whose semantics actually fit Northern Song → Southern Song / Song dynastic continuity. If no such type exists, do **not** repurpose a structural relation or invent a code inside a data correction; schema/vocabulary review becomes the next unit.
3. **Generic Song:** remains nonempty and non-destructive. Retirement/deletion still requires explicit user approval and is outside this preflight.
4. **No seed-count change:** `song-generic-polity-activity-ownership` remains `PARTIAL_REPAIR` until the source/relation decision and focused Production/Runtime verification are actually complete.


## Authenticated Production result — main `b00be804…`

The first merged P2-08E-A Production request **itself succeeded read-only** on exact deployed main SHA `b00be80471a401a30a6a79b1448a86d82d4864b3`. The workflow was marked failed only because its post-read jq gate still encoded the older P2-07D assumption that Gaozong's two reign Activities belonged to generic Song. Current Production correctly reflects the completed P2-08B/P2-08C/P2-08D sequence: generic Song **2**, Northern Song **7**, Southern Song **5**; Gaozong's two Activities are Southern Song, while generic Song contains only Taizu and Shenzong. The stale gate is corrected in the follow-up acceptance patch; no canonical data were changed.

Read-only artifact attempt 2: GitHub Actions run `38066554389`, artifact `11674794701`, ZIP digest `sha256:922914e69ef444e0520bbda09be3c25b4bb838c32104a33f5f59d92490aa2490`.

### Live relation vocabulary

- `polity_identity_relation_types`: **0 rows**. The identity-relation schema/writer exists, but **Production currently has no supported identity-relation code at all**.
- `polity_identity_relations` involving the three Song Polities: **0 rows**.
- Structural `polity_relation_types`: exactly **5** active codes:
  - `colonial_dependency_of`
  - `constituent_of`
  - `dominion_of`
  - `nominally_subordinate_to`
  - `vassal_of`
- None of those structural dependency/constituency codes expresses Zhao Song dynastic continuity across the Northern/Southern operational rupture. Therefore P2-08E must **not** misuse `polity_relations` for this purpose.

### Live Polity provenance

Direct `polity_sources` rows in the same snapshot:

- generic Song: **2**, both legacy repository datasets;
- Northern Song: **0**;
- Southern Song: **1**, legacy repository dataset.

Exact collision scan over the six reviewed Cambridge URLs found **2 existing normalized Sources**:

1. existing founding/consolidation chapter Source `5496aca8-5198-4887-a348-c66ee25eacfd`;
2. existing Ari Levine *Fall of the Northern Sung* chapter Source `a8766516-351a-4162-b477-0396f468eafe`.

The other four exact Cambridge URLs were absent under those canonical URLs at this snapshot. Thus **Northern Song does not require inventing a new scholarly source merely to obtain direct provenance**: the already-normalized Ari Levine Northern Sung source is an exact reusable candidate. However, no reviewed canonical writer for a direct `polity_sources` link has yet been identified in the current correction surface, so P2-08E-A remains read-only rather than bypassing One Resource, One Writer.

### Consequence for the next unit

The evidence closes the modeling ambiguity for this preflight:

1. **Structural relation:** rejected for Song continuity; live vocabulary is semantically inapplicable.
2. **Identity relation:** conceptually the correct layer, and Correction v2 already has `assert_polity_identity_relation`, but **no live identity-relation type exists**. A relation cannot be asserted until a reviewed controlled-vocabulary type is deliberately introduced through the canonical schema/authoring authority.
3. **Northern Song source:** an exact reusable Cambridge Source already exists, but a canonical direct-Polity-source link operation must be located or added rather than direct SQL.
4. **Generic Song:** stays nonempty and unchanged; no retirement/deletion/relink is authorized.

Therefore the exact next resume point after the fixed acceptance run is **`POLITY-P2-08E-B` — direct Polity Source writer path + identity-relation controlled-vocabulary decision**. It must remain non-destructive; generic Song retirement still requires separate explicit user approval.
