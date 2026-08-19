"use strict";

const { createPostgresClient } = require("./atlas-postgres-client.js");
const { createMutationAuthorizer, requireEnv } = require("./atlas-session-auth.js");
const { verifyGitHubActionsOidc } = require("./atlas-github-oidc.js");
const { inspectAuthoringReadiness } = require("./atlas-authoring-readiness.js");
const { runtimeIdentity, requireRuntime, bearerToken, MANIFEST_PATH_RE, TRANSPORT_VERSION } = require("./atlas-authoring-apply-handler.js");
const { HUMAN_AUTHORING_MARKER, HUMAN_AUTHORING_SCHEMA, createHumanAuthoringService, loadHumanAuthoringCatalogs } = require("./atlas-human-authoring-service.js");

const HUMAN_AUTHORING_BATCH_MARKER = "ATLAS_HUMAN_AUTHORING_BATCH_V1";
const HUMAN_AUTHORING_BATCH_SCHEMA = "atlas-human-authoring-batch/v1";
const HUMAN_AUTHORING_BATCH_LIMIT = 100;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  if (req?.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req?.body === "string") {
    try { return JSON.parse(req.body); } catch { throw new Error("HUMAN_AUTHORING_INVALID_JSON"); }
  }
  throw new Error("HUMAN_AUTHORING_BODY_REQUIRED");
}

function statusForError(code) {
  if (/UNAUTHORIZED|OIDC/.test(code)) return 401;
  if (/COLLISION|AMBIGUOUS|DUPLICATE|UNRESOLVED|CONFLICT|DRIFT|NOT_READY/.test(code)) return 409;
  if (/REQUIRED|INVALID|FORBIDDEN|MISMATCH/.test(code)) return 400;
  if (/SUPABASE|NOT_PRODUCTION|NOT_MAIN|REPOSITORY/.test(code)) return 503;
  return 500;
}

function isBatchOperation(body) {
  return String(body?.operation || "").trim() === "apply_batch";
}

function transportEnvelope(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  if (body.transport_version == null && body.runtime_sha == null && body.authoring_sha == null && body.manifest_path == null) return null;
  if (Number(body.transport_version) !== TRANSPORT_VERSION) throw new Error("HUMAN_AUTHORING_TRANSPORT_VERSION_INVALID");
  const runtimeSha = String(body.runtime_sha || "").trim().toLowerCase();
  const authoringSha = String(body.authoring_sha || "").trim().toLowerCase();
  const manifestPath = String(body.manifest_path || "").trim();
  if (!/^[0-9a-f]{40}$/.test(runtimeSha)) throw new Error("HUMAN_AUTHORING_RUNTIME_SHA_REQUIRED");
  if (!/^[0-9a-f]{40}$/.test(authoringSha)) throw new Error("HUMAN_AUTHORING_SHA_REQUIRED");
  if (!MANIFEST_PATH_RE.test(manifestPath)) throw new Error("HUMAN_AUTHORING_MANIFEST_PATH_NOT_ALLOWED");
  return Object.freeze({ runtimeSha, authoringSha, manifestPath });
}

