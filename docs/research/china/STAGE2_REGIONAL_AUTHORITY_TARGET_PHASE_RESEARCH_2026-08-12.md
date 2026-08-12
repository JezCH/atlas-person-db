# Stage 2 regional authority target/phase research — Late Han and Late Yuan

Status: SOURCE-BACKED RESEARCH / NO PRODUCTION WRITE / NO FABRICATED POLITY NAME OR GEOMETRY

Date: 2026-08-12

## Scope

This dossier continues the six rows left explicitly research-gated by `STAGE2_REGIONAL_AUTHORITY_DECISIONS_2026-08-12.md`:

- Liu Yan — Eastern Han, 188–194
- Yuan Shao — Eastern Han, 189–202
- Ma Teng — Eastern Han, 189–212
- Liu Biao — Eastern Han, 190–208
- Lü Bu — Eastern Han, 192–198
- Fang Guozhen — Yuan Dynasty, 1348–1367

The purpose is to narrow **regional political-actor identity, Person relation, chronology and nominal-superior relation intervals**. It is not a Territory polygon reconstruction. Any exact canonical Polity name/UUID that cannot be justified from the current reviewed evidence remains `null` until the post-Baseline-A authoring pass.

## Binding rules

1. A province/commandery is not promoted to Polity merely because a powerful governor held it.
2. A personal/family name is not automatically the canonical Polity name.
3. A person can successively serve the imperial government, rule a regional polity, rebel, return to formal service, and accept nominal titles; those are separate Activities/relations.
4. `nominally_subordinate_to` represents de jure/formal superior authority coexisting with substantial autonomous territorial power. It does not transfer direct-control geometry to the superior.
5. A military campaign, office title, or claim does not itself prove direct territorial control.
6. The stale 346-row UUIDs below are evidence locators only. Production correction UUIDs must be rebound after Baseline A.

---

## 1. Liu Yan — formal Yi governor → autonomous Yi regional authority

Current evidence row:

- Activity `15777776-b739-5988-9a04-472b2d6629c7`
- Eastern Han
- 188–194

### Source findings

The *Book of the Later Han* records that Liu Yan proposed strengthening provincial governorships and was appointed Yi Province `zhoumu` in 188. The same biography says that after arriving he pacified the region while secretly pursuing a different political design (`陰圖異計`).

The critical chronological break is strongly source-backed. In 191 Liu Yan sent Zhang Lu/Zhang Xiu against the Han administrator of Hanzhong; the resulting force severed the route and killed Han envoys. Later historical compilations preserve the same 191 episode. This is materially different from ordinary delegated provincial government.

A modern specialist study by Niitsu Ken'ichiro, *A Study of Provincial Governors in the Late Eastern Han as Seen through the Cases of Liu Yan and Liu Zhang in Yi Province* (*Tōyōshi Kenkyū* 80.1, 2021), analyzes the Liu Yi governorship as a late-Han provincial-governor governing formation with combined administrative and military authority rather than a mere office label.

Sources:

- *Book of the Later Han*, Liu Yan biography, Chinese Text Project: https://ctext.org/hou-han-shu/liu-yan-yuan-shu-lv-bu/zh
- 191 Hanzhong episode preserved in historical compilation: https://ctext.org/wiki.pl?chapter=78297&if=en
- Kyoto University repository, Niitsu Ken'ichiro (2021): https://repository.kulib.kyoto-u.ac.jp/items/6a30a955-27ef-4062-ae8d-bfce7d4f0433

### Decision

The coarse 188–194 Person→Eastern-Han row must split.

#### Phase A — 188–190

- political context: Eastern Han
- Person relation: `serves`
- role/governance: Yi provincial governor (`zhoumu`)
- no new regional Polity is required for this early formal phase solely from the office title.

#### Phase B — 191–194

