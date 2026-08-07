#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { planReconciliation } = require('../../../atlas-reconciliation-planner.js');

const output = process.argv[2] || 'migration/phase-8/tmp/phase8b-reconciliation/verification.json';
const index = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
const admin = fs.readFileSync(path.join(process.cwd(), 'admin.html'), 'utf8');
const plannerSource = fs.readFileSync(path.join(process.cwd(), 'atlas-reconciliation-planner.js'), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const fixture = planReconciliation({
  snapshotId: 'phase8b-verification-fixture',
  existingRows: [{
    id: 1,
    person_name: 'Ada Lovelace',
    politic_name: 'United Kingdom',
    activity_start: 1842,
    activity_end: 1852,
    role: 'Writer',
    period_basis: 'intellectual_activity',
    notes: null
  }],
  canonicalRows: [{
    person_name: 'Ada Lovelace',
    politic_name: 'United Kingdom',
    activity_start: 1842,
    activity_end: 1852,
    role: 'Mathematician',
    period_basis: 'intellectual_activity',
    notes: null
  }]
});

assert(!index.includes('atlas-reconciliation-planner.js'), 'production index loads reconciliation planner');
assert(!admin.includes('atlas-reconciliation-planner.js'), 'admin page loads reconciliation planner');
assert(!plannerSource.includes('.from('), 'planner contains database table calls');
assert(!plannerSource.includes('.insert('), 'planner contains insert call');
assert(!plannerSource.includes('.update('), 'planner contains update call');
assert(!plannerSource.includes('.delete('), 'planner contains delete call');
assert(fixture.commit === false, 'planner commit flag is not false');
assert(fixture.database_writes === 0, 'planner reports non-zero database writes');
assert(fixture.proposed_updates.length === 1, 'fixture update proposal mismatch');
assert(fixture.proposed_updates[0]?.reason_code === 'FIELD_DIFFERENCE', 'fixture update reason code mismatch');

const report = {
  marker: 'PHASE_8B_RECONCILIATION_PLANNER_VERIFICATION',
  production_loaded: false,
  admin_loaded: false,
  pure_planner: true,
  database_calls: 0,
  commit: fixture.commit,
  database_writes: fixture.database_writes,
  fixture_counts: {
    inserts: fixture.proposed_inserts.length,
    updates: fixture.proposed_updates.length,
    deletes: fixture.proposed_deletes.length,
    duplicate_removals: fixture.proposed_duplicate_removals.length,
    validation_failures: fixture.validation_failures.length
  },
  failures,
  pass: failures.length === 0
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exit(2);
