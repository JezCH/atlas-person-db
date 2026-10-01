import assert from 'node:assert/strict';
import test from 'node:test';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {
  AUTHORITY,
  materializeSpatialRegistrationDisposition,
  verifySpatialRegistrationDisposition
}=require('../server/atlas-spatial-registration-disposition-service.js');

const POLITY_ID='11111111-1111-4111-8111-111111111111';

function fakeClient(initial=null) {
  let row=initial ? {...initial} : null;
  const calls=[];
  return {
    calls,
    async query(sql,params=[]) {
      const text=String(sql).replace(/\s+/g,' ').trim();
      calls.push({text,params});
      if (text.includes('pg_advisory_xact_lock')) return {rows:[],rowCount:1};
      if (text.includes('insert into atlas_v2.spatial_registration_dispositions')) {
        if (!row) {
          row={
            polity_id:String(params[0]).toLowerCase(),
            state:params[1],
            evidence:params[2],
            authoring_request_id:params[3],
            materialized_at:'2026-10-01T00:00:00.000Z'
          };
          return {rows:[],rowCount:1};
        }
        return {rows:[],rowCount:0};
      }
      if (text.includes('from atlas_v2.spatial_registration_dispositions')) {
        return row ? {rows:[{...row}],rowCount:1} : {rows:[],rowCount:0};
      }
      throw new Error(`unexpected query: ${text}`);
    }
  };
}

test('spatial registration materialization writes then exact-read-backs canonical lifecycle state',async()=>{
  const client=fakeClient();
  const result=await materializeSpatialRegistrationDisposition(client,{
    polityId:POLITY_ID,
    requestId:'fixture:spatial:1',
    review:{required:true,state:'reviewed_hold',evidence:'reviewed hold evidence'}
  });
  assert.equal(result.polity_id,POLITY_ID);
  assert.equal(result.state,'reviewed_hold');
  assert.equal(result.evidence,'reviewed hold evidence');
  assert.equal(result.authoring_request_id,'fixture:spatial:1');
  assert.equal(result.authority,AUTHORITY);
  assert.equal(result.materialized,true);
  assert.ok(client.calls.some((call)=>call.text.includes('insert into atlas_v2.spatial_registration_dispositions')));
  assert.ok(client.calls.some((call)=>call.text.includes('for update')));
  await verifySpatialRegistrationDisposition(client,result);
});

test('request self-attestation cannot replace or overwrite canonical spatial registration state',async()=>{
  const client=fakeClient({
    polity_id:POLITY_ID,
    state:'reviewed_hold',
    evidence:'first reviewed evidence',
    authoring_request_id:'fixture:spatial:first',
    materialized_at:'2026-10-01T00:00:00.000Z'
  });
  await assert.rejects(
    ()=>materializeSpatialRegistrationDisposition(client,{
      polityId:POLITY_ID,
      requestId:'fixture:spatial:second',
      review:{required:true,state:'reviewed_static',evidence:'different claim',materialized:true}
    }),
    /SPATIAL_REGISTRATION_MATERIALIZATION_CONFLICT/
  );
});
