import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const timeline=require('../server/atlas-person-timeline-service.js');
const reconcile=require('../server/atlas-core-unit5-reconciliation-service.js');
const profile=require('../server/atlas-person-profile-service.js');
const unit5Handler=require('../server/atlas-core-unit5-reconciliation-handler.js');
const oidc=require('../server/atlas-github-oidc.js');

const root=path.resolve(new URL('..',import.meta.url).pathname);
const manifest=JSON.parse(fs.readFileSync(
  path.join(root,'data/migrations/core-v2-unit5-non-timeline-canonicalization.v1.json'),
  'utf8'
));

test('timeline disposition comparison ignores JSON object key order while preserving nested values', () => {
  const left={
    person_id:'00000000-0000-4000-8000-000000000001',
    disposition:'chronology_unresolved',
    reason:'reviewed chronology gap',
    basis_code:'reviewed_basis',
    traditional_year:null,
    traditional_year_alternative:null,
    review_evidence:{
      authority_scope:'timeline_disposition_review_evidence_only',
      sources:['source-a','source-b'],
      nested:{ alpha:1, beta:2 }
    }
  };
  const right={
    person_id:left.person_id,
    disposition:left.disposition,
    reason:left.reason,
    basis_code:left.basis_code,
    traditional_year:null,
    traditional_year_alternative:null,
    review_evidence:{
      nested:{ beta:2, alpha:1 },
      sources:['source-a','source-b'],
      authority_scope:'timeline_disposition_review_evidence_only'
    }
  };
  assert.equal(timeline.sameTimelineDisposition(left,right),true);
  assert.equal(timeline.sameTimelineDisposition(left,{
    ...right,
    review_evidence:{...right.review_evidence,nested:{beta:3,alpha:1}}
  }),false);
});

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


test('Unit 5 owner-comment dispatch is allowed only inside the same production OIDC policy', () => {
  assert.equal(unit5Handler.OIDC_POLICY.allowedEvents.has('issue_comment'),true);
  assert.equal(unit5Handler.OIDC_POLICY.allowedEvents.has('schedule'),true);
  assert.equal(unit5Handler.OIDC_POLICY.allowedEvents.has('pull_request_target'),true);
  assert.equal(unit5Handler.OIDC_POLICY.allowedEvents.has('pull_request'),false);
});

test('Unit 5 OIDC policy-only verifier keeps repository/ref/workflow/environment trust without coupling to deployment SHA', () => {
  const policy=unit5Handler.OIDC_POLICY;
  const payload={
    iss:oidc.ISSUER,
    aud:[unit5Handler.AUDIENCE],
    repository:'JezCH/atlas-person-db',
    repository_id:'1319427399',
    ref:'refs/heads/main',
    workflow_ref:'JezCH/atlas-person-db/.github/workflows/atlas-core-unit5-reconcile.yml@refs/heads/main',
    environment:'production',
    event_name:'push',
    sha:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  };
  assert.doesNotThrow(()=>oidc.verifyTrustClaimsWithPolicyOnly(payload,policy));
  assert.throws(
    ()=>oidc.verifyTrustClaimsWithPolicyOnly({...payload,workflow_ref:'JezCH/atlas-person-db/.github/workflows/other.yml@refs/heads/main'},policy),
    /GITHUB_OIDC_WORKFLOW_MISMATCH/
  );
});

test('Unit 5 handler binds the request workflow SHA to OIDC claims while allowing a newer Production main SHA', async () => {
  const workflowSha='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const runtimeSha='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  let verified=false;
  const handler=unit5Handler.createUnit5ReconciliationHandler({
    env:{
      VERCEL_ENV:'production',
      VERCEL_GIT_COMMIT_REF:'main',
      VERCEL_GIT_COMMIT_SHA:runtimeSha,
      SUPABASE_DB_URL:''
    },
    verifyOidc:async (_token,{policy})=>{
      verified=true;
      assert.equal(policy,unit5Handler.OIDC_POLICY);
      return {sha:workflowSha};
    },
    clientFactory:async()=>{ throw new Error('client must not be reached'); },
    applyMigrations:async()=>{ throw new Error('migrations must not be reached'); }
  });
  let body=null;
  const res={
    statusCode:0,
    headers:{},
    setHeader(name,value){ this.headers[name]=value; },
    end(value){ body=JSON.parse(value); }
  };
  await handler({
    method:'POST',
    headers:{authorization:'Bearer unit-test-token'},
    body:{workflow_sha:workflowSha,dry_run:true,manifest}
  },res);
  assert.equal(verified,true);
  assert.equal(res.statusCode,503);
  assert.equal(body.code,'SUPABASE_DB_URL_REQUIRED');
  assert.equal(body.runtime_sha,undefined);
});

test('Unit 5 handler rejects a workflow_sha that does not match the signed OIDC claim', async () => {
  const workflowSha='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const handler=unit5Handler.createUnit5ReconciliationHandler({
    env:{
      VERCEL_ENV:'production',
      VERCEL_GIT_COMMIT_REF:'main',
      VERCEL_GIT_COMMIT_SHA:'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      SUPABASE_DB_URL:'postgresql://example.invalid/db'
    },
    verifyOidc:async()=>({sha:'cccccccccccccccccccccccccccccccccccccccc'}),
    clientFactory:async()=>{ throw new Error('client must not be reached'); }
  });
  let body=null;
  const res={
    statusCode:0,
    headers:{},
    setHeader(name,value){ this.headers[name]=value; },
    end(value){ body=JSON.parse(value); }
  };
  await handler({
    method:'POST',
    headers:{authorization:'Bearer unit-test-token'},
    body:{workflow_sha:workflowSha,dry_run:true,manifest}
  },res);
  assert.equal(res.statusCode,403);
  assert.equal(body.code,'GITHUB_OIDC_SHA_MISMATCH');
});
