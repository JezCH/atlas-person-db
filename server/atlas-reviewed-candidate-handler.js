"use strict";

const { createPostgresClient } = require("./atlas-postgres-client.js");
const { createMutationAuthorizer, requireEnv } = require("./atlas-session-auth.js");
const { verifyGitHubActionsOidc } = require("./atlas-github-oidc.js");
const { inspectAuthoringReadiness } = require("./atlas-authoring-readiness.js");
const {
  runtimeIdentity,
  requireRuntime,
  bearerToken,
  TRANSPORT_VERSION
} = require("./atlas-authoring-apply-handler.js");
const { createReviewedCandidateRegistrationService } = require("./atlas-reviewed-candidate-registration-service.js");

const MARKER = "ATLAS_REVIEWED_CANDIDATE_LIFECYCLE_V1";
const OP_RECORD_REVIEW = "record_review";
const OP_APPLY_CANDIDATE = "apply_reviewed_candidate";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  if (req?.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req?.body === "string") {
    try { return JSON.parse(req.body); } catch { throw new Error("CANDIDATE_LIFECYCLE_INVALID_JSON"); }
  }
  throw new Error("CANDIDATE_LIFECYCLE_BODY_REQUIRED");
}

function operationOf(body) {
  const operation = String(body?.operation || "").trim();
  if (![OP_RECORD_REVIEW, OP_APPLY_CANDIDATE].includes(operation)) throw new Error("CANDIDATE_LIFECYCLE_OPERATION_INVALID");
  return operation;
}

function candidateTransportEnvelope(body) {
  if (Number(body?.transport_version) !== TRANSPORT_VERSION) throw new Error("CANDIDATE_TRANSPORT_VERSION_INVALID");
  const runtimeSha = String(body?.runtime_sha || "").trim().toLowerCase();
  const authoringSha = String(body?.authoring_sha || "").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(runtimeSha)) throw new Error("CANDIDATE_RUNTIME_SHA_REQUIRED");
  if (!/^[0-9a-f]{40}$/.test(authoringSha)) throw new Error("CANDIDATE_AUTHORING_SHA_REQUIRED");
  return Object.freeze({ runtimeSha, authoringSha });
}

async function authorizeCandidateRequest(req, body, {
  env = process.env,
  verifyOidc = verifyGitHubActionsOidc,
  now
} = {}) {
  const operation = operationOf(body);
  const authorize = createMutationAuthorizer({ env, ...(typeof now === "function" ? { now } : {}) });
  const regular = await authorize({ method:req?.method, headers:req?.headers || {}, body });

  if (operation === OP_RECORD_REVIEW) {
    if (!regular?.authorized || !["session","bearer"].includes(regular.method)) {
      throw new Error("CANDIDATE_REVIEW_HUMAN_AUTH_REQUIRED");
    }
    let runtimeSha = null;
    try { runtimeSha = runtimeIdentity(env).runtime_sha; } catch {}
    return Object.freeze({
      operation,
      method:regular.method,
      transport:Object.freeze({
        kind:regular.method === "session" ? "admin_session" : "admin_bearer",
        runtime_sha:runtimeSha
      })
    });
  }

  if (regular?.authorized) {
    let runtimeSha = null;
    try { runtimeSha = runtimeIdentity(env).runtime_sha; } catch {}
    return Object.freeze({
      operation,
      method:regular.method,
      transport:Object.freeze({
        kind:regular.method === "session" ? "admin_session" : "admin_bearer",
        runtime_sha:runtimeSha
      })
    });
  }

  const envelope = candidateTransportEnvelope(body);
  const token = bearerToken(req);
  if (!token) throw new Error("CANDIDATE_APPLY_UNAUTHORIZED");
  requireRuntime(env, envelope.runtimeSha);
  await verifyOidc(token, { expectedSha:envelope.authoringSha });
  return Object.freeze({
    operation,
    method:"github_oidc",
    transport:Object.freeze({
      kind:"github_oidc",
      version:TRANSPORT_VERSION,
      runtime_sha:envelope.runtimeSha,
      authoring_sha:envelope.authoringSha
    })
  });
}

