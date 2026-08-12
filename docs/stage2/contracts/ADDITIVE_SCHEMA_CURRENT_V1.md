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

### Polity identity history

- temporal Polity designations/state forms without forcing new UUIDs for ordinary designation changes
- explicit Polity identity/continuity relation capability for genuinely distinct identities/transitions

### Temporal precision

All temporal assertion families use the same year/month/day + granularity/certainty/calendar boundary language.

For **existing Activity rows**, the already-required integer start/end years remain intact while the new detail columns may be all NULL until reviewed backfill. Once detail metadata is supplied, partial tuples are invalid.

For **new Stage 2 assertion families** (Governance periods, Polity relations, designations, identity transitions), an entire start/end/transition boundary may remain NULL when Authoring genuinely lacks a defensible boundary. If any component is supplied, `year` and the complete precision metadata required by its granularity must be coherent. The schema must never force a guessed year, month, or day merely to satisfy NOT NULL.

### Provenance

Normalized source joins for Governance periods, Polity relations, designations, and Polity identity relations; Activity continues to use `person_politics_sources`.

Each new source join preserves `assertion + source + locator`. A single normalized Source may have multiple locator keys for one assertion; distinct locator evidence must not be silently collapsed.

## Constraints deliberately deferred

P5 must **not**:

- make Relation Type NOT NULL globally;
- activate semantic-key v2 uniqueness;
- drop/replace the current NULL-role semantic index before coherent P9 cutover;
- relink/split historical Activities merely because the schema can represent them;
- manufacture source rows, temporal precision, or Polity identities;
- force unresolved new-assertion temporal boundaries into fake exact intervals.

## Shared temporal hardening

One validation language must apply symmetrically to Activities, Governance periods, Polity relations, Polity designations, and identity transitions. A schema in which some Stage 2 temporal assertions remain permanently year-only by design is rejected.

The validation layer distinguishes **wholly unresolved** from **partially malformed**: the former is allowed in Authoring; the latter is rejected.

## Execution boundary

The schema design/rehearsal can be prepared before Baseline A. The actual Production migration is P5 and requires the exact deployed SHA discipline. Historical UUID-bound corrections/backfills are generated after Baseline A and applied later through Correction v2 / P7.
