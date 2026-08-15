import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const readService = require('../server/atlas-person-read-service.js');
const semanticService = require('../server/atlas-person-list-semantic-service.js');
const registry = JSON.parse(fs.readFileSync(new URL('../docs/ui/ui-information-coverage.json', import.meta.url), 'utf8'));
const curatedRows = JSON.parse(fs.readFileSync(new URL('../non-timeline-persons.json', import.meta.url), 'utf8'));

function leafPaths(value, prefix = '') {
  const paths = [];
  if (Array.isArray(value)) {
    const arrayPrefix = `${prefix}[]`;
    for (const item of value) {
      if (item && typeof item === 'object') paths.push(...leafPaths(item, arrayPrefix));
      else paths.push(arrayPrefix);
    }
    return paths;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const childPrefix = prefix ? `${prefix}.${key}` : key;
      if (Array.isArray(child) && child.length === 0) paths.push(`${childPrefix}[]`);
      else paths.push(...leafPaths(child, childPrefix));
    }
    return paths;
  }
  if (prefix) paths.push(prefix);
  return paths;
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

const personRow = {
  id: '00000000-0000-4000-8000-000000000001',
  person_type: 'historical',
  historicity: 'historical',
  names: [
    { locale: 'ko', name: '시험 인물', name_type: 'preferred', is_preferred: true },
    { locale: 'en', name: 'Test Person', name_type: 'canonical', is_preferred: true }
  ],
  descriptions: [{ locale: 'ko', content: '설명' }],
  activity_count: 1,
  first_activity_year: -100,
  last_activity_year: -90
};

const activityRow = {
  id: '00000000-0000-4000-8000-000000000401',
  person_id: personRow.id,
  polity_id: '00000000-0000-4000-8000-000000000101',
  relation_type_id: '00000000-0000-4000-8000-000000000201',
  role_id: '00000000-0000-4000-8000-000000000301',
  period_basis_id: '00000000-0000-4000-8000-000000000501',
  activity_start: -100,
  activity_start_month: 2,
  activity_start_day: 3,
  activity_start_granularity: 'day',
  activity_start_certainty: 'approximate',
  activity_start_calendar: 'julian',
  activity_end: -90,
  activity_end_month: 4,
  activity_end_day: 5,
  activity_end_granularity: 'day',
  activity_end_certainty: 'disputed',
  activity_end_calendar: 'julian',
  confidence: 'medium',
  chronology_status: 'reviewed',
  notes: 'note',
  relation_type_code: 'rules',
  relation_type_category: 'authority',
  polity_name_en: 'Test Polity',
  polity_name_ko: '시험 정치체',
  role_code: 'king',
  role_category: 'ruler',
  role_source_label: 'King',
  role_name_en: 'King',
  role_name_ko: '왕',
  period_basis_code: 'reign',
  period_basis_name_en: 'Reign',
  period_basis_name_ko: '재위'
};

const sourceRow = {
  source_type: 'book',
  title: 'Test Source',
  canonical_url: 'https://example.test/source',
  citation_text: 'Test Source, p. 10'
};

function assertProjectionCovered(entity, projected) {
  const actual = sortedUnique(leafPaths(projected));
  const declared = sortedUnique(Object.keys(registry.entities[entity] || {}));
  assert.deepEqual(actual, declared, `${entity} projection changed without a matching coverage registry update`);
}

function prefixedRegistryPaths(entity, prefix = '') {
  return Object.keys(registry.entities[entity] || {}).map((path) => prefix ? `${prefix}.${path}` : path);
}

test('UI-T7 coverage registry exactly covers the public Person projection', () => {
  assertProjectionCovered('Person', readService.projectPerson(personRow));
});

test('UI-T7 coverage registry exactly covers the full Activity projection', () => {
  assertProjectionCovered('Activity', readService.projectActivity(activityRow));
});

test('UI-T7 compact Activity list projection cannot introduce an unmapped field', () => {
  const compactPaths = sortedUnique(leafPaths(semanticService.projectCompactActivity(activityRow)));
  const declared = new Set(Object.keys(registry.entities.Activity));
  for (const path of compactPaths) assert.ok(declared.has(path), `Compact Activity field lacks UI coverage: ${path}`);
});

