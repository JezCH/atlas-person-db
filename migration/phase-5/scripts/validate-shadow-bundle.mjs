import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || '.';
const out = process.argv[3] || 'migration/phase-5/tmp/run';
const contract = JSON.parse(fs.readFileSync(path.join(root, 'migration/phase-5/contracts/shadow-schema.contract.json'), 'utf8'));
const prohibited = JSON.parse(fs.readFileSync(path.join(root, 'migration/phase-5/contracts/prohibited-operations.json'), 'utf8'));
const sql = fs.readFileSync(path.join(out, 'phase-5-deployment.sql'), 'utf8');
const rollback = fs.readFileSync(path.join(out, 'phase-5-rollback.sql'), 'utf8');
const build = JSON.parse(fs.readFileSync(path.join(out, 'phase-5-build-report.json'), 'utf8'));
const failures = [];

for (const table of contract.required_tables) {
  const needle = `atlas_v2.${table}`;
  if (!sql.includes(needle)) failures.push(`missing table reference: ${needle}`);
}
for (const pattern of prohibited.patterns || prohibited.prohibited_patterns || []) {
  const regex = new RegExp(pattern, 'i');
  if (regex.test(sql)) failures.push(`prohibited operation: ${pattern}`);
}
const explicit = [
  /alter\s+table\s+public\.person_politics/i,
  /drop\s+table\s+public\.person_politics/i,
  /truncate\s+(table\s+)?public\.person_politics/i,
  /insert\s+into\s+public\.person_politics/i,
  /update\s+public\.person_politics/i,
  /delete\s+from\s+public\.person_politics/i,
  /grant\s+.+\s+to\s+(anon|authenticated)/i
];
for (const regex of explicit) if (regex.test(sql)) failures.push(`prohibited SQL: ${regex}`);
if (!sql.startsWith('-- PHASE 5 FULL SHADOW LOAD BUNDLE')) failures.push('full-load marker missing');
if (sql.includes('DEFINITION-ONLY')) failures.push('definition-only marker is forbidden');
if (!sql.includes('begin;') || !sql.includes('commit;')) failures.push('transaction boundary missing');
if (!sql.includes('pg_advisory_xact_lock')) failures.push('advisory lock missing');
if (!rollback.includes('drop schema atlas_v2 cascade')) failures.push('rollback drop missing');
if (!rollback.includes('rollback precondition failed')) failures.push('rollback precondition missing');
if (!sql.includes('enable row level security')) failures.push('RLS enablement missing');
if (!sql.includes('legacy_source_key text not null unique')) failures.push('legacy source key constraint missing');
if (!sql.includes('insert into atlas_v2.persons')) failures.push('persons load missing');
if (!sql.includes('insert into atlas_v2.polities')) failures.push('polities load missing');
if (!sql.includes('insert into atlas_v2.person_politics_v2')) failures.push('relationships load missing');
if (!sql.includes('count contract failed')) failures.push('count assertion missing');
if (!sql.includes('legacy source key distinct count failed')) failures.push('source-key assertion missing');
if (build.marker !== 'FULL_SHADOW_LOAD') failures.push('build report marker mismatch');
for (const [key, expected] of Object.entries(contract.expected_counts)) {
  if (build.counts?.[key] !== expected) failures.push(`build count mismatch ${key}: ${build.counts?.[key]} != ${expected}`);
}

const report = { status: failures.length ? 'FAIL' : 'PASS', failures, marker: build.marker, counts: build.counts };
fs.writeFileSync(path.join(out, 'phase-5-validation-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(31);
