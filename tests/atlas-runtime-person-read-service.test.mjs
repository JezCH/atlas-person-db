import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const runtimeRead=require('../server/atlas-runtime-person-read-service.js');

for (const [name,sql] of [
  ['person list',runtimeRead.PERSON_READ_SQL],
  ['person detail',runtimeRead.PERSON_DETAIL_SQL],
  ['activity detail',runtimeRead.ACTIVITY_DETAIL_SQL],
  ['activity source',runtimeRead.ACTIVITY_SOURCE_SQL]
]) {
  test(`${name} public Activity access uses Runtime projection`,()=>{
    if (name==='activity source' || name==='activity detail' || name==='person list' || name==='person detail') {
      assert.match(sql,/atlas_v2\.runtime_person_politics_v1/);
    }
    assert.doesNotMatch(sql,/atlas_v2\.person_politics_v2/);
  });
}

test('runtime Activity sources are read from sealed provenance_snapshot, not live Activity-source joins',()=>{
  assert.match(runtimeRead.ACTIVITY_SOURCE_SQL,/provenance_snapshot/);
  assert.match(runtimeRead.ACTIVITY_SOURCE_SQL,/jsonb_array_elements/);
  assert.doesNotMatch(runtimeRead.ACTIVITY_SOURCE_SQL,/person_politics_sources/);
});

test('person-level independent sources can remain normalized live entity data',()=>{
  assert.match(runtimeRead.PERSON_SOURCE_SQL,/atlas_v2\.person_sources/);
  assert.match(runtimeRead.PERSON_SOURCE_SQL,/atlas_v2\.sources/);
});

test('runtime person list projects activity summary from Runtime rows',async()=>{
  const client={async query(sql){
    assert.equal(sql,runtimeRead.PERSON_READ_SQL);
    return {rows:[{
      id:'11111111-1111-4111-8111-111111111111',person_type:'historical',historicity:'historical',
      names:[{locale:'en',name:'Example',name_type:'canonical',is_preferred:true}],descriptions:[],external_references:{},
      activity_count:1,first_activity_year:100,last_activity_year:120
    }]};
  }};
  const result=await runtimeRead.readPersons({client});
  assert.equal(result.persons[0].activity_count,1);
  assert.equal(result.persons[0].first_activity_year,100);
  assert.equal(result.persons[0].last_activity_year,120);
});
