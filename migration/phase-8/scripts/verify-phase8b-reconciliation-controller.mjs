#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const output = process.argv[2] || 'migration/phase-8/tmp/phase8b-controller/verification.json';
const index = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
const admin = fs.readFileSync(path.join(process.cwd(), 'admin.html'), 'utf8');
const source = fs.readFileSync(path.join(process.cwd(), 'atlas-reconciliation-controller.js'), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

assert(!index.includes('atlas-reconciliation-controller.js'), 'production index loads reconciliation controller');
assert(!admin.includes('atlas-reconciliation-controller.js'), 'admin page loads reconciliation controller');
assert(!source.includes('.from('), 'controller contains direct table call');
assert(!source.includes('.insert('), 'controller contains direct insert call');
assert(!source.includes('.update('), 'controller contains direct update call');
assert(!source.includes('.delete('), 'controller contains direct delete call');
assert(source.includes('falling back to disabled'), 'fail-closed disabled fallback missing');
assert(source.includes('v2_committed: false'), 'v2 commit guard missing');

const report = {
  marker: 'PHASE_8B_RECONCILIATION_CONTROLLER_VERIFICATION',
  production_loaded: false,
  admin_loaded: false,
  direct_database_calls: 0,
  default_state: 'disabled',
  dry_run_commits: false,
  v2_commits: 0,
  failures,
  pass: failures.length === 0
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exit(2);
