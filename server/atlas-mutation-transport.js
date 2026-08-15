"use strict";

const ALLOWED_OPERATIONS = new Set(["create", "update", "delete", "delete_person", "import", "reconcile"]);

function jsonResponse(status, body) {
  return {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body)
  };
}

function parseBody(raw) {
  if (raw == null || raw === "") return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    const error = new Error("invalid JSON body");
    error.status = 400;
    throw error;
  }
}

function validateRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, error: "request body must be an object" };
  }
  const operation = String(input.operation || "").trim();
  if (!ALLOWED_OPERATIONS.has(operation)) {
    return { valid: false, error: `unsupported mutation operation: ${operation || "<empty>"}` };
  }
  if (!("payload" in input)) {
    return { valid: false, error: "payload is required" };
  }
  const requestId = input.request_id == null ? null : String(input.request_id).trim();
  if (requestId != null && !requestId) {
    return { valid: false, error: "request_id must be non-empty when supplied" };
  }
  return {
    valid: true,
    request: {
      operation,
      payload: input.payload,
      ...(requestId ? { request_id: requestId } : {})
    }
  };
}

function createMutationTransport({ mutationService, authorize } = {}) {
  if (!mutationService || typeof mutationService.mutate !== "function") {
    throw new Error("mutationService.mutate is required");
  }
  if (authorize != null && typeof authorize !== "function") {
    throw new Error("authorize must be a function when supplied");
  }

  async function handle(request = {}) {
    const method = String(request.method || "POST").toUpperCase();
    if (method !== "POST") {
      return jsonResponse(405, { ok: false, error: "method not allowed" });
    }

    try {
      if (authorize) {
        const auth = await authorize(request);
        if (!auth?.authorized) {
          return jsonResponse(401, { ok: false, error: auth?.reason || "unauthorized" });
        }
      }

      const parsed = parseBody(request.body);
      const validation = validateRequest(parsed);
      if (!validation.valid) {
        return jsonResponse(400, { ok: false, error: validation.error });
      }

      const outcome = await mutationService.mutate(validation.request);
      const status = outcome?.committed ? 200 : outcome?.validation_failures?.length ? 409 : 500;
      return jsonResponse(status, {
        ok: Boolean(outcome?.committed),
        outcome
      });
    } catch (error) {
      const status = Number(error?.status) || 500;
      return jsonResponse(status, {
        ok: false,
        error: error?.message || String(error)
      });
    }
  }

  return Object.freeze({ handle });
}

module.exports = Object.freeze({ createMutationTransport, validateRequest, parseBody, jsonResponse });
