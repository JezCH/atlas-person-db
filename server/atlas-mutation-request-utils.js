"use strict";

function fail(message) {
  const error = new Error(message);
  error.name = "AtlasMutationRequestError";
  throw error;
}

function normalizeOperation(value) {
  const operation = String(value || "").trim();
  if (!["create", "update", "delete", "import", "reconcile"].includes(operation)) {
    fail(`unsupported mutation operation: ${operation || "<empty>"}`);
  }
  return operation;
}

function deterministicRequestId(operation, payload) {
  const raw = JSON.stringify([operation, payload]);
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `atlas-${operation}-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

module.exports = Object.freeze({ deterministicRequestId, normalizeOperation });
