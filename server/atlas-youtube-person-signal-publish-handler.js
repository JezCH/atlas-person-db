"use strict";

const { createPostgresClient } = require("./atlas-postgres-client.js");
const { verifyGitHubActionsOidcWithPolicy } = require("./atlas-github-oidc.js");
const { sendJson } = require("./atlas-normalized-read-handler.js");
const {
  applyYoutubeSignalMigrations,
  publishYoutubePersonSignalSnapshot
} = require("./atlas-youtube-person-signal-publish-service.js");

const SHA_RE=/^[0-9a-f]{40}$/;
const PUBLISH_MARKER="ATLAS_YOUTUBE_PERSON_SIGNAL_PUBLICATION_V2";
const PUBLISH_AUDIENCE="atlas-person-db-youtube-signal-publish";
const OIDC_POLICY=Object.freeze({
  audience:PUBLISH_AUDIENCE,
  repository:"JezCH/atlas-person-db",
  repositoryId:"1319427399",
  ref:"refs/heads/main",
  workflowRef:"JezCH/atlas-person-db/.github/workflows/youtube-person-signal-publish.yml@refs/heads/main",
  environment:"production",
  allowedEvents:new Set(["push","workflow_dispatch"])
});

function bearerToken(req) {
  const value=String(req?.headers?.authorization || req?.headers?.Authorization || "").trim();
  const match=/^Bearer\s+([^\s]+)$/i.exec(value);
  return match ? match[1] : null;
}

function runtimeIdentity(env) {
  if(env?.VERCEL_ENV!=="production") throw new Error("YOUTUBE_PUBLICATION_NOT_PRODUCTION");
  if(env?.VERCEL_GIT_COMMIT_REF!=="main") throw new Error("YOUTUBE_PUBLICATION_NOT_MAIN");
  if(String(env?.VERCEL_GIT_REPO_OWNER || "").trim()!=="JezCH") throw new Error("YOUTUBE_PUBLICATION_REPOSITORY_MISMATCH");
  if(String(env?.VERCEL_GIT_REPO_SLUG || "").trim()!=="atlas-person-db") throw new Error("YOUTUBE_PUBLICATION_REPOSITORY_MISMATCH");
  const sha=String(env?.VERCEL_GIT_COMMIT_SHA || "").trim().toLowerCase();
  if(!SHA_RE.test(sha)) throw new Error("YOUTUBE_PUBLICATION_RUNTIME_SHA_REQUIRED");
  return Object.freeze({ runtime_sha:sha });
}

function parseBody(req) {
  if(req?.body && typeof req.body==="object" && !Buffer.isBuffer(req.body)) return req.body;
  if(typeof req?.body==="string") {
    try { return JSON.parse(req.body); } catch { throw new Error("YOUTUBE_PUBLICATION_INVALID_JSON"); }
  }
  throw new Error("YOUTUBE_PUBLICATION_BODY_REQUIRED");
}

function requireTransport(body) {
  const runtimeSha=String(body?.runtime_sha || "").trim().toLowerCase();
  const publicationSha=String(body?.publication_sha || "").trim().toLowerCase();
  if(!SHA_RE.test(runtimeSha)) throw new Error("YOUTUBE_PUBLICATION_RUNTIME_SHA_REQUIRED");
  if(!SHA_RE.test(publicationSha)) throw new Error("YOUTUBE_PUBLICATION_SHA_REQUIRED");
  return Object.freeze({ runtimeSha,publicationSha });
}

function createYoutubePersonSignalPublishHandler({
  env=process.env,
  clientFactory=createPostgresClient,
  verifyOidc=verifyGitHubActionsOidcWithPolicy,
  applyMigrations=applyYoutubeSignalMigrations,
  publish=publishYoutubePersonSignalSnapshot
}={}) {
  return async function handler(req,res) {
    if(String(req?.method || "").toUpperCase()!=="POST") {
      sendJson(res,405,{ ok:false,marker:PUBLISH_MARKER,code:"METHOD_NOT_ALLOWED" });
      return;
    }

    let body;
    let transport;
    let runtime;
    try {
      body=parseBody(req);
      transport=requireTransport(body);
      runtime=runtimeIdentity(env);
      if(runtime.runtime_sha!==transport.runtimeSha) throw new Error("YOUTUBE_PUBLICATION_RUNTIME_SHA_MISMATCH");
    } catch(error) {
      const code=String(error?.message || "YOUTUBE_PUBLICATION_INVALID_REQUEST");
      sendJson(res,code==="YOUTUBE_PUBLICATION_RUNTIME_SHA_MISMATCH" ? 409 : 400,{
        ok:false,marker:PUBLISH_MARKER,code,runtime_sha:runtime?.runtime_sha || null
      });
      return;
    }

    const token=bearerToken(req);
    if(!token) {
      sendJson(res,401,{ ok:false,marker:PUBLISH_MARKER,code:"GITHUB_OIDC_TOKEN_REQUIRED" });
      return;
    }
    try {
      await verifyOidc(token,{ expectedSha:transport.publicationSha,policy:OIDC_POLICY });
    } catch(error) {
      sendJson(res,403,{ ok:false,marker:PUBLISH_MARKER,code:String(error?.message || "GITHUB_OIDC_REJECTED") });
      return;
    }

    const databaseUrl=String(env?.SUPABASE_DB_URL || "").trim();
    if(!/^postgres(?:ql)?:\/\//.test(databaseUrl)) {
      sendJson(res,503,{ ok:false,marker:PUBLISH_MARKER,code:"SUPABASE_DB_URL_REQUIRED" });
      return;
    }

    let client=null;
    try {
      client=await clientFactory(databaseUrl,{ env });
      const migration=await applyMigrations(client);
      const outcome=await publish(client,body);
      sendJson(res,200,{
        ok:true,
        marker:PUBLISH_MARKER,
        runtime_sha:transport.runtimeSha,
        publication_sha:transport.publicationSha,
        migration,
        outcome
      });
    } catch(error) {
      console.error("ATLAS YouTube signal publication failed",error);
      sendJson(res,500,{
        ok:false,
        marker:PUBLISH_MARKER,
        code:"YOUTUBE_PUBLICATION_FAILED",
        error:error?.message || String(error)
      });
    } finally {
      if(client && typeof client.end==="function") {
        try { await client.end(); } catch {}
      }
    }
  };
}

module.exports=Object.freeze({
  createYoutubePersonSignalPublishHandler,
  bearerToken,
  runtimeIdentity,
  requireTransport,
  OIDC_POLICY,
  PUBLISH_MARKER,
  PUBLISH_AUDIENCE
});
