import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {normalizeContextObject,createContextObject}=require('../server/atlas-context-object-service.js');
const {AUTHORING_OBJECT_OPERATIONS}=require('../server/atlas-identity-handler.js');

const source='11111111-1111-4111-8111-111111111111';
const base={canonical_key:'example',canonical_name_en:'Example',display_name_ko:'예시',historicity:'historical',sources:[{source_id:source,source_locator_key:'p.1'}]};

test('Unit 12 exposes context authoring through the canonical authoring object endpoint',()=>{
 for(const op of ['create_context_object','link_person_context','link_polity_governance_context']) assert.equal(AUTHORING_OBJECT_OPERATIONS.has(op),true);
});
test('Unit 12 has explicit non-Polity context object types',()=>{
 for(const [kind,type] of [['people_group','ethnic_group'],['historical_event','political_event'],['governance_context','government']]){
  assert.equal(normalizeContextObject({...base,kind,type}).kind,kind);
 }
});
test('Unit 12 context objects require provenance and reject Polity as a context kind',()=>{
 assert.throws(()=>normalizeContextObject({...base,kind:'polity',type:'historical_polity'}),/KIND_INVALID/);
 assert.throws(()=>normalizeContextObject({...base,kind:'people_group',type:'ethnic_group',sources:[]}),/SOURCE_REQUIRED/);
});
test('Unit 12 writer reuses exact canonical identity and fails closed on type conflict',async()=>{
 const queries=[];const client={query:async(sql,args)=>{queries.push(sql);if(/from atlas_v2\.sources/.test(sql))return{rows:[{id:source}]};if(/from atlas_v2\.people_groups where canonical_key/.test(sql))return{rows:[{id:'22222222-2222-4222-8222-222222222222',entity_type:'ethnic_group',historicity:'historical'}]};return{rows:[],rowCount:0}}};
 const out=await createContextObject(client,{...base,kind:'people_group',type:'ethnic_group'});assert.equal(out.disposition,'reused');assert.equal(queries.some(q=>/insert into atlas_v2\.polities/i.test(q)),false);
 await assert.rejects(()=>createContextObject(client,{...base,kind:'people_group',type:'cultural_people'}),/CANONICAL_KEY_CONFLICT/);
});
test('Unit 12 writer targets the existing Stage 2 schema for all three context identities and Person link surfaces',()=>{
 const entitySql=fs.readFileSync(new URL('../db/proposals/stage2_entity_boundaries.rehearsal.sql',import.meta.url),'utf8');
 const semanticSql=fs.readFileSync(new URL('../db/proposals/stage2_semantic_extensions.rehearsal.sql',import.meta.url),'utf8');
 assert.match(semanticSql,/CREATE TABLE atlas_v2\.governance_contexts/i);
 for(const table of ['people_groups','historical_events','person_people_affiliations','person_event_participations']) assert.match(entitySql,new RegExp('CREATE TABLE atlas_v2\\.'+table,'i'));
 assert.doesNotMatch(entitySql,/insert into atlas_v2\.polities/i);
});
