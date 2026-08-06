#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const [legacyPath, v2Path, outputPath] = process.argv.slice(2);
if (!legacyPath || !v2Path || !outputPath) {
  console.error('usage: node phase7b-live-smoke.mjs <legacy.json> <v2.json> <report.json>');
  process.exit(64);
}

const legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
const v2 = JSON.parse(fs.readFileSync(v2Path, 'utf8'));
const readerSource = fs.readFileSync('atlas-reader.js', 'utf8');
const observabilitySource = fs.readFileSync('atlas-reader-observability.js', 'utf8');
const productionSource = fs.readFileSync('atlas-production-source.js', 'utf8');
const appSource = fs.readFileSync('app.js', 'utf8');

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

function makeQuery(data, error = null) {
  const query = {
    select() { return query; },
    order() { return query; },
    then(resolve) { return Promise.resolve({ data, error }).then(resolve); }
  };
  return query;
}

function makeClient({ failV2 = false } = {}) {
  return {
    from(table) {
      if (table === 'person_politics') return makeQuery(legacy);
      if (table === 'atlas_person_politics_compat_v1') {
        return failV2 ? makeQuery(null, new Error('controlled v2 failure')) : makeQuery(v2);
      }
      return makeQuery(null, new Error(`unexpected table ${table}`));
    }
  };
}

async function runReader({ source, failV2 = false }) {
  const dispatched = [];
  class CustomEvent {
    constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
  }
  const sandbox = {
    window: {
      ATLAS_DATA_SOURCE: 'legacy',
      dispatchEvent(event) { dispatched.push(event); }
    },
    CustomEvent,
    Date,
    Object,
    Number,
    String,
    Boolean,
    Array,
    Set,
    Error,
    Promise,
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(observabilitySource, sandbox);
  vm.runInContext(readerSource, sandbox);
  const result = await sandbox.window.AtlasReader.loadPersonPolitics({
    client: makeClient({ failV2 }),
    source,
    fallbackToLegacy: true
  });
  return { result, event: sandbox.window.AtlasReaderObservability.getLast(), dispatched };
}

const legacyRun = await runReader({ source: 'legacy' });
const v2Run = await runReader({ source: 'v2-shadow' });
const fallbackRun = await runReader({ source: 'v2-shadow', failV2: true });

assert(legacy.length === 319, `legacy row count ${legacy.length}`);
assert(v2.length === 349, `v2 row count ${v2.length}`);

assert(legacyRun.result.error === null, 'legacy live read failed');
assert(legacyRun.result.source === 'legacy', 'legacy effective source mismatch');
assert(legacyRun.result.data.length === 319, 'legacy live read count mismatch');
assert(legacyRun.event?.requested_source === 'legacy', 'legacy requested source not observed');
assert(legacyRun.event?.effective_source === 'legacy', 'legacy effective source not observed');
assert(legacyRun.event?.fallback === false, 'legacy fallback must be false');
assert(legacyRun.event?.row_count === 319, 'legacy observed row count mismatch');
assert(legacyRun.event?.validation_failures === 0, 'legacy validation failures must be zero');
assert(legacyRun.dispatched.length === 1, 'legacy outcome must dispatch exactly once');

assert(v2Run.result.error === null, 'v2 live read failed');
assert(v2Run.result.source === 'v2-shadow', 'v2 effective source mismatch');
assert(v2Run.result.data.length === 349, 'v2 live read count mismatch');
assert(v2Run.event?.requested_source === 'v2-shadow', 'v2 requested source not observed');
assert(v2Run.event?.effective_source === 'v2-shadow', 'v2 effective source not observed');
assert(v2Run.event?.fallback === false, 'v2 fallback must be false');
assert(v2Run.event?.row_count === 349, 'v2 observed row count mismatch');
assert(v2Run.event?.validation_failures === 0, 'v2 validation failures must be zero');
assert(v2Run.dispatched.length === 1, 'v2 outcome must dispatch exactly once');

assert(fallbackRun.result.error === null, 'controlled fallback read failed');
assert(fallbackRun.result.source === 'legacy', 'fallback effective source must be legacy');
assert(fallbackRun.result.data.length === 319, 'fallback row count mismatch');
assert(fallbackRun.result.diagnostics.includes('fallback to legacy'), 'fallback diagnostic missing');
assert(fallbackRun.event?.requested_source === 'v2-shadow', 'fallback requested source mismatch');
assert(fallbackRun.event?.effective_source === 'legacy', 'fallback effective source not observed');
assert(fallbackRun.event?.fallback === true, 'fallback flag must be true');
assert(fallbackRun.event?.row_count === 319, 'fallback observed row count mismatch');
assert(Number(fallbackRun.event?.validation_failures) >= 1, 'fallback validation failure count must be positive');
assert(fallbackRun.dispatched.length === 1, 'fallback outcome must dispatch exactly once');

assert(/DATA_SOURCE:\s*["']legacy["']/.test(productionSource), 'production default changed from legacy');
assert(appSource.includes('db.from("person_politics").insert'), 'legacy insert target missing');
assert(appSource.includes('db.from("person_politics").update'), 'legacy update target missing');
assert(appSource.includes('db.from("person_politics").delete'), 'legacy delete target missing');
assert(!/db\.from\("atlas_person_politics_compat_v1"\)\.(?:insert|update|delete)/.test(appSource), 'compatibility view mutation detected');
assert(!/db\.from\("atlas_v2\./.test(appSource), 'v2 table mutation detected');

const report = {
  marker: 'PHASE_7B_LIVE_DUAL_SOURCE_FALLBACK',
  production_default: 'legacy',
  counts: { legacy: legacy.length, v2: v2.length },
  live: {
    legacy: legacyRun.event,
    v2_shadow: v2Run.event,
    controlled_fallback: fallbackRun.event
  },
  write_target: 'public.person_politics',
  checks: {
    legacy_live_read: failures.filter((x) => x.startsWith('legacy')).length === 0,
    v2_live_read: failures.filter((x) => x.startsWith('v2')).length === 0,
    fallback_injection: failures.filter((x) => x.startsWith('fallback') || x.startsWith('controlled')).length === 0,
    outcome_exactly_once: failures.filter((x) => x.includes('dispatch exactly once')).length === 0,
    write_guard: failures.filter((x) => x.includes('target') || x.includes('mutation')).length === 0,
    production_default_legacy: failures.filter((x) => x.includes('production default')).length === 0
  },
  failures,
  pass: failures.length === 0
};

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exit(2);
