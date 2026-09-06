import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const objects = require('../server/atlas-authoring-object-service.js');
const { createAuthoringObjectService } = require('../server/atlas-authoring-object-transaction.js');
const { AUTHORING_OBJECT_OPERATIONS } = require('../server/atlas-identity-handler.js');

const SOURCE_ID='11111111-1111-4111-8111-111111111111';
const PLACE_ID='22222222-2222-4222-8222-222222222222';

test('independent bibliographic Source reuses an existing canonical URL identity', async () => {
  const calls=[];
  const client={async query(sql,params){
    calls.push({sql:String(sql),params});
    if (/where canonical_url=\$1/i.test(String(sql))) return {rows:[{id:SOURCE_ID,source_key:'existing-source'}]};
    return {rows:[]};
  }};
  const result=await objects.createSource(client,{title:'Existing source',canonical_url:'https://example.org/book#section'});
  assert.equal(result.entity,'source');
  assert.equal(result.id,SOURCE_ID);
  assert.equal(result.source_key,'existing-source');
  assert.equal(result.replay,true);
  const urlCall=calls.find((call)=>/where canonical_url=\$1/i.test(call.sql));
  assert.equal(urlCall.params[0],'https://example.org/book');
});

test('independent Source requires a stable key when no canonical URL exists', async () => {
  await assert.rejects(()=>objects.createSource({query:async()=>({rows:[]})},{title:'Printed book'}),/source_key is required/);
});

test('first-class Place requires normalized Source provenance and persists UUID identity separately from names', async () => {
  const calls=[];
  const client={async query(sql,params){
    const text=String(sql);calls.push({sql:text,params});
    if (/from atlas_v2\.sources where id=\$1::uuid/i.test(text)) return {rows:[{id:SOURCE_ID}]};
    if (/where p\.canonical_key=\$1/i.test(text)) return {rows:[]};
    if (/insert into atlas_v2\.places/i.test(text)) return {rows:[{id:PLACE_ID}],rowCount:1};
    if (/insert into atlas_v2\.place_sources/i.test(text)) return {rows:[],rowCount:1};
    return {rows:[],rowCount:1};
  }};
  const result=await objects.createPlace(client,{
    canonical_key:'rome-italy',
    canonical_name_en:'Rome',
    display_name_ko:'로마',
    source_links:[{source_id:SOURCE_ID,source_locator_key:'place identity'}]
  });
  assert.equal(result.entity,'place');
  assert.equal(result.id,PLACE_ID);
  assert.equal(result.canonical_key,'rome-italy');
  assert.equal(result.replay,false);
  assert.ok(calls.some((call)=>/insert into atlas_v2\.place_names/i.test(call.sql)));
  assert.ok(calls.some((call)=>/insert into atlas_v2\.place_sources/i.test(call.sql)));
});

test('Place authoring rejects missing or unresolved provenance', async () => {
  await assert.rejects(()=>objects.createPlace({query:async()=>({rows:[]})},{
    canonical_key:'rome-italy',canonical_name_en:'Rome',display_name_ko:'로마',source_links:[]
  }),/PLACE_SOURCE_LINKS_REQUIRED/);

  const client={async query(sql){
    if (/pg_advisory_xact_lock/i.test(String(sql))) return {rows:[]};
    return {rows:[]};
  }};
  await assert.rejects(()=>objects.createPlace(client,{
    canonical_key:'rome-italy',canonical_name_en:'Rome',display_name_ko:'로마',
    source_links:[{source_id:SOURCE_ID,source_locator_key:'place identity'}]
  }),/PLACE_SOURCE_ID_UNRESOLVED/);
});

test('Source and Place are exposed through the existing governed identity mutation surface', async () => {
  assert.deepEqual([...AUTHORING_OBJECT_OPERATIONS].sort(),['create_place','create_source']);
  const calls=[];
  const client={async query(sql,params){
    calls.push(String(sql));
    if (/where canonical_url=\$1/i.test(String(sql))) return {rows:[{id:SOURCE_ID,source_key:'existing-source'}]};
    return {rows:[]};
  }};
  const service=createAuthoringObjectService({client});
  const result=await service.mutate('create_source',{title:'Existing source',canonical_url:'https://example.org/book'});
  assert.equal(result.marker,'ATLAS_AUTHORING_OBJECT_V1');
  assert.equal(result.committed,true);
  assert.ok(calls.some((sql)=>/^begin isolation level serializable$/i.test(sql)));
  assert.ok(calls.some((sql)=>/^commit$/i.test(sql)));
});

test('P13 Place migration creates UUID object/name/provenance tables without copying spatial presentation fields', () => {
  const sql=fs.readFileSync(new URL('../db/migrations/20260906_p13_source_place_objects.sql',import.meta.url),'utf8');
  assert.match(sql,/CREATE TABLE IF NOT EXISTS atlas_v2\.places/i);
  assert.match(sql,/id uuid PRIMARY KEY DEFAULT gen_random_uuid\(\)/i);
  assert.match(sql,/canonical_key text NOT NULL UNIQUE/i);
  assert.match(sql,/CREATE TABLE IF NOT EXISTS atlas_v2\.place_names/i);
  assert.match(sql,/CREATE TABLE IF NOT EXISTS atlas_v2\.place_sources/i);
  assert.match(sql,/REFERENCES atlas_v2\.sources\(id\) ON DELETE RESTRICT/i);
  assert.doesNotMatch(sql,/world_x|display_anchor|macroregion_code|subregion_code/i);
});
