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
  assert.deepEqual([...AUTHORING_OBJECT_OPERATIONS].sort(),['assert_place','create_context_object','create_place','create_polity_place_function','create_source','link_person_context','link_polity_governance_context']);
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

function exactPlacePayload() {
  return {id:PLACE_ID,canonical_key:'rome',canonical_name_en:'Rome',
    source_links:[{source_id:SOURCE_ID,source_locator_key:'reviewed place identity'}]};
}

function exactPlaceClient({existing=null, unresolvedSource=false, sourceWriteError=false}={}) {
  const calls=[];
  return {calls,async query(sql,params){
    const text=String(sql);calls.push({sql:text,params});
    if (text.includes('from atlas_v2.sources')) return {rows:unresolvedSource?[]:[{id:SOURCE_ID}]};
    if (text.includes('where p.id=') || text.includes('where p.canonical_key=')) return {rows:existing?[existing]:[]};
    if (text.includes('insert into atlas_v2.place_sources')) {
      if (sourceWriteError) throw Error('fixture source-link failure');
      return {rows:[],rowCount:existing?0:1};
    }
    return {rows:[],rowCount:1};
  }};
}

test('exact Place transport preserves the reviewed UUID and English name without inventing Korean names',async()=>{
  const client=exactPlaceClient();
  const result=await createAuthoringObjectService({client}).mutate('assert_place',exactPlacePayload());
  assert.equal(result.id,PLACE_ID);
  assert.equal(result.operation,'assert_place');
  assert.equal(result.committed,true);
  const inserted=client.calls.find(c=>c.sql.includes('insert into atlas_v2.places('));
  assert.deepEqual(inserted.params,[PLACE_ID,'rome','historical_place','historical']);
  const name=client.calls.find(c=>c.sql.includes('insert into atlas_v2.place_names('));
  assert.deepEqual(name.params,[PLACE_ID,'Rome']);
  assert.doesNotMatch(name.sql,/'ko'/);
  assert.equal(client.calls[0].sql,'begin isolation level serializable');
  assert.equal(client.calls.at(-1).sql,'commit');
});

test('exact Place replay keeps identity and does not insert another Place',async()=>{
  const client=exactPlaceClient({existing:{id:PLACE_ID,canonical_key:'rome',place_type:'historical_place',historicity:'historical',canonical_name_en:'Rome'}});
  const result=await createAuthoringObjectService({client}).mutate('assert_place',exactPlacePayload());
  assert.equal(result.id,PLACE_ID);
  assert.equal(result.replay,true);
  assert.equal(result.added_source_links,0);
  assert.ok(!client.calls.some(c=>c.sql.includes('insert into atlas_v2.places(')));
  assert.equal(client.calls.at(-1).sql,'commit');
});

test('exact Place transport rolls back identity, provenance and partial-write failures',async()=>{
  const exact={id:PLACE_ID,canonical_key:'rome',place_type:'historical_place',historicity:'historical',canonical_name_en:'Rome'};
  const cases=[
    [{existing:{...exact,id:SOURCE_ID}},/PLACE_EXACT_IDENTITY_CONFLICT/],
    [{existing:{...exact,canonical_name_en:'Different place'}},/PLACE_EXACT_IDENTITY_CONFLICT/],
    [{unresolvedSource:true},/PLACE_SOURCE_ID_UNRESOLVED/],
    [{sourceWriteError:true},/fixture source-link failure/]
  ];
  for (const [options,error] of cases) {
    const client=exactPlaceClient(options);
    await assert.rejects(()=>createAuthoringObjectService({client}).mutate('assert_place',exactPlacePayload()),error);
    assert.equal(client.calls.at(-1).sql,'rollback');
    assert.ok(!client.calls.some(c=>c.sql==='commit'));
  }
});

test('exact Place transport refuses invalid UUID and missing provenance before any write',async()=>{
  for (const [payload,error] of [
    [{...exactPlacePayload(),id:'not-a-uuid'},/place.id must be a UUID/],
    [{...exactPlacePayload(),source_links:[]},/PLACE_SOURCE_LINKS_REQUIRED/]
  ]) {
    const client=exactPlaceClient();
    await assert.rejects(()=>createAuthoringObjectService({client}).mutate('assert_place',payload),error);
    assert.deepEqual(client.calls.map(c=>c.sql),['begin isolation level serializable','rollback']);
  }
});

test('exact Place handler requires authorization and routes an authorized request to the exact writer',async()=>{
  const {createIdentityHandler}=require('../server/atlas-identity-handler.js');
  for (const authorized of [false,true]) {
    const client=exactPlaceClient();
    let connections=0,closed=0;
    client.end=async()=>{closed++};
    const handler=createIdentityHandler({env:{SUPABASE_DB_URL:'postgresql://example.invalid/db',ATLAS_MUTATION_TOKEN:'fixture-secret'},clientFactory:async()=>{connections++;return client}});
    const res={statusCode:0,setHeader(){},end(body){this.body=JSON.parse(body)}};
    await handler({method:'POST',headers:authorized?{authorization:'Bearer fixture-secret'}:{},body:{operation:'assert_place',payload:exactPlacePayload()}},res);
    assert.equal(res.statusCode,authorized?200:401);
    assert.equal(connections,authorized?1:0);
    assert.equal(closed,authorized?1:0);
    if(authorized) assert.equal(res.body.outcome.id,PLACE_ID);
    else assert.equal(client.calls.length,0);
  }
});