function batchEnvelope(body) {
  if (!isBatchOperation(body)) return null;
  if (Number(body.transport_version) !== TRANSPORT_VERSION) throw new Error("HUMAN_AUTHORING_TRANSPORT_VERSION_INVALID");
  const runtimeSha = String(body.runtime_sha || "").trim().toLowerCase();
  const authoringSha = String(body.authoring_sha || "").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(runtimeSha)) throw new Error("HUMAN_AUTHORING_RUNTIME_SHA_REQUIRED");
  if (!/^[0-9a-f]{40}$/.test(authoringSha)) throw new Error("HUMAN_AUTHORING_SHA_REQUIRED");

  const manifestPaths = body.manifest_paths;
  const requests = body.requests;
  if (!Array.isArray(manifestPaths) || manifestPaths.length === 0) throw new Error("HUMAN_AUTHORING_BATCH_PATHS_REQUIRED");
  if (!Array.isArray(requests) || requests.length === 0) throw new Error("HUMAN_AUTHORING_BATCH_REQUESTS_REQUIRED");
  if (manifestPaths.length !== requests.length) throw new Error("HUMAN_AUTHORING_BATCH_LENGTH_MISMATCH");
  if (manifestPaths.length > HUMAN_AUTHORING_BATCH_LIMIT) throw new Error("HUMAN_AUTHORING_BATCH_SIZE_INVALID");

  const normalizedPaths = manifestPaths.map((value) => {
    const path = String(value || "").trim();
    if (!MANIFEST_PATH_RE.test(path)) throw new Error("HUMAN_AUTHORING_MANIFEST_PATH_NOT_ALLOWED");
    return path;
  });
  for (const request of requests) {
    if (!request || typeof request !== "object" || Array.isArray(request)) throw new Error("HUMAN_AUTHORING_BATCH_REQUEST_INVALID");
  }
  return Object.freeze({
    runtimeSha,
    authoringSha,
    manifestPaths:Object.freeze(normalizedPaths),
    requests:Object.freeze([...requests])
  });
}

async function authorizeRequest(req, body, { env, verifyOidc, now }) {
  const requestedBatch = isBatchOperation(body);
  const authorize = createMutationAuthorizer({ env, ...(typeof now === "function" ? { now } : {}) });
  const regular = await authorize({ method:req?.method, headers:req?.headers || {}, body });
  if (regular?.authorized) {
    if (requestedBatch) throw new Error("HUMAN_AUTHORING_BATCH_GITHUB_OIDC_REQUIRED");
    let runtimeSha = null;
    try { runtimeSha = runtimeIdentity(env).runtime_sha; } catch {}
    return Object.freeze({
      method:regular.method,
      transport:Object.freeze({ kind:regular.method === "session" ? "admin_session" : "admin_bearer", runtime_sha:runtimeSha })
    });
  }

  const token = bearerToken(req);
  if (requestedBatch) {
    const batch = batchEnvelope(body);
    if (!batch || !token) throw new Error("HUMAN_AUTHORING_UNAUTHORIZED");
    requireRuntime(env, batch.runtimeSha);
    await verifyOidc(token, { expectedSha:batch.authoringSha });
    return Object.freeze({
      method:"github_oidc",
      batch,
      transport:Object.freeze({
        kind:"github_oidc",
        version:TRANSPORT_VERSION,
        runtime_sha:batch.runtimeSha,
        authoring_sha:batch.authoringSha
      })
    });
  }

  const envelope = transportEnvelope(body);
  if (!envelope || !token) throw new Error("HUMAN_AUTHORING_UNAUTHORIZED");
  requireRuntime(env, envelope.runtimeSha);
  await verifyOidc(token, { expectedSha:envelope.authoringSha });
  return Object.freeze({
    method:"github_oidc",
    transport:Object.freeze({ kind:"github_oidc", version:TRANSPORT_VERSION, runtime_sha:envelope.runtimeSha, authoring_sha:envelope.authoringSha, manifest_path:envelope.manifestPath })
  });
}

