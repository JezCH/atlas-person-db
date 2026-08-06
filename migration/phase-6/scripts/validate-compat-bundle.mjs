import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || '.';
const out = process.argv[3] || 'migration/phase-6/tmp/run';
const contract = JSON.parse(fs.readFileSync(path.join(root, 'migration/phase-6/contracts/compatibility.contract.json'), 'utf8'));
const deployment = fs.readFileSync(path.join(out, 'phase-6-deployment.sql'), 'utf8');
const rollback = fs.readFileSync(path.join(out, 'phase-6-rollback.sql'), 'utf8');
const failures = [];

const mustContain = [
  '-- PHASE 6 COMPATIBILITY READER BUNDLE',
  'begin;',
  "pg_advisory_xact_lock(hashtext('atlas-person-db-phase-6'))",
  `create or replace view ${contract.compat_object}`,
  'from atlas_v2.person_politics_v2 pp',
  'grant select on public.atlas_person_politics_compat_v1 to anon, authenticated',
  'commit;'
];
for (const token of mustContain) if (!deployment.includes(token)) failures.push(`missing deployment token: ${token}`);

const forbidden = [
  /insert\s+into\s+public\.person_politics/i,
  /update\s+public\.person_politics/i,
  /delete\s+from\s+public\.person_politics/i,
  /truncate\s+public\.person_politics/i,
  /drop\s+table\s+public\.person_politics/i,
  /grant\s+.*\s+on\s+atlas_v2\./i,
  /insert\s+into\s+atlas_v2\./i,
  /update\s+atlas_v2\./i,
  /delete\s+from\s+atlas_v2\./i
];
for (const pattern of forbidden) if (pattern.test(deployment)) failures.push(`forbidden deployment pattern: ${pattern}`);

if (!rollback.includes('drop view if exists public.atlas_person_politics_compat_v1')) failures.push('rollback does not drop compatibility view');
if (/drop\s+schema\s+atlas_v2/i.test(rollback)) failures.push('rollback attempts to drop atlas_v2');
if (/public\.person_politics/i.test(rollback)) failures.push('rollback references legacy table');

const expectedColumns = contract.runtime_contract.columns.map((x) => x.name);
const selectBlock = deployment.slice(deployment.indexOf('select\n  pp.id'), deployment.indexOf('from atlas_v2.person_politics_v2 pp'));
for (const col of expectedColumns) {
  if (col === 'id' && !/pp\.id/.test(selectBlock)) failures.push('id projection missing');
  if (col === 'person_name' && !/as person_name/.test(selectBlock)) failures.push('person_name projection missing');
  if (col === 'politic_name' && !/as politic_name/.test(selectBlock)) failures.push('politic_name projection missing');
  if (col === 'activity_start' && !/pp\.activity_start/.test(selectBlock)) failures.push('activity_start projection missing');
  if (col === 'activity_end' && !/pp\.activity_end/.test(selectBlock)) failures.push('activity_end projection missing');
  if (col === 'role' && !/as role/.test(selectBlock)) failures.push('role projection missing');
  if (col === 'period_basis' && !/as period_basis/.test(selectBlock)) failures.push('period_basis projection missing');
  if (col === 'notes' && !/pp\.notes/.test(selectBlock)) failures.push('notes projection missing');
}

const report = {
  status: failures.length ? 'FAIL' : 'PASS',
  failures,
  marker: 'PHASE_6_COMPATIBILITY_READER',
  compat_object: contract.compat_object,
  expected_rows: contract.expected_v2_rows
};
fs.writeFileSync(path.join(out, 'phase-6-validation-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
