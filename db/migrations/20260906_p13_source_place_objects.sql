BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-authoring:p13-source-place-objects:v1'));
SET LOCAL lock_timeout = '10s';

CREATE TABLE IF NOT EXISTS atlas_v2.places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_key text NOT NULL UNIQUE,
  place_type text NOT NULL DEFAULT 'historical_place',
  historicity text NOT NULL DEFAULT 'historical',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS atlas_v2.place_names (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES atlas_v2.places(id) ON DELETE CASCADE,
  locale text NOT NULL,
  name text NOT NULL,
  name_type text NOT NULL,
  is_preferred boolean NOT NULL DEFAULT false,
  UNIQUE(place_id, locale, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS place_names_preferred_locale_uq
  ON atlas_v2.place_names(place_id, locale)
  WHERE is_preferred = true;

CREATE TABLE IF NOT EXISTS atlas_v2.place_sources (
  place_id uuid NOT NULL REFERENCES atlas_v2.places(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES atlas_v2.sources(id) ON DELETE RESTRICT,
  source_locator_key text NOT NULL,
  PRIMARY KEY(place_id, source_id, source_locator_key)
);

COMMIT;
