import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const places=require('../server/atlas-place-relation-service.js');

const PERSON='11111111-1111-4111-8111-111111111111';
const PLACE='22222222-2222-4222-8222-222222222222';
const SOURCE='33333333-3333-4333-8333-333333333333';

test('Unit 10 supports only evidence-backed Person birth/death Place facts',()=>{
  assert.deepEqual([...places.PERSON_PLACE_RELATIONS].sort(),['birth_place','death_place']);
  assert.deepEqual(places.normalizePersonPlaceFacts(null),[]);
  assert.throws(()=>places.normalizePersonPlaceFacts([{relation_type:'active_in',place_id:PLACE,source_id:SOURCE,locator:'x'}]),/RELATION_UNSUPPORTED/);
});

test('Unit 10 rejects duplicate relation facts instead of inventing multiplicity semantics',()=>{
  assert.throws(()=>places.normalizePersonPlaceFacts([
    {relation_type:'birth_place',place_id:PLACE,source_id:SOURCE,locator:'a'},
    {relation_type:'birth_place',place_id:PLACE,source_id:SOURCE,locator:'b'}
  ]),/RELATION_DUPLICATE/);
});

test('Unit 10 relation writer requires existing first-class Place and Source and reuses exact fact',async()=>{
  const calls=[];
  const client={async query(sql,params){
    const q=String(sql); calls.push({q,params});
    if(/from atlas_v2\.places where id=/i.test(q)) return {rows:[{id:PLACE}]};
    if(/from atlas_v2\.sources where id=/i.test(q)) return {rows:[{id:SOURCE}]};
    if(/from atlas_v2\.person_place_facts/i.test(q)) return {rows:[{place_id:PLACE,source_id:SOURCE,source_locator_key:'birth record'}]};
    throw new Error('unexpected SQL '+q);
  }};
  const result=await places.resolvePersonPlaceFacts(client,{personId:PERSON,facts:[{relation_type:'birth_place',place_id:PLACE,source_id:SOURCE,locator:'birth record'}]});
  assert.equal(result[0].disposition,'reused');
  assert.equal(calls.some(x=>/insert into atlas_v2\.person_place_facts/i.test(x.q)),false);
});

test('Unit 10 relation writer fails closed on conflicting reviewed fact',async()=>{
  const client={async query(sql){
    const q=String(sql);
    if(/from atlas_v2\.places where id=/i.test(q)) return {rows:[{id:PLACE}]};
    if(/from atlas_v2\.sources where id=/i.test(q)) return {rows:[{id:SOURCE}]};
    if(/from atlas_v2\.person_place_facts/i.test(q)) return {rows:[{place_id:'44444444-4444-4444-8444-444444444444',source_id:SOURCE,source_locator_key:'other'}]};
    return {rows:[]};
  }};
  await assert.rejects(()=>places.resolvePersonPlaceFacts(client,{personId:PERSON,facts:[{relation_type:'death_place',place_id:PLACE,source_id:SOURCE,locator:'death record'}]}),/RELATION_CONFLICT:death_place/);
});

test('Unit 10 schema connects existing Person, Place and Source without placeholder Place creation',()=>{
  const sql=fs.readFileSync(new URL('../db/migrations/20260930_place_historical_relations.sql',import.meta.url),'utf8');
  assert.match(sql,/CREATE TABLE IF NOT EXISTS atlas_v2\.person_place_facts/i);
  assert.match(sql,/REFERENCES atlas_v2\.persons\(id\) ON DELETE CASCADE/i);
  assert.match(sql,/REFERENCES atlas_v2\.places\(id\) ON DELETE RESTRICT/i);
  assert.match(sql,/REFERENCES atlas_v2\.sources\(id\) ON DELETE RESTRICT/i);
  assert.match(sql,/birth_place.*death_place/is);
  assert.doesNotMatch(sql,/insert into atlas_v2\.places/i);
});
