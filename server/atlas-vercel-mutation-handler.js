"use strict";

const { createMutationService } = require("./atlas-mutation-service.js");
const { createMutationTransport } = require("./atlas-mutation-transport.js");
const { createDualWriteTransactionFactory } = require("./atlas-postgres-dualwrite-transaction.js");
const planner = require("../atlas-v2-command-planner.js");

function requireEnv(env, name) {
  const value = String(env?.[name] || "").trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function bearerToken(headers = {}) {
  const raw = headers.authorization || headers.Authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(String(raw).trim());
  return match ? match[1] : null;
}

function createHeaderAuthorizer({ env = process.env } = {}) {
  const expected = requireEnv(env, "ATLAS_MUTATION_TOKEN");
  return async function authorize(request = {}) {
    const provided = bearerToken(request.headers || {});
    return provided && provided === expected
      ? { authorized: true }
      : { authorized: false, reason: "unauthorized" };
  };
}

function createVercelMutationHandler({ clientFactory, env = process.env } = {}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");
  const databaseUrl = requireEnv(env, "SUPABASE_DB_URL");
  const authorize = createHeaderAuthorizer({ env });

  return async function handler(req, res) {
    const client = await clientFactory(databaseUrl);
    try {
      const { transactionFactory, parityVerifier } = createDualWriteTransactionFactory({ client });
      const mutationService = createMutationService({ planner, transactionFactory, parityVerifier });
      const transport = createMutationTransport({ mutationService, authorize });
      const response = await transport.handle({
        method: req?.method,
        headers: req?.headers || {},
        body: req?.body
      });
      res.statusCode = response.status;
      for (const [key, value] of Object.entries(response.headers || {})) res.setHeader(key, value);
      res.end(response.body);
    } finally {
      if (client && typeof client.end === "function") await client.end();
    }
  };
}

module.exports = Object.freeze({ createVercelMutationHandler, createHeaderAuthorizer, bearerToken, requireEnv });
