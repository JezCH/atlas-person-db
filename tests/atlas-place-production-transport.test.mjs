import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const {createPlaceProductionAuditHandler,OIDC_POLICY,MARKER}=
  require("../server/atlas-place-production-audit-handler.js");
const SHA="c".repeat(40);
const ENV={
  VERCEL:"1",VERCEL_ENV:"production",VERCEL_GIT_COMMIT_REF:"main",
  VERCEL_GIT_REPO_OWNER:"JezCH",VERCEL_GIT_REPO_SLUG:"atlas-person-db",
  VERCEL_GIT_COMMIT_SHA:SHA,
  SUPABASE_DB_URL:"postgresql://postgres:password@db.wfrbxltvpmlprgwfysxq.supabase.co/postgres"
};
function reply(){
  return {statusCode:0,body:null,headers:{},
    setHeader(k,v){this.headers[k]=v;},
    end(value){this.body=JSON.parse(value);}
  };
}
function request(body={},authorized=true){
  return {method:"POST",headers:authorized?{authorization:"Bearer signed-jwt"}:{},
    body:{deployment_sha:SHA,workflow_sha:SHA,...body}};
}

test("Production Place audit uses only exact canonical GitHub OIDC workflow",()=>{
  assert.equal(OIDC_POLICY.repository,"JezCH/atlas-person-db");
  assert.equal(OIDC_POLICY.workflowRef,
    "JezCH/atlas-person-db/.github/workflows/atlas-place-production-authority-audit.yml@refs/heads/main");
  assert.deepEqual([...OIDC_POLICY.allowedEvents].sort(),["push","workflow_dispatch"]);
});

test("unauthenticated or stale deployment cannot read Production tables",async()=>{
  let called=0;
  const handler=createPlaceProductionAuditHandler({
    env:ENV,verifyOidc:async()=>{},
    audit:async()=>{called++;return {};}
  });
  const unauthorized=reply();
  await handler(request({},false),unauthorized);
  assert.equal(unauthorized.statusCode,401);
  assert.equal(called,0);
  const stale=reply();
  await handler(request({deployment_sha:"d".repeat(40)}),stale);
  assert.equal(stale.statusCode,409);
  assert.equal(called,0);
});

test("valid OIDC carries exact SHA and a read-only proven GAP without false closure",async()=>{
  let expected=null,called=0;
  const handler=createPlaceProductionAuditHandler({
    env:ENV,verifyOidc:async(_token,args)=>{expected=args;},
    audit:async()=>{called++;return {
      schema:"atlas-place-production-census/v1",queried:true,
      state:"TARGET_CONFIRMED_GAP",
      identity:{status:"MATCH",basis:"supabase_dedicated_host",deployment_sha:SHA},
      report:{polities:{expected:13,present:13},places:{expected:20,present:0},
        sources:{expected:27,present:0},facts:{expected:23,present:0}}
    };}
  });
  const res=reply();
  await handler(request(),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.ok,true);
  assert.equal(res.body.read_only,true);
  assert.equal(res.body.marker,MARKER);
  assert.equal(res.body.audit.state,"TARGET_CONFIRMED_GAP");
  assert.equal(called,1);
  assert.equal(expected.expectedSha,SHA);
  assert.equal(expected.policy.audience,"atlas-person-db-place-production-audit");
  assert.doesNotMatch(JSON.stringify(res.body),/password|SUPABASE_DB_URL/);
});

test("unproven Production target is blocked, not reported as zero Place rows",async()=>{
  const handler=createPlaceProductionAuditHandler({
    env:ENV,verifyOidc:async()=>{},
    audit:async()=>({schema:"atlas-place-production-census/v1",
      state:"AUTHORITY_UNPROVEN",queried:false,identity:{status:"UNPROVEN"}})
  });
  const res=reply();
  await handler(request(),res);
  assert.equal(res.statusCode,409);
  assert.equal(res.body.code,"PLACE_PRODUCTION_TARGET_UNPROVEN");
  assert.equal(res.body.audit.queried,false);
});

test("exception is not reflected as a credential or raw SQL diagnostic",async()=>{
  const handler=createPlaceProductionAuditHandler({
    env:ENV,verifyOidc:async()=>{},
    audit:async()=>{throw new Error("postgresql://private:password@private.invalid");}
  });
  const res=reply();
  const error=console.error;
  console.error=()=>{};
  try{await handler(request(),res);}finally{console.error=error;}
  assert.equal(res.statusCode,500);
  assert.equal(res.body.code,"PLACE_AUDIT_EXECUTION_FAILED");
  assert.doesNotMatch(JSON.stringify(res.body),/private|password/);
});

test("read-only audit uses existing consolidated API and original source census",()=>{
  const api=fs.readFileSync(new URL("../api/atlas-audit-inventory.js",import.meta.url),"utf8");
  const workflow=fs.readFileSync(new URL("../.github/workflows/atlas-place-production-authority-audit.yml",import.meta.url),"utf8");
  assert.match(api,/PLACE_PRODUCTION_AUTHORITY_SURFACE/);
  assert.match(api,/createPlaceProductionAuditHandler/);
  assert.match(workflow,/id-token:\s*write/);
  assert.match(workflow,/__atlas_audit_surface=place-production-authority/);
  const source=fs.readFileSync(new URL("../scripts/audit-place-production-authority.mjs",import.meta.url),"utf8");
  assert.match(source,/REPEATABLE READ READ ONLY/);
  assert.match(source,/ROLLBACK/);
});
