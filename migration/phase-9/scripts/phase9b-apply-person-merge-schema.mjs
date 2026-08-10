import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const connectionString = String(process.env.SUPABASE_DB_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(connectionString)) throw new Error('SUPABASE_DB_URL is required');
const outputDir = path.resolve(process.env.PHASE9B_SCHEMA_OUTPUT_DIR || 'migration/phase-9/tmp/person-merge-schema-apply');
fs.mkdirSync(outputDir, { recursive: true });
const reportPath = path.join(outputDir, 'report.json');
const sql = fs.readFileSync(new URL('../phase9b-person-merge-schema.sql', import.meta.url), 'utf8');
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
const report = { marker: 'PHASE9B_PERSON_MERGE_SCHEMA', applied: false, status: 'STARTED' };
const persist = () => fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

async function relationshipSnapshot() {
  const result = await client.query(`
    select count(*)::int as count,
           md5(coalesce(string_agg(row_to_json(pp)::text, E'\\n' order by pp.id), '')) as digest
      from atlas_v2.person_politics_v2 pp`);
  return result.rows[0];
}

async function cardinalitySnapshot() {
  const result = await client.query(`
    select
      (select count(*)::int from atlas_v2.persons) as persons,
      (select count(*)::int from atlas_v2.person_duplicate_candidates) as candidates,
      (select count(*)::int from atlas_v2.person_duplicate_reviews) as reviews`);
  return result.rows[0];
}

async function schemaSnapshot() {
  const object = await client.query(`select to_regclass('atlas_v2.person_merge_audits')::text as merge_audits`);
  const columns = await client.query(`
    select ordinal_position,column_name,data_type,is_nullable
      from information_schema.columns
     where table_schema='atlas_v2' and table_name='person_merge_audits'
     order by ordinal_position`);
  const candidatePersonFks = await client.query(`
    select conname
      from pg_constraint
     where contype='f'
       and conrelid='atlas_v2.person_duplicate_candidates'::regclass
       and confrelid='atlas_v2.persons'::regclass
     order by conname`);
  return { object: object.rows[0], columns: columns.rows, candidate_person_fks: candidatePersonFks.rows };
}

await client.connect();
try {
  report.before_relationships = await relationshipSnapshot();
  report.before_counts = await cardinalitySnapshot();
  await client.query(sql);
  report.schema = await schemaSnapshot();
  report.after_relationships = await relationshipSnapshot();
  report.after_counts = await cardinalitySnapshot();

  if (!report.schema.object.merge_audits) throw new Error('person_merge_audits missing after apply');
  if (report.schema.candidate_person_fks.length !== 0) throw new Error('candidate person FKs remain after Phase 9B schema apply');
  if (report.before_relationships.count !== report.after_relationships.count || report.before_relationships.digest !== report.after_relationships.digest) {
    throw new Error('authoritative relationship rows changed during Phase 9B schema apply');
  }
  for (const key of ['persons','candidates','reviews']) {
    if (report.before_counts[key] !== report.after_counts[key]) throw new Error(`${key} count changed during Phase 9B schema apply`);
  }

  report.relationships_unchanged = true;
  report.identity_and_review_counts_unchanged = true;
  report.applied = true;
  report.status = 'PASS';
  persist();
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  try { await client.query('ROLLBACK'); } catch {}
  report.status = 'FAIL';
  report.error = error?.message || String(error);
  try {
    report.schema_after_failure = await schemaSnapshot();
    report.relationships_after_failure = await relationshipSnapshot();
    report.counts_after_failure = await cardinalitySnapshot();
  } catch (inspectionError) {
    report.failure_inspection_error = inspectionError?.message || String(inspectionError);
  }
  persist();
  console.error(JSON.stringify(report, null, 2));
  throw error;
} finally {
  await client.end();
}
