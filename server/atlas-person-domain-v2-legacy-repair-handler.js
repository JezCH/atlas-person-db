"use strict";

const { requireEnv } = require("./atlas-session-auth.js");
const { verifyLegacyRepairGithubOidc } = require("./atlas-person-domain-v2-legacy-repair-github-oidc.js");
const { inspectLegacyDomainRepair, applyLegacyDomainRepair } = require("./atlas-person-domain-v2-legacy-repair-service.js");

const MARKER = "ATLAS_PERSON_DOMAIN_V2_LEGACY_RESIDUAL_REPAIR";
const SHA_RE = /^[0-9a-f]{40}$/;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}
function bearerToken(req) {
  const match = String(req?.headers?.authorization || req?.headers?.Authorization || "").trim().match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}
function parseBody(req) {
  if (req?.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req?.body === "string") {
    try { return JSON.parse(req.body); } catch { throw new Error("PERSON_DOMAIN_LEGACY_REPAIR_INVALID_JSON"); }
  }
  return {};
}
function runtimeIdentity(env) {
  if (env?.VERCEL_ENV !== "production") throw new Error("PERSON_DOMAIN_LEGACY_REPAIR_NOT_PRODUCTION");
  if (env?.VERCEL_GIT_COMMIT_REF !== "main") throw new Error("PERSON_DOMAIN_LEGACY_REPAIR_NOT_MAIN");
  const runtime_sha = String(env?.VERCEL_GIT_COMMIT_SHA || "").trim().toLowerCase();
  if (!SHA_RE.test(runtime_sha)) throw new Error("VERCEL_GIT_COMMIT_SHA_REQUIRED");
  if (String(env?.VERCEL_GIT_REPO_OWNER || "").trim() !== "JezCH" || String(env?.VERCEL_GIT_REPO_SLUG || "").trim() !== "atlas-person-db") {
    throw new Error("PERSON_DOMAIN_LEGACY_REPAIR_REPOSITORY_MISMATCH");
  }
  return Object.freeze({ runtime_sha });
}
function statusForError(code) {
  if (/OIDC|UNAUTHORIZED/.test(code)) return 403;
  if (/CONFLICT|MISMATCH|POSTCONDITION|NOT_FOUND|UNSUPPORTED|REQUIRED/.test(code)) return 409;
  if (/NOT_PRODUCTION|NOT_MAIN|REPOSITORY|SUPABASE|DATABASE/.test(code)) return 503;
  return 500;
}

function createLegacyDomainRepairHandler({ clientFactory, env = process.env, verifyOidc = verifyLegacyRepairGithubOidc } = {}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");
  return async function handler(req, res) {
    const method = String(req?.method || "GET").toUpperCase();
    if (method !== "GET" && method !== "POST") return json(res, 405, { ok:false, marker:MARKER, code:"METHOD_NOT_ALLOWED" });

    let runtime;
    try { runtime = runtimeIdentity(env); }
    catch (error) {
      const code = String(error?.message || "RUNTIME_REJECTED");
      return json(res, statusForError(code), { ok:false, marker:MARKER, code });
    }

    let databaseUrl;
    try { databaseUrl = requireEnv(env, "SUPABASE_DB_URL"); }
    catch { return json(res, 503, { ok:false, marker:MARKER, runtime_sha:runtime.runtime_sha, code:"SUPABASE_DB_URL_REQUIRED" }); }

    if (method === "POST") {
      let body;
      try { body = parseBody(req); }
      catch (error) { return json(res, 400, { ok:false, marker:MARKER, runtime_sha:runtime.runtime_sha, code:String(error.message) }); }
      const workflowSha = String(body?.workflow_sha || "").trim().toLowerCase();
      if (!SHA_RE.test(workflowSha) || workflowSha !== runtime.runtime_sha) {
        return json(res, 409, { ok:false, marker:MARKER, runtime_sha:runtime.runtime_sha, code:"PERSON_DOMAIN_LEGACY_REPAIR_RUNTIME_SHA_MISMATCH" });
      }
      const token = bearerToken(req);
      if (!token) return json(res, 401, { ok:false, marker:MARKER, runtime_sha:runtime.runtime_sha, code:"GITHUB_OIDC_TOKEN_REQUIRED" });
      try { await verifyOidc(token, { expectedSha:workflowSha }); }
      catch (error) {
        return json(res, 403, { ok:false, marker:MARKER, runtime_sha:runtime.runtime_sha, code:String(error?.message || "GITHUB_OIDC_REJECTED") });
      }
    }

    let client = null;
    try {
      client = await clientFactory(databaseUrl, { env });
      const state = method === "POST"
        ? await applyLegacyDomainRepair(client)
        : await inspectLegacyDomainRepair(client);
      console.log(JSON.stringify({ marker:MARKER, method, runtime_sha:runtime.runtime_sha, state }));
      return json(res, 200, { ok:true, marker:MARKER, runtime_sha:runtime.runtime_sha, state });
    } catch (error) {
      const code = String(error?.message || "PERSON_DOMAIN_LEGACY_REPAIR_FAILED");
      return json(res, statusForError(code), { ok:false, marker:MARKER, runtime_sha:runtime.runtime_sha, code });
    } finally {
      if (client && typeof client.end === "function") {
        try { await client.end(); } catch {}
      }
    }
  };
}

module.exports = Object.freeze({
  MARKER,
  createLegacyDomainRepairHandler,
  runtimeIdentity,
  bearerToken,
  parseBody,
  statusForError
});
