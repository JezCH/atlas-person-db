import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const txModule=require("../server/atlas-postgres-v2-authoritative-transaction.js");
const txSource=fs.readFileSync(new URL("../server/atlas-postgres-v2-authoritative-transaction.js",import.meta.url),"utf8");
const serviceSource=fs.readFileSync(new URL("../server/atlas-v2-authoritative-mutation-service.js",import.meta.url),"utf8");

test("v2 compatibility persistence source has zero legacy/name-based Activity write dependency",()=>{
  assert.equal(txSource.includes("public.person_politics"),false);
  assert.equal(txSource.includes("atlas_person_politics_compat_v1"),false);
  assert.doesNotMatch(txSource,/insert\s+into\s+atlas_v2\.person_politics_v2/i);
  assert.doesNotMatch(txSource,/update\s+atlas_v2\.person_politics_v2/i);
  assert.doesNotMatch(txSource,/person_names|polity_names|role_names|period_bases/);
  assert.doesNotMatch(txSource,/createOne|updateOne|resolvePayload|runtimeSourceKey|contentHash|semanticKey/);
  assert.match(txSource,/delete\s+from\s+atlas_v2\.person_politics_v2/i);
  assert.equal(serviceSource.includes("executeLegacy"),false);
  assert.equal(serviceSource.includes("parityVerifier"),false);
  assert.match(serviceSource,/RETIRED_ACTIVITY_WRITE_OPERATIONS/);
});

test("transaction adapter rejects retired Activity writes even when called directly",async()=>{
  let queries=0;
  const client={async query(){queries+=1;throw new Error("retired write must not query");}};
  const tx=txModule.createV2AuthoritativeTx(client);
  for(const operation of ["create","update","import","reconcile"]){
    await assert.rejects(
      ()=>tx.executeV2Authoritative({operation,payload:{}}),
      /P9_LEGACY_ACTIVITY_MUTATION_RETIRED_USE_AUTHORING_MANIFEST_V2/
    );
  }
  assert.equal(queries,0);
});

test("transaction adapter preserves immutable-UUID delete only",async()=>{
  const id="11111111-1111-4111-8111-111111111111";
  const calls=[];
  const client={
    async query(sql,params){
      const text=String(sql).replace(/\s+/g," ").trim();
      calls.push({text,params});
      if(text.startsWith("select id from atlas_v2.person_politics_v2")) return {rows:[{id}],rowCount:1};
      if(text.startsWith("delete from atlas_v2.person_politics_v2")) return {rows:[{id}],rowCount:1};
      throw new Error("unexpected SQL: "+text);
    }
  };
  const tx=txModule.createV2AuthoritativeTx(client);
  const result=await tx.executeV2Authoritative({operation:"delete",payload:{id}});
  assert.equal(result.committed,true);
  assert.deepEqual(result.normalized_relationship_ids,[id]);
  assert.equal(calls.length,2);
  assert.match(calls[0].text,/for update$/i);
  assert.deepEqual(calls[0].params,[id]);
  assert.deepEqual(calls[1].params,[id]);
});

test("delete verifier proves the exact normalized relationship is absent",async()=>{
  const id="22222222-2222-4222-8222-222222222222";
  const client={
    async query(sql,params){
      assert.match(String(sql),/count\(\*\).*atlas_v2\.person_politics_v2/i);
      assert.deepEqual(params,[id]);
      return {rows:[{count:0}],rowCount:1};
    }
  };
  const verify=txModule.createV2VerificationVerifier(client);
  const result=await verify({
    operation:"delete",
    v2:{normalized_relationship_ids:[id]}
  });
  assert.deepEqual(result,{checked:true,match:true,remaining:0});
});

test("verification fails closed for any retired write operation",async()=>{
  let queries=0;
  const verify=txModule.createV2VerificationVerifier({async query(){queries+=1;return {rows:[]};}});
  const result=await verify({
    operation:"update",
    v2:{normalized_relationship_ids:["33333333-3333-4333-8333-333333333333"]}
  });
  assert.equal(result.checked,true);
  assert.equal(result.match,false);
  assert.match(result.reason,/P9_LEGACY_ACTIVITY_MUTATION_RETIRED_USE_AUTHORING_MANIFEST_V2/);
  assert.equal(queries,0);
});
