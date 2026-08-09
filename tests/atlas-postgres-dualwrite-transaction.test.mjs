import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const planner = require('../atlas-v2-command-planner.js');
const {
  createDualWriteTransactionFactory,
  runtimeLineageKey,
  contentHash,
  comparableLegacyRow
} = require('../server/atlas-postgres-dualwrite-transaction.js');
const { createMutationService } = require('../server/atlas-mutation-service.js');

const IDS = {
  person:'11111111-1111-1111-1111-111111111111',
  polity:'22222222-2222-2222-2222-222222222222',
  role:'33333333-3333-3333-3333-333333333333',
  basis:'44444444-4444-4444-4444-444444444444'
};

function cloneMap(map) { return new Map([...map].map(([k,v]) => [k, structuredClone(v)])); }

function fakeClient({ forceParityMismatch = false, failV2 = false } = {}) {
  const calls = [];
  const legacy = new Map();
  const v2 = new Map();
  let snapshot = null;
  let v2Seq = 1;

  function v2id() { const suffix=String(v2Seq++).padStart(12,'0'); return `55555555-5555-5555-5555-${suffix}`; }
  function roleLabel(roleId) { return roleId == null ? null : 'Mathematician'; }
  return {
    calls, legacy, v2,
    async query(sql, params = []) {
      const text = String(sql).replace(/\s+/g, ' ').trim();
      calls.push([text, params]);
      if (text === 'begin') { snapshot={legacy:cloneMap(legacy),v2:cloneMap(v2)}; return {rows:[],rowCount:null}; }
      if (text === 'commit') { snapshot=null; return {rows:[],rowCount:null}; }
      if (text === 'rollback') { if(snapshot){legacy.clear(); for(const [k,v] of snapshot.legacy) legacy.set(k,v); v2.clear(); for(const [k,v] of snapshot.v2) v2.set(k,v);} snapshot=null; return {rows:[],rowCount:null}; }

      if (text.startsWith('insert into public.person_politics (id,')) {
        const [id,person_name,politic_name,activity_start,activity_end,role,period_basis,notes] = params;
        if (legacy.has(String(id))) return {rows:[],rowCount:0};
        legacy.set(String(id),{id:String(id),person_name,politic_name,activity_start,activity_end,role,period_basis,notes});
        return {rows:[{id:String(id)}],rowCount:1};
      }
      if (text.startsWith('select id,person_name,politic_name,activity_start,activity_end,role,period_basis,notes from public.person_politics where id=$1')) {
        const legacyRow=legacy.get(String(params[0])); return {rows:legacyRow?[structuredClone(legacyRow)]:[],rowCount:legacyRow?1:0};
      }
      if (text.startsWith('update public.person_politics set')) {
        const [person_name,politic_name,activity_start,activity_end,role,period_basis,notes,id]=params;
        if(!legacy.has(String(id))) return {rows:[],rowCount:0};
        legacy.set(String(id),{id:String(id),person_name,politic_name,activity_start,activity_end,role,period_basis,notes});
        return {rows:[],rowCount:1};
      }
      if (text.startsWith('delete from public.person_politics where id=$1')) {
        const ok=legacy.delete(String(params[0])); return {rows:[],rowCount:ok?1:0};
      }

      if (text.includes('from atlas_v2.person_names pn where pn.name=$1 group by')) return {rows:params[0]==='Ada Lovelace'?[{id:IDS.person}]:[],rowCount:1};
      if (text.includes('from atlas_v2.polity_names pn where pn.name=$1 group by')) return {rows:params[0]==='United Kingdom'?[{id:IDS.polity}]:[],rowCount:1};
      if (text.includes('from atlas_v2.roles r left join atlas_v2.role_names')) return {rows:params[0]==='Mathematician'?[{id:IDS.role}]:[],rowCount:1};
      if (text.includes('from atlas_v2.period_bases where code=$1')) return {rows:params[0]==='intellectual_activity'?[{id:IDS.basis}]:[],rowCount:1};

      if (text.startsWith('select pp.id, pp.legacy_source_key')) {
        const [person,polity,start,end,role,basis,notes]=params;
        const matches=[...v2.values()].filter(r=>r.person_name===person&&r.politic_name===polity&&Number(r.activity_start)===Number(start)&&Number(r.activity_end)===Number(end)&&(r.role??null)===(role??null)&&r.period_basis===basis&&(r.notes??null)===(notes??null));
        return {rows:matches.slice(0,2).map(r=>({id:r.id,legacy_source_key:r.legacy_source_key,source_locator:r.source_locator,content_hash:r.content_hash})),rowCount:matches.length};
      }
      if (text.startsWith('insert into atlas_v2.person_politics_v2')) {
        if (failV2) throw new Error('v2 failed');
        const [person_id,polity_id,start,end,role_id,basis_id,lineage,notes,source_locator,content_hash]=params;
        const existing=[...v2.values()].find(r=>r.legacy_source_key===lineage);
        const id=existing?.id || v2id();
        v2.set(id,{id,person_id,polity_id,role_id,period_basis_id:basis_id,person_name:'Ada Lovelace',politic_name:'United Kingdom',activity_start:start,activity_end:end,role:roleLabel(role_id),period_basis:'intellectual_activity',legacy_source_key:lineage,notes,source_locator:JSON.parse(source_locator),content_hash});
        return {rows:[{id}],rowCount:1};
      }
      if (text.startsWith('update atlas_v2.person_politics_v2 set')) {
        const [person_id,polity_id,start,end,role_id,basis_id,notes,id]=params;
        const v2Row=v2.get(String(id)); if(!v2Row) return {rows:[],rowCount:0};
        Object.assign(v2Row,{person_id,polity_id,activity_start:start,activity_end:end,role_id,period_basis_id:basis_id,notes,person_name:'Ada Lovelace',politic_name:'United Kingdom',role:roleLabel(role_id),period_basis:'intellectual_activity'});
        return {rows:[{id:String(id)}],rowCount:1};
      }
      if (text.startsWith('select id from atlas_v2.person_politics_v2 where legacy_source_key=$1')) {
        const matches=[...v2.values()].filter(r=>r.legacy_source_key===params[0]); return {rows:matches.slice(0,2).map(r=>({id:r.id})),rowCount:matches.length};
      }
      if (text.startsWith('delete from atlas_v2.person_politics_v2 where id=$1')) {
        const ok=v2.delete(String(params[0])); return {rows:[],rowCount:ok?1:0};
      }
      if (text.startsWith('select pp.activity_start, pp.activity_end, pp.notes')) {
        if (forceParityMismatch) return {rows:[{activity_start:9999,activity_end:9999,notes:null,role:'Mathematician',period_basis:'intellectual_activity',person_match:true,polity_match:true}],rowCount:1};
        const v2Row=v2.get(String(params[0]));
        return {rows:v2Row?[{activity_start:v2Row.activity_start,activity_end:v2Row.activity_end,notes:v2Row.notes,role:v2Row.role,period_basis:v2Row.period_basis,person_match:v2Row.person_name===params[1],polity_match:v2Row.politic_name===params[2]}]:[],rowCount:v2Row?1:0};
      }
      if (text.startsWith('select count(*)::int as count from atlas_v2.person_politics_v2 where id=$1')) return {rows:[{count:v2.has(String(params[0]))?1:0}],rowCount:1};
      throw new Error(`Unhandled SQL: ${text}`);
    }
  };
}

