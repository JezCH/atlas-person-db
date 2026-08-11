import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const serviceSource = fs.readFileSync(new URL('../server/atlas-authoring-manifest-service.js', import.meta.url), 'utf8');
const runnerSource = fs.readFileSync(new URL('../scripts/apply-authoring-manifest.mjs', import.meta.url), 'utf8');
const workflowSource = fs.readFileSync(new URL('../.github/workflows/atlas-authoring-apply.yml', import.meta.url), 'utf8');

 test('manifest orchestration owns one serializable transaction and reuses non-owning domain executors', () => {
  assert.match(serviceSource, /begin isolation level serializable/i);
  assert.match(serviceSource, /createPerson\(client, person\)/);
  assert.doesNotMatch(serviceSource, /createIdentityService/);
  assert.match(serviceSource, /createV2AuthoritativeTx\(client\)/);
});

test('production runner accepts only reviewed request JSON paths and uses normalized service', () => {
  assert.match(runnerSource, /authoring\/requests/);
  assert.match(runnerSource, /AUTHORING_MANIFEST_PATH_NOT_ALLOWED/);
  assert.match(runnerSource, /createAuthoringManifestService/);
  assert.doesNotMatch(runnerSource, /insert into atlas_v2\.persons/i);
});

test('GitHub apply workflow is main-only, serialized, secret-backed and path-scoped', () => {
  assert.match(workflowSource, /branches:\s*\n\s*- main/);
  assert.match(workflowSource, /authoring\/requests\/\*\.json/);
  assert.match(workflowSource, /group: atlas-authoring-production/);
  assert.match(workflowSource, /secrets\.SUPABASE_DB_URL/);
  assert.match(workflowSource, /scripts\/apply-authoring-manifest\.mjs/);
});
