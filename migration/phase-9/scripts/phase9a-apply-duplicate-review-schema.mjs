import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const connectionString = String(process.env.SUPABASE_DB_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(connectionString)) throw new Error('SUPABASE_DB_URL is required');

const outputDir = path.resolve(process.env.PHASE9A_OUTPUT_DIR || 'migration/phase-9/tmp/schema-apply');
fs.mkdirSync(outputDir, { recursive: true });
const sql = fs.readFileSync(new URL('../phase9a-admin-duplicate-review-schema.sql', import.meta.url), 'utf8');
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  await client.query(sql);
  const objects = await client.query(`
    select to_regclass('atlas_v2.person_duplicate_candidates')::text as candidates,
           to_regclass('atlas_v2.person_duplicate_reviews')::text as reviews
  `);
  const columns = await client.query(`
    select table_name, count(*)::int as columns
    from information_schema.columns
    where table_schema = 'atlas_v2'
      and table_name in ('person_duplicate_candidates','person_duplicate_reviews')
    group by table_name
    order by table_name
  `);
  const report = {
    marker: 'PHASE9A_ADMIN_DUPLICATE_REVIEW_SCHEMA',
    applied: true,
    objects: objects.rows[0],
    columns: columns.rows
  };
  if (!report.objects.candidates || !report.objects.reviews) throw new Error('duplicate review objects missing after apply');
  fs.writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await client.end();
}