const row = { person_name:'Ada Lovelace', politic_name:'United Kingdom', activity_start:1842, activity_end:1852, role:'Mathematician', period_basis:'intellectual_activity', notes:null };

function serviceFor(client, rollbackOnly=false) {
  const {transactionFactory,parityVerifier}=createDualWriteTransactionFactory({client,rollbackOnly});
  return createMutationService({planner,transactionFactory,parityVerifier});
}

test('create/update/import/delete share one transaction and maintain parity', async () => {
  const client=fakeClient();
  const service=serviceFor(client);

  const created=await service.mutate({operation:'create',payload:row,request_id:'req-create'});
  assert.equal(created.committed,true,JSON.stringify(created));
  const legacyId=created.legacy.record_ids[0];
  const v2Id=created.v2.normalized_relationship_ids[0];
  assert.equal(client.v2.get(v2Id).legacy_source_key,runtimeLineageKey(legacyId));
  assert.equal(client.v2.get(v2Id).content_hash,contentHash(comparableLegacyRow(row)));

  const createdProvenance=structuredClone({
    legacy_source_key:client.v2.get(v2Id).legacy_source_key,
    source_locator:client.v2.get(v2Id).source_locator,
    content_hash:client.v2.get(v2Id).content_hash
  });
  const updatedRow={...row,activity_end:1853,notes:'reviewed update'};
  const updated=await service.mutate({operation:'update',payload:{id:legacyId,value:updatedRow},request_id:'req-update'});
  assert.equal(updated.committed,true,JSON.stringify(updated));
  assert.equal(updated.v2.normalized_relationship_ids[0],v2Id);
  assert.equal(client.legacy.get(legacyId).activity_end,1853);
  assert.equal(client.v2.get(v2Id).activity_end,1853);
  assert.deepEqual({
    legacy_source_key:client.v2.get(v2Id).legacy_source_key,
    source_locator:client.v2.get(v2Id).source_locator,
    content_hash:client.v2.get(v2Id).content_hash
  },createdProvenance);

  const imported=await service.mutate({operation:'import',payload:[{...row,activity_start:1900,activity_end:1901},{...row,activity_start:1902,activity_end:1903}],request_id:'req-import'});
  assert.equal(imported.committed,true,JSON.stringify(imported));
  assert.equal(imported.legacy.record_ids.length,2);
  assert.equal(imported.v2.normalized_relationship_ids.length,2);

  const deleted=await service.mutate({operation:'delete',payload:{id:legacyId},request_id:'req-delete'});
  assert.equal(deleted.committed,true,JSON.stringify(deleted));
  assert.equal(client.legacy.has(legacyId),false);
  assert.equal(client.v2.has(v2Id),false);

  assert.equal(client.calls.filter(([sql])=>sql==='begin').length,4);
  assert.equal(client.calls.filter(([sql])=>sql==='commit').length,4);
  assert.equal(client.calls.filter(([sql])=>sql==='rollback').length,0);
});

