BEGIN;

ALTER TABLE atlas_v2.persons
  ADD COLUMN IF NOT EXISTS representative_domain text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'atlas_v2.persons'::regclass
       AND conname = 'persons_representative_domain_check'
  ) THEN
    ALTER TABLE atlas_v2.persons
      ADD CONSTRAINT persons_representative_domain_check CHECK (
        representative_domain IS NULL OR representative_domain IN (
          'ruler',
          'military',
          'science',
          'technology',
          'commerce',
          'culture',
          'religion',
          'exploration'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS persons_representative_domain_idx
  ON atlas_v2.persons(representative_domain, id)
  WHERE representative_domain IS NOT NULL;

ALTER TABLE atlas_v2.person_profile_mutation_audits
  DROP CONSTRAINT IF EXISTS person_profile_mutation_audits_operation_check;

ALTER TABLE atlas_v2.person_profile_mutation_audits
  ADD CONSTRAINT person_profile_mutation_audits_operation_check CHECK (
    operation IN (
      'set_person_korean_name',
      'set_person_external_reference',
      'set_person_representative_domain'
    )
  );

COMMENT ON COLUMN atlas_v2.persons.representative_domain IS
  'Single editorial representative field for visualization. Controlled values: ruler, military, science, technology, commerce, culture, religion, exploration. NULL means unclassified.';

COMMIT;
