import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../atlas-person-table-view.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Person table body order matches the four visible headers and folds exceptional status into identity', () => {
  assert.match(source, /\[identity, range, activities, count\]/);
  assert.doesNotMatch(source, /\[identity, range, activities, count, status\]/);
  assert.match(source, /person-table-identity/);
  assert.match(source, /person-table-range/);
  assert.match(source, /person-table-activities/);
  assert.match(source, /person-table-count/);
  assert.match(source, /person-table-status-inline/);
  assert.match(source, /foldExceptionalStatus\(identity, status\)/);
});

test('corrected table presentation uses the current browser cache key', () => {
  assert.match(html, /atlas-person-table-view\.js\?v=20260815-ui7-table-r3/);
});
