# POLITY-P2-03D — Brazil fresh Production census (2026-10-09)

**Status:** P2-03D scoped live census CLOSED; parent `brazil-regime-family` REVIEW_REQUIRED.
**Authoritative evidence:** GitHub Actions authenticated OIDC READ ONLY run [#37895503960](https://github.com/JezCH/atlas-person-db/actions/runs/37895503960), log from job `113705828296`, 2026-10-09 06:49 UTC (15:49 KST).
**Exact deployment:** `08288318d4286f0224f5f81dc44290ca0458db5d` — independently observed Vercel Production READY.
**Baseline digest:** `sha256:d2cb478063cfd7e65a6740ba1b145df5bfa3781a604058cbdaa7b9355bd60645`.
**Write contract:** `read_only=true`, `committed=false`; no Polity/Person/Activity/Source/Runtime/Geometry mutation.

## 1. Exact Production identities and reference counts

| Polity | Live UUID | Authoring Activity | Runtime polity references | Normalized Person-Activity Source links | Owned / external references |
|---|---|---:|---:|---:|---:|
| Empire of Brazil / 브라질 제국 | `efcd0f70-bffe-5464-86e3-b28b3658404b` | 2 | 2 | 3 | 3 / 4 |
| United States of Brazil / 브라질 합중국 | `750bf6be-49e9-4215-95ff-a356ba1831cd` | 1 | 1 | 1 | 2 / 2 |
| Brazil / 브라질 | `a8b27d54-b180-4d51-a664-dd40b3eed08f` | 7 | 7 | 13 | 2 / 14 |
| **Total** | **3 identities** | **10** | **10** | **17** | |

Runtime numbers here are FK/reference counts from `atlas_v2.runtime_person_politics_v1.polity_id`; they are NOT a full row-by-row Runtime content/period/source equivalence assertion. The owned/external totals are the current audited reference categories, not additional Activities.

## 2. October 2 ↔ October 9 exact Activity UUID delta

Compared current live audit Activity UUID list with the ten exact UUIDs in `docs/POLITY_P2_03C_BRAZIL_GITHUB_PRODUCTION_SNAPSHOT_20261009.md`.

- Exact UUID matches: **10/10**.
- Missing historical UUIDs: **0**.
- New UUIDs in these three Polity scopes: **0**.
- No detected changes in scoped per-Polity Activity cardinality, person-era boundary years reported by the compact live summary, or polity UUID mapping.
- Live source link counts by scope: Empire **3**, United States of Brazil **1**, Brazil **13**. The older P2-03C snapshot was not used as evidence that these Source associations existed on Oct 2.

Person record assignments remain Pedro I, Pedro II, Afonso Pena, Getulio Vargas (3 distinct Activities), Joao Goulart, Emilio Medici, Itamar Franco (2 distinct Activities), as recorded in the earlier exact list. No absence of activity in years not represented by these persons is construed as absence of the state.

## 3. Historical identity decision boundary (not an executed correction)

- The **1889-11-15 abolition of monarchy and proclamation of a federal republic** is a substantive constitutional/regime rupture; the Empire must not be blindly merged into the republic on a mere Brazil substring.
- **United States of Brazil** (1891 republican federal constitutional title) and later **Brazil / República Federativa do Brasil** remain a **reviewed one-republic-continuity candidate**, not an automatic 1967 new-identity split. Source basis: Brazilian Senate Decree No. 1 (1889), constitutional materials already catalogued in `docs/POLITY_P2_03_BRAZIL_REGIME_SOURCE_AUDIT_20261009.md`.
- Inherited but separately scoped `State of Brazil`, `Dutch Brazil`, the `Portugal/Brazil/Algarves` composite monarchy and `Yanomami land-rights movement (Brazil)` are excluded from this three-UUID family, not merge targets.

## 4. Verification limits and next unit

**Verified in current Production:** existence of the three explicit identities, current names/canonical keys in catalog, all 10 Activity UUIDs, their scoped cardinalities, available year boundaries, normalized Activity Source-link **counts**, and per-Polity Runtime reference **counts**.

**Not yet verified:** temporal designation/state-form rows, direct `polity_sources` rows and exact Source identities, governance/identity-relation semantics, full Authoring↔Runtime row-content parity, or canonical correction safety preflight. The earlier bounded SQL `db/audits/p2-03b-brazil-polity-production-readonly-20261009.sql` remains unexecuted in this session; the new GitHub audit instead supplies current Production evidence for the covered fields.

**Next exact resumption point:** `POLITY-P2-03E` bounded Production temporal-designation, polity-source and identity-edge census, then a reviewed safe plan for a possible United States of Brazil→Brazil identity unification with temporal name preservation. No identity deletion/retirement without explicit user approval. No automatic move to Oman.

**Registry:** `brazil-regime-family` stays `REVIEW_REQUIRED`; seeded ledger **51 terminal / 75 total, 24 pending**. No other Polity family was modified.
