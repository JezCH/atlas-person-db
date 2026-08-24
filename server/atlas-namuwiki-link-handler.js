"use strict";

const crypto = require("node:crypto");
const { createPostgresClient } = require("./atlas-postgres-client.js");
const { inspectAuthoringReadiness } = require("./atlas-authoring-readiness.js");
const { verifyGitHubActionsOidc } = require("./atlas-namuwiki-link-github-oidc.js");
const { createPersonProfileMutationService, normalizeNamuWikiInput } = require("./atlas-person-profile-service.js");
const { bearerToken, requireRuntime } = require("./atlas-authoring-apply-handler.js");

const MARKER = "ATLAS_NAMUWIKI_LINK_V1";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA_RE = /^[0-9a-f]{40}$/;
const ALLOWED_BODY_KEYS = new Set(["runtime_sha", "workflow_sha", "person_id", "url"]);

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  if (req?.body && typeof req.body === "object" && !Buffer.isBuffer(req.body) && !Array.isArray(req.body)) return req.body;
  if (typeof req?.body === "string") {
    try {
      const parsed = JSON.parse(req.body);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {}
    throw new Error("NAMUWIKI_LINK_INVALID_JSON");
  }
  throw new Error("NAMUWIKI_LINK_BODY_REQUIRED");
}

