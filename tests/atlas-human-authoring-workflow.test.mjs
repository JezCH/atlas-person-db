import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflow = fs.readFileSync(new URL('../.github/workflows/atlas-authoring-apply.yml', import.meta.url), 'utf8');

test('reviewed GitHub fallback accepts human-readable requests without weakening native v2 manifests', () => {
  assert.match(workflow, /atlas-human-authoring\/v1/);
  assert.match(workflow, /ATLAS_HUMAN_AUTHORING_ENDPOINT: https:\/\/atlas-person-db\.vercel\.app\/api\/atlas-authoring/);
  assert.match(workflow, /\.activity\.relation_type \| IN\("rules","governs","serves","active_in","opposes","claims_rule"\)/);
  assert.match(workflow, /\.activity\.period_basis \| type == "string"/);
  assert.match(workflow, /\.sources \| type == "array" and length > 0/);
  assert.match(workflow, /atlas-authoring-manifest\/v2/);
  assert.match(workflow, /\.activity\.relation_type_id \| type == "string"/);
});

test('human fallback uses the same GitHub OIDC token and separate runtime/authoring SHA envelope', () => {
  assert.match(workflow, /--arg runtime_sha "\$ATLAS_RUNTIME_SHA"/);
  assert.match(workflow, /--arg authoring_sha "\$GITHUB_SHA"/);
  assert.match(workflow, /manifest_path:\$manifest_path,request:\$request\[0\]/);
  assert.match(workflow, /authorization: Bearer \$\{oidc_token\}/);
  assert.match(workflow, /\.auth_method=="github_oidc"/);
  assert.match(workflow, /\.marker=="ATLAS_HUMAN_AUTHORING_V1"/);
  assert.match(workflow, /\.result\.semantic_version=="v2-relation-full-temporal"/);
});
