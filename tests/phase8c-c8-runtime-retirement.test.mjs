import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const manifest = JSON.parse(fs.readFileSync(new URL('../migration/phase-8/reports/phase8c-c8-runtime-retirement-manifest.json', import.meta.url), 'utf8'));
const workflowManifest = JSON.parse(fs.readFileSync(new URL('../migration/phase-8/reports/phase8c-c8-workflow-retirement-manifest.json', import.meta.url), 'utf8'));

function exists(rel) {
  return fs.existsSync(new URL(`../${rel}`, import.meta.url));
}

test('all C8 retired executable runtime files are absent', () => {
  const survivors = manifest.retired_runtime_files.filter(exists);
  assert.deepEqual(survivors, []);
});

test('all retired transition tests are absent from active test surface', () => {
  const survivors = manifest.retired_historical_tests.filter(exists);
  assert.deepEqual(survivors, []);
});

test('v2-authoritative service uses extracted request helpers, not legacy mutation service', () => {
  assert.equal(exists('server/atlas-mutation-request-utils.js'), true);
  assert.equal(exists('server/atlas-mutation-service.js'), false);
  const service = fs.readFileSync(new URL('../server/atlas-v2-authoritative-mutation-service.js', import.meta.url), 'utf8');
  const utils = fs.readFileSync(new URL('../server/atlas-mutation-request-utils.js', import.meta.url), 'utf8');
  assert.match(service, /atlas-mutation-request-utils\.js/);
  assert.doesNotMatch(service, /atlas-mutation-service\.js/);
  assert.match(utils, /function normalizeOperation/);
  assert.match(utils, /function deterministicRequestId/);
  assert.doesNotMatch(utils, /executeLegacy|public\.person_politics|atlas_person_politics_compat_v1/);
});

test('historical C8 anchor workflows remain recorded without constraining future successor workflow names', () => {
  const workflows = fs.readdirSync(new URL('../.github/workflows/', import.meta.url))
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .sort();
  for (const required of workflowManifest.active_after_c8) {
    assert.equal(workflows.includes(required), true, `${required} must remain active until a later maintenance stage explicitly retires it`);
  }
  assert.equal(workflows.some((name) => /dualwrite|dual-write|shadow-validate|legacy-reconciliation/.test(name)), false);
});

test('C8 historical manifest records the DB objects that were deferred to C9', () => {
  assert.equal(manifest.database_objects_retained_for_c9.includes('public.person_politics'), true);
  assert.equal(manifest.database_objects_retained_for_c9.includes('public.atlas_person_politics_compat_v1'), true);
  assert.equal(workflowManifest.next_destructive_stage, 'C9');
  assert.deepEqual(workflowManifest.database_objects_unchanged.sort(), manifest.database_objects_retained_for_c9.slice().sort());
});
