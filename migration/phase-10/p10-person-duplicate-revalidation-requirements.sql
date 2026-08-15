-- ATLAS P10 Person duplicate revalidation requirements.
--
-- This ledger records reviewed Person pairs that MUST appear in the P10
-- revalidation frontier even when the heuristic detector does not nominate them.
-- Person UUIDs are deliberate historical snapshots: there are no Person FKs,
-- because a completed physical merge will retire one of the two Person rows.
-- Applying this migration does NOT authorize or execute a Person merge.
-- Replay preserves lifecycle progress: an already RETIRED requirement is valid
-- and must never be reactivated by migration replay.

BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-p10-person-duplicate-revalidation-requirements-v1'));

CREATE TABLE IF NOT EXISTS atlas_v2.person_duplicate_revalidation_requirements (
  requirement_key text PRIMARY KEY,
  person_low_id uuid NOT NULL,
  person_high_id uuid NOT NULL,
  requirement_state text NOT NULL DEFAULT 'ACTIVE'
    CHECK (requirement_state IN ('ACTIVE','RETIRED')),
  requirement_version text NOT NULL,
  prior_outcome text NOT NULL
    CHECK (prior_outcome IN ('MERGE','KEEP_SEPARATE')),
  source_artifact text NOT NULL,
  source_decision_id text NOT NULL,
  evidence_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (person_low_id < person_high_id),
  UNIQUE (person_low_id, person_high_id)
);

INSERT INTO atlas_v2.person_duplicate_revalidation_requirements (
  requirement_key,
  person_low_id,
  person_high_id,
  requirement_state,
  requirement_version,
  prior_outcome,
  source_artifact,
  source_decision_id,
  evidence_snapshot
) VALUES (
  'p10:gorgo-of-sparta:gorgo:p4-reviewed-same-person',
  '5136407a-9792-5103-be6f-54c947b255a5'::uuid,
  'a3367f19-e901-5213-aba6-76c4aef1b730'::uuid,
  'ACTIVE',
  'p10-revalidation-requirement/v1',
  'MERGE',
  'stage2/integration/baseline-a-person-identity-decisions.v1.json',
  'gorgo_sparta_same_person',
  jsonb_build_object(
    'current_person', 'Gorgo of Sparta',
    'duplicate_person', 'Gorgo',
    'canonical_survivor_person_id', '5136407a-9792-5103-be6f-54c947b255a5',
    'duplicate_current_activity_count_expected', 0,
    'detector_note', 'Historical review, not heuristic-name overlap, requires this pair to enter P10 revalidation.',
    'evidence_urls', jsonb_build_array(
      'https://academic.oup.com/edited-volume/61673/chapter-abstract/549657234?login=false',
      'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.04.0104%3Aentry%3Dcleomenes-i-bio-1'
    )
  )
)
ON CONFLICT (requirement_key) DO NOTHING;

DO $$
DECLARE
  contract_errors text;
  seed_count integer;
BEGIN
  WITH expected(column_name, data_type) AS (
    VALUES
      ('requirement_key','text'),
      ('person_low_id','uuid'),
      ('person_high_id','uuid'),
      ('requirement_state','text'),
      ('requirement_version','text'),
      ('prior_outcome','text'),
      ('source_artifact','text'),
      ('source_decision_id','text'),
      ('evidence_snapshot','jsonb'),
      ('created_at','timestamp with time zone'),
      ('updated_at','timestamp with time zone')
  )
  SELECT string_agg(
           expected.column_name || ':' || expected.data_type || '!=' || coalesce(actual.data_type,'<missing>'),
           ', ' ORDER BY expected.column_name
         )
    INTO contract_errors
    FROM expected
    LEFT JOIN information_schema.columns actual
      ON actual.table_schema='atlas_v2'
     AND actual.table_name='person_duplicate_revalidation_requirements'
     AND actual.column_name=expected.column_name
   WHERE actual.column_name IS NULL OR actual.data_type<>expected.data_type;

  IF contract_errors IS NOT NULL THEN
    RAISE EXCEPTION 'person_duplicate_revalidation_requirements contract mismatch: %', contract_errors;
  END IF;

  SELECT count(*)::int
    INTO seed_count
    FROM atlas_v2.person_duplicate_revalidation_requirements
   WHERE requirement_key='p10:gorgo-of-sparta:gorgo:p4-reviewed-same-person'
     AND person_low_id='5136407a-9792-5103-be6f-54c947b255a5'::uuid
     AND person_high_id='a3367f19-e901-5213-aba6-76c4aef1b730'::uuid
     AND requirement_state IN ('ACTIVE','RETIRED')
     AND requirement_version='p10-revalidation-requirement/v1'
     AND prior_outcome='MERGE'
     AND source_artifact='stage2/integration/baseline-a-person-identity-decisions.v1.json'
     AND source_decision_id='gorgo_sparta_same_person';

  IF seed_count <> 1 THEN
    RAISE EXCEPTION 'P10 Gorgo revalidation requirement seed mismatch';
  END IF;
END $$;

COMMIT;
