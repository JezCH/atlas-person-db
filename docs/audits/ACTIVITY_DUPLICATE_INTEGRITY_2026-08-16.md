# Same-Person Activity Integrity Audit — 2026-08-16

> **SUPERSEDED.** The first-pass policy in this file incorrectly treated exact `atlas-activity-semantic-key/v2` equality as the effective boundary of duplication. That is valid for native write uniqueness but too narrow for legacy/migration duplicate detection.
>
> The corrected Production-wide verdict is maintained in [`ACTIVITY_DUPLICATE_INTEGRITY_2026-08-16_CORRECTED.md`](./ACTIVITY_DUPLICATE_INTEGRITY_2026-08-16_CORRECTED.md).

The corrected audit re-read all 41 Persons with 2+ Activities from current protected Production and distinguishes exact duplicates, legacy relation gaps, role aliases, polity-identity duplicates, stale broad rows, aggregate overlays, genuine polity-assignment errors, and legitimate multi-phase Activities.

Do not use the original “only exact semantic-key equality is a duplicate” conclusion for cleanup decisions.