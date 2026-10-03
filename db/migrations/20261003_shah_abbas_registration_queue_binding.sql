BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-authoring:registration-queue:shah-abbas-i-binding:v1'));
SET LOCAL lock_timeout='10s';

DO $$
DECLARE
  target_candidate_id constant text := 'gplist3-20260921-071';
  target_person_id constant uuid := 'ba5b60c5-ac74-41ad-9158-aacfb77b7ac6'::uuid;
  current_person_id uuid;
BEGIN
  SELECT person_id
    INTO current_person_id
    FROM atlas_v2.person_registration_candidates
   WHERE candidate_id = target_candidate_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SHAH_ABBAS_QUEUE_CANDIDATE_NOT_FOUND:%', target_candidate_id;
  END IF;

  IF current_person_id IS NOT NULL AND current_person_id <> target_person_id THEN
    RAISE EXCEPTION 'SHAH_ABBAS_QUEUE_BINDING_CONFLICT:%:%', target_candidate_id, current_person_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM atlas_v2.persons p
      JOIN atlas_v2.person_names pn
        ON pn.person_id = p.id
       AND pn.locale = 'en'
       AND pn.is_preferred = true
     WHERE p.id = target_person_id
       AND pn.name = 'Abbas I'
  ) THEN
    RAISE EXCEPTION 'SHAH_ABBAS_CANONICAL_PERSON_MISMATCH:%', target_person_id;
  END IF;

  UPDATE atlas_v2.person_registration_candidates
     SET person_id = target_person_id,
         updated_at = now()
   WHERE candidate_id = target_candidate_id
     AND person_id IS NULL;

  SELECT person_id
    INTO current_person_id
    FROM atlas_v2.person_registration_candidates
   WHERE candidate_id = target_candidate_id;

  IF current_person_id IS DISTINCT FROM target_person_id THEN
    RAISE EXCEPTION 'SHAH_ABBAS_QUEUE_BINDING_FAILED:%:%', target_candidate_id, current_person_id;
  END IF;
END
$$;

COMMIT;
