# Indira Gandhi exact-date correction supersession — 2026-08-30

The two active correction intents below were experimental metadata-only repairs:

- `corrections/intents/indira-gandhi-first-term-temporal-metadata-20260830.json`
- `corrections/intents/indira-gandhi-second-term-temporal-metadata-20260830.json`

They were proven non-executable against Production because both legacy Activities had `relation_type_id = null`, and a metadata-only UPDATE violates `person_politics_v2_primary_polity_relation_pair_check`.

Correction Apply runs #48 and #49 were used only to capture exact live snapshots. Their dry-runs failed before apply, so they committed no Production mutation.

They were superseded by PR #639, `Refine Indira Gandhi and Thomas Jefferson exact dates`, merged as:

`35deecace3edc15ebc851b6b47f9e6abf13d435e`

The successful Correction v2 plan is:

`corrections/plans/indira-gandhi-thomas-jefferson-exact-dates-20260830.v1.json`

ATLAS Correction Apply run #50 completed successfully and atomically rewrote the existing Activity UUIDs.

Removing the two failed intents from the active `corrections/intents/` directory prevents accidental manual redispatch of a known-invalid operation. This cleanup deletes no Person, Activity, Polity, source, or Production data.
