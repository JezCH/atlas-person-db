-- ATLAS Stage 2 Activity semantic identity — REHEARSAL ONLY
--
-- Requires the current atlas_v2 baseline plus stage2_semantic_extensions.rehearsal.sql.
-- This proposal is intentionally NOT registered in the Production migration runner.
-- It proves the final duplicate-identity shape without mutating Production.
--
-- Identity dimensions:
--   Person UUID
--   Polity UUID
--   Relation Type UUID
--   Role UUID/null
--   Period Basis UUID
--   full start/end historical boundary components + granularity + calendar
--
-- Deliberately excluded from identity:
--   temporal certainty, confidence, chronology status, notes, sources/provenance,
--   display/canonical names and content hashes.

BEGIN;

CREATE UNIQUE INDEX person_politics_v2_stage2_semantic_identity_uq
  ON atlas_v2.person_politics_v2 (
    person_id,
    polity_id,
    relation_type_id,
    role_id,
    period_basis_id,
    activity_start,
    activity_start_month,
    activity_start_day,
    activity_start_granularity,
    activity_start_calendar,
    activity_end,
    activity_end_month,
    activity_end_day,
    activity_end_granularity,
    activity_end_calendar
  ) NULLS NOT DISTINCT
  WHERE relation_type_id IS NOT NULL
    AND activity_start_granularity IS NOT NULL
    AND activity_start_calendar IS NOT NULL
    AND activity_end_granularity IS NOT NULL
    AND activity_end_calendar IS NOT NULL;

COMMIT;
