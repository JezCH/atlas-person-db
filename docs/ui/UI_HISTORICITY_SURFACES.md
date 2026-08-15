# ATLAS Historicity Surface Boundary

Status: **UI-T6 contract**

## Why this boundary exists

ATLAS currently exposes two different historicity-related data surfaces. They are intentionally not the same dataset and MUST NOT be merged by display name.

### 1. Authoritative Person dataset

Source: `atlas_v2.persons` through `/api/atlas-person-read`.

Identity is the Person UUID. `Person.historicity` is an authoritative stored text value. The Main Person browser partitions this dataset by the stored `historicity` value before secondary search/facet filtering.

The primary historical group is exactly the raw stored value `historical`. All other raw values remain in the authoritative non-primary group without being coerced into a closed enum.

### 2. Curated non-timeline dataset

Source: `non-timeline-persons.json`.

These are curated operational records for people whose historical status and/or usable personal chronology is not currently suitable for the year-based map timeline. The dataset contains its own `historicity`, chronology basis, exclusion reason, and map policy fields.

It is a separate source. A matching Korean or English display name does not prove that a curated record and a DB Person are the same identity.

## Non-negotiable rules

1. **Historicity is not chronology certainty.** A historical Person with unknown, approximate, disputed, or traditional dates remains historical if the stored Person historicity says so.
2. **Do not infer myth/legend from notes, certainty, calendar, confidence, chronology status, or missing dates.**
3. **Do not infer identity from names.** Name equality, transliteration similarity, polity similarity, or overlapping traditional dates are insufficient to merge a curated record into a Person UUID.
4. **Do not silently hide collisions.** If the same visible name exists in both sources, both records remain visible until an explicit identity relationship is authored.
5. **Do not invent a closed historicity enum in Main UI.** Unknown future raw values must remain visible.
6. **Curated timeline exclusion is not a Person ontology value.** `timeline_status=excluded` describes current map/timeline handling, not proof that the subject is mythical.
7. **Future reconciliation requires an explicit identity link.** If curated records are migrated into authoritative Person storage, use a durable UUID/reference field or an explicit reviewed reconciliation record. Never use a name join.

## UI responsibilities

### Authoritative Person table

- shows DB Persons grouped from stored `Person.historicity`
- shows correlated Activity meaning from `activity_summaries`
- keeps date certainty separate from historicity
- opens authoritative Person detail and provenance

### Curated non-timeline table

- keeps a separate heading and table
- displays the curated historicity value
- exposes traditional-date basis, timeline status, reason, and map policy
- shares free-text Person search for discoverability
- does **not** inherit authoritative Activity relation/role/period-basis facet semantics or chronological sorting when those fields do not exist in the curated schema

## Reconciliation gate

A future implementation may combine the two surfaces only after the data model contains an explicit reviewed link such as a Person UUID on the curated record or a dedicated reconciliation table. The UI must then preserve source/provenance and the original historicity/timeline assertions instead of replacing one with the other.
