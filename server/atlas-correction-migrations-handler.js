"use strict";

const { createPostgresClient } = require("./atlas-postgres-client.js");
const { applyCorrectionMigrations } = require("./atlas-correction-migrations.js");
const { verifyGitHubActionsOidc } = require("./atlas-correction-github-oidc.js");
const { requireDeployment, bearerToken } = require("./atlas-correction-apply-handler.js");

const MARKER = "ATLAS_CORRECTION_MIGRATIONS_V1";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  if (req?.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req?.body === "string") {
    try { return JSON.parse(req.body); } catch { throw new Error("CORRECTION_MIGRATIONS_INVALID_JSON"); }
  }
  throw new Error("CORRECTION_MIGRATIONS_BODY_REQUIRED");
}

function requirePayload(body) {
  const deploymentSha = String(body?.deployment_sha || "").trim();
  if (!/^[0-9a-f]{40}$/i.test(deploymentSha)) throw new Error("CORRECTION_MIGRATIONS_SHA_REQUIRED");
  const unexpected = Object.keys(body || {}).filter((key) => key !== "deployment_sha");
  if (unexpected.length) throw new Error("CORRECTION_MIGRATIONS_EXTRA_INPUT_FORBIDDEN");
  return { deploymentSha };
}

function createCorrectionMigrationsHandler({
  env = process.env,
  verifyOidc = verifyGitHubActionsOidc,
  createClient = createPostgresClient,
  applyMigrations = applyCorrectionMigrations
} = {}) {
  return async function handler(req, res) {
    if (req?.method !== "POST") return json(res, 405, { ok: false, code: "METHOD_NOT_ALLOWED" });

    let payload;
    try {
      payload = requirePayload(parseBody(req));
    } catch (error) {
      return json(res, 400, { ok: false, code: String(error?.message || "INVALID_REQUEST") });
    }

    try {
      requireDeployment(env, payload.deploymentSha);
    } catch (error) {
      const code = String(error?.message || "DEPLOYMENT_REJECTED");
      if (code === "DEPLOYMENT_SHA_MISMATCH") {
        return json(res, 409, { ok: false, code, deployed_sha: env?.VERCEL_GIT_COMMIT_SHA || null });
      }
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
      const result = await applyMigrations(client);
      return json(res, 200, {
        ok: true,
        marker: MARKER,
        mode: "migrate",
        committed: true,
        deployment_sha: payload.deploymentSha,
        result
      });
    } catch (error) {
      return json(res, 500, { ok: false, code: String(error?.message || "CORRECTION_MIGRATIONS_FAILED") });
    } finally {
      if (client && typeof client.end === "function") { try { await client.end(); } catch {} }
    }
  };
}

module.exports = Object.freeze({
  createCorrectionMigrationsHandler,
  requirePayload,
  MARKER
});
