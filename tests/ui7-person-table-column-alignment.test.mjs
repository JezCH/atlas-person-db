import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../atlas-person-main.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function ordered(sourceText, tokens) {
  let cursor = -1;
  for (const token of tokens) {
    const next = sourceText.indexOf(token, cursor + 1);
    assert.ok(next > cursor, `expected ${token} after previous table token`);
    cursor = next;
  }
}

test('Person table body order matches the four visible headers in the direct renderer', () => {
  const header = source.slice(source.indexOf('function personTableHeaderHtml'), source.indexOf('function personTableRow'));
  const row = source.slice(source.indexOf('function personTableRow'), source.indexOf('function groupSection'));
  ordered(header, ['person-table-col-identity', 'person-table-col-range', 'person-table-col-activities', 'person-table-col-count']);
  ordered(row, ['person-table-identity', 'person-table-range', 'person-table-activities', 'person-table-count']);
});

test('direct table renderer uses a fresh browser cache key and no adapter asset', () => {
  assert.match(html, /atlas-person-main\.js\?v=20260816-ui-t01/);
  assert.doesNotMatch(html, /atlas-person-table-view\.js/);
});
