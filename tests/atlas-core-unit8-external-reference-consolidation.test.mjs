import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const external=require('../server/atlas-external-reference-service.js');
const profile=require('../server/atlas-person-profile-service.js');
const human=require('../server/atlas-human-authoring-service.js');

test('Unit 8 canonical NamuWiki normalizer is shared by profile and Human Authoring adapters', () => {
  const decision={ status:'linked', checked_at:'2026-09-30', document_title:'임호텝', url:'https://namu.wiki/w/%EC%9E%84%ED%98%B8%ED%85%9D?from=x#s-1' };
  const canonical=external.normalizeNamuWikiDecision(decision,{checkedAtRequired:true});
  const fromHuman=human.normalizeNamuWikiReference(decision,{allowLegacyOmission:false});
  const fromProfile=profile.normalizeNamuWikiInput(decision);
  assert.equal(canonical.url,'https://namu.wiki/w/%EC%9E%84%ED%98%B8%ED%85%9D');
  assert.deepEqual(fromHuman,{status:canonical.status,checked_at:canonical.checked_at,document_title:canonical.document_title,url:canonical.url,review_state:'reviewed',review_reason:null});
  assert.deepEqual(fromProfile,{provider:'namuwiki',status:canonical.status,document_title:canonical.document_title,url:canonical.url});
});

test('Unit 8 canonical writer owns the only executable person_external_references mutation SQL', async () => {
  const fs=require('node:fs');
  const files=['../server/atlas-external-reference-service.js','../server/atlas-person-profile-service.js','../server/atlas-human-authoring-service.js'];
  const texts=files.map((p)=>fs.readFileSync(new URL(p,import.meta.url),'utf8'));
  assert.match(texts[0],/insert into atlas_v2\.person_external_references/);
  assert.doesNotMatch(texts[1],/(insert into|update) atlas_v2\.person_external_references/);
  assert.doesNotMatch(texts[2],/(insert into|update) atlas_v2\.person_external_references/);
});

test('Unit 8 keeps reviewed not_found explicit and rejects linked overwrite under review protection', async () => {
  const queries=[];
  const client={ async query(sql,args){
    queries.push({sql,args});
    if (String(sql).includes('from atlas_v2.person_external_references')) return {rows:[{provider:'namuwiki',status:'linked',checked_at:'2026-09-01',document_title:'A',url:'https://namu.wiki/w/A',updated_at:null}]};
    throw new Error('unexpected mutation');
  }};
  await assert.rejects(
    ()=>external.setNamuWikiDecision(client,'00000000-0000-4000-8000-000000000001',
      {status:'not_found',checked_at:'2026-09-30'},
      {checkedAtRequired:true,preventLinkedOverwrite:true}),
    /EXTERNAL_REFERENCE_OVERWRITE_REVIEW_REQUIRED/
  );
  assert.equal(queries.length,1);
  assert.deepEqual(external.normalizeNamuWikiDecision({status:'not_found',checked_at:'2026-09-30'},{checkedAtRequired:true}),{
    provider:'namuwiki',status:'not_found',checked_at:'2026-09-30',document_title:null,url:null,review_state:'reviewed_absent',review_reason:null
  });
});


test('Unit 8 retires Person-ID NamuWiki registries and reads review state from the canonical row', () => {
  const fs=require('node:fs');
  assert.equal(fs.existsSync(new URL('../data/namuwiki-reviewed-not-found-backfill.v1.json',import.meta.url)),false);
  assert.equal(fs.existsSync(new URL('../data/namuwiki-reviewed-not-found-reasons.v1.json',import.meta.url)),false);
  assert.equal(fs.existsSync(new URL('../server/atlas-namuwiki-review-state.js',import.meta.url)),false);
  const read=fs.readFileSync(new URL('../server/atlas-person-read-service.js',import.meta.url),'utf8');
  assert.match(read,/'review_state', per\.review_state/);
  assert.match(read,/'review_reason', per\.review_reason/);
  assert.doesNotMatch(read,/person_profile_mutation_audits|namuwiki-reviewed-not-found/);
});

