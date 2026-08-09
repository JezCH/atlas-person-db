#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const output = process.argv[2] || 'migration/phase-8/tmp/phase8b-adapter/verification.json';
const files = {
  mode: 'atlas-write-mode.js',
  adapter: 'atlas-write-adapter.js',
  index: 'index.html',
  admin: 'admin.html',
  app: 'app.js',
  adminJs: 'admin.js'
};

const content = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, fs.readFileSync(path.join(root, file), 'utf8')]));
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

assert(content.index.includes('atlas-write-adapter.js'), 'production index no longer loads the approved write adapter');
assert(content.admin.includes('atlas-write-adapter.js'), 'admin page no longer loads the approved write adapter');
assert(content.mode.includes('legacy-only'), 'legacy-only mode missing');
assert(content.mode.includes('shadow-validate'), 'shadow-validate mode missing');
assert(content.mode.includes('dual-write'), 'dual-write contract missing');
assert(!content.adapter.includes('.from("atlas_v2'), 'direct atlas_v2 mutation reference found in browser adapter');
assert(!content.adapter.includes(".from('atlas_v2"), 'direct atlas_v2 mutation reference found in browser adapter');
assert(content.adapter.includes('person_politics'), 'legacy table target missing');
assert(content.adapter.includes('reconciliation is disabled'), 'legacy adapter reconciliation guard missing');
assert(content.app.includes('mode: "shadow-validate"'), 'app is no longer pinned to shadow-validate before protected activation');
assert(content.adminJs.includes('mode: "shadow-validate"'), 'admin is no longer pinned to shadow-validate before protected activation');
assert(!content.index.includes('atlas-dual-write-coordinator.js'), 'dual-write coordinator activated in production index prematurely');

const report = {
  marker: 'PHASE_8B_ADAPTER_TRANSITION_VERIFICATION',
  adapter_loaded_in_app: true,
  adapter_loaded_in_admin: true,
  app_mode: 'shadow-validate',
  admin_mode: 'shadow-validate',
  dual_write_contract_available: true,
  dual_write_runtime_activated: false,
  direct_browser_v2_mutation_calls: 0,
  reconciliation_enabled_in_legacy_adapter: false,
  legacy_target: 'person_politics',
  failures,
  pass: failures.length === 0
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exit(2);
