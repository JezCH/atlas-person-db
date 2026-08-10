#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const productionSource = fs.readFileSync('atlas-production-source.js', 'utf8');
const sourceControl = fs.readFileSync('atlas-source-control.js', 'utf8');
const reader = fs.readFileSync('atlas-reader.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const serverAdapter = fs.readFileSync('atlas-server-write-adapter.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

const expectedLegacyManifest = 'window.ATLAS_CONFIG = Object.freeze({\n  ...(window.ATLAS_CONFIG || {}),\n  DATA_SOURCE: "legacy"\n});\n';
const expectedV2Manifest = 'window.ATLAS_CONFIG = Object.freeze({\n  ...(window.ATLAS_CONFIG || {}),\n  DATA_SOURCE: "v2-shadow"\n});\n';

function evaluate(config) {
  const sandbox = { window: { ATLAS_CONFIG: config } };
  vm.createContext(sandbox);
  vm.runInContext(sourceControl, sandbox);
  return sandbox.window;
}

const missing = evaluate({});
assert(missing.ATLAS_DATA_SOURCE === 'legacy', 'missing config must resolve to legacy');
assert(missing.AtlasSourceControl.getState().valid === true, 'missing config must be a valid safe default');

const legacy = evaluate({ DATA_SOURCE: 'legacy' });
assert(legacy.ATLAS_DATA_SOURCE === 'legacy', 'explicit legacy resolution failed');
assert(legacy.AtlasSourceControl.getState().diagnostic === null, 'legacy must not emit diagnostic');

const v2 = evaluate({ DATA_SOURCE: 'v2-shadow' });
assert(v2.ATLAS_DATA_SOURCE === 'v2-shadow', 'explicit v2-shadow resolution failed');
assert(v2.AtlasSourceControl.getState().diagnostic === null, 'v2-shadow must not emit diagnostic');

const invalid = evaluate({ DATA_SOURCE: 'unexpected' });
assert(invalid.ATLAS_DATA_SOURCE === 'legacy', 'invalid source must resolve to legacy');
assert(invalid.AtlasSourceControl.getState().valid === false, 'invalid source must be marked invalid');
assert(invalid.AtlasSourceControl.getState().diagnostic === 'invalid configured source; using legacy', 'invalid diagnostic must be deterministic');

assert(productionSource === expectedLegacyManifest || productionSource === expectedV2Manifest, 'production source declaration must be an exact approved manifest');
assert(!/[?&](?:source|data_source)=/i.test(sourceControl + productionSource), 'query-string source override is prohibited');
assert(!/localStorage|sessionStorage/.test(sourceControl + productionSource), 'browser storage source override is prohibited');

const configPos = index.indexOf('./config.js');
const productionPos = index.indexOf('./atlas-production-source.js');
const controlPos = index.indexOf('./atlas-source-control.js');
const readerPos = index.indexOf('./atlas-reader.js');
const serverAdapterPos = index.indexOf('./atlas-server-write-adapter.js');
const appPos = index.indexOf('./app.js');
assert(
  configPos >= 0 && productionPos > configPos && controlPos > productionPos && readerPos > controlPos && serverAdapterPos > readerPos && appPos > serverAdapterPos,
  'script load order must be config -> production source -> source control -> reader -> authenticated server write adapter -> app'
);
assert(index.indexOf('./atlas-write-mode.js') < 0, 'legacy browser write mode must not be runtime-loaded');
assert(index.indexOf('./atlas-write-adapter.js') < 0, 'legacy browser write adapter must not be runtime-loaded');
assert(index.indexOf('./atlas-v2-shadow-compiler.js') < 0, 'legacy shadow compiler must not be runtime-loaded');

assert(reader.includes('new Set(["legacy", "v2-shadow"])'), 'reader allowed-source contract changed unexpectedly');
assert(reader.includes('source || window.ATLAS_DATA_SOURCE || "legacy"'), 'reader source precedence changed unexpectedly');
assert(reader.includes('source === "v2-shadow" ? "atlas_person_politics_compat_v1" : "person_politics"'), 'reader table mapping changed unexpectedly');
assert(reader.includes('resolved.source === "v2-shadow" && fallbackToLegacy'), 'reader fallback contract changed unexpectedly');

assert(app.includes('ATLAS_SERVER_WRITE_ADAPTER'), 'authenticated server write adapter missing from app');
assert(app.includes('writeAdapter.createActivity'), 'app create must use selected write adapter');
assert(app.includes('writeAdapter.updateActivity'), 'app update must use selected write adapter');
assert(app.includes('writeAdapter.deleteActivity'), 'app delete must use selected write adapter');
assert(app.includes('writeAdapter.importActivities'), 'app import must use selected write adapter');
assert(!app.includes('ATLAS_WRITE_ADAPTER'), 'legacy browser write adapter still referenced by app');
assert(!app.includes('ATLAS_WRITE_MODE'), 'legacy browser write mode still referenced by app');
assert(!app.includes('ATLAS_V2_SHADOW_COMPILER'), 'legacy shadow compiler still referenced by app');
assert(!serverAdapter.includes('ATLAS_MUTATION_TOKEN'), 'server mutation secret reference detected in browser adapter');
assert(!serverAdapter.includes('Authorization'), 'Authorization header detected in browser adapter');
assert(serverAdapter.includes('credentials: "same-origin"'), 'browser adapter must use same-origin session credentials');
assert(!/\.from\("(?:person_politics|atlas_person_politics_compat_v1|atlas_v2)/.test(app + serverAdapter), 'browser mutation code contains direct database target');

const manifest = productionSource === expectedV2Manifest ? 'v2-shadow' : 'legacy';
const report = {
  marker: 'PHASE_7A_CONTROL_PLANE_CONTRACT',
  production_manifest: manifest,
  safe_default: 'legacy',
  allowed_sources: ['legacy', 'v2-shadow'],
  mutation_boundary: 'authenticated-server',
  checks: {
    source_resolution: failures.filter((x) => /resolve|diagnostic|valid/.test(x)).length === 0,
    source_manifest_exact: failures.filter((x) => /approved manifest/.test(x)).length === 0,
    override_prohibition: failures.filter((x) => /override/.test(x)).length === 0,
    script_order: failures.filter((x) => /load order|runtime-loaded/.test(x)).length === 0,
    reader_contract: failures.filter((x) => /reader/.test(x)).length === 0,
    write_guard: failures.filter((x) => /write|mutation|adapter|database target|Authorization|secret|session credentials/.test(x)).length === 0
  },
  failures,
  pass: failures.length === 0
};

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exit(2);
