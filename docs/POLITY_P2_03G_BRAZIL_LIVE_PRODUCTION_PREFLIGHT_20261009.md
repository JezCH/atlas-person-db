# POLITY-P2-03G — Brazil live Production exact-before, Source-collision and reference preflight

**Status:** scoped P2-03G authenticated READ ONLY Production preflight **CLOSED**, no canonical correction. Parent `brazil-regime-family` remains **REVIEW_REQUIRED**.
**Live evidence:** [GitHub Actions #37918278937](https://github.com/JezCH/atlas-person-db/actions/runs/37918278937), audit job `113779711364`, 2026-10-09 **10:33 UTC / 19:33 KST**; artifact ID `11610348474`, `atlas-audit-full_stage2_baseline-357fee9f2cc5276e3d62221b52144d6d3e58e084`.
**Exact Production deployment:** `357fee9f2cc5276e3d62221b52144d6d3e58e084`, Vercel Production deployment `dpl_FHWLxeoX4fGZ4nr8XCu1fnuvkq2S` **READY**.
**Write contract:** OIDC authenticated, same repeatable-read, READ ONLY DB transaction, `read_only=true`, `committed=false`; no schema/Activity/Source/Designation/Runtime/identity write.

## 1. Implementation and recovery

- Initial [PR #2292](https://github.com/JezCH/atlas-person-db/pull/2292), merged `1cbc9109e34ee1d442fff544cf4c8aaacdb4ae48`, Integrity [#37917853013](https://github.com/JezCH/atlas-person-db/actions/runs/37917853013) SUCCESS: implemented scoped P2-03G exact Activity ownership/year check, raw Activity and Runtime reads, person Activity Source locators, seven exact official URL Source lookups, identity tombstones and schema reference-column discovery. It writes full `brazil-exact-preflight.push.json` and compact summary as workflow artifacts.
- First READ ONLY run [#37917994990](https://github.com/JezCH/atlas-person-db/actions/runs/37917994990) **FAILED CLOSED** before completion due parameter binding shape: seven URL strings supplied individually for one `$1::text[]` placeholder (Postgres: `bind message supplies 7 parameters, but prepared statement requires 1`). This failure is not a successful Production readback and was not a canonical data mutation.
- [PR #2293](https://github.com/JezCH/atlas-person-db/pull/2293), merged `357fee9f2cc5276e3d62221b52144d6d3e58e084`, Integrity [#37918149444](https://github.com/JezCH/atlas-person-db/actions/runs/37918149444) SUCCESS: wrapped all seven Source URLs as **one** array parameter and added an exact-shape regression test. Subsequent main push run [#37918278937](https://github.com/JezCH/atlas-person-db/actions/runs/37918278937) **SUCCESS**; code and Production deployment SHA independently match.

## 2. Exact live observed results

| Observed check | Empire of Brazil | United States of Brazil | Brazil | Total |
|---|---:|---:|---:|---:|
| Authoring Person Activities | 2 | 1 | 7 | **10** |
| Runtime `runtime_person_politics_v1.polity_id` references | 2 | 1 | 7 | **10** |

**Verified 10/10 Activity UUID, polity owner, and start/end years match exact P2-03F before-state.** Missing 0; changed polity/year 0; unexpected extra Activity under any of three identities 0. Current normalized Person-Activity Source links across the three are **17**. Runtime FK/reference **count** parity holds for each; **row-by-row Runtime content parity was intentionally NOT asserted** (`runtime_row_content_parity_checked=false`).

**Seven exact canonical primary-source URLs from P2-03F:** `source_matches.length=0` (zero matching `atlas_v2.sources.canonical_url` records). This does **not** prove the same original publication is absent under another URL, alias, or `source_key`. It does prove no Source UUID may be reused **on the basis of these exact seven canonical URLs**. A new Source assertion must follow the governed Source writer, full source-key/alternate URL collision preflight, bibliography, and required exact-before ID absence; it cannot be declared `approved` simply because this scan returned zero.

**Current identity-retirement records** where retired OR survivor polity ID is one of the three: **0**. Metadata inspection returned **17 schema columns** named polity-related linkage columns; these are possible **reference surfaces**, not a claim of 17 nonzero FK rows. A separate earlier full Polity reference audit enumerates actual counts; avoid blindly moving the sole early Republic Activity without checks on `person_politics_context_polities`, `polity_place_functions`, `territory_records`, spatial dispositions and compile exclusions as well as primary Activity references.

**Source/Designation context:** Prior exact Production [P2-03E](POLITY_P2_03E_BRAZIL_TEMPORAL_SOURCE_IDENTITY_AUDIT_20261009.md) reported direct Polity Sources 1 (Empire repository dataset) / 0 / 0; temporal Designations 0, Identity Relations touching these UUIDs 0 and Governance Periods 0. P2-03G's same-workflow temporal-identity extraction continued to succeed; there is no new claim of any canonical registration from this audit.

The detailed Action artifact contains the exact raw ten Authoring rows, their Source links, the Runtime rows, scoped Source catalog matches, tombstones and schema link column names. The verified compact summary (in `brazil-exact-preflight-summary.push.json`) reports:
`expected=10`, `matched=10`, `missing=[]`, `drift=[]`, `extra=[]`, `runtime_count_parity=true`, `activity_source_links=17`, `exact_url_source_matches=0`, `retired_identity_records=0`, `linked_reference_columns=17`.

## 3. Fail-closed Source/Designation and polity-correction decision

- **Empire remains distinct:** 1889 monarchy→republic rupture is a historical identity boundary; no content-based substring merge.
- **One-Republic continuity is still a reviewed candidate**, not authorized identity consolidation. The seven later-Republic Activities and one Afonso Pena early-Republic Activity remain under existing IDs.
- Afonso Pena 1906–1909 Activity `7a021719-8a81-4367-9fd1-64e75f996563` was observed **unchanged** in the early-Republic UUID; no Activity move or Source link rewrite.
- **No Stage 2 `assert_source` / `assert_polity_designation` payload is approved**: the seven official URL matches yielded no concrete reusable Source IDs; earliest/exclusive transition boundary between official names and `designation_type` are still unresolved, and the current Source writer demands valid ID, source provenance and complete assertion bundles.
- Title naming semantics matter: older `Estados Unidos do Brasil` documented in 1891/1934/1946, later `República Federativa do Brasil` explicit in 1969/1988; 1967 Constitution commencement **1967-03-15** versus 1969 Constitutional Amendment commencement **1969-10-30** are not interchangeable or automatically the first exclusive proper-name date. An open-ended overlapping pair of Designations would cause temporal-name fallback rather than an honest unambiguous Activity label.
- Do **not** run a canonical merger, Activity relink, identity-retirement, deletion, or designation assertion on this evidence alone. Destructive retirement/deletion still needs explicit user approval; all writes require exact-precondition review.

## 4. Completed scope and next starting point

**P2-03G complete:** authenticated current Production same-transaction exact-before, Runtime cardinality, person sources, URL collision and retirement/reference readback; failure recovered with tested and deployed SQL bind fix; evidence checkpointed. This **supersedes only the P2-03F “Production SQL not executed” coverage gap where the new authenticated audit actually implements equivalent checks**; it is not a literal execution of the stand-alone `p2-03f-...sql` file. Do not say the standalone SQL was directly executed.

**Parent registry remains 51 terminal / 75 total, 24 pending; `brazil-regime-family` REVIEW_REQUIRED.**

**NEXT exact unit: `POLITY-P2-03H` — resolve alternate-URL / Source-key duplication and first-exclusive-name documentary boundary; prepare complete, provenance-backed Source assertion(s) and nonoverlapping temporal Designation(s) under the existing Stage 2 canonical writer's approved exact-before contract.** Preserve all ten existing Person Activities; no automatic Brazil republic UUID consolidation, no Oman advance.
