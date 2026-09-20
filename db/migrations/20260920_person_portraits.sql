BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-authoring:person-portraits:v1'));

CREATE TABLE IF NOT EXISTS atlas_v2.person_portraits (
  person_id uuid NOT NULL REFERENCES atlas_v2.persons(id) ON DELETE RESTRICT,
  asset_sha256 text NOT NULL,
  portrait_kind text NOT NULL,
  evidence_level text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT person_portraits_pkey PRIMARY KEY (person_id),
  CONSTRAINT person_portraits_asset_sha256_uq UNIQUE (asset_sha256),
  CONSTRAINT person_portraits_asset_sha256_check CHECK (
    asset_sha256 ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT person_portraits_kind_check CHECK (
    portrait_kind IN ('archival', 'artwork', 'reconstruction', 'symbolic')
  ),
  CONSTRAINT person_portraits_evidence_level_check CHECK (
    evidence_level IN ('direct', 'strong', 'contextual', 'symbolic')
  )
);

CREATE TABLE IF NOT EXISTS atlas_v2.person_portrait_sources (
  person_id uuid NOT NULL REFERENCES atlas_v2.person_portraits(person_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  source_id uuid NOT NULL REFERENCES atlas_v2.sources(id) ON DELETE RESTRICT,
  evidence_role text NOT NULL,
  CONSTRAINT person_portrait_sources_pkey PRIMARY KEY (person_id, source_id, evidence_role),
  CONSTRAINT person_portrait_sources_evidence_role_check CHECK (
    evidence_role IN (
      'facial_reference',
      'clothing_reference',
      'iconography_reference',
      'textual_description',
      'context_reference'
    )
  )
);

COMMIT;
