import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../.github/workflows/atlas-authoring-apply.yml', import.meta.url), 'utf8');

function applyScript() {
  const startMarker = '      - name: Apply manifests through deployed Vercel server\n        if: env.ATLAS_AUTHORING_SELECTED == \'true\'\n        shell: bash\n        run: |\n';
  const endMarker = '\n      - name: Upload immutable authoring evidence';
  const start = workflow.indexOf(startMarker);
  assert.notEqual(start, -1, 'authoring apply step must exist');
  const bodyStart = start + startMarker.length;
  const end = workflow.indexOf(endMarker, bodyStart);
  assert.notEqual(end, -1, 'authoring evidence step must exist');
  return workflow.slice(bodyStart, end);
}

test('authoring workflow is triggered only by reviewed request data or explicit dispatch', () => {
  assert.match(workflow, /push:\s*\n\s*branches:\s*\n\s*- main\s*\n\s*paths:\s*\n\s*- 'authoring\/requests\/\*\.json'/);
  assert.doesNotMatch(workflow, /- 'server\/atlas-authoring-apply-handler\.js'/);
  assert.match(workflow, /workflow_dispatch:/);
});

test('authoring workflow discovers deployed runtime readiness before applying data', () => {
  assert.match(workflow, /Verify deployed authoring runtime readiness/);
  assert.match(workflow, /ATLAS_AUTHORING_TRANSPORT_V2/);
  assert.match(workflow, /\.readiness\.p9\.old_index_present==false/);
  assert.match(workflow, /\.readiness\.p9\.new_index_present==true/);
  assert.match(workflow, /\.readiness\.p9\.duplicate_groups==0/);
  assert.match(workflow, /ATLAS_RUNTIME_SHA=/);
});

test('authoring apply sends independent runtime and authoring SHAs', () => {
  const script = applyScript();
  assert.match(script, /--arg runtime_sha "\$ATLAS_RUNTIME_SHA"/);
  assert.match(script, /--arg authoring_sha "\$GITHUB_SHA"/);
  assert.match(script, /transport_version:\$transport_version/);
  assert.match(script, /runtime_sha:\$runtime_sha/);
  assert.match(script, /authoring_sha:\$authoring_sha/);
  assert.doesNotMatch(script, /deployment_sha/);
  assert.doesNotMatch(script, /DEPLOYMENT_SHA_MISMATCH/);
});

test('authoring apply verifies Stage 2-native response and preserves evidence', () => {
  const script = applyScript();
  assert.match(script, /ATLAS_AUTHORING_MANIFEST_V2_STAGE2_NATIVE/);
  assert.match(script, /v2-relation-full-temporal/);
  assert.match(script, /\.runtime_sha==\$runtime/);
  assert.match(script, /\.authoring_sha==\$authoring/);
  assert.match(workflow, /Upload immutable authoring evidence/);
  assert.match(workflow, /name: atlas-authoring-\$\{\{ github\.sha \}\}/);
  assert.match(workflow, /retention-days: 90/);
});
