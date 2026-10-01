import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const model=require('../atlas-person-spacetime-model.js');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('CORE-REENTRY-08 current Place-function projection uses canonical Place and Source UUIDs only',()=>{
  const projection=JSON.parse(fs.readFileSync(path.join(root,'spatial/projections/polity-place-functions.v1.json'),'utf8'));
  const baseline=JSON.parse(fs.readFileSync(path.join(root,'spatial/reviewed-bindings/0000-migrated-baseline.index.json'),'utf8'));
  const compiled=JSON.parse(fs.readFileSync(path.join(root,'atlas-polity-spatial-index.json'),'utf8'));
  assert.equal(projection.schema,'atlas-polity-place-function-projection/v1');
  assert.equal(projection.authority,'atlas_v2.polity_place_functions');
  assert.deepEqual(baseline.place_function_records,[]);
  assert.deepEqual(compiled.place_function_records,projection.records);
  let functions=0;
  for(const record of projection.records){
    assert.match(record.polity_id,UUID);
    for(const fn of record.functions){
      functions+=1;
      assert.match(fn.place_id,UUID);
      assert.ok(fn.place_name);
      assert.ok(fn.region_code);
      assert.ok(Array.isArray(fn.source_refs)&&fn.source_refs.length>0);
      for(const ref of fn.source_refs){
        assert.match(ref.source_id,UUID);
        assert.ok(ref.locator);
      }
    }
  }
  assert.equal(projection.records.length,13);
  assert.equal(functions,23);
});

test('CORE-REENTRY-08 compiler rebuilds current Place-function display from UUID projection instead of baseline/correction authority',async()=>{
  const mod=await import(pathToFileURL(path.join(root,'scripts/compile-spatial-bindings.mjs')).href);
  const r4=await import(pathToFileURL(path.join(root,'scripts/compile-spatial-bindings-r4.mjs')).href);
  const baseline=JSON.parse(fs.readFileSync(path.join(root,'spatial/reviewed-bindings/0000-migrated-baseline.index.json'),'utf8'));
  const placeFunctions=JSON.parse(fs.readFileSync(path.join(root,'spatial/projections/polity-place-functions.v1.json'),'utf8'));
  const shards=mod.loadReviewedBindingShards(path.join(root,'spatial/reviewed-bindings/shards'));
  const corrections=mod.loadReviewedSpatialCorrections(path.join(root,'spatial/reviewed-bindings/corrections'));
  const migrations=r4.loadTaxonomyMigrationManifests(path.join(root,'spatial/taxonomy-migrations'));
  const result=r4.compileSpatialBindingsR4({baseline,shards,manifests:migrations,corrections,placeFunctions});
  const expected=JSON.parse(fs.readFileSync(path.join(root,'atlas-polity-spatial-index.json'),'utf8'));
  assert.deepEqual(result.index,expected);
  assert.deepEqual(result.index.place_function_records,placeFunctions.records);
});

test('CORE-REENTRY-08 canonical DB writer and migration own PolityPlaceFunction facts',()=>{
  const migration=fs.readFileSync(path.join(root,'db/migrations/20261001_polity_place_function_authority.sql'),'utf8');
  const writer=fs.readFileSync(path.join(root,'server/atlas-polity-place-function-service.js'),'utf8');
  const compiler=fs.readFileSync(path.join(root,'scripts/compile-spatial-bindings.mjs'),'utf8');
  const backfill=fs.readFileSync(path.join(root,'server/atlas-polity-place-function-authority-backfill.js'),'utf8');
  assert.match(migration,/CREATE TABLE IF NOT EXISTS atlas_v2\.polity_place_functions/);
  assert.match(migration,/CREATE TABLE IF NOT EXISTS atlas_v2\.polity_place_function_sources/);
  assert.doesNotMatch(migration,/INSERT\s+INTO\s+atlas_v2\.(?:places|place_names|sources|place_sources)/i);
  assert.match(backfill,/applyPolityPlaceFunctionAuthorityBackfill/);
  assert.match(backfill,/insertExactSource/);
  assert.match(backfill,/insertExactPlace/);
  assert.match(backfill,/createPolityPlaceFunction/);
  assert.match(backfill,/POLITY_PLACE_AUTHORITY_TARGET_POLITY_SET_DRIFT/);
  assert.match(writer,/async function createPolityPlaceFunction/);
  assert.match(writer,/POLITY_PLACE_FUNCTION_DISPLAY_FIELD_FORBIDDEN/);
  assert.match(writer,/POLITY_PLACE_FUNCTION_SOURCE_READBACK_DRIFT/);
  assert.match(compiler,/SPATIAL_BASELINE_HISTORICAL_FACT_AUTHORITY_FORBIDDEN/);
  assert.match(compiler,/change\.disposition !== 'place_function'/);
});


test('CORE-REENTRY-08 current runtime validation rejects null/pseudo Place identity and string provenance',()=>{
  const validFunction={
    start_year:100,
    end_year:101,
    function_type:'capital',
    place_name:'Fixture Capital',
    place_id:'00000000-0000-4000-8000-000000000081',
    region_code:'east-asia',
    confidence:'well_established',
    source_refs:[{source_id:'00000000-0000-4000-8000-000000000082',locator:'fixture locator'}]
  };
  const makeIndex=(fn)=>({
    schema:model.SPATIAL_INDEX_SCHEMA,
    polity_geography:{},
    polity_subregions:{},
    place_function_records:[{polity_id:'fixture-polity',functions:[fn]}],
    review_queue:[]
  });
  assert.equal(model.validateSpatialIndex(makeIndex(validFunction)).valid,true);
  assert.equal(model.validateSpatialIndex(makeIndex({...validFunction,place_id:null})).valid,false);
  assert.equal(model.validateSpatialIndex(makeIndex({...validFunction,place_id:'place-legacy-pseudo-id'})).valid,false);
  assert.equal(model.validateSpatialIndex(makeIndex({...validFunction,source_refs:['legacy string provenance']})).valid,false);
});