test('existing Phase 5 provenance survives an update unchanged', async () => {
  const client=fakeClient();
  const legacyId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const v2Id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const sourceLocator={file:'pending-records.json',index:3,source_sha256:'original-source'};
  client.legacy.set(legacyId,{id:legacyId,...row});
  client.v2.set(v2Id,{
    id:v2Id,
    person_id:IDS.person,
    polity_id:IDS.polity,
    role_id:IDS.role,
    period_basis_id:IDS.basis,
    person_name:row.person_name,
    politic_name:row.politic_name,
    activity_start:row.activity_start,
    activity_end:row.activity_end,
    role:row.role,
    period_basis:row.period_basis,
    notes:row.notes,
    legacy_source_key:'pending-records.json:3:deadbeefdeadbeef',
    source_locator:structuredClone(sourceLocator),
    content_hash:'deadbeef'.repeat(8)
  });
  const before=structuredClone(client.v2.get(v2Id));
  const result=await serviceFor(client).mutate({operation:'update',payload:{id:legacyId,value:{...row,notes:'new authoring note'}},request_id:'phase5-update'});
  assert.equal(result.committed,true,JSON.stringify(result));
  const after=client.v2.get(v2Id);
  assert.equal(after.notes,'new authoring note');
  assert.equal(after.legacy_source_key,before.legacy_source_key);
  assert.deepEqual(after.source_locator,before.source_locator);
  assert.equal(after.content_hash,before.content_hash);
});

test('normalized equivalent retries reuse one deterministic request identity', async () => {
  const client=fakeClient();
  const service=serviceFor(client);
  const dirty={...row,person_name:'  Ada   Lovelace ',politic_name:' United  Kingdom ',role:' Mathematician '};
  const first=await service.mutate({operation:'create',payload:dirty});
  const second=await service.mutate({operation:'create',payload:row});
  assert.equal(first.committed,true,JSON.stringify(first));
  assert.equal(second.committed,true,JSON.stringify(second));
  assert.equal(first.request_id,second.request_id);
  assert.deepEqual(first.legacy.record_ids,second.legacy.record_ids);
  assert.deepEqual(first.v2.normalized_relationship_ids,second.v2.normalized_relationship_ids);
  assert.equal(client.legacy.size,1);
  assert.equal(client.v2.size,1);
});

test('create replay reuses deterministic legacy and normalized lineage instead of duplicating', async () => {
  const client=fakeClient();
  const service=serviceFor(client);
  const first=await service.mutate({operation:'create',payload:row,request_id:'same-request'});
  const second=await service.mutate({operation:'create',payload:row,request_id:'same-request'});
  assert.equal(first.committed,true);
  assert.equal(second.committed,true,JSON.stringify(second));
  assert.equal(second.legacy.replay,true);
  assert.deepEqual(second.legacy.record_ids,first.legacy.record_ids);
  assert.deepEqual(second.v2.normalized_relationship_ids,first.v2.normalized_relationship_ids);
  assert.equal(client.legacy.size,1);
  assert.equal(client.v2.size,1);
});