- Liu Yan's de facto Yi political-territorial authority is historically substantive and should be represented through a source-backed regional Polity identity rather than as direct rule of the whole Eastern Han.
- Person relation to that regional Polity: `rules`
- candidate structural relation: regional Polity `nominally_subordinate_to` Eastern Han, because Liu Yan retained Han-derived office/legitimacy while exercising autonomous authority and severing effective central access.

Working identity class only: `LIU_YAN_YI_REGIONAL_POLITY`. This is **not** a Production canonical name.

### Boundary precision

The year-level 191 transition is source-backed. No month/day is hardened here.

### Territory implications

The Territory layer must separately reconstruct:

- Yi core control;
- the Hanzhong break and Zhang Lu authority;
- areas controlled by local magnates/rebels;
- any claimed or nominal Han superior authority.

Do not paint all Eastern Han territory as Liu Yan's direct control.

### Status

- structural split: **RESOLVED**
- year-level transition: **RESOLVED at 191**
- regional Polity existence: **RESOLVED**
- canonical Polity name/UUID: **PENDING Baseline A + identity authoring**
- exact Territory intervals/geometry: **PENDING**

---

## 2. Yuan Shao — Ji-based northern regional polity, not Eastern Han itself

Current evidence row:

- Activity `36a3ade9-b108-5358-8732-be7b3f6637f9`
- Eastern Han
- 189–202

### Source findings

The *Book of the Later Han* records Yuan Shao's anti-Dong-Zhuo coalition role and then the decisive change in 191: Han Fu yielded Ji Province and Yuan Shao assumed the governorship. Yuan Shao then built a territorial power centered on Ji.

The same biography explicitly records his later allocation of Qing, You and Bing provincial commands to Yuan Tan, Yuan Xi and Gao Gan, and the Han court's conferral/recognition of high military office over the northern provinces. Primary-text summaries describe him as Grand General overseeing Ji, Qing, You and Bing. This is a regional political authority using Han offices and legitimacy, not personal direct rule of the whole Han empire.

Sources:

- *Book of the Later Han*, Yuan Shao biography: https://ctext.org/hou-han-shu/yuan-shao-liu-biao-lie-zhuan-shang/zh
- *Records of the Three Kingdoms*, Yuan Shao biography index/source: https://ctext.org/sanguozhi
- primary-text author/source summary citing *Hou Hanshu* 74A / *Sanguozhi* 6: https://zh.wikisource.org/wiki/Author:%E8%A2%81%E7%B4%B9

### Decision

The coarse 189–202 Person→Eastern-Han `Warlord` row must be replaced by at least two semantic phases.

#### Phase A — 189–190

Yuan Shao was still operating through Han-derived command/office and the anti-Dong coalition. This phase does not yet justify back-projecting the later four-province regional polity.

- Person→Eastern Han: `active_in` or `serves` must be finalized from the exact role contract during Stage 2 integration.
- no later northern-territorial geometry may be back-projected into this phase.

#### Phase B — 191–202

A distinct Ji-centered Yuan Shao regional political actor is justified from the takeover of Ji until his death.

- Person relation to the regional Polity: `rules`
- structural relation candidate: regional Polity `nominally_subordinate_to` Eastern Han
- reason: Yuan Shao continued to use/receive Han offices and framed his authority in Han legitimacy while exercising independent regional military and administrative power.

Working identity class only: `YUAN_SHAO_NORTHERN_REGIONAL_POLITY`. No fabricated Production name is authorized.

### Territory chronology

The polity's territory is **not** a fixed four-province block from 191.

Minimum compiler rule:

- Ji is the core from 191;
- Qing/You/Bing control is later and must be reconstructed by meaningful change intervals;
- You cannot be treated as fully controlled before the defeat of Gongsun Zan in 199;
- named provincial appointments to relatives/subordinates do not automatically prove every county of those provinces was direct-controlled.

### Status

