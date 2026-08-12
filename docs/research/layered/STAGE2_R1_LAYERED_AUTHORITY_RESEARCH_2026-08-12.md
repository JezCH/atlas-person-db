# Stage 2 R1 layered-authority research — Rurik / Cao Cao / pre-221 Shu-Han

Status: SOURCE-BACKED MODEL RESOLUTION / NO PRODUCTION WRITE / NO FABRICATED POLITY UUID OR GEOMETRY

Date: 2026-08-12

## Scope

This dossier resolves the layered-authority model behind the R1-C rows that were already known to be historically back-projected but could not safely be corrected under the old one-label model:

- Rurik — current `Kievan Rus'`, 862–879
- Cao Cao — current `Cao Wei`, 196–220
- Liu Bei — current `Shu Han`, 211–223
- Guan Yu — current `Shu Han`, 211–220
- Zhuge Liang — current `Shu Han`, 211–234

The objective is to determine the final **identity class, Person relation, state-form/designation transitions and chronology structure**. This document does not authorize Production writes. Old 346-row Activity UUIDs are evidence locators only and must be rebound to Baseline A before executable Correction v2 manifests are produced.

## Binding rules

1. A later state name must not be back-projected onto an earlier political actor merely because historians connect them genealogically or institutionally.
2. Conversely, a genuine continuous political actor must not be split into multiple fake Polities merely because its title/state form changes.
3. Person relation to an overarching empire and Person relation to an internally constituted/subordinate polity can coexist.
4. `rules`, `governs`, and `serves` are separate facts.
5. State-form/designation history belongs on the Polity timeline; it is not a reason by itself to generate a new Polity UUID.
6. Source-traditional or disputed chronology remains explicitly uncertain.
7. Person Activity never authorizes direct-control geometry by itself.

---

## 1. Rurik — reject 862–879 `Kievan Rus'`; retain only an uncertain early northern Rus authority class

Current evidence row:

- Activity `b651ff3e-0df1-552a-9134-56ca95e9f3be`
- target `Kievan Rus'`
- 862–879

### Source findings

Jonathan Shepard's chapter on the origins of Rus' in *The Cambridge History of Russia* treats the Primary Chronicle's invitation narrative as the chronicle's explanation for the origins of the Rus' land. The chronicle dates the arrival of Riurik and his brothers to around 862 and describes Riurik as ruling northern towns/populations; the same reconstruction places the subsequent southward move toward the middle Dnieper after Riurik, not as a Kyiv-centered state already present throughout Riurik's reign.

The same Cambridge volume deliberately separates `The origins of Rus' (c.900–1015)` from the following chapter `Kievan Rus' (1015–1125)`, emphasizing how sparse and retrospective the native written evidence is for the earlier period.

Janet Martin's Oxford Research Encyclopedia synthesis is even more explicit for the mature state model: the medieval state generally called Kievan Rus' took shape in the late tenth century under Vladimir, while Riurik is described as semi-legendary.

Sources:

- Jonathan Shepard, “The origins of Rus’ (c.900–1015),” *The Cambridge History of Russia*, vol. 1.  
  https://www.cambridge.org/core/books/abs/cambridge-history-of-russia/origins-of-rus-c9001015/30965BBE4E9DE15FEED00EC879D7710A
- Simon Franklin, “Kievan Rus’ (1015–1125),” *The Cambridge History of Russia*, vol. 1.  
  https://www.cambridge.org/core/books/abs/cambridge-history-of-russia/kievan-rus-10151125/D84DCD4BF4D67941D79924E171F84775
- Janet Martin, “Kievan Rus’ and Muscovy Under the Riurikids,” *Oxford Research Encyclopedia of Asian History*.  
  https://academic.oup.com/edited-volume/61799/chapter-abstract/546291388

### Decision

The current `Kievan Rus' 862–879` target is rejected as a retrospective state label.

The evidence does support preserving the **source tradition of an early northern Rus/Riurik political authority**, but it does not justify hardening a modern canonical polity name such as `Kievan Rus'`, `Novgorod`, or `Ladoga` as if the identity and center were uncontested.

