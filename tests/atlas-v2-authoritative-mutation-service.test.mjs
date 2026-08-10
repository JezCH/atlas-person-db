import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const planner = require("../atlas-v2-command-planner.js");
const { createV2AuthoritativeMutationService } = require("../server/atlas-v2-authoritative-mutation-service.js");

const row = {
  person_name: "Ada Lovelace",
  politic_name: "United Kingdom",
  activity_start: 1842,
  activity_end: 1852,
  role: null,
  period_basis: "intellectual_activity",
  notes: "direct v2 test"
};

test("v2-authoritative service writes only normalized result and exposes normalized id", async () => {
  let transactionCalls = 0;
  const service = createV2AuthoritativeMutationService({
    planner,
    transactionFactory: async (work) => {
      transactionCalls += 1;
      return work({
        async executeV2Authoritative({ operation, payload, request_id }) {
          assert.equal(operation, "create");
          assert.equal(payload.person_name, "Ada Lovelace");
          assert.match(request_id, /^atlas-create-/);
          return { committed: true, normalized_relationship_ids: ["v2-id"], replay: false, transaction_failure: null };
        }
      });
    },
    verificationVerifier: async () => ({ checked: true, match: true, rows: 1 })
  });

  const result = await service.mutate({ operation: "create", payload: row });
  assert.equal(transactionCalls, 1);
  assert.equal(result.committed, true);
  assert.equal(result.write_mode, "v2-only");
  assert.deepEqual(result.legacy, { attempted: false, committed: false, record_ids: [] });
  assert.deepEqual(result.v2.normalized_relationship_ids, ["v2-id"]);
  assert.equal(result.verification.match, true);
  assert.equal(result.parity, null);
});

test("v2-authoritative service treats update/delete id as normalized relationship id", async () => {
  const seen = [];
  const service = createV2AuthoritativeMutationService({
    planner,
    transactionFactory: async (work) => work({
      async executeV2Authoritative(input) {
        seen.push(input);
        return { committed: true, normalized_relationship_ids: [input.payload.id], replay: false, transaction_failure: null };
      }
    }),
    verificationVerifier: async () => ({ checked: true, match: true })
  });

  const updated = await service.mutate({ operation: "update", payload: { id: "normalized-1", value: row } });
  const deleted = await service.mutate({ operation: "delete", payload: { id: "normalized-1" } });
  assert.equal(updated.committed, true);
  assert.equal(deleted.committed, true);
  assert.equal(seen[0].payload.id, "normalized-1");
  assert.equal(seen[1].payload.id, "normalized-1");
});

test("v2-authoritative service blocks reconciliation before opening transaction", async () => {
  let transactionCalls = 0;
  const service = createV2AuthoritativeMutationService({
    planner,
    transactionFactory: async () => { transactionCalls += 1; throw new Error("must not run"); }
  });
  const result = await service.mutate({
    operation: "reconcile",
    payload: {
      marker: "PHASE_8B_RECONCILIATION_DRY_RUN",
      commit: false,
      database_writes: 0,
      proposed_deletes: [],
      proposed_duplicate_removals: [],
      proposed_updates: [],
      proposed_inserts: [],
      validation_failures: []
    }
  });
  assert.equal(transactionCalls, 0);
  assert.equal(result.committed, false);
  assert.ok(result.validation_failures.some((item) => item.code === "RECONCILIATION_NORMALIZED_INPUT_REQUIRED"));
});

test("verification mismatch rolls back the v2-only transaction outcome", async () => {
  let rollbackObserved = false;
  const service = createV2AuthoritativeMutationService({
    planner,
    transactionFactory: async (work) => {
      try {
        return await work({
          async executeV2Authoritative() {
            return { committed: true, normalized_relationship_ids: ["v2-id"], replay: false, transaction_failure: null };
          }
        });
      } catch (error) {
        rollbackObserved = true;
        throw error;
      }
    },
    verificationVerifier: async () => ({ checked: true, match: false, reason: "synthetic mismatch" })
  });
  const result = await service.mutate({ operation: "create", payload: row });
  assert.equal(result.committed, false);
  assert.equal(result.rollback, true);
  assert.equal(rollbackObserved, true);
  assert.match(result.transaction_failure, /synthetic mismatch/);
});
