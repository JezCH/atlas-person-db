#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const productionSource = fs.readFileSync('atlas-production-source.js', 'utf8');
const sourceControl = fs.readFileSync('atlas-source-control.js', 'utf8');
const reader = fs.readFileSync('atlas-reader.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

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

assert(/DATA_SOURCE:\s*["']legacy["']/.test(productionSource), 'production source declaration must remain legacy');
assert(!/[?&](?:source|data_source)=/i.test(sourceControl + productionSource), 'query-string source override is prohibited');
assert(!/localStorage|sessionStorage/.test(sourceControl + productionSource), 'browser storage source override is prohibited');

const configPos = index.indexOf('./config.js');
const productionPos = index.indexOf('./atlas-production-source.js');
const controlPos = index.indexOf('./atlas-source-control.js');
const readerPos = index.indexOf('./atlas-reader.js');
const appPos = index.indexOf('./app.js');
assert(configPos >= 0 && productionPos > configPos && controlPos > productionPos && readerPos > controlPos && appPos > readerPos, 'script load order must be config -> production source -> source control -> reader -> app');

assert(reader.includes('new Set(["legacy", "v2-shadow"])'), 'reader allowed-source contract changed unexpectedly');
assert(reader.includes('source || window.ATLAS_DATA_SOURCE || "legacy"'), 'reader source precedence changed unexpectedly');
assert(reader.includes('source === "v2-shadow" ? "atlas_person_politics_compat_v1" : "person_politics"'), 'reader table mapping changed unexpectedly');
assert(reader.includes('resolved.source === "v2-shadow" && fallbackToLegacy'), 'reader fallback contract changed unexpectedly');

assert(app.includes('db.from("person_politics").update'), 'legacy update target missing');
assert(app.includes('db.from("person_politics").insert'), 'legacy insert target missing');
assert(app.includes('db.from("person_politics").delete'), 'legacy delete target missing');
assert(!/db\.from\("atlas_person_politics_compat_v1"\)\.(?:insert|update|delete)/.test(app), 'compatibility view mutation detected');
assert(!/db\.from\("atlas_v2\./.test(app), 'v2 physical table mutation detected');

const report = {
  marker: 'PHASE_7A_CONTROL_PLANE_CONTRACT',
  production_default: 'legacy',
  allowed_sources: ['legacy', 'v2-shadow'],
  checks: {
    source_resolution: failures.filter((x) => /resolve|diagnostic|valid/.test(x)).length === 0,
    override_prohibition: failures.filter((x) => /override/.test(x)).length === 0,
    script_order: failures.filter((x) => /load order/.test(x)).length === 0,
    reader_contract: failures.filter((x) => /reader/.test(x)).length === 0,
    write_guard: failures.filter((x) => /target|mutation/.test(x)).length === 0
  },
  failures,
  pass: failures.length === 0
};

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exit(2);
