BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-authoring:context-objects:v1'));
SET LOCAL lock_timeout='10s';

CREATE TABLE IF NOT EXISTS atlas_v2.governance_contexts (
 id uuid PRIMARY KEY, canonical_key text NOT NULL UNIQUE, governance_type text NOT NULL, historicity text NOT NULL,
 CONSTRAINT governance_contexts_type_ck CHECK(governance_type IN ('government','constitutional_regime','governing_regime')));
CREATE TABLE IF NOT EXISTS atlas_v2.governance_context_names (
 id uuid PRIMARY KEY, governance_context_id uuid NOT NULL REFERENCES atlas_v2.governance_contexts(id) ON DELETE CASCADE,
 locale text NOT NULL,name text NOT NULL,name_type text NOT NULL,is_preferred boolean NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS governance_context_names_preferred_locale_uq ON atlas_v2.governance_context_names(governance_context_id,locale) WHERE is_preferred;
CREATE TABLE IF NOT EXISTS atlas_v2.governance_context_sources (
 governance_context_id uuid NOT NULL REFERENCES atlas_v2.governance_contexts(id) ON DELETE CASCADE,
 source_id uuid NOT NULL REFERENCES atlas_v2.sources(id) ON DELETE RESTRICT,source_locator_key text NOT NULL,
 PRIMARY KEY(governance_context_id,source_id,source_locator_key));

CREATE TABLE IF NOT EXISTS atlas_v2.people_groups (
 id uuid PRIMARY KEY,canonical_key text NOT NULL UNIQUE,people_type text NOT NULL,historicity text NOT NULL,notes text,
 CONSTRAINT people_groups_type_ck CHECK(people_type IN ('ethnic_group','ethnolinguistic_group','cultural_people','tribal_people','other_people_group')));
CREATE TABLE IF NOT EXISTS atlas_v2.people_group_names (
 id uuid PRIMARY KEY,people_group_id uuid NOT NULL REFERENCES atlas_v2.people_groups(id) ON DELETE CASCADE,
 locale text NOT NULL,name text NOT NULL,name_type text NOT NULL,is_preferred boolean NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS people_group_names_preferred_locale_uq ON atlas_v2.people_group_names(people_group_id,locale) WHERE is_preferred;
CREATE TABLE IF NOT EXISTS atlas_v2.people_group_sources (
 people_group_id uuid NOT NULL REFERENCES atlas_v2.people_groups(id) ON DELETE CASCADE,
 source_id uuid NOT NULL REFERENCES atlas_v2.sources(id) ON DELETE RESTRICT,source_locator_key text NOT NULL,
 PRIMARY KEY(people_group_id,source_id,source_locator_key));

CREATE TABLE IF NOT EXISTS atlas_v2.historical_events (
 id uuid PRIMARY KEY,canonical_key text NOT NULL UNIQUE,event_type text NOT NULL,historicity text NOT NULL,
 valid_from_year integer,valid_to_year integer,confidence text NOT NULL,notes text,
 CONSTRAINT historical_events_type_ck CHECK(event_type IN ('military_conflict','expedition','political_event','migration','other_historical_event')),
 CONSTRAINT historical_events_year_order_ck CHECK(valid_from_year IS NULL OR valid_to_year IS NULL OR valid_to_year>=valid_from_year));
CREATE TABLE IF NOT EXISTS atlas_v2.historical_event_names (
 id uuid PRIMARY KEY,historical_event_id uuid NOT NULL REFERENCES atlas_v2.historical_events(id) ON DELETE CASCADE,
 locale text NOT NULL,name text NOT NULL,name_type text NOT NULL,is_preferred boolean NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS historical_event_names_preferred_locale_uq ON atlas_v2.historical_event_names(historical_event_id,locale) WHERE is_preferred;
CREATE TABLE IF NOT EXISTS atlas_v2.historical_event_sources (
 historical_event_id uuid NOT NULL REFERENCES atlas_v2.historical_events(id) ON DELETE CASCADE,
 source_id uuid NOT NULL REFERENCES atlas_v2.sources(id) ON DELETE RESTRICT,source_locator_key text NOT NULL,
 PRIMARY KEY(historical_event_id,source_id,source_locator_key));

CREATE TABLE IF NOT EXISTS atlas_v2.person_people_affiliations (
 id uuid PRIMARY KEY,person_id uuid NOT NULL REFERENCES atlas_v2.persons(id) ON DELETE RESTRICT,
 people_group_id uuid NOT NULL REFERENCES atlas_v2.people_groups(id) ON DELETE RESTRICT,affiliation_type text NOT NULL,
 confidence text NOT NULL,notes text,
 CONSTRAINT person_people_affiliations_type_ck CHECK(affiliation_type IN ('member_of','born_into','identified_with','associated_with')));
CREATE TABLE IF NOT EXISTS atlas_v2.person_event_participations (
 id uuid PRIMARY KEY,person_id uuid NOT NULL REFERENCES atlas_v2.persons(id) ON DELETE RESTRICT,
 historical_event_id uuid NOT NULL REFERENCES atlas_v2.historical_events(id) ON DELETE RESTRICT,participation_type text NOT NULL,
 role_label text,confidence text NOT NULL,notes text,
 CONSTRAINT person_event_participations_type_ck CHECK(participation_type IN ('participant','commander','interpreter','envoy','organizer','witness','subject')));
CREATE TABLE IF NOT EXISTS atlas_v2.person_people_affiliation_sources (
 person_people_affiliation_id uuid NOT NULL REFERENCES atlas_v2.person_people_affiliations(id) ON DELETE CASCADE,
 source_id uuid NOT NULL REFERENCES atlas_v2.sources(id) ON DELETE RESTRICT,source_locator_key text NOT NULL,
 PRIMARY KEY(person_people_affiliation_id,source_id,source_locator_key));
CREATE TABLE IF NOT EXISTS atlas_v2.person_event_participation_sources (
 person_event_participation_id uuid NOT NULL REFERENCES atlas_v2.person_event_participations(id) ON DELETE CASCADE,
 source_id uuid NOT NULL REFERENCES atlas_v2.sources(id) ON DELETE RESTRICT,source_locator_key text NOT NULL,
 PRIMARY KEY(person_event_participation_id,source_id,source_locator_key));
COMMIT;