Working identity class only:

- `EARLY_NORTHERN_RUS_AUTHORITY`

Production canonical name: `null`  
Production Polity UUID: `null`

### Person relation

If the early northern authority is authored as a reviewed Polity, Rurik's relation is `rules`.

### Chronology semantics

The 862–879 interval is retained only as **chronicle/traditional chronology**, not as modern exact chronology.

Required semantics after Stage 2:

- start/end year may retain 862/879 as the asserted traditional interval;
- chronology status/confidence must explicitly record that the dates and foundational narrative are retrospective/disputed;
- no month/day precision may be fabricated.

### Territory implications

- no Kyiv-centered or Kievan-Rus-wide direct-control geometry may be generated for Rurik;
- northern-town authority described in the chronicle does not prove a precise polygon;
- exact Ladoga/Novgorod center and control boundaries remain historical-research/Territory questions.

### Status

- Kievan Rus back-projection: **RESOLVED / REJECTED**
- early northern political-authority class: **RESOLVED IN PRINCIPLE**
- Rurik relation to that authority: **`rules`**
- chronology precision: **TRADITIONAL / UNCERTAIN**
- canonical Polity identity/name/UUID: **PENDING reviewed authoring**
- Territory intervals/geometry: **PENDING**

---

## 2. Cao Cao — Han central government plus a continuous Wei polity from 213; imperial Wei begins only under Cao Pi

Current evidence row:

- Activity `7eefdc4d-8aec-5689-b4d8-6b1745240581`
- target `Cao Wei`
- 196–220

### Source findings

The *Sanguozhi* records Cao Cao receiving the Han emperor at Luoyang/Xu in 196, receiving high Han offices and controlling the central government thereafter. Whatever the effective balance of power, the Han imperial state formally continued during Cao Cao's lifetime.

A decisive institutional transition occurs in 213. The Han emperor invested Cao Cao as **Duke of Wei**, and the Wei state developed its own altars, ancestral temple and official institutions. In 216 Cao Cao advanced from Duke of Wei to **King of Wei**. These are changes in rank/state form of an already constituted Wei political entity, not yet the imperial Cao Wei dynasty.

When Cao Cao died in 220, Cao Pi inherited the offices of Han Chancellor and King of Wei. Later in the same year Cao Pi accepted the Han abdication and assumed the imperial title, marking the formal imperial Wei succession.

Sources:

- Chen Shou, *Sanguozhi*, `Wei Shu 1`, Annals of Cao Cao.  
  https://ctext.org/sanguozhi/1/zh
- Chen Shou, *Sanguozhi*, `Wei Shu 2`, Annals of Cao Pi.  
  https://ctext.org/sanguozhi/2
- *Cambridge History of China*, introduction to the Qin/Han successor period, for the formal end of Han in 220.  
  https://www.cambridge.org/core/books/cambridge-history-of-china/introduction/F2CE2AF802EE8E6A8EBFC60C27C7E5A6

### Decision: two simultaneous semantic layers after 213

The current 196–220 `Cao Wei` row is anachronistic and must be rebuilt.

#### A. Eastern Han central-government authority — 196–220

Cao Cao exercised the dominant central governmental authority under Emperor Xian while the Han polity formally continued.

- target Polity: Eastern Han
- Person relation: `governs`
- this is governmental authority, **not** a claim that Cao Cao personally `rules` the Han imperial polity as emperor.

The exact Role history may change across Great General / Sikong / Chancellor, but the Person–Polity relation class remains governmental rather than sovereign-imperial rule.

#### B. Wei polity — 213–220

A separate, source-named Wei political entity is explicitly constituted under the Han framework from 213.

- Person relation: `rules`
- structural relationship to Eastern Han: source-defined subordinate/enfeoffed relationship; final relation code should be selected during Stage 2 Polity-relation integration rather than guessed from English feudal vocabulary.

### Polity continuity decision

