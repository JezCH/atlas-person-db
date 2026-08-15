import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../atlas-person-browser-reader.js', import.meta.url), 'utf8');

function loadReader() {
  const window = {};
  vm.runInNewContext(source, { window, console, URL, encodeURIComponent, Set, Map, Object, Array, String, Number, Error });
  return window.ATLAS_PERSON_BROWSER_READER;
}

function emptyFacets() {
  return { polities: [], relations: [], roles: [], period_bases: [] };
}

function person(id, historicity, firstActivityYear, name = id, facets = emptyFacets()) {
  return {
    id,
    person_type: 'historical',
    historicity,
    display_name: name,
    canonical_name_en: name,
    preferred_name_ko: null,
    names: [{ locale: 'en', name, name_type: 'canonical', is_preferred: true }],
    descriptions: [],
    activity_count: firstActivityYear == null ? 0 : 1,
    first_activity_year: firstActivityYear,
    last_activity_year: firstActivityYear,
    facets
  };
}

function scythianFacets() {
  return {
    polities: [{ id: 'polity-scythia', display_name: '스키타이 왕국', canonical_name_en: 'Scythian Kingdom' }],
    relations: [{ id: 'relation-rules', code: 'rules', category: 'authority' }],
    roles: [{ id: 'role-king', display_name: '왕', canonical_name_en: 'King', code: 'king', category: 'ruler' }],
    period_bases: [{ id: 'basis-reign', display_name: '재위', canonical_name_en: 'Reign', code: 'reign' }]
  };
}

test('historicity grouping treats only authoritative historical as the primary historical section', () => {
  const reader = loadReader();
  const rows = [
    person('h1', 'historical', null, 'Historical unknown date'),
    person('l1', 'legendary', -1200, 'Legendary'),
    person('m1', 'mythic', null, 'Mythic'),
    person('u1', 'uncertain', 400, 'Uncertain'),
    person('x1', 'custom_future_value', 500, 'Custom')
  ];
  const grouped = reader.partitionByHistoricity(rows);
  assert.deepEqual(Array.from(grouped.historical, (row) => row.id), ['h1']);
  assert.deepEqual(Array.from(grouped.other_or_uncertain, (row) => row.id), ['l1', 'm1', 'u1', 'x1']);
  assert.deepEqual(Array.from(grouped.observed_historicity_values), ['custom_future_value', 'historical', 'legendary', 'mythic', 'uncertain']);
  assert.equal(grouped.historical[0].first_activity_year, null);
});

test('unknown chronology never changes Person historicity grouping', () => {
  const reader = loadReader();
  const historicalUnknown = person('h1', 'historical', null, 'Historical unknown date');
  assert.equal(reader.historicityGroup(historicalUnknown), 'historical');
  assert.equal(reader.preparePersonGroups([historicalUnknown]).historical.length, 1);
});

test('raw non-historical historicity vocabulary is preserved rather than rewritten into a frontend enum', () => {
  const reader = loadReader();
  const custom = person('x1', 'source_specific_unclear', 100, 'Custom');
  const grouped = reader.partitionByHistoricity([custom]);
  assert.equal(grouped.other_or_uncertain[0].historicity, 'source_specific_unclear');
  assert.deepEqual(Array.from(grouped.observed_historicity_values), ['source_specific_unclear']);
});

test('BCE years sort numerically and unknown activity years remain last', () => {
  const reader = loadReader();
  const rows = [
    person('a', 'historical', 1200, 'A'),
    person('b', 'historical', -500, 'B'),
    person('c', 'historical', null, 'C'),
    person('d', 'historical', -1200, 'D')
  ];
  assert.deepEqual(rows.slice().sort((a, b) => reader.comparePersons(a, b, 'start-asc')).map((row) => row.id), ['d', 'b', 'a', 'c']);
  assert.deepEqual(rows.slice().sort((a, b) => reader.comparePersons(a, b, 'start-desc')).map((row) => row.id), ['a', 'b', 'd', 'c']);
});

test('secondary filtering is applied inside already-separated historicity groups', () => {
  const reader = loadReader();
  const rows = [
    person('h1', 'historical', 100, 'Keep historical'),
    person('h2', 'historical', 200, 'Drop historical'),
    person('l1', 'legendary', 300, 'Keep legendary')
  ];
  const grouped = reader.preparePersonGroups(rows, { secondaryPredicate: (row) => row.display_name.startsWith('Keep') });
  assert.deepEqual(Array.from(grouped.historical, (row) => row.id), ['h1']);
  assert.deepEqual(Array.from(grouped.other_or_uncertain, (row) => row.id), ['l1']);
});

