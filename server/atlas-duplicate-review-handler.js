"use strict";

const { createMutationAuthorizer, requireEnv } = require("./atlas-session-auth.js");
const { rebuildCandidates, listCandidates, reviewCandidate, schemaUnavailable } = require("./atlas-duplicate-review-service.js");

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function bodyObject(body) {
  if (body && typeof body === "object" && !Buffer.isBuffer(body)) return body;
  if (typeof body === "string" && body.trim()) return JSON.parse(body);
  return {};
}

function createDuplicateReviewHandler({ clientFactory, env = process.env, now } = {}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");
  const databaseUrl = requireEnv(env, "SUPABASE_DB_URL");
  const authorize = createMutationAuthorizer({ env, ...(typeof now === "function" ? { now } : {}) });

  return async function handler(req, res) {
    const method = String(req?.method || "GET").toUpperCase();
    if (!new Set(["GET", "POST"]).has(method)) {
      sendJson(res, 405, { ok: false, error: "method not allowed" });
      return;
    }

    const auth = await authorize({ method, headers: req?.headers || {}, body: req?.body });
    if (!auth?.authorized) {
      sendJson(res, 401, { ok: false, error: auth?.reason || "unauthorized" });
      return;
    }

    let body = {};
    if (method === "POST") {
      try { body = bodyObject(req?.body); }
      catch {
        sendJson(res, 400, { ok: false, error: "invalid json body" });
        return;
      }
      const operation = String(body.operation || "").trim().toUpperCase();
      if (!new Set(["REBUILD_CANDIDATES", "REVIEW_CANDIDATE"]).has(operation)) {
        sendJson(res, 400, { ok: false, error: "unknown duplicate-review operation" });
        return;
      }
    }

    const client = await clientFactory(databaseUrl);
    try {
      if (method === "GET") {
        const queue = await listCandidates({ client, includeStale: String(req?.query?.include_stale || "") === "1" });
        sendJson(res, 200, { ok: true, source: "v2-duplicate-review", ...queue });
        return;
      }

      const operation = String(body.operation).trim().toUpperCase();
      if (operation === "REBUILD_CANDIDATES") {
        const outcome = await rebuildCandidates({ client });
        sendJson(res, 200, { ok: true, source: "v2-duplicate-review", operation, ...outcome });
        return;
      }

      const outcome = await reviewCandidate({
        client,
        candidateId: body.candidate_id,
        decision: body.decision,
        rationale: body.rationale,
        requestId: body.request_id,
        reviewerKind: auth.method === "bearer" ? "server_bearer" : "admin_session"
      });
      sendJson(res, 200, { ok: true, source: "v2-duplicate-review", operation, ...outcome });
    } catch (error) {
      console.error("ATLAS duplicate review failed", error);
      if (schemaUnavailable(error)) {
        sendJson(res, 503, { ok: false, code: "PHASE9A_SCHEMA_REQUIRED", error: "duplicate review schema is not applied" });
      } else if (/candidate not found|candidate is stale|decision must|request_id|required|too long/i.test(String(error?.message || ""))) {
        sendJson(res, 409, { ok: false, error: error.message });
      } else {
        sendJson(res, 500, { ok: false, error: "duplicate review operation failed" });
      }
    } finally {
      if (client && typeof client.end === "function") await client.end();
    }
  };
}

module.exports = Object.freeze({ createDuplicateReviewHandler, sendJson, bodyObject });