function createHumanAuthoringHandler({ env = process.env, clientFactory = createPostgresClient, verifyOidc = verifyGitHubActionsOidc, inspectReadiness = inspectAuthoringReadiness, createService = createHumanAuthoringService, loadCatalogs = loadHumanAuthoringCatalogs, now } = {}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");
  return async function handler(req, res) {
    if (!["GET", "POST"].includes(String(req?.method || "").toUpperCase())) return json(res, 405, { ok:false, marker:HUMAN_AUTHORING_MARKER, code:"METHOD_NOT_ALLOWED" });
    let databaseUrl;
    try {
      databaseUrl = requireEnv(env, "SUPABASE_DB_URL");
      createMutationAuthorizer({ env, ...(typeof now === "function" ? { now } : {}) });
    } catch {
      return json(res, 503, { ok:false, marker:HUMAN_AUTHORING_MARKER, code:"SERVER_CONFIGURATION_ERROR" });
    }
    let body = null;
    if (String(req.method).toUpperCase() === "POST") {
      try { body = parseBody(req); }
      catch (error) { return json(res, 400, { ok:false, marker:HUMAN_AUTHORING_MARKER, code:String(error.message) }); }
    }
    let auth;
    try { auth = await authorizeRequest(req, body, { env, verifyOidc, now }); }
    catch (error) {
      const code = String(error?.message || "HUMAN_AUTHORING_UNAUTHORIZED");
      return json(res, statusForError(code), { ok:false, marker:HUMAN_AUTHORING_MARKER, code });
    }
    let client;
    try {
      client = await clientFactory(databaseUrl, { env });
      const readiness = await inspectReadiness(client);
      if (!readiness.ready) throw new Error("HUMAN_AUTHORING_PRODUCTION_NOT_READY");
      if (String(req.method).toUpperCase() === "GET") {
        const catalogs = await loadCatalogs(client);
        return json(res, 200, { ok:true, marker:HUMAN_AUTHORING_MARKER, schema:HUMAN_AUTHORING_SCHEMA, auth_method:auth.method, ready:true, catalogs });
      }

      const service = createService({ client });
      if (auth.batch) {
        const results = [];
        const failures = [];
        for (let index = 0; index < auth.batch.requests.length; index += 1) {
          const manifestPath = auth.batch.manifestPaths[index];
          const transport = Object.freeze({
            ...auth.transport,
            manifest_path:manifestPath
          });
          try {
            results.push(await service.apply(auth.batch.requests[index], { transport }));
          } catch (error) {
            const code = String(error?.message || "HUMAN_AUTHORING_FAILED");
            failures.push(Object.freeze({
              index,
              manifest_path:manifestPath,
              code,
              status:statusForError(code)
            }));
          }
        }
        if (failures.length) {
          return json(res, 409, {
            ok:false,
            auth_method:auth.method,
            marker:HUMAN_AUTHORING_BATCH_MARKER,
            schema:HUMAN_AUTHORING_BATCH_SCHEMA,
            code:"HUMAN_AUTHORING_BATCH_PARTIAL_FAILURE",
            committed:false,
            count:auth.batch.requests.length,
            succeeded_count:results.length,
            failed_count:failures.length,
            results,
            failures,
            failed_index:failures[0].index,
            manifest_path:failures[0].manifest_path
          });
        }
        return json(res, 200, {
          ok:true,
          auth_method:auth.method,
          marker:HUMAN_AUTHORING_BATCH_MARKER,
          schema:HUMAN_AUTHORING_BATCH_SCHEMA,
          committed:true,
          count:results.length,
          results
        });
      }

      const request = body?.request && typeof body.request === "object" && !Array.isArray(body.request) ? body.request : body;
      const outcome = await service.apply(request, { transport:auth.transport });
      return json(res, 200, { ok:true, auth_method:auth.method, ...outcome });
    } catch (error) {
      const code = String(error?.message || "HUMAN_AUTHORING_FAILED");
      const failure = { ok:false, marker:HUMAN_AUTHORING_MARKER, code };
      if (Number.isInteger(error?.batchIndex)) failure.failed_index = error.batchIndex;
      if (error?.manifestPath) failure.manifest_path = error.manifestPath;
      return json(res, statusForError(code), failure);
    } finally {
      if (client && typeof client.end === "function") {
        try { await client.end(); } catch {}
      }
    }
  };
}

module.exports = Object.freeze({
  HUMAN_AUTHORING_BATCH_MARKER,
  HUMAN_AUTHORING_BATCH_SCHEMA,
  HUMAN_AUTHORING_BATCH_LIMIT,
  createHumanAuthoringHandler,
  parseBody,
  statusForError,
  isBatchOperation,
  transportEnvelope,
  batchEnvelope,
  authorizeRequest
});