"use strict";

const path = require("node:path");
const { createPostgresClient } = require("./atlas-postgres-client.js");
const { verifyGitHubActionsOidc } = require("./atlas-stage2-train2-github-oidc.js");
const { applyReviewedEntityAuthoring, requireP5Schema } = require("./atlas-stage2-reviewed-entity-authoring.js");
const { applyReviewedRolePrerequisites } = require("./atlas-stage2-reviewed-role-authoring.js");
const { applyReviewedSourceAuthoring } = require("./atlas-stage2-reviewed-source-authoring.js");
const { applyReviewedPolityAuthoring } = require("./atlas-stage2-reviewed-polity-authoring.js");
const { applyReviewedGovernanceAuthoring } = require("./atlas-stage2-reviewed-governance-authoring.js");
const { createCorrectionV2TargetSnapshot } = require("./atlas-correction-v2-snapshot-service.js");
const { requiredSnapshotActivityIds } = require("./atlas-correction-v2-manifest-synthesizer.js");
const { synthesizeUnifiedCorrectionV2Manifest } = require("./atlas-correction-v2-unified-plan-synthesizer.js");
const { createUnifiedCorrectionManifestV2Service } = require("./atlas-correction-manifest-v2-unified-service.js");
const {
  inspectCorrectionLedgerCompatibility,
  applyCorrectionLedgerV2Compatibility
} = require("./atlas-stage2-correction-ledger-compat.js");
const { inspectP9Cutover, applyP9Cutover } = require("./atlas-stage2-p9-db-cutover.js");
const { personMergeExecutionState } = require("./atlas-person-merge-interlock.js");

const MARKER = "ATLAS_STAGE2_TRAIN2_RELEASE_V1";
const RELEASE_ID = "stage2_train2_data_p9_20260814_v1";
const MODES = new Set(["preflight","entities_dry_run","entities_apply","roles_dry_run","roles_apply","source_dry_run","source_apply","polity_dry_run","polity_apply","governance_dry_run","governance_apply","correction_schema_dry_run","correction_schema_apply","correction_dry_run","correction_apply","p9_dry_run","p9_apply","final_verify"]);
const ROOT = path.resolve(__dirname,"..");

function json(res,status,body){res.statusCode=status;res.setHeader("content-type","application/json; charset=utf-8");res.setHeader("cache-control","no-store");res.end(JSON.stringify(body));}
function bearer(req){const m=/^Bearer ([^\s]+)$/.exec(String(req?.headers?.authorization||""));return m?m[1]:null;}
function body(req){if(req?.body&&typeof req.body==="object"&&!Buffer.isBuffer(req.body))return req.body;if(typeof req?.body==="string")return JSON.parse(req.body);throw new Error("TRAIN2_BODY_REQUIRED");}
function requireEnvelope(raw){const deploymentSha=String(raw?.deployment_sha||"").trim().toLowerCase();if(!/^[0-9a-f]{40}$/.test(deploymentSha))throw new Error("TRAIN2_SHA_REQUIRED");const releaseId=String(raw?.release_id||"");if(releaseId!==RELEASE_ID)throw new Error("TRAIN2_RELEASE_ID_MISMATCH");if(String(raw?.approval||"")!==`APPLY:${RELEASE_ID}`)throw new Error("TRAIN2_APPROVAL_REQUIRED");const mode=String(raw?.mode||"");if(!MODES.has(mode))throw new Error("TRAIN2_MODE_INVALID");return {deploymentSha,releaseId,mode,raw};}
function requireDeployment(env,sha){if(env?.VERCEL_ENV!=="production"||env?.VERCEL_GIT_COMMIT_REF!=="main")throw new Error("TRAIN2_NOT_PRODUCTION_MAIN");if(env?.VERCEL_GIT_REPO_OWNER!=="JezCH"||env?.VERCEL_GIT_REPO_SLUG!=="atlas-person-db")throw new Error("TRAIN2_REPOSITORY_MISMATCH");if(String(env?.VERCEL_GIT_COMMIT_SHA||"").toLowerCase()!==sha)throw new Error("DEPLOYMENT_SHA_MISMATCH");}
function reviewedPath(value,kind){const rel=String(value||"");const patterns={source:/^stage2\/authoring\/p7-[A-Za-z0-9._-]+\.v1\.json$/,polity:/^stage2\/authoring\/p7-[A-Za-z0-9._-]+\.v1\.json$/,governance:/^stage2\/authoring\/p7-[A-Za-z0-9._-]+\.v1\.json$/};if(!patterns[kind].test(rel))throw new Error(`TRAIN2_${kind.toUpperCase()}_PATH_REJECTED`);return path.resolve(ROOT,rel);}
function status(code){if(code==="DEPLOYMENT_SHA_MISMATCH"||String(code).includes("DRIFT")||String(code).includes("DUPLICATE")||String(code).includes("COLLISION")||String(code).includes("SPLIT_BRAIN"))return 409;if(String(code).includes("OIDC")||String(code).includes("APPROVAL"))return 403;if(String(code).includes("NOT_PRODUCTION")||String(code).includes("SUPABASE"))return 503;return 400;}

