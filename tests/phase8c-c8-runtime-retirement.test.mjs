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
  const workflows = fs.readdirSync(new URL('../.github/workflows/', import.meta.url))
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .sort();
  assert.deepEqual(workflows, [
    'atlas-audit-inventory.yml',
    'atlas-authoring-apply.yml',
    'atlas-authoring-schema-bootstrap.yml',
    'atlas-correction-apply.yml',
    'atlas-human-authoring-operational-parity.yml',
    'atlas-integrity.yml',
    'atlas-namuwiki-link.yml',
    'atlas-p10-person-duplicate-v2-revalidation.yml',
    'atlas-p10-release-launcher.yml',
    'atlas-p10-revalidation-release.yml',
    'atlas-p11-baseline-b-capture.yml',
    'atlas-p11-baseline-b-readiness.yml',
    'atlas-p11-semantic-v2-backfill.yml',
    'atlas-reviewed-person-merge.yml',
    'atlas-spacetime-production-visual.yml',
    'atlas-stage2-schema-release.yml',
    'atlas-stage2-train2-live-parity.yml',
    'atlas-stage2-train2-release.yml'
  ]);

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
  assert.match(p10Workflow, /rehearse-p10-production-revalidation-release\.mjs/);
  assert.doesNotMatch(p10Workflow, /environment:\s*production/);
  assert.doesNotMatch(p10Workflow, /SUPABASE_DB_URL/);

  const p10ReleaseWorkflow = fs.readFileSync(new URL('../.github/workflows/atlas-p10-revalidation-release.yml', import.meta.url), 'utf8');
  assert.match(p10ReleaseWorkflow, /workflow_dispatch\s*:/);
  assert.doesNotMatch(p10ReleaseWorkflow, /^\s*push\s*:/m);
  assert.doesNotMatch(p10ReleaseWorkflow, /\bpull_request\s*:/m);
  assert.match(p10ReleaseWorkflow, /environment:\s*production/);
  assert.match(p10ReleaseWorkflow, /id-token:\s*write/);
  assert.match(p10ReleaseWorkflow, /atlas-person-db-p10-revalidation-release/);
  assert.match(p10ReleaseWorkflow, /call migration_dry_run[\s\S]*call migration_apply[\s\S]*call rebuild_candidates[\s\S]*call final_verify/);
  assert.doesNotMatch(p10ReleaseWorkflow, /SUPABASE_DB_URL|DATABASE_URL/);
  assert.doesNotMatch(p10ReleaseWorkflow, /REVIEW_CANDIDATE|EXECUTE_APPROVED_MERGE|executeApprovedPersonMerge/);

  const p11Workflow = fs.readFileSync(new URL('../.github/workflows/atlas-p11-baseline-b-readiness.yml', import.meta.url), 'utf8');
  assert.match(p11Workflow, /\bpull_request\s*:/m);
  assert.match(p11Workflow, /^\s*push\s*:/m);
  assert.match(p11Workflow, /branches:\s*\n\s*- main/);
  assert.match(p11Workflow, /workflow_dispatch\s*:/m);
  assert.match(p11Workflow, /permissions:\s*\n\s*contents:\s*read/);
  assert.match(p11Workflow, /postgres:17/);
  assert.match(p11Workflow, /rehearse-p11-baseline-b-readiness\.mjs/);
  assert.doesNotMatch(p11Workflow, /environment:\s*production/);
  assert.doesNotMatch(p11Workflow, /SUPABASE_DB_URL|id-token:\s*write/);

  const p11CaptureWorkflow = fs.readFileSync(new URL('../.github/workflows/atlas-p11-baseline-b-capture.yml', import.meta.url), 'utf8');
  assert.match(p11CaptureWorkflow, /workflow_dispatch\s*:/m);
  assert.doesNotMatch(p11CaptureWorkflow, /^\s*push\s*:/m);
  assert.doesNotMatch(p11CaptureWorkflow, /\bpull_request\s*:/m);
  assert.match(p11CaptureWorkflow, /permissions:\s*\n\s*contents:\s*read\s*\n\s*id-token:\s*write/);
  assert.match(p11CaptureWorkflow, /environment:\s*production/);
  assert.match(p11CaptureWorkflow, /atlas-person-db-p11-baseline-b-capture/);
  assert.match(p11CaptureWorkflow, /EXPECTED_CAPTURE_ID:\s*p11_baseline_b_20260815_v2/);
  assert.match(p11CaptureWorkflow, /ATLAS_P11_BASELINE_B_CAPTURE_V2/);
  assert.match(p11CaptureWorkflow, /atlas-stage2-baseline-b\/v2/);
  assert.match(p11CaptureWorkflow, /dataset_count == 41/);
  assert.match(p11CaptureWorkflow, /CAPTURE:\$\{EXPECTED_CAPTURE_ID\}/);
  assert.match(p11CaptureWorkflow, /call_capture readiness[\s\S]*call_capture capture/);
  assert.match(p11CaptureWorkflow, /production_mutation_authorized == false/);
  assert.doesNotMatch(p11CaptureWorkflow, /p11_baseline_b_20260815_v1|ATLAS_P11_BASELINE_B_CAPTURE_V1|atlas-stage2-baseline-b\/v1/);
  assert.doesNotMatch(p11CaptureWorkflow, /SUPABASE_DB_URL|DATABASE_URL/);
  assert.doesNotMatch(p11CaptureWorkflow, /migration_apply|rebuild_candidates|EXECUTE_APPROVED_MERGE|executeApprovedPersonMerge/);

  const stage2SchemaWorkflow = fs.readFileSync(new URL('../.github/workflows/atlas-stage2-schema-release.yml', import.meta.url), 'utf8');
  assert.match(stage2SchemaWorkflow, /workflow_dispatch\s*:/);
  assert.doesNotMatch(stage2SchemaWorkflow, /^\s*push\s*:/m);
  assert.doesNotMatch(stage2SchemaWorkflow, /\bpull_request\s*:/m);
  assert.match(stage2SchemaWorkflow, /environment:\s*production/);
  assert.doesNotMatch(stage2SchemaWorkflow, /SUPABASE_DB_URL/);

  const train2Workflow = fs.readFileSync(new URL('../.github/workflows/atlas-stage2-train2-release.yml', import.meta.url), 'utf8');
  assert.match(train2Workflow, /workflow_dispatch\s*:/);
  assert.doesNotMatch(train2Workflow, /^\s*push\s*:/m);
  assert.doesNotMatch(train2Workflow, /\bpull_request\s*:/m);
  assert.match(train2Workflow, /environment:\s*production/);
  assert.match(train2Workflow, /id-token:\s*write/);
  assert.match(train2Workflow, /APPLY:\$\{RELEASE_ID\}/);
  assert.doesNotMatch(train2Workflow, /SUPABASE_DB_URL/);

  const parityWorkflow = fs.readFileSync(new URL('../.github/workflows/atlas-stage2-train2-live-parity.yml', import.meta.url), 'utf8');
  assert.match(parityWorkflow, /\bpull_request\s*:/m);
  assert.match(parityWorkflow, /^\s*push\s*:/m);
  assert.match(parityWorkflow, /branches:\s*\n\s*- main/);
  assert.doesNotMatch(parityWorkflow, /workflow_dispatch\s*:/);
  assert.doesNotMatch(parityWorkflow, /environment:\s*production/);
  assert.doesNotMatch(parityWorkflow, /SUPABASE_DB_URL/);
});

test('C8 historical manifest records the DB objects that were deferred to C9', () => {
  assert.equal(manifest.database_objects_retained_for_c9.includes('public.person_politics'), true);
  assert.equal(manifest.database_objects_retained_for_c9.includes('public.atlas_person_politics_compat_v1'), true);
  assert.equal(workflowManifest.next_destructive_stage, 'C9');
  assert.deepEqual(workflowManifest.database_objects_unchanged.sort(), manifest.database_objects_retained_for_c9.slice().sort());
});
