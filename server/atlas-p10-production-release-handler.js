"use strict";

const { createPostgresClient } = require("./atlas-postgres-client.js");
const { verifyGitHubActionsOidc } = require("./atlas-p10-production-github-oidc.js");
const {
  inspectP10ProductionState,
  applyRequirementMigration,
  rebuildP10CandidateFrontier
} = require("./atlas-p10-production-release-service.js");

const MARKER = "ATLAS_P10_REVALIDATION_RELEASE_V1";
const RELEASE_ID = "p10_person_duplicate_revalidation_20260815_v1";
// Deployment checkpoint: force the exact main SHA used by the one-shot release launcher to become Production before dispatch.
const MODES = new Set(["preflight", "migration_dry_run", "migration_apply", "rebuild_candidates", "final_verify"]);

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}
function bearer(req) {
  const match = /^Bearer ([^\s]+)$/.exec(String(req?.headers?.authorization || ""));
  return match ? match[1] : null;
}
function body(req) {
  if (req?.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req?.body === "string") return JSON.parse(req.body);
  throw new Error("P10_RELEASE_BODY_REQUIRED");
}
function requireEnvelope(raw) {
  const deploymentSha = String(raw?.deployment_sha || "").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(deploymentSha)) throw new Error("P10_RELEASE_SHA_REQUIRED");
  const releaseId = String(raw?.release_id || "");
  if (releaseId !== RELEASE_ID) throw new Error("P10_RELEASE_ID_MISMATCH");
  if (String(raw?.approval || "") !== `APPLY:${RELEASE_ID}`) throw new Error("P10_RELEASE_APPROVAL_REQUIRED");
  const mode = String(raw?.mode || "");
  if (!MODES.has(mode)) throw new Error("P10_RELEASE_MODE_INVALID");
  return Object.freeze({ deploymentSha, releaseId, mode });
}
function requireDeployment(env, sha) {
  if (env?.VERCEL_ENV !== "production" || env?.VERCEL_GIT_COMMIT_REF !== "main") throw new Error("P10_RELEASE_NOT_PRODUCTION_MAIN");
  if (env?.VERCEL_GIT_REPO_OWNER !== "JezCH" || env?.VERCEL_GIT_REPO_SLUG !== "atlas-person-db") throw new Error("P10_RELEASE_REPOSITORY_MISMATCH");
  if (String(env?.VERCEL_GIT_COMMIT_SHA || "").toLowerCase() !== sha) throw new Error("DEPLOYMENT_SHA_MISMATCH");
}
function status(code) {
  const value = String(code || "");
  if (value === "DEPLOYMENT_SHA_MISMATCH" || value.includes("DRIFT") || value.includes("DUPLICATE") || value.includes("COLLISION") || value.includes("REVALIDATION_INCOMPLETE")) return 409;
  if (value.includes("OIDC") || value.includes("APPROVAL")) return 403;
  if (value.includes("NOT_PRODUCTION") || value.includes("SUPABASE")) return 503;
  return 400;
}

function createP10ProductionReleaseHandler({ env = process.env, verifyOidc = verifyGitHubActionsOidc, createClient = createPostgresClient } = {}) {
  return async function handler(req, res) {
    if (req?.method !== "POST") return json(res, 405, { ok: false, marker: MARKER, code: "METHOD_NOT_ALLOWED" });
    let envelope;
    try {
      envelope = requireEnvelope(body(req));
      requireDeployment(env, envelope.deploymentSha);
    } catch (error) {
      const code = String(error?.message || "P10_RELEASE_REQUEST_REJECTED");
      return json(res, status(code), { ok: false, marker: MARKER, code });
    }

    const token = bearer(req);
    if (!token) return json(res, 401, { ok: false, marker: MARKER, code: "P10_RELEASE_OIDC_TOKEN_REQUIRED" });
    try {
      await verifyOidc(token, { expectedSha: envelope.deploymentSha });
    } catch (error) {
      return json(res, 403, { ok: false, marker: MARKER, code: String(error?.message || "P10_RELEASE_OIDC_REJECTED") });
    }

    const databaseUrl = String(env?.SUPABASE_DB_URL || "");
    if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) return json(res, 503, { ok: false, marker: MARKER, code: "SUPABASE_DB_URL_REQUIRED" });

    let client;
    try {
      client = await createClient(databaseUrl, { env });
      let result;
      if (envelope.mode === "preflight" || envelope.mode === "final_verify") {
        result = await inspectP10ProductionState(client);
        if (!result.merge_execution_state.lifecycle_code_ready) throw new Error("P10_RELEASE_CODE_LIFECYCLE_NOT_READY");
      } else if (envelope.mode === "migration_dry_run") {
        result = await applyRequirementMigration(client, { dryRun: true });
      } else if (envelope.mode === "migration_apply") {
        result = await applyRequirementMigration(client, { dryRun: false });
      } else if (envelope.mode === "rebuild_candidates") {
        result = await rebuildP10CandidateFrontier(client);
      } else {
        throw new Error("P10_RELEASE_MODE_INVALID");
      }
      return json(res, 200, {
        ok: true,
        marker: MARKER,
        mode: envelope.mode,
        deployment_sha: envelope.deploymentSha,
        release_id: RELEASE_ID,
        result,
        automatic_review_performed: false,
        physical_person_merge_executed: false
      });
    } catch (error) {
      const code = String(error?.code || error?.message || "P10_RELEASE_FAILED");
      return json(res, status(code), { ok: false, marker: MARKER, mode: envelope.mode, code });
    } finally {
      if (client && typeof client.end === "function") try { await client.end(); } catch {}
    }
  };
}

module.exports = Object.freeze({ MARKER, RELEASE_ID, MODES, createP10ProductionReleaseHandler, requireEnvelope, requireDeployment, status });
