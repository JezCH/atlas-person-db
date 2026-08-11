"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createPostgresClient } = require("./atlas-postgres-client.js");
const { createAuthoringManifestService } = require("./atlas-authoring-manifest-service.js");
const { verifyGitHubActionsOidc } = require("./atlas-github-oidc.js");

const MIGRATION_PATH = path.resolve(__dirname, "../db/migrations/20260811_authoring_manifest_runs.sql");
const MANIFEST_PATH_RE = /^authoring\/requests\/[A-Za-z0-9._-]+\.json$/;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function bearerToken(req) {
  const value = String(req?.headers?.authorization || "");
  const match = /^Bearer ([^\s]+)$/.exec(value);
  return match ? match[1] : null;
}

function parseBody(req) {
  if (req?.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req?.body === "string") {
    try { return JSON.parse(req.body); } catch { throw new Error("AUTHORING_APPLY_INVALID_JSON"); }
  }
  throw new Error("AUTHORING_APPLY_BODY_REQUIRED");
}

function requireDeployment(env, requestedSha) {
  if (env?.VERCEL_ENV !== "production") throw new Error("AUTHORING_APPLY_NOT_PRODUCTION");
  if (env?.VERCEL_GIT_COMMIT_REF !== "main") throw new Error("AUTHORING_APPLY_NOT_MAIN");
  const deployedSha = String(env?.VERCEL_GIT_COMMIT_SHA || "").trim();
  if (!deployedSha) throw new Error("VERCEL_GIT_COMMIT_SHA_REQUIRED");
  if (deployedSha !== requestedSha) throw new Error("DEPLOYMENT_SHA_MISMATCH");
  const repoOwner = String(env?.VERCEL_GIT_REPO_OWNER || "").trim();
  const repoSlug = String(env?.VERCEL_GIT_REPO_SLUG || "").trim();
  if (repoOwner && repoOwner !== "JezCH") throw new Error("VERCEL_REPOSITORY_MISMATCH");
  if (repoSlug && repoSlug !== "atlas-person-db") throw new Error("VERCEL_REPOSITORY_MISMATCH");
  return deployedSha;
}

function requireApplyPayload(body) {
  const deploymentSha = String(body?.deployment_sha || "").trim();
  if (!/^[0-9a-f]{40}$/i.test(deploymentSha)) throw new Error("AUTHORING_APPLY_SHA_REQUIRED");
  const manifestPath = String(body?.manifest_path || "").trim();
  if (!MANIFEST_PATH_RE.test(manifestPath)) throw new Error("AUTHORING_MANIFEST_PATH_NOT_ALLOWED");
  if (!body?.manifest || typeof body.manifest !== "object" || Array.isArray(body.manifest)) throw new Error("AUTHORING_MANIFEST_OBJECT_REQUIRED");
  return { deploymentSha, manifestPath, manifest: body.manifest };
}

function createAuthoringApplyHandler({
  env = process.env,
  verifyOidc = verifyGitHubActionsOidc,
  createClient = createPostgresClient,
  readMigration = () => fs.readFileSync(MIGRATION_PATH, "utf8")
} = {}) {
  return async function handler(req, res) {
    if (req?.method !== "POST") return json(res, 405, { ok: false, code: "METHOD_NOT_ALLOWED" });

    let payload;
    try {
      payload = requireApplyPayload(parseBody(req));
    } catch (error) {
      return json(res, 400, { ok: false, code: String(error?.message || "INVALID_REQUEST") });
    }

    try {
      requireDeployment(env, payload.deploymentSha);
    } catch (error) {
      const code = String(error?.message || "DEPLOYMENT_REJECTED");
      if (code === "DEPLOYMENT_SHA_MISMATCH") return json(res, 409, { ok: false, code, deployed_sha: env?.VERCEL_GIT_COMMIT_SHA || null });
      return json(res, 503, { ok: false, code });
    }

    const token = bearerToken(req);
    if (!token) return json(res, 401, { ok: false, code: "GITHUB_OIDC_TOKEN_REQUIRED" });

    try {
      await verifyOidc(token, { expectedSha: payload.deploymentSha });
    } catch (error) {
      return json(res, 403, { ok: false, code: String(error?.message || "GITHUB_OIDC_REJECTED") });
    }

    const databaseUrl = String(env?.SUPABASE_DB_URL || "").trim();
    if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) return json(res, 503, { ok: false, code: "SUPABASE_DB_URL_REQUIRED" });

    let client;
    try {
      client = await createClient(databaseUrl, { env });
      await client.query(readMigration());
      const outcome = await createAuthoringManifestService({ client }).apply(payload.manifest);
      return json(res, 200, {
        ok: true,
        marker: outcome.marker,
        request_id: outcome.request_id,
        committed: outcome.committed,
        replay: outcome.replay,
        person_id: outcome.person_id,
        relationship_id: outcome.relationship_id,
        ...(outcome.polity_id ? { polity_id: outcome.polity_id } : {}),
        ...(outcome.role_id ? { role_id: outcome.role_id } : {}),
        deployment_sha: payload.deploymentSha,
        manifest_path: payload.manifestPath
      });
    } catch (error) {
      const code = String(error?.message || "AUTHORING_APPLY_FAILED");
      const conflict = /COLLISION|AMBIGUOUS|DUPLICATE|UNRESOLVED|REVIEW|APPROVED|UNSUPPORTED|REQUIRED|NOT_FOUND|FAILED|MISMATCH/.test(code);
      return json(res, conflict ? 409 : 500, { ok: false, code });
    } finally {
      if (client && typeof client.end === "function") {
        try { await client.end(); } catch {}
      }
    }
  };
}

module.exports = Object.freeze({
  createAuthoringApplyHandler,
  requireApplyPayload,
  requireDeployment,
  bearerToken,
  MANIFEST_PATH_RE,
  MIGRATION_PATH
});
