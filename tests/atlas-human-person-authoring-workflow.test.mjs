import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflow = fs.readFileSync(new URL('../.github/workflows/atlas-human-person-authoring-apply.yml', import.meta.url), 'utf8');

test('Person-only workflow accepts evidence-backed identity without fake Activity chronology', () => {
  assert.match(workflow, /authoring\/person_requests\/\*\.json/);
  assert.match(workflow, /atlas-human-person-authoring\/v1/);
  assert.match(workflow, /\.person\.person_type \| type == "string"/);
  assert.match(workflow, /\.person\.historicity \| type == "string"/);
  assert.match(workflow, /\.sources \| type == "array" and length > 0/);
  assert.match(workflow, /\.activity == null/);
  assert.match(workflow, /\.polity == null/);
});

test('Person-only workflow preserves OIDC, exact runtime binding and immutable evidence', () => {
  assert.match(workflow, /ATLAS_HUMAN_AUTHORING_ENDPOINT: https:\/\/atlas-person-db\.vercel\.app\/api\/atlas-authoring/);
  assert.match(workflow, /--arg runtime_sha "\$ATLAS_RUNTIME_SHA"/);
  assert.match(workflow, /--arg authoring_sha "\$GITHUB_SHA"/);
  assert.match(workflow, /authorization: Bearer \$\{oidc_token\}/);
  assert.match(workflow, /PERSON_AUTHORING_RUNTIME_CODE_DRIFT/);
  assert.match(workflow, /\.marker=="ATLAS_HUMAN_PERSON_AUTHORING_V1"/);
  assert.match(workflow, /\.result\.semantic_version=="v1-person-identity-only"/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
});
