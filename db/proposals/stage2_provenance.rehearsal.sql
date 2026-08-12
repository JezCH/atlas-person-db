-- ATLAS Stage 2 normalized provenance — REHEARSAL ONLY
--
-- Requires stage2_semantic_extensions.rehearsal.sql to have been applied on the
-- same disposable PostgreSQL database. This file is NOT registered in any
-- Production migration runner.
--
-- Each assertion/source pair may carry multiple distinct locator keys. This is
-- intentional: one source can support one assertion at several pages/sections.
--
-- Do not apply to Production.

BEGIN;

CREATE TABLE atlas_v2.polity_governance_period_sources (
  polity_governance_period_id uuid NOT NULL,
  source_id uuid NOT NULL,
  source_locator_key text NOT NULL,
  CONSTRAINT polity_governance_period_sources_pkey
    PRIMARY KEY (polity_governance_period_id, source_id, source_locator_key),
  CONSTRAINT polity_governance_period_sources_locator_check
    CHECK (length(btrim(source_locator_key)) > 0),
  CONSTRAINT polity_governance_period_sources_period_id_fkey
    FOREIGN KEY (polity_governance_period_id)
    REFERENCES atlas_v2.polity_governance_periods(id)
    ON DELETE CASCADE,
  CONSTRAINT polity_governance_period_sources_source_id_fkey
    FOREIGN KEY (source_id)
    REFERENCES atlas_v2.sources(id)
    ON DELETE RESTRICT
);
CREATE INDEX polity_governance_period_sources_source_idx
  ON atlas_v2.polity_governance_period_sources (source_id);

CREATE TABLE atlas_v2.polity_relation_sources (
  polity_relation_id uuid NOT NULL,
  source_id uuid NOT NULL,
  source_locator_key text NOT NULL,
  CONSTRAINT polity_relation_sources_pkey
    PRIMARY KEY (polity_relation_id, source_id, source_locator_key),
  CONSTRAINT polity_relation_sources_locator_check
    CHECK (length(btrim(source_locator_key)) > 0),
  CONSTRAINT polity_relation_sources_relation_id_fkey
    FOREIGN KEY (polity_relation_id)
    REFERENCES atlas_v2.polity_relations(id)
    ON DELETE CASCADE,
  CONSTRAINT polity_relation_sources_source_id_fkey
    FOREIGN KEY (source_id)
    REFERENCES atlas_v2.sources(id)
    ON DELETE RESTRICT
);
CREATE INDEX polity_relation_sources_source_idx
  ON atlas_v2.polity_relation_sources (source_id);

CREATE TABLE atlas_v2.polity_designation_sources (
  polity_designation_id uuid NOT NULL,
  source_id uuid NOT NULL,
  source_locator_key text NOT NULL,
  CONSTRAINT polity_designation_sources_pkey
    PRIMARY KEY (polity_designation_id, source_id, source_locator_key),
  CONSTRAINT polity_designation_sources_locator_check
    CHECK (length(btrim(source_locator_key)) > 0),
  CONSTRAINT polity_designation_sources_designation_id_fkey
    FOREIGN KEY (polity_designation_id)
    REFERENCES atlas_v2.polity_designations(id)
    ON DELETE CASCADE,
  CONSTRAINT polity_designation_sources_source_id_fkey
    FOREIGN KEY (source_id)
    REFERENCES atlas_v2.sources(id)
    ON DELETE RESTRICT
);
CREATE INDEX polity_designation_sources_source_idx
  ON atlas_v2.polity_designation_sources (source_id);

CREATE TABLE atlas_v2.polity_identity_relation_sources (
  polity_identity_relation_id uuid NOT NULL,
  source_id uuid NOT NULL,
  source_locator_key text NOT NULL,
  CONSTRAINT polity_identity_relation_sources_pkey
    PRIMARY KEY (polity_identity_relation_id, source_id, source_locator_key),
  CONSTRAINT polity_identity_relation_sources_locator_check
    CHECK (length(btrim(source_locator_key)) > 0),
  CONSTRAINT polity_identity_relation_sources_relation_id_fkey
    FOREIGN KEY (polity_identity_relation_id)
    REFERENCES atlas_v2.polity_identity_relations(id)
    ON DELETE CASCADE,
  CONSTRAINT polity_identity_relation_sources_source_id_fkey
    FOREIGN KEY (source_id)
    REFERENCES atlas_v2.sources(id)
    ON DELETE RESTRICT
);
CREATE INDEX polity_identity_relation_sources_source_idx
  ON atlas_v2.polity_identity_relation_sources (source_id);

COMMIT;
