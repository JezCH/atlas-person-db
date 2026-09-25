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
  reason:'Provider access is blocked.',
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

test('new GitHub registrations reject NamuWiki review deferral',()=>{
  const result=validate({...candidate(),review_deferrals:{namuwiki:deferral}});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/review_deferrals\.namuwiki is retired/);
});

test('new registrations require an explicit linked or not_found decision',()=>{
  assert.notEqual(validate(candidate()).status,0);
  assert.equal(validate({...candidate(),external_references:{namuwiki:{status:'not_found',checked_at:'2026-09-26'}}}).status,0);
  assert.equal(validate({...candidate(),external_references:{namuwiki:{
    status:'linked',
    checked_at:'2026-09-26',
    document_title:'Example Person',
    url:'https://namu.wiki/w/Example%20Person'
  }}}).status,0);
});

test('a deferral cannot coexist with or replace an explicit reference decision',()=>{
  for(const reference of [
    {status:'unknown'},
    {status:'not_found',checked_at:'2026-09-26'},
    {status:'linked',checked_at:'2026-09-26',document_title:'Example Person',url:'https://namu.wiki/w/Example%20Person'}
  ]) {
    assert.notEqual(validate({...candidate(),external_references:{namuwiki:reference},review_deferrals:{namuwiki:deferral}}).status,0);
  }
});

test('legacy service compatibility may still reuse an already reviewed reference',async()=>{
  const existing={status:'linked',checked_at:'2026-08-21',document_title:'Existing Person',url:'https://namu.wiki/w/Existing%20Person'};
  const calls=[];
  const client={query:async(sql)=>{calls.push(sql);return{rows:[existing]};}};
  const result=await humanService.resolveNamuWikiReference(client,{requestId:'test:legacy-replay',person:{id:'11111111-1111-4111-8111-111111111111'},requested:null,allowLegacyNamuWikiOmission:true});
  assert.deepEqual(result,existing);
  assert.equal(calls.length,1);
  assert.doesNotMatch(calls[0],/^\s*(insert|update)\b/i);
});
