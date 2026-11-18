import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const source=require('../server/atlas-source-service.js');

const ID='11111111-1111-4111-8111-111111111111';

test('Unit 9 canonical Source writer owns bibliographic normalization and reusable identity', async()=>{
  const normalized=source.normalizeBibliographicSource({
    title:'  A   History  ',
    canonical_url:'https://example.org/book#chapter',
    author_creator:'Historian',
    institution:'Archive',
    publisher:'Press',
    publication_year:-44,
    external_identifier:'isbn:test',
    citation_metadata:{edition:'2'},
    artifact_metadata:{kind:'scan'}
  });
  assert.equal(normalized.title,'A History');
  assert.equal(normalized.canonical_url,'https://example.org/book');
  assert.equal(normalized.publication_year,-44);
  assert.equal(normalized.author_creator,'Historian');
  assert.deepEqual(normalized.citation_metadata,{edition:'2'});
});

test('Unit 9 canonical Source writer preserves explicit UUID for reviewed assertion creation', async()=>{
  const calls=[];
  const client={async query(sql,params){calls.push({sql:String(sql),params}); return {rows:[],rowCount:/insert into atlas_v2\.sources/i.test(String(sql))?1:0};}};
  const result=await source.insertExactSource(client,{
    id:ID,source_key:'reviewed:test',source_type:'web_bibliographic_reference',title:'Reviewed',
    canonical_url:'https://example.org/reviewed',citation_text:'Reviewed citation'
  });
  assert.equal(result.id,ID);
  assert.ok(calls.some((call)=>/insert into atlas_v2\.sources/i.test(call.sql)));
});

test('Unit 9 canonical writer performs guarded citation rewrite without changing Source identity', async()=>{
  const client={async query(sql,params){
    assert.match(String(sql),/update atlas_v2\.sources/i);
    assert.deepEqual(params,['new citation',ID,'https://example.org/book','old citation']);
    return {rowCount:1,rows:[{id:ID,canonical_url:'https://example.org/book',citation_text:'new citation'}]};
  }};
  const result=await source.rewriteSourceCitation(client,{source_id:ID,expected_canonical_url:'https://example.org/book',expected_citation_text:'old citation',replacement_citation_text:'new citation'});
  assert.equal(result.id,ID);
  assert.equal(result.citation_text,'new citation');
});

test('Unit 9 migration extends existing Source rows in place rather than replacing Source identity',()=>{
  const sql=fs.readFileSync(new URL('../db/migrations/20260930_source_bibliographic_completion.sql',import.meta.url),'utf8');
  assert.match(sql,/ALTER TABLE atlas_v2\.sources/i);
  assert.match(sql,/ADD COLUMN IF NOT EXISTS author_creator text/i);
  assert.match(sql,/ADD COLUMN IF NOT EXISTS publication_year integer/i);
  assert.match(sql,/ADD COLUMN IF NOT EXISTS citation_metadata jsonb/i);
  assert.doesNotMatch(sql,/CREATE TABLE[^;]*atlas_v2\.sources/i);
  assert.doesNotMatch(sql,/UPDATE\s+atlas_v2\.sources\s+SET\s+id/i);
});

test('Unit 9 executable Source mutations are centralized in atlas-source-service',()=>{
  const paths=[
    '../server/atlas-authoring-object-service.js',
    '../server/atlas-human-authoring-service.js',
    '../server/atlas-correction-v2-stage2-assertions.js',
    '../server/atlas-correction-source-citation-v2-service.js'
  ];
  for(const path of paths){
    const body=fs.readFileSync(new URL(path,import.meta.url),'utf8');
    assert.doesNotMatch(body,/insert\s+into\s+atlas_v2\.sources/i,path);
    assert.doesNotMatch(body,/update\s+atlas_v2\.sources/i,path);
  }
});


test("reviewed Human Authoring refuses URL reuse when activity-specific title or assertion differs", async () => {
  const existing = {
    id:ID, source_key:"human-authoring:previous:1",
    source_type:"web_bibliographic_reference",
    title:"The Royal Family — Edward VIII (Jan–Dec 1936)",
    citation_text:"King's 1936 reign; notes later governor appointment"
  };
  const calls = [];
  const client = {async query(sql, params) {
    calls.push({sql:String(sql),params});
    if (/from atlas_v2\.sources/i.test(sql)) {
      assert.match(String(sql),/source_type,title,citation_text/);
      return {rowCount:1,rows:[existing]};
    }
    throw Error("WRITES_NOT_ALLOWED");
  }};
  const request = {source_type:existing.source_type,
    canonical_url:"https://www.royal.uk/edward-viii",
    title:"The Royal Family — Edward VIII",citation_text:"Governor of the Bahamas 1940–1945"};
  await assert.rejects(source.createSource(client,request,{
    lock:false,keyCollision:"error",urlReuseEvidence:"exact"
  }),/SOURCE_CANONICAL_URL_ASSERTION_COLLISION_REVIEW_REQUIRED/);
  await assert.rejects(source.createSource(client,{...request,title:existing.title},{
    lock:false,keyCollision:"error",urlReuseEvidence:"exact"
  }),/SOURCE_CANONICAL_URL_ASSERTION_COLLISION_REVIEW_REQUIRED/);
  assert.equal(calls.length,2);
  assert.ok(calls.every(x=>/select/i.test(x.sql)));
});

test("exact URL reuse preserves Source identity only for the same normalized reviewed assertion",async()=>{
  const row={id:ID,source_key:"known",source_type:"web_bibliographic_reference",
    title:"Archive Biography",citation_text:"Same reviewed historical assertion"};
  let reads=0;
  const client={async query(sql){reads++;assert.match(String(sql),/from atlas_v2\.sources/);return {rows:[row],rowCount:1}}};
  const result=await source.createSource(client,{
    title:" Archive Biography ",canonical_url:"https://example.org/known#part",
    citation_text:" Same reviewed historical assertion ",
    source_type:"web_bibliographic_reference"
  },{lock:false,urlReuseEvidence:"exact"});
  assert.equal(result.id,ID);assert.equal(result.replay,true);assert.equal(reads,1);
  await assert.rejects(source.createSource(client,{title:"Archive Biography",canonical_url:"https://example.org/known"},{
    lock:false,urlReuseEvidence:"invalid"
  }),/SOURCE_URL_REUSE_EVIDENCE_MODE_INVALID/);
});

test("legacy URL reuse remains compatible while reviewed Person writer explicitly opts into strict assertion parity",async()=>{
  const row={id:ID,source_key:"known",source_type:"web_bibliographic_reference",
    title:"Earlier Title",citation_text:"Earlier specific assertion"};
  const client={async query(){return {rowCount:1,rows:[row]}}};
  const legacy=await source.createSource(client,{
    canonical_url:"https://example.org/known",title:"Another Title",citation_text:"Another claim"
  },{lock:false});
  assert.equal(legacy.id,ID);
  const human=fs.readFileSync(new URL("../server/atlas-human-authoring-service.js",import.meta.url),"utf8");
  assert.match(human,/keyCollision:"error", urlReuseEvidence:"exact"/);
  assert.match(human,/HUMAN_AUTHORING_SOURCE_CANONICAL_URL_ASSERTION_COLLISION/);
});