ATLAS should model **one continuous Wei Polity identity** across these state-form/designation changes unless a later identity audit finds contrary evidence:

- 213–216: Ducal Wei (`魏公國` / Duke of Wei state form)
- 216–220: Royal Wei (`魏王國` / King of Wei state form)
- from Cao Pi's imperial accession in 220: imperial Wei, conventionally `Cao Wei`

This is exactly the kind of case for Polity designation/state-form history: the political actor has institutional succession, while its sovereign rank changes.

Cao Cao's own Person Activity ends with his death before the imperial transition. Therefore:

- Cao Cao **never receives `rules -> imperial Cao Wei`** merely because later historiography posthumously calls him Emperor Wu of Wei.
- Cao Pi, not Cao Cao, is the Person attached to the imperial state-form transition in 220.

### Territory implications

- Eastern Han higher-order political/government context and Wei's own enfeoffed/controlled territory must remain separate layers;
- Cao Cao's military reach across Han territory does not automatically turn the whole Han map into direct Wei territory from 213;
- Wei Territory History must be built from source-backed administrative/territorial control, not from Cao Cao's Person row.

### Status

- 196–220 imperial `Cao Wei` back-projection: **RESOLVED / REJECTED**
- 196–220 Eastern Han governmental layer: **RESOLVED (`governs`)**
- Wei polity existence from 213: **RESOLVED**
- Cao Cao→Wei: **RESOLVED (`rules`, 213–220)**
- 213/216/220 state-form transitions: **RESOLVED at year level**
- continuous Wei Polity identity across duke→king→imperial transition: **REVIEWED MODEL DECISION**
- exact sub-year transition boundaries: **PENDING temporal-source normalization where needed**
- exact structural Polity-relation code/interval: **PENDING Stage 2 integration**
- Territory history/geometry: **PENDING**

---

## 3. Liu Bei polity — continuous political actor through Yi conquest, Hanzhong kingship and 221 imperial Han

Current evidence row:

- Activity `f64072c1-a665-5e09-9581-ab5d8cf766a9`
- target `Shu Han`
- 211–223

### Source findings

The *Sanguozhi* records Liu Bei entering Yi in 211 at Liu Zhang's invitation while leaving Zhuge Liang and Guan Yu to hold his Jing base. In 214 Liu Bei captured Chengdu after Liu Zhang surrendered and took control of Yi. In 219 he secured Hanzhong and his followers elevated him as **King of Hanzhong**. In 221, after Cao Pi's replacement of Han, Liu Bei assumed the imperial title at Chengdu, took the dynastic/state name `Han`, and created the Zhangwu era. Later historiography commonly calls this state `Shu-Han` to distinguish it from other Han regimes.

Sources:

- Chen Shou, *Sanguozhi*, `Shu Shu 2`, Liu Bei biography.  
  https://ctext.org/sanguozhi/32/ens
- Chen Shou, *Sanguozhi*, `Shu Shu 1`, Liu Zhang biography, for the 214 Chengdu surrender.  
  https://ctext.org/sanguozhi/31/zh
- *Zizhi Tongjian*, Jian'an 24, for Liu Bei's 219 Hanzhong kingship.  
  https://ctext.org/wiki.pl?chapter=636352&if=gb
- *Song Shu* ritual record for Liu Bei's 221 imperial accession and Han succession claim.  
  https://ctext.org/wiki.pl?chapter=120046&if=en

### Polity continuity decision

The 211–223 Person Activity should **not** be split merely because the conventional display name `Shu Han` becomes historically appropriate only after 221.

The source record shows a continuing Liu Bei political actor whose territorial base and state form evolve:

- 211–214: existing Liu Bei political authority enters/contests Yi while maintaining Jing holdings;
- 214–219: Yi-centered regional political authority after Chengdu's surrender;
- 219–221: same political actor under the `King of Hanzhong` state-form/designation;
- 221 onward: same political actor claims/assumes imperial Han state form, conventionally distinguished as Shu-Han in modern historiography.

