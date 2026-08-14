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
  assert.match(workflow, /bootstrap_only:/);
  assert.match(workflow, /required: false/);
});

test('authoring workflow discovers exact runtime readiness and distinguishes bounded bootstrap from unsafe drift', () => {
  assert.match(workflow, /Verify deployed authoring runtime readiness/);
  assert.match(workflow, /ATLAS_AUTHORING_TRANSPORT_V2/);
  assert.match(workflow, /\.readiness\.core\.base_tables_ready==true/);
  assert.match(workflow, /\.readiness\.core\.activity_columns_ready==true/);
  assert.match(workflow, /\.readiness\.p9\.old_index_present==false/);
  assert.match(workflow, /\.readiness\.p9\.new_index_present==true/);
  assert.match(workflow, /\.readiness\.p9\.duplicate_groups==0/);
  assert.match(workflow, /\.ready==true or \.bootstrap_ready==true/);
  assert.match(workflow, /ATLAS_AUTHORING_BOOTSTRAP_REQUIRED=/);
  assert.match(workflow, /ATLAS_RUNTIME_SHA=/);
});

test('authoring workflow refuses undeployed runtime code drift before bootstrap or data apply', () => {
  assert.match(workflow, /git merge-base --is-ancestor "\$runtime_sha" "\$GITHUB_SHA"/);
  assert.match(workflow, /runtime-diff\.txt/);
  assert.match(workflow, /shouldBuildForChangedPaths/);
  assert.match(workflow, /AUTHORING_RUNTIME_CODE_DRIFT/);
  assert.match(workflow, /scripts\/vercel-ignore-build\.mjs/);
});

test('bounded bootstrap sends only exact SHAs, requires OIDC, and proves ledger readiness without a manifest', () => {
  assert.match(workflow, /Bootstrap bounded authoring schema migrations/);
  assert.match(workflow, /operation:"bootstrap"/);
  assert.match(workflow, /ATLAS_AUTHORING_BOOTSTRAP_REQUIRED == 'true'/);
  assert.match(workflow, /ACTIONS_ID_TOKEN_REQUEST_URL/);
  assert.match(workflow, /\.bootstrap_complete==true/);
  assert.match(workflow, /\.readiness\.core\.ledger_columns_ready==true/);
  const bootstrapStart = workflow.indexOf('      - name: Bootstrap bounded authoring schema migrations');
  const applyStart = workflow.indexOf('      - name: Apply manifests through deployed Vercel server');
  const bootstrapBody = workflow.slice(bootstrapStart, applyStart);
  assert.doesNotMatch(bootstrapBody, /--slurpfile manifest/);
  assert.doesNotMatch(bootstrapBody, /manifest_path/);
});

test('authoring apply sends independent runtime and authoring SHAs', () => {
  const script = applyScript();
  assert.match(script, /--arg runtime_sha "\$ATLAS_RUNTIME_SHA"/);
  assert.match(script, /--arg authoring_sha "\$GITHUB_SHA"/);
  assert.match(script, /operation:"apply_manifest"/);
  assert.match(script, /transport_version:\$transport_version/);
  assert.match(script, /runtime_sha:\$runtime_sha/);
  assert.match(script, /authoring_sha:\$authoring_sha/);
  assert.doesNotMatch(script, /deployment_sha/);
  assert.doesNotMatch(script, /DEPLOYMENT_SHA_MISMATCH/);
});

test('bootstrap-only dispatch never applies Person or Activity manifests', () => {
  const script = applyScript();
  assert.match(script, /ATLAS_AUTHORING_BOOTSTRAP_ONLY/);
  assert.match(script, /Bootstrap-only run complete; no Person or Activity manifest will be applied/);
  assert.match(script, /exit 0/);
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
