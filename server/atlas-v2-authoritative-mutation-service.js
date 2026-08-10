"use strict";

const { deterministicRequestId, normalizeOperation } = require("./atlas-mutation-request-utils.js");

function blockedOutcome({ requestId, operation, blockers }) {
  return Object.freeze({
    marker: "ATLAS_SERVER_MUTATION_SERVICE",
    write_mode: "v2-only",
    request_id: requestId,
    operation,
    committed: false,
    legacy: { attempted: false, committed: false, record_ids: [] },
    v2: { committed: false, normalized_relationship_ids: [] },
    verification: null,
    parity: null,
    rollback: false,
    validation_failures: blockers,
    transaction_failure: null
  });
}

function failedOutcome({ requestId, operation, error }) {
  return Object.freeze({
    marker: "ATLAS_SERVER_MUTATION_SERVICE",
    write_mode: "v2-only",
    request_id: requestId,
    operation,
    committed: false,
    legacy: { attempted: false, committed: false, record_ids: [] },
    v2: { committed: false, normalized_relationship_ids: [] },
    verification: null,
    parity: null,
    rollback: true,
    validation_failures: [],
    transaction_failure: error?.message || String(error)
  });
}

function createV2AuthoritativeMutationService({ planner, transactionFactory, verificationVerifier } = {}) {
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

    if (operation === "reconcile") {
      return blockedOutcome({
        requestId,
        operation,
        blockers: [{ code: "RECONCILIATION_NORMALIZED_INPUT_REQUIRED" }]
      });
    }

    if (Array.isArray(plan.blockers) && plan.blockers.length) {
      return blockedOutcome({ requestId, operation, blockers: plan.blockers });
    }

    try {
      const result = await transactionFactory(async (tx) => {
        if (typeof tx.executeV2Authoritative !== "function") {
          throw new Error("transaction adapter missing executeV2Authoritative");
        }
        const v2 = await tx.executeV2Authoritative({ operation, payload, request_id: requestId });
        if (!v2?.committed || v2?.transaction_failure) {
          throw new Error(v2?.transaction_failure || "v2-authoritative mutation did not commit inside transaction");
        }
        const verification = typeof verificationVerifier === "function"
          ? await verificationVerifier({ tx, operation, payload, v2, request_id: requestId })
          : { checked: false, match: null };
        if (verification?.checked && verification.match !== true) {
          throw new Error(verification.reason || "v2-authoritative verification mismatch");
        }
        return { v2, verification };
      });

      return Object.freeze({
        marker: "ATLAS_SERVER_MUTATION_SERVICE",
        write_mode: "v2-only",
        request_id: requestId,
        operation,
        committed: true,
        legacy: { attempted: false, committed: false, record_ids: [] },
        v2: result.v2,
        verification: result.verification,
        parity: null,
        rollback: false,
        validation_failures: [],
        transaction_failure: null
      });
    } catch (error) {
      return failedOutcome({ requestId, operation, error });
    }
  }

  return Object.freeze({ mutate });
}

module.exports = Object.freeze({ createV2AuthoritativeMutationService });
