# ATLAS Stage 2 Additive Schema Contract — Current v1

> Status: BASELINE-INDEPENDENT SCHEMA CONTRACT / NO PRODUCTION MIGRATION

P5 is an **additive capability migration**, not semantic cutover. Existing Runtime/write behavior must remain valid until P9.

## Required capabilities

### Activity relation

- normalized Relation Type vocabulary table
- nullable `relation_type_id` on Activity during transition
- no generic Relation backfill

### Governance

- Governance Context identity + localized names
- Polity-governance periods with the shared full temporal boundary contract

### Polity structure

- Polity relation type vocabulary + temporal Polity relations
- codes include reviewed dependency/constituency/suzerainty relations and `nominally_subordinate_to`

### Polity identity and naming history

- temporal Polity designations/state forms without forcing new UUIDs for ordinary designation changes
- explicit Polity identity/continuity relation capability for genuinely distinct identities/transitions
- additive nullable `polity_names.semantic_name_kind` with reviewed kinds `historical_official`, `historical_attested`, `historiographic_conventional`, `editorial_catalog_label`
- existing live `polity_names.name_type` remains raw inventory until Baseline A v2 captures it and reviewed mapping is performed
- editorial catalog labels never create historical designation assertions or new Polity UUIDs

### People and Event entity boundaries

People and Events are first-class Authoring entities rather than fake Polities:

- `PeopleGroup` identity + localized names
- `PersonPeopleAffiliation` with independent temporal/provenance assertions
- `HistoricalEvent` identity + localized names
- `PersonEventParticipation` with independent temporal/provenance assertions
- People/Event identities and links never enter Person–Polity Activity semantic-key v2 and never auto-create Person–Polity Activities

### Temporal precision

All temporal assertion families use the same year/month/day + granularity/certainty/calendar boundary language.

For **existing Activity rows**, the already-required integer start/end years remain intact while the new detail columns may be all NULL until reviewed backfill. Once detail metadata is supplied, partial tuples are invalid.

For **new Stage 2 assertion families** (Governance periods, Polity relations, designations, identity transitions, People affiliations, Events, Event participations), an entire start/end/transition boundary may remain NULL when Authoring genuinely lacks a defensible boundary. If any component is supplied, `year` and the complete precision metadata required by its granularity must be coherent. The schema must never force a guessed year, month, or day merely to satisfy NOT NULL.

### Provenance

Normalized source joins cover Governance periods, Polity relations, designations, Polity identity relations, PeopleGroups, HistoricalEvents, PersonPeopleAffiliations, and PersonEventParticipations; Activity continues to use its existing source-link contract until the reviewed Stage 2 migration plan says otherwise.

Each new source join preserves `assertion/entity + source + locator`. A single normalized Source may have multiple locator keys for one assertion; distinct locator evidence must not be silently collapsed.

## Rehearsal split

The additive P5 shape is deliberately rehearsed in two non-Production SQL files:

1. `db/proposals/stage2_semantic_extensions.rehearsal.sql` — Relation, Governance, Polity structure/identity, temporal capability.
2. `db/proposals/stage2_entity_boundaries.rehearsal.sql` — Polity semantic name kind + People/Event entities and provenance.

Both are `REHEARSAL ONLY` and must remain absent from Production migration registries until the reviewed P5 release is built after Baseline A.

## Constraints deliberately deferred

P5 must **not**:

- make Relation Type NOT NULL globally;
- require `semantic_name_kind` before the Baseline A v2 live name catalog is reviewed;
- activate semantic-key v2 uniqueness;
- drop/replace the current NULL-role semantic index before coherent P9 cutover;
- relink/split historical Activities merely because the schema can represent them;
- manufacture source rows, temporal precision, People/Polity identities, or historical names;
- force unresolved new-assertion temporal boundaries into fake exact intervals.

## Shared temporal hardening

One validation language applies symmetrically to Activities and all temporal Stage 2 assertion families. The validation layer distinguishes **wholly unresolved** from **partially malformed**: the former is allowed in Authoring; the latter is rejected.

## Execution boundary

The schema design/rehearsal is complete before Baseline A. The actual Production migration is P5 and requires exact deployed-SHA discipline. Historical UUID-bound corrections/backfills and reviewed name-kind mappings are generated only after Baseline A v2 and applied later through Correction v2 / P7.
