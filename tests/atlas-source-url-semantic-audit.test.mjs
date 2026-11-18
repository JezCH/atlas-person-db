import test from 'node:test';
import assert from 'node:assert/strict';
import { auditSharedSourceUrls } from '../scripts/atlas-source-url-semantic-audit.mjs';

function fixture() {
  return { raw: {
    sources: [
      {id:'s1',source_key:'human-authoring:regency:v1',source_type:'government_web',title:'Official history',canonical_url:'https://example.org/history',external_identifier:null},
      {id:'s2',source_key:'human-authoring:king:v1',source_type:'government_web',title:'Official history',canonical_url:'https://example.org/history',external_identifier:'ID-2'},
      {id:'s3',source_key:'human-authoring:other:v1',source_type:'web_bibliographic_reference',title:'Royal records',canonical_url:'https://example.org/royal'},
      {id:'s4',source_key:'bibliographic:other',source_type:'government_web',title:'Royal lineage',canonical_url:'https://example.org/royal'},
      {id:'s5',source_key:'unique',source_type:'government_web',title:'Unshared',canonical_url:'https://example.org/unique'},
    ],
    activity_sources: [
      {activity_id:'a1',source_id:'s1',source_locator_key:'chapter 1'},
      {activity_id:'a1',source_id:'s2',source_locator_key:'chapter 2'},
      {activity_id:'a2',source_id:'s3',source_locator_key:'folio 3'},
      {activity_id:'a3',source_id:'s4',source_locator_key:'folio 4'},
    ],
    polity_sources: [{polity_id:'p1',source_id:'s1'}],
    designation_sources: [{designation_id:'d1',source_id:'s2',source_locator_key:'section 5'}],
    governance_sources: []
  }};
}

test('full immutable Source citation graph is preserved for every shared URL', () => {
  const result = auditSharedSourceUrls(fixture());
  assert.equal(result.schema, 'atlas-source-url-semantic-audit/v1');
  assert.deepEqual(result.operations, []);
  assert.equal(result.production_mutation_authorized, false);
  assert.deepEqual(result.summary, {
    shared_url_groups:2,source_uuid_rows:4,excess_over_url_uniqueness:2,
    title_variant_groups:1,type_variant_groups:1,
    same_activity_source_groups:1,same_activity_source_collisions:1,
    human_authoring_source_rows:3,activity_source_links:4,
    activity_source_links_with_citations:0,same_activity_distinct_citation_collisions:0,
    designation_source_links:1
  });
  const history=result.cases.find(c=>c.canonical_url==='https://example.org/history');
  assert.equal(history.review_priority,'SAME_ACTIVITY_MULTIPLE_SOURCE_UUIDS');
  assert.deepEqual(history.same_activity_source_collisions,[{activity_id:'a1',source_ids:['s1','s2'],citation_comparison:'EVIDENCE_UNAVAILABLE'}]);
  assert.deepEqual(history.sources.find(s=>s.id==='s1').references,[
    {table:'activity_sources',parent_id:'a1',source_locator_key:'chapter 1'},
    {table:'polity_sources',parent_id:'p1',source_locator_key:null}
  ]);
  assert.equal(history.sources.find(s=>s.id==='s2').external_identifier,'ID-2');
  assert.equal(history.sources.find(s=>s.id==='s2').references[1].parent_id,'d1');
  assert.equal(history.safe_to_merge,false);
  assert.equal(history.review_state,'REVIEW_REQUIRED');
  const other=result.cases.find(c=>c.canonical_url==='https://example.org/royal');
  assert.equal(other.review_priority,'BIBLIOGRAPHIC_METADATA_VARIATION');
  assert.equal(other.safe_to_merge,false);
});

test('incomplete Source or reference graph fails closed rather than inventing a clean audit', () => {
  const missing=fixture();
  delete missing.raw.designation_sources;
  assert.throws(()=>auditSharedSourceUrls(missing),/INCOMPLETE_SNAPSHOT/);
  const drift=fixture();
  drift.raw.sources[1].id='s1';
  assert.throws(()=>auditSharedSourceUrls(drift),/INVALID_SOURCE_ID/);
  const duplicateKey=fixture();
  duplicateKey.raw.sources[1].source_key=duplicateKey.raw.sources[0].source_key;
  assert.throws(()=>auditSharedSourceUrls(duplicateKey),/DUPLICATE_SOURCE_KEY/);
  const dangling=fixture();
  dangling.raw.activity_sources[0].source_id='missing';
  assert.throws(()=>auditSharedSourceUrls(dangling),/DANGLING_SOURCE/);
  const badParent=fixture();
  delete badParent.raw.activity_sources[0].activity_id;
  assert.throws(()=>auditSharedSourceUrls(badParent),/INCOMPLETE_REFERENCE/);
});

test('unshared URLs and missing URLs are not presented as duplicate candidates', () => {
  const data=fixture();
  data.raw.sources.push({id:'s6',source_key:'unknown',title:'No URL',source_type:'government_web',canonical_url:null});
  const r=auditSharedSourceUrls(data);
  assert.equal(r.summary.shared_url_groups,2);
  assert.ok(!r.cases.some(c=>c.sources.some(s=>s.id==='s5'||s.id==='s6')));
});


test('preserves distinct citation text when supplied without inferring missing evidence', () => {
  const data = fixture();
  data.raw.sources[0].citation_text = 'First historical assertion';
  data.raw.sources[1].citation_text = 'Second historical assertion';
  const result = auditSharedSourceUrls(data);
  const history = result.cases.find(item => item.canonical_url === 'https://example.org/history');
  assert.deepEqual(history.sources.map(source => source.citation_text), [
    'First historical assertion', 'Second historical assertion'
  ]);
  assert.equal(history.safe_to_merge, false);
  const royal = result.cases.find(item => item.canonical_url === 'https://example.org/royal');
  assert.ok(royal.sources.every(source => !Object.hasOwn(source, 'citation_text')));
});


