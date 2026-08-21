import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../atlas-person-main.js', import.meta.url), 'utf8');

test('main Person rows do not render an opposed counterparty as the person polity', () => {
  const compactStart = source.indexOf('function compactActivityHtml(activity)');
  const compactEnd = source.indexOf('function compactActivitiesHtml(person)');
  assert.ok(compactStart >= 0 && compactEnd > compactStart);
  const compact = source.slice(compactStart, compactEnd);

  assert.match(compact, /String\(relation\)\.trim\(\)\.toLowerCase\(\) !== "opposes"/);
  assert.match(compact, /const polityHead = showAffiliatedPolity/);
  assert.match(compact, /\$\{polityHead\}/);
  assert.doesNotMatch(compact, /return `<span[^`]+<b>\$\{escapeHtml\(polity\)\}<\/b><span class="person-relation-badge">\$\{escapeHtml\(relation\)\}<\/span>/s);
});

test('Person detail keeps the opposed polity and relation for historical context', () => {
  const detailStart = source.indexOf('function activityHtml(activity)');
  const detailEnd = source.indexOf('function renderDetail(person)');
  assert.ok(detailStart >= 0 && detailEnd > detailStart);
  const detail = source.slice(detailStart, detailEnd);

  assert.match(detail, /const relation = activity\.relation\?\.code/);
  assert.match(detail, /const polity = activity\.polity\?\.display_name/);
  assert.match(detail, /person-relation-badge/);
  assert.match(detail, /<h4>\$\{escapeHtml\(polity\)\}<\/h4>/);
});