test('UI-T7 coverage registry exactly covers the public Source projection', () => {
  assertProjectionCovered('Source', readService.projectSource(sourceRow, 'page:10'));
});

test('UI-T7 final Person detail assembly cannot introduce an unmapped nested field', async () => {
  const personSourceRow = { ...sourceRow };
  const activitySourceRow = {
    ...sourceRow,
    person_politics_id: activityRow.id,
    source_locator_key: 'page:10'
  };
  const client = {
    async query(sql) {
      if (sql === readService.PERSON_DETAIL_SQL) return { rowCount: 1, rows: [personRow] };
      if (sql === readService.ACTIVITY_DETAIL_SQL) return { rowCount: 1, rows: [activityRow] };
      if (sql === readService.PERSON_SOURCE_SQL) return { rowCount: 1, rows: [personSourceRow] };
      if (sql === readService.ACTIVITY_SOURCE_SQL) return { rowCount: 1, rows: [activitySourceRow] };
      throw new Error('unexpected SQL in coverage fixture');
    }
  };

  const detail = await readService.readPersonDetail({ client, personId: personRow.id });
  const actual = sortedUnique(leafPaths(detail));
  const expected = sortedUnique([
    ...prefixedRegistryPaths('Person'),
    ...prefixedRegistryPaths('Source', 'sources[]'),
    ...prefixedRegistryPaths('Activity', 'activities[]'),
    ...prefixedRegistryPaths('Source', 'activities[].sources[]')
  ]);
  assert.deepEqual(actual, expected, 'Final Person detail payload changed without a matching coverage registry update');
});

test('UI-T7 every curated non-timeline source field is mapped', () => {
  const actual = sortedUnique((Array.isArray(curatedRows) ? curatedRows : []).flatMap((row) => Object.keys(row || {})));
  const declared = sortedUnique(Object.keys(registry.entities.CuratedNonTimeline || {}));
  assert.deepEqual(actual, declared, 'Curated non-timeline schema changed without a matching coverage registry update');
});

test('UI-T7 every mapped field has an allowed surface and static implementation evidence', () => {
  const allowed = new Set(registry.allowed_surfaces || []);
  assert.ok(allowed.size > 0);
  const fileCache = new Map();

  for (const [entity, fields] of Object.entries(registry.entities || {})) {
    for (const [path, definition] of Object.entries(fields || {})) {
      assert.ok(Array.isArray(definition.coverage) && definition.coverage.length > 0, `${entity}.${path} has no coverage surface`);
      for (const surface of definition.coverage) assert.ok(allowed.has(surface), `${entity}.${path} uses unknown surface ${surface}`);
      assert.ok(Array.isArray(definition.evidence) && definition.evidence.length > 0, `${entity}.${path} has no implementation evidence`);
      for (const evidence of definition.evidence) {
        assert.ok(typeof evidence.file === 'string' && evidence.file, `${entity}.${path} has invalid evidence file`);
        assert.ok(typeof evidence.token === 'string' && evidence.token, `${entity}.${path} has invalid evidence token`);
        let source = fileCache.get(evidence.file);
        if (source == null) {
          source = fs.readFileSync(new URL(`../${evidence.file}`, import.meta.url), 'utf8');
          fileCache.set(evidence.file, source);
        }
        assert.ok(source.includes(evidence.token), `${entity}.${path} evidence missing: ${evidence.file} :: ${evidence.token}`);
      }
    }
  }
});

test('UI-T7 registry cannot silently downgrade uncertainty fields to an unmapped state', () => {
  for (const path of [
    'start.granularity', 'start.certainty', 'start.calendar',
    'end.granularity', 'end.certainty', 'end.calendar',
    'confidence', 'chronology_status', 'notes'
  ]) {
    const definition = registry.entities.Activity[path];
    assert.ok(definition, `missing uncertainty field ${path}`);
    assert.ok(definition.coverage.includes('MAIN_DETAIL'), `${path} must remain readable in Main detail`);
  }
});
