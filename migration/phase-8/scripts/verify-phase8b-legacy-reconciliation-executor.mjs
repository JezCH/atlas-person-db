#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const output = process.argv[2] || 'migration/phase-8/tmp/phase8b-legacy-executor/verification.json';
const index = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
const admin = fs.readFileSync(path.join(process.cwd(), 'admin.html'), 'utf8');
const source = fs.readFileSync(path.join(process.cwd(), 'atlas-legacy-reconciliation-executor.js'), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

assert(!index.includes('atlas-legacy-reconciliation-executor.js'), 'production index loads legacy reconciliation executor');
assert(!admin.includes('atlas-legacy-reconciliation-executor.js'), 'admin page loads legacy reconciliation executor');
assert(source.includes('person_politics'), 'legacy target missing');
assert(!source.includes('atlas_v2'), 'executor contains atlas_v2 reference');
assert(source.includes('plan.commit !== false'), 'dry-run plan guard missing');
assert(source.includes('plan.database_writes !== 0'), 'zero-write plan guard missing');

const report = {
  marker: 'PHASE_8B_LEGACY_RECONCILIATION_EXECUTOR_VERIFICATION',
  production_loaded: false,
  admin_loaded: false,
  legacy_target: 'person_politics',
  v2_references: 0,
  requires_non_mutating_plan: true,
  failures,
  pass: failures.length === 0
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exit(2);
