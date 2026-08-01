# ATLAS Person Activity Model

## Current physical table

`person_politics` is treated as the activity-relation table for the current MVP. Each row represents one bounded activity period linking a canonical person name to a polity.

Required fields:

- `person_name`: canonical English person name
- `politic_name`: canonical English polity name
- `activity_start`: signed integer year; BCE years are negative
- `activity_end`: signed integer year; BCE years are negative
- `role`: English role label for this activity period
- `period_basis`: controlled activity-period type
- `notes`: English explanatory note

## Cardinality

A person may have multiple rows. This is intentional and represents a one-to-many relationship between Person and PersonActivity.

Examples:

- Napoleon I: 1804–1814 reign; 1815 reign
- Tokugawa Ieyasu: 1603–1605 reign; 1605–1616 de facto rule

## Identity rule

Until the normalized `persons` table is introduced, `person_name` is the temporary canonical person identity. New records must use one canonical English name consistently.

## Duplicate key

The current activity identity key is:

`person_name + politic_name + activity_start + activity_end`

The ingest reconciler removes duplicate keys and removes obsolete activity periods for persons managed by `pending-records.json`.

## Future normalized schema

The current table can later migrate without changing activity semantics:

- `persons(id, canonical_name, ...)`
- `polities(id, canonical_name, ...)`
- `person_activities(id, person_id, polity_id, activity_start, activity_end, role, period_basis, notes, ...)`

The present dataset is already structured so each existing row maps directly to one future `person_activities` row.
