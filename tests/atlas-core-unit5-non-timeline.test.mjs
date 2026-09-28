import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const timeline=require('../server/atlas-person-timeline-service.js');
const reconcile=require('../server/atlas-core-unit5-reconciliation-service.js');
const profile=require('../server/atlas-person-profile-service.js');

const root=path.resolve(new URL('..',import.meta.url).pathname);
const manifest=JSON.parse(fs.readFileSync(
  path.join(root,'data/migrations/core-v2-unit5-non-timeline-canonicalization.v1.json'),
  'utf8'
));

test('timeline disposition vocabulary separates Person identity from timeline eligibility', () => {
  assert.deepEqual(timeline.DISPOSITIONS,[
    'timeline',
    'chronology_unresolved',
    'legendary',
    'mythical',
    'other_reviewed_exclusion'
  ]);
  assert.deepEqual(timeline.normalizeTimelineDisposition({disposition:'timeline'}),{
    disposition:'timeline',
    reason:null,
    basis_code:null,
    traditional_year:null,
    traditional_year_alternative:null,
    review_evidence:{}
  });
  assert.throws(
    ()=>timeline.normalizeTimelineDisposition({disposition:'timeline',reason:'invented'}),
    /PERSON_TIMELINE_INCLUDED_PAYLOAD_MUST_BE_EMPTY/
  );
  assert.throws(
    ()=>timeline.normalizeTimelineDisposition({disposition:'legendary'}),
    /PERSON_TIMELINE_EXCLUSION_REASON_REQUIRED/
  );
  assert.equal(profile.PROFILE_OPERATIONS.has('set_person_timeline_disposition'),true);
});

test('Unit 5 migration manifest freezes exactly 124 reviewed non-timeline records without fake Activities', () => {
  const parsed=reconcile.requireManifest(manifest);
  assert.equal(parsed.items.length,124);
  assert.equal(parsed.expected_existing_canonical_count,3);
  assert.equal(parsed.expected_missing_canonical_count,121);
  const counts={};
  for (const item of parsed.items) {
    counts[item.timeline_disposition.disposition]=(counts[item.timeline_disposition.disposition]||0)+1;
    const legacy=item.timeline_disposition.review_evidence.legacy_record;
    assert.equal(legacy.timeline_status,'excluded');
    assert.equal(legacy.activity_start,null);
    assert.equal(legacy.activity_end,null);
  }
  assert.deepEqual(counts,{legendary:70,mythical:14,chronology_unresolved:40});
});

function existingPerson(id,item) {
  return {
    id,
    canonical_key:item.canonical_name_en,
    person_type:item.person_type,
    historicity:item.historicity,
    names:[
      {locale:'en',name:item.canonical_name_en,name_type:'canonical',is_preferred:true},
      {locale:'ko',name:item.display_name_ko,name_type:'display',is_preferred:true}
    ],
    activity_count:0,
    timeline:null
  };
}

test('Unit 5 reconciliation plan is exactly 3 canonical reuses plus 121 creates on the reviewed baseline shape', () => {
  const parsed=reconcile.requireManifest(manifest);
  const byName=new Map(parsed.items.map((item)=>[item.canonical_name_en,item]));
  const state={
    persons:[
      existingPerson('f2eb1ca0-b37d-5497-a40d-a5df55ee8a2c',byName.get('Kupe')),
      existingPerson('5e80cd21-07a8-5f45-83eb-a08dc5c7e37f',byName.get('Hiawatha')),
      existingPerson('e0fe056b-3d54-4ccd-9ca1-c077c283a069',byName.get("Gush X'een")),
      {
        id:'11111111-1111-4111-8111-111111111111',
        canonical_key:'Existing Timeline Person',
        person_type:'historical',
        historicity:'historical',
        names:[{locale:'en',name:'Existing Timeline Person',name_type:'canonical',is_preferred:true}],
        activity_count:1,
        timeline:null
      }
    ],
    activity_total:1
  };
  const plan=reconcile.planReconciliation(state,parsed);
  assert.equal(plan.reused.length,3);
  assert.equal(plan.create.length,121);
  assert.deepEqual(
    plan.reused.map((entry)=>entry.item.canonical_name_en).sort(),
    ["Gush X'een",'Hiawatha','Kupe'].sort()
  );
});

test('Unit 5 reconciliation fails closed rather than merging an alias/name collision', () => {
  const parsed=reconcile.requireManifest(manifest);
  const dido=parsed.items.find((item)=>item.canonical_name_en==='Dido');
  const state={
    persons:[{
      id:'11111111-1111-4111-8111-111111111111',
      canonical_key:'Other Dido Identity',
      person_type:'historical',
      historicity:'historical',
      names:[
        {locale:'en',name:'Other Dido',name_type:'canonical',is_preferred:true},
        {locale:'en',name:dido.canonical_name_en,name_type:'alias',is_preferred:false}
      ],
      activity_count:1,
      timeline:null
    }],
    activity_total:1
  };
  assert.throws(
    ()=>reconcile.planReconciliation(state,parsed),
    /UNIT5_RECONCILIATION_EN_NAME_COLLISION:Dido/
  );
});
