-- ATLAS Stage 2 semantic extensions — REHEARSAL ONLY
--
-- This file is intentionally NOT registered in any Production migration runner.
-- It exists only to prove that the reviewed domain model can coexist with the
-- current normalized atlas_v2 schema on fresh PostgreSQL.
--
-- Do not apply to Production.

BEGIN;

-- One immutable boundary-detail validator is shared by Activity, Governance,
-- Polity relations, designations and identity transitions so the proposed
-- temporal contract cannot silently drift between entity families.
--
-- This validates historical component SHAPE only. Full chronological ordering
-- across different calendars/precisions remains an application/domain concern.
CREATE FUNCTION atlas_v2.temporal_boundary_detail_valid(
  boundary_month smallint,
  boundary_day smallint,
  boundary_granularity text,
  boundary_certainty text,
  boundary_calendar text
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    boundary_granularity IN ('year','month','day')
    AND boundary_certainty IN ('exact','approximate','uncertain')
    AND boundary_calendar IN ('gregorian','julian','unspecified_historical','source_calendar')
    AND (boundary_month IS NULL OR boundary_month BETWEEN 1 AND 12)
    AND (boundary_day IS NULL OR boundary_day BETWEEN 1 AND 31)
    AND (
      (boundary_granularity = 'year' AND boundary_month IS NULL AND boundary_day IS NULL)
      OR (boundary_granularity = 'month' AND boundary_month IS NOT NULL AND boundary_day IS NULL)
      OR (boundary_granularity = 'day' AND boundary_month IS NOT NULL AND boundary_day IS NOT NULL)
    ),
    false
  );
$$;

CREATE TABLE atlas_v2.person_polity_relation_types (
  id uuid NOT NULL,
  code text NOT NULL,
  category text NOT NULL,
  is_active boolean NOT NULL,
  CONSTRAINT person_polity_relation_types_pkey PRIMARY KEY (id),
  CONSTRAINT person_polity_relation_types_code_key UNIQUE (code)
);

ALTER TABLE atlas_v2.person_politics_v2
  ADD COLUMN relation_type_id uuid,
  ADD COLUMN activity_start_month smallint,
  ADD COLUMN activity_start_day smallint,
  ADD COLUMN activity_start_granularity text,
  ADD COLUMN activity_start_certainty text,
  ADD COLUMN activity_start_calendar text,
  ADD COLUMN activity_end_month smallint,
  ADD COLUMN activity_end_day smallint,
  ADD COLUMN activity_end_granularity text,
  ADD COLUMN activity_end_certainty text,
  ADD COLUMN activity_end_calendar text;

ALTER TABLE atlas_v2.person_politics_v2
  ADD CONSTRAINT person_politics_v2_relation_type_id_fkey
    FOREIGN KEY (relation_type_id)
    REFERENCES atlas_v2.person_polity_relation_types(id)
    ON DELETE RESTRICT,
  ADD CONSTRAINT person_politics_v2_activity_start_detail_shape_check
    CHECK (
      (
        activity_start_month IS NULL
        AND activity_start_day IS NULL
        AND activity_start_granularity IS NULL
        AND activity_start_certainty IS NULL
        AND activity_start_calendar IS NULL
      )
      OR atlas_v2.temporal_boundary_detail_valid(
        activity_start_month,
        activity_start_day,
        activity_start_granularity,
        activity_start_certainty,
        activity_start_calendar
      )
    ),
  ADD CONSTRAINT person_politics_v2_activity_end_detail_shape_check
    CHECK (
      (
        activity_end_month IS NULL
        AND activity_end_day IS NULL
        AND activity_end_granularity IS NULL
        AND activity_end_certainty IS NULL
        AND activity_end_calendar IS NULL
      )
      OR atlas_v2.temporal_boundary_detail_valid(
        activity_end_month,
        activity_end_day,
        activity_end_granularity,
        activity_end_certainty,
        activity_end_calendar
      )
    );

CREATE TABLE atlas_v2.governance_contexts (
  id uuid NOT NULL,
  canonical_key text NOT NULL,
  governance_type text NOT NULL,
  historicity text NOT NULL,
  CONSTRAINT governance_contexts_pkey PRIMARY KEY (id),
  CONSTRAINT governance_contexts_canonical_key_key UNIQUE (canonical_key),
  CONSTRAINT governance_contexts_governance_type_check
    CHECK (governance_type IN ('government','constitutional_regime','governing_regime'))
);

