# P5 Preproduction Schema Readiness — 2026-08-13

> Status: **BRANCH-ONLY PREPRODUCTION READY / PRODUCTION NOT APPLIED**  
> Baseline A SHA: `ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79`  
> Baseline digest: `sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27`

## Result

All currently reviewed P5 data requirements can be represented by the branch rehearsal schema without mutating Production.

- new Polity authoring targets prepared: **24 / 24**
- new Polity UUIDs assigned: **0**
- reviewed Polity relation assertions: **10**
- bibliographic Source candidates prepared: **9**
- assertion–Source locator links prepared: **11**
- reusable live bibliographic Source UUIDs: **0**
- Correction v2 Activity frontier: **57**
- PeopleGroup/Polity boundary Polity targets: **5**
- entity migrations: **3**
- Production schema/data mutations from this work: **0**

ATLAS Integrity **#245** passed the composed readiness gate at commit `02cf313dbc40e179ffc3078ae7322360573fcfc7`, including current-schema reconstruction, Stage 2 additive schema rehearsal, normalized provenance, entity-boundary rehearsal and semantic-key-v2 rehearsal.

## P5 Polity authoring preparation

Three branch-only packages now cover the complete 24-target frontier:

1. Late-Han regional authorities: 9
2. reviewed historical/editorial Polities: 10
3. PeopleGroup/community/coalition boundary Polities: 5

No package assigns a Production UUID. Historical names, historiographic conventional names and editorial catalog labels are explicitly separated. Broad PeopleGroups such as Lakota, Cree, Mapuche and Shoshone are not automatically promoted to Polities.

## Source model correction

Baseline A contains 20 Sources, all materialized `repository_dataset` records with `sha256` and `bytes`. None is a valid live bibliographic Source UUID for the ten reviewed Polity-relation assertions.

The previous Source shape therefore could not represent a web/primary bibliographic reference without fabricating file metadata. The rehearsal Source model now allows bibliographic references with:

- `canonical_url`
- `citation_text`
- `sha256 = NULL`
- `bytes = NULL`

while requiring `sha256` and `bytes` to be either both present or both absent. A Source with neither materialized content nor bibliographic evidence is rejected. Existing repository-dataset Sources remain valid.

The PostgreSQL provenance rehearsal proves:

- unmaterialized bibliographic Source insert succeeds without fake hash/bytes;
- partial hash/bytes materialization is rejected;
- evidence-free Source is rejected;
- cited Source deletion is restricted;
- assertion deletion cascades Source links;
- multiple locators per Source/assertion are supported;
- existing Activity Source linkage remains present.

## Relation Type UUID prerequisite

Correction v2 must not resolve `rules`, `serves`, `vassal_of`, etc. by string and then treat the result as identity. P5 therefore also prepares an exact reviewed UUID catalog before P6 planning:

- Person–Polity relation types: **6** (`rules`, `governs`, `serves`, `active_in`, `opposes`, `claims_rule`)
- currently reviewed Polity-relation types: **3** (`vassal_of`, `nominally_subordinate_to`, `dominion_of`)

The catalog is UUID identity; codes are semantic labels only. The Polity-relation catalog remains extensible only by reviewed domain decision.

## Completion boundary

This document does **not** mark `ATLAS-RQ-0215` complete. That requirement is specifically the actual additive Stage 2 Production-schema application and remains `PENDING`.

Current meaning is narrower and intentional:

> all reviewed P5 structures, identities, naming semantics, relation types and provenance requirements are prepared and fail-closed in branch rehearsal; no Production migration has been authorized or applied.

The next safe work is P6 Correction v2 contract/planning against this prepared schema, still branch-only. Actual Production P5/P6 execution remains deferred until non-Production preparation is exhausted.
