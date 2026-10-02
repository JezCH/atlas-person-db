BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-authoring:p14-territory-geometry-authority:v1'));
SET LOCAL lock_timeout='10s';

CREATE TABLE IF NOT EXISTS atlas_v2.geometries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  geometry_kind text NOT NULL,
  geometry_ref text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT geometries_kind_ck CHECK(geometry_kind IN ('point','line','polygon','multipolygon')),
  CONSTRAINT geometries_ref_ck CHECK(length(btrim(geometry_ref)) > 0)
);

CREATE TABLE IF NOT EXISTS atlas_v2.geometry_sources (
  geometry_id uuid NOT NULL REFERENCES atlas_v2.geometries(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES atlas_v2.sources(id) ON DELETE RESTRICT,
  source_locator_key text NOT NULL,
  PRIMARY KEY(geometry_id,source_id,source_locator_key),
  CONSTRAINT geometry_sources_locator_ck CHECK(length(btrim(source_locator_key)) > 0)
);

CREATE TABLE IF NOT EXISTS atlas_v2.territory_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semantic_key text NOT NULL UNIQUE,
  polity_id uuid NOT NULL REFERENCES atlas_v2.polities(id) ON DELETE RESTRICT,
  geometry_id uuid NOT NULL REFERENCES atlas_v2.geometries(id) ON DELETE RESTRICT,
  control_type text NOT NULL,
  boundary_certainty text NOT NULL,
  evidence_confidence text NOT NULL,

  valid_start integer,
  valid_start_month smallint,
  valid_start_day smallint,
  valid_start_granularity text,
  valid_start_certainty text,
  valid_start_calendar text,

  valid_end integer,
  valid_end_month smallint,
  valid_end_day smallint,
  valid_end_granularity text,
  valid_end_certainty text,
  valid_end_calendar text,

  chronology_status text NOT NULL DEFAULT 'reviewed',
  ongoing_as_of date,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT territory_records_control_type_ck CHECK(control_type IN (
    'sovereign_control','de_facto_control','tributary_control','occupied_control',
    'contested_control','administrative_control','other_reviewed_control'
  )),
  CONSTRAINT territory_records_boundary_certainty_ck CHECK(boundary_certainty IN ('exact','approximate','disputed','partial','unknown')),
  CONSTRAINT territory_records_evidence_confidence_ck CHECK(evidence_confidence IN ('well_established','probable','uncertain')),
  CONSTRAINT territory_records_chronology_status_ck CHECK(chronology_status IN ('reviewed','ongoing')),

  CONSTRAINT territory_records_start_boundary_ck CHECK(
    (
      valid_start IS NULL
      AND valid_start_month IS NULL
      AND valid_start_day IS NULL
      AND valid_start_granularity IS NULL
      AND valid_start_certainty IS NULL
      AND valid_start_calendar IS NULL
    )
    OR
    (
      valid_start BETWEEN -10000 AND 9999
      AND valid_start <> 0
      AND valid_start_granularity IN ('year','month','day')
      AND valid_start_certainty IN ('exact','approximate','uncertain')
      AND valid_start_calendar IN ('gregorian','julian','unspecified_historical','source_calendar')
      AND valid_start_month IS NULL OR valid_start_month BETWEEN 1 AND 12
    )
  ),
  CONSTRAINT territory_records_start_shape_ck CHECK(
    valid_start IS NULL
    OR (valid_start_granularity='year' AND valid_start_month IS NULL AND valid_start_day IS NULL)
    OR (valid_start_granularity='month' AND valid_start_month IS NOT NULL AND valid_start_day IS NULL)
    OR (valid_start_granularity='day' AND valid_start_month IS NOT NULL AND valid_start_day BETWEEN 1 AND 31)
  ),

  CONSTRAINT territory_records_end_boundary_ck CHECK(
    (
      valid_end IS NULL
      AND valid_end_month IS NULL
      AND valid_end_day IS NULL
      AND valid_end_granularity IS NULL
      AND valid_end_certainty IS NULL
      AND valid_end_calendar IS NULL
    )
    OR
    (
      valid_end BETWEEN -10000 AND 9999
      AND valid_end <> 0
      AND valid_end_granularity IN ('year','month','day')
      AND valid_end_certainty IN ('exact','approximate','uncertain')
      AND valid_end_calendar IN ('gregorian','julian','unspecified_historical','source_calendar')
      AND (valid_end_month IS NULL OR valid_end_month BETWEEN 1 AND 12)
    )
  ),
  CONSTRAINT territory_records_end_shape_ck CHECK(
    valid_end IS NULL
    OR (valid_end_granularity='year' AND valid_end_month IS NULL AND valid_end_day IS NULL)
    OR (valid_end_granularity='month' AND valid_end_month IS NOT NULL AND valid_end_day IS NULL)
    OR (valid_end_granularity='day' AND valid_end_month IS NOT NULL AND valid_end_day BETWEEN 1 AND 31)
  ),

  CONSTRAINT territory_records_ongoing_ck CHECK(
    (
      chronology_status='ongoing'
      AND valid_end IS NULL
      AND valid_end_month IS NULL
      AND valid_end_day IS NULL
      AND valid_end_granularity IS NULL
      AND valid_end_certainty IS NULL
      AND valid_end_calendar IS NULL
      AND ongoing_as_of IS NOT NULL
    )
    OR
    (
      chronology_status='reviewed'
      AND ongoing_as_of IS NULL
    )
  ),
  CONSTRAINT territory_records_interval_ck CHECK(
    valid_start IS NULL OR valid_end IS NULL OR valid_start <= valid_end
  )
);

CREATE INDEX IF NOT EXISTS territory_records_polity_idx
  ON atlas_v2.territory_records(polity_id);
CREATE INDEX IF NOT EXISTS territory_records_geometry_idx
  ON atlas_v2.territory_records(geometry_id);

CREATE TABLE IF NOT EXISTS atlas_v2.territory_record_sources (
  territory_record_id uuid NOT NULL REFERENCES atlas_v2.territory_records(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES atlas_v2.sources(id) ON DELETE RESTRICT,
  source_locator_key text NOT NULL,
  PRIMARY KEY(territory_record_id,source_id,source_locator_key),
  CONSTRAINT territory_record_sources_locator_ck CHECK(length(btrim(source_locator_key)) > 0)
);

COMMIT;
