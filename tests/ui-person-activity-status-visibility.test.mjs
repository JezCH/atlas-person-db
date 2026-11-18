import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const source = read('atlas-person-main.js');
const localization = read('atlas-ui-localization.js');
const index = read('index.html');

test('Activity confidence and chronology use genuinely public API attributes on the detail dossier', () => {
  const activity = source.slice(source.indexOf('  function activityHtml('), source.indexOf('  function portraitFrameHtml('));
  assert.ok(activity.length > 600, 'exact Activity card renderer found');
  assert.match(activity, /activity\.confidence\s*\?\s*metaLabel\("confidence"/);
  assert.match(activity, /activity\.chronology_status\s*\?\s*metaLabel\("chronology"/);
  assert.match(activity, /confidenceLabel \? `근거: \$\{confidenceLabel\}`/);
  assert.match(activity, /chronologyLabel \? `연대: \$\{chronologyLabel\}`/);
  assert.match(activity, /semanticMeta\.map\(escapeHtml\)\.join\(" · "\)/, 'HTML-escaped display');
  assert.match(activity, /person-activity-meta/, 'reuse existing responsive dossier detail');
  assert.doesNotMatch(source.slice(source.indexOf('  function compactActivityHtml('), source.indexOf('  function compactActivitiesHtml(')), /confidenceLabel|chronologyLabel/, 'list rows remain compact');
});

test('Public Activity review and confidence enums have precise Korean labels and unknown values stay unasserted', () => {
  const scope = { window: {} };
  vm.runInNewContext(localization, scope);
  const label = scope.window.ATLAS_UI_I18N.enumLabel;
  assert.equal(label('chronology', 'reviewed'), '연대 검토 완료');
  assert.equal(label('chronology', 'ongoing'), '진행 중');
  assert.equal(label('chronology', 'disputed'), '연대 논쟁 있음');
  assert.equal(label('confidence', 'well_established'), '근거 확립');
  assert.equal(label('confidence', 'likely'), '개연성 높음');
  assert.equal(label('confidence', 'speculative'), '가설·추정 수준');
  assert.equal(label('confidence', 'disputed'), '근거 논쟁 중');
  assert.equal(label('confidence', 'nonexistent', { fallback:'미확인' }), '미확인');
  assert.equal(label('chronology', 'exact_as_recorded'), null, 'legacy null label preserved');
});

test('Public index invalidates both changed JS modules without changing the Spacetime scripts', () => {
  assert.match(index, /atlas-ui-localization\.js\?v=20261118-activity-status-labels-v1/);
  assert.match(index, /atlas-person-main\.js\?v=20261119-person-deeplink-domain-v2/);
});
