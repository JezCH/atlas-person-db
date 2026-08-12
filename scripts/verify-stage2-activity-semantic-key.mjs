import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const proposalPath = path.join(root, 'db/proposals/stage2_activity_semantic_key.rehearsal.sql');
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL is required for Stage 2 Activity semantic-key rehearsal');

const ddl = fs.readFileSync(proposalPath, 'utf8');
if (!/REHEARSAL ONLY/i.test(ddl)) throw new Error('semantic-key proposal must remain explicitly non-production');
const executable = ddl.replace(/^\s*--.*$/gm, '');
for (const forbidden of ['activity_start_certainty','activity_end_certainty','confidence','notes','source_locator','content_hash']) {
  if (executable.includes(forbidden)) throw new Error(`evidence/content field leaked into Activity semantic identity SQL: ${forbidden}`);
}

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  const stage2Columns = await client.query(`
    select column_name from information_schema.columns
     where table_schema='atlas_v2' and table_name='person_politics_v2'
       and column_name in ('relation_type_id','activity_start_granularity','activity_start_calendar','activity_end_granularity','activity_end_calendar')
     order by column_name`);
  if (stage2Columns.rowCount !== 5) throw new Error('Stage 2 semantic schema rehearsal must run before Activity semantic-key rehearsal');

  const legacyIndexBefore = await client.query(`select indexdef from pg_indexes where schemaname='atlas_v2' and indexname='person_politics_v2_null_role_semantic_uidx'`);
  if (legacyIndexBefore.rowCount !== 1) throw new Error('reviewed v1 null-role semantic index must exist before Stage 2 replacement rehearsal');

  await client.query(ddl);

  const legacyIndexAfter = await client.query(`select indexname from pg_indexes where schemaname='atlas_v2' and indexname='person_politics_v2_null_role_semantic_uidx'`);
  if (legacyIndexAfter.rowCount !== 0) throw new Error('legacy v1 null-role semantic index survived Stage 2 replacement rehearsal');

  const indexResult = await client.query(`select indexdef from pg_indexes where schemaname='atlas_v2' and indexname='person_politics_v2_stage2_semantic_identity_uq'`);
  if (indexResult.rowCount !== 1) throw new Error('Stage 2 Activity semantic identity unique index missing');
  const indexDef = String(indexResult.rows[0].indexdef || '');
  const requiredTokens = [
    'person_id','polity_id','relation_type_id','role_id','period_basis_id',
    'activity_start','activity_start_month','activity_start_day','activity_start_granularity','activity_start_calendar',
    'activity_end','activity_end_month','activity_end_day','activity_end_granularity','activity_end_calendar'
  ];
  for (const token of requiredTokens) if (!indexDef.includes(token)) throw new Error(`semantic identity index missing ${token}`);
  if (!/NULLS NOT DISTINCT/i.test(indexDef)) throw new Error('semantic identity index must use NULLS NOT DISTINCT');

  const personId = '00000000-0000-4000-8000-000000000701';
  const polityId = '00000000-0000-4000-8000-000000000702';
  const periodBasisId = '00000000-0000-4000-8000-000000000703';
  const rulesId = '00000000-0000-4000-8000-000000000704';
  const servesId = '00000000-0000-4000-8000-000000000705';

  await client.query('BEGIN');
  try {
    await client.query(`insert into atlas_v2.persons(id,canonical_key,person_type,historicity) values($1,'stage2-semantic-person','person','historical')`, [personId]);
    await client.query(`insert into atlas_v2.polities(id,canonical_key,polity_type,historicity) values($1,'stage2-semantic-polity','state','historical')`, [polityId]);
    await client.query(`insert into atlas_v2.period_bases(id,code,is_active) values($1,'stage2_semantic_probe',true)`, [periodBasisId]);
    await client.query(`insert into atlas_v2.person_polity_relation_types(id,code,category,is_active) values($1,'probe_rules','rule',true),($2,'probe_serves','service',true)`, [rulesId, servesId]);

    const insert = async ({
      id, relationTypeId, startYear=1946, startMonth=null, startDay=null, startGranularity='year', startCalendar='gregorian', startCertainty='approximate',
      endYear=1954, endMonth=null, endDay=null, endGranularity='year', endCalendar='gregorian', endCertainty='uncertain',
      confidence='likely', notes='probe'
    }) => client.query(`
      insert into atlas_v2.person_politics_v2(
        id,person_id,polity_id,role_id,period_basis_id,activity_start,activity_end,
        confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash,
        relation_type_id,
        activity_start_month,activity_start_day,activity_start_granularity,activity_start_certainty,activity_start_calendar,
        activity_end_month,activity_end_day,activity_end_granularity,activity_end_certainty,activity_end_calendar
      ) values(
        $1,$2,$3,null,$4,$5,$6,
        $7,'exact_as_recorded',$8,$9,$10::jsonb,$11,
        $12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
      )`, [
      id, personId, polityId, periodBasisId, startYear, endYear,
      confidence, `stage2-semantic:${id}`, notes, JSON.stringify({ kind: 'stage2_semantic_probe', id }), `hash-${id}`,
      relationTypeId,
      startMonth, startDay, startGranularity, startCertainty, startCalendar,
      endMonth, endDay, endGranularity, endCertainty, endCalendar
    ]);

    await insert({ id: '00000000-0000-4000-8000-000000000711', relationTypeId: rulesId });

    await client.query('SAVEPOINT evidence_duplicate');
    let evidenceDuplicateRejected = false;
    try {
      await insert({ id: '00000000-0000-4000-8000-000000000712', relationTypeId: rulesId, startCertainty: 'exact', endCertainty: 'exact', confidence: 'well_established', notes: 'different evidence/content' });
    } catch (error) {
      evidenceDuplicateRejected = error?.code === '23505' || /person_politics_v2_stage2_semantic_identity_uq/i.test(String(error?.message || error));
      await client.query('ROLLBACK TO SAVEPOINT evidence_duplicate');
    }
    if (!evidenceDuplicateRejected) throw new Error('same semantic identity with different evidence/content was not rejected');

    await insert({ id: '00000000-0000-4000-8000-000000000713', relationTypeId: servesId });
    await insert({ id: '00000000-0000-4000-8000-000000000714', relationTypeId: rulesId, startMonth: 5, startDay: 22, startGranularity: 'day', endMonth: 12, endDay: 10, endGranularity: 'day' });
    await insert({ id: '00000000-0000-4000-8000-000000000715', relationTypeId: rulesId, startMonth: 5, startDay: 22, startGranularity: 'day', startCalendar: 'julian', endMonth: 12, endDay: 10, endGranularity: 'day', endCalendar: 'julian' });

    await insert({ id: '00000000-0000-4000-8000-000000000716', relationTypeId: null, notes: 'legacy/unready row A' });
    await insert({ id: '00000000-0000-4000-8000-000000000717', relationTypeId: null, notes: 'legacy/unready row B' });

    await client.query('SAVEPOINT null_role_duplicate');
    let nullRoleDuplicateRejected = false;
    try {
      await insert({ id: '00000000-0000-4000-8000-000000000718', relationTypeId: rulesId });
    } catch (error) {
      nullRoleDuplicateRejected = error?.code === '23505' || /person_politics_v2_stage2_semantic_identity_uq/i.test(String(error?.message || error));
      await client.query('ROLLBACK TO SAVEPOINT null_role_duplicate');
    }
    if (!nullRoleDuplicateRejected) throw new Error('duplicate ready row with null Role was not rejected');

    const counts = await client.query(`
      select
        count(*) filter (where relation_type_id is null)::int as unready_rows,
        count(*) filter (where relation_type_id=$1)::int as rules_rows,
        count(*) filter (where relation_type_id=$2)::int as serves_rows
      from atlas_v2.person_politics_v2 where person_id=$3`, [rulesId, servesId, personId]);
    if (counts.rows[0]?.unready_rows !== 2 || counts.rows[0]?.rules_rows !== 3 || counts.rows[0]?.serves_rows !== 1) throw new Error(`unexpected Stage 2 semantic probe counts: ${JSON.stringify(counts.rows[0])}`);
  } finally {
    await client.query('ROLLBACK');
  }

  console.log(JSON.stringify({
    marker: 'ATLAS_STAGE2_ACTIVITY_SEMANTIC_KEY_REHEARSAL_V2',
    status: 'PASS',
    production_migration_registered: false,
    active_production_identity_changed: false,
    legacy_null_role_index_replacement_required: true,
    relation_type_in_identity: true,
    relation_variants_with_null_role_supported: true,
    full_temporal_boundary_in_identity: true,
    calendar_in_identity: true,
    certainty_confidence_notes_provenance_excluded: true,
    legacy_unready_rows_supported: true
  }, null, 2));
} finally {
  await client.end();
}
