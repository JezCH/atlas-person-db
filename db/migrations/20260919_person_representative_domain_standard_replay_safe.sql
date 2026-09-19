BEGIN;

-- Replay-safe counterpart to the historical 20260905 domain-standard migration.
-- Live Authoring Apply may execute this repeatedly, so it must never rewrite
-- canonical Person rows. A stale environment that still contains draft values
-- fails closed and must use the explicit one-time reconstruction migration.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM atlas_v2.persons
     WHERE representative_domain IN ('ruler', 'science')
  ) THEN
    RAISE EXCEPTION
      'REPLAY_REQUIRES_ONE_TIME_DOMAIN_CANONICALIZATION: representative_domain still contains ruler/science';
  END IF;
END
$$;

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
