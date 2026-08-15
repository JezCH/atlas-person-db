import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../atlas-person-main.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('UI-T1 has no post-render Person table MutationObserver or adapter boot path', () => {
  assert.doesNotMatch(html, /atlas-person-table-view\.js/);
  assert.doesNotMatch(source, /person-table-decorated|decorateGrid|decorateAll|scheduleDecorate|ATLAS_PERSON_TABLE_VIEW/);

  const observerSites = [...source.matchAll(/new MutationObserver/g)].map((match) => match.index);
  assert.equal(observerSites.length, 2, 'only legacy authoring synchronization observers should remain');

  const waitStart = source.indexOf('function waitForLegacyActivityButton');
  const waitEnd = source.indexOf('function refreshAfterDialogClose');
  const refreshStart = source.indexOf('function refreshAfterLegacyRowsChange');
  const refreshEnd = source.indexOf('function openLegacyCreate');
  assert.ok(waitStart >= 0 && waitEnd > waitStart);
  assert.ok(refreshStart >= 0 && refreshEnd > refreshStart);
  for (const index of observerSites) {
    assert.ok(
      (index > waitStart && index < waitEnd) || (index > refreshStart && index < refreshEnd),
      'MutationObserver must be scoped only to legacy authoring synchronization'
    );
  }
});

test('UI-T1 direct row renderer preserves exceptional status and suppresses default historical values', () => {
  const start = source.indexOf('function exceptionalPersonStatusHtml');
  const end = source.indexOf('function personTableHeaderHtml');
  const body = source.slice(start, end);
  assert.match(body, /historicity\.toLowerCase\(\) !== "historical"/);
  assert.match(body, /personType\.toLowerCase\(\) !== "historical"/);
  assert.match(body, /person-table-status-inline/);
  assert.match(body, /person-historicity/);
});

test('UI-T1 direct Activity renderer keeps correlated identity and meaningful exception diagnostics', () => {
  const start = source.indexOf('function compactActivityHtml');
  const end = source.indexOf('function compactActivitiesHtml');
  const body = source.slice(start, end);
  for (const token of [
    'activity?.id',
    'activity?.polity?.display_name',
    'activity?.relation?.code',
    'activity?.role?.display_name',
    'activity?.period_basis?.display_name',
    'activity?.start',
    'activity?.end'
  ]) assert.ok(body.includes(token), `expected compact Activity renderer to contain ${token}`);
  assert.match(source, /person-table-exception/);
  assert.match(source, /연대 논쟁 있음/);
  assert.match(source, /신뢰도 낮음/);
});
