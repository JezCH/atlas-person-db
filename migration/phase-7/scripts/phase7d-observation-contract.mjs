#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const sourceManifest = fs.readFileSync('atlas-production-source.js', 'utf8');
const sourceControl = fs.readFileSync('atlas-source-control.js', 'utf8');
const reader = fs.readFileSync('atlas-reader.js', 'utf8');
const observability = fs.readFileSync('atlas-reader-observability.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const adapter = fs.readFileSync('atlas-write-adapter.js', 'utf8');
const plan = fs.readFileSync('migration/phase-7/PHASE_7D_OBSERVATION_PLAN.md', 'utf8');
const rollback = fs.readFileSync('migration/phase-7/PHASE_7_ROLLBACK_RUNBOOK.md', 'utf8');

const expectedV2Manifest = 'window.ATLAS_CONFIG = Object.freeze({\n  ...(window.ATLAS_CONFIG || {}),\n  DATA_SOURCE: "v2-shadow"\n});\n';

assert(sourceManifest === expectedV2Manifest, 'production manifest must remain exact v2-shadow during observation');
assert(sourceControl.includes('Object.freeze(["legacy", "v2-shadow"])'), 'allowed source set changed unexpectedly');
assert(sourceControl.includes('window.ATLAS_DATA_SOURCE = state.effective'), 'effective source publication changed unexpectedly');
assert(reader.includes('source || window.ATLAS_DATA_SOURCE || "legacy"'), 'reader source precedence changed unexpectedly');
assert(reader.includes('source === "v2-shadow" ? "atlas_person_politics_compat_v1" : "person_politics"'), 'reader table mapping changed unexpectedly');
assert(reader.includes('resolved.source === "v2-shadow" && fallbackToLegacy'), 'fallback contract changed unexpectedly');
assert(reader.includes('window.AtlasReaderObservability?.record'), 'reader outcome observability missing');
assert(observability.includes('requested_source'), 'requested source field missing from observability');
assert(observability.includes('effective_source'), 'effective source field missing from observability');
assert(observability.includes('validation_failures'), 'validation failure field missing from observability');
assert(app.includes('ATLAS_WRITE_ADAPTER.createAdapter'), 'app write adapter missing');
assert(app.includes('mode: "legacy-only"'), 'app legacy-only write mode missing');
assert(adapter.includes('db.from("person_politics").insert'), 'legacy insert target missing');
assert(adapter.includes('db.from("person_politics").update'), 'legacy update target missing');
assert(adapter.includes('db.from("person_politics").delete'), 'legacy delete target missing');
assert(!/db\.from\("atlas_person_politics_compat_v1"\)\.(?:insert|update|delete)/.test(app + adapter), 'compatibility view mutation detected');
assert(!/db\.from\("atlas_v2\./.test(app + adapter), 'v2 physical table mutation detected');
assert(rollback.includes('DATA_SOURCE: "legacy"'), 'rollback target lost exact legacy declaration');
assert(rollback.includes('public.person_politics'), 'rollback write invariant missing');
assert(plan.includes('31114892854'), 'production evidence run missing from observation plan');
assert(plan.includes('8973230282'), 'production evidence artifact missing from observation plan');
assert(plan.includes('sha256:52ba58bace8b7037f451f8fa97b54c9567d92af16cc351d823e2af6e5e133c17'), 'artifact digest missing from observation plan');
assert(plan.includes('Phase 8 remains unauthorized'), 'Phase 8 boundary missing');

const report = {
  marker: 'PHASE_7D_OBSERVATION_CONTRACT',
  production_manifest: 'v2-shadow',
  write_target: 'public.person_politics',
  rollback_target: 'legacy',
  checks: {
    source_manifest_exact: failures.filter((x) => x.includes('production manifest')).length === 0,
    source_and_reader_contract: failures.filter((x) => /source set|effective source|reader|fallback contract/.test(x)).length === 0,
    observability_contract: failures.filter((x) => /observability|field/.test(x)).length === 0,
    write_guard: failures.filter((x) => /target|mutation|adapter|legacy-only/.test(x)).length === 0,
    rollback_ready: failures.filter((x) => /rollback/.test(x)).length === 0,
    evidence_lineage: failures.filter((x) => /evidence run|artifact|digest/.test(x)).length === 0,
    phase_boundary: failures.filter((x) => /Phase 8/.test(x)).length === 0
  },
  failures,
  pass: failures.length === 0
};

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exit(2);
