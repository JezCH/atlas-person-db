BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-authoring:source-bibliographic-completion:v1'));
SET LOCAL lock_timeout = '10s';

ALTER TABLE atlas_v2.sources
  ADD COLUMN IF NOT EXISTS author_creator text,
  ADD COLUMN IF NOT EXISTS institution text,
  ADD COLUMN IF NOT EXISTS publisher text,
  ADD COLUMN IF NOT EXISTS publication_date date,
  ADD COLUMN IF NOT EXISTS publication_year integer,
  ADD COLUMN IF NOT EXISTS external_identifier text,
  ADD COLUMN IF NOT EXISTS citation_metadata jsonb,
  ADD COLUMN IF NOT EXISTS artifact_metadata jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname='sources_publication_year_nonzero_ck'
       AND conrelid='atlas_v2.sources'::regclass
  ) THEN
    ALTER TABLE atlas_v2.sources
      ADD CONSTRAINT sources_publication_year_nonzero_ck
      CHECK (publication_year IS NULL OR publication_year <> 0);
  END IF;
END $$;

COMMIT;
