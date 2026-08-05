import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.argv[2] || '.';
const out = process.argv[3] || 'migration/phase-5/tmp/run';
const phase4Out = path.join(root, 'migration', 'phase-4', 'output');
const contractPath = path.join(root, 'migration', 'phase-5', 'contracts', 'shadow-schema.contract.json');
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
fs.mkdirSync(out, { recursive: true });

const q = (v) => v === null || v === undefined ? 'null' : `'${String(v).replaceAll("'", "''")}'`;
const j = (v) => `${q(JSON.stringify(v))}::jsonb`;
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(phase4Out, `${name}.json`), 'utf8'));
const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');

const data = {
  persons: readJson('persons'),
  person_names: readJson('person_names'),
  polities: readJson('polities'),
  polity_names: readJson('polity_names'),
  roles: readJson('roles'),
  role_names: readJson('role_names'),
  period_bases: readJson('period_bases'),
  period_basis_names: readJson('period_basis_names'),
  person_politics_v2: readJson('person_politics_v2'),
  chronology_claims: readJson('chronology_claims'),
  sources: readJson('sources'),
  person_sources: readJson('person_sources'),
  polity_sources: readJson('polity_sources'),
  person_politics_sources: readJson('person_politics_sources'),
  person_descriptions: readJson('person_descriptions'),
  polity_descriptions: readJson('polity_descriptions'),
  relationship_descriptions: readJson('relationship_descriptions')
};

const countMap = {
  persons: data.persons.length,
  polities: data.polities.length,
  person_politics_v2: data.person_politics_v2.length,
  person_names: data.person_names.length,
  polity_names: data.polity_names.length,
  roles: data.roles.length,
  sources: data.sources.length
};
for (const [k, expected] of Object.entries(contract.expected_counts)) {
  if (countMap[k] !== expected) throw new Error(`Phase 4 count mismatch for ${k}: ${countMap[k]} != ${expected}`);
}

