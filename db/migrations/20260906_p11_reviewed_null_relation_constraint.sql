BEGIN;

-- P11 canonical semantics allow a reviewed Activity to retain a known primary
-- polity while the Person→Polity relation itself remains unresolved.  The
-- former pair-equality CHECK was added NOT VALID for legacy cleanup, but
-- PostgreSQL still enforces NOT VALID constraints on every later UPDATE.  That
-- made unrelated temporal-metadata backfill impossible for reviewed relation
-- exceptions.
--
-- Keep the safety invariant that a relation can never exist without a primary
-- polity.  Human Authoring continues to require polity/relation as a pair, and
-- P11 readiness continues to allow null relations only for the explicit
-- reviewed-exception contract.

DO $$
DECLARE
  v_constraint_oid oid;
  v_constraint_validated boolean;
  v_marker text;
BEGIN
  SELECT c.oid, c.convalidated, obj_description(c.oid, 'pg_constraint')
    INTO v_constraint_oid, v_constraint_validated, v_marker
    FROM pg_constraint c
   WHERE c.conrelid='atlas_v2.person_politics_v2'::regclass
     AND c.conname='person_politics_v2_primary_polity_relation_pair_check';

  IF FOUND
     AND v_constraint_validated IS TRUE
     AND v_marker='ATLAS_P11_RELATION_REQUIRES_POLITY_V1' THEN
    RETURN;
  END IF;

  IF v_constraint_oid IS NOT NULL THEN
    ALTER TABLE atlas_v2.person_politics_v2
      DROP CONSTRAINT person_politics_v2_primary_polity_relation_pair_check;
  END IF;

  ALTER TABLE atlas_v2.person_politics_v2
    ADD CONSTRAINT person_politics_v2_primary_polity_relation_pair_check
    CHECK (relation_type_id IS NULL OR polity_id IS NOT NULL);

  COMMENT ON CONSTRAINT person_politics_v2_primary_polity_relation_pair_check
    ON atlas_v2.person_politics_v2
    IS 'ATLAS_P11_RELATION_REQUIRES_POLITY_V1';
END
$$;

COMMIT;
