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

test('historical C8 workflow manifest remains audit evidence while current workflows stay explicitly bounded', () => {
  assert.ok(Array.isArray(workflowManifest.active_after_c8));
  const workflows = new Set(fs.readdirSync(new URL('../.github/workflows/', import.meta.url))
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml')));
  for (const retired of [
    'atlas-stage2-schema-release.yml',
    'atlas-stage2-train2-release.yml',
    'atlas-stage2-train2-live-parity.yml',
    'atlas-p10-revalidation-release.yml',
    'atlas-p10-release-launcher.yml',
    'atlas-p11-baseline-b-capture.yml',
    'atlas-p11-semantic-v2-backfill.yml',
    'atlas-p11-baseline-b-readiness.yml'
  ]) assert.equal(workflows.has(retired), false, `completed migration transport returned: ${retired}`);
  for (const required of [
    'atlas-authoring-apply.yml',
    'atlas-correction-apply.yml',
    'atlas-integrity.yml',
    'atlas-canonical-data-readiness.yml'
  ]) assert.equal(workflows.has(required), true, `required current workflow missing: ${required}`);

  const correctionWorkflow = fs.readFileSync(new URL('../.github/workflows/atlas-correction-apply.yml', import.meta.url), 'utf8');
  assert.match(correctionWorkflow, /^\s*-\s*'corrections\/requests\/\*\.json'\s*$/m);
  assert.doesNotMatch(correctionWorkflow, /public\.person_politics|atlas_person_politics_compat_v1/);
  assert.doesNotMatch(correctionWorkflow, /SUPABASE_DB_URL/);

  const humanOperationalWorkflow = fs.readFileSync(new URL('../.github/workflows/atlas-human-authoring-operational-parity.yml', import.meta.url), 'utf8');
  assert.match(humanOperationalWorkflow, /\bpull_request\s*:/m);
  assert.match(humanOperationalWorkflow, /^\s*push\s*:/m);
  assert.match(humanOperationalWorkflow, /branches:\s*\n\s*- main/);
  assert.match(humanOperationalWorkflow, /postgres:17/);
  assert.match(humanOperationalWorkflow, /rehearse-human-authoring-operational-parity\.mjs/);
  assert.doesNotMatch(humanOperationalWorkflow, /environment:\s*production/);
  assert.doesNotMatch(humanOperationalWorkflow, /SUPABASE_DB_URL/);

  const p10Workflow = fs.readFileSync(new URL('../.github/workflows/atlas-p10-person-duplicate-v2-revalidation.yml', import.meta.url), 'utf8');
  assert.match(p10Workflow, /\bpull_request\s*:/m);
  assert.match(p10Workflow, /^\s*push\s*:/m);
  assert.match(p10Workflow, /branches:\s*\n\s*- main/);
  assert.match(p10Workflow, /workflow_dispatch\s*:/m);
  assert.match(p10Workflow, /postgres:17/);
  assert.match(p10Workflow, /rehearse-p10-person-duplicate-v2-revalidation\.mjs/);
  assert.doesNotMatch(p10Workflow, /rehearse-p10-production-revalidation-release\.mjs/);
  assert.doesNotMatch(p10Workflow, /environment:\s*production/);
  assert.doesNotMatch(p10Workflow, /SUPABASE_DB_URL/);

  const canonicalReadinessWorkflow = fs.readFileSync(new URL('../.github/workflows/atlas-canonical-data-readiness.yml', import.meta.url), 'utf8');
  assert.match(canonicalReadinessWorkflow, /\bpull_request\s*:/m);
  assert.match(canonicalReadinessWorkflow, /^\s*push\s*:/m);
  assert.match(canonicalReadinessWorkflow, /branches:\s*\n\s*- main/);
  assert.match(canonicalReadinessWorkflow, /workflow_dispatch\s*:/m);
  assert.match(canonicalReadinessWorkflow, /permissions:\s*\n\s*contents:\s*read/);
  assert.match(canonicalReadinessWorkflow, /postgres:17/);
  assert.match(canonicalReadinessWorkflow, /rehearse-atlas-canonical-data-readiness\.mjs/);
  assert.doesNotMatch(canonicalReadinessWorkflow, /atlas-p11-baseline-b-production-service|captureProductionBaselineB/);
  assert.doesNotMatch(canonicalReadinessWorkflow, /environment:\s*production/);
  assert.doesNotMatch(canonicalReadinessWorkflow, /SUPABASE_DB_URL|id-token:\s*write/);

  const personDomainWorkflow = fs.readFileSync(new URL('../.github/workflows/atlas-person-domain-apply.yml', import.meta.url), 'utf8');
  assert.match(personDomainWorkflow, /^\s*push\s*:/m);
  assert.match(personDomainWorkflow, /branches:\s*\n\s*- main/);
  assert.match(personDomainWorkflow, /workflow_dispatch\s*:/m);
  assert.match(personDomainWorkflow, /environment:\s*production/);
  assert.match(personDomainWorkflow, /id-token:\s*write/);
  assert.match(personDomainWorkflow, /atlas-person-domain-api/);
  assert.match(personDomainWorkflow, /apply-person-domain-proposals\.mjs smoke/);
  assert.match(personDomainWorkflow, /apply-person-domain-proposals\.mjs batch/);
  assert.match(personDomainWorkflow, /apply-person-domain-proposals\.mjs verify/);
  assert.doesNotMatch(personDomainWorkflow, /SUPABASE_DB_URL|DATABASE_URL|ATLAS_MUTATION_TOKEN/);

});

test('C8 historical manifest records the DB objects that were deferred to C9', () => {
  assert.equal(manifest.database_objects_retained_for_c9.includes('public.person_politics'), true);
  assert.equal(manifest.database_objects_retained_for_c9.includes('public.atlas_person_politics_compat_v1'), true);
  assert.equal(workflowManifest.next_destructive_stage, 'C9');
  assert.deepEqual(workflowManifest.database_objects_unchanged.sort(), manifest.database_objects_retained_for_c9.slice().sort());
});
