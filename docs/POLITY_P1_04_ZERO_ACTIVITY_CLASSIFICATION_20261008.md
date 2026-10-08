# POLITY-P1-04 — 22 live zero-direct-Activity polity UUIDs, evidence-based triage

**2026-10-08 | BOUNDED_AUDIT_COMPLETE / NO_DB_WRITES / 22_PRESERVED / IDENTITY_REVIEW_NOT_TERMINAL**

## Evidence and method

Read-only connected Supabase atlas_v2. The selector is live polities without any row in person_politics_v2. Exactly **22** found. **Zero direct Activity is not itself a defect or removal criterion.** All 22 have exactly two preferred EN/KO names and polity_type=historical_polity, historicity=historical. All have zero: runtime Person Activities, context-Polity links, political descriptions, governance periods, temporal designations, predecessor/successor identity relations, other polity relations, Place functions, territory records, spatial registration dispositions, retirement overlaps, retirement survivor links. No new leaders or historical intervals are inferred.

All **21 other than Myanmar** have **zero direct polity_sources**. Myanmar has one source: UUID cef24ac7-0016-5cbf-996b-c962c00cdfa2, source_type repository_dataset, title pending-records-supplement-11.json, without canonical_url or citation_text. This is internal import provenance, not external historical identity evidence. All 22 otherwise have zero direct documentary sources. Current records do not support terminal verification of their historical identity and boundaries.

**Triage buckets are not terminal judgments and do not direct any deletion or merge:** A = 11 state/country candidates worth preserving while registration and provenance may be considered; B = 6 constitutional, state-form or subnational boundary cases requiring focused review before independent UUID claims; C = 5 nonstate category-boundary cases where place, people, social movement and actual political authority must be distinguished. Indigenous autonomy can qualify for a polity under a suitably reviewed contract even without sovereign nation-state status.

## Complete individual register

| Class | Canonical key | Polity UUID | Direct sources | Next evidence gate |
|---|---|---|---:|---|
| A | Ecuador | `57123aad-b06f-46c1-8b42-d213e36abfa0` | 0 | State/country identity; review historical provenance only when authoring |
| A | Federal Republic of Nigeria | `45ea6210-7f4b-4270-96a3-bec278d65ff9` | 0 | Country/state; absence of Person activity is not evidence of defect |
| A | Federated States of Micronesia | `db80bdb8-2d95-43d8-8624-1c59837408a7` | 0 | Country/state; no source-linked identity judgment yet |
| A | Kyrgyzstan | `e8236d5a-5b93-4eea-b448-3549affec265` | 0 | Country/state; no neighboring continuity data on this row |
| A | Malaysia | `5e3154d7-28f9-4dd2-9154-21f9a454f5c5` | 0 | Country/state; preserve without inventing Person links |
| A | Mongolia | `eeb89f37-a16b-4690-81e5-da910e829ee6` | 0 | Country/state; exact regime boundaries not reviewed |
| A | Mozambique | `4aeceb7e-5001-4f91-84ab-2e56e8d6a916` | 0 | Country/state; provenance currently absent |
| A | Myanmar | `aca31394-486c-55b7-aa9e-5351d229948d` | 1 internal | Country/state; separate State of Burma/Union of Burma UUIDs exist; one internal dataset source only |
| A | Republic of Kazakhstan | `7ab7da46-b310-4e76-a327-ed12c131041a` | 0 | Country/state; relation to separately modeled Kazakh SSR awaits continuity review |
| A | Republic of Slovenia | `9cb4d640-0b98-4fc1-9365-388398a3d659` | 0 | Country/state; no direct Activity or source |
| A | Timor-Leste | `7447c261-b9f5-42c8-b114-aac5b0c3c829` | 0 | Country/state; preserve; registration decision independent |
| B | Kazakh Soviet Socialist Republic | `b2b1c5ff-699c-450d-8905-b66b9158402f` | 0 | Constituent Soviet republic vs independent Kazakhstan; determine regime/identity boundary |
| B | People's Democratic Republic of Ethiopia | `9b44bca9-5696-4a2e-98eb-9f888e805634` | 0 | Specific Ethiopian state form; check constitutional relationship to preceding military government |
| B | Provisional Military Government of Socialist Ethiopia | `cf32afb7-e889-4ced-a3ee-a85554b0da0a` | 0 | Military government vs separate polity: state-form/period decision required |
| B | Republic of Kalmykia | `03eae136-add2-4a17-b9b1-6f04e64a18a2` | 0 | Subnational republic within Russia; avoid unjustified independent state assumption |
| B | Republic of Macedonia | `595a1d18-0afc-4940-aa16-3f33ae2e38bb` | 0 | Historical constitutional label of present North Macedonia; review same-state continuity/name |
| B | Third Polish Republic | `0b8f547f-8bdf-49c8-96ea-9c57694fc168` | 0 | Post-1989 period label; check state-form designation versus independent UUID |
| C | Chagossian Community | `08a804bf-81c1-4206-85ed-47b139104915` | 0 | Displaced community is not automatically one governmental polity |
| C | Kayapo (Mẽbêngôkre) | `baa43c48-c74e-41f4-9ba6-846d79ee5564` | 0 | Indigenous people and multiple communities: evidence-led governance identity review |
| C | Svalbard | `96cb1159-e7fe-4ae2-8b35-b8b99be8ecc9` | 0 | Norwegian archipelago/geography; not a separate sovereign state |
| C | Yanomami land-rights movement (Brazil) | `3647185e-7c70-4b21-85ad-5332b6b1c2ce` | 0 | Indigenous advocacy movement separate from people, territory and institutions |
| C | Zapatista Army of National Liberation (EZLN) | `2bd982fb-88f2-42b6-bce6-459f0fbd87e6` | 0 | Movement and guerrilla organization; distinguish associated autonomous governance entities |

