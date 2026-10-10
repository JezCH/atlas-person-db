# POLITY-P1-03R-A1 — Production DB authority and historical Place manifest preflight

**Checked:** 2026-10-10 (KST)  
**Work unit:** `POLITY-P1-03R-A1` — bounded read-only verification.  
**Verdict:** `PRODUCTION_DEPLOYMENT_VERIFIED / MANIFEST_INTERNAL_INTEGRITY_PASS / PRODUCTION_DATABASE_IDENTITY_UNPROVEN / REMEDIATION_BLOCKED`.  
**No Production mutation, migration, deployment, secret disclosure or retired one-shot restart.**

## 1. Why this checkpoint is necessary

The predecessor [POLITY-P1-03 audit](POLITY_P1_03_PLACE_AUTHORITY_AUDIT_20261008.md) found a **specific connected Supabase database** missing all 20 manifest Place IDs, 27 Source IDs and 23 PolityPlaceFunction facts; its 13 target Polities existed. That was a direct **2026-10-08** database audit, **not** a newly rerun `2026-10-10` Production query. The target Vercel Production `SUPABASE_DB_URL` was not proven to point to that same database.

The correction must not run against an assumed target. The missing tables are not evidence that P14 Territory Geometry should be restarted; P14 remains `PARKED_BY_USER / DO_NOT_AUTO_RESUME`.

## 2. Current deployment/environment metadata verified

- Vercel project: `atlas-person-db`, ID `prj_ChgAVAisvAgiKAxcKyYWqhtyrIky`, account `team_h3ZxGffGJaDsU1DInUHV6hhD`.
- Observed Production deployment: `dpl_GB559RZXM2XkjxsyPpw1fXLe2MDr`; target `production`, state `READY`; GitHub repository `JezCH/atlas-person-db`, ref `main`, SHA `0c9746028efa307d69580df08a18dfcf040af8b8`. **This is the observed deployment, not a permanent/future pin.**
- Vercel Production environment configuration contains the **sensitive** key `SUPABASE_DB_URL`; the connected Vercel tool with decrypt request returned **no usable value** and no PostgreSQL target identity. No username/password/host/connection URL was written to this report.
- The prior connected-Supabase audit used project ref `wfrbxltvpmlprgwfysxq`. **Matching the Vercel deployed target to that ref is still unproven.** Vercel project/deployment readiness, code SHA and variable presence do **not** imply target equivalence.
- The current tool suite does not expose an authorized read-only SQL session bound to the exact Vercel Production server process. No new live UUID census was therefore claimed here.

## 3. Repeated bounded **source-manifest** integrity checks (not DB checks)

**Immutable input:** [`data/core/polity-place-function-authority-backfill.v1.json`](../data/core/polity-place-function-authority-backfill.v1.json), Git blob SHA `0931a02956d332e4afa239f1ab3b1418c87f7e31`, `backfill_id=core-reentry-08-place-authority-20261001`.

| Manifest invariant | Measured in source | Result |
| --- | ---: | --- |
| Exact target Polity IDs | 13 unique | PASS |
| Historical Place IDs | 20 unique | PASS |
| Source IDs | 27 unique | PASS |
| Place-function facts | 23 | PASS |
| Fact Polity references resolved **within manifest IDs** | 23/23 | PASS |
| Fact Place references resolved **within manifest IDs** | 23/23 | PASS |
| Place → Source evidence edges | 28 | PASS |
| Fact → Source evidence edges | 31 | PASS |
| Source references resolved within manifest | 59/59 | PASS |
| Distinct referenced Polities / Places / Sources | 13 / 20 / 27 | PASS |
| Duplicate Place/source canonical keys or duplicated fact semantic tuples | 0 | PASS |
| Invalid fact year ranges or year zero | 0 | PASS |

The 23 roles are `capital` 19, `political_center` 2, `imperial_court_core` 2. All 20 Places and all 27 Sources are referenced somewhere. These results prove **only** that the retained source file is internally connected at this revision. They do **not** prove that its facts remain historically correct, that source IDs/names do not collide with live Production, that its 20 Place identities are appropriately granular, or that any row has been deployed.

**Review-sensitive composite Place keys:** `kublai-court-north-china-shangdu-dadu` and `mongolian-imperial-court-core-avarga-karakorum` encode more than one geographic reference in a Place identity. This is **not** an automatic correctness failure or authorization to split data; review current Place semantics and historical source evidence during P1-03R-B before apply.

## 4. Exact safe restart — POLITY-P1-03R-A2 (authority gate)

This gate is still **open**. The next worker should complete a **single scoped proof**, without a global queue or collateral database edits:

1. Select the **then-current actual Vercel Production deployment**, not the historical deployment above. In a trusted execution context of that deployed app, establish the **configured PostgreSQL target project identity** from `SUPABASE_DB_URL` without printing/storing credentials or the URL. If a pooler/indirect host prevents positive identification, explicitly return `INDETERMINATE` rather than guessing.
2. Using a **read-only** connection to that exact deployed Production target, query UUID-scoped existence/identity of 13 Polities, 20 Places and 27 Sources, and the 23 expected canonical Place-function semantic facts plus normalized Source/Place join rows. Compare with the current manifest revision, including name/source-key collisions, not just total-table counts. Return only counts, mismatched **nonsecret UUIDs**, an evidence timestamp and the deployment reference.
3. If a separate connected-Supabase project is still used for evidence, verify that it **is the same database target** before transferring its zero-row conclusion to Production. If not proven, remain **`AUTHORITY_UNPROVEN`** and do not prepare a writer payload as though a live census passed.
4. Only if the target is positively identified should P1-03R-B independently review historical identity, source licensing/provenance, composite-place granularity and any existing canonical collisions, then prepare an idempotent writer plan. Require current exact-before-state and current authoritative writer; **never** resurrect #1899-deleted one-shot transport, make speculative Polity reassignments, or delete identities without user authorization.
5. After a separately approved and genuinely executed canonical write, P1-03R-C owns one scoped read-back plus Runtime/display projection parity. **Do not mark repair complete on the basis of this A1 report.**

## 5. Parallel non-interference and closeout

- The source of truth remains [current workstreams](ATLAS_CURRENT_WORKSTREAMS.md) and [Polity issue #1895](https://github.com/JezCH/atlas-person-db/issues/1895); this report is **evidence only**, not another global tracker.
- Concurrent Oman identity review, UI design work, Person registration and YouTube discovery are independent; **no file or state owned by those lanes was changed**.
- **Closed unit:** P1-03R-A1 source-integrity and deployment-metadata preflight.
- **Unfinished acceptance blocker:** P1-03R-A2 proof of exact Production DB identity and current UUID census; P1-03R-B historical/collision review; P1-03R-C apply and verified read-back remain gated.
