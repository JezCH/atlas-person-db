"use strict";

const { createPostgresClient } = require("./atlas-postgres-client.js");
const { verifyGitHubActionsOidcWithPolicy } = require("./atlas-github-oidc.js");
const { applyRuntimeMigrations } = require("./atlas-runtime-migrations.js");
const { compileRuntimeProjection } = require("./atlas-runtime-compile-service.js");
const { sendJson } = require("./atlas-normalized-read-handler.js");

const SHA_RE = /^[0-9a-f]{40}$/;
const RUNTIME_COMPILE_MARKER = "ATLAS_RUNTIME_COMPILE_TRANSPORT_V1";
const RUNTIME_COMPILE_AUDIENCE = "atlas-person-db-runtime-compile";
const OIDC_POLICY = Object.freeze({
  audience: RUNTIME_COMPILE_AUDIENCE,
  repository: "JezCH/atlas-person-db",
  repositoryId: "1319427399",
  ref: "refs/heads/main",
  workflowRef: "JezCH/atlas-person-db/.github/workflows/atlas-runtime-compile.yml@refs/heads/main",
  environment: "production",
  allowedEvents: new Set(["workflow_run", "workflow_dispatch"])
});

function bearerToken(req) {
  const value = String(req?.headers?.authorization || req?.headers?.Authorization || "").trim();
  const match = /^Bearer\s+([^\s]+)$/i.exec(value);
  return match ? match[1] : null;
}

function runtimeIdentity(env) {
  if (env?.VERCEL_ENV !== "production") throw new Error("RUNTIME_COMPILE_NOT_PRODUCTION");
  if (env?.VERCEL_GIT_COMMIT_REF !== "main") throw new Error("RUNTIME_COMPILE_NOT_MAIN");
  if (String(env?.VERCEL_GIT_REPO_OWNER || "").trim() !== "JezCH") throw new Error("RUNTIME_COMPILE_REPOSITORY_MISMATCH");
  if (String(env?.VERCEL_GIT_REPO_SLUG || "").trim() !== "atlas-person-db") throw new Error("RUNTIME_COMPILE_REPOSITORY_MISMATCH");
  const runtimeSha = String(env?.VERCEL_GIT_COMMIT_SHA || "").trim().toLowerCase();
  if (!SHA_RE.test(runtimeSha)) throw new Error("RUNTIME_COMPILE_RUNTIME_SHA_REQUIRED");
  return Object.freeze({ runtime_sha:runtimeSha, branch:"main", repository:"JezCH/atlas-person-db" });
}

function parseBody(req) {
  if (req?.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req?.body === "string") {
    try { return JSON.parse(req.body); } catch { throw new Error("RUNTIME_COMPILE_INVALID_JSON"); }
  }
  throw new Error("RUNTIME_COMPILE_BODY_REQUIRED");
}

function requirePayload(body) {
  const runtimeSha = String(body?.runtime_sha || "").trim().toLowerCase();
  const authoringSha = String(body?.authoring_sha || "").trim().toLowerCase();
  if (!SHA_RE.test(runtimeSha)) throw new Error("RUNTIME_COMPILE_RUNTIME_SHA_REQUIRED");
  if (!SHA_RE.test(authoringSha)) throw new Error("RUNTIME_COMPILE_AUTHORING_SHA_REQUIRED");
  return Object.freeze({ runtimeSha, authoringSha, dryRun:body?.dry_run === true });
}

function createRuntimeCompileHandler({
  env = process.env,
  clientFactory = createPostgresClient,
  verifyOidc = verifyGitHubActionsOidcWithPolicy,
  applyMigrations = applyRuntimeMigrations,
  compileProjection = compileRuntimeProjection
} = {}) {
  return async function handler(req, res) {
    if (String(req?.method || "").toUpperCase() !== "POST") {
      sendJson(res, 405, { ok:false, marker:RUNTIME_COMPILE_MARKER, code:"METHOD_NOT_ALLOWED" });
      return;
    }

    let payload;
    let runtime;
    try {
      payload = requirePayload(parseBody(req));
      runtime = runtimeIdentity(env);
      if (runtime.runtime_sha !== payload.runtimeSha) throw new Error("RUNTIME_COMPILE_RUNTIME_SHA_MISMATCH");
    } catch (error) {
      const code = String(error?.message || "RUNTIME_COMPILE_INVALID_REQUEST");
      sendJson(res, code === "RUNTIME_COMPILE_RUNTIME_SHA_MISMATCH" ? 409 : 400, { ok:false, marker:RUNTIME_COMPILE_MARKER, code, runtime_sha:runtime?.runtime_sha || null });
      return;
    }

    const token = bearerToken(req);
    if (!token) {
      sendJson(res, 401, { ok:false, marker:RUNTIME_COMPILE_MARKER, code:"GITHUB_OIDC_TOKEN_REQUIRED" });
      return;
    }
    try {
      await verifyOidc(token, { expectedSha:payload.authoringSha, policy:OIDC_POLICY });
    } catch (error) {
      sendJson(res, 403, { ok:false, marker:RUNTIME_COMPILE_MARKER, code:String(error?.message || "GITHUB_OIDC_REJECTED") });
      return;
    }

    const databaseUrl = String(env?.SUPABASE_DB_URL || "").trim();
    if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) {
      sendJson(res, 503, { ok:false, marker:RUNTIME_COMPILE_MARKER, code:"SUPABASE_DB_URL_REQUIRED" });
      return;
    }

    let client = null;
    try {
      client = await clientFactory(databaseUrl, { env });
      const migration = await applyMigrations(client);
      const outcome = await compileProjection(client, { dryRun:payload.dryRun });
      sendJson(res, 200, {
        ok:true,
        marker:RUNTIME_COMPILE_MARKER,
        source:"runtime-person-politics-v1",
        runtime_sha:payload.runtimeSha,
        authoring_sha:payload.authoringSha,
        migration,
        outcome
      });
    } catch (error) {
      sendJson(res, 500, { ok:false, marker:RUNTIME_COMPILE_MARKER, code:"RUNTIME_COMPILE_FAILED", error:error?.message || String(error) });
    } finally {
      if (client && typeof client.end === "function") {
        try { await client.end(); } catch {}
      }
    }
  };
}

module.exports = Object.freeze({
  createRuntimeCompileHandler,
  runtimeIdentity,
  requirePayload,
  bearerToken,
  OIDC_POLICY,
  RUNTIME_COMPILE_MARKER,
  RUNTIME_COMPILE_AUDIENCE
});
