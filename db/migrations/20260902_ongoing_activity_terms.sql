BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-authoring:ongoing-activity-terms:v1'));
SET LOCAL lock_timeout = '10s';

-- Existing closed intervals and their semantic index remain unchanged.
-- A null end is admitted only for an explicitly verified ongoing interval.
ALTER TABLE atlas_v2.person_politics_v2 ALTER COLUMN activity_end DROP NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='atlas_v2.person_politics_v2'::regclass
      AND conname='person_politics_v2_ongoing_end_check'
  ) THEN
    ALTER TABLE atlas_v2.person_politics_v2
      ADD CONSTRAINT person_politics_v2_ongoing_end_check CHECK (
        (activity_end IS NOT NULL AND chronology_status <> 'ongoing')
        OR (
          activity_end IS NULL AND chronology_status = 'ongoing'
          AND activity_end_month IS NULL AND activity_end_day IS NULL
          AND activity_end_granularity IS NULL AND activity_end_certainty IS NULL
          AND activity_end_calendar IS NULL
          AND activity_start_granularity IS NOT NULL AND activity_start_calendar IS NOT NULL
          AND ((source_locator->>'ongoing_as_of') ~ '^\d{4}-\d{2}-\d{2}$') IS TRUE
        )
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS person_politics_v2_ongoing_semantic_identity_uq
  ON atlas_v2.person_politics_v2 (
    person_id, polity_id, relation_type_id, role_id, period_basis_id,
    activity_start, activity_start_month, activity_start_day,
    activity_start_granularity, activity_start_calendar
  ) NULLS NOT DISTINCT
  WHERE chronology_status='ongoing' AND activity_end IS NULL;
COMMIT;
