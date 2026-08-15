import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const reader = fs.readFileSync(new URL('../atlas-person-browser-reader.js', import.meta.url), 'utf8');
const main = fs.readFileSync(new URL('../atlas-person-main.js', import.meta.url), 'utf8');
const curated = fs.readFileSync(new URL('../non-timeline-list.js', import.meta.url), 'utf8');
const contract = fs.readFileSync(new URL('../docs/ui/UI_HISTORICITY_SURFACES.md', import.meta.url), 'utf8');

test('UI-T6 authoritative Person grouping is based only on stored historicity', () => {
  assert.match(reader, /const PRIMARY_HISTORICITY_VALUE = "historical"/);
  assert.match(reader, /return text\(person\?\.historicity\) === PRIMARY_HISTORICITY_VALUE \? "historical" : "other_or_uncertain"/);
  const groupBody = reader.slice(reader.indexOf('function historicityGroup'), reader.indexOf('function partitionByHistoricity'));
  assert.doesNotMatch(groupBody, /activity|date|year|certainty|calendar|confidence|chronology|notes/i);
});

test('UI-T6 Main does not infer historicity from Activity chronology diagnostics', () => {
  assert.match(main, /person\?\.historicity/);
  assert.match(main, /activity\?\.chronology_status/);
  assert.match(main, /activity\?\.confidence/);
  const statusBody = main.slice(main.indexOf('function exceptionalPersonStatusHtml'), main.indexOf('function personTableHeaderHtml'));
  assert.doesNotMatch(statusBody, /activity|certainty|calendar|chronology|confidence|notes/i);
});

test('UI-T6 curated non-timeline records remain a separate source and preserve their own classifications', () => {
  assert.match(curated, /fetch\(`\.\/non-timeline-persons\.json/);
  assert.match(curated, /row\.historicity/);
  assert.match(curated, /row\.date_basis/);
  assert.match(curated, /row\.timeline_status/);
  assert.match(curated, /row\.reason/);
  assert.match(curated, /row\.map_policy/);
  assert.doesNotMatch(curated, /ATLAS_PERSON_BROWSER_READER|listPersons\(|readPerson\(|person_id\s*===|canonical_name_en\s*===/);
});

test('UI-T6 forbids name-based identity reconciliation between DB Persons and curated records', () => {
  for (const phrase of [
    'MUST NOT be merged by display name',
    'Do not infer identity from names',
    'both records remain visible',
    'Future reconciliation requires an explicit identity link',
    'Never use a name join'
  ]) assert.ok(contract.includes(phrase), `missing boundary rule: ${phrase}`);
  assert.doesNotMatch(curated, /find\([^\n]*(?:person_name|display_name_ko)[^\n]*(?:display_name|canonical_name_en)/i);
});

test('UI-T6 explicitly separates timeline exclusion from historical ontology', () => {
  assert.ok(contract.includes('Historicity is not chronology certainty'));
  assert.ok(contract.includes('timeline_status=excluded'));
  assert.ok(contract.includes('not proof that the subject is mythical'));
  assert.match(curated, /연표 제외/);
});
