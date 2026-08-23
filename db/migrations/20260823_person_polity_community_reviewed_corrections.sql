BEGIN;

-- Reviewed Person→Polity corrections for resistance / colonial-context cases.
-- This migration is deliberately identity-bound. It never rewrites rows merely
-- because their relation code is `opposes`. Missing target Activities are a
-- no-op so a clean schema reconstruction remains possible; present rows must
-- match either the reviewed before-state or the intended after-state.

DO $$
DECLARE
  v_row atlas_v2.person_politics_v2%ROWTYPE;
  v_opposes uuid;
  v_active_in uuid;
  v_rules uuid;
  v_philippines uuid;
  v_pirates uuid;
BEGIN
  SELECT id INTO STRICT v_opposes FROM atlas_v2.person_polity_relation_types WHERE code='opposes';
  SELECT id INTO STRICT v_active_in FROM atlas_v2.person_polity_relation_types WHERE code='active_in';
  SELECT id INTO STRICT v_rules FROM atlas_v2.person_polity_relation_types WHERE code='rules';

  -- Spartacus: Roman Republic is the opponent/context, not Spartacus's own polity.
  SELECT * INTO v_row FROM atlas_v2.person_politics_v2
   WHERE id='6c7e0f1c-d843-4b8a-a436-fad247840b31'::uuid;
  IF FOUND THEN
    IF v_row.person_id <> 'e727f13f-f80b-42bd-a482-ef9efd87fdac'::uuid THEN
      RAISE EXCEPTION 'POLITY_REVIEW_DRIFT_SPARTACUS_PERSON';
    END IF;
    IF v_row.polity_id='ea997325-953a-5c95-b5ea-3c34b47ceb56'::uuid AND v_row.relation_type_id=v_opposes THEN
      INSERT INTO atlas_v2.person_politics_context_polities(person_politics_id,polity_id,relation_type_id)
      VALUES(v_row.id,v_row.polity_id,v_opposes) ON CONFLICT DO NOTHING;
      UPDATE atlas_v2.person_politics_v2
         SET polity_id=NULL, relation_type_id=NULL,
             notes='ATLAS review 2026-08-23: Roman Republic is opponent context, not Spartacus''s primary polity.'
       WHERE id=v_row.id;
    ELSIF v_row.polity_id IS NULL AND v_row.relation_type_id IS NULL THEN
      INSERT INTO atlas_v2.person_politics_context_polities(person_politics_id,polity_id,relation_type_id)
      VALUES(v_row.id,'ea997325-953a-5c95-b5ea-3c34b47ceb56'::uuid,v_opposes) ON CONFLICT DO NOTHING;
    ELSE
      RAISE EXCEPTION 'POLITY_REVIEW_DRIFT_SPARTACUS_STATE';
    END IF;
  END IF;

  -- Zhang Jue: Eastern Han is the state opposed by the Yellow Turban uprising.
  SELECT * INTO v_row FROM atlas_v2.person_politics_v2
   WHERE id='fae6f22a-cd28-4cf9-be4a-d7dc60e20ef0'::uuid;
  IF FOUND THEN
    IF v_row.person_id <> '0551c705-0042-497c-9980-c6da930c4e07'::uuid THEN
      RAISE EXCEPTION 'POLITY_REVIEW_DRIFT_ZHANG_JUE_PERSON';
    END IF;
    IF v_row.polity_id='4c9dcd32-845a-5579-a134-7895f0af54f9'::uuid AND v_row.relation_type_id IS NULL THEN
      INSERT INTO atlas_v2.person_politics_context_polities(person_politics_id,polity_id,relation_type_id)
      VALUES(v_row.id,v_row.polity_id,v_opposes) ON CONFLICT DO NOTHING;
      UPDATE atlas_v2.person_politics_v2
         SET polity_id=NULL, relation_type_id=NULL,
             notes='ATLAS review 2026-08-23: Eastern Han is opponent context; no defensible primary Yellow Turban polity is asserted.'
       WHERE id=v_row.id;
    ELSIF v_row.polity_id IS NULL AND v_row.relation_type_id IS NULL THEN
      INSERT INTO atlas_v2.person_politics_context_polities(person_politics_id,polity_id,relation_type_id)
      VALUES(v_row.id,'4c9dcd32-845a-5579-a134-7895f0af54f9'::uuid,v_opposes) ON CONFLICT DO NOTHING;
    ELSE
      RAISE EXCEPTION 'POLITY_REVIEW_DRIFT_ZHANG_JUE_STATE';
    END IF;
  END IF;

  -- Toypurina: Spanish Empire is colonial/opponent context. Tongva identity is
  -- historical, but this Activity does not establish a separate sovereign polity.
  SELECT * INTO v_row FROM atlas_v2.person_politics_v2
   WHERE id='3ce0a2e1-98e4-52b1-8843-ef6c69701425'::uuid;
  IF FOUND THEN
    IF v_row.person_id <> '516766d6-07b8-56d4-9cc6-b7aa0d76b554'::uuid THEN
      RAISE EXCEPTION 'POLITY_REVIEW_DRIFT_TOYPURINA_PERSON';
    END IF;
    IF v_row.polity_id='fd4a92ff-f1e8-50c2-b5d2-5f65d77d7fcc'::uuid AND v_row.relation_type_id=v_opposes THEN
      INSERT INTO atlas_v2.person_politics_context_polities(person_politics_id,polity_id,relation_type_id)
      VALUES(v_row.id,v_row.polity_id,v_opposes) ON CONFLICT DO NOTHING;
      UPDATE atlas_v2.person_politics_v2
         SET polity_id=NULL, relation_type_id=NULL,
             notes='ATLAS review 2026-08-23: Spanish Empire is colonial/opponent context; no separate primary polity is asserted.'
       WHERE id=v_row.id;
    ELSIF v_row.polity_id IS NULL AND v_row.relation_type_id IS NULL THEN
      INSERT INTO atlas_v2.person_politics_context_polities(person_politics_id,polity_id,relation_type_id)
      VALUES(v_row.id,'fd4a92ff-f1e8-50c2-b5d2-5f65d77d7fcc'::uuid,v_opposes) ON CONFLICT DO NOTHING;
    ELSE
      RAISE EXCEPTION 'POLITY_REVIEW_DRIFT_TOYPURINA_STATE';
    END IF;
  END IF;

  -- William I of Orange: preserve his own Low Countries row; Spanish Monarchy
  -- belongs only in opponent context for this resistance Activity.
  SELECT * INTO v_row FROM atlas_v2.person_politics_v2
   WHERE id='2c9b580a-b31f-4de3-9206-e3decb4c8a53'::uuid;
  IF FOUND THEN
    IF v_row.person_id <> 'f0533dad-8e42-4fd8-b5f0-6f6b94dc1783'::uuid THEN
      RAISE EXCEPTION 'POLITY_REVIEW_DRIFT_WILLIAM_ORANGE_PERSON';
    END IF;
    IF v_row.polity_id='db11c7c6-19f5-5d46-a278-589d76715acc'::uuid AND v_row.relation_type_id=v_opposes THEN
      INSERT INTO atlas_v2.person_politics_context_polities(person_politics_id,polity_id,relation_type_id)
      VALUES(v_row.id,v_row.polity_id,v_opposes) ON CONFLICT DO NOTHING;
      UPDATE atlas_v2.person_politics_v2
         SET polity_id=NULL, relation_type_id=NULL,
             notes='ATLAS review 2026-08-23: Spanish Monarchy is opponent context; William''s own-side Low Countries Activity remains separate.'
       WHERE id=v_row.id;
    ELSIF v_row.polity_id IS NULL AND v_row.relation_type_id IS NULL THEN
      INSERT INTO atlas_v2.person_politics_context_polities(person_politics_id,polity_id,relation_type_id)
      VALUES(v_row.id,'db11c7c6-19f5-5d46-a278-589d76715acc'::uuid,v_opposes) ON CONFLICT DO NOTHING;
    ELSE
      RAISE EXCEPTION 'POLITY_REVIEW_DRIFT_WILLIAM_ORANGE_STATE';
    END IF;
  END IF;

  -- Gandhi: India is the represented political community; British Raj is
  -- colonial/opponent context for the 1915–1947 Activity.
  SELECT * INTO v_row FROM atlas_v2.person_politics_v2
   WHERE id='02f6e078-2857-4c83-9d3d-f66541177ead'::uuid;
  IF FOUND THEN
    IF v_row.person_id <> '3979d580-8b7e-4049-930c-b6b445a57301'::uuid THEN
      RAISE EXCEPTION 'POLITY_REVIEW_DRIFT_GANDHI_PERSON';
    END IF;
    IF v_row.polity_id='e1d60342-fc99-5bfb-b8e8-bff0fdb9ca20'::uuid AND v_row.relation_type_id=v_opposes THEN
      INSERT INTO atlas_v2.person_politics_context_polities(person_politics_id,polity_id,relation_type_id)
      VALUES(v_row.id,v_row.polity_id,v_opposes) ON CONFLICT DO NOTHING;
      UPDATE atlas_v2.person_politics_v2
         SET polity_id='e9a954cc-abed-5125-b9ce-8bc9653f13d4'::uuid,
             relation_type_id=v_active_in,
             notes='ATLAS review 2026-08-23: India is Gandhi''s primary political community; British Raj is colonial/opponent context.'
       WHERE id=v_row.id;
    ELSIF v_row.polity_id='e9a954cc-abed-5125-b9ce-8bc9653f13d4'::uuid AND v_row.relation_type_id=v_active_in THEN
      INSERT INTO atlas_v2.person_politics_context_polities(person_politics_id,polity_id,relation_type_id)
      VALUES(v_row.id,'e1d60342-fc99-5bfb-b8e8-bff0fdb9ca20'::uuid,v_opposes) ON CONFLICT DO NOTHING;
    ELSE
      RAISE EXCEPTION 'POLITY_REVIEW_DRIFT_GANDHI_STATE';
    END IF;
  END IF;

  -- Che Guevara: Cuba is already the correct political community. The legacy
  -- `opposes` relation incorrectly treated opposition to the Batista regime as
  -- opposition to Cuba itself, so only the primary relation changes.
  SELECT * INTO v_row FROM atlas_v2.person_politics_v2
   WHERE id='de6ebd0b-11fe-42a5-a25e-ecce15655bbb'::uuid;
  IF FOUND THEN
    IF v_row.person_id <> 'e6ad4f51-d77e-498d-b885-a917900910a6'::uuid THEN
      RAISE EXCEPTION 'POLITY_REVIEW_DRIFT_CHE_PERSON';
    END IF;
    IF v_row.polity_id='d33e9969-9007-57ff-ba1c-a415cc3f9d25'::uuid AND v_row.relation_type_id=v_opposes THEN
      UPDATE atlas_v2.person_politics_v2
         SET relation_type_id=v_active_in,
             notes='ATLAS review 2026-08-23: Cuba remains the primary polity; opposition was to the Batista regime, not to Cuba as a polity.'
       WHERE id=v_row.id;
    ELSIF NOT (v_row.polity_id='d33e9969-9007-57ff-ba1c-a415cc3f9d25'::uuid AND v_row.relation_type_id=v_active_in) THEN
      RAISE EXCEPTION 'POLITY_REVIEW_DRIFT_CHE_STATE';
    END IF;
  END IF;

  -- José Rizal: create an explicit editorial historical-community identity for
  -- the Spanish-colonial Philippine period instead of using the colonial
  -- Captaincy General as Rizal's own polity.
  IF EXISTS (SELECT 1 FROM atlas_v2.person_politics_v2 WHERE id='8b69c528-a2af-4b74-8142-d56fa74e6f45'::uuid) THEN
    SELECT id INTO v_philippines FROM atlas_v2.polities WHERE canonical_key='Spanish colonial Philippines';
    IF v_philippines IS NULL THEN
      IF EXISTS (SELECT 1 FROM atlas_v2.polity_names WHERE name IN ('Spanish colonial Philippines','스페인 식민지기 필리핀')) THEN
        RAISE EXCEPTION 'POLITY_REVIEW_RIZAL_POLITY_NAME_COLLISION';
      END IF;
      INSERT INTO atlas_v2.polities(id,canonical_key,polity_type,historicity)
      VALUES(gen_random_uuid(),'Spanish colonial Philippines','historical_polity','historical') RETURNING id INTO v_philippines;
      INSERT INTO atlas_v2.polity_names(id,polity_id,locale,name,name_type,is_preferred) VALUES
        (gen_random_uuid(),v_philippines,'en','Spanish colonial Philippines','editorial_catalog_label',true),
        (gen_random_uuid(),v_philippines,'ko','스페인 식민지기 필리핀','editorial_catalog_label',true);
      INSERT INTO atlas_v2.polity_descriptions(id,polity_id,locale,content) VALUES
        (gen_random_uuid(),v_philippines,'en','ATLAS editorial historical-community label for the Philippines under Spanish colonial rule; not the colonial administration itself.'),
        (gen_random_uuid(),v_philippines,'ko','스페인 식민통치기의 필리핀 역사·정치공동체를 식별하는 ATLAS 편집 명칭이며 식민 행정기관 자체를 뜻하지 않는다.');
    END IF;

    SELECT * INTO STRICT v_row FROM atlas_v2.person_politics_v2
     WHERE id='8b69c528-a2af-4b74-8142-d56fa74e6f45'::uuid;
    IF v_row.person_id <> 'd405be70-dea0-43d8-94fc-2f2140326325'::uuid THEN
      RAISE EXCEPTION 'POLITY_REVIEW_DRIFT_RIZAL_PERSON';
    END IF;
    IF v_row.polity_id='434a4aa7-ed53-5685-8cb3-d64cd217c67f'::uuid AND v_row.relation_type_id IS NULL THEN
      INSERT INTO atlas_v2.person_politics_context_polities(person_politics_id,polity_id,relation_type_id)
      VALUES(v_row.id,v_row.polity_id,v_active_in) ON CONFLICT DO NOTHING;
      UPDATE atlas_v2.person_politics_v2
         SET polity_id=v_philippines, relation_type_id=v_active_in,
             notes='ATLAS review 2026-08-23: Spanish-colonial Philippines is Rizal''s represented historical community; Captaincy General is colonial jurisdiction context.'
       WHERE id=v_row.id;
    ELSIF NOT (v_row.polity_id=v_philippines AND v_row.relation_type_id=v_active_in) THEN
      RAISE EXCEPTION 'POLITY_REVIEW_DRIFT_RIZAL_STATE';
    END IF;
  END IF;

  -- Zheng Yi Sao / Ching Shih: scholarship treats the Guangdong pirate bands as
  -- political communities; the 1805 confederation is therefore a defensible
  -- primary polity rather than Qing, which is preserved as opponent context.
  IF EXISTS (SELECT 1 FROM atlas_v2.person_politics_v2 WHERE id='10de3778-f47a-4b6e-aa98-d2003270977b'::uuid) THEN
    SELECT id INTO v_pirates FROM atlas_v2.polities WHERE canonical_key='Guangdong Pirate Confederation';
    IF v_pirates IS NULL THEN
      IF EXISTS (SELECT 1 FROM atlas_v2.polity_names WHERE name IN ('Guangdong Pirate Confederation','광둥 해적 연맹')) THEN
        RAISE EXCEPTION 'POLITY_REVIEW_ZHENG_YI_SAO_POLITY_NAME_COLLISION';
      END IF;
      INSERT INTO atlas_v2.polities(id,canonical_key,polity_type,historicity)
      VALUES(gen_random_uuid(),'Guangdong Pirate Confederation','historical_polity','historical') RETURNING id INTO v_pirates;
      INSERT INTO atlas_v2.polity_names(id,polity_id,locale,name,name_type,is_preferred) VALUES
        (gen_random_uuid(),v_pirates,'en','Guangdong Pirate Confederation','canonical',true),
        (gen_random_uuid(),v_pirates,'ko','광둥 해적 연맹','display',true);
    END IF;

    SELECT * INTO STRICT v_row FROM atlas_v2.person_politics_v2
     WHERE id='10de3778-f47a-4b6e-aa98-d2003270977b'::uuid;
    IF v_row.person_id <> 'b78d9a03-e09e-4108-a3e4-250757194178'::uuid THEN
      RAISE EXCEPTION 'POLITY_REVIEW_DRIFT_ZHENG_YI_SAO_PERSON';
    END IF;
    IF v_row.polity_id='7f5306e1-a2b4-5d0a-bc50-4596df7fdd76'::uuid AND v_row.relation_type_id=v_opposes THEN
      INSERT INTO atlas_v2.person_politics_context_polities(person_politics_id,polity_id,relation_type_id)
      VALUES(v_row.id,v_row.polity_id,v_opposes) ON CONFLICT DO NOTHING;
      UPDATE atlas_v2.person_politics_v2
         SET polity_id=v_pirates, relation_type_id=v_rules,
             notes='ATLAS review 2026-08-23: Guangdong Pirate Confederation is the primary political community; Qing is opponent context.'
       WHERE id=v_row.id;
    ELSIF NOT (v_row.polity_id=v_pirates AND v_row.relation_type_id=v_rules) THEN
      RAISE EXCEPTION 'POLITY_REVIEW_DRIFT_ZHENG_YI_SAO_STATE';
    END IF;
  END IF;
END
$$;

COMMIT;