ATLAS should therefore use **one underlying continuous Polity UUID** for the Liu Bei political actor through these transitions, while preserving the historically appropriate designations/state forms by interval.

Working identity class until post-Baseline-A canonical authoring:

- `LIU_BEI_CONTINUOUS_REGIONAL_TO_IMPERIAL_HAN_POLITY`

This working class is not a Production display name.

### Liu Bei Person relation

For the underlying polity:

- 211–223: `rules`

This relation can remain continuous even as the Territory History and state-form/designation change.

### Why this is safer than `Shu Han 211–223`

It preserves continuity without committing either error:

- **back-projection error:** calling the 211 polity imperial Shu-Han;
- **false-split error:** inventing a new Polity UUID in 214, 219 and 221 for what is institutionally/politically the continuing Liu Bei state.

### Structural relation to Eastern Han before 220

The pre-221 polity's ideological and formal relationship to Eastern Han changes over time and is not safely reducible to one blanket `vassal_of` assertion. Liu Bei retained Han offices/legitimacy and in 219 accepted/claimed the Hanzhong kingship through his own coalition's political act; the exact structural relation must therefore be source-normalized by phase.

No generic structural relation is inserted by this research dossier.

### Territory implications

Territory History must encode changing actual control independently:

- pre-entry Jing holdings;
- 211–214 expansion into Yi without back-projecting full Yi control;
- Yi core after 214;
- Hanzhong after 219;
- loss of Jing before the imperial 221 phase.

One continuous Polity UUID does **not** mean one continuous polygon.

### Status

- pre-221 `Shu Han` display back-projection: **RESOLVED / REJECTED**
- continuous Liu Bei polity identity: **RESOLVED IN PRINCIPLE**
- Liu Bei relation: **`rules`**
- 214 / 219 / 221 year-level transitions: **RESOLVED**
- canonical Polity name/UUID: **PENDING Baseline A + identity authoring**
- pre-220 structural relation to Eastern Han: **PENDING phase-specific source normalization**
- exact Territory intervals/geometry: **PENDING**

---

## 4. Guan Yu — service to Liu Bei's continuous polity, not retrospective rule/service of `Shu Han` from 211

Current evidence row:

- Activity `df6cc626-135e-5abc-ae54-6dc1f64ac2aa`
- target `Shu Han`
- 211–220

### Source findings

When Liu Bei entered Yi in 211, Guan Yu remained with Zhuge Liang to hold Jing. After Liu Bei consolidated power and later became King of Hanzhong in 219, Guan Yu received senior general authority under Liu Bei's regime. His Jing command was delegated authority inside Liu Bei's political actor, not a separate Guan Yu polity and not evidence that imperial Shu-Han already existed in 211.

Sources:

- Chen Shou, *Sanguozhi*, Liu Bei biography: https://ctext.org/sanguozhi/32/ens
- Chen Shou, *Sanguozhi*, Guan Yu / related Shu biographies: https://ctext.org/sanguozhi/36/zh

### Decision

- target the same continuous underlying Liu Bei Polity UUID used above;
- Person relation: `serves`;
- do not create a separate Jing Polity merely from Guan Yu's delegated regional command;
- do not let the `serves` Activity imply direct personal ownership of Jing geometry.

The current 211–220 outer interval can be retained at the existing year granularity until the chronology audit normalizes Guan Yu's exact death/loss-of-command boundary. No false month/day is inserted here.

### Status

- retrospective pre-221 Shu-Han target: **REJECTED**
- target identity class: **same continuous Liu Bei polity**
- Person relation: **RESOLVED (`serves`)**
- exact end boundary below year level: **PENDING temporal normalization**

---

## 5. Zhuge Liang — continuous service across the 221 state-form transition

Current evidence row:

- Activity `b16e2fb0-7515-5bd6-8aa0-0f921f55b63f`
- target `Shu Han`
- 211–234

### Source findings

The *Sanguozhi* records Zhuge Liang remaining in Jing when Liu Bei entered Yi, later joining the Yi campaign, and after Chengdu's capture receiving office in Liu Bei's government. In 221, after Liu Bei assumed the imperial title, Zhuge Liang became Chancellor. After Liu Bei's death he continued governing under Liu Shan.