**Control sum: 11 A + 6 B + 5 C = 22, 22 UUIDs retained.**

## Review focus and independent external evidence

- A modern state name is not proof of a particular historical formation, sovereign continuity or registration duty; do not manufacture leader activities. The neighboring existing entities State of Burma/Union of Burma, Kazakh Khanate and Ethiopian Empire do not establish a merge based on strings.
- Svalbard: official Norwegian government states the archipelago is part of the Kingdom of Norway since 14 August 1925, rather than a separate country. https://www.regjeringen.no/en/documents/meld.-st.-26-20232024/id3041130/?ch=1
- Chagossian Community: UN Mauritius recognizes the people and their forced displacement. Community membership must not be collapsed into state identity. https://mauritius.un.org/en/295406-historic-agreement-chagos
- Kayapo: Instituto Raoni's Indigenous account identifies Mẽbêngôkre (Kayapó) as a people with institutions and traditionally inhabited lands; the name alone does not identify one polity's sovereign/administrative boundaries. https://institutoraoni.org.br/sobre/
- Yanomami movement: Hutukara's organizational history evidences a territorial-rights association and multiple Indigenous communities. A rights movement, lands and people are not interchangeable. https://hutukarayanomami.org/hutukara/
- EZLN: reference academic work identifies a social movement and guerrilla organization; review its separate associated autonomous governance units rather than deem the armed organization a state by default. https://doi.org/10.1002/9781405165518.wbeosz003

These external references are contextual audit leads only: they were **not written to Production polity_sources** and are not sufficient to conclude the intended canonical Polity type for every entity.

## Bounded disposition and next frontier

- P1-04 selection, UUID-level classification and full direct/FK reference checks: **COMPLETE**. No entity is terminal FIXED solely from non-use.
- No destructive mutation, no Activity fabrication, no Polity identity merger, no broad fresh Production discovery.
- Optional follow-up distinct from current work: P1-04R-B for 6 period/state-form/subnational authority reviews; P1-04R-C for 5 nonstate type reviews. These are evidence gates, **not** queued deletions. Class A requires no immediate repair merely for zero Activities.
- Next user-approved active identity-review frontier: **France regime family** as first of 25 current registry REVIEW_REQUIRED seeds in Issue #1895. Work smallest seed first; audit against current canonical Production and use approved fail-closed correction only if warranted.
- Preserve final-acceptance blockers: Japan P1-02 (3 stale retirement rows, deletion approval gate) and Place P1-03R (canonical Place data gap). P14 Territory Geometry stays PARKED_BY_USER / DO_NOT_AUTO_RESUME.