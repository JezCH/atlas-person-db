import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.argv[2] || '.';
const out = process.argv[3] || 'migration/phase-6/tmp/run';
const contract = JSON.parse(fs.readFileSync(path.join(root, 'migration/phase-6/contracts/compatibility.contract.json'), 'utf8'));
fs.mkdirSync(out, { recursive: true });
const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');

const sql = `-- PHASE 6 COMPATIBILITY READER BUNDLE
begin;
select pg_advisory_xact_lock(hashtext('atlas-person-db-phase-6'));

do $$ begin
  if not exists (select 1 from information_schema.schemata where schema_name = 'atlas_v2') then
    raise exception 'atlas_v2 schema missing';
  end if;
  if not exists (select 1 from atlas_v2.migration_metadata where phase = 5) then
    raise exception 'phase 5 metadata missing';
  end if;
end $$;

create or replace view public.atlas_person_politics_compat_v1
with (security_invoker = false)
as
select
  pp.id,
  pn.name::text as person_name,
  ptn.name::text as politic_name,
  pp.activity_start,
  pp.activity_end,
  r.source_label::text as role,
  pb.code::text as period_basis,
  pp.notes
from atlas_v2.person_politics_v2 pp
join atlas_v2.person_names pn
  on pn.person_id = pp.person_id
 and pn.locale = 'en'
 and pn.is_preferred = true
join atlas_v2.polity_names ptn
  on ptn.polity_id = pp.polity_id
 and ptn.locale = 'en'
 and ptn.is_preferred = true
join atlas_v2.roles r on r.id = pp.role_id
join atlas_v2.period_bases pb on pb.id = pp.period_basis_id;

revoke all on public.atlas_person_politics_compat_v1 from public;
grant select on public.atlas_person_politics_compat_v1 to anon, authenticated;

do $$ declare
  c bigint;
  dup bigint;
  bad_basis bigint;
  null_required bigint;
begin
  select count(*) into c from public.atlas_person_politics_compat_v1;
  if c <> ${contract.expected_v2_rows} then raise exception 'compat row count mismatch: %', c; end if;

  select count(*) - count(distinct id) into dup from public.atlas_person_politics_compat_v1;
  if dup <> 0 then raise exception 'duplicate compatibility ids: %', dup; end if;

  select count(*) into bad_basis
  from public.atlas_person_politics_compat_v1
  where period_basis not in (${contract.runtime_contract.period_basis_values.map((x) => `'${x}'`).join(', ')});
  if bad_basis <> 0 then raise exception 'invalid period_basis rows: %', bad_basis; end if;

  select count(*) into null_required
  from public.atlas_person_politics_compat_v1
  where id is null or person_name is null or politic_name is null
     or activity_start is null or activity_end is null or period_basis is null;
  if null_required <> 0 then raise exception 'null required fields: %', null_required; end if;

  if exists (
    select 1 from public.atlas_person_politics_compat_v1
    where activity_end < activity_start
  ) then raise exception 'invalid chronology in compatibility view'; end if;
end $$;

commit;
`;

const rollback = `-- PHASE 6 COMPATIBILITY READER ROLLBACK
begin;
select pg_advisory_xact_lock(hashtext('atlas-person-db-phase-6'));
revoke all on public.atlas_person_politics_compat_v1 from public, anon, authenticated;
drop view if exists public.atlas_person_politics_compat_v1;
commit;
`;

const report = {
  status: 'PASS',
  marker: 'PHASE_6_COMPATIBILITY_READER',
  compat_object: contract.compat_object,
  expected_rows: contract.expected_v2_rows,
  deployment_sha256: sha(sql),
  rollback_sha256: sha(rollback)
};

fs.writeFileSync(path.join(out, 'phase-6-deployment.sql'), sql);
fs.writeFileSync(path.join(out, 'phase-6-rollback.sql'), rollback);
fs.writeFileSync(path.join(out, 'phase-6-build-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
