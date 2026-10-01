import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {normalizeReviewRevision,recordReviewRevision,queueApprovedRevision,setRegistrationState}=require('../server/atlas-reviewed-candidate-service.js');

const approved={candidate_id:'candidate-1',revision:1,review_state:'APPROVED',review_checkpoint:'#1374 comment 123',reviewed_payload:{name:'Example',facts:{year:100}},human_authorized:true};

test('Unit 13 refuses AI/unattested APPROVED state',()=>{
 assert.throws(()=>normalizeReviewRevision({...approved,human_authorized:false}),/REQUIRES_HUMAN_AUTHORIZATION/);
 assert.equal(normalizeReviewRevision(approved).review_state,'APPROVED');
});
test('Unit 13 makes review revisions immutable and replay-safe',async()=>{
 const stored=normalizeReviewRevision(approved);const client={query:async(sql)=>/from atlas_v2\.person_candidate_review_revisions/i.test(sql)?{rowCount:1,rows:[stored]}:{rowCount:0,rows:[]}};
 assert.equal((await recordReviewRevision(client,approved)).replay,true);
 await assert.rejects(()=>recordReviewRevision(client,{...approved,review_checkpoint:'#1374 comment changed'}),/REVIEW_REVISION_IMMUTABLE/);
});
test('Unit 13 Lane B queues only an exact human-approved revision',async()=>{
 const calls=[];const client={query:async(sql,args)=>{calls.push({sql,args});if(/from atlas_v2\.person_candidate_review_revisions/i.test(sql))return{rowCount:1,rows:[{review_state:'APPROVED',human_authorized:true}]};if(/from atlas_v2\.person_candidate_registration_states/i.test(sql))return{rowCount:0,rows:[]};return{rowCount:1,rows:[]}}};
 const out=await queueApprovedRevision(client,{candidate_id:'candidate-1',review_revision:1});assert.equal(out.registration_state,'QUEUED');assert.ok(calls.some(x=>/person_candidate_registration_states/.test(x.sql)));
});
test('Unit 13 blocks authoritative registration states for non-approved revisions',async()=>{
 const client={query:async(sql)=>/from atlas_v2\.person_candidate_review_revisions/i.test(sql)?{rowCount:1,rows:[{review_state:'HOLD',human_authorized:false}]}:{rowCount:1,rows:[]}};
 await assert.rejects(()=>setRegistrationState(client,{candidate_id:'candidate-1',review_revision:1,registration_state:'REGISTERED'}),/REQUIRES_HUMAN_APPROVED_REVISION/);
});
test('Unit 13 schema keeps review and registration as independent state axes',()=>{
 const sql=fs.readFileSync(new URL('../db/migrations/20260930_reviewed_candidate_boundary.sql',import.meta.url),'utf8');
 assert.match(sql,/CREATE TABLE IF NOT EXISTS atlas_v2\.person_candidate_review_revisions/i);
 assert.match(sql,/CREATE TABLE IF NOT EXISTS atlas_v2\.person_candidate_registration_states/i);
 assert.match(sql,/FOREIGN KEY\(candidate_id,review_revision\)/i);
 assert.match(sql,/review_state <> 'APPROVED' OR human_authorized = true/i);
});
