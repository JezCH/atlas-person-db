# ATLAS Stage 2 Polity Relation Contract — Current v1

> Status: BASELINE-INDEPENDENT DOMAIN CONTRACT / NO PRODUCTION MUTATION

## Core separation

Three different facts must never be collapsed:

1. `Person -> Polity` Activity relation: `rules / governs / serves / active_in / opposes / claims_rule`.
2. `Polity -> Polity` structural relation: dependency, constituency, suzerainty, confederation, nominal subordination.
3. Territory control semantics: direct control, overlordship, tributary, occupation, contested, claimed, influence, etc.

A structural relation does not automatically transfer the subject Polity's geometry into the object Polity's direct-control geometry.

## Model

```text
polity_relation_types
  id UUID
  code
  category
  inverse_code / inverse relation reference
  is_active

polity_relations
  id UUID
  subject_polity_id
  object_polity_id
  relation_type_id
  full temporal interval
  confidence / review state
  notes
  provenance
```

Store the canonical direction once; derive the inverse. Self-relations are invalid.

## Controlled vocabulary

Use a vocabulary table, not a frozen SQL enum. Add codes only when reviewed data requires them.

Current justified codes:

- `constituent_of`
- `dominion_of`
- `colonial_dependency_of`
- `vassal_of`
- `tributary_to`
- `protectorate_of`
- `member_of_confederation`
- `nominally_subordinate_to`

`nominally_subordinate_to` is specifically for a de facto territorial political authority that retains a source-backed formal/nominal superior relationship while exercising substantial autonomous power. It is not a generic synonym for vassalage.

## Reviewed structural examples

- Kingdom of Huainan -> `vassal_of` -> Western Han.
- Dominion of Canada -> `dominion_of` -> United Kingdom for the source-backed constitutional interval.
- British Raj -> `colonial_dependency_of` -> United Kingdom for the source-backed colonial interval.
- Soviet Russia / RSFSR -> `constituent_of` -> Soviet Union after Union formation.
- reviewed Late Han / Late Yuan autonomous regional authorities may use `nominally_subordinate_to` only for phases where both de facto autonomy and nominal superior authority are evidenced.

## Not this table

Do not use Polity relations for:

- rename/state-form/continuity -> Polity identity/designation history;
- occupation/claim/direct control -> Territory;
- a Person holding multiple crowns -> multiple Person Activities unless a separate union use case is later justified;
- government/regime -> Governance Context;
- events/revolts -> Event model.

## Time and provenance

Every structural assertion uses the shared Stage 2 full historical boundary contract and normalized source joins. A Person's tenure never substitutes for the full constitutional life of a structural relation.

## Baseline dependency

This vocabulary and relation semantics are baseline-independent. Exact subject/object Polity UUIDs, exact intervals, assertion UUIDs, and source joins must be rebound to Baseline A before any Production backfill.