# Stage 2 historical-research-first residual resolution

Status: SOURCE-BACKED RESEARCH / NO PRODUCTION WRITE / NO FABRICATED POLITY OR GEOMETRY

Date: 2026-08-12

## Scope

This dossier closes or sharply narrows the nine residual historical-research-first cases remaining after the Sengoku and regional-authority research passes:

- Brennus (Senones)
- Shi Xie
- Leftraru / Lautaro
- Sacagawea
- Sitting Bull
- Poundmaker
- Dido / Elissa
- Tecumseh parallel Shawnee row
- Boudica

The six-type Relation contract remains binding: `rules`, `governs`, `serves`, `active_in`, `opposes`, `claims_rule`. No new vague `leads` relation is introduced. Role and relation remain separate. Person Activity never creates personal Territory geometry.

Old normalized Activity UUIDs below are evidence locators from the pre-Baseline-A inventory only. They must be rebound after Production Train 1 creates Baseline A.

---

## 1. Brennus — Senones political community valid; ruler semantics remain traditional-source qualified

Evidence Activity: `164635b5-0930-5601-94d1-c9dd86bffa4d`

The Senones are independently attested as a Gallic political/tribal community in Italy. Oxford Classical Dictionary describes them as the Gallic tribe associated by the literary tradition with the band that captured Rome in 390 BCE. The surviving Brennus narrative is late and highly traditionalized; older biographical reference works likewise warn that little is securely known beyond the invasion narrative.

Sources:

- Oxford Classical Dictionary, `Senones`: https://academic.oup.com/edited-volume/61673/chapter-abstract/550496105
- Perseus, *Dictionary of Greek and Roman Biography and Mythology*, `Brennus`: https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.04.0104%3Aentry%3Dbrennus-bio-1

### Decision

- `Senones` remains a defensible Polity target; no relink is required merely because it is a tribal polity.
- The current role `Chieftain` supports a **reviewed `rules` relation candidate only inside the traditional/classical-source assertion layer**.
- The system must not silently upgrade the late literary Brennus tradition to high-confidence biographical fact.
- Existing year bounds remain source-traditional/approximate rather than exact chronology.
- Senones Territory remains approximate and source-dependent; the Rome campaign route or occupied city is not the same thing as home-territory direct control.

Operational disposition: `KEEP_POLITY + RULES_WITH_TRADITIONAL_PROVENANCE` after Stage 2 provenance/historicity semantics can preserve the epistemic qualifier.

---

## 2. Shi Xie — administrative service plus regional autonomy; do not invent `Jiaozhou` as a Polity

Evidence Activity: `4d543d48-a041-5f07-a900-560a50abaeee`

The *Sanguozhi* biography states that Shi Xie became administrator of Jiaozhi. During regional disorder his brothers also held neighboring commanderies. After the Han inspector was killed, Han authority formally appointed Shi Xie to supervise the seven commanderies while retaining his Jiaozhi office; the biography also stresses that he continued sending tribute to the Han court despite disrupted communications. In Jian'an 15 (210), Sun Quan sent Bu Zhi as Inspector of Jiaozhou and Shi Xie and his brothers accepted his authority. Sun Quan then granted Shi Xie further titles, hostages were sent, and tribute continued.

Primary sources:

- *Sanguozhi*, Wu Shu 4, Shi Xie biography: https://ctext.org/sanguozhi/49
- Han appointment over seven commanderies: https://ctext.org/text.pl?if=gb&node=604039&show=parallel
- 210 submission to Sun Quan / later titles and tribute: https://ctext.org/text.pl?if=gb&node=604040&show=parallel

### Decision

The current historical problem is **not evidence for a new polity named `Jiaozhou`**. Jiaozhou is an administrative region and must not be auto-promoted to Polity.

Required semantics:

