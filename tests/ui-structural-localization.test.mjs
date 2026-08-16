import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const i18n = fs.readFileSync(new URL('../atlas-ui-localization.js', import.meta.url), 'utf8');
const authorityCatalog = fs.readFileSync(new URL('../atlas-ui-authority-catalog.ko.js', import.meta.url), 'utf8');
const authorityNav = fs.readFileSync(new URL('../atlas-main-authority-nav.js', import.meta.url), 'utf8');
const nonTimeline = fs.readFileSync(new URL('../non-timeline-list.js', import.meta.url), 'utf8');
const nonTimelineData = JSON.parse(fs.readFileSync(new URL('../non-timeline-persons.json', import.meta.url), 'utf8'));
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const assetLoader = fs.readFileSync(new URL('../asset-loader.js', import.meta.url), 'utf8');

test('one shared localization runtime owns fixed vocabulary and semantic enum labels', () => {
  assert.match(i18n, /window\.ATLAS_UI_I18N/);
  for (const domain of ['relation', 'period_basis', 'chronology', 'confidence', 'historicity', 'person_type', 'granularity', 'certainty', 'calendar', 'source_type']) {
    assert.match(i18n, new RegExp(`${domain}: Object\\.freeze`));
  }
  assert.match(i18n, /function enumLabel\(/);
  assert.match(i18n, /function localizedName\(/);
  assert.match(i18n, /preferred_name_ko/);
  assert.match(i18n, /function patchPersonReader\(/);
  assert.match(i18n, /MutationObserver/);
});

test('Main loads localization after the reader and before renderers, on desktop and mobile alike', () => {
  const reader = 'atlas-person-browser-reader.js?v=20260815-ui6r4';
  const localization = 'atlas-ui-localization.js?v=20260816-ko-architecture-v1';
  const table = 'atlas-person-table-view.js?v=20260816-era-band-v1';
  const main = 'atlas-person-main.js?v=20260815-ui6r4';
  assert.ok(index.includes(localization));
  assert.ok(index.indexOf(reader) < index.indexOf(localization));
  assert.ok(index.indexOf(localization) < index.indexOf(table));
  assert.ok(index.indexOf(localization) < index.indexOf(main));
});

test('authority navigation uses a localized data catalog instead of embedded English product copy', () => {
  assert.match(authorityNav, /ATLAS_UI_AUTHORITY_CATALOG_KO/);
  assert.doesNotMatch(authorityNav, /label:\s*"Dashboard"/);
  assert.doesNotMatch(authorityNav, /status:\s*"READY"/);
  for (const key of ['dashboard', 'persons', 'polities', 'places', 'events', 'sources', 'geometry']) {
    assert.match(authorityCatalog, new RegExp(`${key}: entry\\(`));
  }
  assert.ok(index.indexOf('atlas-ui-authority-catalog.ko.js') < index.indexOf('atlas-main-authority-nav.js'));
});

test('non-timeline presentation no longer carries an ad-hoc polity translation map', () => {
  assert.doesNotMatch(nonTimeline, /const koPolities/);
  assert.doesNotMatch(nonTimeline, /Carthage:\s*"카르타고"/);
  assert.match(nonTimeline, /row\.politic_display_name_ko \|\| row\.politic_name/);
  assert.match(nonTimeline, /ATLAS_UI_I18N/);
  for (const row of nonTimelineData) {
    assert.equal(typeof row.display_name_ko, 'string');
    assert.ok(row.display_name_ko.trim());
    assert.equal(typeof row.politic_display_name_ko, 'string');
    assert.ok(row.politic_display_name_ko.trim());
    assert.equal(typeof row.historicity_display_ko, 'string');
    assert.ok(row.historicity_display_ko.trim());
  }
});

test('Admin asset loader bootstraps the same localization runtime before admin modules', () => {
  assert.match(assetLoader, /LOCALIZATION_ASSET = "\.\/atlas-ui-localization\.js"/);
  assert.match(assetLoader, /const localizationReady/);
  assert.match(assetLoader, /await localizationReady/);
  assert.match(assetLoader, /assets: \[LOCALIZATION_ASSET, \.\.\.paths\]/);
});

test('localization catalog covers the raw Person Main vocabulary that previously leaked English', () => {
  for (const token of [
    'HISTORICAL PERSONS',
    'OTHER / UNCERTAIN HISTORICITY',
    'PERSON DETAIL',
    'Person 출처',
    'Activity 출처',
    'semantic filter',
    'historicity 값',
    'preferred'
  ]) {
    assert.ok(i18n.includes(token), `missing localization coverage for ${token}`);
  }
});
