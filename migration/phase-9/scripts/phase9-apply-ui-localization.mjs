#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

const { Client } = pg;
const root = process.cwd();
const contract = JSON.parse(fs.readFileSync(path.join(root, 'migration', 'phase-9', 'ui-localization-ko.json'), 'utf8'));
const outputDir = path.resolve(process.env.PHASE9_UI_LOCALIZATION_OUTPUT_DIR || path.join(root, 'migration', 'phase-9', 'tmp', 'ui-localization-apply'));
const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) throw new Error('SUPABASE_DB_URL is required');
if (contract.locale !== 'ko') throw new Error('localization contract locale must be ko');
if (Object.keys(contract.persons || {}).length !== 9) throw new Error('expected 9 audited person gaps');
if (Object.keys(contract.polities || {}).length !== 15) throw new Error('expected 15 audited polity gaps');
if (Object.keys(contract.roles || {}).length !== 149) throw new Error('expected 149 active role translations');
fs.mkdirSync(outputDir, { recursive: true });

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
const entries = (obj) => Object.entries(obj).sort(([a], [b]) => a.localeCompare(b, 'en'));

async function relationshipSnapshot() {
  const { rows } = await client.query(`
    select count(*)::int as count,
           md5(coalesce(string_agg(row_to_json(pp)::text, E'\\n' order by pp.id), '')) as digest
      from atlas_v2.person_politics_v2 pp`);
  return rows[0];
}

async function resolveTarget(kind, english) {
  const config = kind === 'person'
    ? { table: 'person_names', fk: 'person_id' }
    : kind === 'polity'
      ? { table: 'polity_names', fk: 'polity_id' }
      : null;
  if (config) {
    const { rows } = await client.query(
      `select distinct ${config.fk} as id from atlas_v2.${config.table} where locale='en' and is_preferred=true and name=$1 order by ${config.fk} limit 2`,
      [english]
    );
    if (rows.length !== 1) throw new Error(`${kind} localization target unresolved or ambiguous: ${english}`);
    return rows[0].id;
  }
  const { rows } = await client.query(`select id from atlas_v2.roles where source_label=$1 order by id limit 2`, [english]);
  if (rows.length !== 1) throw new Error(`role localization target unresolved or ambiguous: ${english}`);
  return rows[0].id;
}

async function ensurePreferred(kind, english, korean) {
  const targetId = await resolveTarget(kind, english);
  const config = kind === 'person'
    ? { table: 'person_names', fk: 'person_id', extra: ",name_type" , extraValue: ",'display'" }
    : kind === 'polity'
      ? { table: 'polity_names', fk: 'polity_id', extra: ",name_type", extraValue: ",'display'" }
      : { table: 'role_names', fk: 'role_id', extra: '', extraValue: '' };

  const preferred = await client.query(
    `select id,name from atlas_v2.${config.table} where ${config.fk}=$1 and locale='ko' and is_preferred=true order by id`,
    [targetId]
  );
  if (preferred.rows.length) {
    if (preferred.rows.length !== 1 || preferred.rows[0].name !== korean) {
      throw new Error(`unexpected existing preferred Korean ${kind} name for ${english}`);
    }
    return 'existing';
  }

  const same = await client.query(
    `select id from atlas_v2.${config.table} where ${config.fk}=$1 and locale='ko' and name=$2 order by id limit 2`,
    [targetId, korean]
  );
  if (same.rows.length > 1) throw new Error(`duplicate Korean ${kind} alias rows for ${english}`);
  if (same.rows.length === 1) {
    await client.query(`update atlas_v2.${config.table} set is_preferred=true where id=$1`, [same.rows[0].id]);
    return 'promoted';
  }

  await client.query(
    `insert into atlas_v2.${config.table}(id,${config.fk},locale,name${config.extra},is_preferred) values(gen_random_uuid(),$1,'ko',$2${config.extraValue},true)`,
    [targetId, korean]
  );
  return 'inserted';
}

async function activeRoleLabels() {
  const { rows } = await client.query(`
    select distinct r.source_label
      from atlas_v2.person_politics_v2 pp
      join atlas_v2.roles r on r.id=pp.role_id
     order by r.source_label`);
  return rows.map((row) => row.source_label);
}

async function missingCounts() {
  const { rows } = await client.query(`
    select
      (select count(*)::int from atlas_v2.persons p
        where exists(select 1 from atlas_v2.person_politics_v2 pp where pp.person_id=p.id)
          and not exists(select 1 from atlas_v2.person_names n where n.person_id=p.id and n.locale='ko' and n.is_preferred=true)) as persons,
      (select count(*)::int from atlas_v2.polities p
        where exists(select 1 from atlas_v2.person_politics_v2 pp where pp.polity_id=p.id)
          and not exists(select 1 from atlas_v2.polity_names n where n.polity_id=p.id and n.locale='ko' and n.is_preferred=true)) as polities,
      (select count(*)::int from atlas_v2.roles r
        where exists(select 1 from atlas_v2.person_politics_v2 pp where pp.role_id=r.id)
          and not exists(select 1 from atlas_v2.role_names n where n.role_id=r.id and n.locale='ko' and n.is_preferred=true)) as roles`);
  return rows[0];
}

const report = { marker: 'PHASE9_UI_LOCALIZATION_APPLY', contract_version: contract.version };
await client.connect();
try {
  await client.query('begin');
  await client.query(`select pg_advisory_xact_lock(hashtext('atlas-person-db-phase9-ui-localization'))`);

  const before = await relationshipSnapshot();
  if (before.count !== 349) throw new Error(`expected 349 authoritative relationships, got ${before.count}`);

  const activeRoles = new Set(await activeRoleLabels());
  const mappedRoles = new Set(Object.keys(contract.roles));
  const unmapped = [...activeRoles].filter((label) => !mappedRoles.has(label));
  const stale = [...mappedRoles].filter((label) => !activeRoles.has(label));
  if (unmapped.length || stale.length || activeRoles.size !== 149) {
    throw new Error(`role localization coverage mismatch; unmapped=${JSON.stringify(unmapped)} stale=${JSON.stringify(stale)}`);
  }

  const beforeMissing = await missingCounts();
  const actions = { persons: {}, polities: {}, roles: {} };
  for (const [en, ko] of entries(contract.persons)) actions.persons[en] = await ensurePreferred('person', en, ko);
  for (const [en, ko] of entries(contract.polities)) actions.polities[en] = await ensurePreferred('polity', en, ko);
  for (const [en, ko] of entries(contract.roles)) actions.roles[en] = await ensurePreferred('role', en, ko);

  const afterMissing = await missingCounts();
  if (afterMissing.persons !== 0 || afterMissing.polities !== 0 || afterMissing.roles !== 0) {
    throw new Error(`Korean localization incomplete after apply: ${JSON.stringify(afterMissing)}`);
  }

  const after = await relationshipSnapshot();
  if (after.count !== before.count || after.digest !== before.digest) {
    throw new Error('authoritative relationship rows changed during localization apply');
  }

  Object.assign(report, {
    before_relationships: before,
    after_relationships: after,
    before_missing: beforeMissing,
    after_missing: afterMissing,
    actions,
    relationships_unchanged: true,
    status: 'PASS'
  });
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
