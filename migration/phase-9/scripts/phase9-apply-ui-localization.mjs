#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

const { Client } = pg;
const root = process.cwd();
const contractPath = path.join(root, 'migration', 'phase-9', 'ui-localization-ko.json');
const outputDir = path.resolve(process.env.PHASE9_UI_LOCALIZATION_OUTPUT_DIR || path.join(root, 'migration', 'phase-9', 'tmp', 'ui-localization-apply'));
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

if (contract.locale !== 'ko') throw new Error('UI localization contract locale must be ko');
if (Object.keys(contract.persons || {}).length !== 9) throw new Error('expected 9 missing person translations');
if (Object.keys(contract.polities || {}).length !== 15) throw new Error('expected 15 missing polity translations');
if (Object.keys(contract.roles || {}).length !== 149) throw new Error('expected 149 active role translations');

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) throw new Error('SUPABASE_DB_URL is required');
fs.mkdirSync(outputDir, { recursive: true });

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
const sortedEntries = (obj) => Object.entries(obj).sort(([a], [b]) => a.localeCompare(b, 'en'));

async function relationshipSnapshot() {
  const result = await client.query(`
    select count(*)::int as count,
           md5(coalesce(string_agg(row_to_json(pp)::text, E'\\n' order by pp.id), '')) as digest
      from atlas_v2.person_politics_v2 pp`);
  return result.rows[0];
}

async function activeEnglishNames(kind) {
  if (kind === 'person') {
    const result = await client.query(`
      select en.name
        from atlas_v2.persons p
        join atlas_v2.person_names en on en.person_id=p.id and en.locale='en' and en.is_preferred=true
       where exists(select 1 from atlas_v2.person_politics_v2 pp where pp.person_id=p.id)
       order by en.name`);
    return result.rows.map((r) => r.name);
  }
  const result = await client.query(`
    select en.name
      from atlas_v2.polities p
      join atlas_v2.polity_names en on en.polity_id=p.id and en.locale='en' and en.is_preferred=true
     where exists(select 1 from atlas_v2.person_politics_v2 pp where pp.polity_id=p.id)
     order by en.name`);
  return result.rows.map((r) => r.name);
}

async function activeRoleLabels() {
  const result = await client.query(`
    select distinct r.source_label
      from atlas_v2.person_politics_v2 pp
      join atlas_v2.roles r on r.id=pp.role_id
     order by r.source_label`);
  return result.rows.map((r) => r.source_label);
}

async function ensurePersonName(english, korean) {
  const resolved = await client.query(`
    select distinct pn.person_id as id
      from atlas_v2.person_names pn
     where pn.locale='en' and pn.is_preferred=true and pn.name=$1
     order by pn.person_id
     limit 2`, [english]);
  if (resolved.rows.length !== 1) throw new Error(`person localization target unresolved or ambiguous: ${english}`);
  const personId = resolved.rows[0].id;
  const preferred = await client.query(`select id,name from atlas_v2.person_names where person_id=$1 and locale='ko' and is_preferred=true order by id`, [personId]);
  if (preferred.rows.length) {
    if (preferred.rows.length !== 1 || preferred.rows[0].name !== korean) throw new Error(`unexpected existing preferred Korean person name for ${english}`);
    return 'existing';
  }
  const same = await client.query(`select id from atlas_v2.person_names where person_id=$1 and locale='ko' and name=$2 order by id limit 2`, [personId, korean]);
  if (same.rows.length === 1) {
    await client.query(`update atlas_v2.person_names set is_preferred=true where id=$1`, [same.rows[0].id]);
    return 'promoted';
  }
  await client.query(`insert into atlas_v2.person_names(id,person_id,locale,name,name_type,is_preferred) values(gen_random_uuid(),$1,'ko',$2,'display',true)`, [personId, korean]);
  return 'inserted';
}

async function ensurePolityName(english, korean) {
  const resolved = await client.query(`
    select distinct pn.polity_id as id
      from atlas_v2.polity_names pn
     where pn.locale='en' and pn.is_preferred=true and pn.name=$1
     order by pn.polity_id
     limit 2`, [english]);
  if (resolved.rows.length !== 1) throw new Error(`polity localization target unresolved or ambiguous: ${english}`);
  const polityId = resolved.rows[0].id;
  const preferred = await client.query(`select id,name from atlas_v2.polity_names where polity_id=$1 and locale='ko' and is_preferred=true order by id`, [polityId]);
  if (preferred.rows.length) {
    if (preferred.rows.length !== 1 || preferred.rows[0].name !== korean) throw new Error(`unexpected existing preferred Korean polity name for ${english}`);
    return 'existing';
  }
  const same = await client.query(`select id from atlas_v2.polity_names where polity_id=$1 and locale='ko' and name=$2 order by id limit 2`, [polityId, korean]);
  if (same.rows.length === 1) {
    await client.query(`update atlas_v2.polity_names set is_preferred=true where id=$1`, [same.rows[0].id]);
    return 'promoted';
  }
  await client.query(`insert into atlas_v2.polity_names(id,polity_id,locale,name,name_type,is_preferred) values(gen_random_uuid(),$1,'ko',$2,'display',true)`, [polityId, korean]);
  return 'inserted';
}

