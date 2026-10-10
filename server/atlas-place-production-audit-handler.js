"use strict";

// Scoped Production Place authority census. All authoritative SQL is in the
// existing read-only audit script; this transport grants no write capability.
const { createPostgresClient } = require("./atlas-postgres-client.js");
const { verifyGitHubActionsOidcWithPolicy } = require("./atlas-github-oidc.js");
const { sendJson } = require("./atlas-normalized-read-handler.js");

const MARKER="ATLAS_PLACE_PRODUCTION_AUTHORITY_AUDIT_V1";
const AUDIENCE="atlas-person-db-place-production-audit";
const SHA_RE=/^[0-9a-f]{40}$/;
const OIDC_POLICY=Object.freeze({
  audience:AUDIENCE,
  repository:"JezCH/atlas-person-db",
  repositoryId:"1319427399",
  ref:"refs/heads/main",
  workflowRef:"JezCH/atlas-person-db/.github/workflows/atlas-place-production-authority-audit.yml@refs/heads/main",
  environment:"production",
  allowedEvents:new Set(["push","workflow_dispatch"])
});

function parseRequestBody(req){
  if(req?.body && typeof req.body==="object" && !Buffer.isBuffer(req.body)) return req.body;
  if(typeof req?.body==="string"){
    try{return JSON.parse(req.body);}catch{throw new Error("PLACE_AUDIT_JSON_INVALID");}
  }
  throw new Error("PLACE_AUDIT_BODY_REQUIRED");
}
function bearer(req){
  const match=/^Bearer\s+([^\s]+)$/i.exec(String(req?.headers?.authorization || req?.headers?.Authorization || "").trim());
  return match?.[1] || "";
}
function productionRuntime(env){
  if(env?.VERCEL!=="1" || env?.VERCEL_ENV!=="production" || env?.VERCEL_GIT_COMMIT_REF!=="main"){
    throw new Error("PLACE_AUDIT_NOT_PRODUCTION_MAIN");
  }
  if(env?.VERCEL_GIT_REPO_OWNER!=="JezCH" || env?.VERCEL_GIT_REPO_SLUG!=="atlas-person-db"){
    throw new Error("PLACE_AUDIT_REPOSITORY_MISMATCH");
  }
  const sha=String(env?.VERCEL_GIT_COMMIT_SHA || "").trim().toLowerCase();
  if(!SHA_RE.test(sha)) throw new Error("PLACE_AUDIT_DEPLOYMENT_SHA_UNPROVEN");
  return sha;
}
function validateRequest(body,env){
  const requested=String(body?.deployment_sha || "").trim().toLowerCase();
  const workflow=String(body?.workflow_sha || "").trim().toLowerCase();
  if(!SHA_RE.test(requested) || !SHA_RE.test(workflow)) throw new Error("PLACE_AUDIT_SHA_REQUIRED");
  const deployed=productionRuntime(env);
  if(requested!==deployed) throw new Error("PLACE_AUDIT_DEPLOYMENT_SHA_MISMATCH");
  return Object.freeze({deployed,workflow});
}
function createPlaceProductionAuditHandler({
  env=process.env,
  verifyOidc=verifyGitHubActionsOidcWithPolicy,
  audit=null,
  clientFactory=createPostgresClient
}={}){
  return async function placeProductionAuditHandler(req,res){
    if(String(req?.method || "").toUpperCase()!=="POST"){
      return sendJson(res,405,{ok:false,marker:MARKER,code:"METHOD_NOT_ALLOWED"});
    }
    let transport;
    try{
      transport=validateRequest(parseRequestBody(req),env);
    }catch(error){
      const code=String(error?.message||"PLACE_AUDIT_REQUEST_INVALID");
      return sendJson(res,code==="PLACE_AUDIT_DEPLOYMENT_SHA_MISMATCH"?409:400,{ok:false,marker:MARKER,code});
    }
    const token=bearer(req);
    if(!token) return sendJson(res,401,{ok:false,marker:MARKER,code:"GITHUB_OIDC_TOKEN_REQUIRED"});
    try{
      await verifyOidc(token,{expectedSha:transport.workflow,policy:OIDC_POLICY});
    }catch(error){
      return sendJson(res,403,{ok:false,marker:MARKER,code:String(error?.message||"GITHUB_OIDC_REJECTED")});
    }
    try{
      const auditFn=audit || (await import("../scripts/audit-place-production-authority.mjs")).auditProduction;
      const evidence=await auditFn(env,clientFactory);
      if(evidence.state==="AUTHORITY_UNPROVEN"){
        return sendJson(res,409,{ok:false,marker:MARKER,code:"PLACE_PRODUCTION_TARGET_UNPROVEN",
          deployment_sha:transport.deployed,audit:evidence});
      }
      if(!new Set(["TARGET_CONFIRMED_COMPLETE","TARGET_CONFIRMED_GAP"]).has(evidence.state) || evidence.queried!==true){
        return sendJson(res,500,{ok:false,marker:MARKER,code:"PLACE_AUDIT_INVALID_EVIDENCE"});
      }
      return sendJson(res,200,{ok:true,marker:MARKER,read_only:true,
        deployment_sha:transport.deployed,workflow_sha:transport.workflow,audit:evidence});
    }catch(error){
      // Never reflect a raw database exception/connection string to the caller.
      console.error("ATLAS scoped Place authority read failed",{code:String(error?.code||"PLACE_AUDIT_EXECUTION_FAILED")});
      return sendJson(res,500,{ok:false,marker:MARKER,code:"PLACE_AUDIT_EXECUTION_FAILED"});
    }
  };
}
module.exports=Object.freeze({
  MARKER,AUDIENCE,OIDC_POLICY,productionRuntime,validateRequest,createPlaceProductionAuditHandler
});
