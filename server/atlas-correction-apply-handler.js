"use strict";

const { createPostgresClient } = require("./atlas-postgres-client.js");
const { MANIFEST_V1, createCorrectionManifestService: createV1Service } = require("./atlas-correction-manifest-service.js");
const { MANIFEST_V1_1, createCorrectionManifestV11Service } = require("./atlas-correction-manifest-v1-1-service.js");
const { MANIFEST_V1_2, createCorrectionManifestV12Service } = require("./atlas-correction-manifest-v1-2-service.js");
const {
  normalizeSnapshotActivityIds,
  createCorrectionTargetSnapshot
} = require("./atlas-correction-snapshot-service.js");
const { queryFullStage2Baseline } = require("./atlas-audit-inventory-handler.js");
const { applyCorrectionMigrations } = require("./atlas-correction-migrations.js");
const { verifyGitHubActionsOidc } = require("./atlas-correction-github-oidc.js");

const CORRECTION_PATH_RE = /^corrections\/(?:requests|intents)\/[A-Za-z0-9._-]+\.json$/;
const MODES = new Set(["snapshot", "dry_run", "apply", "full_stage2_baseline"]);
const MANIFEST_SCHEMAS = new Set([MANIFEST_V1, MANIFEST_V1_1, MANIFEST_V1_2]);
const SNAPSHOT_MARKER = "ATLAS_CORRECTION_SNAPSHOT_V1";
const BASELINE_MARKER = "ATLAS_CORRECTION_BASELINE_A_V2";

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
    try { return JSON.parse(req.body); } catch { throw new Error("CORRECTION_APPLY_INVALID_JSON"); }
  }
  throw new Error("CORRECTION_APPLY_BODY_REQUIRED");
}

function requireDeployment(env, requestedSha) {
  if (env?.VERCEL_ENV !== "production") throw new Error("CORRECTION_APPLY_NOT_PRODUCTION");
  if (env?.VERCEL_GIT_COMMIT_REF !== "main") throw new Error("CORRECTION_APPLY_NOT_MAIN");
  const deployedSha = String(env?.VERCEL_GIT_COMMIT_SHA || "").trim();
  if (!deployedSha) throw new Error("VERCEL_GIT_COMMIT_SHA_REQUIRED");
  if (deployedSha !== requestedSha) throw new Error("DEPLOYMENT_SHA_MISMATCH");
  const repoOwner = String(env?.VERCEL_GIT_REPO_OWNER || "").trim();
  const repoSlug = String(env?.VERCEL_GIT_REPO_SLUG || "").trim();
  if (repoOwner && repoOwner !== "JezCH") throw new Error("VERCEL_REPOSITORY_MISMATCH");
  if (repoSlug && repoSlug !== "atlas-person-db") throw new Error("VERCEL_REPOSITORY_MISMATCH");
  return deployedSha;
}

function requirePayload(body) {
  const deploymentSha = String(body?.deployment_sha || "").trim();
  if (!/^[0-9a-f]{40}$/i.test(deploymentSha)) throw new Error("CORRECTION_APPLY_SHA_REQUIRED");
  const mode = String(body?.mode || "").trim().toLowerCase();
  if (!MODES.has(mode)) throw new Error("CORRECTION_MODE_REQUIRED");

  if (mode === "full_stage2_baseline") {
    if (body?.manifest_path != null || body?.intent_path != null || body?.manifest != null || body?.activity_ids != null) {
      throw new Error("CORRECTION_BASELINE_INPUTS_FORBIDDEN");
    }
    return { deploymentSha, sourcePath: null, mode, activityIds: null, manifest: null, schema: null };
  }

  const sourcePath = String(body?.manifest_path || body?.intent_path || "").trim();
  if (!CORRECTION_PATH_RE.test(sourcePath)) throw new Error("CORRECTION_SOURCE_PATH_NOT_ALLOWED");

  if (mode === "snapshot") {
    return { deploymentSha, sourcePath, mode, activityIds: normalizeSnapshotActivityIds(body?.activity_ids), manifest: null, schema: null };
  }

  if (!body?.manifest || typeof body.manifest !== "object" || Array.isArray(body.manifest)) throw new Error("CORRECTION_MANIFEST_OBJECT_REQUIRED");
  const schema = String(body.manifest.schema || "").trim();
  if (!MANIFEST_SCHEMAS.has(schema)) throw new Error("UNSUPPORTED_CORRECTION_MANIFEST_SCHEMA");
  return { deploymentSha, sourcePath, mode, manifest: body.manifest, schema, activityIds: null };
}