async function ensureRoleName(english, korean) {
  const resolved = await client.query(`select id from atlas_v2.roles where source_label=$1 order by id limit 2`, [english]);
  if (resolved.rows.length !== 1) throw new Error(`role localization target unresolved or ambiguous: ${english}`);
  const roleId = resolved.rows[0].id;
  const preferred = await client.query(`select id,name from atlas_v2.role_names where role_id=$1 and locale='ko' and is_preferred=true order by id`, [roleId]);
  if (preferred.rows.length) {
    if (preferred.length !== 1 || preferred.rows[0].name !== korean) throw new Error(`unexpected existing preferred Korean role name for ${english}`);
    return 'existing';
  }
  const same = await client.query(`select id from atlas_v2.role_names where role_id=$1 and locale='ko' and name=$2 order by id limit 2`, [roleId, korean]);
  if (same.rows.length === 1) {
    await client.query(`update atlas_v2.role_names set is_preferred=true where id=$1`, [same.rows[0].id]);
    return 'promoted';
  }
  await client.query(`insert into atlas_v2.role_names(id,role_id,locale,name,is_preferred) values(gen_random_uuid(),$1,'ko',$2,true)`, [roleId, korean]);
  return 'inserted';
}

async function missingCounts() {
  const result = await client.query(`
    select
      (select count(*)::int
         from atlas_v2.persons p
        where exists(select 1 from atlas_v2.person_politics_v2 pp where pp.person_id=p.id)
          and not exists(select 1 from atlas_v2.person_names ko where ko.person_id=p.id and ko.locale='ko' and ko.is_preferred=true)) as persons,
      (select count(*)::int
         from atlas_v2.polities p
        where exists(select 1 from atlas_v2.person_politics_v2 pp where pp.polity_id=p.id)
          and not exists(select 1 from atlas_v2.polity_names ko where ko.polity_id=p.id and ko.locale='ko' and ko.is_preferred=true)) as polities,
      (select count(*)::int
         from atlas_v2.roles r
        where exists(select 1 from atlas_v2.person_politics_v2 pp where pp.role_id=r.id)
          and not exists(select 1 from atlas_v2.role_names ko where ko.role_id=r.id and ko.locale='ko' and ko.is_preferred=true)) as roles`);
  return result.rows[0];
}

await client.connect();
const report = { marker: 'PHASE9_UI_LOCALIZATION_APPLY', contract_version: contract.version };
try {
  await client.query('begin');
  await client.query(`select pg_advisory_xact_lock(hashtext('atlas-person-db-phase9-ui-localization'))`);
  const before = await relationshipSnapshot();
  if (before.count !== 349) throw new Error(`expected 349 authoritative relationships, got ${before.count}`);

  const personKeys = new Set(Object.keys(contract.persons));
  const polityKeys = new Set(Object.keys(contract.polities));
  const roleKeys = new Set(Object.keys(contract.roles));
  const activePersons = new Set(await activeEnglishNames('person'));
  const activePolities = new Set(await activeEnglishNames('polity'));
  const activeRoles = new Set(await activeRoleLabels());
  for (const key of personKeys) if (!activePersons.has(key)) throw new Error(`person mapping is not active: ${key}`);
  for (const key of polityKeys) if (!activePolities.has(key)) throw new Error(`polity mapping is not active: ${key}`);
  if (activeRoles.size !== roleKeys.size || [...activeRoles].some((key) => !roleKeys.has(key))) {
    const unmapped = [...activeRoles].filter((key) => !roleKeys.has(key));
    const stale = [...roleKeys].filter((key) => !activeRoles.has(key));
    throw new Error(`role localization coverage mismatch; unmapped=${JSON.stringify(unmapped)} stale=${JSON.stringify(stale)}`);
  }

  const beforeMissing = await missingCounts();
  const actions = { persons: {}, polities: {}, roles: {} };
  for (const [en, ko] of sortedEntries(contract.persons)) actions.persons[en] = await ensurePersonName(en, ko);
  for (const [en, ko] of sortedEntries(contract.polities)) actions.polities[en] = await ensurePolityName(en, ko);
  for (const [en, ko] of sortedEntries(contract.roles)) actions.roles[en] = await ensureRoleName(en, ko);

  const afterMissing = await missingCounts();
  if (afterMissing.persons !== 0 || afterMissing.polities !== 0 || afterMissing.roles !== 0) {
    throw new Error(`Korean localization incomplete after apply: ${JSON.stringify(afterMissing)}`);
  }
  const after = await relationshipSnapshot();
  if (after.count !== before.count || after.digest !== before.digest) throw new Error('authoritative relationship rows changed during localization apply');

  report.before_relationships = before;
  report.after_relationships = after;
  report.before_missing = beforeMissing;
  report.after_missing = afterMissing;
  report.actions = actions;
  report.relationships_unchanged = true;
  report.status = 'PASS';
  await client.query('commit');
} catch (error) {
  await client.query('rollback');
  report.status = 'FAIL';
  report.error = error?.message || String(error);
  fs.writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  throw error;
} finally {
  await client.end();
}
fs.writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