1. Shi Xie's formal Han-era office is `serves` in the imperial political context, with the regional office carried by Role/Governance metadata rather than `governs -> whole Eastern Han`.
2. The 210 submission is a real political-context transition and the coarse single-row model must be able to split there.
3. The post-210 target cannot be guessed as retrospective imperial `Eastern Wu` if the relevant Sun Quan political actor/state identity has not yet been normalized for 210. It must bind to the reviewed Sun-Quan/Wu continuity model after Baseline A.
4. Shi-family local autonomy may warrant a separate regional-authority assertion or Governance layer, but the primary sources do not justify inventing a `Shi Xie State` name.

Operational disposition: `SPLIT_REQUIRED`; pre-210 relation class `serves`; post-210 relation class remains `serves` to the correct normalized Sun-Quan political context once its identity timeline is available. Regional-autonomy representation remains a Governance/territorial-authority modeling item, not a fabricated Polity-name shortcut.

---

## 3. Leftraru / Lautaro — Mapuche is too aggregate; war leadership belongs to a source-backed wartime coalition/context

Evidence Activity: `c0987b73-203c-5b49-9d84-8d96ce0e44e9`

Chilean archival and historical material identifies Leftraru/Lautaro as a toqui, a wartime leader. The same tradition describes Mapuche political organization as composed of smaller local units and larger wartime aggregations rather than one permanent centralized `Mapuche` state. The historically meaningful leadership phase is associated with the anti-Spanish war in the 1550s, not an automatic 1541–1557 rule over every Mapuche community.

Sources:

- Archivo Nacional de Chile / Servicio Nacional del Patrimonio Cultural, Lautaro biographical material: https://www.archivonacional.gob.cl/galeria/lautaro
- Memoria Chilena, Lautaro / Guerra de Arauco materials: https://www.memoriachilena.gob.cl/602/w3-article-93704.html

### Decision

- broad `Mapuche` as a unitary Polity target is rejected for this Activity.
- no blanket Mapuche Territory polygon is allowed.
- the source-backed political context is a **wartime coalition/aggregation** formed from local Mapuche political units.
- because `toqui` is primarily the wartime command Role and does not by itself prove sovereign head-of-polity status, conservative Relation = `serves` unless later source review proves that the specifically authored coalition treated this toqui as supreme de facto political authority for the interval.
- the currently broad 1541 start must not be retained as coalition leadership by inertia; the source-backed Lautaro leadership phase is in the 1550s and requires chronology normalization.

Operational disposition: `RELINK_AND_RETIME_REQUIRED`; canonical wartime-coalition identity/name remains null until source-bound authoring. Relation defaults to reviewed conservative `serves`, not a new relation enum.

---

## 4. Sacagawea — remove from Person–Polity semantics; preserve People affiliation and Expedition participation

Evidence Activity: `c73146d6-0558-502f-8e81-11343e41f963`

The National Park Service identifies Sacagawea as Lemhi Shoshone by origin and as a participant in the Corps of Discovery. Her connection to the Lemhi Shoshone in the expedition story is kinship/people affiliation and language/cultural knowledge, not political office or rule over a Lemhi Polity.

Sources:

- NPS, Sacagawea: https://www.nps.gov/people/sacagawea.htm
- NPS, Lewis & Clark National Historic Trail, Sacagawea: https://www.nps.gov/lecl/learn/historyculture/sacagawea.htm
- NPS, Shoshone: https://www.nps.gov/jeff/learn/historyculture/shoshone.htm

### Decision

- the current Lemhi Shoshone Activity is `OUT_OF_POLITY_MODEL`.
- do not force any of the six Person–Polity relations onto it.
- preserve `Lemhi Shoshone / Agaidika` as People/affiliation evidence.
- preserve `Corps of Discovery` as Event/expedition participation and biographical context.
- once Person–People/Event authoring exists, migrate the evidence there and retire the incompatible Person–Polity Activity.

Operational disposition: `MIGRATE_OUT_OF_POLITY_MODEL`; no fake political relation, no fake Lemhi polity polygon.

