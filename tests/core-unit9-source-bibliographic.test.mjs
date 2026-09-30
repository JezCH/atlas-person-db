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
