import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../.github/workflows/atlas-authoring-schema-bootstrap.yml', import.meta.url), 'utf8');

test('schema bootstrap dispatcher runs only for bounded authoring migration/readiness changes on main', () => {
  assert.match(workflow, /push:\s*\n\s*branches:\s*\n\s*- main/);
  assert.match(workflow, /- 'db\/migrations\/\*\.sql'/);
  assert.match(workflow, /- 'server\/atlas-authoring-migrations\.js'/);
  assert.match(workflow, /- 'server\/atlas-authoring-readiness\.js'/);
  assert.doesNotMatch(workflow, /authoring\/requests\/\*\.json/);
});

test('schema bootstrap dispatcher waits for the exact Production runtime before dispatching bootstrap-only', () => {
  assert.match(workflow, /runtime_sha.*GITHUB_SHA/s);
  assert.match(workflow, /PRODUCTION_RUNTIME_NOT_AT_SCHEMA_BOOTSTRAP_SHA/);
  assert.match(workflow, /gh workflow run atlas-authoring-apply\.yml/);
  assert.match(workflow, /--ref main/);
  assert.match(workflow, /-f bootstrap_only=true/);
  assert.doesNotMatch(workflow, /manifest=/);
});

test('schema bootstrap dispatcher has only the permissions needed to read code and dispatch Actions', () => {
  assert.match(workflow, /permissions:\s*\n\s*contents: read\s*\n\s*actions: write/);
  assert.doesNotMatch(workflow, /id-token: write/);
});