function requireCanonicalNamuWikiUrl(value) {
  const text = String(value || "").trim();
  if (!/^https:\/\/namu\.wiki\/w\//.test(text)) throw new Error("NAMUWIKI_LINK_CANONICAL_URL_REQUIRED");
  let parsed;
  try { parsed = new URL(text); } catch { throw new Error("NAMUWIKI_LINK_CANONICAL_URL_REQUIRED"); }
  if (parsed.search || parsed.hash) throw new Error("NAMUWIKI_LINK_CANONICAL_URL_REQUIRED");
  const normalized = normalizeNamuWikiInput(text);
  if (normalized.provider !== "namuwiki" || normalized.status !== "linked") throw new Error("NAMUWIKI_LINK_CANONICAL_URL_REQUIRED");
  return normalized;
}

function requireNamuWikiLinkPayload(body) {
  for (const key of Object.keys(body || {})) {
    if (!ALLOWED_BODY_KEYS.has(key)) throw new Error("NAMUWIKI_LINK_UNEXPECTED_FIELD");
  }
  const runtimeSha = String(body?.runtime_sha || "").trim().toLowerCase();
  if (!SHA_RE.test(runtimeSha)) throw new Error("NAMUWIKI_LINK_RUNTIME_SHA_REQUIRED");
  const workflowSha = String(body?.workflow_sha || "").trim().toLowerCase();
  if (!SHA_RE.test(workflowSha)) throw new Error("NAMUWIKI_LINK_WORKFLOW_SHA_REQUIRED");
  const personId = String(body?.person_id || "").trim().toLowerCase();
  if (!UUID_RE.test(personId)) throw new Error("NAMUWIKI_LINK_PERSON_ID_REQUIRED");
  const externalReference = requireCanonicalNamuWikiUrl(body?.url);
  return Object.freeze({ runtimeSha, workflowSha, personId, externalReference });
}

function requestIdFor(personId, url) {
  const digest = crypto.createHash("sha256").update(url, "utf8").digest("hex").slice(0, 24);
  return `namuwiki-link:${personId}:${digest}`;
}

function statusForError(code) {
  if (code === "PERSON_PROFILE_TARGET_NOT_FOUND") return 404;
  if (code === "PERSON_EXTERNAL_REFERENCE_OVERWRITE_REVIEW_REQUIRED" || code === "AUTHORING_RUNTIME_SHA_MISMATCH") return 409;
  if (/REQUIRED|INVALID|UNEXPECTED|CANONICAL_URL|UNSUPPORTED/.test(code)) return 400;
  if (/NOT_READY|COLLISION|AMBIGUOUS|REVIEW_REQUIRED|MISMATCH|DRIFT/.test(code)) return 409;
  if (/NOT_PRODUCTION|NOT_MAIN|REPOSITORY|SUPABASE|VERCEL_/.test(code)) return 503;
  return 500;
}

function createNamuWikiLinkHandler({
  env = process.env,
  verifyOidc = verifyGitHubActionsOidc,
  createClient = createPostgresClient,
  inspectReadiness = inspectAuthoringReadiness,
  createProfileService = createPersonProfileMutationService
} = {}) {
  return async function handler(req, res) {
    if (req?.method === "GET") {
      let runtime;
      try {
        runtime = requireRuntime(env, env?.VERCEL_GIT_COMMIT_SHA);
      } catch (error) {
        const code = String(error?.message || "NAMUWIKI_LINK_RUNTIME_REJECTED");
        return json(res, statusForError(code), { ok:false, marker:MARKER, code });
      }
      return json(res, 200, { ok:true, marker:MARKER, runtime_sha:runtime.runtime_sha, command:"/namuwiki-link <person_uuid> <canonical_namuwiki_url>" });
    }

    if (req?.method !== "POST") return json(res, 405, { ok:false, marker:MARKER, code:"METHOD_NOT_ALLOWED" });

    let payload;
    try {
      payload = requireNamuWikiLinkPayload(parseBody(req));
      requireRuntime(env, payload.runtimeSha);
    } catch (error) {
      const code = String(error?.message || "NAMUWIKI_LINK_INVALID_REQUEST");
      return json(res, statusForError(code), { ok:false, marker:MARKER, code });
    }

    const token = bearerToken(req);
    if (!token) return json(res, 401, { ok:false, marker:MARKER, code:"NAMUWIKI_LINK_OIDC_TOKEN_REQUIRED" });

    try {
      await verifyOidc(token, { expectedSha:payload.workflowSha });
    } catch (error) {
      return json(res, 403, { ok:false, marker:MARKER, code:String(error?.message || "NAMUWIKI_LINK_OIDC_REJECTED") });
    }

    const databaseUrl = String(env?.SUPABASE_DB_URL || "").trim();
    if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) return json(res, 503, { ok:false, marker:MARKER, code:"SUPABASE_DB_URL_REQUIRED" });

    let client;
    try {
      client = await createClient(databaseUrl, { env });
      const readiness = await inspectReadiness(client);
      if (!readiness.ready) throw new Error("NAMUWIKI_LINK_PRODUCTION_NOT_READY");

      const requestId = requestIdFor(payload.personId, payload.externalReference.url);
      const outcome = await createProfileService({ client }).mutate({
        request_id: requestId,
        operation: "set_person_external_reference",
        payload: {
          person_id: payload.personId,
          provider: "namuwiki",
          value: payload.externalReference.url,
          prevent_overwrite: true
        }
      });

      if (!outcome.committed) {
        const code = outcome.validation_failures?.[0]?.code || outcome.transaction_failure || "NAMUWIKI_LINK_MUTATION_FAILED";
        return json(res, statusForError(code), {
          ok:false,
          marker:MARKER,
          runtime_sha:payload.runtimeSha,
          person_id:payload.personId,
          code
        });
      }

      const reference = outcome.v2?.external_reference || outcome.verification?.external_reference || null;
      if (!reference || reference.url !== payload.externalReference.url || reference.document_title !== payload.externalReference.document_title) {
        throw new Error("NAMUWIKI_LINK_SERVER_VERIFICATION_MISMATCH");
      }

      return json(res, 200, {
        ok:true,
        marker:MARKER,
        runtime_sha:payload.runtimeSha,
        request_id:requestId,
        person_id:payload.personId,
        committed:true,
        replay:Boolean(outcome.replay),
        external_reference:reference,
        verification:outcome.verification
      });
    } catch (error) {
      const code = String(error?.message || "NAMUWIKI_LINK_FAILED");
      return json(res, statusForError(code), {
        ok:false,
        marker:MARKER,
        runtime_sha:payload.runtimeSha,
        person_id:payload.personId,
        code
      });
    } finally {
      if (client && typeof client.end === "function") {
        try { await client.end(); } catch {}
      }
    }
  };
}

module.exports = Object.freeze({
  MARKER,
  UUID_RE,
  SHA_RE,
  requireCanonicalNamuWikiUrl,
  requireNamuWikiLinkPayload,
  requestIdFor,
  statusForError,
  createNamuWikiLinkHandler
});
