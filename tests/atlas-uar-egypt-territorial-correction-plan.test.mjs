import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { snapshotDigest } = require('../server/atlas-correction-v2-snapshot-service.js');
const { synthesizeUnifiedCorrectionV2Manifest } = require('../server/atlas-correction-v2-unified-plan-synthesizer.js');
const { requireUnifiedV2Manifest } = require('../server/atlas-correction-manifest-v2-unified-service.js');
const plan=JSON.parse(fs.readFileSync(new URL('../corrections/plans/polity-uar-egypt-territorial-1961-20261125.v1.json',import.meta.url),'utf8'));
const N='e65edaa4-645a-479f-be81-6414ff2f71ba',S='e100c855-4559-5431-8c72-61909a8da746';
const U='a602213a-dccb-4a23-96c3-e91dfc300a9f',E='8c25246a-3d73-4df9-8e4a-b0c5ca97c241';
const UN='ada1dd54-29eb-4d43-ac83-5c6fbc665b13';
const originalLinks=[
  [N,'41947aa9-0fe1-4c86-b953-176c0c2c93f3','https://sis.gov.eg/en/egypt/egyptian-figures/gamal-abdel-nasser/'],
  [N,'b395e7d4-a7e3-40a2-a2cd-22f921107799','https://africa.sis.gov.eg/english/figures/politics/gamal-abdel-nasser/'],
  [S,'5f87d882-42d0-4f1a-ba63-267796d3da56','https://www.britannica.com/biography/Anwar-Sadat'],
  [S,UN,'https://www.un.org/en/node/122868']
];
function fixture() {
  // Synthetic offline fixture, not an authenticated exact Production snapshot.
  const activities=plan.operations.map(o=>{
    const b=o.baseline_before, n=o.activity_id===N;
    return {id:o.activity_id,person_id:b.person_id,polity_id:b.polity_id,role_id:b.role_id,
      relation_type_id:'67a57b37-1853-5f2a-b7ab-e6b2d32b56b6',period_basis_id:b.period_basis_id,
      activity_start:b.activity_start,activity_start_month:n?2:10,activity_start_day:n?22:15,
      activity_start_granularity:'day',activity_start_certainty:'exact',activity_start_calendar:'gregorian',
      activity_end:b.activity_end,activity_end_month:9,activity_end_day:n?28:1,
      activity_end_granularity:'day',activity_end_certainty:'exact',activity_end_calendar:'gregorian',
      confidence:b.confidence,chronology_status:b.chronology_status,legacy_source_key:b.legacy_source_key,
      notes:'fixture original notes',source_locator:{kind:'fixture'},content_hash:'fixture-hash'};
  }).sort((a,b)=>a.id.localeCompare(b.id));
  const core={schema:'atlas-correction-v2-target-snapshot/v1',activity_ids:activities.map(a=>a.id),
    activities,normalized_activity_source_links:originalLinks.map(([person_politics_id,source_id,source_locator_key])=>({person_politics_id,source_id,source_locator_key})).sort((a,b)=>a.person_politics_id.localeCompare(b.person_politics_id)||a.source_id.localeCompare(b.source_id)),
    chronology_claims:[],relationship_descriptions:[]};
  return {...core,snapshot_digest:snapshotDigest(core),read_only:true,committed:false};
}
test('UAR proposal preserves original identities, separates 1961 operational transition from 1971 name change',()=>{
  assert.equal(plan.execution_rules.production_mutation_authorized,false);
  assert.equal(plan.execution_rules.production_executable,false);
  const m=requireUnifiedV2Manifest(synthesizeUnifiedCorrectionV2Manifest(plan,fixture()));
  assert.deepEqual(m.operations.map(o=>o.type),['assert_source','split_activity','rewrite_activity','assert_polity_designation']);
  const [,n,s,d]=m.operations;
  assert.equal(n.activity_id,N);
  assert.equal(n.survivor_fragment.activity.id,N);
  assert.equal(n.survivor_fragment.activity.polity_id,U);
  assert.equal(n.survivor_fragment.activity.activity_end,1961);
  assert.equal(n.survivor_fragment.activity.activity_end_day,27);
  assert.equal(n.new_fragments.length,1);
  assert.equal(n.new_fragments[0].activity.polity_id,E);
  assert.equal(n.new_fragments[0].activity.activity_start,1961);
  assert.equal(n.new_fragments[0].activity.activity_start_day,28);
  assert.equal(s.activity_id,S);
  assert.equal(s.exact_after.activity.id,S);
  assert.equal(s.exact_after.activity.polity_id,E);
  assert.equal(s.exact_after.activity.activity_start,1970);
  assert.equal(s.exact_after.activity.activity_end,1971);
  for (const [target,links] of [[N,n.survivor_fragment.normalized_source_links],[N,n.new_fragments[0].normalized_source_links],[S,s.exact_after.normalized_source_links]]) {
    for(const [,source_id,source_locator_key] of originalLinks.filter(x=>x[0]===target))
      assert.ok(links.some(l=>l.source_id===source_id&&l.source_locator_key===source_locator_key));
    assert.equal(links.length,3);
  }
  assert.equal(d.exact_after.designation.polity_id,E);
  assert.equal(d.exact_after.designation.valid_from_year,1961);
  assert.equal(d.exact_after.designation.valid_to_year,1971);
  assert.equal(d.exact_after.designation.valid_to_day,1);
  assert.ok(d.exact_after.source_links.some(l=>l.source_id===UN));
});
test('UAR proposal refuses changed source cardinality and existing split child claims',()=>{
  const drift=fixture();drift.normalized_activity_source_links.pop();
  const {snapshot_digest:_,read_only:__,committed:___,...core}=drift;drift.snapshot_digest=snapshotDigest(core);
  assert.throws(()=>synthesizeUnifiedCorrectionV2Manifest(plan,drift),/SOURCE_COUNT|SOURCE_LINK/);
  const child=fixture();
  child.chronology_claims.push({id:'fa7e3c3a-164e-4c73-9924-02b3d6bc0681',person_politics_id:N,claim_type:'fixture',start_year:1958,end_year:1970});
  const {snapshot_digest:_d,read_only:_r,committed:_c,...childCore}=child;child.snapshot_digest=snapshotDigest(childCore);
  assert.throws(()=>synthesizeUnifiedCorrectionV2Manifest(plan,child),/SPLIT_CHILD_POLICY_REQUIRED/);
});