---

## 5. Sitting Bull — `Lakota` is too aggregate; autonomous non-treaty following ends with 1881 surrender

Evidence Activity: `b4a6b048-9465-539a-bc4b-ec50a057b594`

NPS identifies Sitting Bull as Hunkpapa Lakota, a major spiritual/political leader, and specifically as a leader of the non-treaty Indians. NPS also describes the Hunkpapa as one Lakota village/band grouping rather than the whole Lakota nation. After Little Bighorn, Sitting Bull led followers into Canada. By 1881 his following had fractured and he surrendered at Fort Buford; subsequent life was reservation life and does not justify carrying forward the same autonomous political authority to 1890.

Sources:

- NPS, Sitting Bull: https://www.nps.gov/libi/learn/historyculture/sitting-bull.htm
- NPS, Hunkpapa and Sihasapa: https://www.nps.gov/libi/learn/historyculture/hunkpapa-and-sihasapa.htm
- NPS, Little Bighorn chronology: https://www.nps.gov/libi/learn/a-chronology-of-the-battle-of-the-little-bighorn.htm

### Decision

- broad `Lakota` target is rejected as too aggregate for personal rulership semantics.
- a source-backed **autonomous non-treaty Hunkpapa/Lakota political following** is a defensible political-actor class for the pre-surrender period; final canonical identity/name remains null rather than inventing `Sitting Bull State`.
- for that narrowly authored political actor, `rules` is justified only for an interval in which Sitting Bull is evidenced as its head/supreme political authority.
- year 1881 is a hard outer boundary for autonomous `rules` after surrender.
- the existing 1868 start is not hardened by this dossier; it requires source-normalized leadership chronology.
- 1881–1890 is People/reservation/biographical context, not continued autonomous Person–Polity rulership by default.

Operational disposition: `RELINK_AND_RETIME_REQUIRED`; end autonomous relation by 1881; start boundary and canonical actor identity remain research/authoring items.

---

## 6. Poundmaker — broad Cree row starts too early; own-band rulership begins after Treaty 6

Evidence Activity: `062c9186-2981-5745-9b60-ae733a2fc86d`

The Dictionary of Canadian Biography records Poundmaker as a councillor/minor chief under Red Pheasant at the 1876 Treaty 6 negotiations. Two years later, when Red Pheasant settled, Poundmaker formed his own band; in 1879 that band accepted a reserve at Battle River/Cut Knife Creek. University of Saskatchewan material similarly places his emergence as chief of his own community after Treaty 6. This makes a continuous 1873–1885 `Chief -> Cree` row structurally inaccurate.

Sources:

- Dictionary of Canadian Biography, PĪTIKWAHANAPIWĪYIN: https://www.biographi.ca/en/bio/5783?revision_id=30402
- University of Saskatchewan, Indigenous Saskatchewan Encyclopedia, Poundmaker: https://teaching.usask.ca/indigenoussk/import/poundmaker_c_1842-86.php
- Government of Canada exoneration statement for contextual oral-tradition evidence: https://www.pm.gc.ca/en/news/speeches/2019/05/23/statement-exoneration-chief-poundmaker

### Decision

- broad `Cree` target is rejected as too aggregate for the whole Activity.
- 1876 evidence places Poundmaker under Red Pheasant's band as a minor chief/councillor, not yet sovereign head of his own band.
- from approximately 1878, a source-backed Poundmaker band/community political actor exists; relation to his own band = `rules`.
- pre-own-band political activity, if retained in Person–Polity form, should target the actual Red Pheasant band/community and use conservative `serves`, not back-project Poundmaker's later own-band authority.
- final canonical Polity names/UUIDs for both communities must be source-authored after Baseline A.
- current 1873 start cannot be carried into own-band `rules`.

Operational disposition: `SPLIT_AND_RELINK_REQUIRED`; pre-own-band context vs own-band rulership separated; Territory attached to the appropriate band/community, not all Cree territory.

