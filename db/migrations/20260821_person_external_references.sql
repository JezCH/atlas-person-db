BEGIN;

CREATE TABLE IF NOT EXISTS atlas_v2.person_external_references (
  person_id uuid NOT NULL REFERENCES atlas_v2.persons(id) ON DELETE CASCADE,
  provider text NOT NULL,
  status text NOT NULL,
  checked_at date NOT NULL,
  document_title text,
  url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT person_external_references_pkey PRIMARY KEY (person_id, provider),
  CONSTRAINT person_external_references_provider_check CHECK (provider ~ '^[a-z][a-z0-9_-]*$'),
  CONSTRAINT person_external_references_status_check CHECK (status IN ('linked', 'not_found')),
  CONSTRAINT person_external_references_payload_check CHECK (
    (status = 'linked' AND document_title IS NOT NULL AND btrim(document_title) <> '' AND url IS NOT NULL AND btrim(url) <> '')
    OR
    (status = 'not_found' AND document_title IS NULL AND url IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS atlas_v2.person_profile_mutation_audits (
  request_id text NOT NULL,
  -- Deliberately no live FK: immutable audit history must survive an intentional Person hard-delete cleanup.
  person_id uuid NOT NULL,
  operation text NOT NULL,
  before_snapshot jsonb NOT NULL,
  after_snapshot jsonb NOT NULL,
  mutated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT person_profile_mutation_audits_pkey PRIMARY KEY (request_id),
  CONSTRAINT person_profile_mutation_audits_operation_check CHECK (
    operation IN ('set_person_korean_name', 'set_person_external_reference')
  ),
  CONSTRAINT person_profile_mutation_audits_before_snapshot_check CHECK (jsonb_typeof(before_snapshot) = 'object'),
  CONSTRAINT person_profile_mutation_audits_after_snapshot_check CHECK (jsonb_typeof(after_snapshot) = 'object')
);

CREATE INDEX IF NOT EXISTS person_profile_mutation_audits_person_idx
  ON atlas_v2.person_profile_mutation_audits(person_id, mutated_at DESC);

-- Migrate the newest reviewed NamuWiki state already preserved in immutable authoring run snapshots.
WITH latest_namuwiki AS (
  SELECT DISTINCT ON (amr.person_id)
    amr.person_id,
    amr.result_snapshot->'external_references'->'namuwiki' AS ref
  FROM atlas_v2.authoring_manifest_runs amr
  WHERE amr.person_id IS NOT NULL
    AND jsonb_typeof(amr.result_snapshot->'external_references'->'namuwiki') = 'object'
    AND (amr.result_snapshot->'external_references'->'namuwiki'->>'status') IN ('linked', 'not_found')
  ORDER BY amr.person_id, amr.applied_at DESC, amr.request_id DESC
), valid_namuwiki AS (
  SELECT
    person_id,
    ref->>'status' AS status,
    CASE
      WHEN COALESCE(ref->>'checked_at', '') ~ '^\d{4}-\d{2}-\d{2}$' THEN (ref->>'checked_at')::date
      ELSE CURRENT_DATE
    END AS checked_at,
    CASE WHEN ref->>'status' = 'linked' THEN NULLIF(btrim(ref->>'document_title'), '') ELSE NULL END AS document_title,
    CASE WHEN ref->>'status' = 'linked' THEN NULLIF(btrim(ref->>'url'), '') ELSE NULL END AS url
  FROM latest_namuwiki
)
INSERT INTO atlas_v2.person_external_references(person_id, provider, status, checked_at, document_title, url)
SELECT person_id, 'namuwiki', status, checked_at, document_title, url
FROM valid_namuwiki
WHERE status = 'not_found'
   OR (status = 'linked' AND document_title IS NOT NULL AND url IS NOT NULL)
ON CONFLICT (person_id, provider) DO NOTHING;

-- Migrate reviewed legacy compatibility references. The JOIN keeps clean-schema replay data-free.
WITH legacy(person_id, document_title, url) AS (
  VALUES
    ('da0303c2-1faf-40b8-9dc2-1325b77488d7'::uuid, '임호텝', 'https://namu.wiki/w/%EC%9E%84%ED%98%B8%ED%85%9D'),
    ('554a98f3-c9d1-5314-a59d-6281a8f6524b'::uuid, '람세스 2세', 'https://namu.wiki/w/%EB%9E%8C%EC%84%B8%EC%8A%A4%202%EC%84%B8'),
    ('52530876-ecec-5a85-87c5-90eab802ec50'::uuid, '하트셉수트', 'https://namu.wiki/w/%ED%95%98%ED%8A%B8%EC%85%89%EC%88%98%ED%8A%B8'),
    ('f9518a4b-bd24-48eb-9e42-55fb89eef03d'::uuid, '투탕카멘', 'https://namu.wiki/w/%ED%88%AC%ED%83%95%EC%B9%B4%EB%A9%98'),
    ('e4d6b96d-92c4-5b6c-b43a-14639526b087'::uuid, '함무라비', 'https://namu.wiki/w/%ED%95%A8%EB%AC%B4%EB%9D%BC%EB%B9%84'),
    ('4fa88c6e-53cc-5f79-a507-aaf9ef622c7c'::uuid, '키루스 2세', 'https://namu.wiki/w/%ED%82%A4%EB%A3%A8%EC%8A%A4%202%EC%84%B8'),
    ('9b0e339e-27c5-5330-a2af-371a9459f426'::uuid, '다리우스 1세', 'https://namu.wiki/w/%EB%8B%A4%EB%A6%AC%EC%9A%B0%EC%8A%A4%201%EC%84%B8'),
    ('b38b88f4-2292-5705-9651-7c997d462a51'::uuid, '크세르크세스 1세', 'https://namu.wiki/w/%ED%81%AC%EC%84%B8%EB%A5%B4%ED%81%AC%EC%84%B8%EC%8A%A4%201%EC%84%B8'),
    ('037b92ed-fc9b-526e-b5c7-6075b361df6e'::uuid, '네부카드네자르 2세', 'https://namu.wiki/w/%EB%84%A4%EB%B6%80%EC%B9%B4%EB%93%9C%EB%84%A4%EC%9E%90%EB%A5%B4%202%EC%84%B8')
)
INSERT INTO atlas_v2.person_external_references(person_id, provider, status, checked_at, document_title, url)
SELECT legacy.person_id, 'namuwiki', 'linked', DATE '2026-08-21', legacy.document_title, legacy.url
FROM legacy
JOIN atlas_v2.persons p ON p.id = legacy.person_id
ON CONFLICT (person_id, provider) DO NOTHING;

COMMIT;
