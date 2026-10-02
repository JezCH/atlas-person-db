import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const planner = require("../server/atlas-p9-mutation-planner.js");
const {
  createV2AuthoritativeMutationService,
  RETIRED_ACTIVITY_WRITE_CODE
} = require("../server/atlas-v2-authoritative-mutation-service.js");

test("retired Activity create/update/import/reconcile cannot reach a transaction even with a permissive planner", async () => {
  let transactionCalls = 0;
  const permissivePlanner = {
    plan(operation,payload) {
      return { blockers:[], normalized_payload:payload, commands:[{ type:"OBSOLETE_SUCCESS_PATH", operation }] };
    }
  };
  const service = createV2AuthoritativeMutationService({
    planner:permissivePlanner,
    transactionFactory:async () => {
      transactionCalls += 1;
      throw new Error("retired operation must not open transaction");
    }
  });

  for (const [operation,payload] of [
    ["create",{ person_name:"Ada" }],
    ["update",{ id:"00000000-0000-4000-8000-000000000001", value:{} }],
    ["import",[]],
    ["reconcile",{}]
  ]) {
    const result=await service.mutate({ operation, payload });
    assert.equal(result.committed,false);
    assert.equal(result.rollback,false);
    assert.equal(result.validation_failures[0]?.code,RETIRED_ACTIVITY_WRITE_CODE);
  }
  assert.equal(transactionCalls,0);
});

test("v2-authoritative compatibility service preserves immutable-id delete only", async () => {
  const id="11111111-1111-4111-8111-111111111111";
  let transactionCalls=0;
  let seen=null;
  const service=createV2AuthoritativeMutationService({
    planner,
    transactionFactory:async (work)=>{
      transactionCalls+=1;
      return work({
        async executeV2Authoritative(input){
          seen=input;
          return { committed:true, normalized_relationship_ids:[id], replay:false, transaction_failure:null };
        }
      });
    },
    verificationVerifier:async()=>({ checked:true, match:true, remaining:0 })
  });

  const result=await service.mutate({ operation:"delete", payload:{ id } });
  assert.equal(transactionCalls,1);
  assert.equal(seen.operation,"delete");
  assert.deepEqual(seen.payload,{ id });
  assert.equal(result.committed,true);
  assert.deepEqual(result.v2.normalized_relationship_ids,[id]);
  assert.equal(result.verification.match,true);
});

test("delete verification mismatch rolls back the compatibility transaction outcome", async () => {
  const id="22222222-2222-4222-8222-222222222222";
  let rollbackObserved=false;
  const service=createV2AuthoritativeMutationService({
    planner,
    transactionFactory:async (work)=>{
      try {
        return await work({
          async executeV2Authoritative(){
            return { committed:true, normalized_relationship_ids:[id], replay:false, transaction_failure:null };
          }
        });
      } catch (error) {
        rollbackObserved=true;
        throw error;
      }
    },
    verificationVerifier:async()=>({ checked:true, match:false, reason:"synthetic delete mismatch" })
  });

  const result=await service.mutate({ operation:"delete", payload:{ id } });
  assert.equal(result.committed,false);
  assert.equal(result.rollback,true);
  assert.equal(rollbackObserved,true);
  assert.match(result.transaction_failure,/synthetic delete mismatch/);
});
