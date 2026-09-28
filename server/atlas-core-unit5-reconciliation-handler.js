"use strict";

const { createPostgresClient }=require("./atlas-postgres-client.js");
const { verifyGitHubActionsOidcWithPolicyOnly }=require("./atlas-github-oidc.js");
const { applyAuthoringMigrations }=require("./atlas-authoring-migrations.js");
const {
  createUnit5ReconciliationService,
  MARKER,
  MANIFEST_SCHEMA
}=require("./atlas-core-unit5-reconciliation-service.js");
const { sendJson }=require("./atlas-normalized-read-handler.js");

const AUDIENCE="atlas-person-db-core-unit5";
const SHA_RE=/^[0-9a-f]{40}$/;
const OIDC_POLICY=Object.freeze({
  audience:AUDIENCE,
  repository:"JezCH/atlas-person-db",
  repositoryId:"1319427399",
  ref:"refs/heads/main",
  workflowRef:"JezCH/atlas-person-db/.github/workflows/atlas-core-unit5-reconcile.yml@refs/heads/main",
  environment:"production",
  allowedEvents:new Set(["push","workflow_dispatch","issue_comment","schedule","pull_request_target"])
});

function bearerToken(req) {
  const raw=String(req?.headers?.authorization || req?.headers?.Authorization || "").trim();
  const match=/^Bearer\s+([^\s]+)$/i.exec(raw);
  return match ? match[1] : null;
}

function parseBody(req) {
  if (req?.body && typeof req.body==="object" && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req?.body==="string") {
    try { return JSON.parse(req.body); } catch { throw new Error("UNIT5_RECONCILIATION_INVALID_JSON"); }
  }
  throw new Error("UNIT5_RECONCILIATION_BODY_REQUIRED");
}

function runtimeSha(env) {
  if (env?.VERCEL_ENV !== "production") throw new Error("UNIT5_RECONCILIATION_NOT_PRODUCTION");
  if (env?.VERCEL_GIT_COMMIT_REF !== "main") throw new Error("UNIT5_RECONCILIATION_NOT_MAIN");
  const sha=String(env?.VERCEL_GIT_COMMIT_SHA || "").trim().toLowerCase();
  if (!SHA_RE.test(sha)) throw new Error("UNIT5_RECONCILIATION_RUNTIME_SHA_REQUIRED");
  return sha;
}

function createUnit5ReconciliationHandler({
  env=process.env,
  clientFactory=createPostgresClient,
  verifyOidc=verifyGitHubActionsOidcWithPolicyOnly,
  applyMigrations=applyAuthoringMigrations
}={}) {
  return async function handler(req,res) {
    if (String(req?.method || "").toUpperCase() !== "POST") {
      sendJson(res,405,{ok:false,marker:MARKER,code:"METHOD_NOT_ALLOWED"});
      return;
    }

    let body;
    let deployedSha;
    try {
      body=parseBody(req);
      deployedSha=runtimeSha(env);
      const workflowSha=String(body?.workflow_sha || "").trim().toLowerCase();
      if (!SHA_RE.test(workflowSha)) throw new Error("UNIT5_RECONCILIATION_WORKFLOW_SHA_REQUIRED");
      if (!body.manifest || body.manifest.schema !== MANIFEST_SCHEMA) throw new Error("UNIT5_RECONCILIATION_MANIFEST_REQUIRED");
    } catch(error) {
      const code=String(error?.message || "UNIT5_RECONCILIATION_INVALID_REQUEST");
      sendJson(res,400,{ok:false,marker:MARKER,code,runtime_sha:deployedSha || null});
      return;
    }

    const token=bearerToken(req);
    if (!token) {
      sendJson(res,401,{ok:false,marker:MARKER,code:"GITHUB_OIDC_TOKEN_REQUIRED"});
      return;
    }
    let oidcClaims;
    try {
      oidcClaims=await verifyOidc(token,{policy:OIDC_POLICY});
      const workflowSha=String(body.workflow_sha).trim().toLowerCase();
      const claimSha=String(oidcClaims?.sha || "").trim().toLowerCase();
      if (!SHA_RE.test(claimSha) || claimSha !== workflowSha) throw new Error("GITHUB_OIDC_SHA_MISMATCH");
    } catch(error) {
      sendJson(res,403,{ok:false,marker:MARKER,code:String(error?.message || "GITHUB_OIDC_REJECTED")});
      return;
    }

    const databaseUrl=String(env?.SUPABASE_DB_URL || "").trim();
    if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) {
      sendJson(res,503,{ok:false,marker:MARKER,code:"SUPABASE_DB_URL_REQUIRED"});
      return;
    }

    let client=null;
    try {
      client=await clientFactory(databaseUrl,{env});
      const migration=await applyMigrations(client);
      const outcome=await createUnit5ReconciliationService({client}).execute(body.manifest,{dryRun:body?.dry_run === true});
      sendJson(res,200,{
        ok:true,
        marker:MARKER,
        runtime_sha:deployedSha,
        workflow_sha:String(body.workflow_sha).trim().toLowerCase(),
        migration,
        outcome
      });
    } catch(error) {
      sendJson(res,500,{ok:false,marker:MARKER,code:"UNIT5_RECONCILIATION_FAILED",error:String(error?.message || error)});
    } finally {
      if (client && typeof client.end==="function") {
        try { await client.end(); } catch {}
      }
    }
  };
}

module.exports=Object.freeze({
  AUDIENCE,
  OIDC_POLICY,
  bearerToken,
  parseBody,
  runtimeSha,
  createUnit5ReconciliationHandler
});
