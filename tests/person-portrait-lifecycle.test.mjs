import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const {reconcilePersonPortraits,deletePersonPortrait}=require("../server/atlas-person-portrait-lifecycle.js");
const SOURCE="11111111-1111-4111-8111-111111111111",SURVIVOR="22222222-2222-4222-8222-222222222222",HASH="a".repeat(64);
const norm=s=>String(s).replace(/\s+/g," ").trim().toLowerCase();
test("portrait lifecycle moves the single current image on Person merge",async()=>{
 const client={async query(sql,params){const q=norm(sql);if(q.startsWith("select person_id::text"))return{rowCount:1,rows:[{person_id:SOURCE,asset_sha256:HASH}]};if(q.startsWith("update atlas_v2.person_portraits"))return{rowCount:1,rows:[{person_id:SURVIVOR,asset_sha256:HASH}]};throw new Error(q);}};
 const r=await reconcilePersonPortraits(client,SOURCE,SURVIVOR);assert.equal(r.moved,1);assert.equal(r.portrait.asset_sha256,HASH);
});
test("portrait lifecycle refuses merge when both Persons already have portraits",async()=>{
 const client={async query(){return{rowCount:2,rows:[{person_id:SOURCE,asset_sha256:HASH},{person_id:SURVIVOR,asset_sha256:"b".repeat(64)}]};}};
 await assert.rejects(()=>reconcilePersonPortraits(client,SOURCE,SURVIVOR),e=>e.code==="PERSON_PORTRAIT_MERGE_CONFLICT");
});
test("hard delete removes only current portrait row",async()=>{
 const client={async query(sql){assert.match(norm(sql),/^delete from atlas_v2\.person_portraits/);return{rowCount:1,rows:[{person_id:SOURCE}]};}};
 assert.deepEqual(await deletePersonPortrait(client,SOURCE),{portraits:1});
});
