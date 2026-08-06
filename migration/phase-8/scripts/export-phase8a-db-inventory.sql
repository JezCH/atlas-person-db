begin read only;
\pset tuples_only on
\pset format unaligned
\o migration/phase-8/tmp/phase8a/database-inventory.json
select jsonb_build_object(
  'relations', coalesce((
    select jsonb_agg(jsonb_build_object(
      'schema', n.nspname,
      'name', c.relname,
      'kind', c.relkind,
      'owner', pg_get_userbyid(c.relowner),
      'rls_enabled', c.relrowsecurity
    ) order by n.nspname, c.relname)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'atlas_v2')
      and c.relkind in ('r','p','v','m','f')
  ), '[]'::jsonb),
  'views', coalesce((
    select jsonb_agg(jsonb_build_object(
      'schema', schemaname,
      'name', viewname,
      'owner', viewowner,
      'definition', definition
    ) order by schemaname, viewname)
    from pg_views
    where schemaname in ('public', 'atlas_v2')
  ), '[]'::jsonb),
  'functions', coalesce((
    select jsonb_agg(jsonb_build_object(
      'schema', n.nspname,
      'name', p.proname,
      'identity_arguments', pg_get_function_identity_arguments(p.oid),
      'result', pg_get_function_result(p.oid),
      'owner', pg_get_userbyid(p.proowner)
    ) order by n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'atlas_v2')
  ), '[]'::jsonb),
  'triggers', coalesce((
    select jsonb_agg(jsonb_build_object(
      'schema', n.nspname,
      'table', c.relname,
      'name', t.tgname,
      'definition', pg_get_triggerdef(t.oid)
    ) order by n.nspname, c.relname, t.tgname)
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal
      and n.nspname in ('public', 'atlas_v2')
  ), '[]'::jsonb),
  'policies', coalesce((
    select jsonb_agg(to_jsonb(p) order by p.schemaname, p.tablename, p.policyname)
    from pg_policies p
    where p.schemaname in ('public', 'atlas_v2')
  ), '[]'::jsonb),
  'application_privileges', coalesce((
    select jsonb_agg(jsonb_build_object(
      'grantee', grantee,
      'schema', table_schema,
      'table', table_name,
      'privilege', privilege_type
    ) order by grantee, table_schema, table_name, privilege_type)
    from information_schema.role_table_grants
    where grantee in ('anon', 'authenticated')
      and table_schema in ('public', 'atlas_v2')
  ), '[]'::jsonb),
  'dependencies', coalesce((
    select jsonb_agg(jsonb_build_object(
      'dependent_schema', nd.nspname,
      'dependent_object', cd.relname,
      'dependent_kind', cd.relkind,
      'referenced_schema', nr.nspname,
      'referenced_object', cr.relname,
      'referenced_kind', cr.relkind
    ) order by nd.nspname, cd.relname, nr.nspname, cr.relname)
    from pg_depend d
    join pg_rewrite rw on rw.oid = d.objid
    join pg_class cd on cd.oid = rw.ev_class
    join pg_namespace nd on nd.oid = cd.relnamespace
    join pg_class cr on cr.oid = d.refobjid
    join pg_namespace nr on nr.oid = cr.relnamespace
    where d.classid = 'pg_rewrite'::regclass
      and (
        (nr.nspname = 'public' and cr.relname in ('person_politics', 'atlas_person_politics_compat_v1'))
        or nr.nspname = 'atlas_v2'
      )
  ), '[]'::jsonb),
  'counts', jsonb_build_object(
    'legacy', (select count(*) from public.person_politics),
    'compatibility', (select count(*) from public.atlas_person_politics_compat_v1)
  )
)::text;
\o
rollback;
