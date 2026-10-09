# POLITY-P2-03E — Brazil Production temporal designation, Polity Source and identity-edge audit

**Evidence timestamp:** 2026-10-09 07:05 UTC / 16:05 KST.
**Status:** P2-03E scoped evidence census and reviewed correction-guard plan **CLOSED**; parent `brazil-regime-family` **REVIEW_REQUIRED** (not a terminal verdict).
**Production read:** [GitHub Actions #37896793082](https://github.com/JezCH/atlas-person-db/actions/runs/37896793082), job `113709866161`, `ATLAS Audit Inventory`, `read_only=true`, `committed=false`; exact Git SHA `0757fb21cf25f93fb1afb8ff08c7d484ee690106`.
**Code:** [PR #2278](https://github.com/JezCH/atlas-person-db/pull/2278) merged, exact OIDC service extension + immutable UUID scope and test. **Vercel:** deployment `dpl_pBRhPArYH5p8jUx2JmVqfkmL3h5M` Production READY for same SHA. No Production canonical write.

## I. Exact scoped identities

- Empire of Brazil: `efcd0f70-bffe-5464-86e3-b28b3658404b`.
- United States of Brazil: `750bf6be-49e9-4215-95ff-a356ba1831cd`.
- Brazil: `a8b27d54-b180-4d51-a664-dd40b3eed08f`.

These are **three distinct** live UUIDs. Earlier [P2-03D](POLITY_P2_03D_BRAZIL_LIVE_PRODUCTION_CENSUS_20261009.md) verified 10 exact Person-Activity UUIDs (Empire 2 / United States of Brazil 1 / Brazil 7) with matching Runtime FK counts, and **17 Person-Activity Source links**. No Person-Activity or polity UUID was modified by this audit.

## II. Production evidence in the same repeatable-read transaction

| Checked table/content | Empire | United States of Brazil | Brazil | Total |
|---|---:|---:|---:|---:|
| `atlas_v2.polity_sources` direct Source links | 1 | 0 | 0 | **1** |
| `atlas_v2.polity_designations` | 0 | 0 | 0 | **0** |
| `atlas_v2.polity_governance_periods` | 0 | 0 | 0 | **0** |

All `atlas_v2.polity_identity_relations` whose predecessor **or** successor is one of these three UUIDs: **0**. There is consequently no existing linked relation evidence for an imperial-to-republic transition or a republican-to-republic successor/continuity edge. The empty result is scoped to these UUIDs, not proof of a global absence.

The only direct Polity Source is attached to **Empire of Brazil**:

- `source_id`: `743df8e9-a7e6-5593-8863-8cf3e3797b9c`
- `source_type`: `repository_dataset`
- `source_key`: `repository-source:pending-records-supplement-2.json:c36e4669946af18222913b8fa6efa8e91608f3ee78d2ba438e4d5a8309de7a75`
- `title`: `pending-records-supplement-2.json`
- `canonical_url`: `null`
- `citation_text`: `null`

It is **not** a direct Brazilian constitutional primary-source link. Neither republican polity has any direct `polity_sources` record. The **17** links from P2-03D belong to `person_politics_sources` (Activity provenance), so they must not be presented as 17 polity-constitutional source records.

The audit also fetched nested designation names and designation sources, relation type and relation sources, and governance Context and source links. Those arrays are all empty because there are no parent records. Full JSON evidence: Actions artifact `brazil-polity-temporal-detail.push.json` and summary `brazil-polity-temporal-summary.push.json`, plus job log lines containing the same evidence.

## III. Historically supported interpretation vs currently modeled data

**Earlier source review** in `docs/POLITY_P2_03_BRAZIL_REGIME_SOURCE_AUDIT_20261009.md` cites Brazil's 1889-11-15 decree and 1891 and 1967 constitutional texts. It supports **separate Empire and Republic constitutional identities**, while treating `United States of Brazil` and `Brazil / República Federativa do Brasil` as **a republican institutional continuity candidate**. The 1967 name/formulation alone is insufficient evidence of sovereign succession to a newly distinct state.

**Crucially:** that source-based interpretation is **not yet modeled** as dated `polity_designations`, `polity_identity_relations`, or approved direct primary `polity_sources` for these UUIDs. Empty designations do not demonstrate historic nonuse of a title; they demonstrate no current dated designation model.

No exact dating precision or names were invented from a silent database field. No identity merge, Activity relink, temporal assertion, Runtime compile, retirement, deletion, or geometry mutation was executed.

## IV. Reviewed, fail-closed correction plan (NOT approval to execute)

**Preferred working hypothesis:** preserve the separate `Empire of Brazil` UUID. For the republican state, use **one surviving Republic Polity with verified temporal titles** rather than splitting a republican identity solely by label. The existing `Brazil` UUID (seven Activities versus one under `United States of Brazil`) is a practical **survivor candidate**, not yet a final reviewed survivor or authorization for transfer.

Before any correction:

1. **Source modeling:** register or link the Brazilian 1889 decree and 1891/1967 constitutional primary texts to the appropriate republican/imperial claims under the supported Source writer; keep actual locator/citation fidelity. Never present the existing repository dataset as an independent constitutional primary source.
2. **Temporal contract:** draft exact reviewed `polity_designations` with source-backed name, designation_type, `valid_from_*` / `valid_to_*` precision, and linked Source UUIDs. Determine start/end bounds from sources; avoid false precision, overlaps, or gap invention. Verify the temporal Activity presentation rule: one containing designation per Activity, else stable preferred name fallback.
3. **Entity and relationship contract:** check republic-continuity semantics, surviving polity key/aliases and canonical role, exact 10 current Activity UUIDs and their Source links, all FK and non-FK references, retired-identity tombstone and ID resolver behavior, external clients, and Runtime row-level semantics. The previously observed zero identity edges does not authorize blind creation of a successor relation representing a state split.
4. **Preflight:** immutable exact-before rows, captured Source/Activity digest, explicit scope, reversible migration or canonical correction writer with dry-run/rollback and no deletion/retirement; test API/UI/runtime projections and compare affected records. A surviving Polity must preserve the 1906–1909 Afonso Pena Activity and its actual precision/source if later transferred.
5. **Authorization gate:** no canonical merge or Activity transfer without an approved reviewed manifest and passing writer preconditions. **Any retirement/deletion remains explicitly user-approval gated** under the project policy. Do not retire the Empire as a mere old name of the republican state.

## V. Completion / next unit

- **P2-03E DONE:** authenticated live temporal/source/identity/governance census + specific gaps + safe correction requirements.
- **Parent stays:** `brazil-regime-family` `REVIEW_REQUIRED`; registry **51 terminal / 75 total, 24 pending**.
- **NEXT EXACT UNIT:** `POLITY-P2-03F` — build source-backed, precisely dated republican temporal designation/Polity provenance assertion plan using existing reviewed Stage 2 Source and Designation contracts and exact Production drift guard. No direct canonical writes or transfer/retirement from the completed P2-03E scope.
- Do not automatically advance to Oman until this Brazil family is resolved or explicitly held with a documented boundary.

