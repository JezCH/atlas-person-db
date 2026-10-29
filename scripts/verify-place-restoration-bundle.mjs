import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {normalizeStage2AssertionOperation}=require('../server/atlas-correction-v2-stage2-assertions.js');
const {normalizePlaceSourceLinks}=require('../server/atlas-authoring-object-service.js');
const {normalizePolityPlaceFunction}=require('../server/atlas-polity-place-function-service.js');

// Read/normalize only: no client, credentials, snapshot synthesis or Apply call.
export function verifyRestorationBundle(bundle, original) {
  assert.equal(bundle.schema,'atlas-place-restoration-preparation/v1');
  assert.equal(bundle.status,'HOLD_NOT_APPROVED');
  assert.equal(bundle.production_executable,false);
  assert.equal(bundle.production_mutation_authorized,false);
  const plan=bundle.source_plan;
  assert.equal(plan.schema,'atlas-stage2-correction-v2-execution-plan/v1');
  assert.equal(plan.execution_rules.production_executable,false);
  assert.equal(plan.execution_rules.production_mutation_authorized,false);
  assert.equal(plan.baseline,null,'no fabricated Production baseline');
  assert.deepEqual(plan.operations,[]);
  const sources=new Map(original.sources.map(x=>[x.id,x]));
  const reviewed=new Map(bundle.source_review.map(x=>[x.source_id,x]));
  assert.equal(reviewed.size,bundle.source_review.length,'duplicate source review');
  function evidenceHold(row) {
    assert.equal(row?.historical_approval,'HOLD','retrieval status is not historical approval');
    assert(row.missing,'missing item-level evidence gap');
    assert.equal(typeof row.status,'string');
    assert(row.status.trim() && !/^approved$/i.test(row.status.trim()),'retrieval status must not assert approval');
  }
  bundle.source_review.forEach(evidenceHold);
  const seen=new Set();
  function source(operation) {
    const s=operation.exact_after.source;
    assert(!seen.has(s.id),'duplicate source assertion');seen.add(s.id);
    assert(sources.has(s.id),'unknown source');
    for(const [k,v] of Object.entries(sources.get(s.id))) assert.deepEqual(s[k],v,`original Source field ${k}`);
    assert.equal(operation.exact_before.source_absent_id,s.id);
    evidenceHold(reviewed.get(s.id));
  }
  plan.stage2_assertions.forEach((op,i)=>{source(op);normalizeStage2AssertionOperation(op,i);});
  bundle.quarantined_source_assertions.forEach((item,i)=>{
    source(item.operation);
    assert.equal(item.status,'HOLD_MISSING_CANONICAL_URL');
    assert.throws(()=>normalizeStage2AssertionOperation(item.operation,i),/SOURCE_BIBLIOGRAPHIC_EVIDENCE_REQUIRED/);
  });
  assert.deepEqual([...seen].sort(),[...sources.keys()].sort(),'source inventory preserved');
  assert.deepEqual([...reviewed.keys()].sort(),[...sources.keys()].sort());
  assert.deepEqual(bundle.places.map(x=>x.payload),original.places,'all original Place fields and UUIDs preserved');
  const places=new Set(),keys=new Set();
  for(const item of bundle.places){
    assert.equal(item.status,'HOLD');assert.equal(item.operation,'assert_place');assert(item.missing);
    const p=item.payload;
    assert(!places.has(p.id)&&!keys.has(p.canonical_key),'duplicate Place identity');places.add(p.id);keys.add(p.canonical_key);
    const refs=normalizePlaceSourceLinks(p.source_links);
    assert.deepEqual(item.requires_source_ids,refs.map(x=>x.source_id));
    for(const ref of refs)assert(sources.has(ref.source_id),'dangling Place Source');
  }
  assert.deepEqual(bundle.facts.map(x=>x.payload),original.facts,'all original fact fields preserved');
  const facts=new Set();
  bundle.facts.forEach((item,i)=>{
    assert.equal(item.original_fact_index,i);assert.equal(item.status,'HOLD');
    assert(!Object.hasOwn(item.payload,'id'),'no invented fact UUID');
    const f=normalizePolityPlaceFunction(item.payload);
    assert(!facts.has(f.fact_key),'duplicate semantic fact');facts.add(f.fact_key);
    assert(places.has(f.place_id)&&original.expected_polity_ids.includes(f.polity_id),'dangling fact target');
    assert.deepEqual(item.source_reviews.map(x=>x.source_id),f.source_refs.map(x=>x.source_id));
    for(const ref of item.source_reviews){
      assert(sources.has(ref.source_id));evidenceHold(ref);
      const review=reviewed.get(ref.source_id);
      assert.equal(ref.original_locator,f.source_refs.find(x=>x.source_id===ref.source_id).locator);
      assert.equal(ref.status,review.status);
      assert.equal(ref.missing,review.missing);
      assert.equal(ref.reviewed_locator,review.locator||null);
      assert.equal(ref.finding,review.finding||null);
    }
  });
  assert.deepEqual(bundle.execution_order,['approved_source_assertions','approved_exact_places','approved_place_functions','separately_authorized_compile_and_readback']);
  return {structural_source_candidates:plan.stage2_assertions.length,quarantined_sources:bundle.quarantined_source_assertions.length,places:places.size,facts:facts.size,historical_approvals:0,production_calls:0};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const root=new URL('../',import.meta.url);
  const read=p=>JSON.parse(fs.readFileSync(new URL(p,root),'utf8'));
  console.log(JSON.stringify(verifyRestorationBundle(read('docs/handoffs/20261026-place-restoration/restoration-bundle.json'),read('data/core/polity-place-function-authority-backfill.v1.json')),null,2));
}
