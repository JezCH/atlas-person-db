# POLITY-P2-10 — Internal-DB provenance, orphan, retirements, Source and Runtime audit

**2026-10-11 KST | Code implemented; FRESH PRODUCTION protected census NOT ACCEPTED until GitHub OIDC/deployed SHA and immutable result artifact pass.** This is a separate essential stage following completed whole-public 1,158-Polity census P2-09 and the two KO naming fixes.

## Global mission and discovered missed tasks

The user-approved end-state is **not** merely handling the first 75 seeds. Current authoritative registry: **75 total / 65 terminal / 10 REVIEW_REQUIRED**, distribution **historical-family 5 / Sweden temporal 1 / Korean naming 0 / rupture 4**. The same program also requires Japan restoration/tombstones, Place authoritative DB mismatch, France two obsolete historical Polities requiring explicit retirement permission, dynasty-continuity controlled vocabulary, entire Production **including unseeded orphan/source/identity contradictions**, then **Human Authoring→Compile→Runtime** identity and Source parity. P14 spatial geometry explicitly user parked.

Two previous holes recovered:

1. Issue [#1895](https://github.com/JezCH/atlas-person-db/issues/1895) **body** still said 75/63/12 even after actual [#2469](https://github.com/JezCH/atlas-person-db/pull/2469) verified and merged 75/65/10. Corrected issue body 2026-10-11; do not trust stale snapshot comments over the registry.
2. "25 zero-Activity Polities" had been relegated to a public listing without reconciliation against already existing authenticated internal reference counts. **Historical authenticated snapshot** [protected Song audit #38066554389, artifact #11674794701](https://github.com/JezCH/atlas-person-db/actions/runs/38066554389) actually contains **all 1,158 polities** and **all 17 discovered Polity UUID FK/semantic reference routes**, not only Song. At its deployed code SHA `b00be80471a401a30a6a79b1448a86d82d4864b3`, it found 25 Polities with **no external references**. Cross-matching each canonical UUID against the [post-correction entire public census P2-09 run #38072668164 artifact #11677521661](https://github.com/JezCH/atlas-person-db/actions/runs/38072668164) finds the **same exact set of 25 no-Activity Polities**. **The internal snapshot predates the two Korean names and one direct Northern Song Source addition, so it is historical evidence, NOT a new live 2026-10-11 current-DB verification.**

## Exact orphan inventory — review candidates, NO retirement approval

The following 25 existing Polity UUIDs had no external Polity reference at that prior protected snapshot; some are properly unoccupied/placeholders or historically distinct. Do **not** conflate sovereign states, ethnic groups, movements and state-form designations.

| Polity | UUID | Direct Polity Source count in older protected snapshot |
| --- | --- | ---: |
| Federal Republic of Nigeria | `45ea6210-7f4b-4270-96a3-bec278d65ff9` | 0 |
| Timor-Leste | `7447c261-b9f5-42c8-b114-aac5b0c3c829` | 0 |
| Republic of Macedonia | `595a1d18-0afc-4940-aa16-3f33ae2e38bb` | 0 |
| Malaysia | `5e3154d7-28f9-4dd2-9154-21f9a454f5c5` | 0 |
| Mozambique | `4aeceb7e-5001-4f91-84ab-2e56e8d6a916` | 0 |
| Mongolia | `eeb89f37-a16b-4690-81e5-da910e829ee6` | 0 |
| Myanmar | `aca31394-486c-55b7-aa9e-5351d229948d` | **1** |
| Federated States of Micronesia | `db80bdb8-2d95-43d8-8624-1c59837408a7` | 0 |
| Yanomami land-rights movement | `3647185e-7c70-4b21-85ad-5332b6b1c2ce` | 0 |
| United States of Brazil | `750bf6be-49e9-4215-95ff-a356ba1831cd` | 0 |
| Zapatista Army of National Liberation | `2bd982fb-88f2-42b6-bce6-459f0fbd87e6` | 0 |
| Svalbard | `96cb1159-e7fe-4ae2-8b35-b8b99be8ecc9` | 0 |
| Republic of Slovenia | `9cb4d640-0b98-4fc1-9365-388398a3d659` | 0 |
| Ecuador | `57123aad-b06f-46c1-8b42-d213e36abfa0` | 0 |
| Provisional Military Government of Socialist Ethiopia | `cf32afb7-e889-4ced-a3ee-a85554b0da0a` | 0 |
| People's Democratic Republic of Ethiopia | `9b44bca9-5696-4a2e-98eb-9f888e805634` | 0 |
| Chagossian Community | `08a804bf-81c1-4206-85ed-47b139104915` | 0 |
| Kayapo (Mẽbêngôkre) | `baa43c48-c74e-41f4-9ba6-846d79ee5564` | 0 |
| Kazakh Soviet Socialist Republic | `b2b1c5ff-699c-450d-8905-b66b9158402f` | 0 |
| Republic of Kazakhstan | `7ab7da46-b310-4e76-a327-ed12c131041a` | 0 |
| Republic of Kalmykia | `03eae136-add2-4a17-b9b1-6f04e64a18a2` | 0 |
| Kyrgyzstan | `e8236d5a-5b93-4eea-b448-3549affec265` | 0 |
| Third Polish Republic | `0b8f547f-8bdf-49c8-96ea-9c57694fc168` | 0 |
| Kingdom of France | `7e090994-f196-4957-8295-dcfa08c53fba` | 0 |
| French Third Republic | `3d72277f-c92e-476c-8174-804f700d10cc` | 0 |

**Priority implications:** France old `7e090994...` and `3d72277f...` intersect separate legacy-Polity retirement approval. Brazil `750bf6be...` is an extant phase name that earlier project work explicitly investigated, not an empty state to delete. Myanmar is **not** a no-Source orphan because it has a direct Source. Non-state entities and many modern names should be assessed for proper **entity kind** before choosing whether a Polity row is appropriate. Existing zero-Activity modern state identities may be valid and awaiting registrations. No deletion here and no user permission implied.

## New canonical protected full-Production audit

The existing `server/atlas-polity-reference-audit-handler.js` already uses **strict GitHub OIDC**, exact `production/main/deployment SHA`, and a **REPEATABLE READ READ ONLY** DB transaction. Preserve this pathway. This PR adds `server/atlas-polity-full-integrity-audit.js`, an **opt-in** within the **same** transaction, and extends the **already allowlisted Song protected audit workflow** rather than creating a new OIDC trust identity.

**All rows, no SQL LIMIT, 15 source/authority tables:**
`sources`, `person_politics_sources`, `polity_sources`, `person_politics_v2`, `runtime_person_politics_v1`, `polity_designations`, `polity_designation_sources`, `polity_governance_periods`, `polity_governance_period_sources`, `polity_identity_relation_types`, `polity_identity_relations`, `polity_identity_relation_sources`, `polity_identity_retirements`, `polity_identity_retirement_names`, `polity_place_functions`; plus all Polities, names, and 17+ Polity reference routes already obtained by parent audit. Query schemas and row identity fields are fail-closed; never fake an unverified row.

Checks:
- Every exact Activity–Source triple, every direct Polity–Source pair, designation/governance/identity relation Source triples, all normalized bibliography metadata rows. UUID referential existence checks, key/URL duplicate candidates (not automatic Source merges).
- Complete retirement tombstones; **contradictory live Polity UUID = retired UUID** identified and output with exact UUID/case. This addresses Japan's known restoration contradiction without silently deleting tombstones.
- All canonical Activity IDs vs all compiled Runtime Activity IDs, missing/extra UUIDs, and named common semantic-field differences; no automatic recompile or interpretation of the historical truth.
- Every canonical Polity's current discovered external references, all 25+ true zero-external-ref candidates, each existing direct source pair and name; Korean preferred names collision inventory after accepted two-case correction.
- Immutable GitHub artifact with raw full internal rows, categorized summary, exact GitHub workflow SHA and deployed Vercel SHA. Job must **fail closed** if the required exact Production deployment isn't ready. The production handler and workflow are a pair: no OIDC relaxation, no API bypass.

## Acceptance & remaining gaps

1. Full ATLAS Integrity CI and only then merge the code. The merge-triggered allowlisted workflow must receive an actual Vercel Production deployment of **that exact GitHub main SHA**, pass GitHub OIDC trust and `read_only=true,committed=false,complete=true`, and archive the **real** full result. Existing Vercel Hobby deployment caps have prevented some exact SHA attempts; don't pretend a CI green code validation means a DB audit passed. Avoid repeated 60-attempt waits (bounded retry 6).
2. Triage actual Source URL/key collisions, live retirement contradictions, missing/extra Runtime Activities, active 25-case details and direct links against Source and place authority. Historical Source metadata absence is not evidence of absence in all legacy repository datasets.
3. **Still missing beyond this census:** Provenance quality/source relevance (not just key/UUID), lifecycle repair approval, Place canonical authority and Human Authoring source/execution manifest parity, final published Runtime/compile equivalence. These require separate exact owner/Source replay checks. No mass corrections from the machine-derived list.
4. The canonical registry remains **75/65/10** until each residual historical judgment reaches a reviewed terminal state. Follow `docs/ATLAS_CURRENT_WORKSTREAMS.md`, not stale unrelated PRs or Issue comments. P14 user parked.

**Scope:** source-backed non-destructive READ ONLY verification. No Polity/Person Activity, Source, Place, retirement or relation mutation.
