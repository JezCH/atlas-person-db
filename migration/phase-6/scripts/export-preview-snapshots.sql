begin read only;
\copy (select jsonb_agg(to_jsonb(x) order by politic_name, activity_start, activity_end, person_name, id)::text from (select id, person_name, politic_name, activity_start, activity_end, role, period_basis, notes from public.person_politics) x) to 'migration/phase-6/tmp/preview/legacy.raw';
\copy (select jsonb_agg(to_jsonb(x) order by politic_name, activity_start, activity_end, person_name, id)::text from (select id, person_name, politic_name, activity_start, activity_end, role, period_basis, notes from public.atlas_person_politics_compat_v1) x) to 'migration/phase-6/tmp/preview/v2.raw';
rollback;
