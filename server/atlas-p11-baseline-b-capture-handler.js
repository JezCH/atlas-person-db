"use strict";

const { createPostgresClient } = require("./atlas-postgres-client.js");
const { verifyGitHubActionsOidc } = require("./atlas-p11-baseline-b-github-oidc.js");
const {
  inspectProductionBaselineBReadiness,
  captureProductionBaselineB
} = require("./atlas-p11-baseline-b-production-service.js");

const MARKER = "ATLAS_P11_BASELINE_B_CAPTURE_V2";
const CAPTURE_ID = "p11_baseline_b_20260815_v2";
const MODES = new Set(["readiness", "capture"]);
const ALLOWED_BODY_KEYS = new Set(["deployment_sha", "capture_id", "approval", "mode"]);

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload));
}

function bearerToken(req) {
  const match = /^Bearer ([^\s]+)$/.exec(String(req?.headers?.authorization || ""));
  return match ? match[1] : null;
}

function parseBody(req) {
  if (req?.body && typeof req.body === "object" && !Buffer.isBuffer(req.body) && !Array.isArray(req.body)) return req.body;
  if (typeof req?.body === "string") {
    try { return JSON.parse(req.body); } catch { throw new Error("P11_CAPTURE_INVALID_JSON"); }
  }
  throw new Error("P11_CAPTURE_BODY_REQUIRED");
}

function requireEnvelope(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("P11_CAPTURE_BODY_REQUIRED");
  const unexpected = Object.keys(raw).filter((key) => !ALLOWED_BODY_KEYS.has(key));
  if (unexpected.length) throw new Error(`P11_CAPTURE_INPUTS_FORBIDDEN:${unexpected.sort().join(",")}`);

  const deploymentSha = String(raw.deployment_sha || "").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(deploymentSha)) throw new Error("P11_CAPTURE_SHA_REQUIRED");
  const captureId = String(raw.capture_id || "").trim();
  if (captureId !== CAPTURE_ID) throw new Error("P11_CAPTURE_ID_MISMATCH");
  if (String(raw.approval || "").trim() !== `CAPTURE:${CAPTURE_ID}`) throw new Error("P11_CAPTURE_APPROVAL_REQUIRED");
  const mode = String(raw.mode || "").trim().toLowerCase();
  if (!MODES.has(mode)) throw new Error("P11_CAPTURE_MODE_INVALID");
  return Object.freeze({ deploymentSha, captureId, mode });
}

function requireDeployment(env, deploymentSha) {
  if (env?.VERCEL_ENV !== "production" || env?.VERCEL_GIT_COMMIT_REF !== "main") throw new Error("P11_CAPTURE_NOT_PRODUCTION_MAIN");
  if (env?.VERCEL_GIT_REPO_OWNER !== "JezCH" || env?.VERCEL_GIT_REPO_SLUG !== "atlas-person-db") {
    throw new Error("P11_CAPTURE_REPOSITORY_MISMATCH");
  }
  if (String(env?.VERCEL_GIT_COMMIT_SHA || "").trim().toLowerCase() !== deploymentSha) {
    throw new Error("DEPLOYMENT_SHA_MISMATCH");
  }
}

function statusFor(code, fallback = 400) {
  const value = String(code || "");
  if (value === "DEPLOYMENT_SHA_MISMATCH" || value.includes("NOT_READY") || value.includes("DRIFT") || value.includes("PENDING") || value.includes("UNRESOLVED") || value.includes("REAPPEARED")) return 409;
  if (value.includes("OIDC") || value.includes("APPROVAL")) return 403;
  if (value.includes("NOT_PRODUCTION") || value.includes("SUPABASE")) return 503;
  return fallback;
}

function createP11BaselineBCaptureHandler({
  env = process.env,
  verifyOidc = verifyGitHubActionsOidc,
  createClient = createPostgresClient,
  inspectReadiness = inspectProductionBaselineBReadiness,
  captureBaseline = captureProductionBaselineB
} = {}) {
  return async function handler(req, res) {
    if (req?.method !== "POST") return json(res, 405, { ok: false, marker: MARKER, code: "METHOD_NOT_ALLOWED" });

    let envelope;
    try {
      envelope = requireEnvelope(parseBody(req));
      requireDeployment(env, envelope.deploymentSha);
    } catch (error) {
      const code = String(error?.message || "P11_CAPTURE_REQUEST_REJECTED");
      return json(res, statusFor(code, 400), {
        ok: false,
        marker: MARKER,
        code,
        ...(code === "DEPLOYMENT_SHA_MISMATCH" ? { deployed_sha: env?.VERCEL_GIT_COMMIT_SHA || null } : {})
      });
    }

    const token = bearerToken(req);
    if (!token) return json(res, 401, { ok: false, marker: MARKER, code: "P11_CAPTURE_OIDC_TOKEN_REQUIRED" });
    try {
      await verifyOidc(token, { expectedSha: envelope.deploymentSha });
    } catch (error) {
      return json(res, 403, { ok: false, marker: MARKER, code: String(error?.message || "P11_CAPTURE_OIDC_REJECTED") });
    }

    const databaseUrl = String(env?.SUPABASE_DB_URL || "").trim();
    if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) return json(res, 503, { ok: false, marker: MARKER, code: "SUPABASE_DB_URL_REQUIRED" });

    let client;
    try {
      client = await createClient(databaseUrl, { env });
      const result = envelope.mode === "readiness"
        ? await inspectReadiness(client)
        : await captureBaseline(client);
      return json(res, 200, {
        ok: true,
        marker: MARKER,
        capture_id: CAPTURE_ID,
        mode: envelope.mode,
        deployment_sha: envelope.deploymentSha,
        read_only: true,
        database_write_committed: false,
        result
      });
    } catch (error) {
      const code = String(error?.code || error?.message || "P11_CAPTURE_FAILED");
      return json(res, statusFor(code, 500), { ok: false, marker: MARKER, capture_id: CAPTURE_ID, mode: envelope.mode, code });
    } finally {
      if (client && typeof client.end === "function") try { await client.end(); } catch {}
    }
  };
}

module.exports = Object.freeze({
  MARKER,
  CAPTURE_ID,
  MODES,
  ALLOWED_BODY_KEYS,
  createP11BaselineBCaptureHandler,
  requireEnvelope,
  requireDeployment,
  statusFor,
  bearerToken
});