- regional Polity existence: **RESOLVED**
- beginning of Ji-based regional polity: **RESOLVED at 191 year-level**
- Person relation to own Polity: **RESOLVED (`rules`)**
- nominal-Han structural relation class: **RESOLVED in principle**
- 189–190 exact Person relation label: **PENDING integrated Role/Relation review**
- canonical Polity name/UUID: **PENDING Baseline A + identity authoring**
- province-by-province Territory intervals/geometry: **PENDING**

---

## 3. Ma Teng — regional military authority with interrupted Han alignment and a final central-office phase

Current evidence row:

- Activity `42274e4c-af35-503f-a14f-e7460489b252`
- Eastern Han
- 189–212

### Source findings

The *Records of the Three Kingdoms* biography of Ma Chao preserves the essential chronology for Ma Teng. Ma Teng rose with western rebels late in Emperor Ling's reign. In Chuping 3 (192) Ma Teng and Han Sui came to Chang'an; the Han court appointed Ma Teng General Who Subdues the West and stationed him at Mei. Ma Teng later attacked Chang'an, was defeated, and withdrew to Liang Province. He subsequently cooperated with Han/Cao authorities in western campaigns.

The same primary biography records the decisive final transition: after conflict with Han Sui, Ma Teng requested/accepted return to the capital region and was summoned as `Weiwei`; Ma Chao received command of Ma Teng's troops. This removes Ma Teng himself from the regional territorial command before his execution in 212.

Sources:

- *Records of the Three Kingdoms*, Ma Chao biography: https://ctext.org/sanguozhi/36/zh
- *Records of the Three Kingdoms*, Dong Zhuo biography passage on Ma Teng/Han Sui surrender and western commands: https://ctext.org/sanguozhi/6

### Decision

The 189–212 continuous `Warlord` row is invalid and must split. The evidence does **not** support forcing one unbroken `nominally_subordinate_to` interval across the whole pre-208 period because Ma Teng alternated between rebellion, Han-granted command, renewed attack, regional autonomy and cooperation.

#### Phase A — regional western authority before final court service

- a source-backed Ma Teng regional military-territorial authority exists before 208;
- Person relation to that authority: `rules` where he actually commanded the regional force/political base;
- formal Han title intervals may support `nominally_subordinate_to -> Eastern Han`, but the interval must exclude source-proven renewed rebellion/attack phases rather than being blindly continuous.

Working identity class only: `MA_TENG_WESTERN_REGIONAL_POLITY`.

#### Phase B — 208–212 central court service

The primary source supports a semantic break when Ma Teng relinquished his regional force to Ma Chao and entered court as `Weiwei`.

- Person target: Eastern Han
- Person relation: `serves`
- no Ma-Teng direct territorial geometry after this transfer merely because Ma Chao continued to command the old force.

### Boundary precision

208 is source-backed at year level for the final court-service transition. Exact month/day remains unhardened here.

### Status

- one-row 189–212 model: **REJECTED**
- pre-208 regional political authority: **RESOLVED**
- 208–212 central `serves` phase: **RESOLVED**
- exact earlier rebellion/title/nominal-subordination subphases: **STILL RESEARCH-GATED**
- canonical regional Polity name/UUID: **PENDING Baseline A + identity authoring**
- Territory intervals/geometry: **PENDING**

---

## 4. Liu Biao — durable Jing regional authority under Han legitimacy

Current evidence row:

- Activity `583d7e8d-ed63-5a7e-947a-2a3c43f8dfad`
- Eastern Han
- 190–208

### Source findings

The *Book of the Later Han* records Liu Biao's appointment to Jing in 190 and the difficult process of establishing effective control amid local armed powers. It later records that after Li Jue's entry into Chang'an, Liu Biao sent tribute and was appointed General Who Pacifies the South and Governor (`zhoumu`) of Jing, enfeoffed and granted a staff of authority.

The biography then records a durable territorial administration: after suppressing Zhang Xian's three-commandery revolt, Liu Biao's controlled area expanded, with large armed forces and a broad north-south territorial reach. His son succeeded to the regional political base after his death, demonstrating that this was more than a transient office assignment.

