-- RETIREMENT CANCELLED: preserving legacy YouTube evidence is mandatory.
-- Earlier runs of the 2026-10-08 migration may already have removed rows.
-- This safe replacement cannot recover those rows; restore requires a backup.
-- Never delete pre-batch008 ledgers, old snapshots, or historical progress here.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-youtube:person-signal-publish:v2'));
-- Deliberately no data-changing statements.
COMMIT;
