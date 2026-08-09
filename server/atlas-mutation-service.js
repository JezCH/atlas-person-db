"use strict";

function fail(message) {
  const error = new Error(message);
  error.name = "AtlasMutationServiceError";
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

function createMutationService({ planner, transactionFactory, parityVerifier } = {}) {
  if (!planner || typeof planner.plan !== "function") throw new Error("v2 command planner is required");
  if (typeof transactionFactory !== "function") throw new Error("transactionFactory is required");

  async function mutate(request = {}) {
    const operation = normalizeOperation(request.operation);
    const rawPayload = request.payload ?? null;
    const plan = planner.plan(operation, rawPayload);
    const payload = Object.prototype.hasOwnProperty.call(plan, "normalized_payload")
      ? plan.normalized_payload
      : rawPayload;
    const requestId = request.request_id || deterministicRequestId(operation, payload);

    if (Array.isArray(plan.blockers) && plan.blockers.length) {
      return Object.freeze({
        marker: "ATLAS_SERVER_MUTATION_SERVICE",
        request_id: requestId,
        operation,
        committed: false,
        legacy: { committed: false },
        v2: { committed: false, normalized_relationship_ids: [] },
        parity: null,
        rollback: false,
        validation_failures: plan.blockers,
        transaction_failure: null
      });
    }

    try {
      const result = await transactionFactory(async (tx) => {
        if (typeof tx.executeLegacy !== "function") fail("transaction adapter missing executeLegacy");
        if (typeof tx.executeV2 !== "function") fail("transaction adapter missing executeV2");

        const legacy = await tx.executeLegacy({ operation, payload, request_id: requestId });
        if (!legacy?.committed) fail(legacy?.error || "legacy mutation did not commit inside transaction");

        const v2 = await tx.executeV2({ plan, context: { request_id: requestId, operation, legacy } });
        if (!v2?.committed || v2?.transaction_failure) {
          fail(v2?.transaction_failure || "v2 mutation did not commit inside transaction");
        }

        const parity = typeof parityVerifier === "function"
          ? await parityVerifier({ tx, operation, payload, legacy, v2, request_id: requestId })
          : { checked: false, match: null };

        if (parity?.checked && parity.match !== true) fail("legacy/v2 parity mismatch");

        return { legacy, v2, parity };
      });

      return Object.freeze({
        marker: "ATLAS_SERVER_MUTATION_SERVICE",
        request_id: requestId,
        operation,
        committed: true,
        legacy: result.legacy,
        v2: result.v2,
        parity: result.parity,
        rollback: false,
        validation_failures: [],
        transaction_failure: null
      });
    } catch (error) {
      return Object.freeze({
        marker: "ATLAS_SERVER_MUTATION_SERVICE",
        request_id: requestId,
        operation,
        committed: false,
        legacy: { committed: false },
        v2: { committed: false, normalized_relationship_ids: [] },
        parity: null,
        rollback: true,
        validation_failures: [],
        transaction_failure: error?.message || String(error)
      });
    }
  }

  return Object.freeze({ mutate });
}

module.exports = Object.freeze({ createMutationService, deterministicRequestId, normalizeOperation });
