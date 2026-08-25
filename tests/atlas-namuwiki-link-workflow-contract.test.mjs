import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflow = fs.readFileSync('.github/workflows/atlas-namuwiki-link.yml', 'utf8');

test('NamuWiki link workflow proves deployed runtime compatibility before mutation', () => {
  assert.match(workflow, /uses: actions\/checkout@v4/);
  assert.match(workflow, /fetch-depth: 0/);
  assert.match(workflow, /ATLAS_AUTHORING_READINESS_ENDPOINT:/);
  assert.match(workflow, /git merge-base --is-ancestor "\$runtime_sha" "\$GITHUB_SHA"/);
  assert.match(workflow, /requiresAuthoringRuntimeDeployment/);
  assert.match(workflow, /NAMUWIKI_RUNTIME_CODE_DRIFT/);
});

test('NamuWiki link mutation keeps deployed runtime SHA distinct from signed workflow SHA', () => {
  assert.match(workflow, /echo "ATLAS_RUNTIME_SHA=\$\{runtime_sha\}" >> "\$GITHUB_ENV"/);
  assert.match(workflow, /--arg runtime_sha "\$ATLAS_RUNTIME_SHA"/);
  assert.match(workflow, /--arg workflow_sha "\$GITHUB_SHA"/);
  assert.match(workflow, /\{runtime_sha:\$runtime_sha,workflow_sha:\$workflow_sha,person_id:\$person_id,url:\$url\}/);
});
