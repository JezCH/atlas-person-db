"use strict";

const { createV2AuthoritativeMutationService } = require("./atlas-v2-authoritative-mutation-service.js");
const { createPersonDeleteService } = require("./atlas-person-delete-service.js");
const { createPersonProfileMutationService, PROFILE_OPERATIONS } = require("./atlas-person-profile-service.js");
const { createMutationTransport, jsonResponse } = require("./atlas-mutation-transport.js");
const { createV2AuthoritativeTransactionFactory } = require("./atlas-postgres-v2-authoritative-transaction.js");
const {
  requireEnv,
  bearerToken,
  safeTokenEqual,
  createHeaderAuthorizer,
  createMutationAuthorizer
} = require("./atlas-session-auth.js");
const planner = require("./atlas-p9-mutation-planner.js");

function sendResponse(res, response) {
  res.statusCode = response.status;
  for (const [key, value] of Object.entries(response.headers || {})) res.setHeader(key, value);
  res.end(response.body);
}

function createVercelMutationHandler({ clientFactory, env = process.env, transactionOptions = {}, now } = {}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");

  return async function handler(req, res) {
    const request = { method: req?.method, headers: req?.headers || {}, body: req?.body };
    const method = String(request.method || "POST").toUpperCase();
    if (method !== "POST") {
      sendResponse(res, jsonResponse(405, { ok: false, error: "method not allowed" }));
      return;
    }

    let databaseUrl;
    let authorize;
    try {
      databaseUrl = requireEnv(env, "SUPABASE_DB_URL");
      authorize = createMutationAuthorizer({ env, ...(typeof now === "function" ? { now } : {}) });
    } catch (error) {
      console.error("ATLAS mutation configuration error", error);
      sendResponse(res, jsonResponse(503, { ok: false, code: "SERVER_CONFIGURATION_ERROR", error: "mutation service is not configured" }));
      return;
    }

    const auth = await authorize(request);
    if (!auth?.authorized) {
      sendResponse(res, jsonResponse(401, { ok: false, error: auth?.reason || "unauthorized" }));
      return;
    }

    let client = null;
    try {
      client = await clientFactory(databaseUrl);
      const { transactionFactory, verificationVerifier } = createV2AuthoritativeTransactionFactory({ client, ...transactionOptions });
      const activityMutationService = createV2AuthoritativeMutationService({ planner, transactionFactory, verificationVerifier });
      const personDeleteService = createPersonDeleteService({ client });
      const personProfileService = createPersonProfileMutationService({ client });
      const mutationService = Object.freeze({
        mutate: (mutationRequest) => {
          if (mutationRequest?.operation === "delete_person") return personDeleteService.mutate(mutationRequest);
          if (PROFILE_OPERATIONS.has(mutationRequest?.operation)) return personProfileService.mutate(mutationRequest);
          return activityMutationService.mutate(mutationRequest);
        }
      });
      const transport = createMutationTransport({ mutationService });
      const response = await transport.handle(request);
      sendResponse(res, response);
    } catch (error) {
      console.error("ATLAS mutation runtime failed", error);
      sendResponse(res, jsonResponse(client ? 500 : 503, {
        ok: false,
        code: client ? "MUTATION_RUNTIME_FAILED" : "DATABASE_UNAVAILABLE",
        error: client ? "mutation runtime failed" : "database unavailable"
      }));
    } finally {
      if (client && typeof client.end === "function") await client.end();
    }
  };
}

module.exports = Object.freeze({
  createVercelMutationHandler,
  createHeaderAuthorizer,
  createMutationAuthorizer,
  bearerToken,
  safeTokenEqual,
  requireEnv,
  sendResponse
});
