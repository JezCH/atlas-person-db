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
  assert.equal(calls[0].url, '/api/atlas-person-read?projection=compact');
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

test('portrait reader uses the consolidated public read surface and preserves explicit no-portrait state', async () => {
  const reader = loadReader();
  const id = '11111111-1111-4111-8111-111111111111';
  let calls = 0;
  const result = await reader.readPortrait(id, {
    fetchImpl: async (url, options) => {
      calls += 1;
      assert.equal(url, `/api/atlas-read?__atlas_read_surface=person-portrait&person_id=${id}`);
      assert.equal(options.method, 'GET');
      assert.equal(options.credentials, 'same-origin');
      assert.equal(options.cache, 'no-store');
      return {
        ok:true,
        status:200,
        json:async () => ({
          ok:true,
          schema:'atlas-person-portrait/v1',
          found:true,
          person_id:id,
          portrait:null
        })
      };
    }
  });
  assert.equal(calls, 1);
  assert.equal(result.person_id, id);
  assert.equal(result.portrait, null);
});

test('portrait reader returns canonical asset metadata without mutating it', async () => {
  const reader = loadReader();
  const id = '11111111-1111-4111-8111-111111111111';
  const assetUrl = 'https://store.public.blob.vercel-storage.com/portraits/' + 'a'.repeat(64) + '.webp';
  const result = await reader.readPortrait(id, {
    fetchImpl:async () => ({
      ok:true,
      status:200,
      json:async () => ({
        ok:true,
        schema:'atlas-person-portrait/v1',
        found:true,
        person_id:id,
        portrait:{
          asset_sha256:'a'.repeat(64),
          asset_pathname:'portraits/' + 'a'.repeat(64) + '.webp',
          asset_url:assetUrl,
          portrait_kind:'artwork',
          evidence_level:'direct',
          sources:[]
        }
      })
    })
  });
  assert.equal(result.portrait.asset_url, assetUrl);
  assert.equal(result.portrait.portrait_kind, 'artwork');
  assert.equal(result.portrait.evidence_level, 'direct');
});

test('browser reader never embeds write endpoints, secrets, or a closed historicity vocabulary', () => {
  assert.doesNotMatch(source, /atlas-mutate|atlas-identity|atlas-authoring|atlas-duplicate-review/);
  assert.doesNotMatch(source, /SUPABASE_DB_URL|ATLAS_SESSION_SECRET|ATLAS_MUTATION_TOKEN|authorization|bearer\s/i);
  assert.doesNotMatch(source, /legendary\s*[,\]]|mythic\s*[,\]]|uncertain\s*[,\]]/i);
});

test('repeated Person search reuses the read snapshot while a new Person snapshot reindexes', () => {
  const reader=loadReader();
  const first=person('cache-a','historical',100,'A');
  let descriptionReads=0;
  Object.defineProperty(first,'descriptions',{get(){descriptionReads++;return [{content:'Unique first description'}];}});
  assert.equal(reader.personMatchesQuery(first,'unique'),true);
  const readsAfterIndex=descriptionReads;
  assert.ok(readsAfterIndex>0);
  assert.equal(reader.personMatchesQuery(first,'first'),true);
  assert.equal(descriptionReads,readsAfterIndex,'repeat query must reuse cached search union');
  const fresh={...first,descriptions:[{content:'Replacement detail'}]};
  assert.equal(reader.personMatchesQuery(fresh,'replacement'),true);
  assert.equal(reader.personMatchesQuery(fresh,'unique'),false);
});

test('render-only grouping omits unused facet catalog without changing filtered rows', () => {
  const reader=loadReader();
  const rows=[person('a','historical',100,'Alpha'),person('b','historical',200,'Beta')];
  const normal=reader.preparePersonGroups(rows,{query:'Alpha'});
  const fast=reader.preparePersonGroups(rows,{query:'Alpha',includeFacetCatalog:false});
  assert.deepEqual(Array.from(fast.historical,row=>row.id),Array.from(normal.historical,row=>row.id));
  assert.equal(fast.facet_catalog,null);
  assert.ok(normal.facet_catalog.polities);
});


test('compact list projection restores exact search and facet-filter meaning without Person detail reads', async () => {
  const reader = loadReader();
  const polityA = { id:'polity-a', display_name:'스키타이 왕국' };
  const polityB = { id:'polity-b', display_name:'상대 정치체' };
  const rules = { id:'relation-rules', code:'rules', category:'authority' };
  const opposes = { id:'relation-opposes', code:'opposes', category:'opposition' };
  const king = { id:'role-king', display_name:'왕' };
  const basis = { id:'basis-reign', display_name:'재위' };
  const a = person('p1','historical',-360,'아테아스');
  a.activity_summaries = [
    { polity:polityA, relation:rules, role:king, period_basis:basis, notes:'기원전 역사' },
    { polity:polityA, relation:rules, role:king, period_basis:basis, notes:'전쟁' },
    { polity:polityB, relation:opposes, role:king, period_basis:basis, notes:'대립' }
  ];
  a.facets = {
    polities:[polityA], relations:[rules,opposes],
    roles:[king],period_bases:[basis]
  };
  const fetchImpl=async()=>({ok:true,status:200,json:async()=>({
    ok:true,mode:'list',projection:'compact-facets-v1',
    persons:[{...a,facets:undefined}],summary:{total:1}
  })});
  const loaded=await reader.listPersons({fetchImpl});
  const actual=JSON.parse(JSON.stringify(loaded.persons[0].facets));
  assert.deepEqual(actual,a.facets);
  assert.equal(reader.personMatchesQuery(loaded.persons[0],'스키타이'),true);
  assert.equal(reader.personMatchesQuery(loaded.persons[0],'대립'),true);
  assert.equal(reader.personMatchesFacets(loaded.persons[0],{polity_id:'polity-a',relation_type_id:'relation-opposes'}),true);
  assert.equal(reader.personMatchesFacets(loaded.persons[0],{polity_id:'polity-b'}),false);
  assert.equal(loaded.facet_catalog.polities.length,1);
  assert.equal(loaded.groups.historical.length,1);
});

test('compact projection rejects unknown schema and retains legacy read response compatibility', async () => {
  const reader=loadReader();
  const payload={ok:true,mode:'list',persons:[person('x1','historical',100,'X')],summary:{total:1}};
  await assert.rejects(()=>reader.listPersons({fetchImpl:async()=>({
    ok:true,status:200,json:async()=>({...payload,projection:'unexpected'})
  })}),/INVALID_PERSON_LIST_PROJECTION/);
  const result=await reader.listPersons({fetchImpl:async()=>({
    ok:true,status:200,json:async()=>payload
  })});
  assert.equal(result.persons[0].id,'x1');
});