Sources:

- *Book of the Later Han*, Liu Biao biography: https://ctext.org/hou-han-shu/yuan-shao-liu-biao-lie-zhuan-xia/zh
- B. J. Mansvelt Beck, “The fall of Han,” *The Cambridge History of China*: https://www.cambridge.org/core/books/abs/cambridge-history-of-china/fall-of-han/CFB7AEDDD40ACD9BB0A76CFE4ADA3318
- Rafe de Crespigny, *An Outline of the Local Administration of the Later Han Empire*: https://researchportalplus.anu.edu.au/en/publications/an-outline-of-the-local-administration-of-the-later-han-empire/

### Decision

A source-backed Liu Biao Jing regional political actor is justified. `Jing Province` as a mere administrative string must not simply be copied into the Polity table; the canonical identity must represent Liu Biao's durable regional authority and be source-authored after Baseline A.

- Person relation to own regional Polity: `rules`
- candidate structural relation: regional Polity `nominally_subordinate_to -> Eastern Han`
- evidence for the nominal-superior layer includes accepted Han offices, tribute and continued Han legitimacy while Liu Biao exercised autonomous territorial government.

Working identity class only: `LIU_BIAO_JING_REGIONAL_POLITY`.

### Activity interval

The existing 190–208 person-activity span can remain as a research-level outer interval for Liu Biao's Jing authority. It must not imply that every later-controlled area was already direct-controlled in 190.

The Territory layer, not the Person Activity, must express the expansion/consolidation chronology.

### Status

- regional Polity existence: **RESOLVED**
- Person relation: **RESOLVED (`rules`)**
- 190–208 outer Activity interval: **RETAINABLE**
- nominal-Han structural relation class: **RESOLVED in principle**
- canonical Polity name/UUID: **PENDING Baseline A + identity authoring**
- Territory expansion intervals/geometry: **PENDING**

---

## 5. Lü Bu — mobile service separated from Yan and Xu territorial authority

Current evidence row:

- Activity `5b4fa9a3-ca6f-5e6b-a417-874f31b10650`
- Eastern Han
- 192–198

### Source findings

The *Book of the Later Han* and *Records of the Three Kingdoms* make a single 192–198 territorial-polity interpretation untenable.

After killing Dong Zhuo in 192, Lü Bu held Han central military office under Wang Yun. Li Jue's forces then drove him from Chang'an. He subsequently moved among Yuan Shu, Yuan Shao and Zhang Yang rather than continuously controlling a territorial state.

In 194, with support from anti-Cao forces, Lü Bu seized substantial authority in Yan Province, but Cao Cao recovered the territory by 195. Lü Bu then sought refuge with Liu Bei. In 196 he seized Xu Province from Liu Bei and maintained a new territorial base until Cao Cao defeated him at Xiapi in 198/early 199.

Sources:

- *Book of the Later Han*, Lü Bu biography: https://ctext.org/hou-han-shu/liu-yan-yuan-shu-lv-bu/zh
- *Records of the Three Kingdoms*, Lü Bu biography index/source: https://ctext.org/sanguozhi

### Decision

The continuous 192–198 Eastern-Han `Warlord` row must be retired and rebuilt as multiple Activities.

Minimum semantic phases:

1. **192 central Han/Wang-Yun phase** — Person→Eastern Han governmental/military service after Dong Zhuo's death.
2. **192–194 mobile dependency/service phase** — no stable own territorial Polity should be fabricated merely from Lü Bu's armed following.
3. **194–195 Yan territorial-authority phase** — a real de facto regional territorial authority exists; Person relation to that authority is `rules`.
4. **195–196 displaced/refuge phase** — no direct territorial polity should be carried forward through dispossession by inertia.
5. **196–198 Xu territorial-authority phase** — a real de facto regional territorial authority exists; Person relation `rules`.

### Polity-identity caution

