import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const connectionString = String(process.env.SUPABASE_DB_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(connectionString)) throw new Error('SUPABASE_DB_URL is required');

const outputDir = path.resolve(process.env.PHASE9A_OUTPUT_DIR || 'migration/phase-9/tmp/schema-apply');
fs.mkdirSync(outputDir, { recursive: true });
const reportPath = path.join(outputDir, 'report.json');
const sql = fs.readFileSync(new URL('../phase9a-admin-duplicate-review-schema.sql', import.meta.url), 'utf8');
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

const report = {
  marker: 'PHASE9A_ADMIN_DUPLICATE_REVIEW_SCHEMA',
  applied: false,
  status: 'STARTED'
};

function persistReport() {
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

async function relationshipSnapshot() {
  const result = await client.query(`
    select count(*)::int as count,
           md5(coalesce(string_agg(row_to_json(pp)::text, E'\\n' order by pp.id), '')) as digest
      from atlas_v2.person_politics_v2 pp
  `);
  return result.rows[0];
}

async function objectSnapshot() {
  const objects = await client.query(`
    select to_regclass('atlas_v2.person_duplicate_candidates')::text as candidates,
           to_regclass('atlas_v2.person_duplicate_reviews')::text as reviews
  `);
  const columns = await client.query(`
    select table_name, ordinal_position, column_name, data_type, is_nullable
      from information_schema.columns
     where table_schema = 'atlas_v2'
       and table_name in ('person_duplicate_candidates','person_duplicate_reviews')
     order by table_name, ordinal_position
  `);
  return { objects: objects.rows[0], columns: columns.rows };
}

await client.connect();
try {
  report.before_relationships = await relationshipSnapshot();
  await client.query(sql);

  const snapshot = await objectSnapshot();
  report.objects = snapshot.objects;
  report.columns = snapshot.columns;
  report.after_relationships = await relationshipSnapshot();

  if (!report.objects.candidates || !report.objects.reviews) {
    throw new Error('duplicate review objects missing after apply');
  }
  if (
    report.before_relationships.count !== report.after_relationships.count ||
    report.before_relationships.digest !== report.after_relationships.digest
  ) {
    throw new Error('authoritative relationship rows changed during Phase 9A schema apply');
  }

  report.relationships_unchanged = true;
  report.applied = true;
  report.status = 'PASS';
  persistReport();
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  try {
    await client.query('ROLLBACK');
  } catch {
    // The schema SQL may already have rolled back or committed; preserve the original error.
  }

  report.status = 'FAIL';
  report.error = error?.message || String(error);
  report.relationships_unchanged = false;
  try {
    const snapshot = await objectSnapshot();
    report.objects_after_failure = snapshot.objects;
    report.columns_after_failure = snapshot.columns;
    report.relationships_after_failure = await relationshipSnapshot();
    if (report.before_relationships) {
      report.relationships_unchanged =
        report.before_relationships.count === report.relationships_after_failure.count &&
        report.before_relationships.digest === report.relationships_after_failure.digest;
    }
  } catch (inspectionError) {
    report.failure_inspection_error = inspectionError?.message || String(inspectionError);
  }
  persistReport();
  console.error(JSON.stringify(report, null, 2));
  throw error;
} finally {
  await client.end();
}
