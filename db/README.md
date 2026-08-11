# ATLAS Database Baseline

`schema/atlas_v2.current.sql` is the canonical **clean-database reconstruction baseline** for the current normalized `atlas_v2` schema.

## Contract

- Source evidence: read-only live schema inventory `ATLAS_MAINTENANCE_LIVE_SCHEMA_INVENTORY_V1`.
- The baseline creates only `atlas_v2`; it must never recreate retired legacy `public.person_politics` or the retired compatibility view.
- It intentionally rejects a target where `atlas_v2` already exists. It is **not** an in-place migration script.
- Application data is not embedded in the schema baseline.
- Future structural DB changes must be represented by a reviewed migration and then reconciled back into this current baseline.

## Verification

`npm run test:schema` applies the baseline to a fresh PostgreSQL database and verifies:

- the exact current table set;
- the exact current constraint set;
- required maintenance/semantic indexes;
- the null-role semantic unique index definition;
- absence of retired legacy objects;
- the clean-target guard.

The verification deliberately does **not** assert live row counts. Data volume changes are normal application activity, not schema drift.
