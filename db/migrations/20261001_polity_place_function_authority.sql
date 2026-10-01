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

COMMIT;
