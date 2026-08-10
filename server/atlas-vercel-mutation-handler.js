"use strict";

const { createV2AuthoritativeMutationService } = require("./atlas-v2-authoritative-mutation-service.js");
const { createMutationTransport, jsonResponse } = require("./atlas-mutation-transport.js");
const { createV2AuthoritativeTransactionFactory } = require("./atlas-postgres-v2-authoritative-transaction.js");
const {
  requireEnv,
  bearerToken,
  safeTokenEqual,
  createHeaderAuthorizer,
  createMutationAuthorizer
} = require("./atlas-session-auth.js");
const planner = require("../atlas-v2-command-planner.js");

function sendResponse(res, response) {
  res.statusCode = response.status;
  for (const [key, value] of Object.entries(response.headers || {})) res.setHeader(key, value);
  res.end(response.body);
}

function createVercelMutationHandler({ clientFactory, env = process.env, transactionOptions = {}, now } = {}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");
  const databaseUrl = requireEnv(env, "SUPABASE_DB_URL");
  const authorize = createMutationAuthorizer({ env, ...(typeof now === "function" ? { now } : {}) });

  return async function handler(req, res) {
    const request = {
      method: req?.method,
      headers: req?.headers || {},
      body: req?.body
    };
    const method = String(request.method || "POST").toUpperCase();
    if (method !== "POST") {
      sendResponse(res, jsonResponse(405, { ok: false, error: "method not allowed" }));
      return;
    }

    const auth = await authorize(request);
    if (!auth?.authorized) {
      sendResponse(res, jsonResponse(401, { ok: false, error: auth?.reason || "unauthorized" }));
      return;
    }

    const client = await clientFactory(databaseUrl);
    try {
      const { transactionFactory, verificationVerifier } = createV2AuthoritativeTransactionFactory({ client, ...transactionOptions });
      const mutationService = createV2AuthoritativeMutationService({ planner, transactionFactory, verificationVerifier });
      const transport = createMutationTransport({ mutationService });
      const response = await transport.handle(request);
      sendResponse(res, response);
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
