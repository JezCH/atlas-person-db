import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const proposalPath = path.join(root, 'db/proposals/stage2_entity_boundaries.rehearsal.sql');
const contract = JSON.parse(fs.readFileSync(path.join(root, 'stage2/contracts/entity-boundaries-current.v1.json'), 'utf8'));
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL is required for Stage 2 entity-boundary rehearsal');

const expectedTables = [
  'people_groups','people_group_names','historical_events','historical_event_names',
  'person_people_affiliations','person_event_participations','people_group_sources','historical_event_sources',
  'person_people_affiliation_sources','person_event_participation_sources'
].sort();
const sourceTables = ['people_group_sources','historical_event_sources','person_people_affiliation_sources','person_event_participation_sources'].sort();

function same(actual, expected, label) {
  const a = [...actual].sort(); const b = [...expected].sort();
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${label} mismatch: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
}

if (contract.schema !== 'atlas-stage2-entity-boundary-contract/v1') throw new Error('entity-boundary contract schema drift');
if (contract.production_migration_authorized !== false) throw new Error('entity-boundary contract cannot authorize Production');
if (contract.identity_principles?.people_group_is_polity !== false || contract.identity_principles?.historical_event_is_polity !== false) throw new Error('People/Event must remain separate from Polity');
if (contract.activity_semantic_key_rules?.people_group_uuid_in_activity_semantic_key !== false || contract.activity_semantic_key_rules?.historical_event_uuid_in_activity_semantic_key !== false) throw new Error('People/Event must remain outside Activity semantic identity');