const sql = [];
sql.push('-- PHASE 5 FULL SHADOW LOAD BUNDLE');
sql.push('begin;');
sql.push("select pg_advisory_xact_lock(hashtext('atlas-person-db-phase-5'));\n");
sql.push("do $$ begin if exists (select 1 from information_schema.schemata where schema_name = 'atlas_v2') then raise exception 'atlas_v2 already exists'; end if; end $$;");
sql.push('create schema atlas_v2;');
sql.push('revoke all on schema atlas_v2 from public;');
sql.push(`create table atlas_v2.migration_metadata (phase integer primary key check (phase = 5), phase4_closing_sha text not null, phase4_artifact_digest text not null, schema_bundle_sha256 text not null, data_bundle_sha256 text not null, expected_counts jsonb not null, applied_at timestamptz not null default now());`);
sql.push(`create table atlas_v2.persons (id uuid primary key, canonical_key text not null unique, person_type text not null, historicity text not null);`);
sql.push(`create table atlas_v2.polities (id uuid primary key, canonical_key text not null unique, polity_type text not null, historicity text not null);`);
sql.push(`create table atlas_v2.roles (id uuid primary key, code text not null unique, category text not null, source_label text not null, is_active boolean not null);`);
sql.push(`create table atlas_v2.period_bases (id uuid primary key, code text not null unique, is_active boolean not null);`);
sql.push(`create table atlas_v2.sources (id uuid primary key, source_key text not null unique, source_type text not null, title text not null, sha256 text not null, bytes integer not null check (bytes >= 0));`);
sql.push(`create table atlas_v2.person_names (id uuid primary key, person_id uuid not null references atlas_v2.persons(id) on delete cascade, locale text not null, name text not null, name_type text not null, is_preferred boolean not null);`);
sql.push(`create table atlas_v2.polity_names (id uuid primary key, polity_id uuid not null references atlas_v2.polities(id) on delete cascade, locale text not null, name text not null, name_type text not null, is_preferred boolean not null);`);
sql.push(`create table atlas_v2.role_names (id uuid primary key, role_id uuid not null references atlas_v2.roles(id) on delete cascade, locale text not null, name text not null, is_preferred boolean not null);`);
sql.push(`create table atlas_v2.period_basis_names (id uuid primary key, period_basis_id uuid not null references atlas_v2.period_bases(id) on delete cascade, locale text not null, name text not null, is_preferred boolean not null);`);
sql.push(`create table atlas_v2.person_politics_v2 (id uuid primary key, person_id uuid not null references atlas_v2.persons(id) on delete restrict, polity_id uuid not null references atlas_v2.polities(id) on delete restrict, role_id uuid not null references atlas_v2.roles(id) on delete restrict, period_basis_id uuid not null references atlas_v2.period_bases(id) on delete restrict, activity_start integer not null, activity_end integer not null, confidence text not null, chronology_status text not null, legacy_source_key text not null unique, notes text, source_locator jsonb not null, content_hash text not null, check (activity_start between -10000 and 9999 and activity_start <> 0), check (activity_end between -10000 and 9999 and activity_end <> 0), check (activity_end >= activity_start));`);
sql.push(`create table atlas_v2.chronology_claims (id uuid primary key, person_politics_id uuid references atlas_v2.person_politics_v2(id) on delete cascade, claim_type text not null, start_year integer, end_year integer);`);
sql.push(`create table atlas_v2.person_sources (person_id uuid not null references atlas_v2.persons(id) on delete cascade, source_id uuid not null references atlas_v2.sources(id) on delete restrict, primary key(person_id, source_id));`);
sql.push(`create table atlas_v2.polity_sources (polity_id uuid not null references atlas_v2.polities(id) on delete cascade, source_id uuid not null references atlas_v2.sources(id) on delete restrict, primary key(polity_id, source_id));`);
sql.push(`create table atlas_v2.person_politics_sources (person_politics_id uuid not null references atlas_v2.person_politics_v2(id) on delete cascade, source_id uuid not null references atlas_v2.sources(id) on delete restrict, source_locator_key text not null, primary key(person_politics_id, source_id));`);
sql.push(`create table atlas_v2.person_descriptions (id uuid primary key, person_id uuid not null references atlas_v2.persons(id) on delete cascade, locale text not null, content text not null);`);
sql.push(`create table atlas_v2.polity_descriptions (id uuid primary key, polity_id uuid not null references atlas_v2.polities(id) on delete cascade, locale text not null, content text not null);`);
sql.push(`create table atlas_v2.relationship_descriptions (id uuid primary key, person_politics_id uuid not null references atlas_v2.person_politics_v2(id) on delete cascade, locale text not null, content text not null);`);

const ins = (table, cols, rows) => {
  if (!rows.length) return;
  const values = rows.map((r) => `(${cols.map((c) => {
    const v = c.get ? c.get(r) : r[c.name || c];
    if (c.json) return j(v);
    if (c.bool) return v ? 'true' : 'false';
    if (c.num) return String(v);
    return q(v);
  }).join(', ')})`).join(',\n');
  const names = cols.map((c) => c.name || c).join(', ');
  sql.push(`insert into atlas_v2.${table} (${names}) values\n${values};`);
};

ins('persons', ['id','canonical_key','person_type','historicity'], data.persons);
ins('polities', ['id','canonical_key','polity_type','historicity'], data.polities);
ins('roles', ['id','code','category','source_label',{name:'is_active',bool:true}], data.roles);
ins('period_bases', ['id','code',{name:'is_active',bool:true}], data.period_bases);
ins('sources', ['id','source_key','source_type','title','sha256',{name:'bytes',num:true}], data.sources);
ins('person_names', ['id','person_id','locale','name','name_type',{name:'is_preferred',bool:true}], data.person_names);
ins('polity_names', ['id','polity_id','locale','name','name_type',{name:'is_preferred',bool:true}], data.polity_names);
ins('role_names', ['id','role_id','locale','name',{name:'is_preferred',bool:true}], data.role_names);
ins('period_basis_names', ['id','period_basis_id','locale','name',{name:'is_preferred',bool:true}], data.period_basis_names);
ins('person_politics_v2', ['id','person_id','polity_id',{name:'activity_start',num:true},{name:'activity_end',num:true},'role_id','period_basis_id','confidence','chronology_status','legacy_source_key','notes',{name:'source_locator',json:true},'content_hash'], data.person_politics_v2);
ins('chronology_claims', ['id','person_politics_id','claim_type',{name:'start_year',num:true},{name:'end_year',num:true}], data.chronology_claims);
const personSourceRows = data.person_sources.flatMap((x) => x.source_ids.map((source_id) => ({person_id:x.person_id,source_id})));
const politySourceRows = data.polity_sources.flatMap((x) => x.source_ids.map((source_id) => ({polity_id:x.polity_id,source_id})));
ins('person_sources', ['person_id','source_id'], personSourceRows);
ins('polity_sources', ['polity_id','source_id'], politySourceRows);
ins('person_politics_sources', ['person_politics_id','source_id','source_locator_key'], data.person_politics_sources);
ins('person_descriptions', ['id','person_id','locale','content'], data.person_descriptions);
ins('polity_descriptions', ['id','polity_id','locale','content'], data.polity_descriptions);
ins('relationship_descriptions', ['id','person_politics_id','locale','content'], data.relationship_descriptions);

