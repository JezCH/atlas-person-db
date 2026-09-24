BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-authoring:person-portraits:simple-v3'));
SET LOCAL lock_timeout = '10s';

-- ATLAS portrait is intentionally one concept: the current portrait attached to a Person.
-- Research/evidence complexity belongs to the canonical production charter, not runtime portrait state.

ALTER TABLE atlas_v2.person_portraits
  DROP CONSTRAINT IF EXISTS person_portraits_current_revision_person_fkey,
  DROP CONSTRAINT IF EXISTS person_portraits_current_revision_uq;

ALTER TABLE atlas_v2.person_portraits
  DROP COLUMN IF EXISTS current_revision_id,
  DROP COLUMN IF EXISTS portrait_kind,
  DROP COLUMN IF EXISTS evidence_level;

DROP TABLE IF EXISTS atlas_v2.person_portrait_revision_sources;
DROP TABLE IF EXISTS atlas_v2.person_portrait_revisions;
DROP TABLE IF EXISTS atlas_v2.person_portrait_generation_runs;
DROP TABLE IF EXISTS atlas_v2.person_portrait_sources;
DROP TABLE IF EXISTS atlas_v2.person_portrait_assets;

COMMENT ON TABLE atlas_v2.person_portraits IS
  'Current ATLAS portrait per Person. The image is a canonical ATLAS portrait; no redundant kind/evidence/provenance taxonomy is stored here.';

COMMIT;
