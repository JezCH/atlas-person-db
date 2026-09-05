BEGIN;

-- Forward-only canonicalization of the representative Person domain taxonomy.
-- The 20260904 migration may already be applied in Production, so preserve its
-- history and migrate any draft values before replacing the constraint.
UPDATE atlas_v2.persons
   SET representative_domain = CASE representative_domain
     WHEN 'ruler' THEN 'governance'
     WHEN 'science' THEN 'knowledge'
     ELSE representative_domain
   END
 WHERE representative_domain IN ('ruler', 'science');

ALTER TABLE atlas_v2.persons
  DROP CONSTRAINT IF EXISTS persons_representative_domain_check;

ALTER TABLE atlas_v2.persons
  ADD CONSTRAINT persons_representative_domain_check CHECK (
    representative_domain IS NULL OR representative_domain IN (
      'governance',
      'military',
      'knowledge',
      'technology',
      'commerce',
      'culture',
      'religion',
      'exploration'
    )
  );

COMMENT ON COLUMN atlas_v2.persons.representative_domain IS
  'Single editorial representative field for visualization. Controlled values: governance, military, knowledge, technology, commerce, culture, religion, exploration. NULL means unclassified.';

COMMIT;
