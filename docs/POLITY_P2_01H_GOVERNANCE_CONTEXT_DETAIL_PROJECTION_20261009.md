# POLITY-P2-01H — France nation/Republic context relationship: no new Polity edge; expose existing typed eras in the Polity dossier

**Date:** 2026-10-09
**Status at proposal:** REVIEWED / READ-ONLY DETAIL PROJECTION IMPLEMENTED / CI-AND-DEPLOYMENT VERIFICATION PENDING.
**Canonical mutation:** ZERO. **New global Polity relationship code/type/edge:** ZERO. **User-PARKED P14 Geometry:** UNTOUCHED.

## 1. Exact disposition: NO_GLOBAL_NON_SUCCESSOR_RELATION_NEEDED_FOR_DIRECT_GOVERNANCE_VIEW

The substantive history already exists in two **distinct scoped Polity UUIDs**:

| Role | Polity UUID and canonical key | Person Activities | Direct source-backed Governance Contexts |
|---|---|---:|---|
| French historic country/nation umbrella (includes monarchic state_forms and cultural links) | `1eaa48b6-dc60-49d6-91c4-49db556f4ddf`, `France` | 37 | **ONE** real *de facto* Vichy `governing_regime` period, **1940-07-10→1944-08-20** |
| Juridically continuous constitutional/republican political authority | `b138f5e4-ff83-40f6-bdb1-83b08c0256cb`, `stage2:french-republic` | 16 | **FIVE** separate government/constitutional Contexts: CNF **1941-09-24→1943-06-02**; CFLN **1943-06-03→1944-06-02**; GPRF **1944-06-03→1946-12-24**; Fourth **1946-12-24→1958-10-03**; Fifth **1958-10-04→open** |

The eight-live-Polity France family includes **12 additional Activities** attached to other four populated polity identities; the now-empty Kingdom and Third Republic Polities are preserved. Exact connected Production **65 Authoring /65 matching Runtime /0 full Person/Polity/Role/PeriodBasis/relation/year/month/day/granularity/certainty/calendar drift**.

