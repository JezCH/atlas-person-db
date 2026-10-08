# Person Domain — 80 originally unclassified Persons: CLOSEOUT

**Status: CLOSED / Production verified (2026-10-08)**  
**Scope:** The exact 80-Person `representative_domain IS NULL` cohort adjudicated on 2026-10-08; **not** a claim that all future registrations will always have a domain.  
**Canonical taxonomy:** [Person Domain Standard v2](../../docs/person/PERSON_DOMAIN_STANDARD_V2.md).

## Current source of truth

Production `atlas_v2.persons`, independently re-read after all approved corrections:

| Metric | Current value |
|---|---:|
| Total Persons | 2,120 |
| Unclassified (`representative_domain IS NULL`) | **0** |
| Governance | 1,435 |
| Military | 223 |
| Religion | 108 |
| Culture | 175 |
| Science | 84 |
| Technology | 33 |
| Commerce | 33 |
| Exploration | 29 |
| Person–Polity Activity rows | 2,495 |

The eight classified domain counts sum to **2,120**. The four Production correction ledger snapshots independently confirm the Person count remained 2,120 and the canonical Activity fingerprint remained unchanged at **2,495 rows / `099f7083702bcaed42fc8749725355dd`** before and after each release.

## Completed corrections — immutable evidence chain

| Sequence | Change | Approved manifest | Production evidence |
|---|---|---|---|
| 1 | Initial 50 reviewed NULLs → assigned domains | [part 1](../../corrections/requests/person-domain-unclassified-80-part1-20261008.v2.json) | [PR #2128](https://github.com/JezCH/atlas-person-db/pull/2128); [Correction Apply run #37710052719 (attempt 2)](https://github.com/JezCH/atlas-person-db/actions/runs/37710052719) |
| 2 | Next 24 reviewed NULLs → assigned domains | [part 2](../../corrections/requests/person-domain-unclassified-80-part2-20261008.v2.json) | Same PR and successful rerun; 74/80 classified, 6 HOLD |
| 3 | Daji, Lady of Huarmey, Yarima: NULL → governance | [six-HOLD follow-up](../../corrections/requests/person-domain-six-holds-followup-20261008.v2.json) | [PR #2132](https://github.com/JezCH/atlas-person-db/pull/2132); [Correction Apply run #37720247493](https://github.com/JezCH/atlas-person-db/actions/runs/37720247493) |
| 4 | Eri: NULL → religion; Javraganak and Atanarjuat: NULL → military | [final three](../../corrections/requests/person-domain-unclassified-final-three-20261008.v2.json) | [PR #2133](https://github.com/JezCH/atlas-person-db/pull/2133); [Correction Apply run #37721573970](https://github.com/JezCH/atlas-person-db/actions/runs/37721573970) |

**Cohort arithmetic:** 50 + 24 + 3 + 3 = **80/80**. `NULL`: **80 → 30 → 6 → 3 → 0**. All four manifests are applied and individually recorded in `atlas_v2.correction_manifest_runs`. The final three exact UUID readbacks matched the intended domains.

## How to interpret the review documents

These review files record **successive decisions**, not separate open backlogs:

1. [Original 80-Person review](unclassified-80-review-20261008.v1.json) — 74 assignments and **six historical HOLDs**.
2. [Six-HOLD follow-up](unclassified-80-six-holds-followup-20261008.v1.json) — resolves three to governance; the remaining **three historical HOLDs** are not the latest state.
3. [Final-three review](unclassified-80-final-three-20261008.v1.json) — supersedes the final HOLD dispositions by explicit user instruction; **zero active HOLDs** for this exact cohort.

**Evidence qualification:** The user-directed `military` classification of **Javraganak** and **Atanarjuat** is an editorial/thematic domain assignment. It **does not establish** independent military command, a formal office, organized army leadership, or proven historicity. **Eri** is classified `religion` on the basis of religious-founder tradition; this does not verify a formal priestly or royal term. The Persons' historicity fields, chronology, titles, Activities and Polity relationships were not changed by these domain corrections.

## Closure / cleanup rules

- **Do not replay** these four already-applied correction requests as a new unsupervised assignment batch.
- **Do not reactivate** obsolete `HOLD` records from the earlier, immutable review checkpoints.
- **Preserve** original reviewed manifests, research evidence, and the Production correction ledger for audit/reproducibility. They are not expendable temporary files.
- **No further changes** to this original 80-Person cohort are pending. If later scholarship changes a conclusion, open a **new** narrowly scoped review with exact Person UUID and current-domain preconditions; do not silently rewrite the historical decision.
- This closeout covers the **Person representative-domain backlog only**. Person Registration, Polity, UI and other workflows have independent acceptance criteria and should not be marked complete on its basis.

**Final verified state:** original 80 unclassified Persons resolved **80/80**; live unclassified Persons **0**; Person and Activity cardinalities and the canonical Activity fingerprint **unchanged**.
