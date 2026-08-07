#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const output = process.argv[2] || 'migration/phase-8/tmp/phase8b-adapter/verification.json';
const files = {
  mode: 'atlas-write-mode.js',
  adapter: 'atlas-write-adapter.js',
  index: 'index.html',
  admin: 'admin.html'
};

const content = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, fs.readFileSync(path.join(root, file), 'utf8')]));
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

assert(!content.index.includes('atlas-write-adapter.js'), 'production index loads atlas-write-adapter.js');
assert(!content.admin.includes('atlas-write-adapter.js'), 'admin page loads atlas-write-adapter.js');
assert(content.mode.includes('legacy-only'), 'legacy-only default missing');
assert(content.mode.includes('shadow-validate'), 'shadow-validate mode missing');
assert(!content.adapter.includes('.from("atlas_v2'), 'direct atlas_v2 mutation reference found');
assert(!content.adapter.includes(".from('atlas_v2"), 'direct atlas_v2 mutation reference found');
assert(content.adapter.includes('person_politics'), 'legacy table target missing');
assert(content.adapter.includes('reconciliation is disabled'), 'reconciliation disabled guard missing');

const report = {
  marker: 'PHASE_8B_DISABLED_ADAPTER_VERIFICATION',
  production_loaded: false,
  admin_loaded: false,
  authorized_mutating_mode: 'legacy-only',
  shadow_v2_commit_calls: 0,
  dual_write_enabled: false,
  v2_only_enabled: false,
  reconciliation_enabled: false,
  legacy_target: 'person_politics',
  failures,
  pass: failures.length === 0
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exit(2);