Source:

- Chen Shou, *Sanguozhi*, Zhuge Liang biography.  
  https://ctext.org/sanguozhi/35

### Decision

Because the underlying Liu Bei/Liu Shan polity is modeled as continuous across the 221 state-form transition:

- Zhuge Liang can remain attached to that same Polity UUID across 211–234;
- Person relation: `serves` throughout;
- Role/Governance phases change materially and should be represented separately (pre-221 Liu Bei adviser/administrator; 221+ imperial Chancellor/government head), but Role change does not require a Polity identity change.

After Liu Bei's death, Zhuge Liang's extraordinary governing authority under Liu Shan may require `governs` for a later reviewed phase if the Role/Relation audit concludes that the semantic threshold is met. This dossier does **not** silently rewrite 223–234 to `governs`; it preserves `serves` as the conservative relation until that dedicated review.

### Status

- retrospective pre-221 Shu-Han target: **REJECTED**
- continuous target Polity identity: **RESOLVED IN PRINCIPLE**
- conservative Person relation: **`serves`**
- post-223 `serves` vs `governs` phase refinement: **PENDING dedicated relation review**
- Role phases: **PENDING Stage 2 authoring/backfill**

---

## Consolidated decision table

| Current row | Current target | Final structural disposition | Person relation | Identity/state-form decision | Remaining blocker |
|---|---|---|---|---|---|
| Rurik 862–879 | Kievan Rus' | RELINK to uncertain early northern Rus authority | `rules` | no Kievan-Rus back-projection; traditional chronology | canonical identity + uncertainty/provenance + Territory |
| Cao Cao 196–220 | Cao Wei | SPLIT layered relations | `governs` Eastern Han 196–220; `rules` Wei 213–220 | one Wei Polity, duke 213 → king 216 → imperial under Cao Pi 220 | exact structural relation + temporal normalization + Territory |
| Liu Bei 211–223 | Shu Han | RELINK to continuous Liu Bei polity | `rules` | same polity through 214 Yi consolidation, 219 Hanzhong kingship, 221 imperial Han | canonical identity + pre-220 relation + Territory |
| Guan Yu 211–220 | Shu Han | RELINK to same continuous Liu Bei polity | `serves` | delegated Jing command is not separate polity | exact end chronology |
| Zhuge Liang 211–234 | Shu Han | RELINK to same continuous Liu Bei polity | `serves` conservatively | role/state-form transition at 221 without new polity UUID | post-223 governs review + role phases |

## Machine-action boundary

This dossier resolves the **model** but intentionally does not create executable corrections on the stale 346-row baseline.

After Train 1 captures Baseline A:

1. re-resolve every surviving Person Activity UUID;
2. author/reuse the early northern Rus authority only if the reviewed identity workflow can represent its uncertain historicity and chronology without overstating certainty;
3. reuse/create one Wei Polity UUID and attach state-form/designation history for 213/216/220;
4. author/reuse one continuous Liu Bei polity UUID with state-form/designation history for 219/221;
5. bind Guan Yu and Zhuge Liang as service relations to that same polity;
6. preserve simultaneous Cao Cao Eastern-Han governance + Wei rulership rather than coalescing them as duplicates;
7. only then emit Correction v2 RELINK/SPLIT/RETIRE operations and source-linked assertions;
8. reconstruct Territory History separately.

## Invariants

- no `Kievan Rus'` direct polity for Rurik 862–879;
- no imperial `Cao Wei` Person relation for Cao Cao before/during the 220 succession;
- no imperial `Shu Han` back-projection to 211;
- no new Polity UUID solely because Wei changes duke→king→emperor;
- no new Polity UUID solely because Liu Bei's polity changes regional rule→Hanzhong king→imperial Han;
- no Guan Yu personal ownership of Jing territory;
- no Person Activity is used as Territory geometry;
- no uncertain month/day is fabricated.
