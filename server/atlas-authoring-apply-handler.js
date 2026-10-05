"use strict";

const { createPostgresClient } = require("./atlas-postgres-client.js");
const { createAuthoringManifestDispatchService } = require("./atlas-authoring-manifest-dispatch-service.js");
const { applyAuthoringMigrations } = require("./atlas-authoring-migrations.js");
const { inspectAuthoringReadiness } = require("./atlas-authoring-readiness.js");
const { verifyGitHubActionsOidc } = require("./atlas-github-oidc.js");

const TRANSPORT_MARKER = "ATLAS_AUTHORING_TRANSPORT_V2";
const TRANSPORT_VERSION = 2;
const OPERATION_APPLY = "apply_manifest";
const OPERATION_BOOTSTRAP = "bootstrap";
const MANIFEST_PATH_RE = /^authoring\/requests\/[A-Za-z0-9._-]+\.json$/;
const SHA_RE = /^[0-9a-f]{40}$/;

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

function runtimeIdentity(env) {
  if (env?.VERCEL_ENV !== "production") throw new Error("AUTHORING_APPLY_NOT_PRODUCTION");
  if (env?.VERCEL_GIT_COMMIT_REF !== "main") throw new Error("AUTHORING_APPLY_NOT_MAIN");
  const runtimeSha = String(env?.VERCEL_GIT_COMMIT_SHA || "").trim().toLowerCase();
  if (!SHA_RE.test(runtimeSha)) throw new Error("VERCEL_GIT_COMMIT_SHA_REQUIRED");
  if (String(env?.VERCEL_GIT_REPO_OWNER || "").trim() !== "JezCH") throw new Error("VERCEL_REPOSITORY_MISMATCH");
  if (String(env?.VERCEL_GIT_REPO_SLUG || "").trim() !== "atlas-person-db") throw new Error("VERCEL_REPOSITORY_MISMATCH");
  return Object.freeze({ runtime_sha:runtimeSha, branch:"main", repository:"JezCH/atlas-person-db" });
}

function requireRuntime(env, requestedRuntimeSha) {
  const requested = String(requestedRuntimeSha || "").trim().toLowerCase();
  if (!SHA_RE.test(requested)) throw new Error("AUTHORING_RUNTIME_SHA_REQUIRED");
  const runtime = runtimeIdentity(env);
  if (runtime.runtime_sha !== requested) throw new Error("AUTHORING_RUNTIME_SHA_MISMATCH");
  return runtime;
}

function requireTransportEnvelope(body) {
  if (Number(body?.transport_version) !== TRANSPORT_VERSION) throw new Error("AUTHORING_TRANSPORT_VERSION_REQUIRED");
  const runtimeSha = String(body?.runtime_sha || "").trim().toLowerCase();
  const authoringSha = String(body?.authoring_sha || "").trim().toLowerCase();
  if (!SHA_RE.test(runtimeSha)) throw new Error("AUTHORING_RUNTIME_SHA_REQUIRED");
  if (!SHA_RE.test(authoringSha)) throw new Error("AUTHORING_SHA_REQUIRED");
  return { runtimeSha, authoringSha };
}

function requireApplyPayload(body) {
  const operation = String(body?.operation || OPERATION_APPLY).trim();
  if (operation !== OPERATION_APPLY) throw new Error("AUTHORING_OPERATION_UNSUPPORTED");
  const envelope = requireTransportEnvelope(body);
  const manifestPath = String(body?.manifest_path || "").trim();
  if (!MANIFEST_PATH_RE.test(manifestPath)) throw new Error("AUTHORING_MANIFEST_PATH_NOT_ALLOWED");
  if (!body?.manifest || typeof body.manifest !== "object" || Array.isArray(body.manifest)) throw new Error("AUTHORING_MANIFEST_OBJECT_REQUIRED");
  return { ...envelope, operation, manifestPath, manifest:body.manifest };
}

function requireBootstrapPayload(body) {
  const operation = String(body?.operation || "").trim();
  if (operation !== OPERATION_BOOTSTRAP) throw new Error("AUTHORING_OPERATION_UNSUPPORTED");
  const envelope = requireTransportEnvelope(body);
  if (body?.manifest != null || body?.manifest_path != null) throw new Error("AUTHORING_BOOTSTRAP_MANIFEST_FORBIDDEN");
  return { ...envelope, operation };
}

function statusForError(code) {
  if (code === "AUTHORING_RUNTIME_SHA_MISMATCH") return 409;
  if (/OIDC|APPROVED|COLLISION|AMBIGUOUS|DUPLICATE|UNRESOLVED|UNSUPPORTED|REQUIRED|NOT_FOUND|FAILED|MISMATCH|DRIFT|INVALID|FORBIDDEN|RETIRED|NOT_READY/.test(code)) return 409;
  if (/NOT_PRODUCTION|NOT_MAIN|REPOSITORY|SUPABASE/.test(code)) return 503;
  return 500;
}

