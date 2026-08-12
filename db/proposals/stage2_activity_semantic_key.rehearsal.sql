-- ATLAS Stage 2 Activity semantic identity — REHEARSAL ONLY
--
-- Requires the current atlas_v2 baseline plus stage2_semantic_extensions.rehearsal.sql.
-- This proposal is intentionally NOT registered in the Production migration runner.
--
-- Final identity dimensions:
--   Person UUID
--   Polity UUID
--   Relation Type UUID
--   Role UUID/null
--   Period Basis UUID
--   full interpreted start/end boundary components + granularity + calendar
--
-- Excluded from identity:
--   temporal certainty, confidence, chronology status, notes, sources/provenance,
--   display/canonical names and content hashes.
--
-- IMPORTANT CUTOVER DEPENDENCY
-- The current v1 null-role unique index predates Relation Type and sub-year boundaries.
-- P9 must replace it coherently across DB and every active identity consumer.
-- This DROP is rehearsal-only and fail-closed if the reviewed legacy index is absent.

BEGIN;

DROP INDEX atlas_v2.person_politics_v2_null_role_semantic_uidx;

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
