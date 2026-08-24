BEGIN;

-- Final identity-bound cleanup for the Person→Polity community-semantics audit.
-- The canonical polity identities remain stable; only reviewed display semantics,
-- the missing primary relation, and stale explanatory text are corrected.

DO $$
DECLARE
  v_row atlas_v2.person_politics_v2%ROWTYPE;
  v_active_in uuid;
  v_count integer;
  v_clean_yu_notes text := 'Own-side political-community Activity for Yu Gwan-sun. ''Korea under Japanese Rule'' / ''일제강점기 조선'' is an ATLAS editorial catalog label for the non-sovereign Korean/Choson historical community under Japanese colonial rule, not an official state name and not the Empire of Japan or the Government-General of Korea. The March First Declaration explicitly declared Choson (朝鮮) an independent country and Choson people (朝鮮人) a self-governing people.';
BEGIN
  SELECT id INTO STRICT v_active_in
    FROM atlas_v2.person_polity_relation_types
   WHERE code='active_in';

  -- Lady Trieu / 조구(趙嫗): preserve the existing historical-polity identity and
  -- canonical key, but correct its preferred labels from the too-broad Jiaozhi
  -- wording to the uprising's Cửu Chân center. Her leadership is represented by
  -- the Role; `active_in` avoids overstating a sovereign reign while repairing
  -- the legacy one-sided polity/relation state.
  SELECT * INTO v_row
    FROM atlas_v2.person_politics_v2
   WHERE id='1a3440db-c329-58c4-af35-fdcf488fa3fd'::uuid;
  IF FOUND THEN
    IF v_row.person_id <> 'ea7456fa-c29d-5fac-979e-fc8c43824de4'::uuid THEN
      RAISE EXCEPTION 'POLITY_REVIEW_DRIFT_LADY_TRIEU_PERSON';
    END IF;
    IF v_row.polity_id <> 'bf322784-2ec3-5d3e-886b-654d5cf0fbf7'::uuid THEN
      RAISE EXCEPTION 'POLITY_REVIEW_DRIFT_LADY_TRIEU_POLITY';
    END IF;

    SELECT count(*)::int INTO v_count
      FROM atlas_v2.polity_names
     WHERE polity_id='bf322784-2ec3-5d3e-886b-654d5cf0fbf7'::uuid
       AND locale='en' AND is_preferred=true
       AND name IN ('Jiaozhi resistance','Cửu Chân resistance');
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'POLITY_REVIEW_DRIFT_LADY_TRIEU_EN_NAME';
    END IF;

    SELECT count(*)::int INTO v_count
      FROM atlas_v2.polity_names
     WHERE polity_id='bf322784-2ec3-5d3e-886b-654d5cf0fbf7'::uuid
       AND locale='ko' AND is_preferred=true
       AND name IN ('교주 저항 세력','구진 저항 세력');
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'POLITY_REVIEW_DRIFT_LADY_TRIEU_KO_NAME';
    END IF;

    IF EXISTS (
      SELECT 1 FROM atlas_v2.polity_names
       WHERE polity_id <> 'bf322784-2ec3-5d3e-886b-654d5cf0fbf7'::uuid
         AND name IN ('Cửu Chân resistance','구진 저항 세력')
    ) THEN
      RAISE EXCEPTION 'POLITY_REVIEW_LADY_TRIEU_NAME_COLLISION';
    END IF;

    UPDATE atlas_v2.polity_names
       SET name='Cửu Chân resistance'
     WHERE polity_id='bf322784-2ec3-5d3e-886b-654d5cf0fbf7'::uuid
       AND locale='en' AND is_preferred=true
       AND name='Jiaozhi resistance';

    UPDATE atlas_v2.polity_names
       SET name='구진 저항 세력'
     WHERE polity_id='bf322784-2ec3-5d3e-886b-654d5cf0fbf7'::uuid
       AND locale='ko' AND is_preferred=true
       AND name='교주 저항 세력';

    IF v_row.relation_type_id IS NULL THEN
      UPDATE atlas_v2.person_politics_v2
         SET relation_type_id=v_active_in,
             notes='ATLAS review 2026-08-24: Lady Trieu led the 248 uprising centered in Cửu Chân. The resistance community is her own-side primary polity. `active_in` avoids overstating sovereign rule, while the Rebel leader Role preserves her leadership.'
       WHERE id=v_row.id;
    ELSIF v_row.relation_type_id <> v_active_in THEN
      RAISE EXCEPTION 'POLITY_REVIEW_DRIFT_LADY_TRIEU_RELATION';
    END IF;
  END IF;

  -- Yu Gwan-sun / 유관순: the Activity and own-side polity are already correct.
  -- Remove only the stale sentence left over from the superseded design in which
  -- an Empire of Japan / opposes Person-Polity Activity was retained.
  SELECT * INTO v_row
    FROM atlas_v2.person_politics_v2
   WHERE id='a4f4d4cd-d3f4-418f-8391-407eddcc954f'::uuid;
  IF FOUND THEN
    IF v_row.person_id <> 'b411938f-dff4-4f32-9764-76237fc7bd3b'::uuid
       OR v_row.polity_id <> '1742fd4e-6e63-4210-9081-fcb166b42d6f'::uuid
       OR v_row.relation_type_id <> v_active_in THEN
      RAISE EXCEPTION 'POLITY_REVIEW_DRIFT_YU_GWAN_SUN_STATE';
    END IF;

    IF v_row.notes = v_clean_yu_notes THEN
      NULL;
    ELSIF v_row.notes LIKE '%The existing Empire of Japan / opposes Activity remains the counterparty relationship;%' THEN
      UPDATE atlas_v2.person_politics_v2
         SET notes=v_clean_yu_notes
       WHERE id=v_row.id;
    ELSE
      RAISE EXCEPTION 'POLITY_REVIEW_DRIFT_YU_GWAN_SUN_NOTES';
    END IF;
  END IF;
END
$$;

-- The model allows an Activity to have no defensible primary polity, but it
-- never allows only one half of the primary polity/relation pair to be present.
-- This database constraint complements the service-level validation and makes
-- the invariant durable for every write path.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid='atlas_v2.person_politics_v2'::regclass
       AND conname='person_politics_v2_primary_polity_relation_pair_check'
  ) THEN
    ALTER TABLE atlas_v2.person_politics_v2
      ADD CONSTRAINT person_politics_v2_primary_polity_relation_pair_check
      CHECK ((polity_id IS NULL) = (relation_type_id IS NULL));
  END IF;
END
$$;

COMMIT;
