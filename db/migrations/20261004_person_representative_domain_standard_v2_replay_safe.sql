BEGIN;
DO $$
DECLARE knowledge_count bigint; science_count bigint; invalid_count bigint; current_definition text; current_validated boolean;
BEGIN
  SELECT count(*) FILTER (WHERE representative_domain='knowledge'),
         count(*) FILTER (WHERE representative_domain='science'),
         count(*) FILTER (WHERE representative_domain IS NOT NULL AND representative_domain NOT IN ('governance','military','knowledge','science','technology','commerce','culture','religion','exploration'))
    INTO knowledge_count,science_count,invalid_count FROM atlas_v2.persons;
  IF invalid_count<>0 THEN RAISE EXCEPTION 'PERSON_DOMAIN_V2_REPLAY_UNSUPPORTED_STORED_VALUE'; END IF;
  IF knowledge_count>0 AND science_count>0 THEN RAISE EXCEPTION 'PERSON_DOMAIN_V2_REPLAY_MIXED_LEGACY_AND_V2_STATE'; END IF;
  SELECT pg_get_constraintdef(c.oid),c.convalidated INTO current_definition,current_validated FROM pg_constraint c WHERE c.conrelid='atlas_v2.persons'::regclass AND c.conname='persons_representative_domain_check';
  IF knowledge_count>0 THEN
    IF current_definition IS NULL OR position('knowledge' in current_definition)=0 THEN RAISE EXCEPTION 'PERSON_DOMAIN_V2_REPLAY_PRECUTOVER_CONSTRAINT_DRIFT'; END IF;
    RETURN;
  END IF;
  IF current_definition IS NOT NULL AND position('science' in current_definition)>0 AND position('knowledge' in current_definition)=0 AND current_validated THEN RETURN; END IF;
  ALTER TABLE atlas_v2.persons DROP CONSTRAINT IF EXISTS persons_representative_domain_check;
  ALTER TABLE atlas_v2.persons ADD CONSTRAINT persons_representative_domain_check CHECK (representative_domain IS NULL OR representative_domain IN ('governance','military','science','technology','commerce','culture','religion','exploration'));
  COMMENT ON COLUMN atlas_v2.persons.representative_domain IS 'Single editorial representative field for visualization. Controlled v2 values: governance, military, science, technology, commerce, culture, religion, exploration. NULL means unclassified.';
END $$;
COMMIT;
