# ATLAS Database Baseline

`schema/atlas_v2.current.sql` is the canonical **clean-database reconstruction baseline** for normalized `atlas_v2`. The complete current schema contract is reconstructed as:

`clean baseline + ordered authoring migrations + ordered correction migrations`

The migration registries are part of the reproducible schema contract until a later maintenance pass folds reviewed structural changes back into a refreshed clean baseline.

## Contract

- Source evidence: read-only live schema inventory `ATLAS_MAINTENANCE_LIVE_SCHEMA_INVENTORY_V1`.
- The baseline creates only `atlas_v2`; it must never recreate retired legacy `public.person_politics` or the retired compatibility view.
- It intentionally rejects a target where `atlas_v2` already exists. It is **not** an in-place migration script.
- Application data is not embedded in the schema baseline.
- Reviewed structural DB changes use ordered migration registries; migrations must be idempotent on their intended live target.
- Periodic maintenance may reconcile accumulated reviewed migrations back into a refreshed clean baseline, but live migrations remain authoritative historical evidence of how Production changed.

Current ordered registries:

- `server/atlas-authoring-migrations.js`
- `server/atlas-correction-migrations.js`

## Verification

`npm run test:schema` reconstructs the complete current schema on a fresh PostgreSQL database and verifies:

- the exact final table set after ordered migrations;
- the exact final constraint set;
- required maintenance/semantic indexes;
- authoring provenance columns;
- correction ledger columns;
- migration replay/idempotency;
- the null-role semantic unique index definition;
- absence of retired legacy objects;
- the clean-target guard.

The verification deliberately does **not** assert live row counts. Data volume changes are normal application activity, not schema drift.