French official primary sources: [9 August 1944 ordinance, Article 1](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006530175) asserts *juridical* Republic continuity; [Article 7](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006530181) calls Vichy the `autorité de fait`. The [Assemblée nationale historical regime table](https://www.assemblee-nationale.fr/gouv_parl/regimes.asp) uses *institutional administration intervals*, which must not override differently scoped periods of formal government formation, constitutional entry into force and Constitution promulgation stored in the existing authoring records. No overlapping year or nation-name equivalence makes one UUID the vassal, dependency, constituent country or mandatory predecessor of the other.

`atlas_v2.polity_relation_types` has **5** `constituent/dependency` types only (9 actual historical Polity relations globally, none to these two UUIDs). `polity_identity_relation_types` and `polity_identity_relations` have **0** records globally. Predecessor/successor semantics in `server/atlas-polity-identity-resolver.js` cannot be reused for a simultaneously scoped country + Republic view. **Creating a new global `political_authority_context_of` relation solely to make governance names appear in a dossier is not justified**.

### P2-01H conclusion

**For a polity-specific governmental-period display, the proposed new cross-Polity relationship type is `NOT_APPLICABLE`.** The already-normalized FK `polity_governance_periods.polity_id` is the canonical subject binding, with exact temporal boundaries and linked Source provenance. Use it directly without fabricating an additional hierarchy. For a hypothetical unified *cross-regime national history narrative*, no implicit relationship may be inferred or created; that would require a separate explicitly reviewed semantic/UI contract. The current single-Polity detail use case is thereby resolved, not merely deferred.

## 2. Real API and UI limitation discovered; narrow implementation

**Before P2-01H**, `server/atlas-polity-read-service.js` returned only canonical Polity names plus direct Person Activities and Activity-observed temporal designations. The interactive `atlas-polity-dossier-view.js` rendered `IDENTITY`, `TEMPORAL DESIGNATION`, `PEOPLE`; it did **not** read or show existing `polity_governance_periods`. Thus claiming that governance context data was *already visible in the UI* would have been false, even though the DB normalized records were complete.

**Changes, with NO database writes:**

1. `POLITY_GOVERNANCE_PERIODS_SQL` reads the existing authoritative `polity_governance_periods` joined to `governance_contexts`, with one preferred name per locale from `governance_context_names`. Its critical filter is **`where gp.polity_id=$1::uuid`**; it does not query or traverse `polity_relations` or `polity_identity_relations`. Read-only, bounded, parameterized SQL returns **exact period UUID, context UUID/key, normalized type, historicity, EN/FR/KO names, day/month/year, granularity, confidence and original evidence notes**.
2. Only `readPolityDetail` (UUID detail API `/api/atlas-polity-read?polity_id=<UUID>`) executes this **additional query** and adds a backward-compatible `governance_periods` array to the existing detail payload. The **all-polity list and its aggregate Person counts are untouched**, avoiding global query fan-out/N+1 cost. An absent UUID returns 404 without a governance read. Rows are normalized and frozen server-side.
3. `atlas-polity-dossier-view.js` shows a dedicated **등록된 통치체계 / GOVERNANCE** section from **that same Polity ID's direct contexts only**. It displays localized names, category (`government` / `constitutional_regime` / `governing_regime`), date-specific intervals and reviewed confidence; **type `governing_regime` is generically translated `통치체계`, not automatically `합법정부` or `사실상` for every global case**. Vichy's explicitly historically reviewed preferred Korean name includes `사실상` as authoritative provenance-bearing identity.
4. A missing `valid_to` is **종료일 미등록**, not `현재`: SQL open interval does not assert contemporary existence. **Activity 관측범위** remains distinct from **정식 통치체계 존속기간**, important for earlier monarchy labels and the Third Republic designation. All names pass the existing HTML-escaping renderer. Missing contexts show `이 정치체에 직접 연결된 통치체계 기록 없음`, NOT `그 시대 정부가 존재하지 않음`.
5. **No cross-Polity aggregation or Person Activity inheritance**: the France country-umbrella dossier shows source-backed Vichy *de facto* period ONLY; the separate French Republic dossier shows CNF/CFLN/GPRF/Fourth/Fifth ONLY. Neither page silently claims a legal Vichy cabinet or creates sovereignty succession. The stored `France` 37 and Republic 16 Person Activities are neither duplicated nor relocated.

## 3. Test/verification gates

New `tests/polity-p2-01h-governance-detail-contract.test.mjs` exercises:
- exactly two **different** UUID-bound parameterized detail queries and no relation traversal, with one direct France governance record and five Republic governance records;
- exact 1940–1944 Vichy, 1941–1946 Free France/Provisional and 1958→ Fifth era multilingual labels, day precision and open end semantics;
- zero synthetic Person Activity creation, no cross-polity context inheritance and list query unchanged;
- HTML escaping of malicious names; empty context display and preserved existing dossier contents.

Existing `tests/atlas-polity-read.test.mjs` updated for the detail-only optional read; no existing list response or endpoint schema was broken intentionally.

**Closeout acceptance:** ATLAS Integrity CI success; merged PR; verified correct Vercel deployment if accessible, inspect exact connected Production rows and 65/65/0 drift; check running API separately if deployment runtime permits. Do not claim a UI deployment or a live API payload if only CI has been verified.

## 4. Whole France family vs one bounded subquestion

**P2-01H resolves only the separate *country↔Republic relationship type necessity* subquestion as `NOT_APPLICABLE_FOR_DIRECT_GOVERNANCE_VIEW`; it is NOT a mass historical identity acceptance for all 8 Polities.** The `france-regime-family` seed remains `REVIEW_REQUIRED` until a later final detailed disposition of the surviving First/Second French Republic, First/Second Empire and historically empty Kingdom/Third Republic identity aliases, and the 19th-century constitutional-period gaps, without treating lack of Person Activities as historical non-existence.

**Exact next one bounded unit: `POLITY-P2-01I` — final France-family acceptance audit across the remaining First/Second Republic, First/Second Empire and temporary royal/July-Monarchy forms, with precise non-deletion decision and 65/65 integrity, terminal ONLY if the whole family demonstrably meets all historic source and canonical representation gates.** This is still the original `france-regime-family` seed, not a new 26th review case. Pending **75 seeded /50 terminal /25 REVIEW_REQUIRED**, root #1895 **OPEN**. P1-02 Japan stale tombstones and P1-03R Place still separate acceptance blockers. P14 Territory Geometry still user-PARKED / NOT_ACTIVE / DO_NOT_AUTO_RESUME. Existing Kingdom and Third Republic UUIDs remain LIVE; user consent mandatory for delete/retirement. No broad Production rediscovery.

