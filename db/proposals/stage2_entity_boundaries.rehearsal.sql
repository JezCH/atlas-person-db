-- ATLAS Stage 2 entity boundaries (Polity naming + People/Event) — REHEARSAL ONLY
--
-- Requires atlas_v2.current.sql and stage2_semantic_extensions.rehearsal.sql.
-- This proposal is intentionally NOT registered in any Production migration runner.
-- It proves that People/Event authoring can coexist with Polity authoring without
-- polluting Person–Polity Activity identity, and that editorial catalog labels can
-- be explicitly distinguished from historical names.
--
-- Do not apply to Production.

BEGIN;

ALTER TABLE atlas_v2.polity_names
  ADD COLUMN semantic_name_kind text;

ALTER TABLE atlas_v2.polity_names
  ADD CONSTRAINT polity_names_semantic_name_kind_check
  CHECK (semantic_name_kind IS NULL OR semantic_name_kind IN (
    'historical_official',
    'historical_attested',
    'historiographic_conventional',
    'editorial_catalog_label'
  ));

CREATE TABLE atlas_v2.people_groups (
  id uuid NOT NULL,
  canonical_key text NOT NULL,
  people_type text NOT NULL,
  historicity text NOT NULL,
  notes text,
  CONSTRAINT people_groups_pkey PRIMARY KEY (id),
  CONSTRAINT people_groups_canonical_key_key UNIQUE (canonical_key),
  CONSTRAINT people_groups_people_type_check CHECK (people_type IN (
    'ethnic_group','ethnolinguistic_group','cultural_people','tribal_people','other_people_group'
  ))
);