---

## 7. Dido / Elissa — retain only as explicitly legendary/traditional rulership assertion

Evidence Activity: `76fe49de-1cda-5a22-8629-657c85433b0c`

Oxford Classical Dictionary explicitly classifies Dido as the **legendary queen of Carthage** and summarizes the ancient Elissa/Dido foundation tradition. This is not ordinary high-confidence biography even though Carthage itself is a historical polity.

Source:

- Oxford Classical Dictionary, `Dido`: https://academic.oup.com/edited-volume/61673/chapter-abstract/548725644

### Decision

- do not delete the record merely because the person is legendary; ATLAS deliberately preserves legend/myth separately from historical persons.
- target Carthage remains historically meaningful.
- within a **legendary/traditional assertion layer**, relation = `rules`, role = Queen/founder as source tradition warrants.
- the assertion must carry legendary/traditional historicity and provenance so Runtime cannot present it as equivalent to a well-established historical ruler.
- traditional foundation chronology must remain qualified rather than silently treated as exact factual dates.

Operational disposition: `KEEP_AS_LEGENDARY_ASSERTION`; `rules` is semantically correct only with the epistemic/historicity qualifier preserved.

---

## 8. Tecumseh parallel Shawnee row — political authority belongs to the Confederacy; broad Shawnee row is affiliation unless a specific political community is sourced

Evidence Activity: `932998e2-839b-5818-99bb-37221498cadd`

NPS describes Tecumseh as a Shawnee leader who built an intertribal confederacy from 1808 onward, established a headquarters at Prophetstown, represented allied Native interests in negotiations, and later allied his confederacy with Britain. The existing `Tecumseh's Confederacy` Activity is therefore the political-authority row. A parallel broad `Shawnee` row risks duplicating political authority while mixing People affiliation with Polity semantics.

Sources:

- NPS, Tecumseh negotiations / Confederacy: https://www.nps.gov/articles/tecumseh.htm
- NPS, Indigenous Peoples and War of 1812: https://www.nps.gov/subjects/warof1812/indigenous-peoples.htm
- Library of Congress, William Henry Harrison timeline: https://www.loc.gov/collections/william-henry-harrison-papers/articles-and-essays/timeline/

### Decision

- keep the reviewed Confederacy political actor as the authority-bearing target.
- broad `Shawnee` must not receive an additional `rules` relation merely because Tecumseh was ethnically/politically Shawnee.
- unless a specific Shawnee town/division/community Polity and interval are independently source-bound, the parallel Shawnee row is `OUT_OF_POLITY_MODEL` People affiliation.
- preserve Shawnee affiliation in Person–People/identity evidence rather than duplicating the Confederacy row.

Operational disposition: `MIGRATE_PARALLEL_SHAWNEE_ROW_OUT_OF_POLITY_MODEL` unless later source-bound research identifies a specific Shawnee political community distinct from the Confederacy.

---

## 9. Boudica — Iceni is valid; `rules` and `opposes` must be represented as separate directional Activities

Evidence Activity: `2f18a41d-6f4e-541d-b549-32ec505e8c53`

The Stage 2 Relation Semantics Contract already uses Boudica as the canonical decomposition example:

- `Boudica -> Iceni -> Queen -> rules`
- `Boudica -> Roman authority -> revolt/opposition role -> opposes`

Academic literature likewise treats the Iceni as the political community associated with the revolt, while discussion of Boudica's exact title and the literary construction of her queenship warrants ordinary source caution rather than deleting the polity relationship.

Sources:

- ATLAS Relation Semantics Contract v1: `docs/audits/RELATION_SEMANTICS_CONTRACT_V1_2026-08-12.md`
- Cambridge, *Britannia*, `Queen Boudicca?`: https://www.cambridge.org/core/journals/britannia/article/queen-boudicca/23931DBBBD0A060E528AC08C3D14DAE5
- Cambridge, *Britannia*, `The Date of Boudicca's Revolt`: https://www.cambridge.org/core/journals/britannia/article/abs/date-of-boudiccas-revolt/EA204B52038619CF3898786B5555EA82

