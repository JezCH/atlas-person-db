import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const integrity = fs.readFileSync(new URL('../.github/workflows/atlas-integrity.yml', import.meta.url), 'utf8');

test('ordinary and non-timeline registration data share the registration impact path', () => {
  assert.match(integrity, /scope=full/);
  assert.match(integrity, /scope=registration/);
  assert.ok(integrity.includes("authoring/requests/[A-Za-z0-9._-]+\\.json"));
  assert.ok(integrity.includes("non-timeline-persons\\.json"));
  assert.match(integrity, /registration_validation/);
  assert.match(integrity, /Validate changed registration data/);
  assert.match(integrity, /node scripts\/validate-authoring-request-files\.mjs/);
  assert.match(integrity, /node scripts\/validate-non-timeline-persons\.mjs non-timeline-persons\.json/);
  assert.match(integrity, /Required test context passed through the \$\{scope\} impact path/);
});

test('ambiguous changes fail safe to the full integrity suite', () => {
  assert.match(integrity, /scope=full/);
  assert.match(integrity, /full_test:/);
  assert.match(integrity, /if: needs\.classify\.outputs\.scope == 'full'/);
  assert.match(integrity, /Full integrity suite failed/);
});

for (const relative of [
  '../.github/workflows/atlas-p10-person-duplicate-v2-revalidation.yml',
  '../.github/workflows/atlas-human-authoring-operational-parity.yml',
  '../.github/workflows/atlas-p11-baseline-b-readiness.yml'
]) {
  test(`${relative} uses a dependency allowlist and skips registration-only data changes`, () => {
    const workflow = fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
    assert.match(workflow, /pull_request:\n\s+paths:/);
    assert.match(workflow, /push:\n\s+branches:\n\s+- main\n\s+paths:/);
    assert.doesNotMatch(workflow, /paths-ignore:/);
    assert.doesNotMatch(workflow, /authoring\/requests\/\*\.json/);
    assert.doesNotMatch(workflow, /non-timeline-persons\.json/);
  });
}
