BEGIN;

SELECT pg_advisory_xact_lock(hashtext('atlas-person-db-phase8c-c4d-optional-role'));

DO $$
DECLARE
  null_roles bigint;
BEGIN
  SELECT count(*) INTO null_roles
  FROM atlas_v2.person_politics_v2
  WHERE role_id IS NULL;
  IF null_roles <> 0 THEN
    RAISE EXCEPTION 'cannot restore role_id NOT NULL while % null-role rows exist', null_roles;
  END IF;
END
$$;

CREATE OR REPLACE VIEW public.atlas_person_politics_compat_v1
WITH (security_invoker = false)
AS
SELECT
  pp.id,
  pn.name::text AS person_name,
  ptn.name::text AS politic_name,
  pp.activity_start,
  pp.activity_end,
  r.source_label::text AS role,
  pb.code::text AS period_basis,
  pp.notes
FROM atlas_v2.person_politics_v2 pp
JOIN atlas_v2.person_names pn
  ON pn.person_id = pp.person_id
 AND pn.locale = 'en'
 AND pn.is_preferred = true
JOIN atlas_v2.polity_names ptn
  ON ptn.polity_id = pp.polity_id
 AND ptn.locale = 'en'
 AND ptn.is_preferred = true
JOIN atlas_v2.roles r
  ON r.id = pp.role_id
JOIN atlas_v2.period_bases pb
  ON pb.id = pp.period_basis_id;

REVOKE ALL ON public.atlas_person_politics_compat_v1 FROM public, anon, authenticated;
GRANT SELECT ON public.atlas_person_politics_compat_v1 TO anon, authenticated;

DROP INDEX IF EXISTS atlas_v2.person_politics_v2_semantic_nullsafe_uidx;

ALTER TABLE atlas_v2.person_politics_v2
  ALTER COLUMN role_id SET NOT NULL;

COMMIT;
