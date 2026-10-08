# POLITY-P2-01D — Source-backed French GPRF and Fourth Republic Governance Context registration

**2026-10-08 | Initial status: reviewed, protected assertion-only Correction prepared. Production apply + exact read-back pending.**

## 1. Historical model judgment and evidence

Bounded to the already reviewed `france-regime-family` carry-forward seed; does not create a new review seed. France's persistent legal identity, actual occupation/Vichy government, provisional republican government and successive republican constitutions are not synonymous. The 1944 ordinance recognizes legal republican continuity but does not erase Vichy de facto rule. This task does **not** create a Vichy sovereign entity nor add a missing wartime Person.

**Documentary foundation:**

- [French National Assembly — CFLN and provisional institutions](https://www.assemblee-nationale.fr/dyn/histoire-et-patrimoine/deuxieme-guerre-mondiale/institution-du-comite-francais-de-la-liberation-nationale-cfln-et-creation-de-l-assemblee-consultative-provisoire): the **Comité français de la Libération nationale** (CFLN) adopted the name and authority of the **Gouvernement provisoire de la République française (GPRF)** on **3 June 1944**. This is the GPRF **government regime** start, *not* Charles de Gaulle's distinct Paris national-unity cabinet beginning 9 September 1944.
- [French National Assembly — Constitution of 1946 and inauguration of Fourth Republic](https://www.assemblee-nationale.fr/dyn/histoire-et-patrimoine/quatrieme-republique/la-constitution-de-1946-et-l-instauration-de-la-ive-republique): Fourth Constitution was **promulgated on 27 October 1946**, while the Provisional Government continued until **24 December 1946**, when the new Constitution **entered into force**. A government interval and a constitutional-promulgation event are different temporal axes. Do not falsely treat 27 October as the final day of provisional government.
- [French National Assembly — Constitution of 1958](https://www.assemblee-nationale.fr/dyn/histoire-et-patrimoine/cinquieme-republique/la-constitution-de-1958-et-l-instauration-de-la-ve-republique): Fifth Constitution promulgated **4 October 1958**. Already existing `stage2:french-fifth-republic` context and Period from this day must remain intact. The Fourth context end **3 October 1958** is an *ATLAS last-full-day convention*, not independent official evidence of a midnight repeal.
- [Élysée — de Gaulle's head of government/Presidency transition](https://www.elysee.fr/en/french-presidency/the-inauguration-of-charles-de-gaulle): de Gaulle's actual government tenure **1 June 1958–8 January 1959** is one continuous office and must not be split merely to fill the constitutional context timeline.

## 2. Exact connected Production preflight

Project `wfrbxltvpmlprgwfysxq`, schema `atlas_v2`, read-only as of 2026-10-08:

- `stage2:french-republic` survivor Polity **`b138f5e4-ff83-40f6-bdb1-83b08c0256cb`**, 16 Person Activities. `France` country umbrella 37 Activities. Total eight-member France family **65 Authoring / 65 Runtime / 0 core drift** after P2-01B.
- Existing `stage2:french-fifth-republic` `constitutional_regime` Governance Context UUID **`078c50b9-4a15-46b4-9181-567cf07ee838`**, its Period UUID **`9c3d4f6a-1478-4b10-a15d-893822fbf38c`**, beginning 1958-10-04 and open-ended.
- GPRF and French Fourth Context canonical keys and normalized target period UUIDs **absent**; official National Assembly Source URL/source keys used by this new Correction also absent at preflight. No existing Fourth Period, no known GPRF Period, and no Vichy Polity/context in the connected Production.
- Original Person Activity for de Gaulle 1944-09-09–1946-01-20 and de Gaulle cabinet tenure 1958-06-01–1959-01-08 are untouched, with normalized provenance maintained. There is no reviewed new Person Activity in this unit.

## 3. Reviewed additive Correction with no fake Activity rewrite

Canonical plan `corrections/plans/polity-france-gprf-fourth-governance-only-20261008.v1.json` has `operations: []` and 6 `stage2_assertions` (2 exact Sources, 2 typed Contexts/6 preferred EN/FR/KO names, 2 Periods/3 source links). Exact source/context/period UUIDs, official URLs, dates and provenance all declared in the plan.

| Structural record | Governance type | Period on existing French Republic | Source proof |
|---|---|---|---|
| GPRF / 프랑스 공화국 임시정부 | `government` | **1944-06-03 through 1946-12-24** | Assemblée nationale start + end |
| French Fourth Republic / 프랑스 제4공화국 | `constitutional_regime` | **1946-12-24 through 1958-10-03** | Assemblée nationale 1946 effective date + last-full-day convention ahead of verified 1958 Fifth |

**1946-12-24 is the institutional transition boundary**: the GPRF endpoint and the Fourth start both record this real event. Shared calendar date is not an assertion of two parallel full-day legitimate governments. The Fourth Republic *constitutional text was promulgated* October 27; its *entry into force* was December 24. Both dates remain traceable through Notes and authoritative Source text; one date must not be silently replaced with the other.

**Existing writer transport issue found:** standard `atlas-correction-apply.yml`, `server/atlas-correction-apply-handler.js` and `server/atlas-correction-v2-snapshot-service.js` previously required one Person Activity mutation/snapshot; using a fake no-op `rewrite_activity` is prohibited. This PR adds a strictly gated assertion-only plan execution path:

1. `execution_rules.production_executable=false` and `production_mutation_authorized=false` remain mandatory; `operations: []` requires at least one governance-context/period assertion and allows only `assert_source`, `assert_governance_context`, `assert_governance_period`. Empty source-only plans and unknown operations are rejected.
2. Snapshot: explicitly permit zero targeted Activity UUIDs **only for these scoped plans**, in a real read-only, repeatable-read PostgreSQL transaction. Ordinary zero-target Activity snapshots stay rejected. Hash/digest is required.
3. The existing unified v2 synthesizer normalizes declared typed assertions, source-first ordering and a cryptographic plan hash. Existing authenticated GitHub Actions Correction service still enforces dry-run, Production OIDC, SERIALIZABLE atomic apply, uniqueness/absence checks, exact postwrite verification and immutable ledger idempotence.
4. `ATLAS Runtime Projection Compile` is automatically triggered upon Correction workflow completion. This is not an Activity update; no change to 65 canonical Person Activities is permitted. Verify final 65/65/0 and new Contexts/periods/sources on live connected DB before closeout.

No altered Person/Polity/Activity UUID; no deletion, no Vichy synthetic authority, no P14 territory/geometry.

## 4. Closeout gates and frontier

Before declaring APPLIED, require: PR Integrity SUCCESS + merged; authenticated Correction Apply SUCCESS with exact request ID in Production `atlas_v2.correction_manifest_runs`; 2 correct typed `atlas_v2.governance_contexts`, six EN/FR/KO `governance_context_names`, two accurate `polity_governance_periods` with three normalized documentary `polity_governance_period_sources`, two unique normalized `atlas_v2.sources`; **pre-existing Fifth Context and dates unchanged**, French Person Activities and normalized links unchanged; 65 Authoring / 65 Runtime / 0 mismatches after compile. If any gate fails, do not say applied; retain exact failure and bounded re-entry.

France family remains `REVIEW_REQUIRED` pending the larger unresolved 1940 Vichy de facto representation, other 18th–19th constitutional period identities and country umbrella/Republic relation. Root #1895 stays OPEN, **75 seeded / 50 terminal / 25 pending** unchanged. Empty Kingdom and Third Republic Polity UUIDs remain live absent explicit user deletion approval. Japan P1-02, Place P1-03R stay separate acceptance blockers; P14 geometry user-parked.