test('null role create preserves null on both sides and maintains parity', async () => {
  const client=fakeClient();
  const service=serviceFor(client);
  const nullRoleRow={...row,role:null};
  const result=await service.mutate({operation:'create',payload:nullRoleRow,request_id:'null-role-create'});
  assert.equal(result.committed,true,JSON.stringify(result));
  assert.equal(result.parity.match,true,JSON.stringify(result));
  const legacyId=result.legacy.record_ids[0];
  const v2Id=result.v2.normalized_relationship_ids[0];
  assert.equal(client.legacy.get(legacyId).role,null);
  assert.equal(client.v2.get(v2Id).role_id,null);
  assert.equal(client.v2.get(v2Id).role,null);
  assert.equal(client.calls.some(([sql])=>sql.includes('from atlas_v2.roles r left join atlas_v2.role_names')),false);
});

test('null-role preimage can be updated to an exact reviewed role', async () => {
  const client=fakeClient();
  const service=serviceFor(client);
  const created=await service.mutate({operation:'create',payload:{...row,role:null},request_id:'null-role-seed'});
  assert.equal(created.committed,true,JSON.stringify(created));
  const legacyId=created.legacy.record_ids[0];
  const v2Id=created.v2.normalized_relationship_ids[0];

  const updated=await service.mutate({operation:'update',payload:{id:legacyId,value:row},request_id:'null-to-role'});
  assert.equal(updated.committed,true,JSON.stringify(updated));
  assert.equal(updated.v2.normalized_relationship_ids[0],v2Id);
  assert.equal(client.legacy.get(legacyId).role,'Mathematician');
  assert.equal(client.v2.get(v2Id).role_id,IDS.role);
  assert.equal(client.v2.get(v2Id).role,'Mathematician');
});

test('reviewed role can be explicitly cleared to null without changing lineage provenance', async () => {
  const client=fakeClient();
  const service=serviceFor(client);
  const created=await service.mutate({operation:'create',payload:row,request_id:'role-seed'});
  assert.equal(created.committed,true,JSON.stringify(created));
  const legacyId=created.legacy.record_ids[0];
  const v2Id=created.v2.normalized_relationship_ids[0];
  const before=structuredClone(client.v2.get(v2Id));

  const updated=await service.mutate({operation:'update',payload:{id:legacyId,value:{...row,role:null}},request_id:'role-to-null'});
  assert.equal(updated.committed,true,JSON.stringify(updated));
  const after=client.v2.get(v2Id);
  assert.equal(after.role_id,null);
  assert.equal(after.role,null);
  assert.equal(after.legacy_source_key,before.legacy_source_key);
  assert.deepEqual(after.source_locator,before.source_locator);
  assert.equal(after.content_hash,before.content_hash);
});

test('mixed-role import keeps row state isolated', async () => {
  const client=fakeClient();
  const service=serviceFor(client);
  const result=await service.mutate({
    operation:'import',
    payload:[
      {...row,activity_start:1900,activity_end:1901},
      {...row,activity_start:1902,activity_end:1903,role:null}
    ],
    request_id:'mixed-role-import'
  });
  assert.equal(result.committed,true,JSON.stringify(result));
  const [firstId,secondId]=result.v2.normalized_relationship_ids;
  assert.equal(client.v2.get(firstId).role_id,IDS.role);
  assert.equal(client.v2.get(secondId).role_id,null);
  assert.equal(client.v2.get(secondId).role,null);
});

test('parity mismatch rolls back both legacy and normalized writes', async () => {
  const client=fakeClient({forceParityMismatch:true});
  const service=serviceFor(client);
  const result=await service.mutate({operation:'create',payload:row,request_id:'bad-parity'});
  assert.equal(result.committed,false);
  assert.equal(result.rollback,true);
  assert.match(result.transaction_failure,/parity mismatch/);
  assert.equal(client.legacy.size,0);
  assert.equal(client.v2.size,0);
  assert.equal(client.calls.filter(([sql])=>sql==='rollback').length,1);
});

test('v2 failure rolls back shared transaction', async () => {
  const client=fakeClient({failV2:true});
  const service=serviceFor(client);
  const result=await service.mutate({operation:'create',payload:row,request_id:'v2-fail'});
  assert.equal(result.committed,false);
  assert.equal(result.rollback,true);
  assert.equal(client.legacy.size,0);
  assert.equal(client.v2.size,0);
});
