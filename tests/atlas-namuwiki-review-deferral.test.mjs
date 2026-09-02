import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import humanService from '../server/atlas-human-authoring-service.js';

const validator = fileURLToPath(new URL('../scripts/validate-authoring-request-files.mjs', import.meta.url));
const deferral = {
  reason_code:'provider_access_blocked',
  attempted_at:'2026-09-02',
  reason:'Provider access is blocked; user requested registration after the restriction was disclosed.',
  authorization:'user_requested_registration_after_disclosed_block'
};
function candidate() {
  return {
    schema:'atlas-human-authoring/v1', review_status:'approved',
    person:{canonical_name_en:'Example Person'},
    polity:{canonical_name_en:'Example Polity'},
    activity:{relation_type:'active_in',period_basis:'general_activity',start_year:1900,end_year:1901,start_certainty:'exact',end_certainty:'exact',confidence:'well_established'},
    sources:[{title:'Reviewed historical evidence'}]
  };
}
function validate(value) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'atlas-deferral-'));
  try {
    fs.mkdirSync(path.join(dir,'authoring','requests'),{recursive:true});
    fs.writeFileSync(path.join(dir,'authoring','requests','candidate.json'),JSON.stringify(value));
    return spawnSync(process.execPath,[validator,'authoring/requests/candidate.json'],{cwd:dir,encoding:'utf8'});
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
}
test('provider-block deferral validates without inventing a reference decision',()=>{
  const manifest={...candidate(),review_deferrals:{namuwiki:deferral}};
  const result=validate(manifest);
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/review deferred/);
  assert.equal(humanService.normalizeNamuWikiReference(manifest.external_references?.namuwiki,{allowLegacyOmission:true}),null);
  assert.throws(()=>humanService.normalizeNamuWikiReference(null,{allowLegacyOmission:false}),/NAMUWIKI_REQUIRED/);
});
test('bare omission and unsubstantiated deferrals fail closed',()=>{
  assert.notEqual(validate(candidate()).status,0);
  for(const key of ['reason_code','attempted_at','reason','authorization']) {
    const invalid={...deferral}; delete invalid[key];
    assert.notEqual(validate({...candidate(),review_deferrals:{namuwiki:invalid}}).status,0,key);
  }
  for(const change of [{reason_code:'not_searched'},{attempted_at:'2026-02-30'},{authorization:'assumed'}]) {
    assert.notEqual(validate({...candidate(),review_deferrals:{namuwiki:{...deferral,...change}}}).status,0);
  }
});
test('a pending review cannot disguise an unknown or conflicting reference',()=>{
  for(const reference of [{status:'unknown'},{status:'not_found',checked_at:'2026-09-02'}]) {
    assert.notEqual(validate({...candidate(),external_references:{namuwiki:reference},review_deferrals:{namuwiki:deferral}}).status,0);
  }
});
test('deferral keeps source and chronology gates',()=>{
  const manifest={...candidate(),review_deferrals:{namuwiki:deferral}};
  assert.notEqual(validate({...manifest,sources:[]}).status,0);
  assert.notEqual(validate({...manifest,activity:{...manifest.activity,start_year:0}}).status,0);
});
test('existing linked reference is reused and not downgraded by omitted input',async()=>{
  const existing={status:'linked',checked_at:'2026-08-21',document_title:'Existing Person',url:'https://namu.wiki/w/Existing%20Person'};
  const calls=[];
  const client={query:async(sql)=>{calls.push(sql);return{rows:[existing]};}};
  const result=await humanService.resolveNamuWikiReference(client,{requestId:'test:deferred',person:{id:'11111111-1111-4111-8111-111111111111'},requested:null,allowLegacyNamuWikiOmission:true});
  assert.deepEqual(result,existing);
  assert.equal(calls.length,1);
  assert.doesNotMatch(calls[0],/^\s*(insert|update)\b/i);
});
