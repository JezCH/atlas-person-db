import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';

const semanticService = fs.readFileSync(new URL('../server/atlas-person-list-semantic-service.js', import.meta.url), 'utf8');
const readerSource = fs.readFileSync(new URL('../atlas-person-browser-reader.js', import.meta.url), 'utf8');
const mainSource = fs.readFileSync(new URL('../atlas-person-main.js', import.meta.url), 'utf8');
const navSource = fs.readFileSync(new URL('../atlas-person-era-navigation.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../atlas-person-main.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function loadReader() {
  const window = {};
  vm.runInNewContext(readerSource, { window, console, URL, encodeURIComponent, Set, Map, Object, Array, String, Number, Error });
  return window.ATLAS_PERSON_BROWSER_READER;
}

function activitySummary({ start = -360, end = -339 } = {}) {
  return {
    id: '00000000-0000-4000-8000-000000000401',
    polity: { id: 'polity-scythia', display_name: '스키타이 왕국', canonical_name_en: 'Scythian Kingdom' },
    relation: { id: 'relation-rules', code: 'rules', category: 'authority' },
    role: { id: 'role-king', display_name: '왕', canonical_name_en: 'King', code: 'king', category: 'ruler', source_label: 'King' },
    period_basis: { id: 'basis-reign', display_name: '재위', canonical_name_en: 'Reign', code: 'reign' },
    start: { year: start, month: null, day: null, granularity: 'year', certainty: 'approximate', calendar: 'unspecified_historical' },
    end: { year: end, month: null, day: null, granularity: 'year', certainty: 'approximate', calendar: 'unspecified_historical' },
    confidence: 'reviewed',
    chronology_status: 'interpreted',
    notes: 'Killed in battle near the Danube frontier'
  };
}

function personWithActivity() {
  const activity = activitySummary();
  return {
    id: '00000000-0000-4000-8000-000000000001',
    person_type: 'historical',
    historicity: 'historical',
    display_name: 'Ateas',
    canonical_name_en: 'Ateas',
    preferred_name_ko: null,
    names: [{ locale: 'en', name: 'Ateas', name_type: 'canonical', is_preferred: true }],
    descriptions: [],
    activity_count: 1,
    first_activity_year: -360,
    last_activity_year: -339,
    activity_summaries: [activity],
    facets: {
      polities: [activity.polity],
      relations: [activity.relation],
      roles: [activity.role],
      period_bases: [activity.period_basis]
    }
  };
}

test('R4 keeps legacy-readable notes inside the existing bounded compact Activity query', () => {
  assert.match(semanticService, /pp\.notes/);
  assert.match(semanticService, /notes:\s*activity\.notes/);
  assert.match(semanticService, /where pp\.person_id = any\(\$1::uuid\[\]\)/i);
  assert.doesNotMatch(semanticService, /source_locator|source_key|sha256|bytes|canonical_key/i);
});

test('R4 search finds notes, raw chronology, era labels and all compact Activity semantics', () => {
  const reader = loadReader();
  const person = personWithActivity();
  for (const query of [
    'danube', '-360', 'BC 360', 'BCE 360', '기원전 360',
    '스키타이', 'scythian', 'rules', 'authority', 'king', '재위',
    'approximate', 'unspecified_historical', 'reviewed', 'interpreted'
  ]) {
    assert.equal(reader.personMatchesQuery(person, query), true, `expected query to match: ${query}`);
  }
  const cePerson = personWithActivity();
  cePerson.activity_summaries = [activitySummary({ start: 120, end: 130 })];
  assert.equal(reader.personMatchesQuery(cePerson, 'AD 120'), true);
  assert.equal(reader.personMatchesQuery(cePerson, 'CE 120'), true);
  assert.equal(reader.personMatchesQuery(cePerson, '서기 120'), true);
});

test('R4 Person cards render the authoritative compact Activity tuple without detail-loop fetching', () => {
  for (const token of [
    'person?.activity_summaries',
    'activity?.polity?.display_name',
    'activity?.relation?.code',
    'activity?.role?.display_name',
    'activity?.period_basis?.display_name',
    'activity?.start',
    'activity?.end',
    'activity?.chronology_status',
    'activity?.confidence'
  ]) assert.match(mainSource, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(mainSource, /person-card-activities/);
  assert.match(mainSource, /역할 미지정/);
  const cardBody = mainSource.slice(mainSource.indexOf('function compactActivityHtml'), mainSource.indexOf('function groupSection'));
  assert.doesNotMatch(cardBody, /readPerson\(/);
  assert.match(css, /\.person-card-activities/);
  assert.match(css, /\.person-card-activity-period/);
});

test('R4 advertises the restored search scope and busts changed Person assets only', () => {
  assert.match(navSource, /인물·정치체·관계·역할·기간·비고 검색/);
  assert.match(navSource, /search\.id = "personMainSearch"/);
  assert.match(mainSource, /atlas-person-search-change/);
  assert.match(html, /atlas-person-browser-reader\.js\?v=20260815-ui6r4/);
  assert.match(html, /atlas-person-main\.js\?v=20260817-toolbar-owner-r1/);
  assert.match(html, /atlas-person-main\.css\?v=20260817-era-polity-toolbar-v1/);
  assert.match(html, /atlas-person-era-navigation\.js\?v=20260817-era-search-toolbar-v2/);
  assert.match(html, /aria-label="인물·정치체·관계·역할·기간·비고 검색"/);
});

test('R4 does not fabricate birth, death or representative media fields absent from the authoritative read contract', () => {
  assert.doesNotMatch(mainSource, /birth_year|birth_date|death_year|death_date|representative_media|portrait_url|media_url/);
  assert.doesNotMatch(readerSource, /birth_year|birth_date|death_year|death_date|representative_media|portrait_url|media_url/);
});
