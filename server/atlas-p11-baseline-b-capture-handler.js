"use strict";

const { once } = require("node:events");
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
const STREAM_CHUNK_BYTES = 64 * 1024;
const SHA_RE = /^[0-9a-f]{40}$/i;
const GITHUB_COMPARE_BASE = "https://api.github.com/repos/JezCH/atlas-person-db/compare";

function applyJsonHeaders(res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
}

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  applyJsonHeaders(res);
  res.end(JSON.stringify(payload));
}

async function streamJson(res, statusCode, payload, { chunkBytes = STREAM_CHUNK_BYTES } = {}) {
  if (!Number.isInteger(chunkBytes) || chunkBytes < 1024) throw new Error("P11_CAPTURE_STREAM_CHUNK_INVALID");
  if (!res || typeof res.write !== "function" || typeof res.end !== "function") throw new Error("P11_CAPTURE_STREAM_RESPONSE_REQUIRED");

  const body = Buffer.from(JSON.stringify(payload), "utf8");
  res.statusCode = statusCode;
  applyJsonHeaders(res);
  res.setHeader("x-atlas-response-mode", "streamed-json");

  for (let offset = 0; offset < body.length; offset += chunkBytes) {
    const chunk = body.subarray(offset, Math.min(offset + chunkBytes, body.length));
    if (res.write(chunk) === false) await once(res, "drain");
  }
  res.end();
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
  if (!SHA_RE.test(deploymentSha)) throw new Error("P11_CAPTURE_SHA_REQUIRED");
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

async function verifyDeploymentAncestry(deploymentSha, workflowSha, { fetchImpl = globalThis.fetch } = {}) {
  const deployed = String(deploymentSha || "").trim().toLowerCase();
  const workflow = String(workflowSha || "").trim().toLowerCase();
  if (!SHA_RE.test(deployed) || !SHA_RE.test(workflow)) throw new Error("P11_CAPTURE_ANCESTRY_SHA_INVALID");
  if (deployed === workflow) return Object.freeze({ status: "identical", deployment_sha: deployed, workflow_sha: workflow });
  if (typeof fetchImpl !== "function") throw new Error("P11_CAPTURE_GITHUB_COMPARE_UNAVAILABLE");

  const response = await fetchImpl(`${GITHUB_COMPARE_BASE}/${deployed}...${workflow}`, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "atlas-person-db-p11-baseline-b-capture"
    }
  });
  if (!response?.ok) throw new Error(`P11_CAPTURE_GITHUB_COMPARE_HTTP_${response?.status || "UNKNOWN"}`);
  const body = await response.json();
  const status = String(body?.status || "");
  const mergeBase = String(body?.merge_base_commit?.sha || "").trim().toLowerCase();
  if (status !== "ahead" || mergeBase !== deployed) throw new Error("P11_CAPTURE_DEPLOYMENT_NOT_ANCESTOR");
  return Object.freeze({ status, deployment_sha: deployed, workflow_sha: workflow });
}

function statusFor(code, fallback = 400) {
  const value = String(code || "");
  if (value === "DEPLOYMENT_SHA_MISMATCH" || value.includes("NOT_READY") || value.includes("DRIFT") || value.includes("PENDING") || value.includes("UNRESOLVED") || value.includes("REAPPEARED") || value.includes("NOT_ANCESTOR")) return 409;
  if (value.includes("OIDC") || value.includes("APPROVAL")) return 403;
  if (value.includes("GITHUB_COMPARE") || value.includes("NOT_PRODUCTION") || value.includes("SUPABASE")) return 503;
  return fallback;
}

function createP11BaselineBCaptureHandler({
  env = process.env,
  verifyOidc = verifyGitHubActionsOidc,
  verifyAncestry = verifyDeploymentAncestry,
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

    let oidcPayload;
    try {
      oidcPayload = await verifyOidc(token);
      await verifyAncestry(envelope.deploymentSha, oidcPayload?.sha);
    } catch (error) {
      const code = String(error?.message || "P11_CAPTURE_OIDC_REJECTED");
      return json(res, statusFor(code, 403), { ok: false, marker: MARKER, code });
    }

    const databaseUrl = String(env?.SUPABASE_DB_URL || "").trim();
    if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) return json(res, 503, { ok: false, marker: MARKER, code: "SUPABASE_DB_URL_REQUIRED" });

    let client;
    let result;
    try {
      client = await createClient(databaseUrl, { env });
      result = envelope.mode === "readiness"
        ? await inspectReadiness(client)
        : await captureBaseline(client);
    } catch (error) {
      const code = String(error?.code || error?.message || "P11_CAPTURE_FAILED");
      return json(res, statusFor(code, 500), { ok: false, marker: MARKER, capture_id: CAPTURE_ID, mode: envelope.mode, code });
    } finally {
      if (client && typeof client.end === "function") try { await client.end(); } catch {}
    }

    const payload = {
      ok: true,
      marker: MARKER,
      capture_id: CAPTURE_ID,
      mode: envelope.mode,
      workflow_sha: String(oidcPayload?.sha || "").trim().toLowerCase(),
      deployment_sha: envelope.deploymentSha,
      read_only: true,
      database_write_committed: false,
      result
    };
    if (envelope.mode === "capture") return streamJson(res, 200, payload);
    return json(res, 200, payload);
  };
}

module.exports = Object.freeze({
  MARKER,
  CAPTURE_ID,
  MODES,
  ALLOWED_BODY_KEYS,
  STREAM_CHUNK_BYTES,
  GITHUB_COMPARE_BASE,
  createP11BaselineBCaptureHandler,
  requireEnvelope,
  requireDeployment,
  verifyDeploymentAncestry,
  statusFor,
  bearerToken,
  streamJson
});
