import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import planner from "../atlas-v2-command-planner.js";
import mutationServiceModule from "../server/atlas-mutation-service.js";

const { createMutationService } = mutationServiceModule;

function row(person, polity, start, end, role = "Ruler") {
  return {
    person_name: person,
    politic_name: polity,
    activity_start: start,
    activity_end: end,
    role,
    period_basis: "reign",
    notes: null
  };
}

function reconciliationPlan(overrides = {}) {
  return {
    marker: "PHASE_8B_RECONCILIATION_DRY_RUN",
    canonical_snapshot: { id: "fixture", digest: "fnv1a32:fixture" },
    proposed_deletes: [{ id: "delete-1", before: row("A", "P", 1, 2), reason_code: "OBSOLETE_KEY" }],
    proposed_duplicate_removals: [{ id: "duplicate-1", before: row("B", "Q", 3, 4), reason_code: "EXACT_ACTIVITY_DUPLICATE" }],
    proposed_updates: [{ id: "update-1", after: row("C", "R", 5, 6), reason_code: "FIELD_DIFFERENCE" }],
    proposed_inserts: [{ after: row("D", "S", 7, 8), reason_code: "MISSING_FROM_LEGACY" }],
    validation_failures: [],
    commit: false,
    database_writes: 0,
    ...overrides
  };
}

test("reconcile planner compiles deterministic CRUD steps without a second writer", () => {
  const plan = planner.plan("reconcile", reconciliationPlan());
  assert.equal(plan.blockers.length, 0);
  assert.deepEqual(plan.reconciliation_steps.map((step) => step.operation), ["delete", "delete", "update", "create"]);
  assert.deepEqual(plan.reconciliation_steps.map((step) => step.kind), ["delete", "duplicate_removal", "update", "insert"]);
  assert.equal(plan.normalized_payload.canonical_snapshot.id, "fixture");
  assert.equal(plan.reconciliation_steps[2].payload.value.person_name, "C");
  assert.equal(plan.reconciliation_steps[3].payload.person_name, "D");
});

test("reconcile planner fails closed before transaction when source plan has validation failures", () => {
  const plan = planner.plan("reconcile", reconciliationPlan({
    validation_failures: [{ reason_code: "UNRESOLVED_IDENTITY" }]
  }));
  assert.ok(plan.blockers.some((blocker) => blocker.code === "RECONCILIATION_VALIDATION_FAILURES_PRESENT"));
});

test("reconciliation executes all planned mutations inside one shared transaction", async () => {
  let transactionCalls = 0;
  const legacyOperations = [];
  const v2Operations = [];

  const transactionFactory = async (work) => {
    transactionCalls += 1;
    return work({
      async executeLegacy({ operation, payload }) {
        legacyOperations.push(operation);
        return { committed: true, record_ids: [payload?.id || `${operation}-${legacyOperations.length}`] };
      },
      async executeV2({ context }) {
        v2Operations.push(context.operation);
        return { committed: true, normalized_relationship_ids: [`v2-${v2Operations.length}`], transaction_failure: null };
      }
    });
  };

  const service = createMutationService({
    planner,
    transactionFactory,
    parityVerifier: async ({ operation }) => ({ checked: true, match: true, operation })
  });

  const result = await service.mutate({ operation: "reconcile", payload: reconciliationPlan() });
  assert.equal(result.committed, true);
  assert.equal(transactionCalls, 1);
  assert.deepEqual(legacyOperations, ["delete", "delete", "update", "create"]);
  assert.deepEqual(v2Operations, legacyOperations);
  assert.equal(result.reconciliation.steps_committed, 4);
  assert.equal(result.parity.match, true);
});

test("one failed reconciliation child aborts the shared transaction outcome", async () => {
  let rollbackObserved = false;
  let legacyCalls = 0;
  const transactionFactory = async (work) => {
    try {
      return await work({
        async executeLegacy({ payload }) {
          legacyCalls += 1;
          if (legacyCalls === 2) return { committed: false, error: "synthetic child failure" };
          return { committed: true, record_ids: [payload?.id || `created-${legacyCalls}`] };
        },
        async executeV2() {
          return { committed: true, normalized_relationship_ids: ["v2"], transaction_failure: null };
        }
      });
    } catch (error) {
      rollbackObserved = true;
      throw error;
    }
  };

  const service = createMutationService({
    planner,
    transactionFactory,
    parityVerifier: async () => ({ checked: true, match: true })
  });

  const result = await service.mutate({ operation: "reconcile", payload: reconciliationPlan() });
  assert.equal(result.committed, false);
  assert.equal(result.rollback, true);
  assert.equal(rollbackObserved, true);
  assert.match(result.transaction_failure, /synthetic child failure/);
});

test("production browser reconciliation is dry-run only", () => {
  const source = fs.readFileSync(new URL("../atlas-reconciliation-bootstrap.js", import.meta.url), "utf8");
  assert.match(source, /state:\s*"dry-run"/);
  assert.doesNotMatch(source, /state:\s*"legacy-commit"/);
  assert.doesNotMatch(source, /\.insert\(|\.update\(|\.delete\(/);
});
