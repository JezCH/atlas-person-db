BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-authoring:polity-place-function-authority:v1'));
SET LOCAL lock_timeout='10s';

CREATE TABLE IF NOT EXISTS atlas_v2.polity_place_functions (
  fact_key text PRIMARY KEY,
  polity_id uuid NOT NULL REFERENCES atlas_v2.polities(id) ON DELETE RESTRICT,
  function_type text NOT NULL,
  place_id uuid NOT NULL REFERENCES atlas_v2.places(id) ON DELETE RESTRICT,
  start_year integer,
  end_year integer,
  confidence text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT polity_place_functions_type_ck CHECK(function_type IN ('capital','royal_court','royal_residence','imperial_court_core','political_center','administrative_center')),
  CONSTRAINT polity_place_functions_confidence_ck CHECK(confidence IN ('well_established','likely','speculative','disputed','unknown')),
  CONSTRAINT polity_place_functions_start_year_ck CHECK(start_year IS NULL OR start_year <> 0),
  CONSTRAINT polity_place_functions_end_year_ck CHECK(end_year IS NULL OR end_year <> 0),
  CONSTRAINT polity_place_functions_interval_ck CHECK(start_year IS NULL OR end_year IS NULL OR start_year <= end_year),
  CONSTRAINT polity_place_functions_semantic_uq UNIQUE NULLS NOT DISTINCT(polity_id,function_type,place_id,start_year,end_year)
);

CREATE TABLE IF NOT EXISTS atlas_v2.polity_place_function_sources (
  fact_key text NOT NULL REFERENCES atlas_v2.polity_place_functions(fact_key) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES atlas_v2.sources(id) ON DELETE RESTRICT,
  source_locator_key text NOT NULL,
  PRIMARY KEY(fact_key,source_id,source_locator_key),
  CONSTRAINT polity_place_function_sources_locator_ck CHECK(length(btrim(source_locator_key)) > 0)
);