test('semantic facet filters are ANDed after historicity partitioning without detail fetching', () => {
  const reader = loadReader();
  const scythian = person('h1', 'historical', -360, 'Ateas', scythianFacets());
  const other = person('h2', 'historical', -300, 'Other', {
    polities: [{ id: 'polity-other', display_name: '다른 정치체' }],
    relations: [{ id: 'relation-rules', code: 'rules', category: 'authority' }],
    roles: [{ id: 'role-general', display_name: '장군' }],
    period_bases: [{ id: 'basis-reign', display_name: '재위' }]
  });
  const legendary = person('l1', 'legendary', -1200, 'Legendary', scythianFacets());
  const grouped = reader.preparePersonGroups([scythian, other, legendary], {
    facetFilters: { polity_id: 'polity-scythia', relation_type_id: 'relation-rules', role_id: 'role-king', period_basis_id: 'basis-reign' }
  });
  assert.deepEqual(Array.from(grouped.historical, (row) => row.id), ['h1']);
  assert.deepEqual(Array.from(grouped.other_or_uncertain, (row) => row.id), ['l1']);
});

test('search includes readable semantic facets and facet catalog deduplicates by UUID', () => {
  const reader = loadReader();
  const rows = [
    person('h1', 'historical', -360, 'Ateas', scythianFacets()),
    person('h2', 'historical', -350, 'Second', scythianFacets())
  ];
  assert.equal(reader.personMatchesQuery(rows[0], '스키타이'), true);
  assert.equal(reader.personMatchesQuery(rows[0], 'authority'), true);
  assert.equal(reader.personMatchesQuery(rows[0], 'king'), true);
  assert.equal(reader.personMatchesQuery(rows[0], '재위'), true);
  const catalog = reader.facetCatalog(rows);
  assert.equal(catalog.polities.length, 1);
  assert.equal(catalog.relations.length, 1);
  assert.equal(catalog.roles.length, 1);
  assert.equal(catalog.period_bases.length, 1);
});

test('list reader is GET-only and returns server summary plus derived groups and facet catalog', async () => {
  const reader = loadReader();
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        source: 'v2-person-read',
        schema: 'atlas-person-read/v1',
        mode: 'list',
        persons: [person('h1', 'historical', null, 'H', scythianFacets()), person('l1', 'legendary', -900)],
        summary: { total: 2, historicity_values: ['historical', 'legendary'] }
      })
    };
  };
  const result = await reader.listPersons({ fetchImpl });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/atlas-person-read');
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[0].options.credentials, 'same-origin');
  assert.equal(result.summary.total, 2);
  assert.equal(result.groups.historical.length, 1);
  assert.equal(result.groups.other_or_uncertain.length, 1);
  assert.equal(result.facet_catalog.polities.length, 1);
});

test('detail reader rejects malformed UUID before fetch and uses UUID query for valid detail', async () => {
  const reader = loadReader();
  let calls = 0;
  await assert.rejects(() => reader.readPerson('not-a-uuid', { fetchImpl: async () => { calls += 1; } }), /INVALID_PERSON_ID/);
  assert.equal(calls, 0);

  const id = '11111111-1111-4111-8111-111111111111';
  const result = await reader.readPerson(id, {
    fetchImpl: async (url, options) => {
      calls += 1;
      assert.equal(url, `/api/atlas-person-read?person_id=${id}`);
      assert.equal(options.method, 'GET');
      return { ok: true, status: 200, json: async () => ({ ok: true, source: 'v2-person-read', schema: 'atlas-person-read/v1', mode: 'detail', person: { id, historicity: 'historical', activities: [] } }) };
    }
  });
  assert.equal(calls, 1);
  assert.equal(result.person.id, id);
});

test('browser reader never embeds write endpoints, secrets, or a closed historicity vocabulary', () => {
  assert.doesNotMatch(source, /atlas-mutate|atlas-identity|atlas-authoring|atlas-duplicate-review/);
  assert.doesNotMatch(source, /SUPABASE_DB_URL|ATLAS_SESSION_SECRET|ATLAS_MUTATION_TOKEN|authorization|bearer\s/i);
  assert.doesNotMatch(source, /legendary\s*[,\]]|mythic\s*[,\]]|uncertain\s*[,\]]/i);
});
