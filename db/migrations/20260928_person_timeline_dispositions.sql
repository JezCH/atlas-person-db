BEGIN;

CREATE TABLE IF NOT EXISTS atlas_v2.person_timeline_dispositions (
  person_id uuid PRIMARY KEY
    REFERENCES atlas_v2.persons(id)
    ON DELETE CASCADE,
  disposition text NOT NULL,
  reason text,
  basis_code text,
  traditional_year integer,
  traditional_year_alternative integer,
  review_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT person_timeline_dispositions_disposition_check CHECK (
    disposition IN (
      'timeline',
      'chronology_unresolved',
      'legendary',
      'mythical',
      'other_reviewed_exclusion'
    )
  ),
  CONSTRAINT person_timeline_dispositions_reason_check CHECK (
    (disposition = 'timeline' AND reason IS NULL)
    OR
    (disposition <> 'timeline' AND reason IS NOT NULL AND btrim(reason) <> '')
  ),
  CONSTRAINT person_timeline_dispositions_basis_check CHECK (
    basis_code IS NULL OR btrim(basis_code) <> ''
  ),
  CONSTRAINT person_timeline_dispositions_traditional_year_check CHECK (
    traditional_year IS NULL
    OR (traditional_year BETWEEN -10000 AND 9999 AND traditional_year <> 0)
  ),
  CONSTRAINT person_timeline_dispositions_traditional_year_alt_check CHECK (
    traditional_year_alternative IS NULL
    OR (traditional_year_alternative BETWEEN -10000 AND 9999 AND traditional_year_alternative <> 0)
  ),
  CONSTRAINT person_timeline_dispositions_evidence_check CHECK (
    jsonb_typeof(review_evidence) = 'object'
  )
);

CREATE INDEX IF NOT EXISTS person_timeline_dispositions_disposition_idx
  ON atlas_v2.person_timeline_dispositions(disposition, person_id);

ALTER TABLE atlas_v2.person_profile_mutation_audits
  DROP CONSTRAINT IF EXISTS person_profile_mutation_audits_operation_check;

ALTER TABLE atlas_v2.person_profile_mutation_audits
  ADD CONSTRAINT person_profile_mutation_audits_operation_check CHECK (
    operation IN (
      'set_person_korean_name',
      'set_person_external_reference',
      'set_person_representative_domain',
      'set_person_timeline_disposition'
    )
  );

COMMENT ON TABLE atlas_v2.person_timeline_dispositions IS
  'Canonical Person timeline eligibility/review state. Person identity is independent from year-timeline inclusion.';

COMMENT ON COLUMN atlas_v2.person_timeline_dispositions.review_evidence IS
  'Reviewed evidence/context for the timeline disposition only; not a substitute for Activity, Polity, Role, Source, or Place facts.';

COMMIT;