sql.push('create unique index person_names_preferred_locale_uq on atlas_v2.person_names(person_id, locale) where is_preferred;');
sql.push('create unique index polity_names_preferred_locale_uq on atlas_v2.polity_names(polity_id, locale) where is_preferred;');
for (const table of contract.required_tables) sql.push(`alter table atlas_v2.${table} enable row level security;`);
for (const table of contract.required_tables) sql.push(`revoke all on atlas_v2.${table} from public, anon, authenticated;`);

const dataDigest = sha(Object.keys(data).sort().map((k) => `${k}:${sha(JSON.stringify(data[k]))}`).join('\n'));
const preDigestSql = `${sql.join('\n\n')}\n`;
const schemaDigest = sha(preDigestSql);
sql.push(`insert into atlas_v2.migration_metadata(phase, phase4_closing_sha, phase4_artifact_digest, schema_bundle_sha256, data_bundle_sha256, expected_counts) values (5, ${q(contract.phase4_closing_sha)}, ${q(contract.phase4_artifact_digest)}, ${q(schemaDigest)}, ${q(dataDigest)}, ${j(contract.expected_counts)});`);
sql.push(`do $$ declare c jsonb; begin c := jsonb_build_object('persons',(select count(*) from atlas_v2.persons),'polities',(select count(*) from atlas_v2.polities),'person_politics_v2',(select count(*) from atlas_v2.person_politics_v2),'person_names',(select count(*) from atlas_v2.person_names),'polity_names',(select count(*) from atlas_v2.polity_names),'roles',(select count(*) from atlas_v2.roles),'sources',(select count(*) from atlas_v2.sources)); if c <> ${j(contract.expected_counts)} then raise exception 'count contract failed: %', c; end if; if (select count(distinct legacy_source_key) from atlas_v2.person_politics_v2) <> 349 then raise exception 'legacy source key distinct count failed'; end if; if exists (select 1 from atlas_v2.person_politics_v2 where legacy_source_key is null) then raise exception 'legacy source key null detected'; end if; end $$;`);
sql.push('commit;');

const deployment = `${sql.join('\n\n')}\n`;
const rollback = `begin;\nselect pg_advisory_xact_lock(hashtext('atlas-person-db-phase-5'));\ndo $$ begin if not exists (select 1 from atlas_v2.migration_metadata where phase = 5 and phase4_closing_sha = ${q(contract.phase4_closing_sha)}) then raise exception 'phase 5 rollback precondition failed'; end if; end $$;\ndrop schema atlas_v2 cascade;\ncommit;\n`;
const report = {status:'PASS',schema:contract.schema,tables:contract.required_tables.length,counts:countMap,schema_sha256:schemaDigest,data_sha256:dataDigest,rollback_sha256:sha(rollback),marker:'FULL_SHADOW_LOAD'};
fs.writeFileSync(path.join(out,'phase-5-deployment.sql'),deployment);
fs.writeFileSync(path.join(out,'phase-5-rollback.sql'),rollback);
fs.writeFileSync(path.join(out,'phase-5-build-report.json'),`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify(report,null,2));