test('Unit 8 migration preserves legacy review evidence before duplicate registries disappear', () => {
  const fs=require('node:fs');
  const migration=fs.readFileSync(new URL('../db/migrations/20260930_external_reference_decision_state.sql',import.meta.url),'utf8');
  assert.match(migration,/ADD COLUMN IF NOT EXISTS review_state text/);
  assert.match(migration,/ADD COLUMN IF NOT EXISTS review_reason text/);
  assert.match(migration,/review_state='reviewed_absent'/);
  assert.match(migration,/review_state='legacy_unverified'/);
  assert.match(migration,/person_profile_mutation_audits/);
  assert.match(migration,/exact_target_url_verified/);
});


test('Unit 8 canonical writer persists reviewed-absence state and reason instead of hard-coding reviewed', async () => {
  const personId='00000000-0000-4000-8000-000000000001';
  let mutation=null;
  const client={ async query(sql,args){
    const text=String(sql);
    if (text.includes('from atlas_v2.person_external_references')) return {rows:[]};
    if (text.includes('insert into atlas_v2.person_external_references')) {
      mutation={sql:text,args};
      return {rows:[{
        status:args[1],
        checked_at:args[2],
        document_title:args[3],
        url:args[4],
        review_state:args[5],
        review_reason:args[6],
        updated_at:null
      }]};
    }
    throw new Error('unexpected query');
  }};
  const result=await external.setNamuWikiDecision(client,personId,{
    status:'not_found',
    checked_at:'2026-09-30',
    review_reason:'no_exact_document'
  },{checkedAtRequired:true});
  assert.equal(result.replay,false);
  assert.ok(mutation);
  assert.match(mutation.sql,/\$6,\$7,now\(\)/);
  assert.deepEqual(mutation.args,[
    personId,
    'not_found',
    '2026-09-30',
    null,
    null,
    'reviewed_absent',
    'no_exact_document'
  ]);
  assert.equal(result.after.review_state,'reviewed_absent');
  assert.equal(result.after.review_reason,'no_exact_document');
});

test('Unit 8 pre-decision external-reference migrations remain replay-safe after review_state becomes NOT NULL', () => {
  const fs=require('node:fs');
  const base=fs.readFileSync(new URL('../db/migrations/20260821_person_external_references.sql',import.meta.url),'utf8');
  const sync=fs.readFileSync(new URL('../db/migrations/20260821_human_authoring_external_reference_sync.sql',import.meta.url),'utf8');
  assert.match(base,/ADD COLUMN IF NOT EXISTS review_state text/);
  assert.match(base,/document_title, url, review_state, review_reason/);
  assert.match(base,/'reviewed', NULL/);
  assert.match(sync,/ref_review_state text/);
  assert.match(sync,/ref_review_reason text/);
  assert.match(sync,/review_state\s*=\s*EXCLUDED\.review_state/);
  assert.match(sync,/review_reason\s*=\s*EXCLUDED\.review_reason/);
  assert.match(sync,/review_state,\s*review_reason/);
});


test('Unit 8 migration restores classified reason rows that are missing from the live reference table', () => {
  const fs=require('node:fs');
  const migration=fs.readFileSync(new URL('../db/migrations/20260930_external_reference_decision_state.sql',import.meta.url),'utf8');
  const classified=[...migration.matchAll(/\('([0-9a-f-]{36})'::uuid,'(no_exact_document|related_or_derivative_only|exact_target_url_pending|exact_target_url_verified)'\)/g)];
  assert.equal(classified.length,616);
  assert.match(migration,/insert_missing_reason_rows AS/i);
  assert.match(migration,/INSERT INTO atlas_v2\.person_external_references\([\s\S]*review_state,review_reason/);
  assert.match(migration,/DATE '2026-09-30'/);
  assert.match(migration,/'reviewed_absent'/);
  assert.match(migration,/WHERE NOT EXISTS \([\s\S]*provider='namuwiki'/i);
  assert.match(migration,/SET review_state='reviewed_absent',[\s\S]*review_reason=r\.review_reason/);
});