DO $seed$
DECLARE target_count integer;
BEGIN
  SELECT count(*)::int INTO target_count
    FROM atlas_v2.polities
   WHERE id = ANY(ARRAY['01f4ce7b-aaa3-473a-a6fd-9c95c4a85ff7'::uuid,'074510f4-f2e7-5795-8cfb-2a4206fa7254'::uuid,'28448862-277d-4738-9fb4-7f51a9e4c03a'::uuid,'2f6e890f-1704-5c76-aa94-f18d7f905e06'::uuid,'3b8f7efc-40ae-5a33-8956-e9e852fbede4'::uuid,'5d9a6186-bbe6-5d1a-ba93-02190ae4c417'::uuid,'5fce7b7e-7e6c-5f91-96b6-ebcd925b0a90'::uuid,'6539c314-ec29-42e0-a0c2-90991fb9ffd8'::uuid,'68c83ef6-0023-5af9-a6e8-26ccf5b8e116'::uuid,'6d1520e2-0aff-5063-b2b7-95eb86daf372'::uuid,'a1697cdb-1085-545c-850e-1bbc25cdb61b'::uuid,'d54c540c-f3fb-5d05-9dc0-26af4ee9815a'::uuid,'e3da3007-529a-40ec-9934-7b70dfd11cb7'::uuid]);
  IF target_count = 0 THEN
    RETURN;
  END IF;
  IF target_count <> 13 THEN
    RAISE EXCEPTION 'SPATIAL_POLITY_PLACE_FUNCTION_BACKFILL_PARTIAL_POLITY_SET:%/13', target_count;
  END IF;

    INSERT INTO atlas_v2.places(id,canonical_key,place_type,historicity)
    VALUES('5b1dc86d-d6d5-54ae-9b2d-ec6a2804699c'::uuid,'isfahan','historical_place','historical')
    ON CONFLICT(canonical_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.places WHERE canonical_key='isfahan') <> '5b1dc86d-d6d5-54ae-9b2d-ec6a2804699c' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_IDENTITY_CONFLICT:isfahan';
    END IF;
    INSERT INTO atlas_v2.place_names(id,place_id,locale,name,name_type,is_preferred)
    SELECT gen_random_uuid(),'5b1dc86d-d6d5-54ae-9b2d-ec6a2804699c'::uuid,'en','Isfahan','canonical',true
    WHERE NOT EXISTS (SELECT 1 FROM atlas_v2.place_names WHERE place_id='5b1dc86d-d6d5-54ae-9b2d-ec6a2804699c'::uuid AND locale='en' AND is_preferred=true);
    IF (SELECT name FROM atlas_v2.place_names WHERE place_id='5b1dc86d-d6d5-54ae-9b2d-ec6a2804699c'::uuid AND locale='en' AND is_preferred=true) <> 'Isfahan' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_NAME_CONFLICT:isfahan';
    END IF;

    INSERT INTO atlas_v2.places(id,canonical_key,place_type,historicity)
    VALUES('d36994cd-c9d0-5fcf-a215-0fec2b2242ba'::uuid,'constantinople','historical_place','historical')
    ON CONFLICT(canonical_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.places WHERE canonical_key='constantinople') <> 'd36994cd-c9d0-5fcf-a215-0fec2b2242ba' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_IDENTITY_CONFLICT:constantinople';
    END IF;
    INSERT INTO atlas_v2.place_names(id,place_id,locale,name,name_type,is_preferred)
    SELECT gen_random_uuid(),'d36994cd-c9d0-5fcf-a215-0fec2b2242ba'::uuid,'en','Constantinople','canonical',true
    WHERE NOT EXISTS (SELECT 1 FROM atlas_v2.place_names WHERE place_id='d36994cd-c9d0-5fcf-a215-0fec2b2242ba'::uuid AND locale='en' AND is_preferred=true);
    IF (SELECT name FROM atlas_v2.place_names WHERE place_id='d36994cd-c9d0-5fcf-a215-0fec2b2242ba'::uuid AND locale='en' AND is_preferred=true) <> 'Constantinople' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_NAME_CONFLICT:constantinople';
    END IF;

    INSERT INTO atlas_v2.places(id,canonical_key,place_type,historicity)
    VALUES('480ae330-d16c-59da-aef9-5a693cae063d'::uuid,'nicaea','historical_place','historical')
    ON CONFLICT(canonical_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.places WHERE canonical_key='nicaea') <> '480ae330-d16c-59da-aef9-5a693cae063d' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_IDENTITY_CONFLICT:nicaea';
    END IF;
    INSERT INTO atlas_v2.place_names(id,place_id,locale,name,name_type,is_preferred)
    SELECT gen_random_uuid(),'480ae330-d16c-59da-aef9-5a693cae063d'::uuid,'en','Nicaea','canonical',true
    WHERE NOT EXISTS (SELECT 1 FROM atlas_v2.place_names WHERE place_id='480ae330-d16c-59da-aef9-5a693cae063d'::uuid AND locale='en' AND is_preferred=true);
    IF (SELECT name FROM atlas_v2.place_names WHERE place_id='480ae330-d16c-59da-aef9-5a693cae063d'::uuid AND locale='en' AND is_preferred=true) <> 'Nicaea' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_NAME_CONFLICT:nicaea';
    END IF;

    INSERT INTO atlas_v2.places(id,canonical_key,place_type,historicity)
    VALUES('2a249a61-de85-5b88-beaa-ab67a63af684'::uuid,'ankara','historical_place','historical')
    ON CONFLICT(canonical_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.places WHERE canonical_key='ankara') <> '2a249a61-de85-5b88-beaa-ab67a63af684' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_IDENTITY_CONFLICT:ankara';
    END IF;
    INSERT INTO atlas_v2.place_names(id,place_id,locale,name,name_type,is_preferred)
    SELECT gen_random_uuid(),'2a249a61-de85-5b88-beaa-ab67a63af684'::uuid,'en','Ankara','canonical',true
    WHERE NOT EXISTS (SELECT 1 FROM atlas_v2.place_names WHERE place_id='2a249a61-de85-5b88-beaa-ab67a63af684'::uuid AND locale='en' AND is_preferred=true);
    IF (SELECT name FROM atlas_v2.place_names WHERE place_id='2a249a61-de85-5b88-beaa-ab67a63af684'::uuid AND locale='en' AND is_preferred=true) <> 'Ankara' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_NAME_CONFLICT:ankara';
    END IF;

    INSERT INTO atlas_v2.places(id,canonical_key,place_type,historicity)
    VALUES('dd4811ef-44a5-5739-b09e-b1c4852b26e1'::uuid,'pella','historical_place','historical')
    ON CONFLICT(canonical_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.places WHERE canonical_key='pella') <> 'dd4811ef-44a5-5739-b09e-b1c4852b26e1' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_IDENTITY_CONFLICT:pella';
    END IF;
    INSERT INTO atlas_v2.place_names(id,place_id,locale,name,name_type,is_preferred)
    SELECT gen_random_uuid(),'dd4811ef-44a5-5739-b09e-b1c4852b26e1'::uuid,'en','Pella','canonical',true
    WHERE NOT EXISTS (SELECT 1 FROM atlas_v2.place_names WHERE place_id='dd4811ef-44a5-5739-b09e-b1c4852b26e1'::uuid AND locale='en' AND is_preferred=true);
    IF (SELECT name FROM atlas_v2.place_names WHERE place_id='dd4811ef-44a5-5739-b09e-b1c4852b26e1'::uuid AND locale='en' AND is_preferred=true) <> 'Pella' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_NAME_CONFLICT:pella';
    END IF;

    INSERT INTO atlas_v2.places(id,canonical_key,place_type,historicity)
    VALUES('f1c62e8f-86ae-5833-b6d9-9a426e027d6e'::uuid,'rio-de-janeiro','historical_place','historical')
    ON CONFLICT(canonical_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.places WHERE canonical_key='rio-de-janeiro') <> 'f1c62e8f-86ae-5833-b6d9-9a426e027d6e' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_IDENTITY_CONFLICT:rio-de-janeiro';
    END IF;
    INSERT INTO atlas_v2.place_names(id,place_id,locale,name,name_type,is_preferred)
    SELECT gen_random_uuid(),'f1c62e8f-86ae-5833-b6d9-9a426e027d6e'::uuid,'en','Rio de Janeiro','canonical',true
    WHERE NOT EXISTS (SELECT 1 FROM atlas_v2.place_names WHERE place_id='f1c62e8f-86ae-5833-b6d9-9a426e027d6e'::uuid AND locale='en' AND is_preferred=true);
    IF (SELECT name FROM atlas_v2.place_names WHERE place_id='f1c62e8f-86ae-5833-b6d9-9a426e027d6e'::uuid AND locale='en' AND is_preferred=true) <> 'Rio de Janeiro' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_NAME_CONFLICT:rio-de-janeiro';
    END IF;

    INSERT INTO atlas_v2.places(id,canonical_key,place_type,historicity)
    VALUES('823049a0-9d73-5191-a9c5-26a662697436'::uuid,'rome','historical_place','historical')
    ON CONFLICT(canonical_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.places WHERE canonical_key='rome') <> '823049a0-9d73-5191-a9c5-26a662697436' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_IDENTITY_CONFLICT:rome';
    END IF;
    INSERT INTO atlas_v2.place_names(id,place_id,locale,name,name_type,is_preferred)
    SELECT gen_random_uuid(),'823049a0-9d73-5191-a9c5-26a662697436'::uuid,'en','Rome','canonical',true
    WHERE NOT EXISTS (SELECT 1 FROM atlas_v2.place_names WHERE place_id='823049a0-9d73-5191-a9c5-26a662697436'::uuid AND locale='en' AND is_preferred=true);
    IF (SELECT name FROM atlas_v2.place_names WHERE place_id='823049a0-9d73-5191-a9c5-26a662697436'::uuid AND locale='en' AND is_preferred=true) <> 'Rome' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_NAME_CONFLICT:rome';
    END IF;

    INSERT INTO atlas_v2.places(id,canonical_key,place_type,historicity)
    VALUES('4d5eb343-f0d9-521e-8dec-078cd2bcfbc2'::uuid,'samarkand','historical_place','historical')
    ON CONFLICT(canonical_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.places WHERE canonical_key='samarkand') <> '4d5eb343-f0d9-521e-8dec-078cd2bcfbc2' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_IDENTITY_CONFLICT:samarkand';
    END IF;
    INSERT INTO atlas_v2.place_names(id,place_id,locale,name,name_type,is_preferred)
    SELECT gen_random_uuid(),'4d5eb343-f0d9-521e-8dec-078cd2bcfbc2'::uuid,'en','Samarkand','canonical',true
    WHERE NOT EXISTS (SELECT 1 FROM atlas_v2.place_names WHERE place_id='4d5eb343-f0d9-521e-8dec-078cd2bcfbc2'::uuid AND locale='en' AND is_preferred=true);
    IF (SELECT name FROM atlas_v2.place_names WHERE place_id='4d5eb343-f0d9-521e-8dec-078cd2bcfbc2'::uuid AND locale='en' AND is_preferred=true) <> 'Samarkand' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_NAME_CONFLICT:samarkand';
    END IF;

    INSERT INTO atlas_v2.places(id,canonical_key,place_type,historicity)
    VALUES('d2845992-4a4c-5a66-a209-18a0ca21ee7b'::uuid,'muscat','historical_place','historical')
    ON CONFLICT(canonical_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.places WHERE canonical_key='muscat') <> 'd2845992-4a4c-5a66-a209-18a0ca21ee7b' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_IDENTITY_CONFLICT:muscat';
    END IF;
    INSERT INTO atlas_v2.place_names(id,place_id,locale,name,name_type,is_preferred)
    SELECT gen_random_uuid(),'d2845992-4a4c-5a66-a209-18a0ca21ee7b'::uuid,'en','Muscat','canonical',true
    WHERE NOT EXISTS (SELECT 1 FROM atlas_v2.place_names WHERE place_id='d2845992-4a4c-5a66-a209-18a0ca21ee7b'::uuid AND locale='en' AND is_preferred=true);
    IF (SELECT name FROM atlas_v2.place_names WHERE place_id='d2845992-4a4c-5a66-a209-18a0ca21ee7b'::uuid AND locale='en' AND is_preferred=true) <> 'Muscat' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_NAME_CONFLICT:muscat';
    END IF;

    INSERT INTO atlas_v2.places(id,canonical_key,place_type,historicity)
    VALUES('877dcabe-21b2-5a8f-b7b1-43a29e47ea9a'::uuid,'stone-town-zanzibar','historical_place','historical')
    ON CONFLICT(canonical_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.places WHERE canonical_key='stone-town-zanzibar') <> '877dcabe-21b2-5a8f-b7b1-43a29e47ea9a' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_IDENTITY_CONFLICT:stone-town-zanzibar';
    END IF;
    INSERT INTO atlas_v2.place_names(id,place_id,locale,name,name_type,is_preferred)
    SELECT gen_random_uuid(),'877dcabe-21b2-5a8f-b7b1-43a29e47ea9a'::uuid,'en','Stone Town, Zanzibar','canonical',true
    WHERE NOT EXISTS (SELECT 1 FROM atlas_v2.place_names WHERE place_id='877dcabe-21b2-5a8f-b7b1-43a29e47ea9a'::uuid AND locale='en' AND is_preferred=true);
    IF (SELECT name FROM atlas_v2.place_names WHERE place_id='877dcabe-21b2-5a8f-b7b1-43a29e47ea9a'::uuid AND locale='en' AND is_preferred=true) <> 'Stone Town, Zanzibar' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_NAME_CONFLICT:stone-town-zanzibar';
    END IF;

    INSERT INTO atlas_v2.places(id,canonical_key,place_type,historicity)
    VALUES('0f81f69e-4b34-58c6-b9a3-65b48e786d63'::uuid,'sogut','historical_place','historical')
    ON CONFLICT(canonical_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.places WHERE canonical_key='sogut') <> '0f81f69e-4b34-58c6-b9a3-65b48e786d63' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_IDENTITY_CONFLICT:sogut';
    END IF;
    INSERT INTO atlas_v2.place_names(id,place_id,locale,name,name_type,is_preferred)
    SELECT gen_random_uuid(),'0f81f69e-4b34-58c6-b9a3-65b48e786d63'::uuid,'en','Söğüt','canonical',true
    WHERE NOT EXISTS (SELECT 1 FROM atlas_v2.place_names WHERE place_id='0f81f69e-4b34-58c6-b9a3-65b48e786d63'::uuid AND locale='en' AND is_preferred=true);
    IF (SELECT name FROM atlas_v2.place_names WHERE place_id='0f81f69e-4b34-58c6-b9a3-65b48e786d63'::uuid AND locale='en' AND is_preferred=true) <> 'Söğüt' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_NAME_CONFLICT:sogut';
    END IF;

    INSERT INTO atlas_v2.places(id,canonical_key,place_type,historicity)
    VALUES('f0bbb5ec-a47f-53ad-adf2-6d12e431a586'::uuid,'bursa','historical_place','historical')
    ON CONFLICT(canonical_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.places WHERE canonical_key='bursa') <> 'f0bbb5ec-a47f-53ad-adf2-6d12e431a586' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_IDENTITY_CONFLICT:bursa';
    END IF;
    INSERT INTO atlas_v2.place_names(id,place_id,locale,name,name_type,is_preferred)
    SELECT gen_random_uuid(),'f0bbb5ec-a47f-53ad-adf2-6d12e431a586'::uuid,'en','Bursa','canonical',true
    WHERE NOT EXISTS (SELECT 1 FROM atlas_v2.place_names WHERE place_id='f0bbb5ec-a47f-53ad-adf2-6d12e431a586'::uuid AND locale='en' AND is_preferred=true);
    IF (SELECT name FROM atlas_v2.place_names WHERE place_id='f0bbb5ec-a47f-53ad-adf2-6d12e431a586'::uuid AND locale='en' AND is_preferred=true) <> 'Bursa' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_NAME_CONFLICT:bursa';
    END IF;

    INSERT INTO atlas_v2.places(id,canonical_key,place_type,historicity)
    VALUES('ae91bb0d-d164-521f-85b7-d96ceca4fa2a'::uuid,'edirne','historical_place','historical')
    ON CONFLICT(canonical_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.places WHERE canonical_key='edirne') <> 'ae91bb0d-d164-521f-85b7-d96ceca4fa2a' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_IDENTITY_CONFLICT:edirne';
    END IF;
    INSERT INTO atlas_v2.place_names(id,place_id,locale,name,name_type,is_preferred)
    SELECT gen_random_uuid(),'ae91bb0d-d164-521f-85b7-d96ceca4fa2a'::uuid,'en','Edirne','canonical',true
    WHERE NOT EXISTS (SELECT 1 FROM atlas_v2.place_names WHERE place_id='ae91bb0d-d164-521f-85b7-d96ceca4fa2a'::uuid AND locale='en' AND is_preferred=true);
    IF (SELECT name FROM atlas_v2.place_names WHERE place_id='ae91bb0d-d164-521f-85b7-d96ceca4fa2a'::uuid AND locale='en' AND is_preferred=true) <> 'Edirne' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_NAME_CONFLICT:edirne';
    END IF;

    INSERT INTO atlas_v2.places(id,canonical_key,place_type,historicity)
    VALUES('e490f5ab-d605-56b5-842f-0916cbb7bb28'::uuid,'mongolian-imperial-court-core-avargakarakorum','historical_place','historical')
    ON CONFLICT(canonical_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.places WHERE canonical_key='mongolian-imperial-court-core-avargakarakorum') <> 'e490f5ab-d605-56b5-842f-0916cbb7bb28' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_IDENTITY_CONFLICT:mongolian-imperial-court-core-avargakarakorum';
    END IF;
    INSERT INTO atlas_v2.place_names(id,place_id,locale,name,name_type,is_preferred)
    SELECT gen_random_uuid(),'e490f5ab-d605-56b5-842f-0916cbb7bb28'::uuid,'en','Mongolian imperial court core (Avarga–Karakorum)','canonical',true
    WHERE NOT EXISTS (SELECT 1 FROM atlas_v2.place_names WHERE place_id='e490f5ab-d605-56b5-842f-0916cbb7bb28'::uuid AND locale='en' AND is_preferred=true);
    IF (SELECT name FROM atlas_v2.place_names WHERE place_id='e490f5ab-d605-56b5-842f-0916cbb7bb28'::uuid AND locale='en' AND is_preferred=true) <> 'Mongolian imperial court core (Avarga–Karakorum)' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_NAME_CONFLICT:mongolian-imperial-court-core-avargakarakorum';
    END IF;

    INSERT INTO atlas_v2.places(id,canonical_key,place_type,historicity)
    VALUES('64b8f4c4-3d8e-58ad-9ba4-4b98fb49ef0f'::uuid,'kublai-court-in-north-china-shangdudadu','historical_place','historical')
    ON CONFLICT(canonical_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.places WHERE canonical_key='kublai-court-in-north-china-shangdudadu') <> '64b8f4c4-3d8e-58ad-9ba4-4b98fb49ef0f' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_IDENTITY_CONFLICT:kublai-court-in-north-china-shangdudadu';
    END IF;
    INSERT INTO atlas_v2.place_names(id,place_id,locale,name,name_type,is_preferred)
    SELECT gen_random_uuid(),'64b8f4c4-3d8e-58ad-9ba4-4b98fb49ef0f'::uuid,'en','Kublai court in North China (Shangdu–Dadu)','canonical',true
    WHERE NOT EXISTS (SELECT 1 FROM atlas_v2.place_names WHERE place_id='64b8f4c4-3d8e-58ad-9ba4-4b98fb49ef0f'::uuid AND locale='en' AND is_preferred=true);
    IF (SELECT name FROM atlas_v2.place_names WHERE place_id='64b8f4c4-3d8e-58ad-9ba4-4b98fb49ef0f'::uuid AND locale='en' AND is_preferred=true) <> 'Kublai court in North China (Shangdu–Dadu)' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_NAME_CONFLICT:kublai-court-in-north-china-shangdudadu';
    END IF;

    INSERT INTO atlas_v2.places(id,canonical_key,place_type,historicity)
    VALUES('53708ee8-020e-5efa-89f6-85d97d26cd82'::uuid,'cairo','historical_place','historical')
    ON CONFLICT(canonical_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.places WHERE canonical_key='cairo') <> '53708ee8-020e-5efa-89f6-85d97d26cd82' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_IDENTITY_CONFLICT:cairo';
    END IF;
    INSERT INTO atlas_v2.place_names(id,place_id,locale,name,name_type,is_preferred)
    SELECT gen_random_uuid(),'53708ee8-020e-5efa-89f6-85d97d26cd82'::uuid,'en','Cairo','canonical',true
    WHERE NOT EXISTS (SELECT 1 FROM atlas_v2.place_names WHERE place_id='53708ee8-020e-5efa-89f6-85d97d26cd82'::uuid AND locale='en' AND is_preferred=true);
    IF (SELECT name FROM atlas_v2.place_names WHERE place_id='53708ee8-020e-5efa-89f6-85d97d26cd82'::uuid AND locale='en' AND is_preferred=true) <> 'Cairo' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_NAME_CONFLICT:cairo';
    END IF;

    INSERT INTO atlas_v2.places(id,canonical_key,place_type,historicity)
    VALUES('4792157c-99ac-5d72-84bc-99baeb217911'::uuid,'singapore','historical_place','historical')
    ON CONFLICT(canonical_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.places WHERE canonical_key='singapore') <> '4792157c-99ac-5d72-84bc-99baeb217911' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_IDENTITY_CONFLICT:singapore';
    END IF;
    INSERT INTO atlas_v2.place_names(id,place_id,locale,name,name_type,is_preferred)
    SELECT gen_random_uuid(),'4792157c-99ac-5d72-84bc-99baeb217911'::uuid,'en','Singapore','canonical',true
    WHERE NOT EXISTS (SELECT 1 FROM atlas_v2.place_names WHERE place_id='4792157c-99ac-5d72-84bc-99baeb217911'::uuid AND locale='en' AND is_preferred=true);
    IF (SELECT name FROM atlas_v2.place_names WHERE place_id='4792157c-99ac-5d72-84bc-99baeb217911'::uuid AND locale='en' AND is_preferred=true) <> 'Singapore' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_NAME_CONFLICT:singapore';
    END IF;

    INSERT INTO atlas_v2.places(id,canonical_key,place_type,historicity)
    VALUES('41539b95-1782-5c82-9578-afe8cecd1a83'::uuid,'rangoon','historical_place','historical')
    ON CONFLICT(canonical_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.places WHERE canonical_key='rangoon') <> '41539b95-1782-5c82-9578-afe8cecd1a83' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_IDENTITY_CONFLICT:rangoon';
    END IF;
    INSERT INTO atlas_v2.place_names(id,place_id,locale,name,name_type,is_preferred)
    SELECT gen_random_uuid(),'41539b95-1782-5c82-9578-afe8cecd1a83'::uuid,'en','Rangoon','canonical',true
    WHERE NOT EXISTS (SELECT 1 FROM atlas_v2.place_names WHERE place_id='41539b95-1782-5c82-9578-afe8cecd1a83'::uuid AND locale='en' AND is_preferred=true);
    IF (SELECT name FROM atlas_v2.place_names WHERE place_id='41539b95-1782-5c82-9578-afe8cecd1a83'::uuid AND locale='en' AND is_preferred=true) <> 'Rangoon' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_NAME_CONFLICT:rangoon';
    END IF;

    INSERT INTO atlas_v2.places(id,canonical_key,place_type,historicity)
    VALUES('e9c69c90-7572-5a69-ae63-19f5ac1946b1'::uuid,'medina','historical_place','historical')
    ON CONFLICT(canonical_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.places WHERE canonical_key='medina') <> 'e9c69c90-7572-5a69-ae63-19f5ac1946b1' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_IDENTITY_CONFLICT:medina';
    END IF;
    INSERT INTO atlas_v2.place_names(id,place_id,locale,name,name_type,is_preferred)
    SELECT gen_random_uuid(),'e9c69c90-7572-5a69-ae63-19f5ac1946b1'::uuid,'en','Medina','canonical',true
    WHERE NOT EXISTS (SELECT 1 FROM atlas_v2.place_names WHERE place_id='e9c69c90-7572-5a69-ae63-19f5ac1946b1'::uuid AND locale='en' AND is_preferred=true);
    IF (SELECT name FROM atlas_v2.place_names WHERE place_id='e9c69c90-7572-5a69-ae63-19f5ac1946b1'::uuid AND locale='en' AND is_preferred=true) <> 'Medina' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_NAME_CONFLICT:medina';
    END IF;

    INSERT INTO atlas_v2.places(id,canonical_key,place_type,historicity)
    VALUES('889c7eb5-f72e-5297-9759-c8c2d193efeb'::uuid,'kufa','historical_place','historical')
    ON CONFLICT(canonical_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.places WHERE canonical_key='kufa') <> '889c7eb5-f72e-5297-9759-c8c2d193efeb' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_IDENTITY_CONFLICT:kufa';
    END IF;
    INSERT INTO atlas_v2.place_names(id,place_id,locale,name,name_type,is_preferred)
    SELECT gen_random_uuid(),'889c7eb5-f72e-5297-9759-c8c2d193efeb'::uuid,'en','Kufa','canonical',true
    WHERE NOT EXISTS (SELECT 1 FROM atlas_v2.place_names WHERE place_id='889c7eb5-f72e-5297-9759-c8c2d193efeb'::uuid AND locale='en' AND is_preferred=true);
    IF (SELECT name FROM atlas_v2.place_names WHERE place_id='889c7eb5-f72e-5297-9759-c8c2d193efeb'::uuid AND locale='en' AND is_preferred=true) <> 'Kufa' THEN
      RAISE EXCEPTION 'SPATIAL_PLACE_NAME_CONFLICT:kufa';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='British Museum Collections Online: Seljuq dynasty (x41057)' AND id <> '305858ea-e93f-56ec-a353-343eda963c51'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:305858ea-e93f-56ec-a353-343eda963c51';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('305858ea-e93f-56ec-a353-343eda963c51'::uuid,'spatial-reviewed:305858ea-e93f-56ec-a353-343eda963c51','bibliographic_reference','British Museum Collections Online: Seljuq dynasty (x41057)','British Museum Collections Online: Seljuq dynasty (x41057)')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:305858ea-e93f-56ec-a353-343eda963c51') <> '305858ea-e93f-56ec-a353-343eda963c51' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:305858ea-e93f-56ec-a353-343eda963c51';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='1911 Encyclopaedia Britannica: Constantinople' AND id <> '2781d1ec-bf75-5045-bf99-3f7cdc919d0d'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:2781d1ec-bf75-5045-bf99-3f7cdc919d0d';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('2781d1ec-bf75-5045-bf99-3f7cdc919d0d'::uuid,'spatial-reviewed:2781d1ec-bf75-5045-bf99-3f7cdc919d0d','bibliographic_reference','1911 Encyclopaedia Britannica: Constantinople','1911 Encyclopaedia Britannica: Constantinople')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:2781d1ec-bf75-5045-bf99-3f7cdc919d0d') <> '2781d1ec-bf75-5045-bf99-3f7cdc919d0d' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:2781d1ec-bf75-5045-bf99-3f7cdc919d0d';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='1911 Encyclopaedia Britannica: Nicaea' AND id <> '044aaa9d-e264-5449-bbe4-e380c3f02220'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:044aaa9d-e264-5449-bbe4-e380c3f02220';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('044aaa9d-e264-5449-bbe4-e380c3f02220'::uuid,'spatial-reviewed:044aaa9d-e264-5449-bbe4-e380c3f02220','bibliographic_reference','1911 Encyclopaedia Britannica: Nicaea','1911 Encyclopaedia Britannica: Nicaea')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:044aaa9d-e264-5449-bbe4-e380c3f02220') <> '044aaa9d-e264-5449-bbe4-e380c3f02220' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:044aaa9d-e264-5449-bbe4-e380c3f02220';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='Atatürk Ansiklopedisi: Ankara’nın Başkent Oluşu' AND id <> 'c3af4db8-6c27-51da-af04-5f562cbd5cc2'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:c3af4db8-6c27-51da-af04-5f562cbd5cc2';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('c3af4db8-6c27-51da-af04-5f562cbd5cc2'::uuid,'spatial-reviewed:c3af4db8-6c27-51da-af04-5f562cbd5cc2','bibliographic_reference','Atatürk Ansiklopedisi: Ankara’nın Başkent Oluşu','Atatürk Ansiklopedisi: Ankara’nın Başkent Oluşu')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:c3af4db8-6c27-51da-af04-5f562cbd5cc2') <> 'c3af4db8-6c27-51da-af04-5f562cbd5cc2' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:c3af4db8-6c27-51da-af04-5f562cbd5cc2';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='Hellenic Ministry of Culture, Cultural Egnatia: Pella' AND id <> '47fc9701-c079-5a5a-9360-90e059d4ca97'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:47fc9701-c079-5a5a-9360-90e059d4ca97';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('47fc9701-c079-5a5a-9360-90e059d4ca97'::uuid,'spatial-reviewed:47fc9701-c079-5a5a-9360-90e059d4ca97','bibliographic_reference','Hellenic Ministry of Culture, Cultural Egnatia: Pella','Hellenic Ministry of Culture, Cultural Egnatia: Pella')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:47fc9701-c079-5a5a-9360-90e059d4ca97') <> '47fc9701-c079-5a5a-9360-90e059d4ca97' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:47fc9701-c079-5a5a-9360-90e059d4ca97';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='Hellenic Ministry of Culture and Sports, Odysseus: Pella' AND id <> '01bff9e2-4a89-5056-a9e5-9e2b0574367c'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:01bff9e2-4a89-5056-a9e5-9e2b0574367c';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('01bff9e2-4a89-5056-a9e5-9e2b0574367c'::uuid,'spatial-reviewed:01bff9e2-4a89-5056-a9e5-9e2b0574367c','bibliographic_reference','Hellenic Ministry of Culture and Sports, Odysseus: Pella','Hellenic Ministry of Culture and Sports, Odysseus: Pella')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:01bff9e2-4a89-5056-a9e5-9e2b0574367c') <> '01bff9e2-4a89-5056-a9e5-9e2b0574367c' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:01bff9e2-4a89-5056-a9e5-9e2b0574367c';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='Governo do Brasil: Linha do Tempo da Independência' AND id <> '38e7f5dc-b0d9-5a54-acd3-5159075e1c6b'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:38e7f5dc-b0d9-5a54-acd3-5159075e1c6b';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('38e7f5dc-b0d9-5a54-acd3-5159075e1c6b'::uuid,'spatial-reviewed:38e7f5dc-b0d9-5a54-acd3-5159075e1c6b','bibliographic_reference','Governo do Brasil: Linha do Tempo da Independência','Governo do Brasil: Linha do Tempo da Independência')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:38e7f5dc-b0d9-5a54-acd3-5159075e1c6b') <> '38e7f5dc-b0d9-5a54-acd3-5159075e1c6b' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:38e7f5dc-b0d9-5a54-acd3-5159075e1c6b';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='1911 Encyclopaedia Britannica: Constantine (emperors)' AND id <> '89243eda-1366-50cc-8b72-546766cf5b33'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:89243eda-1366-50cc-8b72-546766cf5b33';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('89243eda-1366-50cc-8b72-546766cf5b33'::uuid,'spatial-reviewed:89243eda-1366-50cc-8b72-546766cf5b33','bibliographic_reference','1911 Encyclopaedia Britannica: Constantine (emperors)','1911 Encyclopaedia Britannica: Constantine (emperors)')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:89243eda-1366-50cc-8b72-546766cf5b33') <> '89243eda-1366-50cc-8b72-546766cf5b33' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:89243eda-1366-50cc-8b72-546766cf5b33';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='The Metropolitan Museum of Art: The Art of the Timurid Period (ca. 1370–1507)' AND id <> '25dfe37e-1389-52de-a203-3231e5a9f106'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:25dfe37e-1389-52de-a203-3231e5a9f106';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('25dfe37e-1389-52de-a203-3231e5a9f106'::uuid,'spatial-reviewed:25dfe37e-1389-52de-a203-3231e5a9f106','bibliographic_reference','The Metropolitan Museum of Art: The Art of the Timurid Period (ca. 1370–1507)','The Metropolitan Museum of Art: The Art of the Timurid Period (ca. 1370–1507)')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:25dfe37e-1389-52de-a203-3231e5a9f106') <> '25dfe37e-1389-52de-a203-3231e5a9f106' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:25dfe37e-1389-52de-a203-3231e5a9f106';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='National Museum of Oman: Architectural Heritage — Muscat' AND id <> '51851bcf-6c36-56b8-bf2b-808c9aaf4c7d'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:51851bcf-6c36-56b8-bf2b-808c9aaf4c7d';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('51851bcf-6c36-56b8-bf2b-808c9aaf4c7d'::uuid,'spatial-reviewed:51851bcf-6c36-56b8-bf2b-808c9aaf4c7d','bibliographic_reference','National Museum of Oman: Architectural Heritage — Muscat','National Museum of Oman: Architectural Heritage — Muscat')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:51851bcf-6c36-56b8-bf2b-808c9aaf4c7d') <> '51851bcf-6c36-56b8-bf2b-808c9aaf4c7d' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:51851bcf-6c36-56b8-bf2b-808c9aaf4c7d';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='Oman Ministry of Foreign Affairs: History' AND id <> 'b8a51ecc-5091-51e2-97b6-cb24b4cd7d48'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:b8a51ecc-5091-51e2-97b6-cb24b4cd7d48';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('b8a51ecc-5091-51e2-97b6-cb24b4cd7d48'::uuid,'spatial-reviewed:b8a51ecc-5091-51e2-97b6-cb24b4cd7d48','bibliographic_reference','Oman Ministry of Foreign Affairs: History','Oman Ministry of Foreign Affairs: History')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:b8a51ecc-5091-51e2-97b6-cb24b4cd7d48') <> 'b8a51ecc-5091-51e2-97b6-cb24b4cd7d48' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:b8a51ecc-5091-51e2-97b6-cb24b4cd7d48';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='Republic of Türkiye Ministry of National Education, Söğüt District: İlçemiz - Söğüt' AND id <> '7a0280a6-71d0-5ae9-809c-9d0db9e1d181'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:7a0280a6-71d0-5ae9-809c-9d0db9e1d181';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('7a0280a6-71d0-5ae9-809c-9d0db9e1d181'::uuid,'spatial-reviewed:7a0280a6-71d0-5ae9-809c-9d0db9e1d181','bibliographic_reference','Republic of Türkiye Ministry of National Education, Söğüt District: İlçemiz - Söğüt','Republic of Türkiye Ministry of National Education, Söğüt District: İlçemiz - Söğüt')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:7a0280a6-71d0-5ae9-809c-9d0db9e1d181') <> '7a0280a6-71d0-5ae9-809c-9d0db9e1d181' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:7a0280a6-71d0-5ae9-809c-9d0db9e1d181';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='Republic of Türkiye Bursa Governorship: Tarihçe' AND id <> '69e4362a-3589-52b4-9a32-5b8e83710552'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:69e4362a-3589-52b4-9a32-5b8e83710552';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('69e4362a-3589-52b4-9a32-5b8e83710552'::uuid,'spatial-reviewed:69e4362a-3589-52b4-9a32-5b8e83710552','bibliographic_reference','Republic of Türkiye Bursa Governorship: Tarihçe','Republic of Türkiye Bursa Governorship: Tarihçe')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:69e4362a-3589-52b4-9a32-5b8e83710552') <> '69e4362a-3589-52b4-9a32-5b8e83710552' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:69e4362a-3589-52b4-9a32-5b8e83710552';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='Türkiye Culture Portal: Edirne - Genel Bilgiler' AND id <> '0a3dc36b-9eb9-5536-ac23-5fe71cb9467b'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:0a3dc36b-9eb9-5536-ac23-5fe71cb9467b';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('0a3dc36b-9eb9-5536-ac23-5fe71cb9467b'::uuid,'spatial-reviewed:0a3dc36b-9eb9-5536-ac23-5fe71cb9467b','bibliographic_reference','Türkiye Culture Portal: Edirne - Genel Bilgiler','Türkiye Culture Portal: Edirne - Genel Bilgiler')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:0a3dc36b-9eb9-5536-ac23-5fe71cb9467b') <> '0a3dc36b-9eb9-5536-ac23-5fe71cb9467b' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:0a3dc36b-9eb9-5536-ac23-5fe71cb9467b';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='UNESCO World Heritage Centre: Archaeological Site at Khuduu Aral and Surrounding Cultural Landscape' AND id <> '82cfad27-e6e5-57ed-97c7-28ae56bb5072'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:82cfad27-e6e5-57ed-97c7-28ae56bb5072';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('82cfad27-e6e5-57ed-97c7-28ae56bb5072'::uuid,'spatial-reviewed:82cfad27-e6e5-57ed-97c7-28ae56bb5072','bibliographic_reference','UNESCO World Heritage Centre: Archaeological Site at Khuduu Aral and Surrounding Cultural Landscape','UNESCO World Heritage Centre: Archaeological Site at Khuduu Aral and Surrounding Cultural Landscape')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:82cfad27-e6e5-57ed-97c7-28ae56bb5072') <> '82cfad27-e6e5-57ed-97c7-28ae56bb5072' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:82cfad27-e6e5-57ed-97c7-28ae56bb5072';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='Cambridge Antiquity: Mapping Karakorum, the capital of the Mongol Empire' AND id <> '51e16f5a-ff7f-5d3c-b03e-034f9a1ef04d'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:51e16f5a-ff7f-5d3c-b03e-034f9a1ef04d';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('51e16f5a-ff7f-5d3c-b03e-034f9a1ef04d'::uuid,'spatial-reviewed:51e16f5a-ff7f-5d3c-b03e-034f9a1ef04d','bibliographic_reference','Cambridge Antiquity: Mapping Karakorum, the capital of the Mongol Empire','Cambridge Antiquity: Mapping Karakorum, the capital of the Mongol Empire')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:51e16f5a-ff7f-5d3c-b03e-034f9a1ef04d') <> '51e16f5a-ff7f-5d3c-b03e-034f9a1ef04d' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:51e16f5a-ff7f-5d3c-b03e-034f9a1ef04d';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='Cambridge Modern Asian Studies: The cosmopolitanism of Karakorum, capital of the Mongol empire in Mongolia' AND id <> '02e15cce-9ea1-5b3c-a3e1-c11842dfd8c9'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:02e15cce-9ea1-5b3c-a3e1-c11842dfd8c9';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('02e15cce-9ea1-5b3c-a3e1-c11842dfd8c9'::uuid,'spatial-reviewed:02e15cce-9ea1-5b3c-a3e1-c11842dfd8c9','bibliographic_reference','Cambridge Modern Asian Studies: The cosmopolitanism of Karakorum, capital of the Mongol empire in Mongolia','Cambridge Modern Asian Studies: The cosmopolitanism of Karakorum, capital of the Mongol empire in Mongolia')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:02e15cce-9ea1-5b3c-a3e1-c11842dfd8c9') <> '02e15cce-9ea1-5b3c-a3e1-c11842dfd8c9' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:02e15cce-9ea1-5b3c-a3e1-c11842dfd8c9';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='Cambridge History of the Mongol Empire: Mongolia in the Mongol Empire' AND id <> 'ea373bc1-66af-5950-a4c8-c31188c0f320'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:ea373bc1-66af-5950-a4c8-c31188c0f320';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('ea373bc1-66af-5950-a4c8-c31188c0f320'::uuid,'spatial-reviewed:ea373bc1-66af-5950-a4c8-c31188c0f320','bibliographic_reference','Cambridge History of the Mongol Empire: Mongolia in the Mongol Empire','Cambridge History of the Mongol Empire: Mongolia in the Mongol Empire')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:ea373bc1-66af-5950-a4c8-c31188c0f320') <> 'ea373bc1-66af-5950-a4c8-c31188c0f320' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:ea373bc1-66af-5950-a4c8-c31188c0f320';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='UNESCO World Heritage Centre: Site of Xanadu' AND id <> '91d307b2-a4e3-5795-9f37-c0a2fabee2c7'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:91d307b2-a4e3-5795-9f37-c0a2fabee2c7';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('91d307b2-a4e3-5795-9f37-c0a2fabee2c7'::uuid,'spatial-reviewed:91d307b2-a4e3-5795-9f37-c0a2fabee2c7','bibliographic_reference','UNESCO World Heritage Centre: Site of Xanadu','UNESCO World Heritage Centre: Site of Xanadu')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:91d307b2-a4e3-5795-9f37-c0a2fabee2c7') <> '91d307b2-a4e3-5795-9f37-c0a2fabee2c7' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:91d307b2-a4e3-5795-9f37-c0a2fabee2c7';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='Metropolitan Museum of Art: China, 1000–1400 A.D. chronology' AND id <> '37f50f8f-b242-5dfe-aeeb-4230d9c31670'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:37f50f8f-b242-5dfe-aeeb-4230d9c31670';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('37f50f8f-b242-5dfe-aeeb-4230d9c31670'::uuid,'spatial-reviewed:37f50f8f-b242-5dfe-aeeb-4230d9c31670','bibliographic_reference','Metropolitan Museum of Art: China, 1000–1400 A.D. chronology','Metropolitan Museum of Art: China, 1000–1400 A.D. chronology')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:37f50f8f-b242-5dfe-aeeb-4230d9c31670') <> '37f50f8f-b242-5dfe-aeeb-4230d9c31670' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:37f50f8f-b242-5dfe-aeeb-4230d9c31670';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='Getty Thesaurus of Geographic Names: Mamluk Sultanate (TGN 6003667)' AND id <> 'e91f57ec-9c46-594b-859b-4a14c2af99ba'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:e91f57ec-9c46-594b-859b-4a14c2af99ba';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('e91f57ec-9c46-594b-859b-4a14c2af99ba'::uuid,'spatial-reviewed:e91f57ec-9c46-594b-859b-4a14c2af99ba','bibliographic_reference','Getty Thesaurus of Geographic Names: Mamluk Sultanate (TGN 6003667)','Getty Thesaurus of Geographic Names: Mamluk Sultanate (TGN 6003667)')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:e91f57ec-9c46-594b-859b-4a14c2af99ba') <> 'e91f57ec-9c46-594b-859b-4a14c2af99ba' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:e91f57ec-9c46-594b-859b-4a14c2af99ba';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='Press Information Bureau, Government of India: Anniversary of the formation of Azad Hind Government (21 Oct 1943)' AND id <> '677c16aa-8a6b-52a7-ab98-27ef7a3190d4'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:677c16aa-8a6b-52a7-ab98-27ef7a3190d4';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('677c16aa-8a6b-52a7-ab98-27ef7a3190d4'::uuid,'spatial-reviewed:677c16aa-8a6b-52a7-ab98-27ef7a3190d4','bibliographic_reference','Press Information Bureau, Government of India: Anniversary of the formation of Azad Hind Government (21 Oct 1943)','Press Information Bureau, Government of India: Anniversary of the formation of Azad Hind Government (21 Oct 1943)')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:677c16aa-8a6b-52a7-ab98-27ef7a3190d4') <> '677c16aa-8a6b-52a7-ab98-27ef7a3190d4' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:677c16aa-8a6b-52a7-ab98-27ef7a3190d4';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='Publications Division, Government of India: Builders of Modern India — Subhas Chandra Bose' AND id <> '25cfc76c-7993-5d82-987c-7d46352fb048'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:25cfc76c-7993-5d82-987c-7d46352fb048';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('25cfc76c-7993-5d82-987c-7d46352fb048'::uuid,'spatial-reviewed:25cfc76c-7993-5d82-987c-7d46352fb048','bibliographic_reference','Publications Division, Government of India: Builders of Modern India — Subhas Chandra Bose','Publications Division, Government of India: Builders of Modern India — Subhas Chandra Bose')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:25cfc76c-7993-5d82-987c-7d46352fb048') <> '25cfc76c-7993-5d82-987c-7d46352fb048' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:25cfc76c-7993-5d82-987c-7d46352fb048';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='Government of India / IGNCA chronology: Bose civil and military headquarters moved to Burma in January 1944' AND id <> 'c88cdd70-16eb-5c3c-881b-425a880029f9'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:c88cdd70-16eb-5c3c-881b-425a880029f9';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('c88cdd70-16eb-5c3c-881b-425a880029f9'::uuid,'spatial-reviewed:c88cdd70-16eb-5c3c-881b-425a880029f9','bibliographic_reference','Government of India / IGNCA chronology: Bose civil and military headquarters moved to Burma in January 1944','Government of India / IGNCA chronology: Bose civil and military headquarters moved to Burma in January 1944')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:c88cdd70-16eb-5c3c-881b-425a880029f9') <> 'c88cdd70-16eb-5c3c-881b-425a880029f9' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:c88cdd70-16eb-5c3c-881b-425a880029f9';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='Odisha Review: headquarters of the Provisional Government, Indian Independence League and Supreme Command shifted from Singapore to Rangoon' AND id <> 'd0516347-22db-5919-80aa-ca80fe33574f'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:d0516347-22db-5919-80aa-ca80fe33574f';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('d0516347-22db-5919-80aa-ca80fe33574f'::uuid,'spatial-reviewed:d0516347-22db-5919-80aa-ca80fe33574f','bibliographic_reference','Odisha Review: headquarters of the Provisional Government, Indian Independence League and Supreme Command shifted from Singapore to Rangoon','Odisha Review: headquarters of the Provisional Government, Indian Independence League and Supreme Command shifted from Singapore to Rangoon')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:d0516347-22db-5919-80aa-ca80fe33574f') <> 'd0516347-22db-5919-80aa-ca80fe33574f' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:d0516347-22db-5919-80aa-ca80fe33574f';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='Cambridge University Press: Rituals of Islamic Monarchy — the conquest society c. 628–c. 660' AND id <> '82565127-eb9c-5da2-a1c4-8fcd738ecf87'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:82565127-eb9c-5da2-a1c4-8fcd738ecf87';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('82565127-eb9c-5da2-a1c4-8fcd738ecf87'::uuid,'spatial-reviewed:82565127-eb9c-5da2-a1c4-8fcd738ecf87','bibliographic_reference','Cambridge University Press: Rituals of Islamic Monarchy — the conquest society c. 628–c. 660','Cambridge University Press: Rituals of Islamic Monarchy — the conquest society c. 628–c. 660')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:82565127-eb9c-5da2-a1c4-8fcd738ecf87') <> '82565127-eb9c-5da2-a1c4-8fcd738ecf87' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:82565127-eb9c-5da2-a1c4-8fcd738ecf87';
    END IF;

    IF EXISTS (SELECT 1 FROM atlas_v2.sources WHERE title='Encyclopaedia Iranica: Kufa — Ali (r. 656–61) chose Kufa as his capital' AND id <> '9ed98162-dc7d-5a2f-89da-db4aac4694ae'::uuid) THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_REVIEW_REQUIRED:9ed98162-dc7d-5a2f-89da-db4aac4694ae';
    END IF;
    INSERT INTO atlas_v2.sources(id,source_key,source_type,title,citation_text)
    VALUES('9ed98162-dc7d-5a2f-89da-db4aac4694ae'::uuid,'spatial-reviewed:9ed98162-dc7d-5a2f-89da-db4aac4694ae','bibliographic_reference','Encyclopaedia Iranica: Kufa — Ali (r. 656–61) chose Kufa as his capital','Encyclopaedia Iranica: Kufa — Ali (r. 656–61) chose Kufa as his capital')
    ON CONFLICT(source_key) DO NOTHING;
    IF (SELECT id::text FROM atlas_v2.sources WHERE source_key='spatial-reviewed:9ed98162-dc7d-5a2f-89da-db4aac4694ae') <> '9ed98162-dc7d-5a2f-89da-db4aac4694ae' THEN
      RAISE EXCEPTION 'SPATIAL_SOURCE_IDENTITY_CONFLICT:9ed98162-dc7d-5a2f-89da-db4aac4694ae';
    END IF;

    INSERT INTO atlas_v2.polity_place_functions(fact_key,polity_id,function_type,place_id,start_year,end_year,confidence)
    VALUES('ppf:01f4ce7b-aaa3-473a-a6fd-9c95c4a85ff7:capital:5b1dc86d-d6d5-54ae-9b2d-ec6a2804699c:1063:1072','01f4ce7b-aaa3-473a-a6fd-9c95c4a85ff7'::uuid,'capital','5b1dc86d-d6d5-54ae-9b2d-ec6a2804699c'::uuid,1063,1072,'well_established')
    ON CONFLICT(fact_key) DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM atlas_v2.polity_place_functions
      WHERE fact_key='ppf:01f4ce7b-aaa3-473a-a6fd-9c95c4a85ff7:capital:5b1dc86d-d6d5-54ae-9b2d-ec6a2804699c:1063:1072'
        AND polity_id='01f4ce7b-aaa3-473a-a6fd-9c95c4a85ff7'::uuid
        AND function_type='capital'
        AND place_id='5b1dc86d-d6d5-54ae-9b2d-ec6a2804699c'::uuid
        AND start_year IS NOT DISTINCT FROM 1063
        AND end_year IS NOT DISTINCT FROM 1072
        AND confidence='well_established'
    ) THEN
      RAISE EXCEPTION 'SPATIAL_POLITY_PLACE_FUNCTION_CONFLICT:ppf:01f4ce7b-aaa3-473a-a6fd-9c95c4a85ff7:capital:5b1dc86d-d6d5-54ae-9b2d-ec6a2804699c:1063:1072';
    END IF;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:01f4ce7b-aaa3-473a-a6fd-9c95c4a85ff7:capital:5b1dc86d-d6d5-54ae-9b2d-ec6a2804699c:1063:1072','305858ea-e93f-56ec-a353-343eda963c51'::uuid,'British Museum Collections Online: Seljuq dynasty (x41057)')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('5b1dc86d-d6d5-54ae-9b2d-ec6a2804699c'::uuid,'305858ea-e93f-56ec-a353-343eda963c51'::uuid,'British Museum Collections Online: Seljuq dynasty (x41057)')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_functions(fact_key,polity_id,function_type,place_id,start_year,end_year,confidence)
    VALUES('ppf:074510f4-f2e7-5795-8cfb-2a4206fa7254:capital:d36994cd-c9d0-5fcf-a215-0fec2b2242ba:330:1203','074510f4-f2e7-5795-8cfb-2a4206fa7254'::uuid,'capital','d36994cd-c9d0-5fcf-a215-0fec2b2242ba'::uuid,330,1203,'well_established')
    ON CONFLICT(fact_key) DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM atlas_v2.polity_place_functions
      WHERE fact_key='ppf:074510f4-f2e7-5795-8cfb-2a4206fa7254:capital:d36994cd-c9d0-5fcf-a215-0fec2b2242ba:330:1203'
        AND polity_id='074510f4-f2e7-5795-8cfb-2a4206fa7254'::uuid
        AND function_type='capital'
        AND place_id='d36994cd-c9d0-5fcf-a215-0fec2b2242ba'::uuid
        AND start_year IS NOT DISTINCT FROM 330
        AND end_year IS NOT DISTINCT FROM 1203
        AND confidence='well_established'
    ) THEN
      RAISE EXCEPTION 'SPATIAL_POLITY_PLACE_FUNCTION_CONFLICT:ppf:074510f4-f2e7-5795-8cfb-2a4206fa7254:capital:d36994cd-c9d0-5fcf-a215-0fec2b2242ba:330:1203';
    END IF;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:074510f4-f2e7-5795-8cfb-2a4206fa7254:capital:d36994cd-c9d0-5fcf-a215-0fec2b2242ba:330:1203','2781d1ec-bf75-5045-bf99-3f7cdc919d0d'::uuid,'1911 Encyclopaedia Britannica: Constantinople')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('d36994cd-c9d0-5fcf-a215-0fec2b2242ba'::uuid,'2781d1ec-bf75-5045-bf99-3f7cdc919d0d'::uuid,'1911 Encyclopaedia Britannica: Constantinople')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_functions(fact_key,polity_id,function_type,place_id,start_year,end_year,confidence)
    VALUES('ppf:074510f4-f2e7-5795-8cfb-2a4206fa7254:capital:480ae330-d16c-59da-aef9-5a693cae063d:1204:1260','074510f4-f2e7-5795-8cfb-2a4206fa7254'::uuid,'capital','480ae330-d16c-59da-aef9-5a693cae063d'::uuid,1204,1260,'well_established')
    ON CONFLICT(fact_key) DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM atlas_v2.polity_place_functions
      WHERE fact_key='ppf:074510f4-f2e7-5795-8cfb-2a4206fa7254:capital:480ae330-d16c-59da-aef9-5a693cae063d:1204:1260'
        AND polity_id='074510f4-f2e7-5795-8cfb-2a4206fa7254'::uuid
        AND function_type='capital'
        AND place_id='480ae330-d16c-59da-aef9-5a693cae063d'::uuid
        AND start_year IS NOT DISTINCT FROM 1204
        AND end_year IS NOT DISTINCT FROM 1260
        AND confidence='well_established'
    ) THEN
      RAISE EXCEPTION 'SPATIAL_POLITY_PLACE_FUNCTION_CONFLICT:ppf:074510f4-f2e7-5795-8cfb-2a4206fa7254:capital:480ae330-d16c-59da-aef9-5a693cae063d:1204:1260';
    END IF;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:074510f4-f2e7-5795-8cfb-2a4206fa7254:capital:480ae330-d16c-59da-aef9-5a693cae063d:1204:1260','044aaa9d-e264-5449-bbe4-e380c3f02220'::uuid,'1911 Encyclopaedia Britannica: Nicaea')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('480ae330-d16c-59da-aef9-5a693cae063d'::uuid,'044aaa9d-e264-5449-bbe4-e380c3f02220'::uuid,'1911 Encyclopaedia Britannica: Nicaea')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_functions(fact_key,polity_id,function_type,place_id,start_year,end_year,confidence)
    VALUES('ppf:074510f4-f2e7-5795-8cfb-2a4206fa7254:capital:d36994cd-c9d0-5fcf-a215-0fec2b2242ba:1261:1453','074510f4-f2e7-5795-8cfb-2a4206fa7254'::uuid,'capital','d36994cd-c9d0-5fcf-a215-0fec2b2242ba'::uuid,1261,1453,'well_established')
    ON CONFLICT(fact_key) DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM atlas_v2.polity_place_functions
      WHERE fact_key='ppf:074510f4-f2e7-5795-8cfb-2a4206fa7254:capital:d36994cd-c9d0-5fcf-a215-0fec2b2242ba:1261:1453'
        AND polity_id='074510f4-f2e7-5795-8cfb-2a4206fa7254'::uuid
        AND function_type='capital'
        AND place_id='d36994cd-c9d0-5fcf-a215-0fec2b2242ba'::uuid
        AND start_year IS NOT DISTINCT FROM 1261
        AND end_year IS NOT DISTINCT FROM 1453
        AND confidence='well_established'
    ) THEN
      RAISE EXCEPTION 'SPATIAL_POLITY_PLACE_FUNCTION_CONFLICT:ppf:074510f4-f2e7-5795-8cfb-2a4206fa7254:capital:d36994cd-c9d0-5fcf-a215-0fec2b2242ba:1261:1453';
    END IF;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:074510f4-f2e7-5795-8cfb-2a4206fa7254:capital:d36994cd-c9d0-5fcf-a215-0fec2b2242ba:1261:1453','2781d1ec-bf75-5045-bf99-3f7cdc919d0d'::uuid,'1911 Encyclopaedia Britannica: Constantinople')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('d36994cd-c9d0-5fcf-a215-0fec2b2242ba'::uuid,'2781d1ec-bf75-5045-bf99-3f7cdc919d0d'::uuid,'1911 Encyclopaedia Britannica: Constantinople')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_functions(fact_key,polity_id,function_type,place_id,start_year,end_year,confidence)
    VALUES('ppf:28448862-277d-4738-9fb4-7f51a9e4c03a:capital:2a249a61-de85-5b88-beaa-ab67a63af684:1923:?','28448862-277d-4738-9fb4-7f51a9e4c03a'::uuid,'capital','2a249a61-de85-5b88-beaa-ab67a63af684'::uuid,1923,NULL,'well_established')
    ON CONFLICT(fact_key) DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM atlas_v2.polity_place_functions
      WHERE fact_key='ppf:28448862-277d-4738-9fb4-7f51a9e4c03a:capital:2a249a61-de85-5b88-beaa-ab67a63af684:1923:?'
        AND polity_id='28448862-277d-4738-9fb4-7f51a9e4c03a'::uuid
        AND function_type='capital'
        AND place_id='2a249a61-de85-5b88-beaa-ab67a63af684'::uuid
        AND start_year IS NOT DISTINCT FROM 1923
        AND end_year IS NOT DISTINCT FROM NULL
        AND confidence='well_established'
    ) THEN
      RAISE EXCEPTION 'SPATIAL_POLITY_PLACE_FUNCTION_CONFLICT:ppf:28448862-277d-4738-9fb4-7f51a9e4c03a:capital:2a249a61-de85-5b88-beaa-ab67a63af684:1923:?';
    END IF;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:28448862-277d-4738-9fb4-7f51a9e4c03a:capital:2a249a61-de85-5b88-beaa-ab67a63af684:1923:?','c3af4db8-6c27-51da-af04-5f562cbd5cc2'::uuid,'Atatürk Ansiklopedisi: Ankara’nın Başkent Oluşu')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('2a249a61-de85-5b88-beaa-ab67a63af684'::uuid,'c3af4db8-6c27-51da-af04-5f562cbd5cc2'::uuid,'Atatürk Ansiklopedisi: Ankara’nın Başkent Oluşu')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_functions(fact_key,polity_id,function_type,place_id,start_year,end_year,confidence)
    VALUES('ppf:2f6e890f-1704-5c76-aa94-f18d7f905e06:capital:dd4811ef-44a5-5739-b09e-b1c4852b26e1:-336:-323','2f6e890f-1704-5c76-aa94-f18d7f905e06'::uuid,'capital','dd4811ef-44a5-5739-b09e-b1c4852b26e1'::uuid,-336,-323,'well_established')
    ON CONFLICT(fact_key) DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM atlas_v2.polity_place_functions
      WHERE fact_key='ppf:2f6e890f-1704-5c76-aa94-f18d7f905e06:capital:dd4811ef-44a5-5739-b09e-b1c4852b26e1:-336:-323'
        AND polity_id='2f6e890f-1704-5c76-aa94-f18d7f905e06'::uuid
        AND function_type='capital'
        AND place_id='dd4811ef-44a5-5739-b09e-b1c4852b26e1'::uuid
        AND start_year IS NOT DISTINCT FROM -336
        AND end_year IS NOT DISTINCT FROM -323
        AND confidence='well_established'
    ) THEN
      RAISE EXCEPTION 'SPATIAL_POLITY_PLACE_FUNCTION_CONFLICT:ppf:2f6e890f-1704-5c76-aa94-f18d7f905e06:capital:dd4811ef-44a5-5739-b09e-b1c4852b26e1:-336:-323';
    END IF;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:2f6e890f-1704-5c76-aa94-f18d7f905e06:capital:dd4811ef-44a5-5739-b09e-b1c4852b26e1:-336:-323','47fc9701-c079-5a5a-9360-90e059d4ca97'::uuid,'Hellenic Ministry of Culture, Cultural Egnatia: Pella')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('dd4811ef-44a5-5739-b09e-b1c4852b26e1'::uuid,'47fc9701-c079-5a5a-9360-90e059d4ca97'::uuid,'Hellenic Ministry of Culture, Cultural Egnatia: Pella')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:2f6e890f-1704-5c76-aa94-f18d7f905e06:capital:dd4811ef-44a5-5739-b09e-b1c4852b26e1:-336:-323','01bff9e2-4a89-5056-a9e5-9e2b0574367c'::uuid,'Hellenic Ministry of Culture and Sports, Odysseus: Pella')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('dd4811ef-44a5-5739-b09e-b1c4852b26e1'::uuid,'01bff9e2-4a89-5056-a9e5-9e2b0574367c'::uuid,'Hellenic Ministry of Culture and Sports, Odysseus: Pella')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_functions(fact_key,polity_id,function_type,place_id,start_year,end_year,confidence)
    VALUES('ppf:3b8f7efc-40ae-5a33-8956-e9e852fbede4:capital:f1c62e8f-86ae-5833-b6d9-9a426e027d6e:1815:1821','3b8f7efc-40ae-5a33-8956-e9e852fbede4'::uuid,'capital','f1c62e8f-86ae-5833-b6d9-9a426e027d6e'::uuid,1815,1821,'well_established')
    ON CONFLICT(fact_key) DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM atlas_v2.polity_place_functions
      WHERE fact_key='ppf:3b8f7efc-40ae-5a33-8956-e9e852fbede4:capital:f1c62e8f-86ae-5833-b6d9-9a426e027d6e:1815:1821'
        AND polity_id='3b8f7efc-40ae-5a33-8956-e9e852fbede4'::uuid
        AND function_type='capital'
        AND place_id='f1c62e8f-86ae-5833-b6d9-9a426e027d6e'::uuid
        AND start_year IS NOT DISTINCT FROM 1815
        AND end_year IS NOT DISTINCT FROM 1821
        AND confidence='well_established'
    ) THEN
      RAISE EXCEPTION 'SPATIAL_POLITY_PLACE_FUNCTION_CONFLICT:ppf:3b8f7efc-40ae-5a33-8956-e9e852fbede4:capital:f1c62e8f-86ae-5833-b6d9-9a426e027d6e:1815:1821';
    END IF;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:3b8f7efc-40ae-5a33-8956-e9e852fbede4:capital:f1c62e8f-86ae-5833-b6d9-9a426e027d6e:1815:1821','38e7f5dc-b0d9-5a54-acd3-5159075e1c6b'::uuid,'Governo do Brasil: Linha do Tempo da Independência')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('f1c62e8f-86ae-5833-b6d9-9a426e027d6e'::uuid,'38e7f5dc-b0d9-5a54-acd3-5159075e1c6b'::uuid,'Governo do Brasil: Linha do Tempo da Independência')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_functions(fact_key,polity_id,function_type,place_id,start_year,end_year,confidence)
    VALUES('ppf:5d9a6186-bbe6-5d1a-ba93-02190ae4c417:capital:823049a0-9d73-5191-a9c5-26a662697436:-27:329','5d9a6186-bbe6-5d1a-ba93-02190ae4c417'::uuid,'capital','823049a0-9d73-5191-a9c5-26a662697436'::uuid,-27,329,'well_established')
    ON CONFLICT(fact_key) DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM atlas_v2.polity_place_functions
      WHERE fact_key='ppf:5d9a6186-bbe6-5d1a-ba93-02190ae4c417:capital:823049a0-9d73-5191-a9c5-26a662697436:-27:329'
        AND polity_id='5d9a6186-bbe6-5d1a-ba93-02190ae4c417'::uuid
        AND function_type='capital'
        AND place_id='823049a0-9d73-5191-a9c5-26a662697436'::uuid
        AND start_year IS NOT DISTINCT FROM -27
        AND end_year IS NOT DISTINCT FROM 329
        AND confidence='well_established'
    ) THEN
      RAISE EXCEPTION 'SPATIAL_POLITY_PLACE_FUNCTION_CONFLICT:ppf:5d9a6186-bbe6-5d1a-ba93-02190ae4c417:capital:823049a0-9d73-5191-a9c5-26a662697436:-27:329';
    END IF;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:5d9a6186-bbe6-5d1a-ba93-02190ae4c417:capital:823049a0-9d73-5191-a9c5-26a662697436:-27:329','89243eda-1366-50cc-8b72-546766cf5b33'::uuid,'1911 Encyclopaedia Britannica: Constantine (emperors)')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('823049a0-9d73-5191-a9c5-26a662697436'::uuid,'89243eda-1366-50cc-8b72-546766cf5b33'::uuid,'1911 Encyclopaedia Britannica: Constantine (emperors)')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_functions(fact_key,polity_id,function_type,place_id,start_year,end_year,confidence)
    VALUES('ppf:5d9a6186-bbe6-5d1a-ba93-02190ae4c417:capital:d36994cd-c9d0-5fcf-a215-0fec2b2242ba:330:395','5d9a6186-bbe6-5d1a-ba93-02190ae4c417'::uuid,'capital','d36994cd-c9d0-5fcf-a215-0fec2b2242ba'::uuid,330,395,'well_established')
    ON CONFLICT(fact_key) DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM atlas_v2.polity_place_functions
      WHERE fact_key='ppf:5d9a6186-bbe6-5d1a-ba93-02190ae4c417:capital:d36994cd-c9d0-5fcf-a215-0fec2b2242ba:330:395'
        AND polity_id='5d9a6186-bbe6-5d1a-ba93-02190ae4c417'::uuid
        AND function_type='capital'
        AND place_id='d36994cd-c9d0-5fcf-a215-0fec2b2242ba'::uuid
        AND start_year IS NOT DISTINCT FROM 330
        AND end_year IS NOT DISTINCT FROM 395
        AND confidence='well_established'
    ) THEN
      RAISE EXCEPTION 'SPATIAL_POLITY_PLACE_FUNCTION_CONFLICT:ppf:5d9a6186-bbe6-5d1a-ba93-02190ae4c417:capital:d36994cd-c9d0-5fcf-a215-0fec2b2242ba:330:395';
    END IF;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:5d9a6186-bbe6-5d1a-ba93-02190ae4c417:capital:d36994cd-c9d0-5fcf-a215-0fec2b2242ba:330:395','2781d1ec-bf75-5045-bf99-3f7cdc919d0d'::uuid,'1911 Encyclopaedia Britannica: Constantinople')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('d36994cd-c9d0-5fcf-a215-0fec2b2242ba'::uuid,'2781d1ec-bf75-5045-bf99-3f7cdc919d0d'::uuid,'1911 Encyclopaedia Britannica: Constantinople')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_functions(fact_key,polity_id,function_type,place_id,start_year,end_year,confidence)
    VALUES('ppf:6539c314-ec29-42e0-a0c2-90991fb9ffd8:capital:4d5eb343-f0d9-521e-8dec-078cd2bcfbc2:1370:1405','6539c314-ec29-42e0-a0c2-90991fb9ffd8'::uuid,'capital','4d5eb343-f0d9-521e-8dec-078cd2bcfbc2'::uuid,1370,1405,'well_established')
    ON CONFLICT(fact_key) DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM atlas_v2.polity_place_functions
      WHERE fact_key='ppf:6539c314-ec29-42e0-a0c2-90991fb9ffd8:capital:4d5eb343-f0d9-521e-8dec-078cd2bcfbc2:1370:1405'
        AND polity_id='6539c314-ec29-42e0-a0c2-90991fb9ffd8'::uuid
        AND function_type='capital'
        AND place_id='4d5eb343-f0d9-521e-8dec-078cd2bcfbc2'::uuid
        AND start_year IS NOT DISTINCT FROM 1370
        AND end_year IS NOT DISTINCT FROM 1405
        AND confidence='well_established'
    ) THEN
      RAISE EXCEPTION 'SPATIAL_POLITY_PLACE_FUNCTION_CONFLICT:ppf:6539c314-ec29-42e0-a0c2-90991fb9ffd8:capital:4d5eb343-f0d9-521e-8dec-078cd2bcfbc2:1370:1405';
    END IF;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:6539c314-ec29-42e0-a0c2-90991fb9ffd8:capital:4d5eb343-f0d9-521e-8dec-078cd2bcfbc2:1370:1405','25dfe37e-1389-52de-a203-3231e5a9f106'::uuid,'The Metropolitan Museum of Art: The Art of the Timurid Period (ca. 1370–1507)')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('4d5eb343-f0d9-521e-8dec-078cd2bcfbc2'::uuid,'25dfe37e-1389-52de-a203-3231e5a9f106'::uuid,'The Metropolitan Museum of Art: The Art of the Timurid Period (ca. 1370–1507)')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_functions(fact_key,polity_id,function_type,place_id,start_year,end_year,confidence)
    VALUES('ppf:68c83ef6-0023-5af9-a6e8-26ccf5b8e116:capital:d2845992-4a4c-5a66-a209-18a0ca21ee7b:1806:1839','68c83ef6-0023-5af9-a6e8-26ccf5b8e116'::uuid,'capital','d2845992-4a4c-5a66-a209-18a0ca21ee7b'::uuid,1806,1839,'well_established')
    ON CONFLICT(fact_key) DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM atlas_v2.polity_place_functions
      WHERE fact_key='ppf:68c83ef6-0023-5af9-a6e8-26ccf5b8e116:capital:d2845992-4a4c-5a66-a209-18a0ca21ee7b:1806:1839'
        AND polity_id='68c83ef6-0023-5af9-a6e8-26ccf5b8e116'::uuid
        AND function_type='capital'
        AND place_id='d2845992-4a4c-5a66-a209-18a0ca21ee7b'::uuid
        AND start_year IS NOT DISTINCT FROM 1806
        AND end_year IS NOT DISTINCT FROM 1839
        AND confidence='well_established'
    ) THEN
      RAISE EXCEPTION 'SPATIAL_POLITY_PLACE_FUNCTION_CONFLICT:ppf:68c83ef6-0023-5af9-a6e8-26ccf5b8e116:capital:d2845992-4a4c-5a66-a209-18a0ca21ee7b:1806:1839';
    END IF;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:68c83ef6-0023-5af9-a6e8-26ccf5b8e116:capital:d2845992-4a4c-5a66-a209-18a0ca21ee7b:1806:1839','51851bcf-6c36-56b8-bf2b-808c9aaf4c7d'::uuid,'National Museum of Oman: Architectural Heritage — Muscat')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('d2845992-4a4c-5a66-a209-18a0ca21ee7b'::uuid,'51851bcf-6c36-56b8-bf2b-808c9aaf4c7d'::uuid,'National Museum of Oman: Architectural Heritage — Muscat')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_functions(fact_key,polity_id,function_type,place_id,start_year,end_year,confidence)
    VALUES('ppf:68c83ef6-0023-5af9-a6e8-26ccf5b8e116:capital:877dcabe-21b2-5a8f-b7b1-43a29e47ea9a:1840:1856','68c83ef6-0023-5af9-a6e8-26ccf5b8e116'::uuid,'capital','877dcabe-21b2-5a8f-b7b1-43a29e47ea9a'::uuid,1840,1856,'well_established')
    ON CONFLICT(fact_key) DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM atlas_v2.polity_place_functions
      WHERE fact_key='ppf:68c83ef6-0023-5af9-a6e8-26ccf5b8e116:capital:877dcabe-21b2-5a8f-b7b1-43a29e47ea9a:1840:1856'
        AND polity_id='68c83ef6-0023-5af9-a6e8-26ccf5b8e116'::uuid
        AND function_type='capital'
        AND place_id='877dcabe-21b2-5a8f-b7b1-43a29e47ea9a'::uuid
        AND start_year IS NOT DISTINCT FROM 1840
        AND end_year IS NOT DISTINCT FROM 1856
        AND confidence='well_established'
    ) THEN
      RAISE EXCEPTION 'SPATIAL_POLITY_PLACE_FUNCTION_CONFLICT:ppf:68c83ef6-0023-5af9-a6e8-26ccf5b8e116:capital:877dcabe-21b2-5a8f-b7b1-43a29e47ea9a:1840:1856';
    END IF;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:68c83ef6-0023-5af9-a6e8-26ccf5b8e116:capital:877dcabe-21b2-5a8f-b7b1-43a29e47ea9a:1840:1856','51851bcf-6c36-56b8-bf2b-808c9aaf4c7d'::uuid,'National Museum of Oman: Architectural Heritage — Muscat')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('877dcabe-21b2-5a8f-b7b1-43a29e47ea9a'::uuid,'51851bcf-6c36-56b8-bf2b-808c9aaf4c7d'::uuid,'National Museum of Oman: Architectural Heritage — Muscat')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:68c83ef6-0023-5af9-a6e8-26ccf5b8e116:capital:877dcabe-21b2-5a8f-b7b1-43a29e47ea9a:1840:1856','b8a51ecc-5091-51e2-97b6-cb24b4cd7d48'::uuid,'Oman Ministry of Foreign Affairs: History')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('877dcabe-21b2-5a8f-b7b1-43a29e47ea9a'::uuid,'b8a51ecc-5091-51e2-97b6-cb24b4cd7d48'::uuid,'Oman Ministry of Foreign Affairs: History')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_functions(fact_key,polity_id,function_type,place_id,start_year,end_year,confidence)
    VALUES('ppf:6d1520e2-0aff-5063-b2b7-95eb86daf372:capital:0f81f69e-4b34-58c6-b9a3-65b48e786d63:1299:1325','6d1520e2-0aff-5063-b2b7-95eb86daf372'::uuid,'capital','0f81f69e-4b34-58c6-b9a3-65b48e786d63'::uuid,1299,1325,'well_established')
    ON CONFLICT(fact_key) DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM atlas_v2.polity_place_functions
      WHERE fact_key='ppf:6d1520e2-0aff-5063-b2b7-95eb86daf372:capital:0f81f69e-4b34-58c6-b9a3-65b48e786d63:1299:1325'
        AND polity_id='6d1520e2-0aff-5063-b2b7-95eb86daf372'::uuid
        AND function_type='capital'
        AND place_id='0f81f69e-4b34-58c6-b9a3-65b48e786d63'::uuid
        AND start_year IS NOT DISTINCT FROM 1299
        AND end_year IS NOT DISTINCT FROM 1325
        AND confidence='well_established'
    ) THEN
      RAISE EXCEPTION 'SPATIAL_POLITY_PLACE_FUNCTION_CONFLICT:ppf:6d1520e2-0aff-5063-b2b7-95eb86daf372:capital:0f81f69e-4b34-58c6-b9a3-65b48e786d63:1299:1325';
    END IF;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:6d1520e2-0aff-5063-b2b7-95eb86daf372:capital:0f81f69e-4b34-58c6-b9a3-65b48e786d63:1299:1325','7a0280a6-71d0-5ae9-809c-9d0db9e1d181'::uuid,'Republic of Türkiye Ministry of National Education, Söğüt District: İlçemiz - Söğüt')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('0f81f69e-4b34-58c6-b9a3-65b48e786d63'::uuid,'7a0280a6-71d0-5ae9-809c-9d0db9e1d181'::uuid,'Republic of Türkiye Ministry of National Education, Söğüt District: İlçemiz - Söğüt')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_functions(fact_key,polity_id,function_type,place_id,start_year,end_year,confidence)
    VALUES('ppf:6d1520e2-0aff-5063-b2b7-95eb86daf372:capital:f0bbb5ec-a47f-53ad-adf2-6d12e431a586:1326:1364','6d1520e2-0aff-5063-b2b7-95eb86daf372'::uuid,'capital','f0bbb5ec-a47f-53ad-adf2-6d12e431a586'::uuid,1326,1364,'well_established')
    ON CONFLICT(fact_key) DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM atlas_v2.polity_place_functions
      WHERE fact_key='ppf:6d1520e2-0aff-5063-b2b7-95eb86daf372:capital:f0bbb5ec-a47f-53ad-adf2-6d12e431a586:1326:1364'
        AND polity_id='6d1520e2-0aff-5063-b2b7-95eb86daf372'::uuid
        AND function_type='capital'
        AND place_id='f0bbb5ec-a47f-53ad-adf2-6d12e431a586'::uuid
        AND start_year IS NOT DISTINCT FROM 1326
        AND end_year IS NOT DISTINCT FROM 1364
        AND confidence='well_established'
    ) THEN
      RAISE EXCEPTION 'SPATIAL_POLITY_PLACE_FUNCTION_CONFLICT:ppf:6d1520e2-0aff-5063-b2b7-95eb86daf372:capital:f0bbb5ec-a47f-53ad-adf2-6d12e431a586:1326:1364';
    END IF;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:6d1520e2-0aff-5063-b2b7-95eb86daf372:capital:f0bbb5ec-a47f-53ad-adf2-6d12e431a586:1326:1364','69e4362a-3589-52b4-9a32-5b8e83710552'::uuid,'Republic of Türkiye Bursa Governorship: Tarihçe')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('f0bbb5ec-a47f-53ad-adf2-6d12e431a586'::uuid,'69e4362a-3589-52b4-9a32-5b8e83710552'::uuid,'Republic of Türkiye Bursa Governorship: Tarihçe')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_functions(fact_key,polity_id,function_type,place_id,start_year,end_year,confidence)
    VALUES('ppf:6d1520e2-0aff-5063-b2b7-95eb86daf372:capital:ae91bb0d-d164-521f-85b7-d96ceca4fa2a:1365:1452','6d1520e2-0aff-5063-b2b7-95eb86daf372'::uuid,'capital','ae91bb0d-d164-521f-85b7-d96ceca4fa2a'::uuid,1365,1452,'well_established')
    ON CONFLICT(fact_key) DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM atlas_v2.polity_place_functions
      WHERE fact_key='ppf:6d1520e2-0aff-5063-b2b7-95eb86daf372:capital:ae91bb0d-d164-521f-85b7-d96ceca4fa2a:1365:1452'
        AND polity_id='6d1520e2-0aff-5063-b2b7-95eb86daf372'::uuid
        AND function_type='capital'
        AND place_id='ae91bb0d-d164-521f-85b7-d96ceca4fa2a'::uuid
        AND start_year IS NOT DISTINCT FROM 1365
        AND end_year IS NOT DISTINCT FROM 1452
        AND confidence='well_established'
    ) THEN
      RAISE EXCEPTION 'SPATIAL_POLITY_PLACE_FUNCTION_CONFLICT:ppf:6d1520e2-0aff-5063-b2b7-95eb86daf372:capital:ae91bb0d-d164-521f-85b7-d96ceca4fa2a:1365:1452';
    END IF;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:6d1520e2-0aff-5063-b2b7-95eb86daf372:capital:ae91bb0d-d164-521f-85b7-d96ceca4fa2a:1365:1452','0a3dc36b-9eb9-5536-ac23-5fe71cb9467b'::uuid,'Türkiye Culture Portal: Edirne - Genel Bilgiler')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('ae91bb0d-d164-521f-85b7-d96ceca4fa2a'::uuid,'0a3dc36b-9eb9-5536-ac23-5fe71cb9467b'::uuid,'Türkiye Culture Portal: Edirne - Genel Bilgiler')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_functions(fact_key,polity_id,function_type,place_id,start_year,end_year,confidence)
    VALUES('ppf:6d1520e2-0aff-5063-b2b7-95eb86daf372:capital:d36994cd-c9d0-5fcf-a215-0fec2b2242ba:1453:1922','6d1520e2-0aff-5063-b2b7-95eb86daf372'::uuid,'capital','d36994cd-c9d0-5fcf-a215-0fec2b2242ba'::uuid,1453,1922,'well_established')
    ON CONFLICT(fact_key) DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM atlas_v2.polity_place_functions
      WHERE fact_key='ppf:6d1520e2-0aff-5063-b2b7-95eb86daf372:capital:d36994cd-c9d0-5fcf-a215-0fec2b2242ba:1453:1922'
        AND polity_id='6d1520e2-0aff-5063-b2b7-95eb86daf372'::uuid
        AND function_type='capital'
        AND place_id='d36994cd-c9d0-5fcf-a215-0fec2b2242ba'::uuid
        AND start_year IS NOT DISTINCT FROM 1453
        AND end_year IS NOT DISTINCT FROM 1922
        AND confidence='well_established'
    ) THEN
      RAISE EXCEPTION 'SPATIAL_POLITY_PLACE_FUNCTION_CONFLICT:ppf:6d1520e2-0aff-5063-b2b7-95eb86daf372:capital:d36994cd-c9d0-5fcf-a215-0fec2b2242ba:1453:1922';
    END IF;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:6d1520e2-0aff-5063-b2b7-95eb86daf372:capital:d36994cd-c9d0-5fcf-a215-0fec2b2242ba:1453:1922','2781d1ec-bf75-5045-bf99-3f7cdc919d0d'::uuid,'1911 Encyclopaedia Britannica: Constantinople')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('d36994cd-c9d0-5fcf-a215-0fec2b2242ba'::uuid,'2781d1ec-bf75-5045-bf99-3f7cdc919d0d'::uuid,'1911 Encyclopaedia Britannica: Constantinople')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_functions(fact_key,polity_id,function_type,place_id,start_year,end_year,confidence)
    VALUES('ppf:d54c540c-f3fb-5d05-9dc0-26af4ee9815a:imperial_court_core:e490f5ab-d605-56b5-842f-0916cbb7bb28:1206:1259','d54c540c-f3fb-5d05-9dc0-26af4ee9815a'::uuid,'imperial_court_core','e490f5ab-d605-56b5-842f-0916cbb7bb28'::uuid,1206,1259,'well_established')
    ON CONFLICT(fact_key) DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM atlas_v2.polity_place_functions
      WHERE fact_key='ppf:d54c540c-f3fb-5d05-9dc0-26af4ee9815a:imperial_court_core:e490f5ab-d605-56b5-842f-0916cbb7bb28:1206:1259'
        AND polity_id='d54c540c-f3fb-5d05-9dc0-26af4ee9815a'::uuid
        AND function_type='imperial_court_core'
        AND place_id='e490f5ab-d605-56b5-842f-0916cbb7bb28'::uuid
        AND start_year IS NOT DISTINCT FROM 1206
        AND end_year IS NOT DISTINCT FROM 1259
        AND confidence='well_established'
    ) THEN
      RAISE EXCEPTION 'SPATIAL_POLITY_PLACE_FUNCTION_CONFLICT:ppf:d54c540c-f3fb-5d05-9dc0-26af4ee9815a:imperial_court_core:e490f5ab-d605-56b5-842f-0916cbb7bb28:1206:1259';
    END IF;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:d54c540c-f3fb-5d05-9dc0-26af4ee9815a:imperial_court_core:e490f5ab-d605-56b5-842f-0916cbb7bb28:1206:1259','82cfad27-e6e5-57ed-97c7-28ae56bb5072'::uuid,'UNESCO World Heritage Centre: Archaeological Site at Khuduu Aral and Surrounding Cultural Landscape')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('e490f5ab-d605-56b5-842f-0916cbb7bb28'::uuid,'82cfad27-e6e5-57ed-97c7-28ae56bb5072'::uuid,'UNESCO World Heritage Centre: Archaeological Site at Khuduu Aral and Surrounding Cultural Landscape')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:d54c540c-f3fb-5d05-9dc0-26af4ee9815a:imperial_court_core:e490f5ab-d605-56b5-842f-0916cbb7bb28:1206:1259','51e16f5a-ff7f-5d3c-b03e-034f9a1ef04d'::uuid,'Cambridge Antiquity: Mapping Karakorum, the capital of the Mongol Empire')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('e490f5ab-d605-56b5-842f-0916cbb7bb28'::uuid,'51e16f5a-ff7f-5d3c-b03e-034f9a1ef04d'::uuid,'Cambridge Antiquity: Mapping Karakorum, the capital of the Mongol Empire')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:d54c540c-f3fb-5d05-9dc0-26af4ee9815a:imperial_court_core:e490f5ab-d605-56b5-842f-0916cbb7bb28:1206:1259','02e15cce-9ea1-5b3c-a3e1-c11842dfd8c9'::uuid,'Cambridge Modern Asian Studies: The cosmopolitanism of Karakorum, capital of the Mongol empire in Mongolia')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('e490f5ab-d605-56b5-842f-0916cbb7bb28'::uuid,'02e15cce-9ea1-5b3c-a3e1-c11842dfd8c9'::uuid,'Cambridge Modern Asian Studies: The cosmopolitanism of Karakorum, capital of the Mongol empire in Mongolia')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_functions(fact_key,polity_id,function_type,place_id,start_year,end_year,confidence)
    VALUES('ppf:d54c540c-f3fb-5d05-9dc0-26af4ee9815a:imperial_court_core:64b8f4c4-3d8e-58ad-9ba4-4b98fb49ef0f:1260:1271','d54c540c-f3fb-5d05-9dc0-26af4ee9815a'::uuid,'imperial_court_core','64b8f4c4-3d8e-58ad-9ba4-4b98fb49ef0f'::uuid,1260,1271,'well_established')
    ON CONFLICT(fact_key) DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM atlas_v2.polity_place_functions
      WHERE fact_key='ppf:d54c540c-f3fb-5d05-9dc0-26af4ee9815a:imperial_court_core:64b8f4c4-3d8e-58ad-9ba4-4b98fb49ef0f:1260:1271'
        AND polity_id='d54c540c-f3fb-5d05-9dc0-26af4ee9815a'::uuid
        AND function_type='imperial_court_core'
        AND place_id='64b8f4c4-3d8e-58ad-9ba4-4b98fb49ef0f'::uuid
        AND start_year IS NOT DISTINCT FROM 1260
        AND end_year IS NOT DISTINCT FROM 1271
        AND confidence='well_established'
    ) THEN
      RAISE EXCEPTION 'SPATIAL_POLITY_PLACE_FUNCTION_CONFLICT:ppf:d54c540c-f3fb-5d05-9dc0-26af4ee9815a:imperial_court_core:64b8f4c4-3d8e-58ad-9ba4-4b98fb49ef0f:1260:1271';
    END IF;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:d54c540c-f3fb-5d05-9dc0-26af4ee9815a:imperial_court_core:64b8f4c4-3d8e-58ad-9ba4-4b98fb49ef0f:1260:1271','ea373bc1-66af-5950-a4c8-c31188c0f320'::uuid,'Cambridge History of the Mongol Empire: Mongolia in the Mongol Empire')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('64b8f4c4-3d8e-58ad-9ba4-4b98fb49ef0f'::uuid,'ea373bc1-66af-5950-a4c8-c31188c0f320'::uuid,'Cambridge History of the Mongol Empire: Mongolia in the Mongol Empire')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:d54c540c-f3fb-5d05-9dc0-26af4ee9815a:imperial_court_core:64b8f4c4-3d8e-58ad-9ba4-4b98fb49ef0f:1260:1271','91d307b2-a4e3-5795-9f37-c0a2fabee2c7'::uuid,'UNESCO World Heritage Centre: Site of Xanadu')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('64b8f4c4-3d8e-58ad-9ba4-4b98fb49ef0f'::uuid,'91d307b2-a4e3-5795-9f37-c0a2fabee2c7'::uuid,'UNESCO World Heritage Centre: Site of Xanadu')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:d54c540c-f3fb-5d05-9dc0-26af4ee9815a:imperial_court_core:64b8f4c4-3d8e-58ad-9ba4-4b98fb49ef0f:1260:1271','37f50f8f-b242-5dfe-aeeb-4230d9c31670'::uuid,'Metropolitan Museum of Art: China, 1000–1400 A.D. chronology')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('64b8f4c4-3d8e-58ad-9ba4-4b98fb49ef0f'::uuid,'37f50f8f-b242-5dfe-aeeb-4230d9c31670'::uuid,'Metropolitan Museum of Art: China, 1000–1400 A.D. chronology')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_functions(fact_key,polity_id,function_type,place_id,start_year,end_year,confidence)
    VALUES('ppf:e3da3007-529a-40ec-9934-7b70dfd11cb7:capital:53708ee8-020e-5efa-89f6-85d97d26cd82:1250:1517','e3da3007-529a-40ec-9934-7b70dfd11cb7'::uuid,'capital','53708ee8-020e-5efa-89f6-85d97d26cd82'::uuid,1250,1517,'well_established')
    ON CONFLICT(fact_key) DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM atlas_v2.polity_place_functions
      WHERE fact_key='ppf:e3da3007-529a-40ec-9934-7b70dfd11cb7:capital:53708ee8-020e-5efa-89f6-85d97d26cd82:1250:1517'
        AND polity_id='e3da3007-529a-40ec-9934-7b70dfd11cb7'::uuid
        AND function_type='capital'
        AND place_id='53708ee8-020e-5efa-89f6-85d97d26cd82'::uuid
        AND start_year IS NOT DISTINCT FROM 1250
        AND end_year IS NOT DISTINCT FROM 1517
        AND confidence='well_established'
    ) THEN
      RAISE EXCEPTION 'SPATIAL_POLITY_PLACE_FUNCTION_CONFLICT:ppf:e3da3007-529a-40ec-9934-7b70dfd11cb7:capital:53708ee8-020e-5efa-89f6-85d97d26cd82:1250:1517';
    END IF;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:e3da3007-529a-40ec-9934-7b70dfd11cb7:capital:53708ee8-020e-5efa-89f6-85d97d26cd82:1250:1517','e91f57ec-9c46-594b-859b-4a14c2af99ba'::uuid,'Getty Thesaurus of Geographic Names: Mamluk Sultanate (TGN 6003667)')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('53708ee8-020e-5efa-89f6-85d97d26cd82'::uuid,'e91f57ec-9c46-594b-859b-4a14c2af99ba'::uuid,'Getty Thesaurus of Geographic Names: Mamluk Sultanate (TGN 6003667)')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_functions(fact_key,polity_id,function_type,place_id,start_year,end_year,confidence)
    VALUES('ppf:5fce7b7e-7e6c-5f91-96b6-ebcd925b0a90:political_center:4792157c-99ac-5d72-84bc-99baeb217911:1943:1943','5fce7b7e-7e6c-5f91-96b6-ebcd925b0a90'::uuid,'political_center','4792157c-99ac-5d72-84bc-99baeb217911'::uuid,1943,1943,'well_established')
    ON CONFLICT(fact_key) DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM atlas_v2.polity_place_functions
      WHERE fact_key='ppf:5fce7b7e-7e6c-5f91-96b6-ebcd925b0a90:political_center:4792157c-99ac-5d72-84bc-99baeb217911:1943:1943'
        AND polity_id='5fce7b7e-7e6c-5f91-96b6-ebcd925b0a90'::uuid
        AND function_type='political_center'
        AND place_id='4792157c-99ac-5d72-84bc-99baeb217911'::uuid
        AND start_year IS NOT DISTINCT FROM 1943
        AND end_year IS NOT DISTINCT FROM 1943
        AND confidence='well_established'
    ) THEN
      RAISE EXCEPTION 'SPATIAL_POLITY_PLACE_FUNCTION_CONFLICT:ppf:5fce7b7e-7e6c-5f91-96b6-ebcd925b0a90:political_center:4792157c-99ac-5d72-84bc-99baeb217911:1943:1943';
    END IF;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:5fce7b7e-7e6c-5f91-96b6-ebcd925b0a90:political_center:4792157c-99ac-5d72-84bc-99baeb217911:1943:1943','677c16aa-8a6b-52a7-ab98-27ef7a3190d4'::uuid,'Press Information Bureau, Government of India: Anniversary of the formation of Azad Hind Government (21 Oct 1943)')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('4792157c-99ac-5d72-84bc-99baeb217911'::uuid,'677c16aa-8a6b-52a7-ab98-27ef7a3190d4'::uuid,'Press Information Bureau, Government of India: Anniversary of the formation of Azad Hind Government (21 Oct 1943)')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:5fce7b7e-7e6c-5f91-96b6-ebcd925b0a90:political_center:4792157c-99ac-5d72-84bc-99baeb217911:1943:1943','25cfc76c-7993-5d82-987c-7d46352fb048'::uuid,'Publications Division, Government of India: Builders of Modern India — Subhas Chandra Bose')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('4792157c-99ac-5d72-84bc-99baeb217911'::uuid,'25cfc76c-7993-5d82-987c-7d46352fb048'::uuid,'Publications Division, Government of India: Builders of Modern India — Subhas Chandra Bose')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_functions(fact_key,polity_id,function_type,place_id,start_year,end_year,confidence)
    VALUES('ppf:5fce7b7e-7e6c-5f91-96b6-ebcd925b0a90:political_center:41539b95-1782-5c82-9578-afe8cecd1a83:1944:1945','5fce7b7e-7e6c-5f91-96b6-ebcd925b0a90'::uuid,'political_center','41539b95-1782-5c82-9578-afe8cecd1a83'::uuid,1944,1945,'well_established')
    ON CONFLICT(fact_key) DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM atlas_v2.polity_place_functions
      WHERE fact_key='ppf:5fce7b7e-7e6c-5f91-96b6-ebcd925b0a90:political_center:41539b95-1782-5c82-9578-afe8cecd1a83:1944:1945'
        AND polity_id='5fce7b7e-7e6c-5f91-96b6-ebcd925b0a90'::uuid
        AND function_type='political_center'
        AND place_id='41539b95-1782-5c82-9578-afe8cecd1a83'::uuid
        AND start_year IS NOT DISTINCT FROM 1944
        AND end_year IS NOT DISTINCT FROM 1945
        AND confidence='well_established'
    ) THEN
      RAISE EXCEPTION 'SPATIAL_POLITY_PLACE_FUNCTION_CONFLICT:ppf:5fce7b7e-7e6c-5f91-96b6-ebcd925b0a90:political_center:41539b95-1782-5c82-9578-afe8cecd1a83:1944:1945';
    END IF;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:5fce7b7e-7e6c-5f91-96b6-ebcd925b0a90:political_center:41539b95-1782-5c82-9578-afe8cecd1a83:1944:1945','c88cdd70-16eb-5c3c-881b-425a880029f9'::uuid,'Government of India / IGNCA chronology: Bose civil and military headquarters moved to Burma in January 1944')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('41539b95-1782-5c82-9578-afe8cecd1a83'::uuid,'c88cdd70-16eb-5c3c-881b-425a880029f9'::uuid,'Government of India / IGNCA chronology: Bose civil and military headquarters moved to Burma in January 1944')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:5fce7b7e-7e6c-5f91-96b6-ebcd925b0a90:political_center:41539b95-1782-5c82-9578-afe8cecd1a83:1944:1945','d0516347-22db-5919-80aa-ca80fe33574f'::uuid,'Odisha Review: headquarters of the Provisional Government, Indian Independence League and Supreme Command shifted from Singapore to Rangoon')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('41539b95-1782-5c82-9578-afe8cecd1a83'::uuid,'d0516347-22db-5919-80aa-ca80fe33574f'::uuid,'Odisha Review: headquarters of the Provisional Government, Indian Independence League and Supreme Command shifted from Singapore to Rangoon')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_functions(fact_key,polity_id,function_type,place_id,start_year,end_year,confidence)
    VALUES('ppf:a1697cdb-1085-545c-850e-1bbc25cdb61b:capital:e9c69c90-7572-5a69-ae63-19f5ac1946b1:632:656','a1697cdb-1085-545c-850e-1bbc25cdb61b'::uuid,'capital','e9c69c90-7572-5a69-ae63-19f5ac1946b1'::uuid,632,656,'well_established')
    ON CONFLICT(fact_key) DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM atlas_v2.polity_place_functions
      WHERE fact_key='ppf:a1697cdb-1085-545c-850e-1bbc25cdb61b:capital:e9c69c90-7572-5a69-ae63-19f5ac1946b1:632:656'
        AND polity_id='a1697cdb-1085-545c-850e-1bbc25cdb61b'::uuid
        AND function_type='capital'
        AND place_id='e9c69c90-7572-5a69-ae63-19f5ac1946b1'::uuid
        AND start_year IS NOT DISTINCT FROM 632
        AND end_year IS NOT DISTINCT FROM 656
        AND confidence='well_established'
    ) THEN
      RAISE EXCEPTION 'SPATIAL_POLITY_PLACE_FUNCTION_CONFLICT:ppf:a1697cdb-1085-545c-850e-1bbc25cdb61b:capital:e9c69c90-7572-5a69-ae63-19f5ac1946b1:632:656';
    END IF;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:a1697cdb-1085-545c-850e-1bbc25cdb61b:capital:e9c69c90-7572-5a69-ae63-19f5ac1946b1:632:656','82565127-eb9c-5da2-a1c4-8fcd738ecf87'::uuid,'Cambridge University Press: Rituals of Islamic Monarchy — the conquest society c. 628–c. 660')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('e9c69c90-7572-5a69-ae63-19f5ac1946b1'::uuid,'82565127-eb9c-5da2-a1c4-8fcd738ecf87'::uuid,'Cambridge University Press: Rituals of Islamic Monarchy — the conquest society c. 628–c. 660')
    ON CONFLICT DO NOTHING;

    INSERT INTO atlas_v2.polity_place_functions(fact_key,polity_id,function_type,place_id,start_year,end_year,confidence)
    VALUES('ppf:a1697cdb-1085-545c-850e-1bbc25cdb61b:capital:889c7eb5-f72e-5297-9759-c8c2d193efeb:656:661','a1697cdb-1085-545c-850e-1bbc25cdb61b'::uuid,'capital','889c7eb5-f72e-5297-9759-c8c2d193efeb'::uuid,656,661,'well_established')
    ON CONFLICT(fact_key) DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM atlas_v2.polity_place_functions
      WHERE fact_key='ppf:a1697cdb-1085-545c-850e-1bbc25cdb61b:capital:889c7eb5-f72e-5297-9759-c8c2d193efeb:656:661'
        AND polity_id='a1697cdb-1085-545c-850e-1bbc25cdb61b'::uuid
        AND function_type='capital'
        AND place_id='889c7eb5-f72e-5297-9759-c8c2d193efeb'::uuid
        AND start_year IS NOT DISTINCT FROM 656
        AND end_year IS NOT DISTINCT FROM 661
        AND confidence='well_established'
    ) THEN
      RAISE EXCEPTION 'SPATIAL_POLITY_PLACE_FUNCTION_CONFLICT:ppf:a1697cdb-1085-545c-850e-1bbc25cdb61b:capital:889c7eb5-f72e-5297-9759-c8c2d193efeb:656:661';
    END IF;

    INSERT INTO atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    VALUES('ppf:a1697cdb-1085-545c-850e-1bbc25cdb61b:capital:889c7eb5-f72e-5297-9759-c8c2d193efeb:656:661','9ed98162-dc7d-5a2f-89da-db4aac4694ae'::uuid,'Encyclopaedia Iranica: Kufa — Ali (r. 656–61) chose Kufa as his capital')
    ON CONFLICT DO NOTHING;
    INSERT INTO atlas_v2.place_sources(place_id,source_id,source_locator_key)
    VALUES('889c7eb5-f72e-5297-9759-c8c2d193efeb'::uuid,'9ed98162-dc7d-5a2f-89da-db4aac4694ae'::uuid,'Encyclopaedia Iranica: Kufa — Ali (r. 656–61) chose Kufa as his capital')
    ON CONFLICT DO NOTHING;

END
$seed$;

COMMIT;