CREATE TABLE atlas_v2.governance_context_names (
  id uuid NOT NULL,
  governance_context_id uuid NOT NULL,
  locale text NOT NULL,
  name text NOT NULL,
  name_type text NOT NULL,
  is_preferred boolean NOT NULL,
  CONSTRAINT governance_context_names_pkey PRIMARY KEY (id),
  CONSTRAINT governance_context_names_context_id_fkey
    FOREIGN KEY (governance_context_id)
    REFERENCES atlas_v2.governance_contexts(id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX governance_context_names_preferred_locale_uq
  ON atlas_v2.governance_context_names (governance_context_id, locale)
  WHERE is_preferred;

CREATE TABLE atlas_v2.polity_governance_periods (
  id uuid NOT NULL,
  polity_id uuid NOT NULL,
  governance_context_id uuid NOT NULL,
  valid_from_year integer NOT NULL,
  valid_from_month smallint,
  valid_from_day smallint,
  valid_from_granularity text NOT NULL,
  valid_from_certainty text NOT NULL,
  valid_from_calendar text NOT NULL,
  valid_to_year integer NOT NULL,
  valid_to_month smallint,
  valid_to_day smallint,
  valid_to_granularity text NOT NULL,
  valid_to_certainty text NOT NULL,
  valid_to_calendar text NOT NULL,
  confidence text NOT NULL,
  notes text,
  CONSTRAINT polity_governance_periods_pkey PRIMARY KEY (id),
  CONSTRAINT polity_governance_periods_polity_id_fkey
    FOREIGN KEY (polity_id) REFERENCES atlas_v2.polities(id) ON DELETE RESTRICT,
  CONSTRAINT polity_governance_periods_context_id_fkey
    FOREIGN KEY (governance_context_id) REFERENCES atlas_v2.governance_contexts(id) ON DELETE RESTRICT,
  CONSTRAINT polity_governance_periods_from_year_check
    CHECK (valid_from_year BETWEEN -10000 AND 9999 AND valid_from_year <> 0),
  CONSTRAINT polity_governance_periods_to_year_check
    CHECK (valid_to_year BETWEEN -10000 AND 9999 AND valid_to_year <> 0),
  CONSTRAINT polity_governance_periods_year_order_check
    CHECK (valid_to_year >= valid_from_year),
  CONSTRAINT polity_governance_periods_from_detail_shape_check
    CHECK (atlas_v2.temporal_boundary_detail_valid(valid_from_month, valid_from_day, valid_from_granularity, valid_from_certainty, valid_from_calendar)),
  CONSTRAINT polity_governance_periods_to_detail_shape_check
    CHECK (atlas_v2.temporal_boundary_detail_valid(valid_to_month, valid_to_day, valid_to_granularity, valid_to_certainty, valid_to_calendar))
);

CREATE TABLE atlas_v2.polity_relation_types (
  id uuid NOT NULL,
  code text NOT NULL,
  category text NOT NULL,
  inverse_relation_type_id uuid,
  is_active boolean NOT NULL,
  CONSTRAINT polity_relation_types_pkey PRIMARY KEY (id),
  CONSTRAINT polity_relation_types_code_key UNIQUE (code),
  CONSTRAINT polity_relation_types_not_own_inverse_check
    CHECK (inverse_relation_type_id IS NULL OR inverse_relation_type_id <> id),
  CONSTRAINT polity_relation_types_inverse_id_fkey
    FOREIGN KEY (inverse_relation_type_id)
    REFERENCES atlas_v2.polity_relation_types(id)
    ON DELETE RESTRICT
);

CREATE TABLE atlas_v2.polity_relations (
  id uuid NOT NULL,
  subject_polity_id uuid NOT NULL,
  object_polity_id uuid NOT NULL,
  relation_type_id uuid NOT NULL,
  valid_from_year integer NOT NULL,
  valid_from_month smallint,
  valid_from_day smallint,
  valid_from_granularity text NOT NULL,
  valid_from_certainty text NOT NULL,
  valid_from_calendar text NOT NULL,
  valid_to_year integer NOT NULL,
  valid_to_month smallint,
  valid_to_day smallint,
  valid_to_granularity text NOT NULL,
  valid_to_certainty text NOT NULL,
  valid_to_calendar text NOT NULL,
  confidence text NOT NULL,
  notes text,
  CONSTRAINT polity_relations_pkey PRIMARY KEY (id),
  CONSTRAINT polity_relations_subject_id_fkey
    FOREIGN KEY (subject_polity_id) REFERENCES atlas_v2.polities(id) ON DELETE RESTRICT,
  CONSTRAINT polity_relations_object_id_fkey
    FOREIGN KEY (object_polity_id) REFERENCES atlas_v2.polities(id) ON DELETE RESTRICT,
  CONSTRAINT polity_relations_type_id_fkey
    FOREIGN KEY (relation_type_id) REFERENCES atlas_v2.polity_relation_types(id) ON DELETE RESTRICT,
  CONSTRAINT polity_relations_distinct_polities_check
    CHECK (subject_polity_id <> object_polity_id),
  CONSTRAINT polity_relations_from_year_check
    CHECK (valid_from_year BETWEEN -10000 AND 9999 AND valid_from_year <> 0),
  CONSTRAINT polity_relations_to_year_check
    CHECK (valid_to_year BETWEEN -10000 AND 9999 AND valid_to_year <> 0),
  CONSTRAINT polity_relations_year_order_check
    CHECK (valid_to_year >= valid_from_year),
  CONSTRAINT polity_relations_from_detail_shape_check
    CHECK (atlas_v2.temporal_boundary_detail_valid(valid_from_month, valid_from_day, valid_from_granularity, valid_from_certainty, valid_from_calendar)),
  CONSTRAINT polity_relations_to_detail_shape_check
    CHECK (atlas_v2.temporal_boundary_detail_valid(valid_to_month, valid_to_day, valid_to_granularity, valid_to_certainty, valid_to_calendar))
);

CREATE TABLE atlas_v2.polity_designations (
  id uuid NOT NULL,
  polity_id uuid NOT NULL,
  designation_type text NOT NULL,
  valid_from_year integer NOT NULL,
  valid_from_month smallint,
  valid_from_day smallint,
  valid_from_granularity text NOT NULL,
  valid_from_certainty text NOT NULL,
  valid_from_calendar text NOT NULL,
  valid_to_year integer NOT NULL,
  valid_to_month smallint,
  valid_to_day smallint,
  valid_to_granularity text NOT NULL,
  valid_to_certainty text NOT NULL,
  valid_to_calendar text NOT NULL,
  confidence text NOT NULL,
  notes text,
  CONSTRAINT polity_designations_pkey PRIMARY KEY (id),
  CONSTRAINT polity_designations_polity_id_fkey
    FOREIGN KEY (polity_id) REFERENCES atlas_v2.polities(id) ON DELETE RESTRICT,
  CONSTRAINT polity_designations_type_check
    CHECK (designation_type IN ('official_name','state_form','historiographic_period','conventional_temporal_label')),
  CONSTRAINT polity_designations_from_year_check
    CHECK (valid_from_year BETWEEN -10000 AND 9999 AND valid_from_year <> 0),
  CONSTRAINT polity_designations_to_year_check
    CHECK (valid_to_year BETWEEN -10000 AND 9999 AND valid_to_year <> 0),
  CONSTRAINT polity_designations_year_order_check
    CHECK (valid_to_year >= valid_from_year),
  CONSTRAINT polity_designations_from_detail_shape_check
    CHECK (atlas_v2.temporal_boundary_detail_valid(valid_from_month, valid_from_day, valid_from_granularity, valid_from_certainty, valid_from_calendar)),
  CONSTRAINT polity_designations_to_detail_shape_check
    CHECK (atlas_v2.temporal_boundary_detail_valid(valid_to_month, valid_to_day, valid_to_granularity, valid_to_certainty, valid_to_calendar))
);

CREATE TABLE atlas_v2.polity_designation_names (
  id uuid NOT NULL,
  polity_designation_id uuid NOT NULL,
  locale text NOT NULL,
  name text NOT NULL,
  is_preferred boolean NOT NULL,
  CONSTRAINT polity_designation_names_pkey PRIMARY KEY (id),
  CONSTRAINT polity_designation_names_designation_id_fkey
    FOREIGN KEY (polity_designation_id)
    REFERENCES atlas_v2.polity_designations(id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX polity_designation_names_preferred_locale_uq
  ON atlas_v2.polity_designation_names (polity_designation_id, locale)
  WHERE is_preferred;

CREATE TABLE atlas_v2.polity_identity_relation_types (
  id uuid NOT NULL,
  code text NOT NULL,
  is_active boolean NOT NULL,
  CONSTRAINT polity_identity_relation_types_pkey PRIMARY KEY (id),
  CONSTRAINT polity_identity_relation_types_code_key UNIQUE (code)
);

CREATE TABLE atlas_v2.polity_identity_relations (
  id uuid NOT NULL,
  predecessor_polity_id uuid NOT NULL,
  successor_polity_id uuid NOT NULL,
  relation_type_id uuid NOT NULL,
  transition_year integer NOT NULL,
  transition_month smallint,
  transition_day smallint,
  transition_granularity text NOT NULL,
  transition_certainty text NOT NULL,
  transition_calendar text NOT NULL,
  confidence text NOT NULL,
  notes text,
  CONSTRAINT polity_identity_relations_pkey PRIMARY KEY (id),
  CONSTRAINT polity_identity_relations_predecessor_id_fkey
    FOREIGN KEY (predecessor_polity_id) REFERENCES atlas_v2.polities(id) ON DELETE RESTRICT,
  CONSTRAINT polity_identity_relations_successor_id_fkey
    FOREIGN KEY (successor_polity_id) REFERENCES atlas_v2.polities(id) ON DELETE RESTRICT,
  CONSTRAINT polity_identity_relations_type_id_fkey
    FOREIGN KEY (relation_type_id) REFERENCES atlas_v2.polity_identity_relation_types(id) ON DELETE RESTRICT,
  CONSTRAINT polity_identity_relations_distinct_polities_check
    CHECK (predecessor_polity_id <> successor_polity_id),
  CONSTRAINT polity_identity_relations_year_check
    CHECK (transition_year BETWEEN -10000 AND 9999 AND transition_year <> 0),
  CONSTRAINT polity_identity_relations_detail_shape_check
    CHECK (atlas_v2.temporal_boundary_detail_valid(transition_month, transition_day, transition_granularity, transition_certainty, transition_calendar))
);

COMMIT;
