import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  createCorrectionApplyHandler,
  requirePayload,
  requireExecutionPlan,
  CORRECTION_PLAN_PATH_RE
} = require("../server/atlas-correction-apply-handler.js");

const SHA = "a".repeat(40);
const ENV = {
  VERCEL_ENV: "production",
  VERCEL_GIT_COMMIT_REF: "main",
  VERCEL_GIT_COMMIT_SHA: SHA,
  VERCEL_GIT_REPO_OWNER: "JezCH",
  VERCEL_GIT_REPO_SLUG: "atlas-person-db",
  SUPABASE_DB_URL: "postgresql://example.invalid/db"
};

function responseCapture() {
  const state = { headers: {} };
  return {
    state,
    setHeader(name, value) { state.headers[name] = value; },
    end(value) { state.body = JSON.parse(value); },
    set statusCode(value) { state.statusCode = value; },
    get statusCode() { return state.statusCode; }
  };
}

function samplePlan() {
  return {
    schema: "atlas-stage2-correction-v2-execution-plan/v1",
    batch_id: "test_plan_v1",
    execution_rules: {
      production_executable: false,
      production_mutation_authorized: false
    },
    operations: [{
      case_id: "test_retire",
      type: "retire_activity",
      activity_id: "11111111-1111-4111-8111-111111111111"
    }]
  };
}

test("v2 execution plan payload is accepted only from corrections/plans", () => {
  const plan = samplePlan();
  assert.doesNotThrow(() => requireExecutionPlan(plan));
  assert.equal(CORRECTION_PLAN_PATH_RE.test("corrections/plans/test.json"), true);

  const payload = requirePayload({
    deployment_sha: SHA,
    plan_path: "corrections/plans/test.json",
    mode: "dry_run",
    plan
  });
  assert.equal(payload.plan, plan);
  assert.equal(payload.schema, "atlas-correction-manifest/v2");

  assert.throws(() => requirePayload({
    deployment_sha: SHA,
    manifest_path: "corrections/requests/test.json",
    mode: "dry_run",
    plan
  }), /PLAN_PATH_NOT_ALLOWED/);

  assert.throws(() => requirePayload({
    deployment_sha: SHA,
    plan_path: "corrections/plans/test.json",
    mode: "dry_run",
    manifest: { schema: "atlas-correction-manifest\/v1" }
  }), /EXECUTION_PLAN_OBJECT_REQUIRED/);

  assert.throws(() => requirePayload({
    deployment_sha: SHA,
    plan_path: "corrections/plans/test.json",
    mode: "full_stage2_baseline",
    plan
  }), /BASELINE_INPUTS_FORBIDDEN/);
});

test("plan dry-run snapshots live targets then synthesizes and executes v2 without schema mutation", async () => {
  const plan = samplePlan();
  const client = { end: async () => {} };
  let migrated = 0;
  let snapshotIds = null;
  let synthesized = null;
  let executed = null;

  const snapshot = {
    schema: "atlas-correction-v2-target-snapshot/v1",
    activity_ids: ["11111111-1111-4111-8111-111111111111"],
    activities: [],
    normalized_activity_source_links: [],
    chronology_claims: [],
    relationship_descriptions: [],
    snapshot_digest: `sha256:${"1".repeat(64)}`,
    read_only: true,
    committed: false
  };
  const manifest = {
    schema: "atlas-correction-manifest/v2",
    request_id: plan.batch_id,
    manifest_sha256: `sha256:${"2".repeat(64)}`,
    production_executable: true
  };

  const handler = createCorrectionApplyHandler({
    env: ENV,
    verifyOidc: async (_token, { expectedSha }) => assert.equal(expectedSha, SHA),
    createClient: async () => client,
    applyMigrations: async () => { migrated += 1; },
    requiredV2SnapshotIds: (seenPlan) => {
      assert.equal(seenPlan, plan);
      return snapshot.activity_ids;
    },
    createV2Snapshot: async (seenClient, ids) => {
      assert.equal(seenClient, client);
      snapshotIds = ids;
      return snapshot;
    },
    synthesizeV2Plan: (seenPlan, seenSnapshot) => {
      synthesized = { seenPlan, seenSnapshot };
      return manifest;
    },
    createUnifiedV2Service: ({ client: seenClient }) => {
      assert.equal(seenClient, client);
      return {
        execute: async (seenManifest, options) => {
          executed = { seenManifest, options };
          return {
            marker: "ATLAS_CORRECTION_MANIFEST_V2",
            request_id: plan.batch_id,
            dry_run: true,
            committed: false,
            replay: false,
            result: { ok: true }
          };
        }
      };
    }
  });

  const res = responseCapture();
  await handler({
    method: "POST",
    headers: { authorization: "Bearer token" },
    body: {
      deployment_sha: SHA,
      plan_path: "corrections/plans/test.json",
      mode: "dry_run",
      plan
    }
  }, res);

  assert.equal(res.state.statusCode, 200);
  assert.equal(res.state.body.marker, "ATLAS_CORRECTION_MANIFEST_V2");
  assert.equal(res.state.body.schema, "atlas-correction-manifest/v2");
  assert.equal(res.state.body.dry_run, true);
  assert.equal(res.state.body.committed, false);
  assert.equal(res.state.body.exact_live_snapshot_digest, snapshot.snapshot_digest);
  assert.equal(res.state.body.manifest_sha256, manifest.manifest_sha256);
  assert.deepEqual(snapshotIds, snapshot.activity_ids);
  assert.equal(synthesized.seenPlan, plan);
  assert.equal(synthesized.seenSnapshot, snapshot);
  assert.equal(executed.seenManifest, manifest);
  assert.deepEqual(executed.options, { dryRun: true });
  assert.equal(migrated, 0, "dry-run must not apply correction migrations");
});

