BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-authoring:place-historical-relations:v1'));
SET LOCAL lock_timeout = '10s';

CREATE TABLE IF NOT EXISTS atlas_v2.person_place_facts (
  person_id uuid NOT NULL REFERENCES atlas_v2.persons(id) ON DELETE CASCADE,
  relation_type text NOT NULL,
  place_id uuid NOT NULL REFERENCES atlas_v2.places(id) ON DELETE RESTRICT,
  source_id uuid NOT NULL REFERENCES atlas_v2.sources(id) ON DELETE RESTRICT,
  source_locator_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(person_id, relation_type),
  CONSTRAINT person_place_facts_relation_type_ck
    CHECK (relation_type IN ('birth_place','death_place')),
  CONSTRAINT person_place_facts_locator_nonempty_ck
    CHECK (length(btrim(source_locator_key)) > 0)
);

CREATE INDEX IF NOT EXISTS person_place_facts_place_idx
  ON atlas_v2.person_place_facts(place_id);

CREATE INDEX IF NOT EXISTS person_place_facts_source_idx
  ON atlas_v2.person_place_facts(source_id);

COMMIT;
