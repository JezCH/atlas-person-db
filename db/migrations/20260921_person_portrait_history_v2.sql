BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-authoring:person-portrait-history:v2'));
SET LOCAL lock_timeout = '10s';

CREATE TABLE IF NOT EXISTS atlas_v2.person_portrait_assets (
  asset_sha256 text PRIMARY KEY,
  media_type text NOT NULL DEFAULT 'image/webp',
  bytes integer,
  width_px integer,
  height_px integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT person_portrait_assets_sha256_check CHECK (
    asset_sha256 ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT person_portrait_assets_media_type_check CHECK (
    media_type = 'image/webp'
  ),
  CONSTRAINT person_portrait_assets_bytes_check CHECK (
    bytes IS NULL OR bytes >= 0
  ),
  CONSTRAINT person_portrait_assets_width_check CHECK (
    width_px IS NULL OR width_px > 0
  ),
  CONSTRAINT person_portrait_assets_height_check CHECK (
    height_px IS NULL OR height_px > 0
  )
);

CREATE TABLE IF NOT EXISTS atlas_v2.person_portrait_generation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES atlas_v2.persons(id) ON DELETE RESTRICT,
  asset_sha256 text REFERENCES atlas_v2.person_portrait_assets(asset_sha256) ON DELETE RESTRICT,
  generator_provider text NOT NULL,
  generator_model text NOT NULL,
  prompt_template_version text NOT NULL,
  portrait_standard_version text NOT NULL,
  request_sha256 text NOT NULL,
  generation_spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'generated',
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  CONSTRAINT person_portrait_generation_runs_request_sha256_check CHECK (
    request_sha256 ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT person_portrait_generation_runs_spec_check CHECK (
    jsonb_typeof(generation_spec) = 'object'
  ),
  CONSTRAINT person_portrait_generation_runs_status_check CHECK (
    status IN ('generated', 'accepted', 'rejected', 'failed')
  ),
  CONSTRAINT person_portrait_generation_runs_asset_state_check CHECK (
    (status = 'failed' AND asset_sha256 IS NULL)
    OR
    (status <> 'failed' AND asset_sha256 IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS person_portrait_generation_runs_person_created_idx
  ON atlas_v2.person_portrait_generation_runs(person_id, created_at DESC);

CREATE INDEX IF NOT EXISTS person_portrait_generation_runs_status_created_idx
  ON atlas_v2.person_portrait_generation_runs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS person_portrait_generation_runs_request_idx
  ON atlas_v2.person_portrait_generation_runs(person_id, request_sha256, created_at DESC);

CREATE TABLE IF NOT EXISTS atlas_v2.person_portrait_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES atlas_v2.persons(id) ON DELETE RESTRICT,
  asset_sha256 text NOT NULL REFERENCES atlas_v2.person_portrait_assets(asset_sha256) ON DELETE RESTRICT,
  portrait_kind text NOT NULL,
  evidence_level text NOT NULL,
  creation_method text NOT NULL,
  portrait_standard_version text NOT NULL,
  generation_run_id uuid REFERENCES atlas_v2.person_portrait_generation_runs(id) ON DELETE RESTRICT,
  reconstruction_notes text,
  supersedes_revision_id uuid REFERENCES atlas_v2.person_portrait_revisions(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT person_portrait_revisions_kind_check CHECK (
    portrait_kind IN ('archival', 'artwork', 'reconstruction', 'symbolic')
  ),
  CONSTRAINT person_portrait_revisions_evidence_level_check CHECK (
    evidence_level IN ('direct', 'strong', 'contextual', 'symbolic')
  ),
  CONSTRAINT person_portrait_revisions_creation_method_check CHECK (
    creation_method IN (
      'source_asset',
      'human_reconstruction',
      'ai_generated',
      'ai_assisted',
      'symbolic_composite',
      'legacy_unknown'
    )
  ),
  CONSTRAINT person_portrait_revisions_generation_link_check CHECK (
    (
      creation_method IN ('ai_generated', 'ai_assisted')
      AND generation_run_id IS NOT NULL
    )
    OR
    (
      creation_method NOT IN ('ai_generated', 'ai_assisted')
      AND generation_run_id IS NULL
    )
  ),
  CONSTRAINT person_portrait_revisions_id_person_uq UNIQUE (id, person_id)
);

CREATE INDEX IF NOT EXISTS person_portrait_revisions_person_created_idx
  ON atlas_v2.person_portrait_revisions(person_id, created_at DESC);

CREATE INDEX IF NOT EXISTS person_portrait_revisions_asset_idx
  ON atlas_v2.person_portrait_revisions(asset_sha256);

CREATE INDEX IF NOT EXISTS person_portrait_revisions_generation_run_idx
  ON atlas_v2.person_portrait_revisions(generation_run_id)
  WHERE generation_run_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS atlas_v2.person_portrait_revision_sources (
  revision_id uuid NOT NULL REFERENCES atlas_v2.person_portrait_revisions(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES atlas_v2.sources(id) ON DELETE RESTRICT,
  evidence_role text NOT NULL,
  CONSTRAINT person_portrait_revision_sources_pkey PRIMARY KEY (revision_id, source_id, evidence_role),
  CONSTRAINT person_portrait_revision_sources_evidence_role_check CHECK (
    evidence_role IN (
      'facial_reference',
      'clothing_reference',
      'iconography_reference',
      'textual_description',
      'context_reference'
    )
  )
);

ALTER TABLE atlas_v2.person_portraits
  ADD COLUMN IF NOT EXISTS current_revision_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'person_portraits_current_revision_uq'
       AND conrelid = 'atlas_v2.person_portraits'::regclass
  ) THEN
    ALTER TABLE atlas_v2.person_portraits
      ADD CONSTRAINT person_portraits_current_revision_uq UNIQUE (current_revision_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'person_portraits_current_revision_person_fkey'
       AND conrelid = 'atlas_v2.person_portraits'::regclass
  ) THEN
    ALTER TABLE atlas_v2.person_portraits
      ADD CONSTRAINT person_portraits_current_revision_person_fkey
      FOREIGN KEY (current_revision_id, person_id)
      REFERENCES atlas_v2.person_portrait_revisions(id, person_id)
      ON DELETE RESTRICT
      DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END
$$;

COMMIT;
