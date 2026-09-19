"use strict";

const { requireEnv } = require("./atlas-session-auth.js");
const { createPersonDeleteService } = require("./atlas-person-delete-service.js");
const { verifyPersonHardDeleteGithubOidc } = require("./atlas-person-hard-delete-github-oidc.js");

const MARKER = "ATLAS_PERSON_HARD_DELETE_ONEOFF_V1";
const TARGET_PERSON_ID = "c2f584d8-170b-49ca-a4b7-7afcf18c95b6";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  if (req?.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req?.body === "string") {
    try { return JSON.parse(req.body); } catch { throw new Error("PERSON_HARD_DELETE_INVALID_JSON"); }
  }
  return {};
}

function bearerToken(headers = {}) {
  const raw = String(headers.authorization || headers.Authorization || "").trim();
  const match = raw.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function createPersonHardDeleteHandler({
  clientFactory,
  env = process.env,
  oidcVerifier = verifyPersonHardDeleteGithubOidc
} = {}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");

  return async function handler(req, res) {
    const method = String(req?.method || "GET").toUpperCase();
    if (method === "GET") {
      return json(res, 200, {
        ok:true,
        marker:MARKER,
        target_person_id:TARGET_PERSON_ID,
        runtime_sha:String(env?.VERCEL_GIT_COMMIT_SHA || "").trim().toLowerCase()
      });
    }
    if (method !== "POST") return json(res, 405, { ok:false, marker:MARKER, code:"METHOD_NOT_ALLOWED" });

    let body;
    try {
      body = parseBody(req);
    } catch (error) {
      return json(res, 400, { ok:false, marker:MARKER, code:String(error?.message || "PERSON_HARD_DELETE_INVALID_JSON") });
    }

    const personId = String(body?.person_id || "").trim().toLowerCase();
    const workflowSha = String(body?.workflow_sha || "").trim().toLowerCase();
    if (personId !== TARGET_PERSON_ID) {
      return json(res, 400, { ok:false, marker:MARKER, code:"PERSON_HARD_DELETE_TARGET_NOT_ALLOWED" });
    }
    if (!/^[0-9a-f]{40}$/.test(workflowSha)) {
      return json(res, 400, { ok:false, marker:MARKER, code:"PERSON_HARD_DELETE_WORKFLOW_SHA_REQUIRED" });
    }

    const token = bearerToken(req?.headers || {});
    if (!token) return json(res, 401, { ok:false, marker:MARKER, code:"PERSON_HARD_DELETE_OIDC_REQUIRED" });
    try {
      await oidcVerifier(token, { expectedSha:workflowSha });
    } catch {
      return json(res, 401, { ok:false, marker:MARKER, code:"PERSON_HARD_DELETE_OIDC_REJECTED" });
    }

    let databaseUrl;
    try {
      databaseUrl = requireEnv(env, "SUPABASE_DB_URL");
    } catch {
      return json(res, 503, { ok:false, marker:MARKER, code:"SUPABASE_DB_URL_REQUIRED" });
    }

    let client = null;
    try {
      client = await clientFactory(databaseUrl, { env });
      const service = createPersonDeleteService({ client });
      const outcome = await service.mutate({
        operation:"delete_person",
        request_id:String(body?.request_id || `oneoff-bathory-${workflowSha}`),
        payload:{ person_id:TARGET_PERSON_ID }
      });

      if (outcome?.committed !== true || outcome?.verification?.match !== true) {
        return json(res, 409, { ok:false, marker:MARKER, outcome });
      }
      return json(res, 200, { ok:true, marker:MARKER, outcome });
    } catch (error) {
      return json(res, 500, { ok:false, marker:MARKER, code:String(error?.message || "PERSON_HARD_DELETE_FAILED") });
    } finally {
      if (client && typeof client.end === "function") {
        try { await client.end(); } catch {}
      }
    }
  };
}

module.exports = Object.freeze({
  createPersonHardDeleteHandler,
  parseBody,
  bearerToken,
  MARKER,
  TARGET_PERSON_ID
});
