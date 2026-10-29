import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {verifyRestorationBundle} from '../scripts/verify-place-restoration-bundle.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const original=read('../data/core/polity-place-function-authority-backfill.v1.json');
const bundle=read('../docs/handoffs/20261026-place-restoration/restoration-bundle.json');
test('prepared inputs preserve originals while real normalizers distinguish structural candidates and quarantine',()=>{
  const result=verifyRestorationBundle(bundle,original);
  assert.equal(result.places,original.places.length);
  assert.equal(result.facts,original.facts.length);
  assert.equal(result.structural_source_candidates+result.quarantined_sources,original.sources.length);
});
test('tampered identity, unsupported evidence promotion and dependency loss fail closed',()=>{
  for(const mutate of [
    b=>b.places[0].payload.id=b.places[1].payload.id,
    b=>b.facts[0].payload.end_year++,
    b=>b.source_plan.stage2_assertions.push(b.quarantined_source_assertions.pop().operation),
    b=>b.source_review[0].missing='',
    b=>b.facts[0].status='APPROVED',
    b=>b.production_executable=true,
    b=>b.source_plan.baseline={snapshot:'invented'},
    b=>b.places[0].requires_source_ids=[]
  ]){const changed=structuredClone(bundle);mutate(changed);assert.throws(()=>verifyRestorationBundle(changed,original));}
});



test('latest preserved evidence reaches25 real Source candidates with2 quarantined and no historical approval',()=>{
  const result=verifyRestorationBundle(bundle,original);
  assert.equal(result.structural_source_candidates,25);
  assert.equal(result.quarantined_sources,2);
  assert.equal(result.historical_approvals,0);
  assert.equal(result.production_calls,0);
  assert(Number.isInteger(bundle.offline_review_provenance.checkpoint_version)&&bundle.offline_review_provenance.checkpoint_version>0);
  assert.match(bundle.offline_review_provenance.source_assertions_sha256,/^[0-9a-f]{64}$/);
  assert.match(bundle.offline_review_provenance.source_review_sha256,/^[0-9a-f]{64}$/);
  const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
  const digest=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
  const operations=[...bundle.source_plan.stage2_assertions,...bundle.quarantined_source_assertions.map(row=>row.operation)].sort((a,b)=>a.exact_after.source.id.localeCompare(b.exact_after.source.id));
  const reviews=bundle.source_review.map(({historical_approval,...row})=>row).sort((a,b)=>a.source_id.localeCompare(b.source_id));
  assert.equal(digest(operations),'2bdb70f8066a54f0228cfeb19870613d4493f46e6f70463f2f984d45d8e0d066','all27 exact preserved Source operations, including canonical URLs');
  assert.equal(digest(reviews),'1958711f3002dc1e8861016a05a7646efe77cd00daf67e077173418e5514e9b4','all27 preserved per-source evidence records');
  for(const row of bundle.source_review)assert.equal(row.historical_approval,'HOLD');
  for(const fact of bundle.facts)for(const row of fact.source_reviews)assert.equal(row.historical_approval,'HOLD');
  const reviewed=new Map(bundle.source_review.map(row=>[row.source_id,row]));
  for(const fact of bundle.facts)for(const row of fact.source_reviews){
    const source=reviewed.get(row.source_id);
    assert.equal(row.status,source.status);
    assert.equal(row.missing,source.missing);
    assert.equal(row.reviewed_locator,source.locator||null);
    assert.equal(row.finding,source.finding||null);
  }
});

test('retrieval updates cannot clear historical gates or detach fact-specific evidence',()=>{
  for(const mutate of [
    b=>b.source_review[0].historical_approval='APPROVED',
    b=>b.source_review[0].status=' approved ',
    b=>b.facts[0].source_reviews[0].historical_approval='APPROVED',
    b=>b.facts[0].source_reviews[0].missing='different gap',
    b=>b.facts[0].source_reviews[0].reviewed_locator='invented page',
    b=>b.source_plan.execution_rules.production_mutation_authorized=true,
    b=>b.source_plan.operations.push({type:'assert_source'})
  ]){const changed=structuredClone(bundle);mutate(changed);assert.throws(()=>verifyRestorationBundle(changed,original));}
});
