BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-authoring:person-registration-queue-authority:v1'));
SET LOCAL lock_timeout='10s';

CREATE TABLE IF NOT EXISTS atlas_v2.person_registration_candidates (
  candidate_id text PRIMARY KEY,
  name text NOT NULL,
  representative_domain text,
  priority text,
  review_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  person_id uuid REFERENCES atlas_v2.persons(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT person_registration_candidates_candidate_id_ck CHECK (btrim(candidate_id) <> ''),
  CONSTRAINT person_registration_candidates_name_ck CHECK (btrim(name) <> ''),
  CONSTRAINT person_registration_candidates_review_metadata_ck CHECK (jsonb_typeof(review_metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS person_registration_candidates_pending_idx
  ON atlas_v2.person_registration_candidates(representative_domain,name,candidate_id)
  WHERE person_id IS NULL;

COMMENT ON TABLE atlas_v2.person_registration_candidates IS
  'Canonical Person registration candidate dataset. Queue membership is defined only by person_id IS NULL.';
COMMENT ON COLUMN atlas_v2.person_registration_candidates.person_id IS
  'NULL means currently pending registration; canonical Person UUID means registration complete.';

-- One-time bootstrap snapshot from the pre-cutover PR #1802 live view.
-- Runtime queue membership never consults names, aliases, Git JSON, or issue history.
-- Fresh schema rehearsals may not contain Production Persons yet; bootstrap UUIDs bind only when that canonical UUID exists.
WITH seed(candidate_id,name,representative_domain,priority,review_metadata,bootstrap_person_id) AS (
VALUES
(
  'aoe2-ss-20260925-abdallah-ibn-yasin',
  'Abdallah ibn Yasin',
  'religion',
  'SS',
  '{"lookup_names":["Abdallah ibn Yasin"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825498864,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'c4b0f1e9-722f-4507-8a27-bc4ee86a19de'::uuid
),
(
  'aoe2-ss-20260925-ala-ad-din-muhammad-ii',
  'Ala ad-Din Muhammad II',
  'governance',
  'SS',
  '{"lookup_names":["Ala ad-Din Muhammad II"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825498864,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '186aab39-b7d1-4cba-810b-eb7da6cf7d58'::uuid
),
(
  'aoe2-ss-20260925-ala-ud-din-khalji',
  'Ala-ud-Din Khalji',
  'governance',
  'SS',
  '{"lookup_names":["Ala-ud-Din Khalji"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825498864,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'aoe2-ss-20260925-alboin',
  'Alboin',
  'governance',
  'SS',
  '{"lookup_names":["Alboin"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825498864,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '7e66a97e-2ebe-454b-8271-970defde582d'::uuid
),
(
  'aoe2-ss-20260925-algirdas',
  'Algirdas',
  'governance',
  'SS',
  '{"lookup_names":["Algirdas"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825498864,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'e0035e50-9f08-4a32-81c2-a9544b65ebde'::uuid
),
(
  'aoe2-ss-20260925-ashikaga-takauji',
  'Ashikaga Takauji',
  'governance',
  'SS',
  '{"lookup_names":["Ashikaga Takauji"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825498864,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '97981e09-e791-49d6-9dea-78d56e472102'::uuid
),
(
  'aoe2-ss-20260925-ashot-i',
  'Ashot I',
  'governance',
  'SS',
  '{"lookup_names":["Ashot I"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825498864,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'aoe2-ss-20260925-asparukh',
  'Asparukh',
  'governance',
  'SS',
  '{"lookup_names":["Asparukh"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825498864,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'dae93a65-249b-4b12-907c-c49362aedf9a'::uuid
),
(
  'aoe2-ss-20260925-athaulf',
  'Athaulf',
  'governance',
  'SS',
  '{"lookup_names":["Athaulf"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825498864,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '63d86bed-3570-4dc0-a1d1-7da87484aa48'::uuid
),
(
  'aoe2-ss-20260925-bagrat-iii',
  'Bagrat III',
  'governance',
  'SS',
  '{"lookup_names":["Bagrat III"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825498864,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'aoe2-ss-20260925-baibars',
  'Baibars',
  'governance',
  'SS',
  '{"lookup_names":["Baibars"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825498864,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'fe5286f4-94fd-4d81-b933-5f76a790d58c'::uuid
),
(
  'aoe2-ss-20260925-bayezid-i',
  'Bayezid I Yildirim',
  'governance',
  'SS',
  '{"lookup_names":["Bayezid I Yildirim"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825499317,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'aoe2-ss-20260925-boleslaw-brave',
  'Boleslaw the Brave',
  'governance',
  'SS',
  '{"lookup_names":["Boleslaw the Brave"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825499317,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'aoe2-ss-20260925-conrad-ii',
  'Conrad the Salian',
  'governance',
  'SS',
  '{"lookup_names":["Conrad the Salian"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825499317,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'aoe2-ss-20260925-devapala',
  'Devapala',
  'governance',
  'SS',
  '{"lookup_names":["Devapala"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825499317,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'ccf0d599-8149-4fba-a9f3-ef784881d80a'::uuid
),
(
  'aoe2-ss-20260925-dinh-bo-linh',
  'Dinh Bo Linh',
  'governance',
  'SS',
  '{"lookup_names":["Dinh Bo Linh"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825499317,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'aoe2-ss-20260925-dmitry-donskoy',
  'Dmitry Donskoy',
  'governance',
  'SS',
  '{"lookup_names":["Dmitry Donskoy"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825499317,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'f7e47ad0-c71a-4af4-b3cd-d520e41e4819'::uuid
),
(
  'aoe2-ss-20260925-fritigern',
  'Fritigern',
  'military',
  'SS',
  '{"lookup_names":["Fritigern"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825499317,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '775f00b8-8a53-44b3-8bb5-9649fe0e9756'::uuid
),
(
  'aoe2-ss-20260925-frumentius',
  'Abuna Frumentius',
  'religion',
  'SS',
  '{"lookup_names":["Abuna Frumentius"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825498864,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'aoe2-ss-20260925-fujiwara-michinaga',
  'Fujiwara no Michinaga',
  'governance',
  'SS',
  '{"lookup_names":["Fujiwara no Michinaga"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825499317,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '28b007d2-95d6-4950-8868-5f30aec02da5'::uuid
),
(
  'aoe2-ss-20260925-gopala',
  'Gopala',
  'governance',
  'SS',
  '{"lookup_names":["Gopala"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825499317,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'e3bd9747-e3b5-4827-8ad9-bd69459e5ffa'::uuid
),
(
  'aoe2-ss-20260925-heinrich-i',
  'King Heinrich',
  'governance',
  'SS',
  '{"lookup_names":["King Heinrich"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825499804,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'aoe2-ss-20260925-hulegu',
  'Hulegu Khan',
  'governance',
  'SS',
  '{"lookup_names":["Hulegu Khan"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825499317,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'e4e46c6c-5c31-4bbe-95d0-3122679110cb'::uuid
),
(
  'aoe2-ss-20260925-ibn-tumart',
  'Ibn Tumart',
  'religion',
  'SS',
  '{"lookup_names":["Ibn Tumart"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825499317,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'b055503f-2511-4975-bf40-9d984dc72e40'::uuid
),
(
  'aoe2-ss-20260925-iltutmish',
  'Iltutmish',
  'governance',
  'SS',
  '{"lookup_names":["Iltutmish"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825499804,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '0762e450-7d28-4011-ab89-f8244a24d98a'::uuid
),
(
  'aoe2-ss-20260925-kestutis',
  'Kestutis',
  'governance',
  'SS',
  '{"lookup_names":["Kestutis"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825499804,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'f4fc84a1-c4dd-4036-9f20-bb6d21914061'::uuid
),
(
  'aoe2-ss-20260925-khosrow-ii',
  'King Chosroes II',
  'governance',
  'SS',
  '{"lookup_names":["King Chosroes II"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825499804,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'aoe2-ss-20260925-ly-thai-to',
  'Ly Thai To',
  'governance',
  'SS',
  '{"lookup_names":["Ly Thai To"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825499804,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '7b42b3b7-ba8a-4f12-83ca-43e2f78c70d9'::uuid
),
(
  'aoe2-ss-20260925-maharana-pratap',
  'Maharana Pratap',
  'governance',
  'SS',
  '{"lookup_names":["Maharana Pratap"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825499804,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'f7866f08-988d-419d-affb-4faff37cc093'::uuid
),
(
  'aoe2-ss-20260925-musa-ibn-nusayr',
  'Musa ibn Nusayr',
  'military',
  'SS',
  '{"lookup_names":["Musa ibn Nusayr"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825499804,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '581d5a01-d18c-4519-94dd-7c5b2b7a1deb'::uuid
),
(
  'aoe2-ss-20260925-nur-ad-din',
  'Nur ad-Din',
  'governance',
  'SS',
  '{"lookup_names":["Nur ad-Din"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825499804,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'aoe2-ss-20260925-odoacer',
  'Odoacer',
  'governance',
  'SS',
  '{"lookup_names":["Odoacer"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825499804,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'a7566fc2-ae57-480e-b2d2-43557a49b7b9'::uuid
),
(
  'aoe2-ss-20260925-ottokar-ii',
  'Premysl Ottokar II',
  'governance',
  'SS',
  '{"lookup_names":["Premysl Ottokar II"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825499804,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'a1b314bf-7b18-4489-aae3-e1fa7b94bab6'::uuid
),
(
  'aoe2-ss-20260925-qutb-aibak',
  'Qutb-ud-Din Aibak',
  'governance',
  'SS',
  '{"lookup_names":["Qutb-ud-Din Aibak"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825499804,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '363adcde-3b46-40f5-ad83-65733c7d745d'::uuid
),
(
  'aoe2-ss-20260925-raden-wijaya',
  'Raden Wijaya',
  'governance',
  'SS',
  '{"lookup_names":["Raden Wijaya"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825499804,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '0d6177bb-e99e-43a0-9587-67eee5257706'::uuid
),
(
  'aoe2-ss-20260925-shashanka',
  'Shashanka',
  'governance',
  'SS',
  '{"lookup_names":["Shashanka"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825500359,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'f371e82b-33eb-4927-8b45-1c553ea81d4c'::uuid
),
(
  'aoe2-ss-20260925-sigismund',
  'Emperor Sigismund',
  'governance',
  'SS',
  '{"lookup_names":["Emperor Sigismund"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825499317,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'aoe2-ss-20260925-sima-yi',
  'Sima Yi',
  'governance',
  'SS',
  '{"lookup_names":["Sima Yi"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825500359,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'c3128a85-ddde-4d28-9219-5715f8611b20'::uuid
),
(
  'aoe2-ss-20260925-stilicho',
  'Stilicho',
  'military',
  'SS',
  '{"lookup_names":["Stilicho"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825500359,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'dbac46ae-d3dc-4068-840f-46fedbdbd901'::uuid
),
(
  'aoe2-ss-20260925-tabinshwehti',
  'Tabinshwehti',
  'governance',
  'SS',
  '{"lookup_names":["Tabinshwehti"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825500359,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'f0c7abaa-7670-49d0-a82e-7b63fd1a62c3'::uuid
),
(
  'aoe2-ss-20260925-taira-kiyomori',
  'Taira no Kiyomori',
  'governance',
  'SS',
  '{"lookup_names":["Taira no Kiyomori"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825500359,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'b774cec1-f3b0-46a9-8cd1-3414e74780a4'::uuid
),
(
  'aoe2-ss-20260925-vardan-mamikonian',
  'Vardan Mamikonian',
  'military',
  'SS',
  '{"lookup_names":["Vardan Mamikonian"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825500359,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '45bdc34d-3a99-4034-b03d-c546c96608f9'::uuid
),
(
  'aoe2-ss-20260925-yaqub-saffar',
  'Yaqub al-Saffar',
  'governance',
  'SS',
  '{"lookup_names":["Yaqub al-Saffar"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825500359,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'aoe2-ss-20260925-yekuno-amlak',
  'Yekuno Amlak',
  'governance',
  'SS',
  '{"lookup_names":["Yekuno Amlak"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825500359,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'aoe2-ss-20260925-yusuf-tashfin',
  'Yusuf ibn Tashfin',
  'governance',
  'SS',
  '{"lookup_names":["Yusuf ibn Tashfin"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825500359,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'aoe2-sss-20260925-arpad',
  'Árpád / 아르파드',
  'governance',
  'SSS',
  '{"lookup_names":["Árpád / 아르파드","Árpád","아르파드"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825489104,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '00cac15d-d042-4194-bf74-afa7c8db9fe9'::uuid
),
(
  'aoe2-sss-20260925-boris-i',
  'Boris I Mikhail / 보리스 1세',
  'governance',
  'SSS',
  '{"lookup_names":["Boris I Mikhail / 보리스 1세","Boris I Mikhail","보리스 1세"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825488671,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'aa1602f7-8c07-4e5a-8195-fd17ad574990'::uuid
),
(
  'aoe2-sss-20260925-chandragupta-ii',
  'Chandragupta II / 찬드라굽타 2세',
  'governance',
  'SSS',
  '{"lookup_names":["Chandragupta II / 찬드라굽타 2세","Chandragupta II","찬드라굽타 2세"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825488671,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'b0ac1c8e-d644-48c1-a217-1c6ed8c7e32d'::uuid
),
(
  'aoe2-sss-20260925-gregory-vii',
  'Pope Gregory VII / 교황 그레고리오 7세',
  'religion',
  'SSS',
  '{"lookup_names":["Pope Gregory VII / 교황 그레고리오 7세","Pope Gregory VII","교황 그레고리오 7세"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825489104,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '366e42d6-90e0-4c02-a02e-9fad4128a76c'::uuid
),
(
  'aoe2-sss-20260925-harsha',
  'Harsha Vardhana / 하르샤바르다나',
  'governance',
  'SSS',
  '{"lookup_names":["Harsha Vardhana / 하르샤바르다나","Harsha Vardhana","하르샤바르다나"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825488671,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'aoe2-sss-20260925-ivan-iii',
  'Ivan III the Great / 이반 3세',
  'governance',
  'SSS',
  '{"lookup_names":["Ivan III the Great / 이반 3세","Ivan III the Great","이반 3세"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825488671,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '1a2730fa-d5ff-461b-ab1f-db15b5bb1e88'::uuid
),
(
  'aoe2-sss-20260925-jan-hus',
  'Jan Hus / 얀 후스',
  'religion',
  'SSS',
  '{"lookup_names":["Jan Hus / 얀 후스","Jan Hus","얀 후스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825488671,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '34770660-c98c-4a3c-b540-b4f392184a75'::uuid
),
(
  'aoe2-sss-20260925-jayavarman-ii',
  'Jayavarman II / 자야바르만 2세',
  'governance',
  'SSS',
  '{"lookup_names":["Jayavarman II / 자야바르만 2세","Jayavarman II","자야바르만 2세"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825488671,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'c0a4f8f0-fba3-4a54-a5c7-bffa8fdb5474'::uuid
),
(
  'aoe2-sss-20260925-malik-shah-i',
  'Malik-Shah I / 말리크샤 1세',
  'governance',
  'SSS',
  '{"lookup_names":["Malik-Shah I / 말리크샤 1세","Malik-Shah I","말리크샤 1세"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825488671,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'e2f4e6d8-bcc3-4e19-ac29-226abc112a35'::uuid
),
(
  'aoe2-sss-20260925-minamoto-yoritomo',
  'Minamoto no Yoritomo / 미나모토노 요리토모',
  'governance',
  'SSS',
  '{"lookup_names":["Minamoto no Yoritomo / 미나모토노 요리토모","Minamoto no Yoritomo","미나모토노 요리토모"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825488671,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'bccccaef-fcaf-4a49-ab9b-97d523a5bc49'::uuid
),
(
  'aoe2-sss-20260925-muawiyah-i',
  'Caliph Muawiyah I / 무아위야 1세',
  'governance',
  'SSS',
  '{"lookup_names":["Caliph Muawiyah I / 무아위야 1세","Caliph Muawiyah I","무아위야 1세"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825488671,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '77bb9d94-d3a2-48da-bc7b-2d9161336683'::uuid
),
(
  'aoe2-sss-20260925-pepin-short',
  'Pepin the Short / 피핀 3세',
  'governance',
  'SSS',
  '{"lookup_names":["Pepin the Short / 피핀 3세","Pepin the Short","피핀 3세"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825488671,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '5769844b-86d0-40c5-b6d9-766c9ebfe79b'::uuid
),
(
  'aoe2-sss-20260925-philip-ii-france',
  'Philip II Augustus / 필리프 2세 아우구스트',
  'governance',
  'SSS',
  '{"lookup_names":["Philip II Augustus / 필리프 2세 아우구스트","Philip II Augustus","필리프 2세 아우구스트"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825489104,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'fdde853d-4e50-496b-9271-519984301efa'::uuid
),
(
  'aoe2-sss-20260925-rajaraja-chola',
  'Rajaraja Chola / 라자라자 1세',
  'governance',
  'SSS',
  '{"lookup_names":["Rajaraja Chola / 라자라자 1세","Rajaraja Chola","라자라자 1세"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825489104,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '232cefa4-65b6-446e-a9ca-20b5b0b658fa'::uuid
),
(
  'aoe2-sss-20260925-seljuq',
  'Seljuq / 셀주크',
  'governance',
  'SSS',
  '{"lookup_names":["Seljuq / 셀주크","Seljuq","셀주크"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825489104,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'aoe2-sss-20260925-theodosius-i',
  'Theodosius I / 테오도시우스 1세',
  'governance',
  'SSS',
  '{"lookup_names":["Theodosius I / 테오도시우스 1세","Theodosius I","테오도시우스 1세"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825489104,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'bb039d57-d5e7-41b8-bbb8-59a8b4b0f2cd'::uuid
),
(
  'aoe2-sss-20260925-tughril-beg',
  'Tughril Beg / 투그릴 베그',
  'governance',
  'SSS',
  '{"lookup_names":["Tughril Beg / 투그릴 베그","Tughril Beg","투그릴 베그"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825489104,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '2618fb1f-3cb2-40fc-a353-d135054489c3'::uuid
),
(
  'aoe2-sss-20260925-vladimir-great',
  'Vladimir the Great / 블라디미르 1세',
  'governance',
  'SSS',
  '{"lookup_names":["Vladimir the Great / 블라디미르 1세","Vladimir the Great","블라디미르 1세"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825489104,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'e8e9bf8f-13d2-43df-8213-8ec6992fbdeb'::uuid
),
(
  'aoe2-sss-20260925-zhu-yuanzhang',
  'Zhu Yuanzhang / 홍무제',
  'governance',
  'SSS',
  '{"lookup_names":["Zhu Yuanzhang / 홍무제","Zhu Yuanzhang","홍무제"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5825489104,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '478e46ae-cfb6-47c2-b508-ab3c8e704380'::uuid
),
(
  'aviator-20260922-001',
  'Sir George Cayley / 조지 케일리',
  'technology',
  'SSS',
  '{"lookup_names":["Sir George Cayley / 조지 케일리","Sir George Cayley","조지 케일리"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763295237,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '97f308a5-a15f-4c39-a68f-40b201745266'::uuid
),
(
  'aviator-20260922-002',
  'Orville Wright / 오빌 라이트',
  'technology',
  'SSS',
  '{"lookup_names":["Orville Wright / 오빌 라이트","Orville Wright","오빌 라이트"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763295237,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '11e18bc5-9e37-4e26-9241-5470be2921e7'::uuid
),
(
  'aviator-20260922-003',
  'Wilbur Wright / 윌버 라이트',
  'technology',
  'SSS',
  '{"lookup_names":["Wilbur Wright / 윌버 라이트","Wilbur Wright","윌버 라이트"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763295237,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '1b7a05c5-fb65-42ff-898e-cebe1c209c9c'::uuid
),
(
  'aviator-20260922-004',
  'Manfred von Richthofen / 만프레트 폰 리히트호펜',
  'military',
  'SS',
  '{"lookup_names":["Manfred von Richthofen / 만프레트 폰 리히트호펜","Manfred von Richthofen","만프레트 폰 리히트호펜"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763295237,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'a098e80f-f3b9-4aaa-a643-c5d4dc4da1b9'::uuid
),
(
  'aviator-20260922-005',
  'Amelia Earhart / 아멜리아 이어하트',
  'exploration',
  'SS',
  '{"lookup_names":["Amelia Earhart / 아멜리아 이어하트","Amelia Earhart","아멜리아 이어하트"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763295237,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'ff03db30-ac0c-4e16-82e1-dda95245c4ee'::uuid
),
(
  'aviator-20260922-006',
  'Chuck Yeager / 척 예거',
  'technology',
  'SS',
  '{"lookup_names":["Chuck Yeager / 척 예거","Chuck Yeager","척 예거"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763295237,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'biblical-20260925-samson',
  'Samson / 삼손',
  'military',
  NULL,
  '{"lookup_names":["Samson / 삼손","Samson","삼손"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5823984077,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '9ce6a904-0164-4651-aa5b-50ab9a569909'::uuid
),
(
  'cross-20260921-alexander-von-humboldt',
  'Alexander von Humboldt / 알렉산더 폰 훔볼트',
  'knowledge',
  'SSS',
  '{"lookup_names":["Alexander von Humboldt / 알렉산더 폰 훔볼트","Alexander von Humboldt","알렉산더 폰 훔볼트"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761901027,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'cross-20260921-alfred-wegener',
  'Alfred Wegener / 알프레트 베게너',
  'knowledge',
  'SS',
  '{"lookup_names":["Alfred Wegener / 알프레트 베게너","Alfred Wegener","알프레트 베게너"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761908625,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'cross-20260921-carl-linnaeus',
  'Carl Linnaeus / 칼 린네',
  'knowledge',
  'SSS',
  '{"lookup_names":["Carl Linnaeus / 칼 린네","Carl Linnaeus","칼 린네"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761901027,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '6be066f4-cb44-4302-8157-8804b39ede1f'::uuid
),
(
  'cross-20260921-charlie-chaplin',
  'Charlie Chaplin / 찰리 채플린',
  'culture',
  'SSS',
  '{"lookup_names":["Charlie Chaplin / 찰리 채플린","Charlie Chaplin","찰리 채플린"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761901027,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'f8a84918-0637-4d55-96df-eb8d07cd1845'::uuid
),
(
  'cross-20260921-fridtjof-nansen',
  'Fridtjof Nansen / 프리드쇼프 난센',
  'exploration',
  'SS',
  '{"lookup_names":["Fridtjof Nansen / 프리드쇼프 난센","Fridtjof Nansen","프리드쇼프 난센"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761908625,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'cross-20260921-jacques-yves-cousteau',
  'Jacques-Yves Cousteau / 자크이브 쿠스토',
  'exploration',
  'SS',
  '{"lookup_names":["Jacques-Yves Cousteau / 자크이브 쿠스토","Jacques-Yves Cousteau","자크이브 쿠스토"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761908625,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'cross-20260921-marilyn-monroe',
  'Marilyn Monroe / 마릴린 먼로',
  'culture',
  'SS',
  '{"lookup_names":["Marilyn Monroe / 마릴린 먼로","Marilyn Monroe","마릴린 먼로"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761908625,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'cross-20260921-pele',
  'Pelé / 펠레',
  NULL,
  'SSS',
  '{"lookup_names":["Pelé / 펠레","Pelé","펠레"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761901027,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'cross-20260921-pt-barnum',
  'P. T. Barnum / P. T. 바넘',
  'culture',
  'S',
  '{"lookup_names":["P. T. Barnum / P. T. 바넘","P. T. Barnum","P. T. 바넘"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761901027,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'cross-20260921-rachel-carson',
  'Rachel Carson / 레이철 카슨',
  'knowledge',
  'SS',
  '{"lookup_names":["Rachel Carson / 레이철 카슨","Rachel Carson","레이철 카슨"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761901027,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'cross-20260921-sarah-bernhardt',
  'Sarah Bernhardt / 사라 베르나르',
  'culture',
  'SS',
  '{"lookup_names":["Sarah Bernhardt / 사라 베르나르","Sarah Bernhardt","사라 베르나르"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761908625,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'cross-20260921-tenzing-norgay',
  'Tenzing Norgay / 텐징 노르가이',
  'exploration',
  'SS',
  '{"lookup_names":["Tenzing Norgay / 텐징 노르가이","Tenzing Norgay","텐징 노르가이"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761908625,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'cross-20260921-thespis',
  'Thespis / 테스피스',
  'culture',
  'SS',
  '{"lookup_names":["Thespis / 테스피스","Thespis","테스피스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761901027,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'cross-20260921-walt-disney',
  'Walt Disney / 월트 디즈니',
  'culture',
  'SSS',
  '{"lookup_names":["Walt Disney / 월트 디즈니","Walt Disney","월트 디즈니"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761901027,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'b8fae22e-19f3-4565-9feb-cbd27579c8cd'::uuid
),
(
  'faith-20260921-andrew-apostle',
  'Andrew the Apostle / 사도 안드레아',
  'religion',
  'SS',
  '{"lookup_names":["Andrew the Apostle / 사도 안드레아","Andrew the Apostle","사도 안드레아"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763178478,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'faith-20260921-augustine-canterbury',
  'Augustine of Canterbury / 캔터베리의 아우구스티누스',
  'religion',
  'SS',
  '{"lookup_names":["Augustine of Canterbury / 캔터베리의 아우구스티누스","Augustine of Canterbury","캔터베리의 아우구스티누스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763178478,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'faith-20260921-khadija',
  'Khadija bint Khuwaylid / 카디자 빈트 쿠와일리드',
  'religion',
  'SSS',
  '{"lookup_names":["Khadija bint Khuwaylid / 카디자 빈트 쿠와일리드","Khadija bint Khuwaylid","카디자 빈트 쿠와일리드"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763178478,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'faith-20260921-sanghamitta',
  'Sanghamitta / 상가미타',
  'religion',
  'SS',
  '{"lookup_names":["Sanghamitta / 상가미타","Sanghamitta","상가미타"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763178478,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'faith-20260921-xuanzang',
  'Xuanzang / 현장',
  'religion',
  'SSS',
  '{"lookup_names":["Xuanzang / 현장","Xuanzang","현장"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763178478,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '8e3697c3-694d-4feb-aeb8-6a43bef2249f'::uuid
),
(
  'gp-20260921-001',
  'Alexander the Great',
  'governance',
  'SSS',
  '{"lookup_names":["Alexander the Great"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762050073,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'afe59ea0-afac-5c0f-b767-b6aeaa680456'::uuid
),
(
  'gp-20260921-002',
  'Hannibal',
  'military',
  'SSS',
  '{"lookup_names":["Hannibal"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762050073,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-003',
  'Julius Caesar',
  'governance',
  'SSS',
  '{"lookup_names":["Julius Caesar"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762050073,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'df38fe8d-ed21-5d88-9ceb-315fcc1aeb40'::uuid
),
(
  'gp-20260921-004',
  'Sun Tzu',
  'knowledge',
  'SSS',
  '{"lookup_names":["Sun Tzu"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762050073,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-005',
  'Charlemagne',
  'governance',
  'SSS',
  '{"lookup_names":["Charlemagne"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762050073,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '50ba5bb7-0660-5089-ae67-d692cf282b24'::uuid
),
(
  'gp-20260921-006',
  'Genghis Khan',
  'governance',
  'SSS',
  '{"lookup_names":["Genghis Khan"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762050073,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '1bfb0a27-9fa5-5b71-ab1f-d317b76ecf7d'::uuid
),
(
  'gp-20260921-007',
  'Tamerlane',
  'governance',
  'SSS',
  '{"lookup_names":["Tamerlane"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762050073,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-008',
  'Saladin',
  'governance',
  'SSS',
  '{"lookup_names":["Saladin"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762050073,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '54e55076-a03c-5d43-9cb9-40d9953c910c'::uuid
),
(
  'gp-20260921-009',
  'Napoleon Bonaparte',
  'governance',
  'SSS',
  '{"lookup_names":["Napoleon Bonaparte"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762050073,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-010',
  'Frederick the Great',
  'governance',
  'SSS',
  '{"lookup_names":["Frederick the Great"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762050073,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-011',
  'George Washington',
  'governance',
  'SSS',
  '{"lookup_names":["George Washington"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762050073,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '4e8481f3-2317-5e34-a2d5-0a8f181d171c'::uuid
),
(
  'gp-20260921-012',
  'Otto von Bismarck',
  'governance',
  'SSS',
  '{"lookup_names":["Otto von Bismarck"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762050921,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '5401a194-c4e1-57e9-97da-49538d756182'::uuid
),
(
  'gp-20260921-013',
  'Dwight Eisenhower',
  'governance',
  'SSS',
  '{"lookup_names":["Dwight Eisenhower"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762050921,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-014',
  'Pyrrhus',
  'military',
  'SS',
  '{"lookup_names":["Pyrrhus"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762050921,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-015',
  'Scipio Africanus',
  'military',
  'SS',
  '{"lookup_names":["Scipio Africanus"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762050921,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '48886038-9209-425b-b282-76806e74db09'::uuid
),
(
  'gp-20260921-016',
  'Epaminondas',
  'military',
  'SS',
  '{"lookup_names":["Epaminondas"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762050921,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'e2191e4c-d63a-4db4-bfd1-5ad93e6c8ef2'::uuid
),
(
  'gp-20260921-017',
  'Spartacus',
  'military',
  'SS',
  '{"lookup_names":["Spartacus"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762050921,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'e727f13f-f80b-42bd-a482-ef9efd87fdac'::uuid
),
(
  'gp-20260921-018',
  'Belisarius',
  'military',
  'SS',
  '{"lookup_names":["Belisarius"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762050921,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'ef25df7d-4f2c-5ae0-b13b-598d5b2be627'::uuid
),
(
  'gp-20260921-019',
  'William the Conqueror',
  'governance',
  'SS',
  '{"lookup_names":["William the Conqueror"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762050921,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'c879b205-9b52-493b-b0b3-8b1149e56fdd'::uuid
),
(
  'gp-20260921-020',
  'Richard the Lionheart',
  'governance',
  'SS',
  '{"lookup_names":["Richard the Lionheart"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762050921,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-021',
  'Baybars',
  'governance',
  'SS',
  '{"lookup_names":["Baybars"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762050921,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-022',
  'Johann Tserclaes, Count of Tilly',
  'military',
  'SS',
  '{"lookup_names":["Johann Tserclaes, Count of Tilly"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762050921,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-023',
  'Wallenstein',
  'military',
  'SS',
  '{"lookup_names":["Wallenstein"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762051443,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-024',
  'Maurice of Nassau',
  'governance',
  'SS',
  '{"lookup_names":["Maurice of Nassau"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762051443,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '0e77ec0e-5d06-4e4f-83fa-9745d7e48283'::uuid
),
(
  'gp-20260921-025',
  'Don John of Austria',
  'military',
  'SS',
  '{"lookup_names":["Don John of Austria"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762051443,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-026',
  'Álvaro de Bazán',
  'military',
  'SS',
  '{"lookup_names":["Álvaro de Bazán"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762051443,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-027',
  'Duke of Wellington',
  'military',
  'SS',
  '{"lookup_names":["Duke of Wellington"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762051443,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-028',
  'Robert E. Lee',
  'military',
  'SS',
  '{"lookup_names":["Robert E. Lee"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762051443,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-029',
  'Giuseppe Garibaldi',
  'military',
  'SS',
  '{"lookup_names":["Giuseppe Garibaldi"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762051443,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '4755388b-6d6d-40d7-9ab6-9bf3bf28f1c9'::uuid
),
(
  'gp-20260921-030',
  'Ulysses S. Grant',
  'governance',
  'SS',
  '{"lookup_names":["Ulysses S. Grant"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762051443,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'b73e669a-550b-4a43-98a5-f2103de4a92b'::uuid
),
(
  'gp-20260921-031',
  'William Tecumseh Sherman',
  'military',
  'SS',
  '{"lookup_names":["William Tecumseh Sherman"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762051443,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-032',
  'Douglas MacArthur',
  'military',
  'SS',
  '{"lookup_names":["Douglas MacArthur"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762051443,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '8c3f7629-d06d-48c5-8aea-bfb7b9cc285c'::uuid
),
(
  'gp-20260921-033',
  'George Patton',
  'military',
  'SS',
  '{"lookup_names":["George Patton"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762051443,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-034',
  'Erwin Rommel',
  'military',
  'SS',
  '{"lookup_names":["Erwin Rommel"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762052695,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '1539ff3b-f3fc-492d-9828-34874f338eed'::uuid
),
(
  'gp-20260921-035',
  'Bernard Montgomery',
  'military',
  'SS',
  '{"lookup_names":["Bernard Montgomery"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762052695,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-036',
  'Georgy Zhukov',
  'military',
  'SS',
  '{"lookup_names":["Georgy Zhukov"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762052695,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '3ea668dd-8ea8-40df-a8ef-b6d30863e510'::uuid
),
(
  'gp-20260921-037',
  'Yi Sun-sin',
  'military',
  'SSS',
  '{"lookup_names":["Yi Sun-sin"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762052695,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'ea13e48a-94ef-5648-98be-f74554778166'::uuid
),
(
  'gp-20260921-038',
  'Hayreddin Barbarossa',
  'military',
  'SSS',
  '{"lookup_names":["Hayreddin Barbarossa"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762052695,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-039',
  'Horatio Nelson',
  'military',
  'SSS',
  '{"lookup_names":["Horatio Nelson"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762052695,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'ced263ec-ec43-46ee-a1fa-1443ec39477a'::uuid
),
(
  'gp-20260921-040',
  'Henry the Navigator',
  'exploration',
  'SSS',
  '{"lookup_names":["Henry the Navigator"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762052695,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'cf713baa-a70c-519c-aa69-3926f944063c'::uuid
),
(
  'gp-20260921-041',
  'Marcus Vipsanius Agrippa',
  'military',
  'SS',
  '{"lookup_names":["Marcus Vipsanius Agrippa"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762052695,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-042',
  'Roger of Lauria',
  'military',
  'SS',
  '{"lookup_names":["Roger of Lauria"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762052695,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-043',
  'Turgut Reis',
  'military',
  'SS',
  '{"lookup_names":["Turgut Reis"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762052695,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-044',
  'Andrea Doria',
  'military',
  'SS',
  '{"lookup_names":["Andrea Doria"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762052695,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-045',
  'Comte de Grasse',
  'military',
  'SS',
  '{"lookup_names":["Comte de Grasse"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762053271,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-046',
  'Afonso de Albuquerque',
  'military',
  'SS',
  '{"lookup_names":["Afonso de Albuquerque"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762053271,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '1fc8b288-d205-4217-9e81-435c1bf449d2'::uuid
),
(
  'gp-20260921-047',
  'Michiel de Ruyter',
  'military',
  'SS',
  '{"lookup_names":["Michiel de Ruyter"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762053271,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-048',
  'Fyodor Ushakov',
  'military',
  'SS',
  '{"lookup_names":["Fyodor Ushakov"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762053271,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-049',
  'Matthew C. Perry',
  'military',
  'SS',
  '{"lookup_names":["Matthew C. Perry"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762053271,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-050',
  'David Farragut',
  'military',
  'SS',
  '{"lookup_names":["David Farragut"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762053271,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-051',
  'Alfred von Tirpitz',
  'military',
  'SS',
  '{"lookup_names":["Alfred von Tirpitz"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762053271,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-052',
  'Togo Heihachiro',
  'military',
  'SS',
  '{"lookup_names":["Togo Heihachiro"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762053271,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-053',
  'Isoroku Yamamoto',
  'military',
  'SS',
  '{"lookup_names":["Isoroku Yamamoto"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762053271,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-054',
  'Andrew Cunningham',
  'military',
  'SS',
  '{"lookup_names":["Andrew Cunningham"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762053271,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-055',
  'Chester Nimitz',
  'military',
  'SS',
  '{"lookup_names":["Chester Nimitz"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762053271,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-056',
  'Hippocrates',
  'knowledge',
  'SSS',
  '{"lookup_names":["Hippocrates"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762053926,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '2fdc0e4a-e311-42d0-9bc2-8597380dda44'::uuid
),
(
  'gp-20260921-057',
  'Archimedes',
  'knowledge',
  'SSS',
  '{"lookup_names":["Archimedes"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762053926,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'bff150dc-7d25-4248-a17b-14b42e11edfd'::uuid
),
(
  'gp-20260921-058',
  'Ptolemy',
  'knowledge',
  'SSS',
  '{"lookup_names":["Ptolemy"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762053926,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-059',
  'Galen',
  'knowledge',
  'SSS',
  '{"lookup_names":["Galen"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762053926,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'b4acabec-5f13-4826-a291-e5b147c8e888'::uuid
),
(
  'gp-20260921-060',
  'Al-Khwarizmi',
  'knowledge',
  'SSS',
  '{"lookup_names":["Al-Khwarizmi"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762053926,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '27e8ca3b-c6a6-4df8-a7ec-cf2bf8c66b38'::uuid
),
(
  'gp-20260921-061',
  'Ibn al-Haytham',
  'knowledge',
  'SSS',
  '{"lookup_names":["Ibn al-Haytham"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762053926,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '6c659196-ec7f-4ec8-9efe-a5e2e3ae8e8e'::uuid
),
(
  'gp-20260921-062',
  'Aryabhata',
  'knowledge',
  'SSS',
  '{"lookup_names":["Aryabhata"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762053926,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '0094adb0-1d76-4803-a295-623af66e372a'::uuid
),
(
  'gp-20260921-063',
  'Avicenna',
  'knowledge',
  'SSS',
  '{"lookup_names":["Avicenna"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762053926,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-064',
  'Al-Biruni',
  'knowledge',
  'SSS',
  '{"lookup_names":["Al-Biruni"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762053926,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '1e73d444-828b-423b-8ffd-f30651277f47'::uuid
),
(
  'gp-20260921-065',
  'Nicolaus Copernicus',
  'knowledge',
  'SSS',
  '{"lookup_names":["Nicolaus Copernicus"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762053926,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'd2fa20c9-e747-4d25-b3d4-a62d713a9c5f'::uuid
),
(
  'gp-20260921-066',
  'Galileo Galilei',
  'knowledge',
  'SSS',
  '{"lookup_names":["Galileo Galilei"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762053926,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '0a975a8e-e9be-4144-b1a0-3301e8693d85'::uuid
),
(
  'gp-20260921-067',
  'Johannes Kepler',
  'knowledge',
  'SSS',
  '{"lookup_names":["Johannes Kepler"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762054597,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '63d3df96-611d-4703-a8b6-fe0d21065387'::uuid
),
(
  'gp-20260921-068',
  'Leonardo da Vinci',
  'culture',
  'SSS',
  '{"lookup_names":["Leonardo da Vinci"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762054597,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'a565511a-c043-5c88-a2e5-dde042ed8959'::uuid
),
(
  'gp-20260921-069',
  'Andreas Vesalius',
  'knowledge',
  'SSS',
  '{"lookup_names":["Andreas Vesalius"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762054597,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'bebe0e02-d97a-44ef-9c1a-fd5e2d2e9080'::uuid
),
(
  'gp-20260921-070',
  'Antoine Lavoisier',
  'knowledge',
  'SSS',
  '{"lookup_names":["Antoine Lavoisier"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762054597,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'f841000f-2bc6-41a0-9995-2dc19a30da94'::uuid
),
(
  'gp-20260921-072',
  'James Watt',
  'technology',
  'SSS',
  '{"lookup_names":["James Watt"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762054597,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'e0e129b6-84fe-41f5-87c0-bfe5d1ae92f4'::uuid
),
(
  'gp-20260921-073',
  'Michael Faraday',
  'knowledge',
  'SSS',
  '{"lookup_names":["Michael Faraday"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762054597,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'c9260843-643d-4ad2-ba5b-dfed67655cfe'::uuid
),
(
  'gp-20260921-074',
  'Gregor Mendel',
  'knowledge',
  'SSS',
  '{"lookup_names":["Gregor Mendel"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762054597,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'ecede7e0-be63-4a7d-a160-bc42430eb5c1'::uuid
),
(
  'gp-20260921-075',
  'Dmitri Mendeleev',
  'knowledge',
  'SSS',
  '{"lookup_names":["Dmitri Mendeleev"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762054597,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '872a10bf-1779-4cb0-ae8c-ff79471d40c8'::uuid
),
(
  'gp-20260921-076',
  'Louis Pasteur',
  'knowledge',
  'SSS',
  '{"lookup_names":["Louis Pasteur"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762054597,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'e0b2112b-78ae-44b1-80dc-62374673ae59'::uuid
),
(
  'gp-20260921-077',
  'James Clerk Maxwell',
  'knowledge',
  'SSS',
  '{"lookup_names":["James Clerk Maxwell"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762054597,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '01f38546-b212-4642-9b70-a1d903dc6937'::uuid
),
(
  'gp-20260921-078',
  'Marie Curie',
  'knowledge',
  'SSS',
  '{"lookup_names":["Marie Curie"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762054597,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '5b3fc484-77e5-47d6-a57f-9d7477fe76a0'::uuid
),
(
  'gp-20260921-079',
  'Albert Einstein',
  'knowledge',
  'SSS',
  '{"lookup_names":["Albert Einstein"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762055300,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'd2b6be8c-df56-44fe-848d-660fb8f9b89a'::uuid
),
(
  'gp-20260921-080',
  'Niels Bohr',
  'knowledge',
  'SSS',
  '{"lookup_names":["Niels Bohr"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762055300,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '0e20b282-1708-4f15-b979-12deff85d569'::uuid
),
(
  'gp-20260921-081',
  'Enrico Fermi',
  'knowledge',
  'SSS',
  '{"lookup_names":["Enrico Fermi"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762055300,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '70294b4e-18ae-44df-9b07-60252cfda913'::uuid
),
(
  'gp-20260921-082',
  'Werner Heisenberg',
  'knowledge',
  'SSS',
  '{"lookup_names":["Werner Heisenberg"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762055300,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'dccd4b69-294c-4839-90de-8d48180377fa'::uuid
),
(
  'gp-20260921-083',
  'John von Neumann',
  'knowledge',
  'SSS',
  '{"lookup_names":["John von Neumann"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762055300,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'e18b67dc-c89a-4f28-8784-0c0e9c49d63b'::uuid
),
(
  'gp-20260921-084',
  'Alan Turing',
  'knowledge',
  'SSS',
  '{"lookup_names":["Alan Turing"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762055300,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '1aa5257a-3548-41de-b3d0-c461317f51aa'::uuid
),
(
  'gp-20260921-085',
  'Claude Shannon',
  'knowledge',
  'SSS',
  '{"lookup_names":["Claude Shannon"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762055300,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '67e31735-c96f-4c90-a467-77c5653d2e04'::uuid
),
(
  'gp-20260921-086',
  'Hipparchus',
  'knowledge',
  'SS',
  '{"lookup_names":["Hipparchus"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762055300,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-087',
  'Zhang Heng',
  'knowledge',
  'SS',
  '{"lookup_names":["Zhang Heng"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762055300,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-088',
  'Al-Farabi',
  'knowledge',
  'SS',
  '{"lookup_names":["Al-Farabi"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762055300,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '92398f0a-60d9-4781-b04b-2d73c0077cc0'::uuid
),
(
  'gp-20260921-089',
  'Nasir al-Din al-Tusi',
  'knowledge',
  'SS',
  '{"lookup_names":["Nasir al-Din al-Tusi"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762055300,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-090',
  'Al-Zahrawi',
  'knowledge',
  'SS',
  '{"lookup_names":["Al-Zahrawi"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762056047,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-091',
  'Omar Khayyam',
  'knowledge',
  'SS',
  '{"lookup_names":["Omar Khayyam"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762056047,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '75521f03-45cc-4879-969d-84a4de4203bc'::uuid
),
(
  'gp-20260921-092',
  'Tycho Brahe',
  'knowledge',
  'SS',
  '{"lookup_names":["Tycho Brahe"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762056047,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-093',
  'Gerolamo Cardano',
  'knowledge',
  'SS',
  '{"lookup_names":["Gerolamo Cardano"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762056047,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-094',
  'Mikhail Lomonosov',
  'knowledge',
  'SS',
  '{"lookup_names":["Mikhail Lomonosov"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762056047,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-095',
  'Joseph Priestley',
  'knowledge',
  'SS',
  '{"lookup_names":["Joseph Priestley"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762056047,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-096',
  'Richard Feynman',
  'knowledge',
  'SS',
  '{"lookup_names":["Richard Feynman"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762056047,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-097',
  'Francis Crick',
  'knowledge',
  'SS',
  '{"lookup_names":["Francis Crick"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762056047,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '4321da0e-2675-4f79-ab13-823c033d2a70'::uuid
),
(
  'gp-20260921-098',
  'James Watson',
  'knowledge',
  'SS',
  '{"lookup_names":["James Watson"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762056047,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-099',
  'Stephen Hawking',
  'knowledge',
  'SS',
  '{"lookup_names":["Stephen Hawking"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762056047,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-100',
  'Imhotep',
  'technology',
  'SSS',
  '{"lookup_names":["Imhotep"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762056047,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'da0303c2-1faf-40b8-9dc2-1325b77488d7'::uuid
),
(
  'gp-20260921-101',
  'Vitruvius',
  'technology',
  'SSS',
  '{"lookup_names":["Vitruvius"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762056835,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'a9d128fb-7783-4ea2-8393-3db33e1792b2'::uuid
),
(
  'gp-20260921-102',
  'Leonardo Fibonacci',
  'knowledge',
  'SSS',
  '{"lookup_names":["Leonardo Fibonacci"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762056835,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'a9375644-e94f-49fe-b679-53786e6eff06'::uuid
),
(
  'gp-20260921-103',
  'Filippo Brunelleschi',
  'technology',
  'SSS',
  '{"lookup_names":["Filippo Brunelleschi"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762056835,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'c068e2b4-4204-4de6-a448-d191167e594b'::uuid
),
(
  'gp-20260921-104',
  'Gerardus Mercator',
  'knowledge',
  'SSS',
  '{"lookup_names":["Gerardus Mercator"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762056835,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '40c95688-4280-4e7c-a096-a5e356a7181a'::uuid
),
(
  'gp-20260921-105',
  'Andrea Palladio',
  'technology',
  'SSS',
  '{"lookup_names":["Andrea Palladio"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762056835,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '56605c8b-1dc1-42db-bce5-ee8e1c902e7a'::uuid
),
(
  'gp-20260921-106',
  'Blaise Pascal',
  'knowledge',
  'SSS',
  '{"lookup_names":["Blaise Pascal"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762056835,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '00ee8555-9615-4d8a-a434-70b5de15a357'::uuid
),
(
  'gp-20260921-107',
  'Alexander Graham Bell',
  'technology',
  'SSS',
  '{"lookup_names":["Alexander Graham Bell"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762056835,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '3d87d42c-6e42-490d-9135-b0f95aaba55a'::uuid
),
(
  'gp-20260921-108',
  'Thomas Edison',
  'technology',
  'SSS',
  '{"lookup_names":["Thomas Edison"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762056835,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '807aaae1-59f6-4552-8682-29afcb996254'::uuid
),
(
  'gp-20260921-109',
  'Nikola Tesla',
  'technology',
  'SSS',
  '{"lookup_names":["Nikola Tesla"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762056835,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '22131e26-b9f3-4e2e-b5e8-bbe5c0ec9ca2'::uuid
),
(
  'gp-20260921-110',
  'Karl Benz',
  'technology',
  'SSS',
  '{"lookup_names":["Karl Benz"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762056835,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'abf94244-9812-4e4c-b63f-bec4a25b486a'::uuid
),
(
  'gp-20260921-111',
  'Henry Ford',
  'commerce',
  'SSS',
  '{"lookup_names":["Henry Ford"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762056835,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'c3b35168-17a0-4b4b-9468-b46c368ab257'::uuid
),
(
  'gp-20260921-112',
  'Robert Goddard',
  'technology',
  'SSS',
  '{"lookup_names":["Robert Goddard"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762057576,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '04e1166c-32bb-4aca-accf-3400c1a767ee'::uuid
),
(
  'gp-20260921-113',
  'Wernher von Braun',
  'technology',
  'SSS',
  '{"lookup_names":["Wernher von Braun"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762057576,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '1e98d370-753a-462e-a2de-2fc18ca3ccbb'::uuid
),
(
  'gp-20260921-114',
  'Frank Lloyd Wright',
  'technology',
  'SSS',
  '{"lookup_names":["Frank Lloyd Wright"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762057576,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '3a359fe4-8fc4-4772-8ad6-3beef4d0862f'::uuid
),
(
  'gp-20260921-115',
  'Le Corbusier',
  'technology',
  'SSS',
  '{"lookup_names":["Le Corbusier"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762057576,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-116',
  'Apollonius of Perga',
  'knowledge',
  'SS',
  '{"lookup_names":["Apollonius of Perga"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762057576,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-117',
  'Ctesibius',
  'technology',
  'SS',
  '{"lookup_names":["Ctesibius"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762057576,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-118',
  'Hero of Alexandria',
  'technology',
  'SS',
  '{"lookup_names":["Hero of Alexandria"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762057576,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-119',
  'Isidore of Miletus',
  'technology',
  'SS',
  '{"lookup_names":["Isidore of Miletus"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762057576,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-120',
  'Anthemius of Tralles',
  'technology',
  'SS',
  '{"lookup_names":["Anthemius of Tralles"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762057576,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-121',
  'Al-Jazari',
  'technology',
  'SS',
  '{"lookup_names":["Al-Jazari"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762057576,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-122',
  'Yi Xing',
  'knowledge',
  'SS',
  '{"lookup_names":["Yi Xing"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762057576,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-123',
  'Guo Shoujing',
  'knowledge',
  'SS',
  '{"lookup_names":["Guo Shoujing"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762058633,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-124',
  'Christopher Wren',
  'technology',
  'SS',
  '{"lookup_names":["Christopher Wren"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762058633,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-125',
  'Isambard Kingdom Brunel',
  'technology',
  'SS',
  '{"lookup_names":["Isambard Kingdom Brunel"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762058633,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-126',
  'George Stephenson',
  'technology',
  'SS',
  '{"lookup_names":["George Stephenson"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762058633,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'ae5b60cd-0113-4aea-8bc7-facb989fc2bf'::uuid
),
(
  'gp-20260921-127',
  'Eli Whitney',
  'technology',
  'SS',
  '{"lookup_names":["Eli Whitney"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762058633,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-128',
  'Gustave Eiffel',
  'technology',
  'SS',
  '{"lookup_names":["Gustave Eiffel"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762058633,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '51ee3a3e-cb38-4c72-8711-091e77ed0d21'::uuid
),
(
  'gp-20260921-129',
  'Gottlieb Daimler',
  'technology',
  'SS',
  '{"lookup_names":["Gottlieb Daimler"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762058633,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-130',
  'Buckminster Fuller',
  'technology',
  'SS',
  '{"lookup_names":["Buckminster Fuller"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762058633,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-131',
  'Konrad Zuse',
  'technology',
  'SS',
  '{"lookup_names":["Konrad Zuse"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762058633,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-132',
  'Soichiro Honda',
  'technology',
  'SS',
  '{"lookup_names":["Soichiro Honda"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762058633,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-133',
  'Norman Foster',
  'technology',
  'SS',
  '{"lookup_names":["Norman Foster"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762058633,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-134',
  'Zhang Qian',
  'exploration',
  'SSS',
  '{"lookup_names":["Zhang Qian"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762059224,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'deb99909-5476-4de1-ad57-ff9b4bf63001'::uuid
),
(
  'gp-20260921-135',
  'Ibn Battuta',
  'exploration',
  'SSS',
  '{"lookup_names":["Ibn Battuta"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762059224,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '5ea35065-a0b6-5273-bc7b-e3f198b4284b'::uuid
),
(
  'gp-20260921-136',
  'Marco Polo',
  'exploration',
  'SSS',
  '{"lookup_names":["Marco Polo"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762059224,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '9d020dd4-d6c7-4de0-a216-fd1378e65e05'::uuid
),
(
  'gp-20260921-137',
  'Kublai Khan',
  'governance',
  'SSS',
  '{"lookup_names":["Kublai Khan"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762059224,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '7144205f-083f-542e-a946-154c7e0ee048'::uuid
),
(
  'gp-20260921-138',
  'Alfred the Great',
  'governance',
  'SSS',
  '{"lookup_names":["Alfred the Great"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762059224,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'a036421b-7022-41c4-9619-43d7f4c80a1b'::uuid
),
(
  'gp-20260921-139',
  'Lorenzo de'' Medici',
  'governance',
  'SSS',
  '{"lookup_names":["Lorenzo de'' Medici"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762059224,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '3d8a3729-3ac1-4627-9560-7ac4ed05053b'::uuid
),
(
  'gp-20260921-140',
  'John D. Rockefeller',
  'commerce',
  'SSS',
  '{"lookup_names":["John D. Rockefeller"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762059224,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '708ccac7-6dca-409f-8b4e-c12f598a5050'::uuid
),
(
  'gp-20260921-141',
  'J. P. Morgan',
  'commerce',
  'SSS',
  '{"lookup_names":["J. P. Morgan"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762059224,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'f893373c-2b5e-476b-9199-27e7ed92dad9'::uuid
),
(
  'gp-20260921-142',
  'Alyattes of Lydia',
  'governance',
  'SS',
  '{"lookup_names":["Alyattes of Lydia"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762059224,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-143',
  'Marcus Licinius Crassus',
  'governance',
  'SS',
  '{"lookup_names":["Marcus Licinius Crassus"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762059224,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'fa579f86-856e-404e-9ee3-645d32eed7b8'::uuid
),
(
  'gp-20260921-144',
  'John Hawkins',
  NULL,
  'SS',
  '{"lookup_names":["John Hawkins"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762059224,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-145',
  'Jakob Fugger',
  'commerce',
  'SS',
  '{"lookup_names":["Jakob Fugger"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762060075,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'aa816f19-b73e-48a9-9870-ab19f03c066f'::uuid
),
(
  'gp-20260921-146',
  'John Law',
  'commerce',
  'SS',
  '{"lookup_names":["John Law"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762060075,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'e158c5dd-e131-4e64-9b3d-bc6e1c032b3c'::uuid
),
(
  'gp-20260921-147',
  'Cornelius Vanderbilt',
  'commerce',
  'SS',
  '{"lookup_names":["Cornelius Vanderbilt"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762060075,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'e1c41210-a6c4-4979-88f0-b3a06d9e2b73'::uuid
),
(
  'gp-20260921-148',
  'Andrew Carnegie',
  'commerce',
  'SS',
  '{"lookup_names":["Andrew Carnegie"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762060075,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '1cae45a2-e8ea-4daa-a378-3e12084d82fd'::uuid
),
(
  'gp-20260921-149',
  'Werner von Siemens',
  'technology',
  'SS',
  '{"lookup_names":["Werner von Siemens"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762060075,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-150',
  'William Boeing',
  'commerce',
  'SS',
  '{"lookup_names":["William Boeing"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762060075,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp-20260921-151',
  'Ray Kroc',
  'commerce',
  'SS',
  '{"lookup_names":["Ray Kroc"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762060075,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '27b6e7b3-d8cc-42f5-ac7f-3c0a6fa19d2e'::uuid
),
(
  'gp-20260921-152',
  'Ingvar Kamprad',
  'commerce',
  'SS',
  '{"lookup_names":["Ingvar Kamprad"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762060075,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-001',
  'Bartolomeo Cristofori / 바르톨로메오 크리스토포리',
  'technology',
  'SSS',
  '{"lookup_names":["Bartolomeo Cristofori / 바르톨로메오 크리스토포리","Bartolomeo Cristofori","바르톨로메오 크리스토포리"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763367416,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-002',
  'Joseph Marie Jacquard / 조제프 마리 자카르',
  'technology',
  'SSS',
  '{"lookup_names":["Joseph Marie Jacquard / 조제프 마리 자카르","Joseph Marie Jacquard","조제프 마리 자카르"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763367416,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '9a8272f7-5bd4-4cf8-80b1-8fc79d3afdd9'::uuid
),
(
  'gp6-20260922-003',
  'Henry Bessemer / 헨리 베서머',
  'technology',
  'SSS',
  '{"lookup_names":["Henry Bessemer / 헨리 베서머","Henry Bessemer","헨리 베서머"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763367416,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '360882b0-d46b-4515-970a-f368712f6ce9'::uuid
),
(
  'gp6-20260922-004',
  'Norbert Rillieux / 노버트 릴리외',
  'technology',
  'SS',
  '{"lookup_names":["Norbert Rillieux / 노버트 릴리외","Norbert Rillieux","노버트 릴리외"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763367416,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-005',
  'Sakichi Toyoda / 도요다 사키치',
  'technology',
  'SS',
  '{"lookup_names":["Sakichi Toyoda / 도요다 사키치","Sakichi Toyoda","도요다 사키치"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763367416,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-006',
  'Nikolay Dollezhal / 니콜라이 돌레잘',
  'technology',
  'SS',
  '{"lookup_names":["Nikolay Dollezhal / 니콜라이 돌레잘","Nikolay Dollezhal","니콜라이 돌레잘"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763367416,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-007',
  'Gaius Maecenas / 가이우스 마이케나스',
  'culture',
  'SS',
  '{"lookup_names":["Gaius Maecenas / 가이우스 마이케나스","Gaius Maecenas","가이우스 마이케나스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763367416,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-008',
  'Thomas Cook / 토머스 쿡',
  'commerce',
  'SS',
  '{"lookup_names":["Thomas Cook / 토머스 쿡","Thomas Cook","토머스 쿡"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763367416,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-009',
  'Solomon R. Guggenheim / 솔로몬 R. 구겐하임',
  'culture',
  'SS',
  '{"lookup_names":["Solomon R. Guggenheim / 솔로몬 R. 구겐하임","Solomon R. Guggenheim","솔로몬 R. 구겐하임"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763367416,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-010',
  'Satoru Iwata / 이와타 사토루',
  'culture',
  'SS',
  '{"lookup_names":["Satoru Iwata / 이와타 사토루","Satoru Iwata","이와타 사토루"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763367416,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-011',
  'Sun Simiao / 손사막',
  'knowledge',
  'SSS',
  '{"lookup_names":["Sun Simiao / 손사막","Sun Simiao","손사막"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763368019,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-012',
  'Roger Bacon / 로저 베이컨',
  'knowledge',
  'SS',
  '{"lookup_names":["Roger Bacon / 로저 베이컨","Roger Bacon","로저 베이컨"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763368019,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-013',
  'Paracelsus / 파라켈수스',
  'knowledge',
  'SSS',
  '{"lookup_names":["Paracelsus / 파라켈수스","Paracelsus","파라켈수스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763368019,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-014',
  'Edith Clarke / 이디스 클라크',
  'technology',
  'SS',
  '{"lookup_names":["Edith Clarke / 이디스 클라크","Edith Clarke","이디스 클라크"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763368019,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-015',
  'Auguste Piccard / 오귀스트 피카르',
  'exploration',
  'SS',
  '{"lookup_names":["Auguste Piccard / 오귀스트 피카르","Auguste Piccard","오귀스트 피카르"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763368019,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-016',
  'Jagadish Chandra Bose / 자가디시 찬드라 보스',
  'knowledge',
  'SSS',
  '{"lookup_names":["Jagadish Chandra Bose / 자가디시 찬드라 보스","Jagadish Chandra Bose","자가디시 찬드라 보스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763368019,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-017',
  'Lucian / 루키아노스',
  'culture',
  'SS',
  '{"lookup_names":["Lucian / 루키아노스","Lucian","루키아노스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763368019,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-018',
  'Al-Hariri / 알하리리',
  'culture',
  'SS',
  '{"lookup_names":["Al-Hariri / 알하리리","Al-Hariri","알하리리"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763368019,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-019',
  'Chrétien de Troyes / 크레티앵 드 트루아',
  'culture',
  'SSS',
  '{"lookup_names":["Chrétien de Troyes / 크레티앵 드 트루아","Chrétien de Troyes","크레티앵 드 트루아"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763368019,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-020',
  'Jules Verne / 쥘 베른',
  'culture',
  'SSS',
  '{"lookup_names":["Jules Verne / 쥘 베른","Jules Verne","쥘 베른"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763368019,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '92949632-b9e5-4b6b-985e-f5245be4aa1e'::uuid
),
(
  'gp6-20260922-021',
  'Victor Hugo / 빅토르 위고',
  'culture',
  'SSS',
  '{"lookup_names":["Victor Hugo / 빅토르 위고","Victor Hugo","빅토르 위고"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763368515,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '7b56abcb-c2f7-4515-8940-11e0f812493a'::uuid
),
(
  'gp6-20260922-022',
  'Arthur Conan Doyle / 아서 코난 도일',
  'culture',
  'SSS',
  '{"lookup_names":["Arthur Conan Doyle / 아서 코난 도일","Arthur Conan Doyle","아서 코난 도일"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763368515,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'eee4ef8b-9184-41d2-af37-0135fe4e8a5b'::uuid
),
(
  'gp6-20260922-023',
  'Osamu Dazai / 다자이 오사무',
  'culture',
  'SS',
  '{"lookup_names":["Osamu Dazai / 다자이 오사무","Osamu Dazai","다자이 오사무"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763368515,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-024',
  'Umberto Eco / 움베르토 에코',
  'culture',
  'SS',
  '{"lookup_names":["Umberto Eco / 움베르토 에코","Umberto Eco","움베르토 에코"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763368515,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-025',
  'Nicolas Poussin / 니콜라 푸생',
  'culture',
  'SS',
  '{"lookup_names":["Nicolas Poussin / 니콜라 푸생","Nicolas Poussin","니콜라 푸생"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763368515,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-026',
  'Edgar Degas / 에드가 드가',
  'culture',
  'SSS',
  '{"lookup_names":["Edgar Degas / 에드가 드가","Edgar Degas","에드가 드가"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763368515,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'b811a120-602e-4b39-9466-817217072f83'::uuid
),
(
  'gp6-20260922-027',
  'Antonio Canova / 안토니오 카노바',
  'culture',
  'SSS',
  '{"lookup_names":["Antonio Canova / 안토니오 카노바","Antonio Canova","안토니오 카노바"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763368515,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '316d6860-02ed-491d-95ba-9019644a0c4a'::uuid
),
(
  'gp6-20260922-028',
  'Alphonse Mucha / 알폰스 무하',
  'culture',
  'SS',
  '{"lookup_names":["Alphonse Mucha / 알폰스 무하","Alphonse Mucha","알폰스 무하"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763368515,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-029',
  'Amedeo Modigliani / 아메데오 모딜리아니',
  'culture',
  'SS',
  '{"lookup_names":["Amedeo Modigliani / 아메데오 모딜리아니","Amedeo Modigliani","아메데오 모딜리아니"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763368515,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-030',
  'Salvador Dalí / 살바도르 달리',
  'culture',
  'SSS',
  '{"lookup_names":["Salvador Dalí / 살바도르 달리","Salvador Dalí","살바도르 달리"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763368515,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '0d9c44c2-55d0-4df1-9e42-2393e363a90e'::uuid
),
(
  'gp6-20260922-031',
  'Jean-Michel Basquiat / 장미셸 바스키아',
  'culture',
  'SS',
  '{"lookup_names":["Jean-Michel Basquiat / 장미셸 바스키아","Jean-Michel Basquiat","장미셸 바스키아"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763369008,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-032',
  'Barbara Strozzi / 바르바라 스트로치',
  'culture',
  'SS',
  '{"lookup_names":["Barbara Strozzi / 바르바라 스트로치","Barbara Strozzi","바르바라 스트로치"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763369008,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-033',
  'Richard Wagner / 리하르트 바그너',
  'culture',
  'SSS',
  '{"lookup_names":["Richard Wagner / 리하르트 바그너","Richard Wagner","리하르트 바그너"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763369008,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '7dee3870-de39-445c-b52f-5294efd7e5cd'::uuid
),
(
  'gp6-20260922-034',
  'Giacomo Puccini / 자코모 푸치니',
  'culture',
  'SSS',
  '{"lookup_names":["Giacomo Puccini / 자코모 푸치니","Giacomo Puccini","자코모 푸치니"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763369008,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '7518064d-e841-400a-b3ae-1daaa97d8ee7'::uuid
),
(
  'gp6-20260922-035',
  'Steve Reich / 스티브 라이히',
  'culture',
  'SSS',
  '{"lookup_names":["Steve Reich / 스티브 라이히","Steve Reich","스티브 라이히"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763369008,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-036',
  'Iannis Xenakis / 야니스 크세나키스',
  'culture',
  'SS',
  '{"lookup_names":["Iannis Xenakis / 야니스 크세나키스","Iannis Xenakis","야니스 크세나키스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763369008,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-037',
  'Olivier Messiaen / 올리비에 메시앙',
  'culture',
  'SSS',
  '{"lookup_names":["Olivier Messiaen / 올리비에 메시앙","Olivier Messiaen","올리비에 메시앙"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763369008,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gp6-20260922-038',
  'Benjamin Britten / 벤저민 브리튼',
  'culture',
  'SS',
  '{"lookup_names":["Benjamin Britten / 벤저민 브리튼","Benjamin Britten","벤저민 브리튼"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763369008,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-001',
  'Simón Bolívar',
  'governance',
  'SSS',
  '{"lookup_names":["Simón Bolívar"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762363122,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '4c5ed768-0d28-5e13-aa3d-976760d7e4ce'::uuid
),
(
  'gplist3-20260921-002',
  'Abu Bakr',
  NULL,
  'SSS',
  '{"lookup_names":["Abu Bakr"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762363122,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '58d2d31b-f06c-5fab-ac1e-767a2fdcfaea'::uuid
),
(
  'gplist3-20260921-003',
  'Nurhaci',
  'governance',
  'SSS',
  '{"lookup_names":["Nurhaci"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762363122,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '11eef195-4b20-57dc-8d84-c96b9aff77b5'::uuid
),
(
  'gplist3-20260921-004',
  'Tokugawa Ieyasu',
  'governance',
  'SSS',
  '{"lookup_names":["Tokugawa Ieyasu"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762363122,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '308373b7-1bb5-5e02-9e95-a832a875c8a2'::uuid
),
(
  'gplist3-20260921-005',
  'Cyrus the Great',
  'governance',
  'SSS',
  '{"lookup_names":["Cyrus the Great"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762363122,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '4fa88c6e-53cc-5f79-a507-aaf9ef622c7c'::uuid
),
(
  'gplist3-20260921-006',
  'Toussaint Louverture',
  'governance',
  'SSS',
  '{"lookup_names":["Toussaint Louverture"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762363122,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '62f1f824-1ff3-4414-ab04-145bedf3a16b'::uuid
),
(
  'gplist3-20260921-007',
  'Sundiata Keita',
  'governance',
  'SSS',
  '{"lookup_names":["Sundiata Keita"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762363122,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '0846ea83-352e-5822-910c-113ff78924b4'::uuid
),
(
  'gplist3-20260921-008',
  'Gwanggaeto the Great',
  'governance',
  'SSS',
  '{"lookup_names":["Gwanggaeto the Great"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762363122,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '58596fa1-41ed-570f-a0d0-edbb860eb00b'::uuid
),
(
  'gplist3-20260921-009',
  'Kanishka the Great',
  'governance',
  'SSS',
  '{"lookup_names":["Kanishka the Great"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762363122,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-010',
  'John III Sobieski',
  'governance',
  'SS',
  '{"lookup_names":["John III Sobieski"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762363122,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '30207bdd-99b6-4e54-b0e4-046790f0cc35'::uuid
),
(
  'gplist3-20260921-011',
  'János Hunyadi',
  'military',
  'SS',
  '{"lookup_names":["János Hunyadi"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762363122,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-012',
  'Skanderbeg',
  'military',
  'SS',
  '{"lookup_names":["Skanderbeg"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762363568,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '8e32f62c-9b6a-4e52-9290-eef620e86ef2'::uuid
),
(
  'gplist3-20260921-013',
  'Mikhail Kutuzov',
  'military',
  'SS',
  '{"lookup_names":["Mikhail Kutuzov"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762363568,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-014',
  'Trần Hưng Đạo',
  'military',
  'SS',
  '{"lookup_names":["Trần Hưng Đạo"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762363568,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-015',
  'David IV of Georgia',
  'governance',
  'SS',
  '{"lookup_names":["David IV of Georgia"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762363568,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-016',
  'Nguyễn Huệ',
  'governance',
  'SS',
  '{"lookup_names":["Nguyễn Huệ"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762363568,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-017',
  'Jan Žižka',
  'military',
  'SS',
  '{"lookup_names":["Jan Žižka"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762363568,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '6ef0043a-62ab-48de-b718-4ee97fe3de57'::uuid
),
(
  'gplist3-20260921-018',
  'Alp Arslan',
  'governance',
  'SS',
  '{"lookup_names":["Alp Arslan"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762363568,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '2ed08b3a-35fa-4900-8bc5-f42de6306377'::uuid
),
(
  'gplist3-20260921-019',
  'Charles Martel',
  'governance',
  'SS',
  '{"lookup_names":["Charles Martel"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762363568,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'b5f99c81-fc54-41eb-b9bf-a87370d39ed5'::uuid
),
(
  'gplist3-20260921-020',
  'Ranjit Singh',
  'governance',
  'SS',
  '{"lookup_names":["Ranjit Singh"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762363568,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'e0ad9e01-a36f-497c-826d-8873b647519d'::uuid
),
(
  'gplist3-20260921-021',
  'Samudragupta',
  'governance',
  'SS',
  '{"lookup_names":["Samudragupta"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762363568,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-022',
  'Michael the Brave',
  'governance',
  'SS',
  '{"lookup_names":["Michael the Brave"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762363568,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '87e84c67-fba3-46e9-9b00-5addf71e10c0'::uuid
),
(
  'gplist3-20260921-023',
  'Ahmad Shah Durrani',
  'governance',
  'SS',
  '{"lookup_names":["Ahmad Shah Durrani"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762364050,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'cb7af928-16e1-4405-b97d-6a1224901156'::uuid
),
(
  'gplist3-20260921-024',
  'Crazy Horse',
  'military',
  'SS',
  '{"lookup_names":["Crazy Horse"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762364050,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-025',
  'Mahmud of Ghazni',
  'governance',
  'SS',
  '{"lookup_names":["Mahmud of Ghazni"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762364050,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '5a453469-a1dd-4df1-8d0e-a0b98945d324'::uuid
),
(
  'gplist3-20260921-026',
  'Robert Guiscard',
  'military',
  'SS',
  '{"lookup_names":["Robert Guiscard"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762364050,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '253f8bbe-772f-545d-b3c6-a3ee0f2b9958'::uuid
),
(
  'gplist3-20260921-027',
  'Xu Da',
  'military',
  'SS',
  '{"lookup_names":["Xu Da"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762364050,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-028',
  'Arminius',
  'military',
  'SS',
  '{"lookup_names":["Arminius"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762364050,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'c7f384c2-91b3-4582-9624-f26a46e48e98'::uuid
),
(
  'gplist3-20260921-029',
  'Piye',
  'governance',
  'SS',
  '{"lookup_names":["Piye"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762364050,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'c8ac5e56-ab74-4479-878b-24e10b65deec'::uuid
),
(
  'gplist3-20260921-030',
  'Naresuan',
  'governance',
  'SS',
  '{"lookup_names":["Naresuan"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762364050,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-031',
  'Josip Broz Tito',
  'governance',
  'SS',
  '{"lookup_names":["Josip Broz Tito"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762364050,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'd1698f13-2e02-427b-a4a9-33074f0b51ab'::uuid
),
(
  'gplist3-20260921-032',
  'Huayna Capac',
  'governance',
  'SS',
  '{"lookup_names":["Huayna Capac"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762364050,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '5690da8e-a9ca-5a21-a153-a67199e76055'::uuid
),
(
  'gplist3-20260921-033',
  'Öz Beg Khan',
  'governance',
  'SS',
  '{"lookup_names":["Öz Beg Khan"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762364050,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '116af11c-86ba-4869-8a15-fb8fcd033b45'::uuid
),
(
  'gplist3-20260921-034',
  'Amina of Zazzau',
  'governance',
  'SS',
  '{"lookup_names":["Amina of Zazzau"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762364540,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'b733c12c-9b83-43c4-999f-724de3e546cb'::uuid
),
(
  'gplist3-20260921-035',
  'Hayam Wuruk',
  'governance',
  'SS',
  '{"lookup_names":["Hayam Wuruk"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762364540,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-036',
  'Brahmagupta',
  'knowledge',
  'SSS',
  '{"lookup_names":["Brahmagupta"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762364540,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '4c773e19-c309-4af5-aec9-e5d9db999416'::uuid
),
(
  'gplist3-20260921-037',
  'Al-Battani',
  'knowledge',
  'SSS',
  '{"lookup_names":["Al-Battani"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762364540,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'c94d5933-be6b-43e3-a7ca-5f7c9a6b9301'::uuid
),
(
  'gplist3-20260921-038',
  'János Bolyai',
  'knowledge',
  'SSS',
  '{"lookup_names":["János Bolyai"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762364540,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-039',
  'Madhava of Sangamagrama',
  'knowledge',
  'SSS',
  '{"lookup_names":["Madhava of Sangamagrama"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762364540,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '6ad5c0e4-2547-4e3a-86b0-c3b9eaa16b63'::uuid
),
(
  'gplist3-20260921-040',
  'Florence Nightingale',
  'knowledge',
  'SSS',
  '{"lookup_names":["Florence Nightingale"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762364540,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '75114421-92e5-478b-b642-4ed0c509132e'::uuid
),
(
  'gplist3-20260921-041',
  'Pāṇini',
  'knowledge',
  'SSS',
  '{"lookup_names":["Pāṇini"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762364540,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '8461b81c-8b06-440a-a07c-81ba9c4f1615'::uuid
),
(
  'gplist3-20260921-042',
  'Srinivasa Ramanujan',
  'knowledge',
  'SSS',
  '{"lookup_names":["Srinivasa Ramanujan"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762364540,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'd78866ad-a877-4a2a-9226-5cf2f73f5cba'::uuid
),
(
  'gplist3-20260921-043',
  'Stefan Banach',
  'knowledge',
  'SSS',
  '{"lookup_names":["Stefan Banach"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762364540,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '8fa5444d-6e2a-4734-a7d3-739496955a58'::uuid
),
(
  'gplist3-20260921-044',
  'Shiing-Shen Chern',
  'knowledge',
  'SSS',
  '{"lookup_names":["Shiing-Shen Chern"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762364540,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'f28e3e06-1bc3-44c2-8180-813b7ff5ba50'::uuid
),
(
  'gplist3-20260921-045',
  'Chien-Shiung Wu',
  'knowledge',
  'SSS',
  '{"lookup_names":["Chien-Shiung Wu"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762365693,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'b60799c7-4707-42fe-9613-2a2dfb1c960c'::uuid
),
(
  'gplist3-20260921-046',
  'Subrahmanyan Chandrasekhar',
  'knowledge',
  'SSS',
  '{"lookup_names":["Subrahmanyan Chandrasekhar"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762365693,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '015197eb-6ddc-454a-8a70-96425fbc4799'::uuid
),
(
  'gplist3-20260921-047',
  'Qutb al-Din al-Shirazi',
  'knowledge',
  'SS',
  '{"lookup_names":["Qutb al-Din al-Shirazi"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762365693,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-048',
  'Ulugh Beg',
  'knowledge',
  'SS',
  '{"lookup_names":["Ulugh Beg"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762365693,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-049',
  'Leó Szilárd',
  'knowledge',
  'SS',
  '{"lookup_names":["Leó Szilárd"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762365693,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-050',
  'Baudhayana',
  'knowledge',
  'SS',
  '{"lookup_names":["Baudhayana"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762365693,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-051',
  'Seki Takakazu',
  'knowledge',
  'SS',
  '{"lookup_names":["Seki Takakazu"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762365693,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-052',
  'Qin Jiushao',
  'knowledge',
  'SS',
  '{"lookup_names":["Qin Jiushao"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762365693,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-053',
  'Sofya Kovalevskaya',
  'knowledge',
  'SS',
  '{"lookup_names":["Sofya Kovalevskaya"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762365693,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-054',
  'Pei Xiu',
  'knowledge',
  'SS',
  '{"lookup_names":["Pei Xiu"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762365693,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-055',
  'Xu Xiake',
  'exploration',
  'SS',
  '{"lookup_names":["Xu Xiake"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762365693,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-056',
  'G. N. Ramachandran',
  'knowledge',
  'SS',
  '{"lookup_names":["G. N. Ramachandran"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762366173,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-057',
  'Ahmed Zewail',
  'knowledge',
  'SS',
  '{"lookup_names":["Ahmed Zewail"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762366173,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-058',
  'Su Song',
  'technology',
  'SSS',
  '{"lookup_names":["Su Song"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762366173,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '38f194d8-9122-4202-80e4-67d9e5764880'::uuid
),
(
  'gplist3-20260921-059',
  'Mimar Sinan',
  'technology',
  'SSS',
  '{"lookup_names":["Mimar Sinan"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762366173,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '8b65c04d-c02f-4836-b4b0-5d56a923de0f'::uuid
),
(
  'gplist3-20260921-060',
  'Abdus Salam',
  'knowledge',
  'SSS',
  '{"lookup_names":["Abdus Salam"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762366173,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '899c7d6f-5012-4371-be36-14ccb7459b66'::uuid
),
(
  'gplist3-20260921-061',
  'Taqi al-Din ibn Ma''ruf',
  'technology',
  'SS',
  '{"lookup_names":["Taqi al-Din ibn Ma''ruf"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762366173,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-062',
  'M. Visvesvaraya',
  'technology',
  'SS',
  '{"lookup_names":["M. Visvesvaraya"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762366173,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-063',
  'Yu Hao',
  'technology',
  'SS',
  '{"lookup_names":["Yu Hao"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762366173,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-064',
  'Ilya Prigogine',
  'knowledge',
  'SS',
  '{"lookup_names":["Ilya Prigogine"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762366173,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-065',
  'Ximen Bao',
  'technology',
  'SS',
  '{"lookup_names":["Ximen Bao"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762366173,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-066',
  'Muzharul Islam',
  'technology',
  'SS',
  '{"lookup_names":["Muzharul Islam"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762366173,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-067',
  'Tapputi',
  'technology',
  'SS',
  '{"lookup_names":["Tapputi"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762366728,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-068',
  'Taiichi Ohno',
  'technology',
  'SSS',
  '{"lookup_names":["Taiichi Ohno"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762366728,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-069',
  'Mansa Musa',
  'governance',
  'SSS',
  '{"lookup_names":["Mansa Musa"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762366728,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '850aa1f8-9225-55d8-b71e-0995a0c74a8b'::uuid
),
(
  'gplist3-20260921-070',
  'Cosimo de'' Medici',
  'governance',
  'SSS',
  '{"lookup_names":["Cosimo de'' Medici"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762366728,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-071',
  'Shah Abbas I',
  'governance',
  'SSS',
  '{"lookup_names":["Shah Abbas I"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762366728,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-072',
  'Muhammad Yunus',
  'commerce',
  'SS',
  '{"lookup_names":["Muhammad Yunus"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762366728,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-073',
  'Osman Ali Khan',
  'governance',
  'SS',
  '{"lookup_names":["Osman Ali Khan"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762366728,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-074',
  'Simón Iturri Patiño',
  'commerce',
  'SS',
  '{"lookup_names":["Simón Iturri Patiño"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762366728,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-075',
  'Thomas Gresham',
  'commerce',
  'SS',
  '{"lookup_names":["Thomas Gresham"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762366728,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'e8af92fc-cd04-44f4-a4c8-7ead4aab7c86'::uuid
),
(
  'gplist3-20260921-076',
  'Osei Tutu',
  'governance',
  'SS',
  '{"lookup_names":["Osei Tutu"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762366728,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-077',
  'Nathan Mayer Rothschild',
  'commerce',
  'SS',
  '{"lookup_names":["Nathan Mayer Rothschild"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762366728,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '090e745d-6bb1-493e-ab57-465d03aba67c'::uuid
),
(
  'gplist3-20260921-078',
  'Howqua (Wu Bingjian)',
  'commerce',
  'SS',
  '{"lookup_names":["Howqua (Wu Bingjian)","Wu Bingjian","Howqua","Howqua (Wu Bingjian"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762367245,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '34395d7c-d501-48d5-8d08-1429024a1692'::uuid
),
(
  'gplist3-20260921-079',
  'Cecil Rhodes',
  'commerce',
  'SS',
  '{"lookup_names":["Cecil Rhodes"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762367245,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '49e6b8cf-2322-44d8-a79e-892026b14211'::uuid
),
(
  'gplist3-20260921-080',
  'T. V. Soong',
  'commerce',
  'SS',
  '{"lookup_names":["T. V. Soong"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762367245,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-081',
  'Tippu Tip',
  'commerce',
  'SS',
  '{"lookup_names":["Tippu Tip"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762367245,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'cedd1d70-6aad-44a8-8f76-04c92759a5fc'::uuid
),
(
  'gplist3-20260921-082',
  'Tunka Manin',
  'governance',
  'SS',
  '{"lookup_names":["Tunka Manin"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762367245,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-083',
  'Pytheas',
  'exploration',
  'SSS',
  '{"lookup_names":["Pytheas"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762367245,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-084',
  'George of Antioch',
  'military',
  'SS',
  '{"lookup_names":["George of Antioch"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762367245,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-085',
  'Kanhoji Angre',
  'military',
  'SS',
  '{"lookup_names":["Kanhoji Angre"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762367245,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-086',
  'Ngô Quyền',
  'governance',
  'SS',
  '{"lookup_names":["Ngô Quyền"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762367245,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-087',
  'Hong Bao',
  'exploration',
  'SS',
  '{"lookup_names":["Hong Bao"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762367245,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'gplist3-20260921-088',
  'Wang Dayuan',
  'exploration',
  'SS',
  '{"lookup_names":["Wang Dayuan"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762367245,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'greatspy-20260924-001',
  'Francis Walsingham / 프랜시스 월싱엄',
  'governance',
  'USER_SELECTED_SS_OR_HIGHER',
  '{"lookup_names":["Francis Walsingham / 프랜시스 월싱엄","Francis Walsingham","프랜시스 월싱엄"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815992727,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'greatspy-20260924-002',
  'J. Edgar Hoover / J. 에드거 후버',
  'governance',
  'USER_SELECTED_SS_OR_HIGHER',
  '{"lookup_names":["J. Edgar Hoover / J. 에드거 후버","J. Edgar Hoover","J. 에드거 후버"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815992727,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'greatspy-20260924-003',
  'William J. Donovan / 윌리엄 J. 도노반',
  'governance',
  'USER_SELECTED_SS_OR_HIGHER',
  '{"lookup_names":["William J. Donovan / 윌리엄 J. 도노반","William J. Donovan","윌리엄 J. 도노반"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815992727,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'greatspy-20260924-004',
  'Hattori Hanzō / 핫토리 한조',
  'military',
  'USER_SELECTED_SS_OR_HIGHER',
  '{"lookup_names":["Hattori Hanzō / 핫토리 한조","Hattori Hanzō","핫토리 한조"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815992727,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'greatspy-20260924-005',
  'Guy Fawkes / 가이 포크스',
  'governance',
  'USER_SELECTED_SS_OR_HIGHER',
  '{"lookup_names":["Guy Fawkes / 가이 포크스","Guy Fawkes","가이 포크스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815992727,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'greatspy-20260924-006',
  'Nathan Hale / 나단 헤일',
  'military',
  'USER_SELECTED_SS_OR_HIGHER',
  '{"lookup_names":["Nathan Hale / 나단 헤일","Nathan Hale","나단 헤일"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815992727,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'greatspy-20260924-007',
  'Charlotte Corday / 샤를로트 코르데',
  'governance',
  'USER_SELECTED_SS_OR_HIGHER',
  '{"lookup_names":["Charlotte Corday / 샤를로트 코르데","Charlotte Corday","샤를로트 코르데"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815992727,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'greatspy-20260924-008',
  'Allan Pinkerton / 앨런 핑커톤',
  'commerce',
  'USER_SELECTED_SS_OR_HIGHER',
  '{"lookup_names":["Allan Pinkerton / 앨런 핑커톤","Allan Pinkerton","앨런 핑커톤"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815993620,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '1b161e34-ba2e-4943-9a70-07c0a32478e7'::uuid
),
(
  'greatspy-20260924-009',
  'William Melville / 윌리엄 멜빌',
  'governance',
  'USER_SELECTED_SS_OR_HIGHER',
  '{"lookup_names":["William Melville / 윌리엄 멜빌","William Melville","윌리엄 멜빌"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815993620,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'greatspy-20260924-010',
  'Mata Hari / 마타 하리',
  'culture',
  'USER_SELECTED_SS_OR_HIGHER',
  '{"lookup_names":["Mata Hari / 마타 하리","Mata Hari","마타 하리"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815993620,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'greatspy-20260924-011',
  'Julius Rosenberg / 줄리어스 로젠버그',
  'governance',
  'USER_SELECTED_SS_OR_HIGHER',
  '{"lookup_names":["Julius Rosenberg / 줄리어스 로젠버그","Julius Rosenberg","줄리어스 로젠버그"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815993620,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'ace071bf-feab-44aa-92a6-3fca50a93303'::uuid
),
(
  'greatspy-20260924-012',
  'Ethel Rosenberg / 에셀 로젠버그',
  'governance',
  'USER_SELECTED_SS_OR_HIGHER',
  '{"lookup_names":["Ethel Rosenberg / 에셀 로젠버그","Ethel Rosenberg","에셀 로젠버그"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815993620,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'greatspy-20260924-013',
  'Claus von Stauffenberg / 클라우스 폰 슈타우펜베르크',
  'military',
  'USER_SELECTED_SS_OR_HIGHER',
  '{"lookup_names":["Claus von Stauffenberg / 클라우스 폰 슈타우펜베르크","Claus von Stauffenberg","클라우스 폰 슈타우펜베르크"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815993620,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '7f52b3c5-60c7-46df-84a1-98fc50c26e40'::uuid
),
(
  'hist-20260921-al-masudi',
  'Al-Masudi / 알마수디',
  'knowledge',
  'SS',
  '{"lookup_names":["Al-Masudi / 알마수디","Al-Masudi","알마수디"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761766994,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '64a73852-6d78-4682-a8cb-48680fc39cf2'::uuid
),
(
  'hist-20260921-al-tabari',
  'Al-Tabari / 알타바리',
  'knowledge',
  'SSS',
  '{"lookup_names":["Al-Tabari / 알타바리","Al-Tabari","알타바리"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761699398,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '632d77e3-8f1a-41fe-9aeb-646d2d7edd62'::uuid
),
(
  'hist-20260921-edward-gibbon',
  'Edward Gibbon / 에드워드 기번',
  'knowledge',
  'SSS',
  '{"lookup_names":["Edward Gibbon / 에드워드 기번","Edward Gibbon","에드워드 기번"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761699398,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '75621c54-8bcd-4853-9c8a-ee2ff8be8655'::uuid
),
(
  'hist-20260921-fernand-braudel',
  'Fernand Braudel / 페르낭 브로델',
  'knowledge',
  'SSS',
  '{"lookup_names":["Fernand Braudel / 페르낭 브로델","Fernand Braudel","페르낭 브로델"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761766994,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'hist-20260921-herodotus',
  'Herodotus / 헤로도토스',
  'knowledge',
  'SSS',
  '{"lookup_names":["Herodotus / 헤로도토스","Herodotus","헤로도토스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761699398,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '1003bb71-cd8f-4b3f-a006-5c22a7e87f7c'::uuid
),
(
  'hist-20260921-ibn-khaldun',
  'Ibn Khaldun / 이븐 할둔',
  'knowledge',
  'SSS',
  '{"lookup_names":["Ibn Khaldun / 이븐 할둔","Ibn Khaldun","이븐 할둔"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761699398,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'abc01682-4ad1-43bf-a5d9-d665140daf3b'::uuid
),
(
  'hist-20260921-josephus',
  'Josephus / 요세푸스',
  'knowledge',
  'SS',
  '{"lookup_names":["Josephus / 요세푸스","Josephus","요세푸스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761766994,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'hist-20260921-leon-battista-alberti',
  'Leon Battista Alberti / 레온 바티스타 알베르티',
  NULL,
  'SS',
  '{"lookup_names":["Leon Battista Alberti / 레온 바티스타 알베르티","Leon Battista Alberti","레온 바티스타 알베르티"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761766994,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'hist-20260921-leopold-von-ranke',
  'Leopold von Ranke / 레오폴트 폰 랑케',
  'knowledge',
  'SSS',
  '{"lookup_names":["Leopold von Ranke / 레오폴트 폰 랑케","Leopold von Ranke","레오폴트 폰 랑케"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761766994,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '725dd4b5-7c80-4d54-ae01-18034fe6c2c3'::uuid
),
(
  'hist-20260921-livy',
  'Livy / 리비우스',
  'knowledge',
  'SSS',
  '{"lookup_names":["Livy / 리비우스","Livy","리비우스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761699398,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '6de1758f-807a-4e66-8099-85dd41ca86e6'::uuid
),
(
  'hist-20260921-pliny-elder',
  'Pliny the Elder / 대 플리니우스',
  'knowledge',
  'SS',
  '{"lookup_names":["Pliny the Elder / 대 플리니우스","Pliny the Elder","대 플리니우스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761766994,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'hist-20260921-polybius',
  'Polybius / 폴리비오스',
  'knowledge',
  'SSS',
  '{"lookup_names":["Polybius / 폴리비오스","Polybius","폴리비오스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761908625,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'hist-20260921-procopius',
  'Procopius / 프로코피우스',
  'knowledge',
  'SS',
  '{"lookup_names":["Procopius / 프로코피우스","Procopius","프로코피우스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761766994,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'hist-20260921-sima-qian',
  'Sima Qian / 사마천',
  'knowledge',
  'SSS',
  '{"lookup_names":["Sima Qian / 사마천","Sima Qian","사마천"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761699398,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '3e44d918-378d-4f6e-b098-6f1724028337'::uuid
),
(
  'hist-20260921-tacitus',
  'Tacitus / 타키투스',
  'knowledge',
  'SSS',
  '{"lookup_names":["Tacitus / 타키투스","Tacitus","타키투스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761908625,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'e7d1e88e-b062-465b-b5bd-bec3f2220d42'::uuid
),
(
  'hist-20260921-thucydides',
  'Thucydides / 투키디데스',
  'knowledge',
  'SSS',
  '{"lookup_names":["Thucydides / 투키디데스","Thucydides","투키디데스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5761699398,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'b380122b-4ce0-4e81-ba79-18d454a1ba5c'::uuid
),
(
  'mixed5-20260921-001',
  'Phidias',
  'culture',
  'SSS',
  '{"lookup_names":["Phidias"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762577324,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '4089c029-e224-4b4e-ad68-ca4fdcee6ddb'::uuid
),
(
  'mixed5-20260921-002',
  'Jean-Jacques Rousseau',
  'knowledge',
  'SSS',
  '{"lookup_names":["Jean-Jacques Rousseau"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762577324,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'add62f50-5dfe-4b74-b8cb-9af003f859b2'::uuid
),
(
  'mixed5-20260921-003',
  'Averroes',
  'knowledge',
  'SSS',
  '{"lookup_names":["Averroes"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762577324,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'mixed5-20260921-004',
  'Khalid ibn al-Walid',
  'military',
  'SSS',
  '{"lookup_names":["Khalid ibn al-Walid"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762577324,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '54583770-280a-4ec1-81db-24729ed842ab'::uuid
),
(
  'mixed5-20260921-005',
  'Cai Lun',
  'technology',
  'SSS',
  '{"lookup_names":["Cai Lun"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762577324,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'bbd13869-4ebb-4be6-8721-3a5ec6136422'::uuid
),
(
  'mixed5-20260921-006',
  'Eugene P. Odum',
  'knowledge',
  'SSS',
  '{"lookup_names":["Eugene P. Odum"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762577324,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'mixed5-20260921-007',
  'Jane Goodall',
  'knowledge',
  'SSS',
  '{"lookup_names":["Jane Goodall"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762577324,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'mixed5-20260921-008',
  'Elvis Presley',
  'culture',
  'SSS',
  '{"lookup_names":["Elvis Presley"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762577324,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '7526594e-5ae7-466d-811e-aee445616ecd'::uuid
),
(
  'mixed5-20260921-009',
  'Louis Armstrong',
  'culture',
  'SSS',
  '{"lookup_names":["Louis Armstrong"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762577324,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'e9d538a5-b6c4-4add-9c26-eb7bee0ca5e9'::uuid
),
(
  'mixed5-20260921-010',
  'John Williams',
  'culture',
  'SSS',
  '{"lookup_names":["John Williams"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762577324,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'mixed5-20260921-011',
  'Michael Jackson',
  'culture',
  'SSS',
  '{"lookup_names":["Michael Jackson"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762577324,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '89bf99d9-1a09-46ba-a302-8c80a5b118ae'::uuid
),
(
  'mixed5-20260921-012',
  'Hugues de Payens',
  'religion',
  'SS',
  '{"lookup_names":["Hugues de Payens"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762577836,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'mixed5-20260921-013',
  'Francesco Bartolomeo Rastrelli',
  'culture',
  'SS',
  '{"lookup_names":["Francesco Bartolomeo Rastrelli"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762577836,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'mixed5-20260921-014',
  'Alberto Santos-Dumont',
  'technology',
  'SS',
  '{"lookup_names":["Alberto Santos-Dumont"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762577836,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'mixed5-20260921-015',
  'Giacomo Casanova',
  'culture',
  'SS',
  '{"lookup_names":["Giacomo Casanova"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762577836,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'mixed5-20260921-016',
  'Li Daoyuan',
  'knowledge',
  'SS',
  '{"lookup_names":["Li Daoyuan"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762577836,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'mixed5-20260921-017',
  'René Antoine Ferchault de Réaumur',
  'knowledge',
  'SS',
  '{"lookup_names":["René Antoine Ferchault de Réaumur"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762577836,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'mixed5-20260921-018',
  'John Muir',
  'knowledge',
  'SS',
  '{"lookup_names":["John Muir"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762577836,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'mixed5-20260921-019',
  'Jean-Henri Fabre',
  'knowledge',
  'SS',
  '{"lookup_names":["Jean-Henri Fabre"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762577836,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'mixed5-20260921-020',
  'Karl von Frisch',
  'knowledge',
  'SS',
  '{"lookup_names":["Karl von Frisch"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762577836,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'mixed5-20260921-021',
  'Konrad Lorenz',
  'knowledge',
  'SS',
  '{"lookup_names":["Konrad Lorenz"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762577836,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'mixed5-20260921-022',
  'Charles Sutherland Elton',
  'knowledge',
  'SS',
  '{"lookup_names":["Charles Sutherland Elton"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762577836,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'modern-20260921-ada-lovelace',
  'Ada Lovelace / 에이다 러브레이스',
  'knowledge',
  'SSS',
  '{"lookup_names":["Ada Lovelace / 에이다 러브레이스","Ada Lovelace","에이다 러브레이스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762189009,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '928045d7-e218-543d-9df8-9b96c8f65781'::uuid
),
(
  'modern-20260921-alexander-fleming',
  'Alexander Fleming / 알렉산더 플레밍',
  'knowledge',
  'SSS',
  '{"lookup_names":["Alexander Fleming / 알렉산더 플레밍","Alexander Fleming","알렉산더 플레밍"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762189009,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '201df059-fd64-4006-a479-281fdb141244'::uuid
),
(
  'modern-20260921-alfred-russel-wallace',
  'Alfred Russel Wallace / 앨프리드 러셀 월리스',
  'knowledge',
  'SSS',
  '{"lookup_names":["Alfred Russel Wallace / 앨프리드 러셀 월리스","Alfred Russel Wallace","앨프리드 러셀 월리스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762189009,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '5c9d4d8e-1d2d-44d1-b73c-d1343606b32b'::uuid
),
(
  'modern-20260921-arthur-c-clarke',
  'Arthur C. Clarke / 아서 C. 클라크',
  'culture',
  'SSS',
  '{"lookup_names":["Arthur C. Clarke / 아서 C. 클라크","Arthur C. Clarke","아서 C. 클라크"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762188477,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'd89db567-f059-4ef4-9529-34892e2fafce'::uuid
),
(
  'modern-20260921-arthur-sullivan',
  'Arthur Sullivan / 아서 설리번',
  'culture',
  'SS',
  '{"lookup_names":["Arthur Sullivan / 아서 설리번","Arthur Sullivan","아서 설리번"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762190336,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'modern-20260921-bill-gates',
  'Bill Gates / 빌 게이츠',
  'commerce',
  'SSS',
  '{"lookup_names":["Bill Gates / 빌 게이츠","Bill Gates","빌 게이츠"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762189009,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'modern-20260921-douglas-adams',
  'Douglas Adams / 더글러스 애덤스',
  'culture',
  'SS',
  '{"lookup_names":["Douglas Adams / 더글러스 애덤스","Douglas Adams","더글러스 애덤스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762189664,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'modern-20260921-elizabeth-barrett-browning',
  'Elizabeth Barrett Browning / 엘리자베스 배럿 브라우닝',
  'culture',
  'SS',
  '{"lookup_names":["Elizabeth Barrett Browning / 엘리자베스 배럿 브라우닝","Elizabeth Barrett Browning","엘리자베스 배럿 브라우닝"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762190336,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'modern-20260921-freddie-mercury',
  'Freddie Mercury / 프레디 머큐리',
  'culture',
  'SS',
  '{"lookup_names":["Freddie Mercury / 프레디 머큐리","Freddie Mercury","프레디 머큐리"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762190336,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'modern-20260921-frederick-banting',
  'Frederick Banting / 프레더릭 밴팅',
  'knowledge',
  'SSS',
  '{"lookup_names":["Frederick Banting / 프레더릭 밴팅","Frederick Banting","프레더릭 밴팅"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762188477,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'd3a55a20-50cb-4444-b03a-5c1e3b253df9'::uuid
),
(
  'modern-20260921-gabe-newell',
  'Gabe Newell / 게이브 뉴웰',
  'commerce',
  'SS',
  '{"lookup_names":["Gabe Newell / 게이브 뉴웰","Gabe Newell","게이브 뉴웰"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762189664,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'modern-20260921-george-lucas',
  'George Lucas / 조지 루커스',
  'culture',
  'SSS',
  '{"lookup_names":["George Lucas / 조지 루커스","George Lucas","조지 루커스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762189009,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'modern-20260921-george-orwell',
  'George Orwell / 조지 오웰',
  'culture',
  'SSS',
  '{"lookup_names":["George Orwell / 조지 오웰","George Orwell","조지 오웰"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762188477,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'f538fff4-9658-496b-b807-8bcad963bcbd'::uuid
),
(
  'modern-20260921-george-sand',
  'George Sand / 조르주 상드',
  'culture',
  'SS',
  '{"lookup_names":["George Sand / 조르주 상드","George Sand","조르주 상드"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762190336,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'modern-20260921-hildegard',
  'Hildegard von Bingen / 힐데가르트 폰 빙엔',
  'religion',
  'SSS',
  '{"lookup_names":["Hildegard von Bingen / 힐데가르트 폰 빙엔","Hildegard von Bingen","힐데가르트 폰 빙엔"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762189664,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '877f7ced-02dc-4efc-884b-5f77f1cde161'::uuid
),
(
  'modern-20260921-hp-lovecraft',
  'H. P. Lovecraft / H. P. 러브크래프트',
  'culture',
  'SS',
  '{"lookup_names":["H. P. Lovecraft / H. P. 러브크래프트","H. P. Lovecraft","H. P. 러브크래프트"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762189664,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'modern-20260921-hrotsvitha',
  'Hrotsvitha of Gandersheim / 흐로츠비타',
  'culture',
  'SS',
  '{"lookup_names":["Hrotsvitha of Gandersheim / 흐로츠비타","Hrotsvitha of Gandersheim","흐로츠비타"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762190336,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'modern-20260921-isaac-asimov',
  'Isaac Asimov / 아이작 아시모프',
  'culture',
  'SSS',
  '{"lookup_names":["Isaac Asimov / 아이작 아시모프","Isaac Asimov","아이작 아시모프"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762188477,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '3a5f0856-8d8b-446a-9e59-379344f8d5ee'::uuid
),
(
  'modern-20260921-john-carmack',
  'John Carmack / 존 카맥',
  'technology',
  'SSS',
  '{"lookup_names":["John Carmack / 존 카맥","John Carmack","존 카맥"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762188477,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'modern-20260921-john-romero',
  'John Romero / 존 로메로',
  'culture',
  'SS',
  '{"lookup_names":["John Romero / 존 로메로","John Romero","존 로메로"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762189664,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'modern-20260921-jrr-tolkien',
  'J. R. R. Tolkien / J. R. R. 톨킨',
  'culture',
  'SSS',
  '{"lookup_names":["J. R. R. Tolkien / J. R. R. 톨킨","J. R. R. Tolkien","J. R. R. 톨킨"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762188477,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'b9bf1082-34e6-4337-bd35-0ec5778123a0'::uuid
),
(
  'modern-20260921-louisa-may-alcott',
  'Louisa May Alcott / 루이자 메이 올컷',
  'culture',
  'SS',
  '{"lookup_names":["Louisa May Alcott / 루이자 메이 올컷","Louisa May Alcott","루이자 메이 올컷"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762190336,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'modern-20260921-marie-de-france',
  'Marie de France / 마리 드 프랑스',
  'culture',
  'SS',
  '{"lookup_names":["Marie de France / 마리 드 프랑스","Marie de France","마리 드 프랑스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762190336,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'modern-20260921-mark-zuckerberg',
  'Mark Zuckerberg / 마크 저커버그',
  'commerce',
  'SSS',
  '{"lookup_names":["Mark Zuckerberg / 마크 저커버그","Mark Zuckerberg","마크 저커버그"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762189009,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'modern-20260921-otto-hahn',
  'Otto Hahn / 오토 한',
  'knowledge',
  'SSS',
  '{"lookup_names":["Otto Hahn / 오토 한","Otto Hahn","오토 한"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762189009,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'modern-20260921-paul-dirac',
  'Paul Dirac / 폴 디랙',
  'knowledge',
  'SSS',
  '{"lookup_names":["Paul Dirac / 폴 디랙","Paul Dirac","폴 디랙"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762189009,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'c3586f40-8c6d-4d97-a818-da00dc57b22a'::uuid
),
(
  'modern-20260921-pythagoras',
  'Pythagoras / 피타고라스',
  'knowledge',
  'SSS',
  '{"lookup_names":["Pythagoras / 피타고라스","Pythagoras","피타고라스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762189009,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '87b9541e-cc28-46ca-a849-43a5a14ae162'::uuid
),
(
  'modern-20260921-robert-heinlein',
  'Robert A. Heinlein / 로버트 A. 하인라인',
  'culture',
  'SS',
  '{"lookup_names":["Robert A. Heinlein / 로버트 A. 하인라인","Robert A. Heinlein","로버트 A. 하인라인"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762189664,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'modern-20260921-sappho',
  'Sappho / 사포',
  'culture',
  'SSS',
  '{"lookup_names":["Sappho / 사포","Sappho","사포"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762189664,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '4c199de4-62c0-4515-afd6-b941e9bc5124'::uuid
),
(
  'modern-20260921-satoshi-tajiri',
  'Satoshi Tajiri / 타지리 사토시',
  'culture',
  'SSS',
  '{"lookup_names":["Satoshi Tajiri / 타지리 사토시","Satoshi Tajiri","타지리 사토시"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762188477,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'modern-20260921-shigeru-miyamoto',
  'Shigeru Miyamoto / 미야모토 시게루',
  'culture',
  'SSS',
  '{"lookup_names":["Shigeru Miyamoto / 미야모토 시게루","Shigeru Miyamoto","미야모토 시게루"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762188477,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'modern-20260921-steven-spielberg',
  'Steven Spielberg / 스티븐 스필버그',
  'culture',
  'SSS',
  '{"lookup_names":["Steven Spielberg / 스티븐 스필버그","Steven Spielberg","스티븐 스필버그"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762189664,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'modern-20260921-terry-pratchett',
  'Terry Pratchett / 테리 프래쳇',
  'culture',
  'SS',
  '{"lookup_names":["Terry Pratchett / 테리 프래쳇","Terry Pratchett","테리 프래쳇"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762189664,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'modern-20260921-vincent-van-gogh',
  'Vincent van Gogh / 빈센트 반 고흐',
  'culture',
  'SSS',
  '{"lookup_names":["Vincent van Gogh / 빈센트 반 고흐","Vincent van Gogh","빈센트 반 고흐"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762188477,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '7763a315-4385-404b-b0d6-92a074a2aa27'::uuid
),
(
  'modern-20260921-ws-gilbert',
  'W. S. Gilbert / W. S. 길버트',
  'culture',
  'SS',
  '{"lookup_names":["W. S. Gilbert / W. S. 길버트","W. S. Gilbert","W. S. 길버트"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762190336,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'omitted-20260921-ihara-saikaku',
  'Ihara Saikaku / 이하라 사이카쿠',
  'culture',
  'SS',
  '{"lookup_names":["Ihara Saikaku / 이하라 사이카쿠","Ihara Saikaku","이하라 사이카쿠"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762924321,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'omitted-20260921-jing-ke',
  'Jing Ke / 형가',
  'military',
  'SS',
  '{"lookup_names":["Jing Ke / 형가","Jing Ke","형가"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762924321,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'omitted-20260921-rk-narayan',
  'R. K. Narayan / R. K. 나라얀',
  'culture',
  'SS',
  '{"lookup_names":["R. K. Narayan / R. K. 나라얀","R. K. Narayan","R. K. 나라얀"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762924321,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'omitted-20260921-thich-nhat-hanh',
  'Thích Nhất Hạnh / 틱낫한',
  'religion',
  'SS',
  '{"lookup_names":["Thích Nhất Hạnh / 틱낫한","Thích Nhất Hạnh","틱낫한"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762924321,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'omitted-20260921-yajnavalkya',
  'Yājñavalkya / 야즈냐발키야',
  'knowledge',
  'SSS',
  '{"lookup_names":["Yājñavalkya / 야즈냐발키야","Yājñavalkya","야즈냐발키야"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762924321,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '249a4aea-a45d-4249-b0c7-74574ba72b0f'::uuid
),
(
  'omitted-20260921-zera-yacob',
  'Zera Yacob / 제라 야코브',
  'knowledge',
  'SS',
  '{"lookup_names":["Zera Yacob / 제라 야코브","Zera Yacob","제라 야코브"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762924321,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'philosophy-20260922-001',
  'Plato / 플라톤',
  'knowledge',
  'SSS',
  '{"lookup_names":["Plato / 플라톤","Plato","플라톤"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763224562,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '798a4946-16ef-5a4b-a7bb-80934250bb90'::uuid
),
(
  'philosophy-20260922-002',
  'Aristotle / 아리스토텔레스',
  'knowledge',
  'SSS',
  '{"lookup_names":["Aristotle / 아리스토텔레스","Aristotle","아리스토텔레스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763224562,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '1ee551fc-6ad7-4c2f-80d4-5bbeb526132f'::uuid
),
(
  'philosophy-20260922-003',
  'Mozi / 묵자',
  'knowledge',
  'SSS',
  '{"lookup_names":["Mozi / 묵자","Mozi","묵자"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763224562,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '6b384004-05a4-4bfd-b959-db12283fd122'::uuid
),
(
  'philosophy-20260922-004',
  'Dharmakīrti / 법칭',
  'knowledge',
  'SS',
  '{"lookup_names":["Dharmakīrti / 법칭","Dharmakīrti","법칭"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763224562,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'c98582af-bf05-430c-b675-630d20445c25'::uuid
),
(
  'philosophy-20260922-005',
  'Socrates / 소크라테스',
  'knowledge',
  'SSS',
  '{"lookup_names":["Socrates / 소크라테스","Socrates","소크라테스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763224562,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '7c1ee280-92f3-4fe7-8e1f-cf9a4f18eca8'::uuid
),
(
  'philosophy-20260922-006',
  'Duns Scotus / 둔스 스코투스',
  'knowledge',
  'SSS',
  '{"lookup_names":["Duns Scotus / 둔스 스코투스","Duns Scotus","둔스 스코투스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763224562,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'philosophy-20260922-007',
  'Nicole Oresme / 니콜 오렘',
  'knowledge',
  'SS',
  '{"lookup_names":["Nicole Oresme / 니콜 오렘","Nicole Oresme","니콜 오렘"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763224562,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'philosophy-20260922-008',
  'William of Ockham / 오컴의 윌리엄',
  'knowledge',
  'SSS',
  '{"lookup_names":["William of Ockham / 오컴의 윌리엄","William of Ockham","오컴의 윌리엄"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763224562,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '5b200bf9-e2af-49d3-9861-b8e2e6eeabdf'::uuid
),
(
  'philosophy-20260922-009',
  'Francis Bacon / 프랜시스 베이컨',
  'knowledge',
  'SSS',
  '{"lookup_names":["Francis Bacon / 프랜시스 베이컨","Francis Bacon","프랜시스 베이컨"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763224562,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'b7cb64e7-6bbf-4a3f-8791-c8db642b5d17'::uuid
),
(
  'philosophy-20260922-010',
  'René Descartes / 르네 데카르트',
  'knowledge',
  'SSS',
  '{"lookup_names":["René Descartes / 르네 데카르트","René Descartes","르네 데카르트"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763224562,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '7ac5c165-dabf-4b0c-95f5-8d6ee2665646'::uuid
),
(
  'philosophy-20260922-011',
  'Thomas Hobbes / 토머스 홉스',
  'knowledge',
  'SSS',
  '{"lookup_names":["Thomas Hobbes / 토머스 홉스","Thomas Hobbes","토머스 홉스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763224562,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'a8a7430f-24c4-4da5-93e7-40f480bbe854'::uuid
),
(
  'philosophy-20260922-012',
  'Gottfried Leibniz / 고트프리트 라이프니츠',
  'knowledge',
  'SSS',
  '{"lookup_names":["Gottfried Leibniz / 고트프리트 라이프니츠","Gottfried Leibniz","고트프리트 라이프니츠"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763224562,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'philosophy-20260922-013',
  'David Hume / 데이비드 흄',
  'knowledge',
  'SSS',
  '{"lookup_names":["David Hume / 데이비드 흄","David Hume","데이비드 흄"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763224562,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'f7eec894-87d3-4254-835e-245c9e092318'::uuid
),
(
  'philosophy-20260922-014',
  'John Locke / 존 로크',
  'knowledge',
  'SSS',
  '{"lookup_names":["John Locke / 존 로크","John Locke","존 로크"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763224562,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'd30bbbd8-b1b0-466f-b65f-2c55da41062c'::uuid
),
(
  'philosophy-20260922-015',
  'Friedrich Nietzsche / 프리드리히 니체',
  'knowledge',
  'SSS',
  '{"lookup_names":["Friedrich Nietzsche / 프리드리히 니체","Friedrich Nietzsche","프리드리히 니체"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763224562,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'c5676a6d-891b-4d08-8738-d26226e78ae0'::uuid
),
(
  'philosophy-20260922-016',
  'William James / 윌리엄 제임스',
  'knowledge',
  'SSS',
  '{"lookup_names":["William James / 윌리엄 제임스","William James","윌리엄 제임스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763224562,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'ad51aa2c-a9f6-4332-ac92-ba1ee7b8d85c'::uuid
),
(
  'philosophy-20260922-017',
  'Hannah Arendt / 한나 아렌트',
  'knowledge',
  'SSS',
  '{"lookup_names":["Hannah Arendt / 한나 아렌트","Hannah Arendt","한나 아렌트"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763224562,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '320d1393-721d-4725-8b37-cb17ec7e023b'::uuid
),
(
  'philosophy-20260922-018',
  'Martin Heidegger / 마르틴 하이데거',
  'knowledge',
  'SSS',
  '{"lookup_names":["Martin Heidegger / 마르틴 하이데거","Martin Heidegger","마르틴 하이데거"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763224562,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '6f029958-4714-4295-94c0-6c599aed55bc'::uuid
),
(
  'philosophy-20260922-019',
  'Bertrand Russell / 버트런드 러셀',
  'knowledge',
  'SSS',
  '{"lookup_names":["Bertrand Russell / 버트런드 러셀","Bertrand Russell","버트런드 러셀"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763224562,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '086a0c88-d4d4-413c-95d7-1821fdf2de51'::uuid
),
(
  'philosophy-20260922-020',
  'Ayn Rand / 아인 랜드',
  'knowledge',
  'SS',
  '{"lookup_names":["Ayn Rand / 아인 랜드","Ayn Rand","아인 랜드"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763224562,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'philosophy-20260922-021',
  'Albert Camus / 알베르 카뮈',
  'culture',
  'SSS',
  '{"lookup_names":["Albert Camus / 알베르 카뮈","Albert Camus","알베르 카뮈"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763224562,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'c3ff9587-63e8-486f-b489-54d17717338c'::uuid
),
(
  'philosophy-20260922-022',
  'Thomas Nagel / 토머스 네이글',
  'knowledge',
  'SS',
  '{"lookup_names":["Thomas Nagel / 토머스 네이글","Thomas Nagel","토머스 네이글"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763224562,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'philosophy-20260922-023',
  'Amartya Sen / 아마르티아 센',
  'knowledge',
  'SSS',
  '{"lookup_names":["Amartya Sen / 아마르티아 센","Amartya Sen","아마르티아 센"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5763224562,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-001',
  'Abu al-Qasim al-Zahrawi',
  'knowledge',
  'SSS',
  '{"lookup_names":["Abu al-Qasim al-Zahrawi"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815493403,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'fd973933-e383-4fe1-ad36-ca4e2aedcd92'::uuid
),
(
  'workshop-20260924-002',
  'Alfred Nobel',
  'technology',
  'SSS',
  '{"lookup_names":["Alfred Nobel"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815493403,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '651d1013-a4ec-4bf1-9426-3ba94c339433'::uuid
),
(
  'workshop-20260924-003',
  'Wilhelm Röntgen',
  'knowledge',
  'SSS',
  '{"lookup_names":["Wilhelm Röntgen"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815493403,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'a55eb02b-e452-4ac3-8329-446965ac2b37'::uuid
),
(
  'workshop-20260924-004',
  'Erwin Schrödinger',
  'knowledge',
  'SSS',
  '{"lookup_names":["Erwin Schrödinger"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815493403,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '31c7191c-9da5-47d1-9460-8ba9528bf1b7'::uuid
),
(
  'workshop-20260924-005',
  'Carl Friedrich Gauss',
  'knowledge',
  'SSS',
  '{"lookup_names":["Carl Friedrich Gauss"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815493403,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'e13c2ab2-f8fb-408a-9a65-34bb38223e85'::uuid
),
(
  'workshop-20260924-006',
  'John Dalton',
  'knowledge',
  'SSS',
  '{"lookup_names":["John Dalton"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815493403,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'd51d91b2-cf30-4743-84d2-c9725795418c'::uuid
),
(
  'workshop-20260924-007',
  'Norman Borlaug',
  'knowledge',
  'SSS',
  '{"lookup_names":["Norman Borlaug"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815493403,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '0910a2e9-794b-42f1-b45b-0fa268a1f91e'::uuid
),
(
  'workshop-20260924-008',
  'Michel Foucault',
  'knowledge',
  'SSS',
  '{"lookup_names":["Michel Foucault"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815493403,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'f0b62721-9191-418b-b9a9-ec66b8824fd1'::uuid
),
(
  'workshop-20260924-009',
  'Bi Sheng',
  'technology',
  'SSS',
  '{"lookup_names":["Bi Sheng"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815493403,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '478d978b-2ba0-4b42-b181-1e64fdb1d6b1'::uuid
),
(
  'workshop-20260924-010',
  'John Harrison',
  'technology',
  'SSS',
  '{"lookup_names":["John Harrison"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815493403,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'ce5a07b6-850e-48e2-a7f8-d43bb79e6c26'::uuid
),
(
  'workshop-20260924-011',
  'Guglielmo Marconi',
  'technology',
  'SSS',
  '{"lookup_names":["Guglielmo Marconi"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815493403,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'ad947f4b-dc3a-4557-b871-54bbbe484d24'::uuid
),
(
  'workshop-20260924-012',
  'Ismail al-Jazari',
  'technology',
  'SSS',
  '{"lookup_names":["Ismail al-Jazari"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815494440,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'e17d21f8-7c2e-48b5-93c5-b3e9034ae768'::uuid
),
(
  'workshop-20260924-013',
  'Joseph Smith Jr.',
  'religion',
  'SSS',
  '{"lookup_names":["Joseph Smith Jr."],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815494440,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '733c6ff9-56d6-4036-876c-ae85b1b7ba6a'::uuid
),
(
  'workshop-20260924-014',
  'John Wesley',
  'religion',
  'SSS',
  '{"lookup_names":["John Wesley"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815494440,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'dca7ca44-0547-4d16-a0df-576e98075906'::uuid
),
(
  'workshop-20260924-015',
  'Bahá''u''lláh',
  'religion',
  'SSS',
  '{"lookup_names":["Bahá''u''lláh"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815494440,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'fd343755-96d6-4b80-a9f8-6a00636dba45'::uuid
),
(
  'workshop-20260924-016',
  'Caravaggio',
  'culture',
  'SSS',
  '{"lookup_names":["Caravaggio"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815494440,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '551c7abe-cf1c-4dc2-b5b2-06abe4343798'::uuid
),
(
  'workshop-20260924-017',
  'Jan van Eyck',
  'culture',
  'SSS',
  '{"lookup_names":["Jan van Eyck"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815494440,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'a73103e4-a4fd-4103-9346-c0c697585966'::uuid
),
(
  'workshop-20260924-018',
  'Giotto',
  'culture',
  'SSS',
  '{"lookup_names":["Giotto"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815494440,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '8d8f78e6-4cc8-4433-b6b6-e2a9777a0bc8'::uuid
),
(
  'workshop-20260924-019',
  'Raphael',
  'culture',
  'SSS',
  '{"lookup_names":["Raphael"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815494440,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '0c17162d-c62f-4b3d-98fe-6b8d5c60b4fa'::uuid
),
(
  'workshop-20260924-020',
  'Sandro Botticelli',
  'culture',
  'SSS',
  '{"lookup_names":["Sandro Botticelli"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815494440,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '8ffaeb0c-5125-4a92-904d-6b673335667f'::uuid
),
(
  'workshop-20260924-021',
  'Johannes Vermeer',
  'culture',
  'SSS',
  '{"lookup_names":["Johannes Vermeer"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815494440,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '78e9b573-421a-48a5-b421-7173c50f3026'::uuid
),
(
  'workshop-20260924-022',
  'Gian Lorenzo Bernini',
  'culture',
  'SSS',
  '{"lookup_names":["Gian Lorenzo Bernini"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815494440,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '2112d485-894f-4a74-812d-7229483fc9df'::uuid
),
(
  'workshop-20260924-023',
  'Jacques-Louis David',
  'culture',
  'SSS',
  '{"lookup_names":["Jacques-Louis David"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815495564,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '27dfd87b-d459-43d2-a3e9-986159b500e4'::uuid
),
(
  'workshop-20260924-024',
  'René Magritte',
  'culture',
  'SSS',
  '{"lookup_names":["René Magritte"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815495564,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '149f6b22-e3c2-4996-8230-a9b5562dceed'::uuid
),
(
  'workshop-20260924-025',
  'Edvard Munch',
  'culture',
  'SSS',
  '{"lookup_names":["Edvard Munch"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815495564,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'b5cce601-aeca-4e4f-af80-5eda81b073fe'::uuid
),
(
  'workshop-20260924-026',
  'Frida Kahlo',
  'culture',
  'SSS',
  '{"lookup_names":["Frida Kahlo"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815495564,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-027',
  'Kamal ud-Din Behzad',
  'culture',
  'SSS',
  '{"lookup_names":["Kamal ud-Din Behzad"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815495564,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-028',
  'Jackson Pollock',
  'culture',
  'SSS',
  '{"lookup_names":["Jackson Pollock"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815495564,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '82427a0e-173b-48c4-9b19-e04da2aefb72'::uuid
),
(
  'workshop-20260924-029',
  'Aristophanes',
  'culture',
  'SSS',
  '{"lookup_names":["Aristophanes"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815495564,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'cb350a00-8b92-47e9-a847-6d92b3075811'::uuid
),
(
  'workshop-20260924-030',
  'Petrarch',
  'culture',
  'SSS',
  '{"lookup_names":["Petrarch"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815495564,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '25117b36-b5ba-4d45-9f9d-a35443814af8'::uuid
),
(
  'workshop-20260924-031',
  'Luís de Camões',
  'culture',
  'SSS',
  '{"lookup_names":["Luís de Camões"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815495564,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'b4187984-3302-41ca-b1e6-c74d507ece96'::uuid
),
(
  'workshop-20260924-032',
  'Cao Xueqin',
  'culture',
  'SSS',
  '{"lookup_names":["Cao Xueqin"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815495564,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'fd06dd4a-c598-4655-adf1-546dd2bee81b'::uuid
),
(
  'workshop-20260924-033',
  'Hans Christian Andersen',
  'culture',
  'SSS',
  '{"lookup_names":["Hans Christian Andersen"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815495564,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '12d6c0c9-f727-4358-b6ef-2acb1ff7a27f'::uuid
),
(
  'workshop-20260924-034',
  'Marcel Proust',
  'culture',
  'SSS',
  '{"lookup_names":["Marcel Proust"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815496976,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '9f68b83e-c9e5-43e6-9bf6-0cf38d839bd3'::uuid
),
(
  'workshop-20260924-035',
  'Franz Kafka',
  'culture',
  'SSS',
  '{"lookup_names":["Franz Kafka"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815496976,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '41fcf3c7-389c-434f-b020-1c94109f889c'::uuid
),
(
  'workshop-20260924-036',
  'Virginia Woolf',
  'culture',
  'SSS',
  '{"lookup_names":["Virginia Woolf"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815496976,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '520d1438-ca69-4c95-ac97-089eaffd4398'::uuid
),
(
  'workshop-20260924-037',
  'Simone de Beauvoir',
  'culture',
  'SSS',
  '{"lookup_names":["Simone de Beauvoir"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815496976,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'e16a3b74-f6f7-4eea-9c59-d796b8859d8c'::uuid
),
(
  'workshop-20260924-038',
  'Toni Morrison',
  'culture',
  'SSS',
  '{"lookup_names":["Toni Morrison"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815496976,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'c075303a-4f0f-4652-bd0e-64e4917676b0'::uuid
),
(
  'workshop-20260924-039',
  'Jonathan Swift',
  'culture',
  'SSS',
  '{"lookup_names":["Jonathan Swift"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815496976,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'f3b06c0c-23eb-42e9-b45b-1703b671bd57'::uuid
),
(
  'workshop-20260924-040',
  'Frank Sinatra',
  'culture',
  'SSS',
  '{"lookup_names":["Frank Sinatra"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815496976,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '41383dbf-96d1-436e-a699-a1345c4493fe'::uuid
),
(
  'workshop-20260924-041',
  'Jimi Hendrix',
  'culture',
  'SSS',
  '{"lookup_names":["Jimi Hendrix"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815496976,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '11ee564e-3943-4933-bc8f-3bd21f8d8f32'::uuid
),
(
  'workshop-20260924-042',
  'David Bowie',
  'culture',
  'SSS',
  '{"lookup_names":["David Bowie"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815496976,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '4a82aa3d-2a49-45c0-977c-37351879319c'::uuid
),
(
  'workshop-20260924-043',
  'John Lennon',
  'culture',
  'SSS',
  '{"lookup_names":["John Lennon"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815496976,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'f519e2b9-19f1-4b44-a298-6b5053269ab3'::uuid
),
(
  'workshop-20260924-044',
  'Prince',
  'culture',
  'SSS',
  '{"lookup_names":["Prince"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815496976,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'edcbb089-e052-490b-981b-1f66cf28109c'::uuid
),
(
  'workshop-20260924-045',
  'Amerigo Vespucci',
  'exploration',
  'SSS',
  '{"lookup_names":["Amerigo Vespucci"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815498501,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'b2ce06b7-21d4-441e-b943-a608cc0cd242'::uuid
),
(
  'workshop-20260924-046',
  'Theophrastus',
  'knowledge',
  'SS',
  '{"lookup_names":["Theophrastus"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815498501,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-047',
  'Satyendra Nath Bose',
  'knowledge',
  'SS',
  '{"lookup_names":["Satyendra Nath Bose"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815498501,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'c0d04b34-c399-44fe-bbd9-897dbd826146'::uuid
),
(
  'workshop-20260924-048',
  'Stephanie Kwolek',
  'technology',
  'SS',
  '{"lookup_names":["Stephanie Kwolek"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815498501,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-049',
  'Niels Henrik Abel',
  'knowledge',
  'SS',
  '{"lookup_names":["Niels Henrik Abel"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815498501,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '06104c76-4dbe-472e-8f64-97f74a4e18c7'::uuid
),
(
  'workshop-20260924-050',
  'Liu Hui',
  'knowledge',
  'SS',
  '{"lookup_names":["Liu Hui"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815498501,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '5eec83bb-14b4-4e4a-9ef6-aece12f6cda1'::uuid
),
(
  'workshop-20260924-051',
  'Shen Kuo',
  'knowledge',
  'SS',
  '{"lookup_names":["Shen Kuo"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815498501,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '1f5d04f0-4d34-479e-b0b0-c0d4f65e3799'::uuid
),
(
  'workshop-20260924-052',
  'Maria Sibylla Merian',
  'knowledge',
  'SS',
  '{"lookup_names":["Maria Sibylla Merian"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815498501,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-053',
  'Mary Anning',
  'knowledge',
  'SS',
  '{"lookup_names":["Mary Anning"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815498501,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-054',
  'Rosalind Franklin',
  'knowledge',
  'SS',
  '{"lookup_names":["Rosalind Franklin"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815498501,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-055',
  'Maryam Mirzakhani',
  'knowledge',
  'SS',
  '{"lookup_names":["Maryam Mirzakhani"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815498501,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-056',
  'Mohamed M. Atalla',
  'technology',
  'SS',
  '{"lookup_names":["Mohamed M. Atalla"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815499904,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-057',
  'Hans Bethe',
  'knowledge',
  'SS',
  '{"lookup_names":["Hans Bethe"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815499904,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-058',
  'Elinor Ostrom',
  'knowledge',
  'SS',
  '{"lookup_names":["Elinor Ostrom"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815499904,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'ddd3df15-6ae3-406e-9b47-6bc1efdf74c0'::uuid
),
(
  'workshop-20260924-059',
  'Anselm of Canterbury',
  'religion',
  'SS',
  '{"lookup_names":["Anselm of Canterbury"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815499904,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-060',
  'V. Gordon Childe',
  'knowledge',
  'SS',
  '{"lookup_names":["V. Gordon Childe"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815499904,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-061',
  'Fazlur Rahman Khan',
  'technology',
  'SS',
  '{"lookup_names":["Fazlur Rahman Khan"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815499904,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-062',
  'John Loudon McAdam',
  'technology',
  'SS',
  '{"lookup_names":["John Loudon McAdam"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815499904,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-063',
  'Zaha Hadid',
  'culture',
  'SS',
  '{"lookup_names":["Zaha Hadid"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815499904,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-064',
  'Jamsetji Tata',
  'commerce',
  'SS',
  '{"lookup_names":["Jamsetji Tata"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815499904,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '0b7d8e26-dd1b-422a-b40e-569e4b8acdcd'::uuid
),
(
  'workshop-20260924-065',
  'Madam C. J. Walker',
  'commerce',
  'SS',
  '{"lookup_names":["Madam C. J. Walker"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815499904,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'e386d5db-ce6f-4084-bf55-0d4ba90c95e5'::uuid
),
(
  'workshop-20260924-066',
  'Masaru Ibuka',
  'commerce',
  'SS',
  '{"lookup_names":["Masaru Ibuka"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815499904,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-067',
  'Nestorius',
  'religion',
  'SS',
  '{"lookup_names":["Nestorius"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815501290,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-068',
  'Miki Nakayama',
  'religion',
  'SS',
  '{"lookup_names":["Miki Nakayama"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815501290,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-069',
  'Ellen G. White',
  'religion',
  'SS',
  '{"lookup_names":["Ellen G. White"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815501290,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-070',
  'Charles Taze Russell',
  'religion',
  'SS',
  '{"lookup_names":["Charles Taze Russell"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815501290,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-071',
  'Thomas Cochrane',
  'military',
  'SS',
  '{"lookup_names":["Thomas Cochrane"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815501290,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-072',
  'Giovanni Bellini',
  'culture',
  'SS',
  '{"lookup_names":["Giovanni Bellini"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815501290,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-073',
  'Tintoretto',
  'culture',
  'SS',
  '{"lookup_names":["Tintoretto"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815501290,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-074',
  'Artemisia Gentileschi',
  'culture',
  'SS',
  '{"lookup_names":["Artemisia Gentileschi"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815501290,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-075',
  'Sesshū Tōyō',
  'culture',
  'SS',
  '{"lookup_names":["Sesshū Tōyō"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815501290,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-076',
  'Charles Le Brun',
  'culture',
  'SS',
  '{"lookup_names":["Charles Le Brun"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815501290,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-077',
  'Chikamatsu Monzaemon',
  'culture',
  'SS',
  '{"lookup_names":["Chikamatsu Monzaemon"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815501290,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-078',
  'Lope de Vega',
  'culture',
  'SS',
  '{"lookup_names":["Lope de Vega"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815502825,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '8104802a-8f0a-4f50-90ed-9f13a312e927'::uuid
),
(
  'workshop-20260924-079',
  'Mikhail Bulgakov',
  'culture',
  'SS',
  '{"lookup_names":["Mikhail Bulgakov"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815502825,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-080',
  'Maya Angelou',
  'culture',
  'SS',
  '{"lookup_names":["Maya Angelou"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815502825,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-081',
  'Jin Yong',
  'culture',
  'SS',
  '{"lookup_names":["Jin Yong"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815502825,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-082',
  'Astrid Lindgren',
  'culture',
  'SS',
  '{"lookup_names":["Astrid Lindgren"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815502825,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-083',
  'Roald Dahl',
  'culture',
  'SS',
  '{"lookup_names":["Roald Dahl"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815502825,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-084',
  'J. D. Salinger',
  'culture',
  'SS',
  '{"lookup_names":["J. D. Salinger"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815502825,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-085',
  'Billie Holiday',
  'culture',
  'SS',
  '{"lookup_names":["Billie Holiday"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815502825,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-086',
  'Thelonious Monk',
  'culture',
  'SS',
  '{"lookup_names":["Thelonious Monk"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815502825,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-087',
  'Johnny Cash',
  'culture',
  'SS',
  '{"lookup_names":["Johnny Cash"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815502825,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-088',
  'Jean Sibelius',
  'culture',
  'SS',
  '{"lookup_names":["Jean Sibelius"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815502825,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-089',
  'Giovanni da Pian del Carpine',
  'exploration',
  'SS',
  '{"lookup_names":["Giovanni da Pian del Carpine"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815504379,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-090',
  'John Cabot',
  'exploration',
  'SS',
  '{"lookup_names":["John Cabot"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815504379,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-091',
  'Jacques Cartier',
  'exploration',
  'SS',
  '{"lookup_names":["Jacques Cartier"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815504379,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-092',
  'Fabian Gottlieb von Bellingshausen',
  'exploration',
  'SS',
  '{"lookup_names":["Fabian Gottlieb von Bellingshausen"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815504379,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-093',
  'Robert Falcon Scott',
  'exploration',
  'SS',
  '{"lookup_names":["Robert Falcon Scott"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815504379,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-094',
  'Thor Heyerdahl',
  'exploration',
  'SS',
  '{"lookup_names":["Thor Heyerdahl"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815504379,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-095',
  'Giordano Bruno',
  'knowledge',
  'SS',
  '{"lookup_names":["Giordano Bruno"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815504379,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-096',
  'George Berkeley',
  'knowledge',
  'SS',
  '{"lookup_names":["George Berkeley"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815504379,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-097',
  'Albertus Magnus',
  'religion',
  'SS',
  '{"lookup_names":["Albertus Magnus"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815504379,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-098',
  'Ralph Waldo Emerson',
  'culture',
  'SS',
  '{"lookup_names":["Ralph Waldo Emerson"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815504379,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-099',
  'Friedrich Schelling',
  'knowledge',
  'SS',
  '{"lookup_names":["Friedrich Schelling"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5815504379,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260924-100',
  'Mani / 마니',
  'religion',
  'SSS',
  '{"lookup_names":["Mani / 마니","Mani","마니"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5816044939,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260927-101',
  'James of St. George / 생조르주의 제임스',
  'technology',
  'SS',
  '{"lookup_names":["James of St. George / 생조르주의 제임스","James of St. George","생조르주의 제임스"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5855242257,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260927-102',
  'Joseph Paxton / 조지프 팩스턴',
  'technology',
  'SS',
  '{"lookup_names":["Joseph Paxton / 조지프 팩스턴","Joseph Paxton","조지프 팩스턴"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5855242257,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260927-103',
  'Frederick Law Olmsted / 프레더릭 로 옴스테드',
  'technology',
  'SS',
  '{"lookup_names":["Frederick Law Olmsted / 프레더릭 로 옴스테드","Frederick Law Olmsted","프레더릭 로 옴스테드"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5855242257,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260927-104',
  'Alvar Aalto / 알바르 알토',
  'technology',
  'SS',
  '{"lookup_names":["Alvar Aalto / 알바르 알토","Alvar Aalto","알바르 알토"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5855242257,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'workshop-20260927-105',
  'Charles Correa / 찰스 코레아',
  'technology',
  'SS',
  '{"lookup_names":["Charles Correa / 찰스 코레아","Charles Correa","찰스 코레아"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5855242257,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-001',
  'Henrik Ibsen',
  'culture',
  'SSS',
  '{"lookup_names":["Henrik Ibsen"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762473330,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'b7f3c0c0-c021-4e71-b7c2-0f0006ce2482'::uuid
),
(
  'writers4-20260921-002',
  'Li Bai',
  'culture',
  'SSS',
  '{"lookup_names":["Li Bai"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762473330,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '9ef0bb1b-40b9-4fe4-a442-a527b52f2f88'::uuid
),
(
  'writers4-20260921-003',
  'Tao Qian',
  'culture',
  'SSS',
  '{"lookup_names":["Tao Qian"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762473330,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '2c770996-e69b-5429-bb78-7dc3b1a503cf'::uuid
),
(
  'writers4-20260921-004',
  'Saadi',
  'culture',
  'SSS',
  '{"lookup_names":["Saadi"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762473330,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '25c3d716-a426-406d-90b1-85b67eb136dc'::uuid
),
(
  'writers4-20260921-005',
  'Jalal al-Din Rumi',
  'culture',
  'SSS',
  '{"lookup_names":["Jalal al-Din Rumi"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762473330,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-006',
  'Kabir',
  'culture',
  'SSS',
  '{"lookup_names":["Kabir"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762473330,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'c00c48a7-ecec-458c-93ad-765a8abaea07'::uuid
),
(
  'writers4-20260921-007',
  'Thiruvalluvar',
  'culture',
  'SSS',
  '{"lookup_names":["Thiruvalluvar"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762473330,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '7407feff-345f-4573-8320-62de8d58d428'::uuid
),
(
  'writers4-20260921-008',
  'Rabindranath Tagore',
  'culture',
  'SSS',
  '{"lookup_names":["Rabindranath Tagore"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762473330,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'a643a787-7278-4b0c-a787-10b3f580c2f0'::uuid
),
(
  'writers4-20260921-009',
  'Chinua Achebe',
  'culture',
  'SSS',
  '{"lookup_names":["Chinua Achebe"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762473330,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '57f63dfa-18ed-4693-a384-8395064dc10f'::uuid
),
(
  'writers4-20260921-010',
  'Gabriel García Márquez',
  'culture',
  'SSS',
  '{"lookup_names":["Gabriel García Márquez"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762473330,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '2de0b144-3055-4b25-a125-4b1e8442a571'::uuid
),
(
  'writers4-20260921-011',
  'Lao Tzu',
  'knowledge',
  'SSS',
  '{"lookup_names":["Lao Tzu"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762473330,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-012',
  'Jorge Luis Borges',
  'culture',
  'SSS',
  '{"lookup_names":["Jorge Luis Borges"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762473837,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '1d913e76-ac79-4e82-90a2-08bbed2e8ef8'::uuid
),
(
  'writers4-20260921-013',
  'Nguyễn Du',
  'culture',
  'SSS',
  '{"lookup_names":["Nguyễn Du"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762473837,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-014',
  'Wu Cheng''en',
  'culture',
  'SSS',
  '{"lookup_names":["Wu Cheng''en"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762473837,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'b9dd3e9b-3db4-4df1-9b08-3c6da9787c6e'::uuid
),
(
  'writers4-20260921-015',
  'Luo Guanzhong',
  'culture',
  'SSS',
  '{"lookup_names":["Luo Guanzhong"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762473837,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  '490b5966-63ec-4bdb-83e4-5d4fb1f25769'::uuid
),
(
  'writers4-20260921-016',
  'Anne Frank',
  'culture',
  'SSS',
  '{"lookup_names":["Anne Frank"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762473837,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-017',
  'Antonio Vivaldi',
  'culture',
  'SSS',
  '{"lookup_names":["Antonio Vivaldi"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762473837,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  'aafc1c6d-ff86-4435-9580-dce055f38249'::uuid
),
(
  'writers4-20260921-018',
  'Felix Mendelssohn',
  'culture',
  'SSS',
  '{"lookup_names":["Felix Mendelssohn"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762473837,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-019',
  'Elon Musk',
  'technology',
  'SSS',
  '{"lookup_names":["Elon Musk"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762473837,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-020',
  'Stanisław Lem',
  'culture',
  'SS',
  '{"lookup_names":["Stanisław Lem"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762473837,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-021',
  'Wisława Szymborska',
  'culture',
  'SS',
  '{"lookup_names":["Wisława Szymborska"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762473837,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-022',
  'Jaroslav Hašek',
  'culture',
  'SS',
  '{"lookup_names":["Jaroslav Hašek"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762473837,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-023',
  'Ismail Kadare',
  'culture',
  'SS',
  '{"lookup_names":["Ismail Kadare"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762474429,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-024',
  'Tove Jansson',
  'culture',
  'SS',
  '{"lookup_names":["Tove Jansson"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762474429,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-025',
  'Johan Huizinga',
  'knowledge',
  'SS',
  '{"lookup_names":["Johan Huizinga"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762474429,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-026',
  'Dafydd ap Gwilym',
  'culture',
  'SS',
  '{"lookup_names":["Dafydd ap Gwilym"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762474429,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-027',
  'Aneirin',
  'culture',
  'SS',
  '{"lookup_names":["Aneirin"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762474429,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-028',
  'Bai Juyi',
  'culture',
  'SS',
  '{"lookup_names":["Bai Juyi"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762474429,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-029',
  'Attar of Nishapur',
  'culture',
  'SS',
  '{"lookup_names":["Attar of Nishapur"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762474429,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-030',
  'Nâzım Hikmet',
  'culture',
  'SS',
  '{"lookup_names":["Nâzım Hikmet"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762474429,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-031',
  'Nadine Gordimer',
  'culture',
  'SS',
  '{"lookup_names":["Nadine Gordimer"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762474429,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-032',
  'Wole Soyinka',
  'culture',
  'SS',
  '{"lookup_names":["Wole Soyinka"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762474429,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-033',
  'Vātsyāyana',
  'culture',
  'SS',
  '{"lookup_names":["Vātsyāyana"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762474429,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-034',
  'Orhan Pamuk',
  'culture',
  'SS',
  '{"lookup_names":["Orhan Pamuk"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762474966,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-035',
  'Fuzuli',
  'culture',
  'SS',
  '{"lookup_names":["Fuzuli"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762474966,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-036',
  'Gabriela Mistral',
  'culture',
  'SS',
  '{"lookup_names":["Gabriela Mistral"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762474966,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-037',
  'Julio Cortázar',
  'culture',
  'SS',
  '{"lookup_names":["Julio Cortázar"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762474966,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-038',
  'Octavio Paz',
  'culture',
  'SS',
  '{"lookup_names":["Octavio Paz"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762474966,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-039',
  'Karel Čapek',
  'culture',
  'SS',
  '{"lookup_names":["Karel Čapek"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762474966,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-040',
  'Chingiz Aitmatov',
  'culture',
  'SS',
  '{"lookup_names":["Chingiz Aitmatov"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762474966,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-041',
  'Christine de Pizan',
  'culture',
  'SS',
  '{"lookup_names":["Christine de Pizan"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762474966,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-042',
  'Hồ Xuân Hương',
  'culture',
  'SS',
  '{"lookup_names":["Hồ Xuân Hương"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762474966,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-043',
  'N. Scott Momaday',
  'culture',
  'SS',
  '{"lookup_names":["N. Scott Momaday"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762474966,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-044',
  'Henry Wadsworth Longfellow',
  'culture',
  'SS',
  '{"lookup_names":["Henry Wadsworth Longfellow"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762474966,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-045',
  'Sunthorn Phu',
  'culture',
  'SS',
  '{"lookup_names":["Sunthorn Phu"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762475510,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-046',
  'Mpu Prapanca',
  'culture',
  'SS',
  '{"lookup_names":["Mpu Prapanca"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762475510,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-047',
  'Iryeon',
  'religion',
  'SS',
  '{"lookup_names":["Iryeon"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762475510,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-048',
  'Francisco Hernández Arana Xajilá',
  'knowledge',
  'SS',
  '{"lookup_names":["Francisco Hernández Arana Xajilá"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762475510,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-049',
  'Nikolai Rimsky-Korsakov',
  'culture',
  'SS',
  '{"lookup_names":["Nikolai Rimsky-Korsakov"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762475510,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-050',
  'Edvard Grieg',
  'culture',
  'SS',
  '{"lookup_names":["Edvard Grieg"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762475510,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-051',
  'Gioachino Rossini',
  'culture',
  'SS',
  '{"lookup_names":["Gioachino Rossini"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762475510,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-052',
  'Clara Schumann',
  'culture',
  'SS',
  '{"lookup_names":["Clara Schumann"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762475510,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-053',
  'Dieterich Buxtehude',
  'culture',
  'SS',
  '{"lookup_names":["Dieterich Buxtehude"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762475510,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-054',
  'Scott Joplin',
  'culture',
  'SS',
  '{"lookup_names":["Scott Joplin"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762475510,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-055',
  'Henry Purcell',
  'culture',
  'SS',
  '{"lookup_names":["Henry Purcell"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762475510,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-056',
  'Carl Maria von Weber',
  'culture',
  'SS',
  '{"lookup_names":["Carl Maria von Weber"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762476227,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-057',
  'Arcangelo Corelli',
  'culture',
  'SS',
  '{"lookup_names":["Arcangelo Corelli"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762476227,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-058',
  'Francisco Tárrega',
  'culture',
  'SS',
  '{"lookup_names":["Francisco Tárrega"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762476227,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'writers4-20260921-059',
  'Georg Philipp Telemann',
  'culture',
  'SS',
  '{"lookup_names":["Georg Philipp Telemann"],"review_state":"APPROVED","origin":"historical_queue","source_issue":1374,"source_comment_id":5762476227,"human_authorized_by_user":false,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-001',
  'Pasion',
  'commerce',
  NULL,
  '{"lookup_names":["Pasion","Pasion of Athens","파시온"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-002',
  'Francesco Datini',
  'commerce',
  NULL,
  '{"lookup_names":["Francesco Datini","Francesco di Marco Datini","프란체스코 다티니"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-003',
  'Giovanni di Bicci de'' Medici',
  'commerce',
  NULL,
  '{"lookup_names":["Giovanni di Bicci de'' Medici","Giovanni di Bicci de Medici","조반니 디 비치 데 메디치"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-004',
  'Jacques Coeur',
  'commerce',
  NULL,
  '{"lookup_names":["Jacques Coeur","Jacques Cœur","자크 쾨르"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-005',
  'Francis Baring',
  'commerce',
  NULL,
  '{"lookup_names":["Francis Baring","Sir Francis Baring","프랜시스 베어링"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-006',
  'Alfred Krupp',
  'commerce',
  NULL,
  '{"lookup_names":["Alfred Krupp","알프레트 크루프","앨프리트 크루프"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-007',
  'August Thyssen',
  'commerce',
  NULL,
  '{"lookup_names":["August Thyssen","아우구스트 티센"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-008',
  'Marcus Samuel',
  'commerce',
  NULL,
  '{"lookup_names":["Marcus Samuel","Marcus Samuel, 1st Viscount Bearsted","마커스 새뮤얼"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-009',
  'Thomas Lipton',
  'commerce',
  NULL,
  '{"lookup_names":["Thomas Lipton","Sir Thomas Lipton","토머스 립턴"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-010',
  'William Lever',
  'commerce',
  NULL,
  '{"lookup_names":["William Lever","William Lever, 1st Viscount Leverhulme","윌리엄 레버"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-011',
  'A. P. Moller',
  'commerce',
  NULL,
  '{"lookup_names":["A. P. Moller","A.P. Møller","Arnold Peter Møller","A. P. 묄러"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-012',
  'Ivar Kreuger',
  'commerce',
  NULL,
  '{"lookup_names":["Ivar Kreuger","이바르 크뤼게르"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-013',
  'Andrew Mellon',
  'commerce',
  NULL,
  '{"lookup_names":["Andrew Mellon","Andrew W. Mellon","앤드루 멜런"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-014',
  'E. H. Harriman',
  'commerce',
  NULL,
  '{"lookup_names":["E. H. Harriman","Edward Henry Harriman","에드워드 해리먼"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-015',
  'James J. Hill',
  'commerce',
  NULL,
  '{"lookup_names":["James J. Hill","James Jerome Hill","제임스 J. 힐"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-016',
  'Jay Gould',
  'commerce',
  NULL,
  '{"lookup_names":["Jay Gould","제이 굴드"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-017',
  'Levi Strauss',
  'commerce',
  NULL,
  '{"lookup_names":["Levi Strauss","리바이 스트라우스"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-018',
  'A. P. Giannini',
  'commerce',
  NULL,
  '{"lookup_names":["A. P. Giannini","Amadeo Pietro Giannini","아마데오 지아니니"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-019',
  'Milton S. Hershey',
  'commerce',
  NULL,
  '{"lookup_names":["Milton S. Hershey","Milton Hershey","밀턴 허시"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-020',
  'J. Paul Getty',
  'commerce',
  NULL,
  '{"lookup_names":["J. Paul Getty","Jean Paul Getty","J. 폴 게티"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-021',
  'Conrad Hilton',
  'commerce',
  NULL,
  '{"lookup_names":["Conrad Hilton","콘래드 힐튼"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-022',
  'Sam Walton',
  'commerce',
  NULL,
  '{"lookup_names":["Sam Walton","Samuel Moore Walton","샘 월턴"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-023',
  'Estee Lauder',
  'commerce',
  NULL,
  '{"lookup_names":["Estee Lauder","Estée Lauder","에스티 로더"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-024',
  'Virji Vora',
  'commerce',
  NULL,
  '{"lookup_names":["Virji Vora","Virji Bohra","비르지 보라"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-025',
  'Fateh Chand',
  'commerce',
  NULL,
  '{"lookup_names":["Fateh Chand","Fateh Chand Jagat Seth","Jagat Seth Fateh Chand","파테 찬드","자가트 세트"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-026',
  'Jamsetjee Jejeebhoy',
  'commerce',
  NULL,
  '{"lookup_names":["Jamsetjee Jejeebhoy","Jamsetji Jeejeebhoy","잠셋지 지지보이"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-027',
  'Dwarkanath Tagore',
  'commerce',
  NULL,
  '{"lookup_names":["Dwarkanath Tagore","드와르카나트 타고르"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-028',
  'J. R. D. Tata',
  'commerce',
  NULL,
  '{"lookup_names":["J. R. D. Tata","J.R.D. Tata","Jehangir Ratanji Dadabhoy Tata","J. R. D. 타타"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-029',
  'Ghanshyam Das Birla',
  'commerce',
  NULL,
  '{"lookup_names":["Ghanshyam Das Birla","G. D. Birla","G.D. Birla","간샴 다스 비를라"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-030',
  'Dhirubhai Ambani',
  'commerce',
  NULL,
  '{"lookup_names":["Dhirubhai Ambani","디루바이 암바니"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-031',
  'Hu Xueyan',
  'commerce',
  NULL,
  '{"lookup_names":["Hu Xueyan","胡雪巖","胡雪岩","후쉐옌"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-032',
  'Zhang Jian',
  'commerce',
  NULL,
  '{"lookup_names":["Zhang Jian","張謇","장젠"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-033',
  'Lu Zuofu',
  'commerce',
  NULL,
  '{"lookup_names":["Lu Zuofu","盧作孚","卢作孚","루쭤푸"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-034',
  'Yue-Kong Pao',
  'commerce',
  NULL,
  '{"lookup_names":["Yue-Kong Pao","Y. K. Pao","Pao Yue-kong","包玉剛","包玉刚","파오위콩"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-035',
  'Mitsui Takatoshi',
  'commerce',
  NULL,
  '{"lookup_names":["Mitsui Takatoshi","三井高利","미쓰이 다카토시"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-036',
  'Iwasaki Yataro',
  'commerce',
  NULL,
  '{"lookup_names":["Iwasaki Yataro","Iwasaki Yatarō","岩崎弥太郎","이와사키 야타로"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-037',
  'Shibusawa Eiichi',
  'commerce',
  NULL,
  '{"lookup_names":["Shibusawa Eiichi","渋沢栄一","시부사와 에이이치"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-038',
  'Konosuke Matsushita',
  'commerce',
  NULL,
  '{"lookup_names":["Konosuke Matsushita","Kōnosuke Matsushita","松下幸之助","마쓰시타 고노스케"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-039',
  'Lee Byung-chul',
  'commerce',
  NULL,
  '{"lookup_names":["Lee Byung-chul","Lee Byung Chul","이병철"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-040',
  'Chung Ju-yung',
  'commerce',
  NULL,
  '{"lookup_names":["Chung Ju-yung","Chung Ju Young","정주영"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-041',
  'Lee Kun-hee',
  'commerce',
  NULL,
  '{"lookup_names":["Lee Kun-hee","Lee Kun Hee","이건희"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-042',
  'Oei Tiong Ham',
  'commerce',
  NULL,
  '{"lookup_names":["Oei Tiong Ham","오에이 티옹 함"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-043',
  'Tan Kah Kee',
  'commerce',
  NULL,
  '{"lookup_names":["Tan Kah Kee","Chen Jiageng","陳嘉庚","陈嘉庚","천자겅","탄 카 키"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-044',
  'Cheong Fatt Tze',
  'commerce',
  NULL,
  '{"lookup_names":["Cheong Fatt Tze","Zhang Bishi","張弼士","张弼士","청팟쩌"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-045',
  'Aw Boon Haw',
  'commerce',
  NULL,
  '{"lookup_names":["Aw Boon Haw","胡文虎","아우 분 호"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-046',
  'Henry Sy',
  'commerce',
  NULL,
  '{"lookup_names":["Henry Sy","Henry Sy Sr.","헨리 시"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-047',
  'Sudono Salim',
  'commerce',
  NULL,
  '{"lookup_names":["Sudono Salim","Liem Sioe Liong","림시오량","수도노 살림"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-048',
  'Mohammad Hassan Amin al-Zarb',
  'commerce',
  NULL,
  '{"lookup_names":["Mohammad Hassan Amin al-Zarb","Hajj Mohammad Hassan Amin al-Zarb","Amin al-Zarb","아민 알다르브"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-049',
  'Calouste Gulbenkian',
  'commerce',
  NULL,
  '{"lookup_names":["Calouste Gulbenkian","칼루스트 굴벤키안"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-050',
  'Talaat Harb',
  'commerce',
  NULL,
  '{"lookup_names":["Talaat Harb","Tal''at Harb","탈라트 하르브"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-051',
  'Vehbi Koc',
  'commerce',
  NULL,
  '{"lookup_names":["Vehbi Koc","Vehbi Koç","베흐비 코치"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-052',
  'Ernest Oppenheimer',
  'commerce',
  NULL,
  '{"lookup_names":["Ernest Oppenheimer","어니스트 오펜하이머"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-053',
  'Irineu Evangelista de Sousa',
  'commerce',
  NULL,
  '{"lookup_names":["Irineu Evangelista de Sousa","Irineu Evangelista de Souza","Viscount of Maua","Viscount of Mauá","마우아 자작"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-054',
  'Francesco Matarazzo',
  'commerce',
  NULL,
  '{"lookup_names":["Francesco Matarazzo","프란체스코 마타라초"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
),
(
  'commerce-20261003-055',
  'Aristotle Onassis',
  'commerce',
  NULL,
  '{"lookup_names":["Aristotle Onassis","Aristotle Socrates Onassis","아리스토텔레스 오나시스"],"review_state":"APPROVED","origin":"commerce_world_history_20261003","source_issue":null,"source_comment_id":null,"human_authorized_by_user":true,"bootstrap_artifact":"data/core/person-registration-queue-source.v1.json"}'::jsonb,
  NULL
)
),
resolved AS (
  SELECT
    s.candidate_id,
    s.name,
    s.representative_domain,
    s.priority,
    s.review_metadata,
    p.id AS person_id
  FROM seed s
  LEFT JOIN atlas_v2.persons p ON p.id=s.bootstrap_person_id
)
INSERT INTO atlas_v2.person_registration_candidates(
  candidate_id,name,representative_domain,priority,review_metadata,person_id
)
SELECT candidate_id,name,representative_domain,priority,review_metadata,person_id
FROM resolved
ON CONFLICT (candidate_id) DO NOTHING;

COMMIT;
