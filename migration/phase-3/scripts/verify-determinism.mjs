#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [dirA, dirB] = process.argv.slice(2).map(p => path.resolve(p));
if (!dirA || !dirB) {
  console.error('Usage: verify-determinism.mjs <dir-a> <dir-b>');
  process.exit(2);
}
const expected = [
  'phase-3-schema.sql',
  'phase-3-bundle-report.json',
  'phase-3-contract-report.json',
  'phase-3-safety-report.json',
  'phase-3-coverage-report.json'
];
const failures = [];
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for (const name of expected) {
  const a = path.join(dirA, name), b = path.join(dirB, name);
  if (!fs.existsSync(a) || !fs.existsSync(b)) {
    failures.push({ file: name, reason: 'missing' });
    continue;
  }
  const ha = sha(a), hb = sha(b);
  if (ha !== hb) failures.push({ file: name, reason: 'hash_mismatch', a: ha, b: hb });
}
const report = { status: failures.length === 0 ? 'PASS' : 'FAIL', files: expected, failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(24);
