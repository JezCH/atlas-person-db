import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflow = fs.readFileSync(new URL('../.github/workflows/atlas-integrity.yml', import.meta.url), 'utf8');
const validator = fs.readFileSync(new URL('../scripts/validate-non-timeline-persons.mjs', import.meta.url), 'utf8');

test('registration fast path invokes the standalone non-timeline validator', () => {
  assert.match(workflow, /node scripts\/validate-non-timeline-persons\.mjs non-timeline-persons\.json/);
  assert.doesNotMatch(workflow, /node --input-type=module <<'NODE'/);
});

test('non-timeline validator enforces excluded timeline and null activity boundaries', () => {
  assert.match(validator, /timeline_status !== 'excluded'/);
  assert.match(validator, /row\.activity_start !== null \|\| row\.activity_end !== null/);
  assert.match(validator, /duplicate non-timeline person_name/);
  for (const key of ['historicity_display_ko','date_basis','role_ko','reason','map_policy']) {
    assert.match(validator, new RegExp(key));
  }
  assert.match(validator, /traditional_year_alternative/);
  assert.match(validator, /cannot set traditional_year_alternative without traditional_year/);
});
