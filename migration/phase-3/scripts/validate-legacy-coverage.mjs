#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};
const root = path.resolve(getArg('--root', '.'));
const output = path.resolve(getArg('--output', path.join(root, 'migration/phase-3/reports')));
const contract = JSON.parse(fs.readFileSync(path.join(root, 'migration/phase-3/contracts/legacy-coverage.contract.json'), 'utf8'));
const failures = [];
for (const [legacyField, targets] of Object.entries(contract.legacy_fields)) {
  if (!Array.isArray(targets) || targets.length === 0) failures.push({ legacy_field: legacyField, reason: 'no_target' });
  for (const target of targets || []) {
    if (!/^[a-z0-9_]+\.[a-z0-9_]+$/i.test(target)) failures.push({ legacy_field: legacyField, reason: 'invalid_target', target });
  }
}
const requiredLegacy = ['id','person_name','politic_name','activity_start','activity_end','role','period_basis','notes','created_at','updated_at'];
for (const field of requiredLegacy) if (!Object.hasOwn(contract.legacy_fields, field)) failures.push({ legacy_field: field, reason: 'missing_mapping' });
const report = { status: failures.length === 0 ? 'PASS' : 'FAIL', mapped_fields: Object.keys(contract.legacy_fields).length, failures };
fs.writeFileSync(path.join(output, 'phase-3-coverage-report.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(23);
