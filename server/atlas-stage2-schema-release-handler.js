"use strict";

const { createPostgresClient } = require("./atlas-postgres-client.js");
const { queryFullStage2Baseline } = require("./atlas-audit-inventory-handler.js");
const {
  readStage2SchemaRelease,
  applyStage2SchemaRelease
} = require("./atlas-stage2-schema-release.js");
const { verifyGitHubActionsOidc } = require("./atlas-stage2-schema-release-github-oidc.js");

const MARKER = "ATLAS_STAGE2_SCHEMA_RELEASE_V1";
const MODES = new Set(["preflight", "apply"]);
const RELEASE_ID_RE = /^[A-Za-z0-9._-]{1,128}$/;

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
    try { return JSON.parse(req.body); } catch { throw new Error("STAGE2_SCHEMA_RELEASE_INVALID_JSON"); }
  }
  throw new Error("STAGE2_SCHEMA_RELEASE_BODY_REQUIRED");
}

function requirePayload(body) {
  const deploymentSha = String(body?.deployment_sha || "").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(deploymentSha)) throw new Error("STAGE2_SCHEMA_RELEASE_SHA_REQUIRED");
  const releaseId = String(body?.release_id || "").trim();
  if (!RELEASE_ID_RE.test(releaseId)) throw new Error("STAGE2_SCHEMA_RELEASE_ID_REQUIRED");
  const mode = String(body?.mode || "").trim().toLowerCase();
  if (!MODES.has(mode)) throw new Error("STAGE2_SCHEMA_RELEASE_MODE_REQUIRED");
  const approval = String(body?.approval || "");
  if (approval !== `APPLY:${releaseId}`) throw new Error("STAGE2_SCHEMA_RELEASE_APPROVAL_REQUIRED");
  return Object.freeze({ deploymentSha, releaseId, mode, approval });
}

function requireDeployment(env, requestedSha) {
  if (env?.VERCEL_ENV !== "production") throw new Error("STAGE2_SCHEMA_RELEASE_NOT_PRODUCTION");
  if (env?.VERCEL_GIT_COMMIT_REF !== "main") throw new Error("STAGE2_SCHEMA_RELEASE_NOT_MAIN");
  if (env?.VERCEL_GIT_REPO_OWNER !== "JezCH" || env?.VERCEL_GIT_REPO_SLUG !== "atlas-person-db") {
    throw new Error("STAGE2_SCHEMA_RELEASE_REPOSITORY_MISMATCH");
  }
  const deployedSha = String(env?.VERCEL_GIT_COMMIT_SHA || "").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(deployedSha)) throw new Error("VERCEL_GIT_COMMIT_SHA_REQUIRED");
  if (deployedSha !== requestedSha) throw new Error("DEPLOYMENT_SHA_MISMATCH");
  return deployedSha;
}

function assertReleaseEnvelope(bundle, requestedReleaseId) {
  const release = bundle?.release;
  if (!release || !Array.isArray(bundle?.components)) throw new Error("STAGE2_SCHEMA_RELEASE_BUNDLE_INVALID");
  if (release.release_id !== requestedReleaseId) throw new Error("STAGE2_SCHEMA_RELEASE_ID_MISMATCH");
  if (release.status !== "RELEASE_CANDIDATE_BRANCH_ONLY_NO_PRODUCTION_MUTATION") throw new Error("STAGE2_SCHEMA_RELEASE_STATUS_INVALID");
  if (release.safety?.production_apply_authorized !== false) throw new Error("STAGE2_SCHEMA_RELEASE_SELF_AUTHORIZATION_FORBIDDEN");
  if (release.safety?.non_destructive_schema_only !== true ||
      release.safety?.additive_objects_and_backward_compatible_relaxations_only !== true ||
      release.safety?.legacy_source_key_nullability_relaxation !== true ||
      release.safety?.fake_legacy_source_key_for_stage2_native_activity_forbidden !== true ||
      release.safety?.person_activity_data_mutation !== false ||
      release.safety?.physical_person_merge !== false || release.safety?.territory_geometry_mutation !== false) {
    throw new Error("STAGE2_SCHEMA_RELEASE_SAFETY_CONTRACT_INVALID");
  }
  if (release.prerequisites?.effective_prebinding_complete !== true ||
      release.prerequisites?.effective_activity_count !== 54 ||
      release.prerequisites?.remaining_activity_count !== 0) {
    throw new Error("STAGE2_SCHEMA_RELEASE_P6_CLOSURE_REQUIRED");
  }
  if (!/^sha256:[0-9a-f]{64}$/.test(String(release.baseline?.baseline_digest || ""))) {
    throw new Error("STAGE2_SCHEMA_RELEASE_BASELINE_DIGEST_INVALID");
  }
  if (bundle.components.length !== 6) throw new Error("STAGE2_SCHEMA_RELEASE_COMPONENT_COUNT_INVALID");
  return release;
}

