import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const integrity = fs.readFileSync(new URL('../.github/workflows/atlas-integrity.yml', import.meta.url), 'utf8');

test('ordinary and non-timeline registration data share one integrity fast path', () => {
  assert.match(integrity, /registration_data_only/);
  assert.ok(integrity.includes("authoring/requests/[A-Za-z0-9._-]+\\.json"));
  assert.ok(integrity.includes("non-timeline-persons\\.json"));
  assert.match(integrity, /registration_validation/);
  assert.match(integrity, /Validate changed registration data/);
  assert.match(integrity, /timeline_status=excluded/);
  assert.match(integrity, /Required test context passed through the registration-data fast path/);
});

for (const relative of [
  '../.github/workflows/atlas-p10-person-duplicate-v2-revalidation.yml',
  '../.github/workflows/atlas-human-authoring-operational-parity.yml',
  '../.github/workflows/atlas-p11-baseline-b-readiness.yml'
]) {
  test(`${relative} skips registration-only data changes`, () => {
    const workflow = fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
    assert.match(workflow, /paths-ignore:/);
    assert.match(workflow, /authoring\/requests\/\*\.json/);
    assert.match(workflow, /non-timeline-persons\.json/);
  });
}
