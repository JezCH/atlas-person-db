"use strict";

const crypto = require("node:crypto");
const { createMutationService } = require("./atlas-mutation-service.js");
const { createMutationTransport, jsonResponse } = require("./atlas-mutation-transport.js");
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

function safeTokenEqual(provided, expected) {
  if (!provided || !expected) return false;
  const left = Buffer.from(String(provided));
  const right = Buffer.from(String(expected));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function createHeaderAuthorizer({ env = process.env } = {}) {
  const expected = requireEnv(env, "ATLAS_MUTATION_TOKEN");
  return async function authorize(request = {}) {
    const provided = bearerToken(request.headers || {});
    return safeTokenEqual(provided, expected)
      ? { authorized: true }
      : { authorized: false, reason: "unauthorized" };
  };
}

function sendResponse(res, response) {
  res.statusCode = response.status;
  for (const [key, value] of Object.entries(response.headers || {})) res.setHeader(key, value);
  res.end(response.body);
}

function createVercelMutationHandler({ clientFactory, env = process.env, transactionOptions = {} } = {}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");
  const databaseUrl = requireEnv(env, "SUPABASE_DB_URL");
  const authorize = createHeaderAuthorizer({ env });

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
      const { transactionFactory, parityVerifier } = createDualWriteTransactionFactory({ client, ...transactionOptions });
      const mutationService = createMutationService({ planner, transactionFactory, parityVerifier });
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
  bearerToken,
  safeTokenEqual,
  requireEnv,
  sendResponse
});