function assertBaselineMatches(release, baseline) {
  if (baseline?.baseline_digest !== release.baseline.baseline_digest) {
    throw new Error("STAGE2_SCHEMA_RELEASE_BASELINE_DIGEST_DRIFT");
  }
  if (Number(baseline?.counts?.activities) !== 338 || Number(baseline?.counts?.persons) !== 302 ||
      Number(baseline?.counts?.polities) !== 212 || Number(baseline?.counts?.sources) !== 20) {
    throw new Error("STAGE2_SCHEMA_RELEASE_BASELINE_CARDINALITY_DRIFT");
  }
  return baseline;
}

async function inspectReleaseLedger(client, bundle) {
  const release = bundle.release;
  const expectedById = new Map(bundle.components.map((component) => [component.id, component.git_blob_sha]));
  const relation = await client.query("select to_regclass('atlas_v2.stage2_schema_release_components') as relation");
  if (!relation.rows[0]?.relation) {
    return Object.freeze({ applied: Object.freeze([]), pending: Object.freeze(bundle.components.map((component) => component.id)), complete: false });
  }
  const rows = await client.query(
    `select component_id, git_blob_sha from atlas_v2.stage2_schema_release_components where release_id=$1 order by component_id`,
    [release.release_id]
  );
  const appliedSet = new Set();
  for (const row of rows.rows) {
    if (!expectedById.has(row.component_id)) throw new Error(`STAGE2_SCHEMA_RELEASE_LEDGER_UNKNOWN_COMPONENT:${row.component_id}`);
    if (expectedById.get(row.component_id) !== row.git_blob_sha) throw new Error(`STAGE2_SCHEMA_RELEASE_LEDGER_SHA_DRIFT:${row.component_id}`);
    appliedSet.add(row.component_id);
  }
  const applied = bundle.components.filter((component) => appliedSet.has(component.id)).map((component) => component.id);
  const pending = bundle.components.filter((component) => !appliedSet.has(component.id)).map((component) => component.id);
  return Object.freeze({ applied: Object.freeze(applied), pending: Object.freeze(pending), complete: pending.length === 0 });
}

function statusForError(code) {
  const value = String(code || "");
  if (value === "DEPLOYMENT_SHA_MISMATCH" || value.includes("BASELINE_") || value.includes("LEDGER_") || value.includes("_DRIFT") || value.endsWith("_MISMATCH")) return 409;
  if (value === "STAGE2_SCHEMA_RELEASE_APPROVAL_REQUIRED" || value.startsWith("GITHUB_OIDC_")) return 403;
  if (value === "STAGE2_SCHEMA_RELEASE_NOT_PRODUCTION" || value === "STAGE2_SCHEMA_RELEASE_NOT_MAIN" || value === "STAGE2_SCHEMA_RELEASE_REPOSITORY_MISMATCH" || value === "SUPABASE_DB_URL_REQUIRED") return 503;
  if (value.startsWith("STAGE2_SCHEMA_RELEASE_") || value === "VERCEL_GIT_COMMIT_SHA_REQUIRED") return 400;
  return 500;
}

