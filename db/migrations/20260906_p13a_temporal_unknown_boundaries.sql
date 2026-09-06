BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-authoring:p13a-temporal-unknown-boundaries:v1'));
SET LOCAL lock_timeout = '10s';

DO $$
BEGIN
  -- Clean-schema rehearsals may reach authoring migrations before the Stage 2
  -- temporal expansion. Replay this migration after that schema exists.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='atlas_v2' AND table_name='person_politics_v2'
      AND column_name='activity_end_month'
  ) THEN
    RAISE NOTICE 'P13A temporal unknown boundaries await the Stage 2 temporal schema';
    RETURN;
  END IF;

  -- An unresolved boundary is represented by an all-null tuple. It is never a
  -- fabricated historical year. Ongoing remains a separate chronology state.
  ALTER TABLE atlas_v2.person_politics_v2 ALTER COLUMN activity_start DROP NOT NULL;
  ALTER TABLE atlas_v2.person_politics_v2 ALTER COLUMN activity_end DROP NOT NULL;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='atlas_v2.person_politics_v2'::regclass
      AND conname='person_politics_v2_ongoing_end_check'
  ) THEN
    ALTER TABLE atlas_v2.person_politics_v2
      DROP CONSTRAINT person_politics_v2_ongoing_end_check;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='atlas_v2.person_politics_v2'::regclass
      AND conname='person_politics_v2_start_boundary_shape_check'
  ) THEN
    ALTER TABLE atlas_v2.person_politics_v2
      ADD CONSTRAINT person_politics_v2_start_boundary_shape_check CHECK (
        activity_start IS NOT NULL
        OR (
          activity_start_month IS NULL AND activity_start_day IS NULL
          AND activity_start_granularity IS NULL AND activity_start_certainty IS NULL
          AND activity_start_calendar IS NULL
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='atlas_v2.person_politics_v2'::regclass
      AND conname='person_politics_v2_end_boundary_shape_check'
  ) THEN
    ALTER TABLE atlas_v2.person_politics_v2
      ADD CONSTRAINT person_politics_v2_end_boundary_shape_check CHECK (
        activity_end IS NOT NULL
        OR (
          activity_end_month IS NULL AND activity_end_day IS NULL
          AND activity_end_granularity IS NULL AND activity_end_certainty IS NULL
          AND activity_end_calendar IS NULL
        )
      );
  END IF;

  ALTER TABLE atlas_v2.person_politics_v2
    ADD CONSTRAINT person_politics_v2_ongoing_end_check CHECK (
      (
        chronology_status = 'ongoing'
        AND activity_end IS NULL
        AND activity_end_month IS NULL AND activity_end_day IS NULL
        AND activity_end_granularity IS NULL AND activity_end_certainty IS NULL
        AND activity_end_calendar IS NULL
        AND ((source_locator->>'ongoing_as_of') ~ '^\d{4}-\d{2}-\d{2}$') IS TRUE
      )
      OR (
        chronology_status <> 'ongoing'
        AND (
          activity_end IS NOT NULL
          OR (
            activity_end IS NULL
            AND activity_end_month IS NULL AND activity_end_day IS NULL
            AND activity_end_granularity IS NULL AND activity_end_certainty IS NULL
            AND activity_end_calendar IS NULL
          )
        )
      )
    );

  -- P9 continues to own fully-known closed identity and the existing ongoing
  -- index continues to own <ONGOING>. This index closes only the unresolved
  -- non-ongoing gap, so <UNKNOWN> and <ONGOING> never collapse together.
  CREATE UNIQUE INDEX IF NOT EXISTS person_politics_v2_unknown_semantic_identity_uq
    ON atlas_v2.person_politics_v2 (
      person_id, polity_id, relation_type_id, role_id, period_basis_id,
      activity_start, activity_start_month, activity_start_day,
      activity_start_granularity, activity_start_calendar,
      activity_end, activity_end_month, activity_end_day,
      activity_end_granularity, activity_end_calendar
    ) NULLS NOT DISTINCT
    WHERE relation_type_id IS NOT NULL
      AND chronology_status <> 'ongoing'
      AND (activity_start IS NULL OR activity_end IS NULL);
END $$;

COMMIT;
