"use strict";

const { createPostgresClient } = require("./atlas-postgres-client.js");
const { verifyGitHubActionsOidc } = require("./atlas-ko-repair-github-oidc.js");
const { REPAIR_MARKER, createAuthoritativeKoRepairService } = require("./atlas-authoritative-ko-repair-service.js");

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function bodyObject(req) {
  if (req?.body && typeof req.body === "object" && !Buffer.isBuffer(req.body) && !Array.isArray(req.body)) return req.body;
  if (typeof req?.body === "string") {
    try { return JSON.parse(req.body); } catch { throw new Error("KO_REPAIR_INVALID_JSON"); }
  }
  throw new Error("KO_REPAIR_BODY_REQUIRED");
}

function bearerToken(req) {
  const value = String(req?.headers?.authorization || "");
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function requireDeployment(body, env) {
  if (env.VERCEL_ENV !== "production") throw new Error("KO_REPAIR_NOT_PRODUCTION");
  if (env.VERCEL_GIT_REPO_OWNER !== "JezCH" || env.VERCEL_GIT_REPO_SLUG !== "atlas-person-db") throw new Error("KO_REPAIR_REPOSITORY_MISMATCH");
  if (String(env.VERCEL_GIT_COMMIT_REF || "") !== "main") throw new Error("KO_REPAIR_BRANCH_MISMATCH");
  const actualSha = String(env.VERCEL_GIT_COMMIT_SHA || "").toLowerCase();
  const expectedSha = String(body?.deployment_sha || "").toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(actualSha) || !/^[0-9a-f]{40}$/.test(expectedSha)) throw new Error("KO_REPAIR_DEPLOYMENT_SHA_REQUIRED");
  if (actualSha !== expectedSha) throw new Error("DEPLOYMENT_SHA_MISMATCH");
  return actualSha;
}

function statusForError(code) {
  if (code === "DEPLOYMENT_SHA_MISMATCH" || /DRIFT|CONFLICT|CHANGED/.test(code)) return 409;
  if (code.startsWith("GITHUB_OIDC_")) return 401;
  if (/REQUIRED|INVALID|NOT_APPROVED/.test(code)) return 400;
  if (/NOT_PRODUCTION|REPOSITORY|BRANCH|SUPABASE/.test(code)) return 503;
  return 500;
}

function createAuthoritativeKoRepairHandler({ env = process.env, clientFactory = createPostgresClient, verifyOidc = verifyGitHubActionsOidc, createService = createAuthoritativeKoRepairService } = {}) {
  return async function handler(req, res) {
    if (String(req?.method || "").toUpperCase() !== "POST") return json(res, 405, { ok:false, marker:REPAIR_MARKER, code:"METHOD_NOT_ALLOWED" });
    let body;
    try { body = bodyObject(req); }
    catch (error) { return json(res, 400, { ok:false, marker:REPAIR_MARKER, code:String(error.message) }); }
    let deploymentSha;
    try {
      deploymentSha = requireDeployment(body, env);
      const token = bearerToken(req);
      if (!token) throw new Error("GITHUB_OIDC_TOKEN_REQUIRED");
      await verifyOidc(token, { expectedSha:deploymentSha });
    } catch (error) {
      const code = String(error?.message || "KO_REPAIR_UNAUTHORIZED");
      return json(res, statusForError(code), { ok:false, marker:REPAIR_MARKER, code });
    }
    const databaseUrl = String(env.SUPABASE_DB_URL || "").trim();
    if (!databaseUrl) return json(res, 503, { ok:false, marker:REPAIR_MARKER, code:"SUPABASE_DB_URL_REQUIRED" });
    let client;
    try {
      client = await clientFactory(databaseUrl, { env });
      const repair = body?.repair && typeof body.repair === "object" && !Array.isArray(body.repair) ? body.repair : body;
      const outcome = await createService({ client }).apply(repair);
      return json(res, 200, { ok:true, deployment_sha:deploymentSha, ...outcome });
    } catch (error) {
      const code = String(error?.message || "KO_REPAIR_FAILED");
      return json(res, statusForError(code), { ok:false, marker:REPAIR_MARKER, code });
    } finally {
      if (client && typeof client.end === "function") {
        try { await client.end(); } catch {}
      }
    }
  };
}

module.exports = Object.freeze({ createAuthoritativeKoRepairHandler, bodyObject, bearerToken, requireDeployment, statusForError });