const ddl = fs.readFileSync(proposalPath, 'utf8');
if (!/REHEARSAL ONLY/i.test(ddl)) throw new Error('entity-boundary proposal must remain rehearsal-only');
if (/\b(?:insert|update|delete)\s+(?:into\s+|from\s+)?atlas_v2\.person_politics_v2\b/i.test(ddl)) throw new Error('entity-boundary proposal must not mutate Person-Polity Activities');

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  const prereq = await client.query(`select to_regclass('atlas_v2.polity_names') as polity_names, to_regclass('atlas_v2.persons') as persons, to_regclass('atlas_v2.sources') as sources, to_regprocedure('atlas_v2.temporal_boundary_or_unresolved_valid(integer,smallint,smallint,text,text,text)') as temporal_validator`);
  if (Object.values(prereq.rows[0] || {}).some((value) => !value)) throw new Error(`Stage 2 semantic rehearsal must run first: ${JSON.stringify(prereq.rows[0])}`);

  await client.query(ddl);
  const tables = await client.query(`select table_name from information_schema.tables where table_schema='atlas_v2' and table_name=any($1::text[]) order by table_name`, [expectedTables]);
  same(tables.rows.map((row) => row.table_name), expectedTables, 'entity-boundary tables');

  const nameKindColumn = await client.query(`select data_type,is_nullable from information_schema.columns where table_schema='atlas_v2' and table_name='polity_names' and column_name='semantic_name_kind'`);
  if (nameKindColumn.rows.length !== 1 || nameKindColumn.rows[0].data_type !== 'text' || nameKindColumn.rows[0].is_nullable !== 'YES') throw new Error('semantic_name_kind must be additive nullable text during P5');

  const pks = await client.query(`select tc.table_name,json_agg(kcu.column_name order by kcu.ordinal_position) as columns from information_schema.table_constraints tc join information_schema.key_column_usage kcu on tc.constraint_name=kcu.constraint_name and tc.constraint_schema=kcu.constraint_schema where tc.constraint_schema='atlas_v2' and tc.constraint_type='PRIMARY KEY' and tc.table_name=any($1::text[]) group by tc.table_name`, [sourceTables]);
  if (pks.rows.length !== sourceTables.length) throw new Error('entity-boundary provenance PKs incomplete');
  for (const row of pks.rows) if (!Array.isArray(row.columns) || row.columns.length !== 3 || !row.columns.includes('source_id') || !row.columns.includes('source_locator_key')) throw new Error(`${row.table_name} must preserve multiple locators per source/assertion`);

  await client.query('BEGIN');
  try {
    const person = '00000000-0000-4000-8000-000000009001';
    const people = '00000000-0000-4000-8000-000000009002';
    const event = '00000000-0000-4000-8000-000000009003';
    const affiliation = '00000000-0000-4000-8000-000000009004';
    const participation = '00000000-0000-4000-8000-000000009005';
    const source = '00000000-0000-4000-8000-000000009006';
    await client.query(`insert into atlas_v2.persons(id,canonical_key,person_type,historicity) values ($1,'entity-boundary-person','historical','historical')`, [person]);
    await client.query(`insert into atlas_v2.sources(id,source_key,source_type,title,sha256,bytes) values ($1,'entity-boundary-source','test_fixture','Entity boundary source','probe',1)`, [source]);
    await client.query(`insert into atlas_v2.people_groups(id,canonical_key,people_type,historicity) values ($1,'entity-boundary-people','tribal_people','historical')`, [people]);
    await client.query(`insert into atlas_v2.historical_events(id,canonical_key,event_type,historicity,confidence) values ($1,'entity-boundary-event','expedition','historical','well_established')`, [event]);
    await client.query(`insert into atlas_v2.person_people_affiliations(id,person_id,people_group_id,affiliation_type,valid_from_year,valid_from_granularity,valid_from_certainty,valid_from_calendar,confidence) values ($1,$2,$3,'member_of',-203,'year','approximate','source_calendar','likely')`, [affiliation, person, people]);
    await client.query(`insert into atlas_v2.person_event_participations(id,person_id,historical_event_id,participation_type,role_label,confidence) values ($1,$2,$3,'participant','interpreter / cultural intermediary','well_established')`, [participation, person, event]);
    await client.query(`insert into atlas_v2.person_people_affiliation_sources values ($1,$2,'page:1'),($1,$2,'page:2')`, [affiliation, source]);
    await client.query(`insert into atlas_v2.person_event_participation_sources values ($1,$2,'section:event')`, [participation, source]);
    const links = await client.query(`select (select count(*) from atlas_v2.person_people_affiliation_sources)::int as people_links,(select count(*) from atlas_v2.person_event_participation_sources)::int as event_links`);
    if (links.rows[0].people_links !== 2 || links.rows[0].event_links !== 1) throw new Error('People/Event provenance locator preservation failed');

    await client.query('SAVEPOINT bad_year');
    let yearZeroRejected = false;
    try { await client.query(`insert into atlas_v2.person_people_affiliations(id,person_id,people_group_id,affiliation_type,valid_from_year,valid_from_granularity,valid_from_certainty,valid_from_calendar,confidence) values ('00000000-0000-4000-8000-000000009007',$1,$2,'member_of',0,'year','exact','gregorian','unknown')`, [person, people]); }
    catch (error) { yearZeroRejected = /boundary_check/i.test(String(error?.message || error)); await client.query('ROLLBACK TO SAVEPOINT bad_year'); }
    if (!yearZeroRejected) throw new Error('year zero must be rejected for People affiliation');

    const unresolved = '00000000-0000-4000-8000-000000009008';
    await client.query(`insert into atlas_v2.person_event_participations(id,person_id,historical_event_id,participation_type,confidence) values ($1,$2,$3,'witness','unknown')`, [unresolved, person, event]);

    const activityCount = await client.query(`select count(*)::int as n from atlas_v2.person_politics_v2 where person_id=$1`, [person]);
    if (activityCount.rows[0].n !== 0) throw new Error('People/Event records must not synthesize Person-Polity Activity');
  } finally { await client.query('ROLLBACK'); }

  console.log(JSON.stringify({ marker:'ATLAS_STAGE2_ENTITY_BOUNDARY_REHEARSAL_V1', status:'PASS', production_migration_registered:false,
    people_event_tables:expectedTables.length, polity_name_semantic_kind_additive:true, people_event_outside_activity_identity:true,
    normalized_provenance:true, multiple_locators_preserved:true, unresolved_boundaries_preserved:true }, null, 2));
} finally { await client.end(); }