test("reviewed Activity cleanup plan preserves provenance transfer and keeps rewrite targets stable", () => {
  const plan = JSON.parse(fs.readFileSync(new URL("../corrections/plans/activity-integrity-cleanup-20260816.v1.json", import.meta.url), "utf8"));
  assert.equal(plan.schema, "atlas-stage2-correction-v2-execution-plan/v1");
  assert.equal(plan.batch_id, "activity_integrity_cleanup_20260816_v1");
  assert.equal(plan.execution_rules.production_executable, false);
  assert.equal(plan.execution_rules.production_mutation_authorized, false);

  const retires = plan.operations.filter((operation) => operation.type === "retire_activity");
  const rewrites = plan.operations.filter((operation) => operation.type === "rewrite_activity");
  assert.equal(retires.length, 10);
  assert.equal(rewrites.length, 3);

  const mutationTargets = new Set(plan.operations.map((operation) => operation.activity_id));
  for (const operation of retires) {
    assert.equal(operation.silent_source_drop_forbidden, true);
    assert.equal(
      operation.source_transfer_policy,
      "COPY_ALL_RETIRED_NORMALIZED_SOURCE_LINKS_AND_LOCATORS_TO_REVIEWED_SURVIVORS_DEDUP_BY_NORMALIZED_LINK_IDENTITY_BEFORE_DELETE"
    );
    assert.ok(Array.isArray(operation.replacement_activity_ids) && operation.replacement_activity_ids.length > 0);
    for (const replacementId of operation.replacement_activity_ids) {
      assert.equal(mutationTargets.has(replacementId), false, `replacement ${replacementId} must not be a mutation target`);
    }
  }

  const byId = new Map(rewrites.map((operation) => [operation.activity_id, operation]));
  assert.equal(byId.get("68c203e5-ac61-59ed-853b-365bdf3ed340").after.polity_id, "1160e7db-73ef-5d3a-bd04-483c3094fd03");
  assert.equal(byId.get("c5085fdb-379a-5710-bf14-c748b5b822da").after.polity_id, "1160e7db-73ef-5d3a-bd04-483c3094fd03");
  assert.equal(byId.get("57cdefa5-9a5d-533c-b229-47e398f1d07a").after.polity_id, "21ee0e6b-8c7f-5d9d-82f2-140f28a44dec");
  for (const operation of rewrites) {
    assert.equal(operation.after.activity_id, operation.activity_id);
    assert.equal(operation.after.notes_policy, "PRESERVE_EXACT_LIVE_NOTES");
    assert.equal(operation.after.source_links_policy, "PRESERVE_ALL_EXISTING_NORMALIZED_SOURCE_LINKS_AND_LOCATORS");
  }
});
