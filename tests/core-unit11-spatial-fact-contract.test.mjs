import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const spatial=require('../server/atlas-spatial-fact-contract.js');

test('Unit 11 separates historical PolityPlaceFunction from display disposition',()=>{
  assert.equal(spatial.CONTRACT.historical_fact.entity,'PolityPlaceFunction');
  assert.equal(spatial.CONTRACT.display_disposition.entity,'SpatialDisplayDisposition');
  assert.equal(spatial.CONTRACT.historical_fact.rules.macroregion_subregion_are_not_historical_fact_fields,true);
  assert.equal(spatial.CONTRACT.display_disposition.rules.activity_override_is_display_only,true);
});

test('Unit 11 historical PolityPlaceFunction requires first-class Place identity and forbids display fields',()=>{
  const fact={polity_id:'p',function_type:'capital',place_id:'place',confidence:'well_established',source_refs:['source']};
  assert.equal(spatial.assertPolityPlaceFunction(fact),true);
  assert.throws(()=>spatial.assertPolityPlaceFunction({...fact,place_id:null}),/REQUIRED:place_id/);
  assert.throws(()=>spatial.assertPolityPlaceFunction({...fact,region_code:'europe'}),/DISPLAY_FIELD_FORBIDDEN/);
});

test('Unit 11 new Polity registration cannot finish with silent spatial debt',()=>{
  assert.throws(()=>spatial.normalizeSpatialRegistrationHandshake(null,{polityDisposition:'created'}),/SPATIAL_DISPOSITION_REQUIRED/);
  assert.throws(()=>spatial.normalizeSpatialRegistrationHandshake({state:'reviewed_hold',materialized:false,evidence:'x'},{polityDisposition:'created'}),/NOT_MATERIALIZED/);
  assert.deepEqual(spatial.normalizeSpatialRegistrationHandshake({state:'reviewed_hold',materialized:true,evidence:'reviewed shard hold'},{polityDisposition:'created'}),{required:true,state:'reviewed_hold',materialized:true,evidence:'reviewed shard hold'});
  assert.deepEqual(spatial.normalizeSpatialRegistrationHandshake(null,{polityDisposition:'reused'}),{required:false,state:'existing_polity',materialized:true});
});

test('Unit 11 registration obligation is a materialized handshake, not post-registration debt',()=>{
  const p=fs.readFileSync(new URL('../authoring/REGISTRATION_INGEST_POLICY.md',import.meta.url),'utf8');
  assert.match(p,/Spatial registration handshake/);
  assert.match(p,/new Polity.*DONE/is);
  assert.match(p,/reviewed_hold/);
});
