#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const sourceManifest = fs.readFileSync('atlas-production-source.js', 'utf8');
const sourceControl = fs.readFileSync('atlas-source-control.js', 'utf8');
const reader = fs.readFileSync('atlas-reader.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const serverAdapter = fs.readFileSync('atlas-server-write-adapter.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const rollbackRunbook = fs.readFileSync('migration/phase-7/PHASE_7_ROLLBACK_RUNBOOK.md', 'utf8');

const expectedLegacyManifest = 'window.ATLAS_CONFIG = Object.freeze({\n  ...(window.ATLAS_CONFIG || {}),\n  DATA_SOURCE: "legacy"\n});\n';
const expectedV2Manifest = 'window.ATLAS_CONFIG = Object.freeze({\n  ...(window.ATLAS_CONFIG || {}),\n  DATA_SOURCE: "v2-shadow"\n});\n';

assert(sourceManifest === expectedLegacyManifest || sourceManifest === expectedV2Manifest, 'source manifest must be an exact approved declaration');
assert(sourceControl.includes('Object.freeze(["legacy", "v2-shadow"])'), 'allowed source set changed unexpectedly');
assert(sourceControl.includes('window.ATLAS_DATA_SOURCE = state.effective'), 'effective source publication changed unexpectedly');
assert(reader.includes('source || window.ATLAS_DATA_SOURCE || "legacy"'), 'reader source precedence changed unexpectedly');
assert(reader.includes('source === "v2-shadow" ? "atlas_person_politics_compat_v1" : "person_politics"'), 'reader table mapping changed unexpectedly');
assert(reader.includes('resolved.source === "v2-shadow" && fallbackToLegacy'), 'legacy fallback contract changed unexpectedly');

assert(index.includes('./atlas-server-write-adapter.js'), 'authenticated server write adapter missing from index');
assert(!index.includes('./atlas-write-adapter.js'), 'legacy browser write adapter still runtime-loaded');
assert(!index.includes('./atlas-write-mode.js'), 'legacy browser write mode still runtime-loaded');
assert(!index.includes('./atlas-v2-shadow-compiler.js'), 'legacy shadow compiler still runtime-loaded');
assert(app.includes('ATLAS_SERVER_WRITE_ADAPTER'), 'authenticated server write adapter missing from app');
assert(!app.includes('ATLAS_WRITE_ADAPTER'), 'legacy browser write adapter still referenced by app');
assert(!serverAdapter.includes('ATLAS_MUTATION_TOKEN'), 'server mutation secret reference detected in browser adapter');
assert(!serverAdapter.includes('Authorization'), 'Authorization header detected in browser adapter');
assert(serverAdapter.includes('credentials: "same-origin"'), 'browser adapter must use same-origin session credentials');
assert(!/\.from\("(?:person_politics|atlas_person_politics_compat_v1|atlas_v2)/.test(app + serverAdapter), 'browser mutation path contains direct database target');

assert(rollbackRunbook.includes('DATA_SOURCE: "legacy"'), 'rollback runbook does not preserve exact legacy source');
assert(rollbackRunbook.includes('public.person_politics'), 'rollback runbook lost legacy write invariant');
assert(!/[?&](?:source|data_source)=/i.test(sourceControl + sourceManifest), 'query-string source override is prohibited');
assert(!/localStorage|sessionStorage/.test(sourceControl + sourceManifest), 'browser storage source override is prohibited');

const report = {
  marker: 'PHASE_7C_PREFLIGHT_STATIC',
  manifest: sourceManifest === expectedV2Manifest ? 'v2-shadow' : 'legacy',
  mutation_boundary: 'authenticated-server',
  checks: {
    source_manifest_exact: failures.filter((x) => x.includes('source manifest')).length === 0,
    source_contract: failures.filter((x) => x.includes('source set') || x.includes('effective source')).length === 0,
    reader_contract: failures.filter((x) => x.includes('reader') || x.includes('fallback contract')).length === 0,
    write_guard: failures.filter((x) => /write|mutation|adapter|database target|Authorization|secret|session credentials/.test(x)).length === 0,
    rollback_ready: failures.filter((x) => x.includes('rollback')).length === 0,
    override_prohibition: failures.filter((x) => x.includes('override')).length === 0
  },
  failures,
  pass: failures.length === 0
};

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exit(2);