### Decision

- `Iceni` remains a valid Polity target.
- Boudica→Iceni relation = `rules` under the reviewed ATLAS contract.
- revolt against Rome is a second Activity/context relation = `opposes`; do not encode both meanings in one compound relation.
- the wider anti-Roman revolt coalition is Event/confederated context and must not turn into a fictitious Britain-wide Boudica polity.
- exact revolt chronology can be normalized independently without changing this relation model.

Operational disposition: `KEEP_ICENI_RULES + ADD_OR_BACKFILL_SEPARATE_OPPOSES_CONTEXT_WHEN_TARGET_MODEL_READY`.

---

## Consolidated result

| Case | Final model result | Relation disposition | Remaining blocker |
|---|---|---|---|
| Brennus | Senones valid; traditional-source qualification required | `rules` candidate with traditional provenance | chronology/historicity provenance + Territory |
| Shi Xie | no Jiaozhou polity invention; 210 context split | pre-210 `serves`; post-210 `serves` to reviewed Sun-Quan context | target continuity binding + regional-authority representation |
| Leftraru | broad Mapuche polity rejected; wartime coalition/context | conservative `serves` as toqui pending stronger supreme-authority proof | coalition identity + retiming + Territory |
| Sacagawea | People affiliation + Expedition Event, not Polity Activity | none | Person–People/Event migration path |
| Sitting Bull | narrow non-treaty Hunkpapa/Lakota political following; end by 1881 | `rules` only for source-proven autonomous leadership interval | start boundary + canonical actor identity + Territory |
| Poundmaker | split Red Pheasant-band context vs own band from ~1878 | pre-own-band `serves`; own band `rules` | exact community identities + interval precision |
| Dido | legendary Carthage assertion preserved | `rules` with legendary/traditional qualifier | normalized historicity/provenance |
| Tecumseh Shawnee parallel | Confederacy remains authority row; Shawnee broad row becomes affiliation | no duplicate Shawnee `rules` | Person–People migration or specific community evidence |
| Boudica | Iceni valid; Roman opposition separate | `rules` + separate `opposes` | exact chronology / target-normalization only |

## Queue impact

The previous nine residual historical-research-first cases are no longer nine undifferentiated unknowns.

Model-level results:

- relation/polity model substantially resolved: Brennus, Boudica, Dido;
- structural split/relink model resolved but exact target binding remains: Shi Xie, Leftraru, Sitting Bull, Poundmaker;
- explicitly moved outside Person–Polity model unless better identity evidence appears: Sacagawea, Tecumseh parallel Shawnee row.

Residual work is now **specific** rather than generic historical research:

1. Baseline A UUID rebinding;
2. source-bound canonical Polity/community identity authoring where required;
3. exact chronology refinements for Leftraru, Sitting Bull, Poundmaker and Shi Xie context transition;
4. Person–People/Event migration support for affiliation-only cases;
5. Territory interval/geometry reconstruction only after identity is stable;
6. legendary/traditional historicity/provenance binding for Dido and traditional-source qualification for Brennus.

No generic `HISTORICAL_RESEARCH_FIRST` relation may be silently defaulted to `rules` or any other relation.

## Post-Baseline-A porting rule

After Train 1 captures Baseline A:

1. re-resolve each surviving Activity UUID;
2. apply `KEEP` decisions only where the canonical target survives unchanged;
3. author/reuse specific political-community identities before RELINK/SPLIT;
4. migrate affiliation-only rows out of Person–Polity semantics rather than forcing relation backfill;
5. preserve legendary/traditional assertions in their own epistemic layer;
6. add relation types only to surviving, structurally valid Activities;
7. reconstruct Territory separately from Person Activity.