This research does **not** yet harden whether the 194–195 Yan authority and 196–198 Xu authority are two Polity identities or two disjoint territorial phases of one continuing Lü-Bu political actor. The personal military following provides continuity evidence, but loss of territorial authority and intervening dependency make this an identity question rather than a string question.

Therefore no `Lü Bu State` is authorized.

### Nominal Han relation

A `nominally_subordinate_to -> Eastern Han` assertion may be valid for one or more territorial phases where Lü Bu retained/received Han office or legitimacy, but exact intervals must be established from the official biographies before insertion. It is not applied generically to all 192–198.

### Status

- coarse 192–198 row: **REJECTED**
- need for separate mobile / Yan / displaced / Xu phases: **RESOLVED**
- Yan and Xu territorial-authority existence: **RESOLVED**
- same-vs-distinct Polity identity across Yan/Xu: **PENDING dedicated identity review**
- exact phase boundaries below year level: **PENDING**
- nominal-Han relation intervals: **PENDING**
- Territory geometry: **PENDING**

---

## 6. Fang Guozhen — eastern Zhejiang autonomous polity with repeated/overlapping nominal submissions

Current evidence row:

- Activity `8198cad1-dc14-5c1e-9b01-ddbddc447da7`
- Yuan Dynasty
- 1348–1367

### Source findings

The late-Yuan/Ming record is exceptionally clear that a single Person→Yuan `Warlord` relation is wrong.

The historical narrative records Fang Guozhen's uprising in 1348. By 1353 Yuan authorities accepted his submission, but a contemporary/near-contemporary narrative explicitly says that although he accepted Yuan office, he retained his own troops, did not obey Yuan mobilization, and was merely handled through loose control; he soon rebelled again and occupied Wen, Tai and Qingyuan circuits.

By 1355–1356 Fang again accepted Yuan appointments while continuing to dominate eastern Zhejiang. The Yuan court granted increasingly high titles, while Fang retained autonomous regional power. This is a textbook fit for the semantics of `nominally_subordinate_to`, not direct Yuan control.

From 1359 the model becomes more complex: Fang also tendered submission/tribute and territorial registers to Zhu Yuanzhang while still accepting later Yuan appointments and continuing to control his own coastal territory. The sources describe deliberate balancing between competing superior powers. In 1367 Zhu's forces finally conquered the regional base and Fang surrendered.

Sources:

- *Ming Shi Jishi Benmo*, “Fang Guozhen's Surrender,” Chinese Text Project: https://ctext.org/wiki.pl?chapter=292789&if=gb
- `國初群雄事略`, Fang chronology with 1353/1354 submissions and renewed conflict: https://ctext.org/wiki.pl?chapter=810883&if=en
- Chinese Text Project Fang Guozhen source index/biographical record: https://ctext.org/datawiki.pl?if=gb&res=745630

### Decision

A source-backed Fang Guozhen eastern-Zhejiang regional political actor is justified. It must not be represented as direct rule of Yuan territory, nor should all 1348–1367 be one uninterrupted nominal-Yuan relation.

Working identity class only: `FANG_GUOZHEN_EASTERN_ZHEJIANG_POLITY`.

Minimum phase model:

#### Phase A — 1348–1352 insurgent/maritime phase

- uprising against Yuan
- do not assume a mature land-territorial Polity polygon merely because the armed movement existed
- Person→Yuan relation is conflict/opposition context, not `rules` of Yuan.

#### Phase B — 1353–1354 unstable submission/rebellion transition

- Yuan submission/office is documented, but so is continued independent force and renewed rebellion.
- this requires short interval modeling rather than one blanket relation.

#### Phase C — 1355–1358 eastern-Zhejiang autonomous territorial rule under Yuan titles

- Person relation to Fang regional Polity: `rules`
- structural relation: regional Polity `nominally_subordinate_to -> Yuan Dynasty`
- Territory must be reconstructed from actual held circuits, not from the Yuan office title.

#### Phase D — 1359–1367 multi-allegiance autonomous rule

