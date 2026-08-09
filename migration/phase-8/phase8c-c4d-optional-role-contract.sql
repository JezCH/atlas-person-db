BEGIN;

SELECT pg_advisory_xact_lock(hashtext('atlas-person-db-phase8c-c4d-optional-role'));

DO $$
DECLARE
  role_nullable text;
  normalized_rows bigint;
  compat_rows bigint;
  existing_null_roles bigint;
BEGIN
  IF to_regclass('atlas_v2.person_politics_v2') IS NULL THEN
    RAISE EXCEPTION 'atlas_v2.person_politics_v2 does not exist';
  END IF;
  IF to_regclass('public.atlas_person_politics_compat_v1') IS NULL THEN
    RAISE EXCEPTION 'public.atlas_person_politics_compat_v1 does not exist';
  END IF;

  SELECT is_nullable INTO role_nullable
  FROM information_schema.columns
  WHERE table_schema = 'atlas_v2'
    AND table_name = 'person_politics_v2'
    AND column_name = 'role_id';

  IF role_nullable IS DISTINCT FROM 'NO' THEN
    RAISE EXCEPTION 'expected role_id NOT NULL before C4D apply, got %', role_nullable;
  END IF;

  SELECT count(*) INTO existing_null_roles
  FROM atlas_v2.person_politics_v2
  WHERE role_id IS NULL;
  IF existing_null_roles <> 0 THEN
    RAISE EXCEPTION 'unexpected pre-existing null role_id rows: %', existing_null_roles;
  END IF;

  SELECT count(*) INTO normalized_rows FROM atlas_v2.person_politics_v2;
  SELECT count(*) INTO compat_rows FROM public.atlas_person_politics_compat_v1;
  IF normalized_rows <> compat_rows THEN
    RAISE EXCEPTION 'compatibility view is not row-complete before C4D apply: normalized %, compat %', normalized_rows, compat_rows;
  END IF;
END
$$;

ALTER TABLE atlas_v2.person_politics_v2
  ALTER COLUMN role_id DROP NOT NULL;

-- Existing non-null semantic duplicates are historical data and are intentionally
-- outside this contract. C4D only prevents duplicate rows in the newly admitted
-- null-role state. NULLS NOT DISTINCT also closes nullable-period duplicate gaps.
CREATE UNIQUE INDEX person_politics_v2_null_role_semantic_uidx
  ON atlas_v2.person_politics_v2
  (person_id, polity_id, activity_start, activity_end, period_basis_id)
  NULLS NOT DISTINCT
  WHERE role_id IS NULL;

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
LEFT JOIN atlas_v2.roles r
  ON r.id = pp.role_id
JOIN atlas_v2.period_bases pb
  ON pb.id = pp.period_basis_id;

REVOKE ALL ON public.atlas_person_politics_compat_v1 FROM public, anon, authenticated;
GRANT SELECT ON public.atlas_person_politics_compat_v1 TO anon, authenticated;

DO $$
DECLARE
  role_nullable text;
  normalized_rows bigint;
  compat_rows bigint;
  null_role_unique boolean;
BEGIN
  SELECT is_nullable INTO role_nullable
  FROM information_schema.columns
  WHERE table_schema = 'atlas_v2'
    AND table_name = 'person_politics_v2'
    AND column_name = 'role_id';
  IF role_nullable IS DISTINCT FROM 'YES' THEN
    RAISE EXCEPTION 'role_id did not become nullable';
  END IF;

  SELECT count(*) INTO normalized_rows FROM atlas_v2.person_politics_v2;
  SELECT count(*) INTO compat_rows FROM public.atlas_person_politics_compat_v1;
  IF normalized_rows <> compat_rows THEN
    RAISE EXCEPTION 'compatibility view lost rows after LEFT JOIN conversion: normalized %, compat %', normalized_rows, compat_rows;
  END IF;

  SELECT i.indisunique
         AND i.indnullsnotdistinct
         AND position('role_id IS NULL' in pg_get_expr(i.indpred, i.indrelid)) > 0
    INTO null_role_unique
  FROM pg_index i
  JOIN pg_class c ON c.oid = i.indexrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'atlas_v2'
    AND c.relname = 'person_politics_v2_null_role_semantic_uidx';

  IF null_role_unique IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'null-role partial semantic unique index is missing or invalid';
  END IF;
END
$$;

COMMIT;