function createStage2Train2ReleaseHandler({env=process.env,verifyOidc=verifyGitHubActionsOidc,createClient=createPostgresClient}={}){
 return async function handler(req,res){
  if(req?.method!=="POST")return json(res,405,{ok:false,marker:MARKER,code:"METHOD_NOT_ALLOWED"});
  let p;try{p=requireEnvelope(body(req));requireDeployment(env,p.deploymentSha);}catch(e){const code=String(e?.message||"TRAIN2_REQUEST_REJECTED");return json(res,status(code),{ok:false,marker:MARKER,code});}
  const token=bearer(req);if(!token)return json(res,401,{ok:false,marker:MARKER,code:"TRAIN2_OIDC_TOKEN_REQUIRED"});
  try{await verifyOidc(token,{expectedSha:p.deploymentSha});}catch(e){return json(res,403,{ok:false,marker:MARKER,code:String(e?.message||"TRAIN2_OIDC_REJECTED")});}
  const databaseUrl=String(env?.SUPABASE_DB_URL||"");if(!/^postgres(?:ql)?:\/\//.test(databaseUrl))return json(res,503,{ok:false,marker:MARKER,code:"SUPABASE_DB_URL_REQUIRED"});
  let client;try{
    client=await createClient(databaseUrl,{env});
    const dry=p.mode.endsWith("_dry_run");let result;
    if(p.mode==="preflight"){
      await requireP5Schema(client);
      const correctionSchema=await inspectCorrectionLedgerCompatibility(client);
      if(!correctionSchema.table_present||!correctionSchema.constraint_present)throw new Error("TRAIN2_CORRECTION_LEDGER_SCHEMA_REQUIRED");
      if(!correctionSchema.predecessor_compatible)throw new Error("TRAIN2_CORRECTION_LEDGER_CONSTRAINT_DRIFT");
      result={schema_ready:true,correction_schema:correctionSchema,p9:await inspectP9Cutover(client),person_merge:personMergeExecutionState()};
    }
    else if(p.mode.startsWith("entities_"))result=await applyReviewedEntityAuthoring(client,{dryRun:dry});
    else if(p.mode.startsWith("roles_"))result=await applyReviewedRolePrerequisites(client,{dryRun:dry});
    else if(p.mode.startsWith("source_"))result=await applyReviewedSourceAuthoring(client,{dryRun:dry,manifestPath:reviewedPath(p.raw.manifest_path,"source")});
    else if(p.mode.startsWith("polity_"))result=await applyReviewedPolityAuthoring(client,{dryRun:dry,manifestPath:reviewedPath(p.raw.manifest_path,"polity")});
    else if(p.mode.startsWith("governance_"))result=await applyReviewedGovernanceAuthoring(client,{dryRun:dry,manifestPath:reviewedPath(p.raw.manifest_path,"governance")});
    else if(p.mode.startsWith("correction_schema_"))result=await applyCorrectionLedgerV2Compatibility(client,{dryRun:dry});
    else if(p.mode.startsWith("correction_")){
      const correctionSchema=await inspectCorrectionLedgerCompatibility(client);if(!correctionSchema.ready)throw new Error("TRAIN2_CORRECTION_LEDGER_V2_NOT_READY");
      const plan=p.raw.plan;if(!plan||plan.schema!=="atlas-stage2-correction-v2-execution-plan/v1")throw new Error("TRAIN2_CORRECTION_PLAN_INVALID");
      const ids=requiredSnapshotActivityIds(plan);const snapshot=await createCorrectionV2TargetSnapshot(client,ids);const manifest=synthesizeUnifiedCorrectionV2Manifest(plan,snapshot);const service=createUnifiedCorrectionManifestV2Service({client});result={snapshot_digest:snapshot.snapshot_digest,manifest_sha256:manifest.manifest_sha256,outcome:await service.execute(manifest,{dryRun:dry})};
    }
    else if(p.mode.startsWith("p9_"))result=await applyP9Cutover(client,{dryRun:dry});
    else if(p.mode==="final_verify"){
      const correctionSchema=await inspectCorrectionLedgerCompatibility(client),p9=await inspectP9Cutover(client),merge=personMergeExecutionState();if(!correctionSchema.ready)throw new Error("TRAIN2_CORRECTION_LEDGER_V2_NOT_READY");if(p9.old_index_present||!p9.new_index_present||p9.duplicate_groups!==0)throw new Error("TRAIN2_P9_FINAL_VERIFY_FAILED");if(merge.allowed!==false||merge.person_merge_lifecycle_version!=="pre-p10-blocked")throw new Error("TRAIN2_P10_INTERLOCK_FAILED");result={correction_schema:correctionSchema,p9,person_merge:merge};
    }
    return json(res,200,{ok:true,marker:MARKER,mode:p.mode,deployment_sha:p.deploymentSha,release_id:RELEASE_ID,result});
  }catch(e){const code=String(e?.message||"TRAIN2_FAILED");return json(res,status(code),{ok:false,marker:MARKER,mode:p.mode,code});}
  finally{if(client&&typeof client.end==="function")try{await client.end();}catch{}}
 };
}
module.exports=Object.freeze({MARKER,RELEASE_ID,MODES,createStage2Train2ReleaseHandler,requireEnvelope,requireDeployment,reviewedPath});
