#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const observability = fs.readFileSync('atlas-reader-observability.js', 'utf8');
const reader = fs.readFileSync('atlas-reader.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const adapter = fs.readFileSync('atlas-write-adapter.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const productionSource = fs.readFileSync('atlas-production-source.js', 'utf8');
const rollbackRunbook = fs.readFileSync('migration/phase-7/PHASE_7_ROLLBACK_RUNBOOK.md', 'utf8');

const expectedLegacyManifest = 'window.ATLAS_CONFIG = Object.freeze({\n  ...(window.ATLAS_CONFIG || {}),\n  DATA_SOURCE: "legacy"\n});\n';
const expectedV2Manifest = 'window.ATLAS_CONFIG = Object.freeze({\n  ...(window.ATLAS_CONFIG || {}),\n  DATA_SOURCE: "v2-shadow"\n});\n';

const events = [];
class CustomEvent {
  constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
}
const sandbox = {
  window: {
    dispatchEvent(event) { events.push(event); }
  },
  CustomEvent,
  Date,
  Object,
  Number,
  String,
  Boolean,
  Array,
  Set
};
vm.createContext(sandbox);
vm.runInContext(observability, sandbox);

const event = sandbox.window.AtlasReaderObservability.record({
  requested_source: 'v2-shadow',
  effective_source: 'legacy',
  fallback: true,
  row_count: 319,
  validation_failures: 1,
  notes: 'must not be recorded',
  secret: 'must not be recorded'
});
const keys = Object.keys(event).sort();
assert(keys.join(',') === ['effective_source','fallback','marker','requested_source','row_count','timestamp','validation_failures'].sort().join(','), 'observability event contains unapproved fields');
assert(event.requested_source === 'v2-shadow', 'requested source not recorded');
assert(event.effective_source === 'legacy', 'effective source not recorded');
assert(event.fallback === true, 'fallback not recorded');
assert(event.row_count === 319, 'row count not recorded');
assert(event.validation_failures === 1, 'validation failure count not recorded');
assert(typeof event.timestamp === 'string' && event.timestamp.endsWith('Z'), 'timestamp not normalized');
assert(events.length === 1 && events[0].type === 'atlas:reader-outcome', 'reader outcome event not dispatched exactly once');
assert(!JSON.stringify(event).includes('must not be recorded'), 'sensitive row payload leaked into observability event');

assert(index.indexOf('./atlas-reader-observability.js') >= 0, 'observability script missing from index');
assert(index.indexOf('./atlas-reader-observability.js') < index.indexOf('./atlas-reader.js'), 'observability must load before reader');
assert(reader.includes('window.AtlasReaderObservability?.record'), 'reader does not emit structured outcomes');
assert(reader.includes('requested_source: requestedSource'), 'requested source field missing');
assert(reader.includes('effective_source: effectiveSource'), 'effective source field missing');
assert(reader.includes('fallback,'), 'fallback field missing');
assert(reader.includes('row_count: rows'), 'row count field missing');
assert(reader.includes('validation_failures: validationFailures'), 'validation failure field missing');
assert(reader.includes('diagnostics.push("fallback to legacy")'), 'fallback diagnostic changed unexpectedly');
assert(reader.includes('resolved.source === "v2-shadow" && fallbackToLegacy'), 'fallback condition changed unexpectedly');

assert(productionSource === expectedLegacyManifest || productionSource === expectedV2Manifest, 'production source declaration must be an exact approved manifest');
assert(app.includes('ATLAS_WRITE_ADAPTER.createAdapter'), 'app write adapter missing');
assert(app.includes('mode: "legacy-only"'), 'app legacy-only write mode missing');
assert(adapter.includes('db.from("person_politics").update'), 'legacy update target missing');
assert(adapter.includes('db.from("person_politics").insert'), 'legacy insert target missing');
assert(adapter.includes('db.from("person_politics").delete'), 'legacy delete target missing');
assert(!/db\.from\("atlas_person_politics_compat_v1"\)\.(?:insert|update|delete)/.test(app + adapter), 'compatibility view mutation detected');
assert(!/db\.from\("atlas_v2\./.test(app + adapter), 'v2 physical table mutation detected');
assert(rollbackRunbook.includes('DATA_SOURCE: "legacy"'), 'rollback runbook lost exact legacy declaration');
assert(rollbackRunbook.includes('public.person_politics'), 'rollback runbook lost legacy write invariant');

const manifest = productionSource === expectedV2Manifest ? 'v2-shadow' : 'legacy';
const report = {
  marker: 'PHASE_7B_OBSERVABILITY_ROLLBACK_CONTRACT',
  production_manifest: manifest,
  rollback_target: 'legacy',
  checks: {
    event_schema: failures.filter((x) => /event|field|recorded|timestamp|payload/.test(x)).length === 0,
    script_order: failures.filter((x) => /load before|missing from index/.test(x)).length === 0,
    reader_emission: failures.filter((x) => /reader|fallback diagnostic|fallback condition/.test(x)).length === 0,
    source_manifest_exact: failures.filter((x) => /approved manifest/.test(x)).length === 0,
    write_guard: failures.filter((x) => /target|mutation|adapter|legacy-only/.test(x)).length === 0,
    rollback_ready: failures.filter((x) => /rollback runbook/.test(x)).length === 0
  },
  failures,
  pass: failures.length === 0
};

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exit(2);
