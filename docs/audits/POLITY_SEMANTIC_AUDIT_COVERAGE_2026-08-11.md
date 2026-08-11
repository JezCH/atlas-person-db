# ATLAS Polity Semantic Audit — Coverage Tracker

> Status: AUDIT ONLY — NO PRODUCTION DB MUTATION
>
> Frozen baseline: 2026-08-05 LIVE audit snapshot
>
> Baseline size: 291 canonical persons / 309 Activity rows

## 1. Purpose

The audit must be provably exhaustive rather than a sequence of memorable examples. Coverage is tracked by exact Activity UUID. Individual Wave documents are the authoritative UUID inventories; this tracker summarizes their unique coverage and remaining work.

No claim of `full audit complete` is allowed until every frozen Activity UUID is covered and the post-2026-08-05 Production delta is reconciled with the same rules.

## 2. Current exact coverage — after Wave 12

- frozen baseline Activity rows: **309**
- Waves 1–7 individually researched/reviewed: **71**
- Wave 8 low-risk rule closure: **96**
- Wave 9 city/local-authority + Shu-Han/Jiaozhou: **13**
- Wave 10 late-Han fragmented authority: **14**
- Wave 11 non-ruler/mobile activity: **13**
- Wave 12 temporal labels + disputed/traditional polities: **8**
- total frozen Activity UUIDs covered: **215 / 309 = 69.58%**
- frozen Activity UUIDs still not covered: **94**
- current Production delta after 2026-08-05: **not reconciled yet**
- Production data mutations performed by this audit: **0**

## 3. Coverage sources

| Wave | Scope | Coverage status |
|---|---|---|
| 1 | government/regime/clan/event pseudo-polity candidates | individually researched |
| 2 | tribal / ethnonym / confederacy candidates | individually researched |
| 3 | composite monarchies / dynasty-state names | individually researched |
| 4 | rebel / transitional authorities | individually researched |
| 5 | polity identity continuity | individually researched |
| 6 | colonial / dependent / constituent authorities | individually researched |
| 7 | previously labeled `normal polity transitions` | individually re-audited |
| 8 | obvious low-risk recognized political entities | rule-based UUID closure |
| 9 | city/local authority + Shu-Han chronology + Jiaozhou | individually researched |
| 10 | late-Han formal-vs-effective authority + Cao Cao anachronism | individually researched |
| 11 | non-ruler / intellectual / religious / activist / traveler relations | individually researched |
| 12 | historiographic/temporal labels + uncertain/traditional political entities | individually researched |

Authoritative files are `POLITY_SEMANTIC_AUDIT_2026-08-11.md` and `POLITY_SEMANTIC_AUDIT_WAVE2...WAVE12_2026-08-11.md` under `docs/audits/`.

## 4. Rules proven unsafe

- `Shogunate => replace with Japan` — unsafe without layered authority research.
- `Dynasty => not a Polity` — false for state labels such as Sui/Ming/Qing/Yuan.
- `Ethnonym => not a Polity` — false for organized peoples/confederacies.
- `Rebellion origin => not a Polity` — false for territorial rival states.
- `Not sovereign => not a Polity` — false for useful colonial/constituent map jurisdictions.
- `City/region name => mere Place` — false for genuine city-states/domains.
- `end A == start B => normal state succession` — false in several continuity/overlap cases.
- `recognized Polity => entire Activity correct` — false; chronology/relation can still be wrong.
- `later successful state name can be projected backward` — false for Shu-Han, Cao Wei, Kievan Rus'.
- `formal allegiance => actual map territory` — false in fragmented empires such as late Han.
- `homeland/state context => whole career polity` — false for mobile biographies.
- `historiographic period => Polity identity` — false for New Kingdom/Old Babylonian and requires review for imperial-period labels.
- `uncertain territory => delete Polity` — false for Yamatai and other evidence-backed but spatially disputed entities.

## 5. Major correction-grade findings already established

- Japan/bakufu/domain hierarchy requires layered modeling.
- Ngawang Lobsang Gyatso: Ganden Phodrang is government context; target Polity requires reconciliation.
- Roman/Byzantine continuity after 395.
- Tsardom of Russia/Russian Empire 1721 likely one underlying polity with state-form/name change.
- RSFSR/USSR is parent-child overlap, not simple rename.
- Bismarck's Prussia and German Empire roles overlap after 1871.
- Yuan/Northern Yuan continuity requires identity review.
- Liu Bei/Guan Yu/Zhuge Liang cannot be labeled Shu-Han from 211.
- Cao Cao cannot be labeled imperial Cao Wei from 196.
- Late-Han formal sovereignty and effective regional authority require separate layers.
- Lakshmibai/Jhansi requires chronology split around annexation/revolt.
- Long careers such as Ibn Battuta/Leonardo/Lafayette need multiple activity contexts.
- Azad Hind requires claimed vs effective/administrative territory separation.
- Hatshepsut's `Egyptian New Kingdom`, Christina's `Swedish Empire`, Hammurabi's `Old Babylonian Empire` require temporal-label/identity normalization.
- Rurik's 862–879 activity must not be back-projected to Kyiv-centered Kievan Rus'.
- Yamatai remains a valid research polity with unresolved geography.
- Meng Huo's `Nanzhong` is a macro-region, not his polity.
- Solomon's polity can be retained as research data while chronology/territorial extent remain disputed.

## 6. Remaining 94-row plan

### Pass G — ordinary residual rows
Apply calibrated rules to remaining rulers, generals, ministers and statespeople. Obvious valid polity relations can close quickly; chronology or identity anomalies move to individual research.

### Pass H — residual relation/chronology anomalies
Any row whose polity is valid but whose period, office, regime or movement across polities is too coarse receives `SPLIT/RELATION_FIX/RESEARCH`, not automatic KEEP.

### Final frozen-set reconciliation
Extract all UUIDs from the frozen source and all Wave documents; compute the exact set difference. Every residual UUID is individually assigned a verdict until frozen coverage reaches **309/309**.

### Current-Production reconciliation
Only after frozen coverage is complete:
1. obtain a fresh normalized Production snapshot;
2. diff against 2026-08-05;
3. audit all new/changed Activity UUIDs with the same rules;
4. refuse correction apply on UUID/before-state drift.

## 7. Hard completion criteria

The frozen audit is complete only when:
- every frozen Activity UUID has an explicit decision;
- every non-KEEP decision has source-backed reasoning;
- identity-continuity cases have explicit continuity categories;
- unresolved cases are `RESEARCH/DEFER`, never guessed;
- Production delta is subsequently reconciled;
- no Production correction is applied before reconciliation.

Until then PR #101 remains draft and audit-only.