- Fang retains his regional territorial polity.
- sources support nominal dealings/submissions with both Zhu Yuanzhang's emerging regime and Yuan at different/overlapping moments.
- the data model must permit multiple time-bounded superior relations rather than forcing a single exclusive superior.
- exact Yuan-versus-Ming relation intervals remain to be reconstructed before Production assertions.

End condition: 1367 military defeat and surrender terminates Fang's autonomous regional polity.

### Status

- autonomous eastern-Zhejiang regional polity existence: **RESOLVED**
- 1348–1367 single Yuan Activity: **REJECTED**
- 1355–1358 `nominally_subordinate_to Yuan` class: **RESOLVED**
- post-1359 multi-allegiance requirement: **RESOLVED**
- exact short submission/rebellion intervals and overlapping superior relations: **PENDING chronology normalization**
- canonical Polity name/UUID: **PENDING Baseline A + identity authoring**
- Territory geometry: **PENDING**

---

## Consolidated phase decisions

| Person | Coarse current row | Source-backed disposition | Own territorial Polity | Person relation | Major remaining blocker |
|---|---|---|---|---|---|
| Liu Yan | Eastern Han 188–194 | split 188–190 formal Han / 191–194 regional authority | yes, later phase | `serves` then `rules` | canonical identity + Territory |
| Yuan Shao | Eastern Han 189–202 | pre-191 Han context / 191–202 Ji-based regional polity | yes | pre-191 pending exact label; then `rules` | canonical identity + changing northern Territory |
| Ma Teng | Eastern Han 189–212 | regional authority + interrupted alignment / 208–212 central service | yes, pre-208 | `rules` then `serves`; earlier relation intervals need refinement | earlier subphase chronology |
| Liu Biao | Eastern Han 190–208 | durable Jing regional polity under Han legitimacy | yes | `rules` | canonical identity + Territory expansion |
| Lü Bu | Eastern Han 192–198 | central/mobile/Yan/displaced/Xu phases | yes for Yan/Xu phases | `rules` in territorial phases | same-vs-distinct Polity identity + exact intervals |
| Fang Guozhen | Yuan 1348–1367 | insurgent/submission/autonomous/multi-allegiance phases | yes from mature territorial phase | `rules` | exact 1353–1367 superior-relation chronology |

## Net research result

The original six-row regional blocker can no longer be treated as six wholly unknown model cases. This dossier closes the **existence/class** of regional political authority for all six and establishes several year-level phase boundaries, while intentionally retaining the residual identity/chronology/Territory questions that sources do not yet justify hardening.

Closed at model level:

- Liu Yan later Yi regional polity existence and 191 transition.
- Yuan Shao Ji-based regional polity existence and 191 beginning.
- Ma Teng pre-208 regional authority plus 208 central-service transition.
- Liu Biao durable Jing regional polity existence.
- Lü Bu need for separate mobile/Yan/Xu authority phases.
- Fang Guozhen eastern-Zhejiang regional polity and multi-allegiance semantics.

Still open before executable Correction v2:

- canonical reviewed names/UUIDs after Baseline A;
- Ma Teng's exact early rebellion/title subphase intervals;
- Lü Bu same-vs-distinct Polity identity across Yan and Xu plus exact nominal-Han intervals;
- Fang Guozhen's exact 1353–1367 superior-relation interval normalization;
- all detailed Territory change intervals and geometry.

No unresolved item may be silently filled by a generated state name, province-name substitution, or year interpolation.

## Post-Baseline-A porting rule

After Production Train 1 captures Baseline A:

1. resolve surviving Activity UUIDs for all six persons from Baseline A;
2. author/reuse regional Polity identities only from reviewed source terminology;
3. bind the year-level phase decisions above to those identities;
4. finish only the explicitly residual chronology/identity reviews;
5. reconstruct Territory history independently;
6. emit Correction v2 `RELINK` / `SPLIT` / `RETIRE` and structural Polity-relation assertions with normalized provenance.