CREATE TABLE atlas_v2.people_group_names (
  id uuid NOT NULL,
  people_group_id uuid NOT NULL,
  locale text NOT NULL,
  name text NOT NULL,
  name_type text NOT NULL,
  is_preferred boolean NOT NULL,
  CONSTRAINT people_group_names_pkey PRIMARY KEY (id),
  CONSTRAINT people_group_names_people_group_id_fkey
    FOREIGN KEY (people_group_id) REFERENCES atlas_v2.people_groups(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX people_group_names_preferred_locale_uq
  ON atlas_v2.people_group_names (people_group_id, locale) WHERE is_preferred;

CREATE TABLE atlas_v2.historical_events (
  id uuid NOT NULL,
  canonical_key text NOT NULL,
  event_type text NOT NULL,
  historicity text NOT NULL,
  valid_from_year integer,
  valid_from_month smallint,
  valid_from_day smallint,
  valid_from_granularity text,
  valid_from_certainty text,
  valid_from_calendar text,
  valid_to_year integer,
  valid_to_month smallint,
  valid_to_day smallint,
  valid_to_granularity text,
  valid_to_certainty text,
  valid_to_calendar text,
  confidence text NOT NULL,
  notes text,
  CONSTRAINT historical_events_pkey PRIMARY KEY (id),
  CONSTRAINT historical_events_canonical_key_key UNIQUE (canonical_key),
  CONSTRAINT historical_events_event_type_check CHECK (event_type IN (
    'military_conflict','expedition','political_event','migration','other_historical_event'
  )),
  CONSTRAINT historical_events_from_boundary_check CHECK (
    atlas_v2.temporal_boundary_or_unresolved_valid(valid_from_year,valid_from_month,valid_from_day,valid_from_granularity,valid_from_certainty,valid_from_calendar)
  ),
  CONSTRAINT historical_events_to_boundary_check CHECK (
    atlas_v2.temporal_boundary_or_unresolved_valid(valid_to_year,valid_to_month,valid_to_day,valid_to_granularity,valid_to_certainty,valid_to_calendar)
  ),
  CONSTRAINT historical_events_year_order_check CHECK (valid_from_year IS NULL OR valid_to_year IS NULL OR valid_to_year >= valid_from_year)
);

CREATE TABLE atlas_v2.historical_event_names (
  id uuid NOT NULL,
  historical_event_id uuid NOT NULL,
  locale text NOT NULL,
  name text NOT NULL,
  name_type text NOT NULL,
  is_preferred boolean NOT NULL,
  CONSTRAINT historical_event_names_pkey PRIMARY KEY (id),
  CONSTRAINT historical_event_names_event_id_fkey
    FOREIGN KEY (historical_event_id) REFERENCES atlas_v2.historical_events(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX historical_event_names_preferred_locale_uq
  ON atlas_v2.historical_event_names (historical_event_id, locale) WHERE is_preferred;

CREATE TABLE atlas_v2.person_people_affiliations (
  id uuid NOT NULL,
  person_id uuid NOT NULL,
  people_group_id uuid NOT NULL,
  affiliation_type text NOT NULL,
  valid_from_year integer,
  valid_from_month smallint,
  valid_from_day smallint,
  valid_from_granularity text,
  valid_from_certainty text,
  valid_from_calendar text,
  valid_to_year integer,
  valid_to_month smallint,
  valid_to_day smallint,
  valid_to_granularity text,
  valid_to_certainty text,
  valid_to_calendar text,
  confidence text NOT NULL,
  notes text,
  CONSTRAINT person_people_affiliations_pkey PRIMARY KEY (id),
  CONSTRAINT person_people_affiliations_person_id_fkey FOREIGN KEY (person_id) REFERENCES atlas_v2.persons(id) ON DELETE RESTRICT,
  CONSTRAINT person_people_affiliations_people_group_id_fkey FOREIGN KEY (people_group_id) REFERENCES atlas_v2.people_groups(id) ON DELETE RESTRICT,
  CONSTRAINT person_people_affiliations_type_check CHECK (affiliation_type IN ('member_of','born_into','identified_with','associated_with')),
  CONSTRAINT person_people_affiliations_from_boundary_check CHECK (
    atlas_v2.temporal_boundary_or_unresolved_valid(valid_from_year,valid_from_month,valid_from_day,valid_from_granularity,valid_from_certainty,valid_from_calendar)
  ),
  CONSTRAINT person_people_affiliations_to_boundary_check CHECK (
    atlas_v2.temporal_boundary_or_unresolved_valid(valid_to_year,valid_to_month,valid_to_day,valid_to_granularity,valid_to_certainty,valid_to_calendar)
  ),
  CONSTRAINT person_people_affiliations_year_order_check CHECK (valid_from_year IS NULL OR valid_to_year IS NULL OR valid_to_year >= valid_from_year)
);

CREATE TABLE atlas_v2.person_event_participations (
  id uuid NOT NULL,
  person_id uuid NOT NULL,
  historical_event_id uuid NOT NULL,
  participation_type text NOT NULL,
  role_label text,
  valid_from_year integer,
  valid_from_month smallint,
  valid_from_day smallint,
  valid_from_granularity text,
  valid_from_certainty text,
  valid_from_calendar text,
  valid_to_year integer,
  valid_to_month smallint,
  valid_to_day smallint,
  valid_to_granularity text,
  valid_to_certainty text,
  valid_to_calendar text,
  confidence text NOT NULL,
  notes text,
  CONSTRAINT person_event_participations_pkey PRIMARY KEY (id),
  CONSTRAINT person_event_participations_person_id_fkey FOREIGN KEY (person_id) REFERENCES atlas_v2.persons(id) ON DELETE RESTRICT,
  CONSTRAINT person_event_participations_event_id_fkey FOREIGN KEY (historical_event_id) REFERENCES atlas_v2.historical_events(id) ON DELETE RESTRICT,
  CONSTRAINT person_event_participations_type_check CHECK (participation_type IN ('participant','commander','interpreter','envoy','organizer','witness','subject')),
  CONSTRAINT person_event_participations_from_boundary_check CHECK (
    atlas_v2.temporal_boundary_or_unresolved_valid(valid_from_year,valid_from_month,valid_from_day,valid_from_granularity,valid_from_certainty,valid_from_calendar)
  ),
  CONSTRAINT person_event_participations_to_boundary_check CHECK (
    atlas_v2.temporal_boundary_or_unresolved_valid(valid_to_year,valid_to_month,valid_to_day,valid_to_granularity,valid_to_certainty,valid_to_calendar)
  ),
  CONSTRAINT person_event_participations_year_order_check CHECK (valid_from_year IS NULL OR valid_to_year IS NULL OR valid_to_year >= valid_from_year)
);

CREATE TABLE atlas_v2.people_group_sources (
  people_group_id uuid NOT NULL,
  source_id uuid NOT NULL,
  source_locator_key text NOT NULL,
  CONSTRAINT people_group_sources_pkey PRIMARY KEY (people_group_id,source_id,source_locator_key),
  CONSTRAINT people_group_sources_locator_check CHECK (length(btrim(source_locator_key)) > 0),
  CONSTRAINT people_group_sources_group_id_fkey FOREIGN KEY (people_group_id) REFERENCES atlas_v2.people_groups(id) ON DELETE CASCADE,
  CONSTRAINT people_group_sources_source_id_fkey FOREIGN KEY (source_id) REFERENCES atlas_v2.sources(id) ON DELETE RESTRICT
);
CREATE INDEX people_group_sources_source_idx ON atlas_v2.people_group_sources(source_id);

CREATE TABLE atlas_v2.historical_event_sources (
  historical_event_id uuid NOT NULL,
  source_id uuid NOT NULL,
  source_locator_key text NOT NULL,
  CONSTRAINT historical_event_sources_pkey PRIMARY KEY (historical_event_id,source_id,source_locator_key),
  CONSTRAINT historical_event_sources_locator_check CHECK (length(btrim(source_locator_key)) > 0),
  CONSTRAINT historical_event_sources_event_id_fkey FOREIGN KEY (historical_event_id) REFERENCES atlas_v2.historical_events(id) ON DELETE CASCADE,
  CONSTRAINT historical_event_sources_source_id_fkey FOREIGN KEY (source_id) REFERENCES atlas_v2.sources(id) ON DELETE RESTRICT
);
CREATE INDEX historical_event_sources_source_idx ON atlas_v2.historical_event_sources(source_id);

CREATE TABLE atlas_v2.person_people_affiliation_sources (
  person_people_affiliation_id uuid NOT NULL,
  source_id uuid NOT NULL,
  source_locator_key text NOT NULL,
  CONSTRAINT person_people_affiliation_sources_pkey PRIMARY KEY (person_people_affiliation_id,source_id,source_locator_key),
  CONSTRAINT person_people_affiliation_sources_locator_check CHECK (length(btrim(source_locator_key)) > 0),
  CONSTRAINT person_people_affiliation_sources_affiliation_id_fkey FOREIGN KEY (person_people_affiliation_id) REFERENCES atlas_v2.person_people_affiliations(id) ON DELETE CASCADE,
  CONSTRAINT person_people_affiliation_sources_source_id_fkey FOREIGN KEY (source_id) REFERENCES atlas_v2.sources(id) ON DELETE RESTRICT
);
CREATE INDEX person_people_affiliation_sources_source_idx ON atlas_v2.person_people_affiliation_sources(source_id);

CREATE TABLE atlas_v2.person_event_participation_sources (
  person_event_participation_id uuid NOT NULL,
  source_id uuid NOT NULL,
  source_locator_key text NOT NULL,
  CONSTRAINT person_event_participation_sources_pkey PRIMARY KEY (person_event_participation_id,source_id,source_locator_key),
  CONSTRAINT person_event_participation_sources_locator_check CHECK (length(btrim(source_locator_key)) > 0),
  CONSTRAINT person_event_participation_sources_participation_id_fkey FOREIGN KEY (person_event_participation_id) REFERENCES atlas_v2.person_event_participations(id) ON DELETE CASCADE,
  CONSTRAINT person_event_participation_sources_source_id_fkey FOREIGN KEY (source_id) REFERENCES atlas_v2.sources(id) ON DELETE RESTRICT
);
CREATE INDEX person_event_participation_sources_source_idx ON atlas_v2.person_event_participation_sources(source_id);

COMMIT;
