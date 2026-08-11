# ATLAS Polity Semantic Audit — Coverage Tracker

> Status: AUDIT ONLY — NO PRODUCTION DB MUTATION
>
> Frozen baseline: 2026-08-05 LIVE audit snapshot
>
> Baseline size: 291 canonical persons / 309 Activity rows

## 1. Purpose

The audit must be provably exhaustive rather than a sequence of memorable examples. Coverage is tracked by exact Activity UUID. Individual Wave documents are the authoritative UUID inventories; this tracker summarizes their unique coverage and remaining work.

No claim of `full audit complete` is allowed until every frozen Activity UUID is covered and the post-2026-08-05 Production delta is reconciled with the same rules.

## 2. Current exact coverage — after Wave 8

- frozen baseline Activity rows: **309**
- unique Activity UUIDs individually researched/reviewed in Waves 1–7: **71**
- additional low-risk Activity UUIDs rule-closed in Wave 8: **96**
- total frozen Activity UUIDs covered: **167 / 309 = 54.05%**
- frozen Activity UUIDs still not covered: **142**
- current Production delta after 2026-08-05: **not reconciled yet**
- Production data mutations performed by this audit: **0**

The first 71 rows were deliberately concentrated in high-risk semantic clusters. Wave 8 then used those calibrated rules to close low-risk state-polity rows without repeating full-biography research for obvious political entities.

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

Authoritative files:

- `POLITY_SEMANTIC_AUDIT_2026-08-11.md`
- `POLITY_SEMANTIC_AUDIT_WAVE2_2026-08-11.md`
- `POLITY_SEMANTIC_AUDIT_WAVE3_2026-08-11.md`
- `POLITY_SEMANTIC_AUDIT_WAVE4_2026-08-11.md`
- `POLITY_SEMANTIC_AUDIT_WAVE5_2026-08-11.md`
- `POLITY_SEMANTIC_AUDIT_WAVE6_2026-08-11.md`
- `POLITY_SEMANTIC_AUDIT_WAVE7_2026-08-11.md`
- `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md`

## 4. Rules now considered unsafe

The completed waves have falsified several tempting bulk rules:

- `Shogunate => government only => replace with Japan` — unsafe without layered authority research.
- `Dynasty => not a Polity` — false for Sui/Ming/Qing/Yuan and similar state labels.
- `Ethnonym => not a Polity` — false for politically organized peoples/confederacies.
- `Rebellion origin => not a Polity` — false for territorial rival states such as Shun and Taiping.
- `Not sovereign => not a Polity` — false for useful colonial/constituent map-level authorities.
- `end year A == start year B => normal succession` — false for Prussia/German Empire, RSFSR/USSR, Russia 1721, Roman/Byzantine 395 and likely Yuan/Northern Yuan.
- `recognized Polity => whole Activity automatically correct` — false; valid Polity identity can coexist with wrong chronology or wrong relation semantics.

## 5. Important new exclusions discovered during Wave 8

These rows were deliberately not bulk-closed:

- `Liu Bei -> Shu Han, 211–223` — starts before the Shu Han imperial polity was formally established.
- `Guan Yu -> Shu Han, 211–220` — Guan Yu died before Shu Han's imperial foundation; current Polity/date pairing is anachronistic as written.
- `Yuan Shu -> Zhong Dynasty, 197–199` — short-lived claimant state requires transitional-authority review.
- `Hammurabi -> Old Babylonian Empire` — political authority is real, but the exact historiographic Polity identity/name needs review.
- `Sun Yat-sen -> Republic of China, 1912–1925` — valid Polity but the continuous Activity conflates distinct offices/revolutionary phases.
- `Hatshepsut -> Egyptian New Kingdom` — historiographic-period label requires identity/name review.
- `Christina of Sweden -> Swedish Empire` — historiographic great-power-period label requires continuity/name review.
- `Himiko -> Yamatai` — candidate polity with unresolved location/nature/historicity issues.
- Maya/Greek city-polity cases (`Palenque`, `Naranjo`, `Copán`, `Athens`, `Sparta`, etc.) require one consistent city-polity rule; Pakal was closed in Wave 8 because the map project already has a dedicated Palenque polity model, while the remaining city-polity rows are reserved for the dedicated pass.

## 6. Remaining 142-row plan

### Pass B — non-ruler relation audit

Generals, ministers, philosophers, diplomats, scientists, religious figures and rebels.

Goal:
- preserve a valid Polity identity;
- distinguish `rules / serves / active_in / opposes / claims_rule / other`;
- do not convert mere activity context into personal territorial rule.

### Pass C — city-polity / local-domain audit

Athens, Sparta, Copán, Naranjo, Tetouan, Zazzau, Jhansi, Jiaozhou and similar labels.

Goal:
- distinguish true city-states/kingdoms/domains/jurisdictions from mere geographic or administrative place names.

### Pass D — late-Han and comparable fragmented-authority audit

Goal:
- distinguish nominal service to an imperial polity from de facto regional rule and emergent rival Polities;
- fix anachronistic later-state labels such as the current Shu Han rows where necessary.

### Pass E — remaining temporal-name / period-label audit

Examples:
- `Egyptian New Kingdom`
- `Swedish Empire`
- `Old Babylonian Empire`
- other conventional historical-period labels

Goal:
- decide whether each is a true separate Polity identity, a temporal preferred name/state form, or a historiographic label attached to a continuing polity.

## 7. Hard completion criteria

The frozen audit is complete only when:

- every one of the 309 frozen Activity UUIDs has an explicit coverage decision;
- every non-KEEP decision has source-backed reasoning;
- all identity-continuity cases have a continuity category;
- unresolved cases are explicitly `RESEARCH/DEFER`, not silently guessed;
- a fresh Production snapshot is diffed and every post-2026-08-05 Activity is audited;
- no Production correction is applied before reconciliation.

Until then PR #101 remains draft and audit-only.
