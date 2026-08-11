# ATLAS Polity Semantic Audit — Coverage Tracker

> Status: AUDIT ONLY — NO PRODUCTION DB MUTATION
>
> Frozen baseline: 2026-08-05 LIVE audit snapshot
>
> Baseline size: 291 canonical persons / 309 Activity rows

## 1. Purpose

The audit must be provably exhaustive rather than a sequence of memorable examples. Coverage is tracked by exact Activity UUID. Individual Wave documents are the authoritative UUID inventories; this tracker summarizes their unique coverage and remaining work.

No claim of `full audit complete` is allowed until every frozen Activity UUID is covered and the post-2026-08-05 Production delta is reconciled with the same rules.

## 2. Current exact coverage — after Wave 10

- frozen baseline Activity rows: **309**
- unique Activity UUIDs individually researched/reviewed in Waves 1–7: **71**
- additional low-risk Activity UUIDs rule-closed in Wave 8: **96**
- additional city/local-authority + Shu-Han/Jiaozhou Activity UUIDs audited in Wave 9: **13**
- additional late-Han fragmented-authority Activity UUIDs audited in Wave 10: **14**
- total frozen Activity UUIDs covered: **194 / 309 = 62.78%**
- frozen Activity UUIDs still not covered: **115**
- current Production delta after 2026-08-05: **not reconciled yet**
- Production data mutations performed by this audit: **0**

The first 71 rows were deliberately concentrated in high-risk semantic clusters. Wave 8 used those calibrated rules to close low-risk state-polity rows. Wave 9 established consistent treatment for city/local polities and exposed Shu-Han back-projection. Wave 10 established the required distinction between late-Han formal sovereignty and de facto regional territorial authority, including the high-priority `Cao Cao -> Cao Wei 196–220` anachronism.

## 3. Coverage sources

| Wave | Scope | Coverage status |
|---|---|---|
| 1 | government/regime/clan/event pseudo-polity candidates | individually researched |
| 2 | tribal / ethnonym / confederacy candidates | individually researched |
| 3 | composite monarchies / dynasty-state names | individually researched |
| 4 | rebel / transitional authorities | individually researched |
| 5 | polity identity continuity | individually researched |
| 6 | colonial / dependent / constituent authorities | individually researched |
| 7 | all previously labeled `normal polity transitions` | individually re-audited |
| 8 | obvious low-risk recognized political entities | rule-based UUID closure |
| 9 | city-polity/local authority + Shu-Han chronology + Jiaozhou defer | individually researched |
| 10 | late-Han formal-vs-effective authority + Cao Cao anachronism | individually researched |

Authoritative files:

- `POLITY_SEMANTIC_AUDIT_2026-08-11.md`
- `POLITY_SEMANTIC_AUDIT_WAVE2_2026-08-11.md`
- `POLITY_SEMANTIC_AUDIT_WAVE3_2026-08-11.md`
- `POLITY_SEMANTIC_AUDIT_WAVE4_2026-08-11.md`
- `POLITY_SEMANTIC_AUDIT_WAVE5_2026-08-11.md`
- `POLITY_SEMANTIC_AUDIT_WAVE6_2026-08-11.md`
- `POLITY_SEMANTIC_AUDIT_WAVE7_2026-08-11.md`
- `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md`
- `POLITY_SEMANTIC_AUDIT_WAVE9_2026-08-11.md`
- `POLITY_SEMANTIC_AUDIT_WAVE10_2026-08-11.md`

## 4. Rules now considered unsafe

The completed waves have falsified several tempting bulk rules:

- `Shogunate => government only => replace with Japan` — unsafe without layered authority research.
- `Dynasty => not a Polity` — false for Sui/Ming/Qing/Yuan and similar state labels.
- `Ethnonym => not a Polity` — false for politically organized peoples/confederacies.
- `Rebellion origin => not a Polity` — false for territorial rival states such as Shun and Taiping.
- `Not sovereign => not a Polity` — false for useful colonial/constituent map-level authorities.
- `City/region name => mere Place` — false for Athens, Sparta, Naranjo, Copán, Tétouan, Zazzau and Jhansi.
- `end year A == start year B => normal succession` — false for Prussia/German Empire, RSFSR/USSR, Russia 1721, Roman/Byzantine 395 and likely Yuan/Northern Yuan.
- `recognized Polity => whole Activity automatically correct` — false; valid Polity identity can coexist with wrong chronology or wrong relation semantics.
- `later successful state label can be projected backward over its founder's whole rise` — false; Shu-Han 211 and Cao Wei 196 are direct counterexamples.
- `formal allegiance => actual map territory` — false; late-Han governors/warlords prove that nominal imperial membership and effective regional control must be modeled separately.

## 5. Important unresolved or correction-grade clusters already found

- Japan/bakufu/domain hierarchy — no blind `Shogunate -> Japan` replacement.
- Ngawang Lobsang Gyatso — `Ganden Phodrang` is government context; target Polity must be reconciled before Production apply.
- Roman/Byzantine continuity after 395.
- Tsardom of Russia/Russian Empire 1721 likely same underlying polity with state-form/name change.
- RSFSR/USSR parent-child overlap rather than rename.
- Prussia/German Empire overlap under Bismarck.
- Yuan/Northern Yuan continuity question.
- Liu Bei/Guan Yu/Zhuge Liang pre-221 chronology must not be labeled Shu-Han.
- Cao Cao 196–220 must not be labeled imperial Cao Wei; Han central control and Wei duchy/kingdom phases require reconstruction.
- late-Han regional powers require formal-parent vs effective-control layering.
- Lakshmibai/Jhansi requires split around 1854 annexation and 1857 revolt administration.
- Shi Xie/Jiaozhou remains explicit `RESEARCH`, not guessed.
- Sun Yat-sen/ROC continuous 1912–1925 Activity likely conflates distinct offices/revolutionary phases.
- historiographic-period labels such as Egyptian New Kingdom, Swedish Empire and Old Babylonian Empire still need identity/name review.

## 6. Remaining 115-row plan

### Pass B — remaining non-ruler relation audit

Generals, ministers, philosophers, diplomats, scientists, religious figures and rebels.

Goal:
- preserve valid Polity identity;
- distinguish `rules / serves / active_in / opposes / claims_rule / other`;
- do not convert mere activity context into personal territorial rule.

### Pass E — remaining temporal-name / period-label audit

Examples:
- `Egyptian New Kingdom`
- `Swedish Empire`
- `Old Babylonian Empire`
- other conventional historical-period labels

Goal:
- decide whether each is a true separate Polity identity, a temporal preferred name/state form, or a historiographic label attached to a continuing polity.

### Pass F — remaining unusual regional/traditional cases

Examples:
- `Nanzhong / Meng Huo`
- `Yamatai / Himiko`
- other macro-region, tradition-heavy, or uncertain-polity rows

Goal:
- avoid converting geographic/traditional labels into a polity merely because they currently occupy the Polity column.

### Final residual pass

Any UUID not covered by the above passes is individually reviewed until the frozen set reaches 309/309. Then obtain a fresh Production snapshot and audit only the post-2026-08-05 delta before any correction manifest is written.

## 7. Hard completion criteria

The frozen audit is complete only when:

- every one of the 309 frozen Activity UUIDs has an explicit coverage decision;
- every non-KEEP decision has source-backed reasoning;
- all identity-continuity cases have a continuity category;
- unresolved cases are explicitly `RESEARCH/DEFER`, not silently guessed;
- a fresh Production snapshot is diffed and every post-2026-08-05 Activity is audited;
- no Production correction is applied before reconciliation.

Until then PR #101 remains draft and audit-only.