function statusForError(code) {
  if (/HUMAN_AUTH|UNAUTHORIZED|OIDC/.test(code)) return 401;
  if (/STALE|CONFLICT|COLLISION|DRIFT|NOT_QUEUED|ALREADY_APPLYING|TERMINAL|NOT_READY|REPLAY_REQUIRED|READBACK/.test(code)) return 409;
  if (/REQUIRED|REQUIRES_HUMAN_APPROVED_REVISION|INVALID|FORBIDDEN|NOT_FOUND|TRANSITION/.test(code)) return 400;
  if (/SUPABASE|NOT_PRODUCTION|NOT_MAIN|REPOSITORY/.test(code)) return 503;
  return 500;
}

function reviewInput(body) {
  const review = body?.review;
  if (!review || typeof review !== "object" || Array.isArray(review)) throw new Error("CANDIDATE_REVIEW_OBJECT_REQUIRED");
  return review;
}

function applyInput(body) {
  const candidate_id = String(body?.candidate_id || "").trim();
  const review_revision = Number(body?.review_revision);
  if (!candidate_id) throw new Error("CANDIDATE_ID_REQUIRED");
  if (!Number.isInteger(review_revision) || review_revision < 1) throw new Error("REVIEW_REVISION_REQUIRED");
  return Object.freeze({ candidate_id, review_revision });
}

function createReviewedCandidateHandler({
  env = process.env,
  clientFactory = createPostgresClient,
  verifyOidc = verifyGitHubActionsOidc,
  inspectReadiness = inspectAuthoringReadiness,
  createService = createReviewedCandidateRegistrationService,
  now
} = {}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");

  return async function handler(req, res) {
    if (String(req?.method || "").toUpperCase() !== "POST") {
      return json(res, 405, { ok:false, marker:MARKER, code:"METHOD_NOT_ALLOWED" });
    }

    let databaseUrl;
    let body;
    let auth;
    try {
      databaseUrl = requireEnv(env, "SUPABASE_DB_URL");
      body = parseBody(req);
      auth = await authorizeCandidateRequest(req, body, { env, verifyOidc, now });
    } catch (error) {
      const code = String(error?.message || "CANDIDATE_LIFECYCLE_REQUEST_FAILED");
      return json(res, statusForError(code), { ok:false, marker:MARKER, code });
    }

    let client;
    try {
      client = await clientFactory(databaseUrl, { env });
      const readiness = await inspectReadiness(client);
      if (!readiness.ready) throw new Error("CANDIDATE_LIFECYCLE_PRODUCTION_NOT_READY");
      const service = createService({ client });

      if (auth.operation === OP_RECORD_REVIEW) {
        const result = await service.recordHumanReview(reviewInput(body));
        return json(res, 200, {
          ok:true,
          marker:MARKER,
          operation:OP_RECORD_REVIEW,
          auth_method:auth.method,
          committed:true,
          ...result
        });
      }

      const input = applyInput(body);
      const result = await service.applyQueued({ ...input, transport:auth.transport });
      return json(res, 200, {
        ok:true,
        marker:MARKER,
        operation:OP_APPLY_CANDIDATE,
        auth_method:auth.method,
        committed:true,
        ...result
      });
    } catch (error) {
      const code = String(error?.message || "CANDIDATE_LIFECYCLE_FAILED");
      return json(res, statusForError(code), { ok:false, marker:MARKER, code });
    } finally {
      if (client && typeof client.end === "function") {
        try { await client.end(); } catch {}
      }
    }
  };
}

module.exports = Object.freeze({
  MARKER,
  OP_RECORD_REVIEW,
  OP_APPLY_CANDIDATE,
  parseBody,
  operationOf,
  candidateTransportEnvelope,
  authorizeCandidateRequest,
  statusForError,
  reviewInput,
  applyInput,
  createReviewedCandidateHandler
});