function fixtureWithRuntimeProvenance() {
  const data = fixture();
  const byActivity = new Map();
  for (const link of data.raw.activity_sources) {
    const source = data.raw.sources.find(row => row.id === link.source_id);
    const citation = {
      source_id: source.id, source_key: source.source_key,
      title: source.title, source_type: source.source_type,
      canonical_url: source.canonical_url,
      source_locator_key: link.source_locator_key,
      citation_text: source.id === 's1' ? '7 March 1945 specific assertion'
        : source.id === 's2' ? 'March 1945 wider leadership claim'
          : 'Different source claim ' + source.id
    };
    if (!byActivity.has(link.activity_id)) byActivity.set(link.activity_id, []);
    byActivity.get(link.activity_id).push(citation);
  }
  data.raw.runtime_activities = [...byActivity].map(([id, normalized_sources]) => ({
    activity: { id, provenance_snapshot: { normalized_sources } }
  }));
  return data;
}

test('joins original immutable Runtime citation to exact Activity and Source without inventing global Source citation', () => {
  const data = fixtureWithRuntimeProvenance();
  const result = auditSharedSourceUrls(data);
  const history = result.cases.find(row => row.canonical_url === 'https://example.org/history');
  assert.equal(result.production_mutation_authorized, false);
  assert.deepEqual(result.operations, []);
  assert.equal(result.summary.activity_source_links_with_citations, 4);
  assert.equal(result.summary.same_activity_distinct_citation_collisions, 1);
  assert.deepEqual(history.same_activity_source_collisions, [
    {activity_id:'a1',source_ids:['s1','s2'],citation_comparison:'DISTINCT_ASSERTION_CITATIONS'}
  ]);
  assert.deepEqual(history.sources.find(s=>s.id==='s1').references, [
    {table:'activity_sources',parent_id:'a1',source_locator_key:'chapter 1',citation_text:'7 March 1945 specific assertion'},
    {table:'polity_sources',parent_id:'p1',source_locator_key:null}
  ]);
  assert.ok(!Object.hasOwn(history.sources.find(s=>s.id==='s1'), 'citation_text'));
  assert.equal(history.safe_to_merge, false);
});

test('same citation on same Activity is an evidence comparison, never automatic Source identity merge', () => {
  const data = fixtureWithRuntimeProvenance();
  data.raw.runtime_activities[0].activity.provenance_snapshot.normalized_sources[1].citation_text =
    data.raw.runtime_activities[0].activity.provenance_snapshot.normalized_sources[0].citation_text;
  const r = auditSharedSourceUrls(data);
  assert.equal(r.summary.same_activity_distinct_citation_collisions, 0);
  assert.equal(r.cases.find(c=>c.canonical_url==='https://example.org/history')
    .same_activity_source_collisions[0].citation_comparison,'IDENTICAL_ASSERTION_CITATIONS');
  assert.equal(r.cases[0].safe_to_merge,false);
  delete data.raw.runtime_activities[0].activity.provenance_snapshot.normalized_sources[1].citation_text;
  assert.equal(auditSharedSourceUrls(data).cases.find(c=>c.canonical_url==='https://example.org/history')
    .same_activity_source_collisions[0].citation_comparison,'EVIDENCE_UNAVAILABLE');
});

test('Runtime Source join refuses missing, ambiguous or changed provenance without any canonical write', () => {
  for (const mutate of [
    data => data.raw.runtime_activities[0].activity.provenance_snapshot.normalized_sources.pop(),
    data => data.raw.runtime_activities[0].activity.provenance_snapshot.normalized_sources.push({
      ...data.raw.runtime_activities[0].activity.provenance_snapshot.normalized_sources[0]
    }),
    data => { data.raw.runtime_activities[0].activity.provenance_snapshot.normalized_sources[0].source_key = 'different'; },
    data => { data.raw.runtime_activities[0].activity.provenance_snapshot.normalized_sources[0].title = 'unreviewed different title'; },
    data => { data.raw.runtime_activities[0].activity.provenance_snapshot.normalized_sources[0].canonical_url = 'https://different.example/'; },
    data => { data.raw.runtime_activities[0].activity.provenance_snapshot.normalized_sources[0].source_locator_key = 'different locator'; },
  ]) {
    const data = fixtureWithRuntimeProvenance();
    mutate(data);
    assert.throws(()=>auditSharedSourceUrls(data),/SOURCE_URL_AUDIT_(DUPLICATE_RUNTIME_CITATION|RUNTIME_LINK_PROVENANCE_MISMATCH)/);
  }
  const malformed = fixtureWithRuntimeProvenance();
  malformed.raw.runtime_activities[0].activity.provenance_snapshot = null;
  assert.throws(()=>auditSharedSourceUrls(malformed),/SOURCE_URL_AUDIT_INVALID_RUNTIME_EVIDENCE/);
});


test('rejects extra Runtime citations absent from the canonical link census', () => {
  const data = fixtureWithRuntimeProvenance();
  data.raw.runtime_activities[0].activity.provenance_snapshot.normalized_sources.push({
    source_id: 's5', source_key: 'unique', title: 'Unshared',
    source_type: 'government_web', canonical_url: 'https://example.org/unique',
    citation_text: 'Unexpected Runtime-only assertion'
  });
  assert.throws(() => auditSharedSourceUrls(data), /UNMATCHED_RUNTIME_CITATION/);
});