function createStage2SchemaReleaseHandler({
  env = process.env,
  verifyOidc = verifyGitHubActionsOidc,
  createClient = createPostgresClient,
  readRelease = readStage2SchemaRelease,
  applyRelease = applyStage2SchemaRelease,
  queryBaseline = queryFullStage2Baseline,
  inspectLedger = inspectReleaseLedger
} = {}) {
  return async function handler(req, res) {
    if (req?.method !== "POST") return json(res, 405, { ok: false, marker: MARKER, code: "METHOD_NOT_ALLOWED" });

    let payload;
    let bundle;
    try {
      payload = requirePayload(parseBody(req));
      bundle = readRelease();
      assertReleaseEnvelope(bundle, payload.releaseId);
      requireDeployment(env, payload.deploymentSha);
    } catch (error) {
      const code = String(error?.message || "STAGE2_SCHEMA_RELEASE_REQUEST_REJECTED");
      return json(res, statusForError(code), { ok: false, marker: MARKER, code });
    }

    const token = bearerToken(req);
    if (!token) return json(res, 401, { ok: false, marker: MARKER, code: "GITHUB_OIDC_TOKEN_REQUIRED" });
    try {
      await verifyOidc(token, { expectedSha: payload.deploymentSha });
    } catch (error) {
      const code = String(error?.message || "GITHUB_OIDC_REJECTED");
      return json(res, 403, { ok: false, marker: MARKER, code });
    }

    const databaseUrl = String(env?.SUPABASE_DB_URL || "").trim();
    if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) return json(res, 503, { ok: false, marker: MARKER, code: "SUPABASE_DB_URL_REQUIRED" });

    let client;
    try {
      client = await createClient(databaseUrl, { env });
      const before = assertBaselineMatches(bundle.release, await queryBaseline(client));
      const ledgerBefore = await inspectLedger(client, bundle);

      if (payload.mode === "preflight") {
        return json(res, 200, {
          ok: true,
          marker: MARKER,
          mode: "preflight",
          read_only: true,
          committed: false,
          deployment_sha: payload.deploymentSha,
          release_id: bundle.release.release_id,
          baseline_digest: before.baseline_digest,
          ledger: ledgerBefore
        });
      }

      const outcome = await applyRelease(client);
      const after = assertBaselineMatches(bundle.release, await queryBaseline(client));
      const ledgerAfter = await inspectLedger(client, bundle);
      if (!ledgerAfter.complete || ledgerAfter.applied.length !== bundle.components.length) {
        throw new Error("STAGE2_SCHEMA_RELEASE_POSTCONDITION_INCOMPLETE");
      }
      return json(res, 200, {
        ok: true,
        marker: MARKER,
        mode: "apply",
        read_only: false,
        committed: true,
        replay: outcome.applied.length === 0,
        deployment_sha: payload.deploymentSha,
        release_id: bundle.release.release_id,
        baseline_digest_before: before.baseline_digest,
        baseline_digest_after: after.baseline_digest,
        applied: outcome.applied,
        skipped: outcome.skipped,
        ledger: ledgerAfter
      });
    } catch (error) {
      const code = String(error?.message || "STAGE2_SCHEMA_RELEASE_FAILED");
      return json(res, statusForError(code), { ok: false, marker: MARKER, code });
    } finally {
      if (client && typeof client.end === "function") {
        try { await client.end(); } catch {}
      }
    }
  };
}

module.exports = Object.freeze({
  MARKER,
  MODES,
  RELEASE_ID_RE,
  createStage2SchemaReleaseHandler,
  requirePayload,
  requireDeployment,
  assertReleaseEnvelope,
  assertBaselineMatches,
  inspectReleaseLedger,
  bearerToken,
  statusForError
});
