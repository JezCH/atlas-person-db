"use strict";

const { createPostgresClient } = require("./atlas-postgres-client.js");
const { verifyGitHubActionsOidcWithPolicy } = require("./atlas-github-oidc.js");
const { sendJson } = require("./atlas-normalized-read-handler.js");
const {
  applyYoutubeSourceArchiveMigrations,
  publishYoutubeSourceArchiveCatalog,
  readYoutubeSourceArchiveCatalog
} = require("./atlas-youtube-source-archive-service.js");

const SHA_RE=/^[0-9a-f]{40}$/;
const MARKER="ATLAS_YOUTUBE_SOURCE_ARCHIVE_CATALOG_V1";
const AUDIENCE="atlas-person-db-youtube-source-archive";
const OIDC_POLICY=Object.freeze({
  audience:AUDIENCE,
  repository:"JezCH/atlas-person-db",
  repositoryId:"1319427399",
  ref:"refs/heads/main",
  workflowRef:"JezCH/atlas-person-db/.github/workflows/youtube-preserve-verified-corpus.yml@refs/heads/main",
  environment:"production",
  allowedEvents:new Set(["workflow_dispatch"])
});

function bearerToken(req){
  const value=String(req?.headers?.authorization || req?.headers?.Authorization || "").trim();
  const match=/^Bearer\s+([^\s]+)$/i.exec(value);
  return match ? match[1] : null;
}
function runtimeIdentity(env){
  if(env?.VERCEL_ENV!=="production") throw new Error("YOUTUBE_SOURCE_ARCHIVE_NOT_PRODUCTION");
  if(env?.VERCEL_GIT_COMMIT_REF!=="main") throw new Error("YOUTUBE_SOURCE_ARCHIVE_NOT_MAIN");
  if(String(env?.VERCEL_GIT_REPO_OWNER || "").trim()!=="JezCH" ||
     String(env?.VERCEL_GIT_REPO_SLUG || "").trim()!=="atlas-person-db"){
    throw new Error("YOUTUBE_SOURCE_ARCHIVE_REPOSITORY_MISMATCH");
  }
  const sha=String(env?.VERCEL_GIT_COMMIT_SHA || "").trim().toLowerCase();
  if(!SHA_RE.test(sha)) throw new Error("YOUTUBE_SOURCE_ARCHIVE_RUNTIME_SHA_REQUIRED");
  return Object.freeze({runtime_sha:sha});
}
function parseBody(req){
  if(req?.body && typeof req.body==="object" && !Buffer.isBuffer(req.body)) return req.body;
  if(typeof req?.body==="string"){
    try{return JSON.parse(req.body);}catch{throw new Error("YOUTUBE_SOURCE_ARCHIVE_INVALID_JSON");}
  }
  throw new Error("YOUTUBE_SOURCE_ARCHIVE_BODY_REQUIRED");
}
function requireTransport(body){
  const runtimeSha=String(body?.runtime_sha || "").trim().toLowerCase();
  const publicationSha=String(body?.publication_sha || "").trim().toLowerCase();
  if(!SHA_RE.test(runtimeSha)) throw new Error("YOUTUBE_SOURCE_ARCHIVE_RUNTIME_SHA_REQUIRED");
  if(!SHA_RE.test(publicationSha)) throw new Error("YOUTUBE_SOURCE_ARCHIVE_PUBLICATION_SHA_REQUIRED");
  const operation=String(body?.operation || "publish_catalog").trim();
  if(!new Set(["publish_catalog","read_catalog"]).has(operation)){
    throw new Error("YOUTUBE_SOURCE_ARCHIVE_OPERATION_INVALID");
  }
  return Object.freeze({runtimeSha,publicationSha,operation});
}

function createYoutubeSourceArchiveHandler({
  env=process.env,
  clientFactory=createPostgresClient,
  verifyOidc=verifyGitHubActionsOidcWithPolicy,
  applyMigrations=applyYoutubeSourceArchiveMigrations,
  publish=publishYoutubeSourceArchiveCatalog,
  readCatalog=readYoutubeSourceArchiveCatalog
}={}){
  return async function archiveHandler(req,res){
    if(String(req?.method || "").toUpperCase()!=="POST"){
      return sendJson(res,405,{ok:false,marker:MARKER,code:"METHOD_NOT_ALLOWED"});
    }
    let body,transport,runtime;
    try{
      body=parseBody(req);
      transport=requireTransport(body);
      runtime=runtimeIdentity(env);
      if(runtime.runtime_sha!==transport.runtimeSha) throw new Error("YOUTUBE_SOURCE_ARCHIVE_RUNTIME_SHA_MISMATCH");
    }catch(error){
      const code=String(error?.message || "YOUTUBE_SOURCE_ARCHIVE_INVALID_REQUEST");
      return sendJson(res,code==="YOUTUBE_SOURCE_ARCHIVE_RUNTIME_SHA_MISMATCH"?409:400,{
        ok:false,marker:MARKER,code,runtime_sha:runtime?.runtime_sha || null
      });
    }
    const token=bearerToken(req);
    if(!token) return sendJson(res,401,{ok:false,marker:MARKER,code:"GITHUB_OIDC_TOKEN_REQUIRED"});
    try{
      await verifyOidc(token,{expectedSha:transport.publicationSha,policy:OIDC_POLICY});
    }catch(error){
      return sendJson(res,403,{ok:false,marker:MARKER,code:String(error?.message || "GITHUB_OIDC_REJECTED")});
    }
    const databaseUrl=String(env?.SUPABASE_DB_URL || "").trim();
    if(!/^postgres(?:ql)?:\/\//.test(databaseUrl)){
      return sendJson(res,503,{ok:false,marker:MARKER,code:"SUPABASE_DB_URL_REQUIRED"});
    }
    let client=null;
    try{
      client=await clientFactory(databaseUrl,{env});
      const migration=transport.operation==="publish_catalog"
        ? await applyMigrations(client)
        : Object.freeze({applied:[]});
      const outcome=transport.operation==="read_catalog"
        ? await readCatalog(client,body?.source_artifact_id)
        : await publish(client,body);
      return sendJson(res,200,{
        ok:true,marker:MARKER,operation:transport.operation,
        runtime_sha:transport.runtimeSha,publication_sha:transport.publicationSha,
        migration,outcome
      });
    }catch(error){
      console.error("ATLAS YouTube source archive catalog failed",error);
      return sendJson(res,500,{
        ok:false,marker:MARKER,code:"YOUTUBE_SOURCE_ARCHIVE_CATALOG_FAILED",
        error:error?.message || String(error)
      });
    }finally{
      if(client && typeof client.end==="function"){
        try{await client.end();}catch{}
      }
    }
  };
}

module.exports=Object.freeze({
  createYoutubeSourceArchiveHandler,
  bearerToken,
  runtimeIdentity,
  requireTransport,
  OIDC_POLICY,
  MARKER,
  AUDIENCE
});
