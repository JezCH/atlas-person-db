BEGIN;

CREATE TEMP TABLE atlas_phase8c_c4d_probe ON COMMIT DROP AS
SELECT
  gen_random_uuid() AS legacy_id,
  gen_random_uuid() AS v2_id,
  pp.person_id,
  pp.polity_id,
  pp.period_basis_id,
  pn.name::text AS person_name,
  ptn.name::text AS politic_name,
  -9999::integer AS activity_start,
  -9998::integer AS activity_end
FROM atlas_v2.person_politics_v2 pp
JOIN atlas_v2.person_names pn
  ON pn.person_id = pp.person_id
 AND pn.locale = 'en'
 AND pn.is_preferred = true
JOIN atlas_v2.polity_names ptn
  ON ptn.polity_id = pp.polity_id
 AND ptn.locale = 'en'
 AND ptn.is_preferred = true
ORDER BY pp.id
LIMIT 1;

DO $$
BEGIN
  IF (SELECT count(*) FROM atlas_phase8c_c4d_probe) <> 1 THEN
    RAISE EXCEPTION 'could not select one normalized probe seed';
  END IF;
END
$$;

INSERT INTO public.person_politics
  (id, person_name, politic_name, activity_start, activity_end, role, period_basis, notes)
SELECT
  p.legacy_id,
  p.person_name,
  p.politic_name,
  p.activity_start,
  p.activity_end,
  NULL,
  pb.code,
  'PHASE8C_C4D_NULL_ROLE_PROBE'
FROM atlas_phase8c_c4d_probe p
JOIN atlas_v2.period_bases pb ON pb.id = p.period_basis_id;

INSERT INTO atlas_v2.person_politics_v2
  (id, person_id, polity_id, activity_start, activity_end, role_id, period_basis_id,
   confidence, chronology_status, legacy_source_key, notes, source_locator, content_hash)
SELECT
  p.v2_id,
  p.person_id,
  p.polity_id,
  p.activity_start,
  p.activity_end,
  NULL,
  p.period_basis_id,
  'legacy_asserted',
  'exact_as_recorded',
  'phase8c-c4d-probe:' || p.legacy_id::text,
  'PHASE8C_C4D_NULL_ROLE_PROBE',
  jsonb_build_object(
    'kind', 'phase8c_c4d_null_role_probe',
    'legacy_table', 'public.person_politics',
    'legacy_record_id', p.legacy_id::text
  ),
  repeat('0', 64)
FROM atlas_phase8c_c4d_probe p;

SELECT jsonb_build_object(
  'marker', 'PHASE8C_C4D_NULL_ROLE_PROBE',
  'normalized_role_null', EXISTS (
    SELECT 1
    FROM atlas_v2.person_politics_v2 pp
    JOIN atlas_phase8c_c4d_probe p ON p.v2_id = pp.id
    WHERE pp.role_id IS NULL
  ),
  'compat_row_present', EXISTS (
    SELECT 1
    FROM public.atlas_person_politics_compat_v1 c
    JOIN atlas_phase8c_c4d_probe p ON p.v2_id = c.id
  ),
  'compat_role_null', EXISTS (
    SELECT 1
    FROM public.atlas_person_politics_compat_v1 c
    JOIN atlas_phase8c_c4d_probe p ON p.v2_id = c.id
    WHERE c.role IS NULL
  ),
  'legacy_role_null', EXISTS (
    SELECT 1
    FROM public.person_politics l
    JOIN atlas_phase8c_c4d_probe p ON p.legacy_id = l.id
    WHERE l.role IS NULL
  )
);

ROLLBACK;