function createService(client, schema) {
  if (schema === MANIFEST_V1) return createV1Service({ client });
  if (schema === MANIFEST_V1_1) return createCorrectionManifestV11Service({ client });
  if (schema === MANIFEST_V1_2) return createCorrectionManifestV12Service({ client });
  throw new Error("UNSUPPORTED_CORRECTION_MANIFEST_SCHEMA");
}

function createCorrectionApplyHandler({
  env = process.env,
  verifyOidc = verifyGitHubActionsOidc,
  createClient = createPostgresClient,
  applyMigrations = applyCorrectionMigrations,
  createSnapshot = createCorrectionTargetSnapshot,
  queryBaseline = queryFullStage2Baseline
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

      if (payload.mode === "full_stage2_baseline") {
        const baseline = await queryBaseline(client);
        return json(res, 200, {
          ok: true,
          marker: BASELINE_MARKER,
          mode: payload.mode,
          read_only: true,
          committed: false,
          deployment_sha: payload.deploymentSha,
          row_count: baseline.rows.length,
          counts: baseline.counts,
          baseline_digest: baseline.baseline_digest,
          rows: baseline.rows,
          catalogs: baseline.catalogs
        });
      }

      if (payload.mode === "snapshot") {
        const snapshot = await createSnapshot(client, payload.activityIds);
        return json(res, 200, {
          ok: true,
          marker: SNAPSHOT_MARKER,
          mode: "snapshot",
          read_only: snapshot.read_only,
          committed: snapshot.committed,
          deployment_sha: payload.deploymentSha,
          source_path: payload.sourcePath,
          requested_count: payload.activityIds.length,
          row_count: snapshot.snapshots.length,
          snapshots: snapshot.snapshots
        });
      }

      if (payload.mode === "apply") await applyMigrations(client);
      const service = createService(client, payload.schema);
      const outcome = await service.execute(payload.manifest, { dryRun: payload.mode === "dry_run" });
      return json(res, 200, {
        ok: true,
        marker: outcome.marker,
        schema: payload.schema,
        request_id: outcome.request_id,
        mode: payload.mode,
        dry_run: outcome.dry_run,
        committed: outcome.committed,
        replay: outcome.replay,
        result: outcome.result,
        deployment_sha: payload.deploymentSha,
        source_path: payload.sourcePath
      });
    } catch (error) {
      const code = String(error?.message || "CORRECTION_APPLY_FAILED");
      const conflict = /COLLISION|DRIFT|MISMATCH|CONFLICT|REQUIRED|UNSUPPORTED|NOT_FOUND|REAPPEARED|INVALID|LIMIT|APPROVED|TARGET|NO_CHANGE|SNAPSHOT|BASELINE/.test(code);
      return json(res, conflict ? 409 : 500, { ok: false, code,
        ...(Array.isArray(error?.missing_activity_ids) ? { missing_activity_ids: error.missing_activity_ids } : {}) });
    } finally {
      if (client && typeof client.end === "function") { try { await client.end(); } catch {} }
    }
  };
}

module.exports = Object.freeze({ createCorrectionApplyHandler, requirePayload, requireDeployment, bearerToken, createService,
  CORRECTION_PATH_RE, MODES, MANIFEST_SCHEMAS, SNAPSHOT_MARKER, BASELINE_MARKER });
