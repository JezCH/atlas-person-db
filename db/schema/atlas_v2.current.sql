-- ATLAS normalized v2 current schema baseline
-- Source: read-only live schema inventory ATLAS_MAINTENANCE_LIVE_SCHEMA_INVENTORY_V1 (2026-08-10/11).
-- Purpose: reconstruct the current atlas_v2 schema on a CLEAN PostgreSQL database.
-- This is a baseline, not an in-place migration. It intentionally does not create any legacy public.person_politics object.

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'atlas_v2') THEN
    RAISE EXCEPTION 'atlas_v2 schema already exists; current baseline requires a clean target';
  END IF;
END
$$;

CREATE SCHEMA atlas_v2;

CREATE TABLE atlas_v2.chronology_claims (
  id uuid NOT NULL,
  person_politics_id uuid,
  claim_type text NOT NULL,
  start_year integer,
  end_year integer
);

CREATE TABLE atlas_v2.migration_metadata (
  phase integer NOT NULL,
  phase4_closing_sha text NOT NULL,
  phase4_artifact_digest text NOT NULL,
  schema_bundle_sha256 text NOT NULL,
  data_bundle_sha256 text NOT NULL,
  expected_counts jsonb NOT NULL,
  applied_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE atlas_v2.period_bases (
  id uuid NOT NULL,
  code text NOT NULL,
  is_active boolean NOT NULL
);

CREATE TABLE atlas_v2.period_basis_names (
  id uuid NOT NULL,
  period_basis_id uuid NOT NULL,
  locale text NOT NULL,
  name text NOT NULL,
  is_preferred boolean NOT NULL
);

CREATE TABLE atlas_v2.person_descriptions (
  id uuid NOT NULL,
  person_id uuid NOT NULL,
  locale text NOT NULL,
  content text NOT NULL
);

CREATE TABLE atlas_v2.person_duplicate_candidates (
  id uuid NOT NULL,
  person_low_id uuid NOT NULL,
  person_high_id uuid NOT NULL,
  candidate_state text DEFAULT 'ACTIVE'::text NOT NULL,
  current_decision text,
  confidence numeric NOT NULL,
  evidence jsonb DEFAULT '[]'::jsonb NOT NULL,
  evidence_fingerprint text NOT NULL,
  decision_evidence_fingerprint text,
  detector_version text NOT NULL,
  first_detected_at timestamptz DEFAULT now() NOT NULL,
  last_detected_at timestamptz DEFAULT now() NOT NULL,
  reviewed_at timestamptz,
  review_count integer DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE atlas_v2.person_duplicate_reviews (
  id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  person_low_id uuid NOT NULL,
  person_high_id uuid NOT NULL,
  decision text NOT NULL,
  rationale text,
  evidence_snapshot jsonb NOT NULL,
  evidence_fingerprint text NOT NULL,
  reviewer_kind text DEFAULT 'admin_session'::text NOT NULL,
  request_id text NOT NULL,
  reviewed_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE atlas_v2.person_merge_audits (
  id uuid NOT NULL,
  request_id text NOT NULL,
  candidate_id uuid NOT NULL,
  review_id uuid NOT NULL,
  survivor_person_id uuid NOT NULL,
  source_person_id uuid NOT NULL,
  evidence_fingerprint text NOT NULL,
  reviewer_kind text NOT NULL,
  survivor_before jsonb NOT NULL,
  source_before jsonb NOT NULL,
  mutation_summary jsonb NOT NULL,
  merged_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE atlas_v2.person_names (
  id uuid NOT NULL,
  person_id uuid NOT NULL,
  locale text NOT NULL,
  name text NOT NULL,
  name_type text NOT NULL,
  is_preferred boolean NOT NULL
);

CREATE TABLE atlas_v2.person_politics_sources (
  person_politics_id uuid NOT NULL,
  source_id uuid NOT NULL,
  source_locator_key text NOT NULL
);

CREATE TABLE atlas_v2.person_politics_v2 (
  id uuid NOT NULL,
  person_id uuid NOT NULL,
  polity_id uuid NOT NULL,
  role_id uuid,
  period_basis_id uuid NOT NULL,
  activity_start integer NOT NULL,
  activity_end integer NOT NULL,
  confidence text NOT NULL,
  chronology_status text NOT NULL,
  legacy_source_key text NOT NULL,
  notes text,
  source_locator jsonb NOT NULL,
  content_hash text NOT NULL
);

CREATE TABLE atlas_v2.person_sources (
  person_id uuid NOT NULL,
  source_id uuid NOT NULL
);

CREATE TABLE atlas_v2.persons (
  id uuid NOT NULL,
  canonical_key text NOT NULL,
  person_type text NOT NULL,
  historicity text NOT NULL
);

CREATE TABLE atlas_v2.polities (
  id uuid NOT NULL,
  canonical_key text NOT NULL,
  polity_type text NOT NULL,
  historicity text NOT NULL
);

CREATE TABLE atlas_v2.polity_descriptions (
  id uuid NOT NULL,
  polity_id uuid NOT NULL,
  locale text NOT NULL,
  content text NOT NULL
);

CREATE TABLE atlas_v2.polity_names (
  id uuid NOT NULL,
  polity_id uuid NOT NULL,
  locale text NOT NULL,
  name text NOT NULL,
  name_type text NOT NULL,
  is_preferred boolean NOT NULL
);

CREATE TABLE atlas_v2.polity_sources (
  polity_id uuid NOT NULL,
  source_id uuid NOT NULL
);

CREATE TABLE atlas_v2.relationship_descriptions (
  id uuid NOT NULL,
  person_politics_id uuid NOT NULL,
  locale text NOT NULL,
  content text NOT NULL
);

CREATE TABLE atlas_v2.role_names (
  id uuid NOT NULL,
  role_id uuid NOT NULL,
  locale text NOT NULL,
  name text NOT NULL,
  is_preferred boolean NOT NULL
);

CREATE TABLE atlas_v2.roles (
  id uuid NOT NULL,
  code text NOT NULL,
  category text NOT NULL,
  source_label text NOT NULL,
  is_active boolean NOT NULL
);

CREATE TABLE atlas_v2.sources (
  id uuid NOT NULL,
  source_key text NOT NULL,
  source_type text NOT NULL,
  title text NOT NULL,
  sha256 text NOT NULL,
  bytes integer NOT NULL
);

CREATE TABLE atlas_v2.authoring_manifest_runs (
  request_id text NOT NULL,
  manifest_hash text NOT NULL,
  manifest_schema text,
  person_id uuid,
  relationship_id uuid,
  result_snapshot jsonb,
  applied_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE atlas_v2.chronology_claims ADD CONSTRAINT chronology_claims_pkey PRIMARY KEY (id);
ALTER TABLE atlas_v2.migration_metadata ADD CONSTRAINT migration_metadata_phase_check CHECK (phase = 5);
ALTER TABLE atlas_v2.migration_metadata ADD CONSTRAINT migration_metadata_pkey PRIMARY KEY (phase);
ALTER TABLE atlas_v2.period_bases ADD CONSTRAINT period_bases_pkey PRIMARY KEY (id);
ALTER TABLE atlas_v2.period_bases ADD CONSTRAINT period_bases_code_key UNIQUE (code);
ALTER TABLE atlas_v2.period_basis_names ADD CONSTRAINT period_basis_names_pkey PRIMARY KEY (id);
ALTER TABLE atlas_v2.person_descriptions ADD CONSTRAINT person_descriptions_pkey PRIMARY KEY (id);
ALTER TABLE atlas_v2.person_duplicate_candidates ADD CONSTRAINT person_duplicate_candidates_candidate_state_check CHECK (candidate_state = ANY (ARRAY['ACTIVE'::text, 'STALE'::text]));
ALTER TABLE atlas_v2.person_duplicate_candidates ADD CONSTRAINT person_duplicate_candidates_check CHECK (person_low_id < person_high_id);
ALTER TABLE atlas_v2.person_duplicate_candidates ADD CONSTRAINT person_duplicate_candidates_confidence_check CHECK (confidence >= 0::numeric AND confidence <= 1::numeric);
ALTER TABLE atlas_v2.person_duplicate_candidates ADD CONSTRAINT person_duplicate_candidates_current_decision_check CHECK (current_decision IS NULL OR (current_decision = ANY (ARRAY['MERGE'::text, 'KEEP_SEPARATE'::text, 'REVIEW'::text])));
ALTER TABLE atlas_v2.person_duplicate_candidates ADD CONSTRAINT person_duplicate_candidates_review_count_check CHECK (review_count >= 0);
ALTER TABLE atlas_v2.person_duplicate_candidates ADD CONSTRAINT person_duplicate_candidates_pkey PRIMARY KEY (id);
ALTER TABLE atlas_v2.person_duplicate_candidates ADD CONSTRAINT person_duplicate_candidates_person_low_id_person_high_id_key UNIQUE (person_low_id, person_high_id);
ALTER TABLE atlas_v2.person_duplicate_reviews ADD CONSTRAINT person_duplicate_reviews_decision_check CHECK (decision = ANY (ARRAY['MERGE'::text, 'KEEP_SEPARATE'::text, 'REVIEW'::text]));
ALTER TABLE atlas_v2.person_duplicate_reviews ADD CONSTRAINT person_duplicate_reviews_reviewer_kind_check CHECK (reviewer_kind = ANY (ARRAY['admin_session'::text, 'server_bearer'::text]));
ALTER TABLE atlas_v2.person_duplicate_reviews ADD CONSTRAINT person_duplicate_reviews_pkey PRIMARY KEY (id);
ALTER TABLE atlas_v2.person_duplicate_reviews ADD CONSTRAINT person_duplicate_reviews_request_id_key UNIQUE (request_id);
ALTER TABLE atlas_v2.person_merge_audits ADD CONSTRAINT person_merge_audits_check CHECK (survivor_person_id <> source_person_id);
ALTER TABLE atlas_v2.person_merge_audits ADD CONSTRAINT person_merge_audits_reviewer_kind_check CHECK (reviewer_kind = ANY (ARRAY['admin_session'::text, 'server_bearer'::text]));
ALTER TABLE atlas_v2.person_merge_audits ADD CONSTRAINT person_merge_audits_pkey PRIMARY KEY (id);
ALTER TABLE atlas_v2.person_merge_audits ADD CONSTRAINT person_merge_audits_request_id_key UNIQUE (request_id);
ALTER TABLE atlas_v2.person_names ADD CONSTRAINT person_names_pkey PRIMARY KEY (id);
ALTER TABLE atlas_v2.person_politics_sources ADD CONSTRAINT person_politics_sources_pkey PRIMARY KEY (person_politics_id, source_id);
ALTER TABLE atlas_v2.person_politics_v2 ADD CONSTRAINT person_politics_v2_activity_end_check CHECK (activity_end >= '-10000'::integer AND activity_end <= 9999 AND activity_end <> 0);
ALTER TABLE atlas_v2.person_politics_v2 ADD CONSTRAINT person_politics_v2_activity_start_check CHECK (activity_start >= '-10000'::integer AND activity_start <= 9999 AND activity_start <> 0);
ALTER TABLE atlas_v2.person_politics_v2 ADD CONSTRAINT person_politics_v2_check CHECK (activity_end >= activity_start);
ALTER TABLE atlas_v2.person_politics_v2 ADD CONSTRAINT person_politics_v2_pkey PRIMARY KEY (id);
ALTER TABLE atlas_v2.person_politics_v2 ADD CONSTRAINT person_politics_v2_legacy_source_key_key UNIQUE (legacy_source_key);
ALTER TABLE atlas_v2.person_sources ADD CONSTRAINT person_sources_pkey PRIMARY KEY (person_id, source_id);
ALTER TABLE atlas_v2.persons ADD CONSTRAINT persons_pkey PRIMARY KEY (id);
ALTER TABLE atlas_v2.persons ADD CONSTRAINT persons_canonical_key_key UNIQUE (canonical_key);
ALTER TABLE atlas_v2.polities ADD CONSTRAINT polities_pkey PRIMARY KEY (id);
ALTER TABLE atlas_v2.polities ADD CONSTRAINT polities_canonical_key_key UNIQUE (canonical_key);
ALTER TABLE atlas_v2.polity_descriptions ADD CONSTRAINT polity_descriptions_pkey PRIMARY KEY (id);
ALTER TABLE atlas_v2.polity_names ADD CONSTRAINT polity_names_pkey PRIMARY KEY (id);
ALTER TABLE atlas_v2.polity_sources ADD CONSTRAINT polity_sources_pkey PRIMARY KEY (polity_id, source_id);
ALTER TABLE atlas_v2.relationship_descriptions ADD CONSTRAINT relationship_descriptions_pkey PRIMARY KEY (id);
ALTER TABLE atlas_v2.role_names ADD CONSTRAINT role_names_pkey PRIMARY KEY (id);
ALTER TABLE atlas_v2.roles ADD CONSTRAINT roles_pkey PRIMARY KEY (id);
ALTER TABLE atlas_v2.roles ADD CONSTRAINT roles_code_key UNIQUE (code);
ALTER TABLE atlas_v2.sources ADD CONSTRAINT sources_bytes_check CHECK (bytes >= 0);
ALTER TABLE atlas_v2.sources ADD CONSTRAINT sources_pkey PRIMARY KEY (id);
ALTER TABLE atlas_v2.sources ADD CONSTRAINT sources_source_key_key UNIQUE (source_key);
ALTER TABLE atlas_v2.authoring_manifest_runs ADD CONSTRAINT authoring_manifest_runs_pkey PRIMARY KEY (request_id);
ALTER TABLE atlas_v2.authoring_manifest_runs ADD CONSTRAINT authoring_manifest_runs_manifest_schema_check CHECK (manifest_schema IS NULL OR manifest_schema IN ('atlas-authoring-manifest/v1', 'atlas-authoring-manifest/v2'));
ALTER TABLE atlas_v2.authoring_manifest_runs ADD CONSTRAINT authoring_manifest_runs_result_snapshot_check CHECK (result_snapshot IS NULL OR jsonb_typeof(result_snapshot) = 'object');

ALTER TABLE atlas_v2.chronology_claims ADD CONSTRAINT chronology_claims_person_politics_id_fkey FOREIGN KEY (person_politics_id) REFERENCES atlas_v2.person_politics_v2(id) ON DELETE CASCADE;
ALTER TABLE atlas_v2.period_basis_names ADD CONSTRAINT period_basis_names_period_basis_id_fkey FOREIGN KEY (period_basis_id) REFERENCES atlas_v2.period_bases(id) ON DELETE CASCADE;
ALTER TABLE atlas_v2.person_descriptions ADD CONSTRAINT person_descriptions_person_id_fkey FOREIGN KEY (person_id) REFERENCES atlas_v2.persons(id) ON DELETE CASCADE;
ALTER TABLE atlas_v2.person_duplicate_reviews ADD CONSTRAINT person_duplicate_reviews_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES atlas_v2.person_duplicate_candidates(id) ON DELETE RESTRICT;
ALTER TABLE atlas_v2.person_names ADD CONSTRAINT person_names_person_id_fkey FOREIGN KEY (person_id) REFERENCES atlas_v2.persons(id) ON DELETE CASCADE;
ALTER TABLE atlas_v2.person_politics_sources ADD CONSTRAINT person_politics_sources_person_politics_id_fkey FOREIGN KEY (person_politics_id) REFERENCES atlas_v2.person_politics_v2(id) ON DELETE CASCADE;
ALTER TABLE atlas_v2.person_politics_sources ADD CONSTRAINT person_politics_sources_source_id_fkey FOREIGN KEY (source_id) REFERENCES atlas_v2.sources(id) ON DELETE RESTRICT;
ALTER TABLE atlas_v2.person_politics_v2 ADD CONSTRAINT person_politics_v2_period_basis_id_fkey FOREIGN KEY (period_basis_id) REFERENCES atlas_v2.period_bases(id) ON DELETE RESTRICT;
ALTER TABLE atlas_v2.person_politics_v2 ADD CONSTRAINT person_politics_v2_person_id_fkey FOREIGN KEY (person_id) REFERENCES atlas_v2.persons(id) ON DELETE RESTRICT;
ALTER TABLE atlas_v2.person_politics_v2 ADD CONSTRAINT person_politics_v2_polity_id_fkey FOREIGN KEY (polity_id) REFERENCES atlas_v2.polities(id) ON DELETE RESTRICT;
ALTER TABLE atlas_v2.person_politics_v2 ADD CONSTRAINT person_politics_v2_role_id_fkey FOREIGN KEY (role_id) REFERENCES atlas_v2.roles(id) ON DELETE RESTRICT;
ALTER TABLE atlas_v2.person_sources ADD CONSTRAINT person_sources_person_id_fkey FOREIGN KEY (person_id) REFERENCES atlas_v2.persons(id) ON DELETE CASCADE;
ALTER TABLE atlas_v2.person_sources ADD CONSTRAINT person_sources_source_id_fkey FOREIGN KEY (source_id) REFERENCES atlas_v2.sources(id) ON DELETE RESTRICT;
ALTER TABLE atlas_v2.polity_descriptions ADD CONSTRAINT polity_descriptions_polity_id_fkey FOREIGN KEY (polity_id) REFERENCES atlas_v2.polities(id) ON DELETE CASCADE;
ALTER TABLE atlas_v2.polity_names ADD CONSTRAINT polity_names_polity_id_fkey FOREIGN KEY (polity_id) REFERENCES atlas_v2.polities(id) ON DELETE CASCADE;
ALTER TABLE atlas_v2.polity_sources ADD CONSTRAINT polity_sources_polity_id_fkey FOREIGN KEY (polity_id) REFERENCES atlas_v2.polities(id) ON DELETE CASCADE;
ALTER TABLE atlas_v2.polity_sources ADD CONSTRAINT polity_sources_source_id_fkey FOREIGN KEY (source_id) REFERENCES atlas_v2.sources(id) ON DELETE RESTRICT;
ALTER TABLE atlas_v2.relationship_descriptions ADD CONSTRAINT relationship_descriptions_person_politics_id_fkey FOREIGN KEY (person_politics_id) REFERENCES atlas_v2.person_politics_v2(id) ON DELETE CASCADE;
ALTER TABLE atlas_v2.role_names ADD CONSTRAINT role_names_role_id_fkey FOREIGN KEY (role_id) REFERENCES atlas_v2.roles(id) ON DELETE CASCADE;
ALTER TABLE atlas_v2.authoring_manifest_runs ADD CONSTRAINT authoring_manifest_runs_person_id_fkey FOREIGN KEY (person_id) REFERENCES atlas_v2.persons(id) ON DELETE RESTRICT;
ALTER TABLE atlas_v2.authoring_manifest_runs ADD CONSTRAINT authoring_manifest_runs_relationship_id_fkey FOREIGN KEY (relationship_id) REFERENCES atlas_v2.person_politics_v2(id) ON DELETE RESTRICT;

CREATE INDEX person_duplicate_candidates_queue_idx ON atlas_v2.person_duplicate_candidates USING btree (candidate_state, current_decision, confidence DESC, last_detected_at DESC);
CREATE INDEX person_duplicate_reviews_candidate_idx ON atlas_v2.person_duplicate_reviews USING btree (candidate_id, reviewed_at DESC);
CREATE INDEX person_merge_audits_candidate_idx ON atlas_v2.person_merge_audits USING btree (candidate_id, merged_at DESC);
CREATE INDEX person_merge_audits_source_idx ON atlas_v2.person_merge_audits USING btree (source_person_id, merged_at DESC);
CREATE INDEX person_merge_audits_survivor_idx ON atlas_v2.person_merge_audits USING btree (survivor_person_id, merged_at DESC);
CREATE UNIQUE INDEX person_names_preferred_locale_uq ON atlas_v2.person_names USING btree (person_id, locale) WHERE is_preferred;
CREATE UNIQUE INDEX person_politics_v2_null_role_semantic_uidx ON atlas_v2.person_politics_v2 USING btree (person_id, polity_id, activity_start, activity_end, period_basis_id) NULLS NOT DISTINCT WHERE (role_id IS NULL);
CREATE UNIQUE INDEX polity_names_preferred_locale_uq ON atlas_v2.polity_names USING btree (polity_id, locale) WHERE is_preferred;

COMMIT;