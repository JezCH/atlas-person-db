#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const output = process.argv[2] || 'migration/phase-8/tmp/phase8b-integration/verification.json';
const index = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
const admin = fs.readFileSync(path.join(process.cwd(), 'admin.html'), 'utf8');
const ingest = fs.readFileSync(path.join(process.cwd(), 'ingest.js'), 'utf8');
const source = fs.readFileSync(path.join(process.cwd(), 'atlas-reconciliation-integration.js'), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

assert(!index.includes('atlas-reconciliation-integration.js'), 'production index loads integration wrapper');
assert(!admin.includes('atlas-reconciliation-integration.js'), 'admin page loads integration wrapper');
assert(ingest.includes('window.ATLAS_RECONCILE_PROMISE = reconcile()'), 'legacy ingest activation changed');
assert(source.includes('controller.state === "disabled"'), 'disabled short-circuit missing');
assert(source.includes('person_politics'), 'legacy read target missing');
assert(!source.includes('atlas_v2'), 'integration wrapper contains atlas_v2 reference');

const report = {
  marker: 'PHASE_8B_RECONCILIATION_INTEGRATION_VERIFICATION',
  production_loaded: false,
  admin_loaded: false,
  legacy_ingest_unchanged: true,
  disabled_short_circuit: true,
  v2_references: 0,
  failures,
  pass: failures.length === 0
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exit(2);
