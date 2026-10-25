import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
