import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../.github/workflows/atlas-authoring-apply.yml', import.meta.url), 'utf8');
const continuation = fs.readFileSync(new URL('../scripts/atlas-approved-preflight-dispatch.mjs', import.meta.url), 'utf8');
const readback = fs.readFileSync(new URL('../scripts/atlas-authoring-runtime-readback.mjs', import.meta.url), 'utf8');

test('one reviewed 2-5 member batch uses the existing protected canonical batch writer', () => {
  assert.match(workflow, /manifests_json:/);
  assert.match(workflow, /approved_sha:/);
  assert.match(workflow, /Trusted read-only batch preflight selected/);
  assert.match(workflow, /preflight_only=true/);
  assert.match(workflow, /ATLAS_DISPATCH_MANIFESTS_JSON/);
  assert.match(workflow, /git merge-base --is-ancestor/);
  assert.match(workflow, /Immutable batch selector SHA drift/);
  assert.match(workflow, /Reviewed manifest changed/);
  assert.match(workflow, /auto_continue_after_preflight==true/);
  assert.match(workflow, /FAIL_CLOSED: reviewed batch changed since preflight/);
  assert.match(workflow, /post_human_batch "preflight_batch"/);
  assert.match(workflow, /post_human_batch "apply_batch"/);
  assert.match(workflow, /Dispatch Runtime for committed canonical Authoring mutations/);
  assert.match(continuation, /approvedBatchSelectorPaths/);
  assert.match(continuation, /assessApprovedBatchPreflightHandoff/);
  assert.match(continuation, /manifests_json: JSON.stringify\(paths\)/);
  assert.match(continuation, /approved_sha: producer.head_sha/);
  assert.match(readback, /applied.results.length > 5/);
});

test('batch selection leaves original one-Person reviewed selector and audit routes intact', () => {
  assert.match(workflow, /Trusted \$\{mode\}-only request selected/);
  assert.match(workflow, /audit_all_approved/);
  assert.match(workflow, /bootstrap_only/);
  assert.match(continuation, /assessApprovedPreflightHandoff/);
  assert.match(workflow, /atlas-authoring-\$\{\{ github.sha \}\}/);
});