function createAuthoringApplyHandler({
  env = process.env,
  verifyOidc = verifyGitHubActionsOidc,
  createClient = createPostgresClient,
  applyMigrations = applyAuthoringMigrations,
  inspectReadiness = inspectAuthoringReadiness,
  createDispatch = createAuthoringManifestDispatchService
} = {}) {
  return async function handler(req, res) {
    if (req?.method === "GET") {
      let runtime;
      try {
        runtime = runtimeIdentity(env);
      } catch (error) {
        const code = String(error?.message || "AUTHORING_RUNTIME_REJECTED");
        return json(res, statusForError(code), { ok:false, marker:TRANSPORT_MARKER, transport_version:TRANSPORT_VERSION, code });
      }

      const databaseUrl = String(env?.SUPABASE_DB_URL || "").trim();
      if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) return json(res, 503, { ok:false, marker:TRANSPORT_MARKER, transport_version:TRANSPORT_VERSION, code:"SUPABASE_DB_URL_REQUIRED" });

      let client;
      try {
        client = await createClient(databaseUrl, { env });
        const readiness = await inspectReadiness(client);
        return json(res, 200, {
          ok: true,
          marker: TRANSPORT_MARKER,
          transport_version: TRANSPORT_VERSION,
          runtime_sha: runtime.runtime_sha,
          ready: readiness.ready,
          bootstrap_ready: readiness.bootstrap_ready,
          bootstrap_required: readiness.bootstrap_required,
          readiness
        });
      } catch (error) {
        const code = String(error?.message || "AUTHORING_READINESS_FAILED");
        return json(res, statusForError(code), { ok:false, marker:TRANSPORT_MARKER, transport_version:TRANSPORT_VERSION, runtime_sha:runtime.runtime_sha, code });
      } finally {
        if (client && typeof client.end === "function") {
          try { await client.end(); } catch {}
        }
      }
    }

    if (req?.method !== "POST") return json(res, 405, { ok:false, marker:TRANSPORT_MARKER, transport_version:TRANSPORT_VERSION, code:"METHOD_NOT_ALLOWED" });

    let payload;
    try {
      const body = parseBody(req);
      const operation = String(body?.operation || OPERATION_APPLY).trim();
      if (operation === OPERATION_BOOTSTRAP) payload = requireBootstrapPayload(body);
      else if (operation === OPERATION_APPLY) payload = requireApplyPayload(body);
      else throw new Error("AUTHORING_OPERATION_UNSUPPORTED");
      requireRuntime(env, payload.runtimeSha);
    } catch (error) {
      const code = String(error?.message || "INVALID_REQUEST");
      const body = { ok:false, marker:TRANSPORT_MARKER, transport_version:TRANSPORT_VERSION, code };
      if (code === "AUTHORING_RUNTIME_SHA_MISMATCH") body.runtime_sha = env?.VERCEL_GIT_COMMIT_SHA || null;
      return json(res, code === "AUTHORING_RUNTIME_SHA_MISMATCH" ? 409 : 400, body);
    }

    const token = bearerToken(req);
    if (!token) return json(res, 401, { ok:false, marker:TRANSPORT_MARKER, transport_version:TRANSPORT_VERSION, code:"GITHUB_OIDC_TOKEN_REQUIRED" });

    try {
      await verifyOidc(token, { expectedSha:payload.authoringSha });
    } catch (error) {
      return json(res, 403, { ok:false, marker:TRANSPORT_MARKER, transport_version:TRANSPORT_VERSION, code:String(error?.message || "GITHUB_OIDC_REJECTED") });
    }

    const databaseUrl = String(env?.SUPABASE_DB_URL || "").trim();
    if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) return json(res, 503, { ok:false, marker:TRANSPORT_MARKER, transport_version:TRANSPORT_VERSION, code:"SUPABASE_DB_URL_REQUIRED" });

    let client;
    try {
      client = await createClient(databaseUrl, { env });
      await applyMigrations(client);
      const readiness = await inspectReadiness(client);
      if (!readiness.ready) throw new Error("AUTHORING_PRODUCTION_NOT_READY");

      if (payload.operation === OPERATION_BOOTSTRAP) {
        return json(res, 200, {
          ok: true,
          marker: TRANSPORT_MARKER,
          transport_marker: TRANSPORT_MARKER,
          transport_version: TRANSPORT_VERSION,
          operation: OPERATION_BOOTSTRAP,
          runtime_sha: payload.runtimeSha,
          authoring_sha: payload.authoringSha,
          bootstrap_complete: true,
          ready: true,
          readiness
        });
      }

      const transport = Object.freeze({
        version: TRANSPORT_VERSION,
        runtime_sha: payload.runtimeSha,
        authoring_sha: payload.authoringSha,
        manifest_path: payload.manifestPath
      });
      const outcome = await createDispatch({ client }).apply(payload.manifest, { transport });
      return json(res, 200, {
        ok: true,
        marker: outcome.marker,
        transport_marker: TRANSPORT_MARKER,
        transport_version: TRANSPORT_VERSION,
        runtime_sha: payload.runtimeSha,
        authoring_sha: payload.authoringSha,
        request_id: outcome.request_id,
        committed: outcome.committed,
        replay: outcome.replay,
        person_id: outcome.person_id,
        relationship_id: outcome.relationship_id,
        ...(outcome.polity_id ? { polity_id:outcome.polity_id } : {}),
        ...(outcome.role_id ? { role_id:outcome.role_id } : {}),
        result: outcome.result,
        manifest_path: payload.manifestPath
      });
    } catch (error) {
      const code = String(error?.message || "AUTHORING_APPLY_FAILED");
      return json(res, statusForError(code), { ok:false, marker:TRANSPORT_MARKER, transport_version:TRANSPORT_VERSION, operation:payload.operation, runtime_sha:payload.runtimeSha, authoring_sha:payload.authoringSha, code });
    } finally {
      if (client && typeof client.end === "function") {
        try { await client.end(); } catch {}
      }
    }
  };
}

module.exports = Object.freeze({
  createAuthoringApplyHandler,
  requireTransportEnvelope,
  requireApplyPayload,
  requireBootstrapPayload,
  runtimeIdentity,
  requireRuntime,
  bearerToken,
  MANIFEST_PATH_RE,
  TRANSPORT_MARKER,
  TRANSPORT_VERSION,
  OPERATION_APPLY,
  OPERATION_BOOTSTRAP
});
