import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const correctionHandler = require("../server/atlas-correction-apply-handler.js");
const correctionOidc = require("../server/atlas-correction-github-oidc.js");
const authoringOidc = require("../server/atlas-github-oidc.js");
const auditOidc = require("../server/atlas-audit-github-oidc.js");
const correctionMigrations = require("../server/atlas-correction-migrations.js");

const SHA = "a".repeat(40);
const handlerSource = fs.readFileSync(new URL("../server/atlas-correction-apply-handler.js", import.meta.url), "utf8");
const workflow = fs.readFileSync(new URL("../.github/workflows/atlas-correction-apply.yml", import.meta.url), "utf8");
const api = fs.readFileSync(new URL("../api/atlas-correction-apply.js", import.meta.url), "utf8");
const LEGACY_MANIFEST_SCHEMAS = [
  "atlas-correction-manifest/v1",
  "atlas-correction-manifest/v1.1",
  "atlas-correction-manifest/v1.2",
  "atlas-correction-manifest/v1.3",
  "atlas-correction-manifest/v1.4"
];

function trustPayload({ audience, workflowRef }) {
  return { iss: correctionOidc.ISSUER, aud: audience, repository: correctionOidc.EXPECTED_REPOSITORY,
    repository_id: correctionOidc.EXPECTED_REPOSITORY_ID, ref: correctionOidc.EXPECTED_REF, workflow_ref: workflowRef,
    environment: "production", event_name: "push", sha: SHA, exp: Math.floor(Date.now() / 1000) + 300 };
}

test("correction transport uses a third isolated OIDC audience/workflow boundary", () => {
  const correction = trustPayload({ audience: correctionOidc.EXPECTED_AUDIENCE, workflowRef: correctionOidc.EXPECTED_WORKFLOW_REF });
  const authoring = trustPayload({ audience: authoringOidc.EXPECTED_AUDIENCE, workflowRef: authoringOidc.EXPECTED_WORKFLOW_REF });
  const audit = trustPayload({ audience: auditOidc.EXPECTED_AUDIENCE, workflowRef: auditOidc.EXPECTED_WORKFLOW_REF });
  assert.doesNotThrow(() => correctionOidc.verifyTrustClaims(correction, SHA));
  assert.doesNotThrow(() => authoringOidc.verifyTrustClaims(authoring, SHA));
  assert.doesNotThrow(() => auditOidc.verifyTrustClaims(audit, SHA));
  assert.throws(() => correctionOidc.verifyTrustClaims(authoring, SHA), /GITHUB_OIDC_AUDIENCE_MISMATCH/);
  assert.throws(() => correctionOidc.verifyTrustClaims(audit, SHA), /GITHUB_OIDC_AUDIENCE_MISMATCH/);
  assert.throws(() => authoringOidc.verifyTrustClaims(correction, SHA), /GITHUB_OIDC_AUDIENCE_MISMATCH/);
  assert.throws(() => auditOidc.verifyTrustClaims(correction, SHA), /GITHUB_OIDC_AUDIENCE_MISMATCH/);
});

test("live correction handler accepts only v2 manifests/plans plus read-only baseline and snapshot surfaces", () => {
  const manifestV2 = { schema: "atlas-correction-manifest/v2" };
  assert.equal(correctionHandler.requirePayload({ deployment_sha: SHA, manifest_path: "corrections/requests/v2.json", mode: "dry_run", manifest: manifestV2 }).schema, "atlas-correction-manifest/v2");
  assert.equal(typeof correctionHandler.createService({ query() {} }, "atlas-correction-manifest/v2").execute, "function");
  assert.equal(correctionHandler.MANIFEST_SCHEMAS.size, 1);
  assert.deepEqual([...correctionHandler.MANIFEST_SCHEMAS], ["atlas-correction-manifest/v2"]);

  for (const schema of LEGACY_MANIFEST_SCHEMAS) {
    assert.throws(() => correctionHandler.requirePayload({ deployment_sha: SHA, manifest_path: "corrections/requests/legacy.json", mode: "apply", manifest: { schema } }), /UNSUPPORTED_CORRECTION_MANIFEST_SCHEMA/);
    assert.throws(() => correctionHandler.createService({ query() {} }, schema), /UNSUPPORTED_CORRECTION_MANIFEST_SCHEMA/);
  }

  assert.throws(() => correctionHandler.requirePayload({ deployment_sha: SHA, intent_path: "corrections/intents/legacy.json", mode: "snapshot", activity_ids: ["0d1c9869-1819-4a7a-b523-4d3498719a03"] }), /CORRECTION_SOURCE_PATH_NOT_ALLOWED/);
  assert.deepEqual(correctionHandler.requirePayload({ deployment_sha: SHA, mode: "full_stage2_baseline" }),
    { deploymentSha: SHA, sourcePath: null, mode: "full_stage2_baseline", activityIds: null, manifest: null, schema: null, plan: null });
  assert.throws(() => correctionHandler.requirePayload({ deployment_sha: SHA, mode: "full_activity_baseline" }), /CORRECTION_MODE_REQUIRED/);
  assert.throws(() => correctionHandler.requirePayload({ deployment_sha: SHA, manifest_path: "authoring/requests/x.json", mode: "apply", manifest: manifestV2 }), /CORRECTION_SOURCE_PATH_NOT_ALLOWED/);
  assert.throws(() => correctionHandler.requirePayload({ deployment_sha: SHA, manifest_path: "corrections/requests/x.json", mode: "delete", manifest: manifestV2 }), /CORRECTION_MODE_REQUIRED/);
  assert.throws(() => correctionHandler.requirePayload({ deployment_sha: SHA, manifest_path: "corrections/requests/x.json", mode: "apply", manifest: { schema: "atlas-correction-manifest/v3" } }), /UNSUPPORTED_CORRECTION_MANIFEST_SCHEMA/);
  assert.throws(() => correctionHandler.requirePayload({ deployment_sha: SHA, mode: "full_stage2_baseline", activity_ids: [] }), /CORRECTION_BASELINE_INPUTS_FORBIDDEN/);
  assert.equal(correctionHandler.requireDeployment({ VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "main", VERCEL_GIT_COMMIT_SHA: SHA,
    VERCEL_GIT_REPO_OWNER: "JezCH", VERCEL_GIT_REPO_SLUG: "atlas-person-db" }, SHA), SHA);
  assert.throws(() => correctionHandler.requireDeployment({ VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "main", VERCEL_GIT_COMMIT_SHA: "b".repeat(40) }, SHA), /DEPLOYMENT_SHA_MISMATCH/);
});

test("live correction handler has zero transitive legacy manifest service imports", () => {
  for (const legacyService of [
    "atlas-correction-manifest-service.js",
    "atlas-correction-manifest-v1-1-service.js",
    "atlas-correction-manifest-v1-2-service.js",
    "atlas-correction-manifest-v1-3-service.js",
    "atlas-correction-manifest-v1-4-service.js"
  ]) assert.doesNotMatch(handlerSource, new RegExp(legacyService.replaceAll(".", "\\.")));
  assert.doesNotMatch(handlerSource, /MANIFEST_V1(?:_|\b)/);
  assert.match(handlerSource, /MANIFEST_SCHEMAS = new Set\(\[MANIFEST_V2\]\)/);
  assert.match(api, /createCorrectionApplyHandler/);
});

test("dry-run does not apply schema migration; apply does; Baseline A v2 remains read-only and returns catalogs", () => {
  assert.match(handlerSource, /if \(payload\.mode === "apply"\) await applyMigrations\(client\)/);
  assert.match(handlerSource, /dryRun: payload\.mode === "dry_run"/);
  assert.match(handlerSource, /payload\.mode === "full_stage2_baseline"/);
  assert.match(handlerSource, /queryBaseline\(client\)/);
  assert.match(handlerSource, /catalogs: baseline\.catalogs/);
  assert.match(handlerSource, /read_only: true/);
  assert.match(handlerSource, /committed: false/);
  assert.doesNotMatch(api, /SUPABASE_DB_URL|postgres:\/\/|postgresql:\/\//);
});

test("correction migration registry remains ordered archival/replay evidence and does not mutate person activities", () => {
  assert.equal(correctionMigrations.CORRECTION_MIGRATION_PATHS.length, 6);
  assert.deepEqual(correctionMigrations.CORRECTION_MIGRATION_PATHS.map((item) => path.basename(item)), [
    "20260811_correction_manifest_runs.sql",
    "20260812_correction_manifest_v1_1.sql",
    "20260813_correction_manifest_v2.sql",
    "20260815_correction_manifest_v1_2.sql",
    "20260821_correction_manifest_v1_3.sql",
    "20260827_correction_manifest_v1_4.sql"
  ]);
  const migrations = correctionMigrations.readCorrectionMigrations();
  assert.equal(migrations.length, 6);
  assert.match(migrations[0].sql, /create table if not exists atlas_v2\.correction_manifest_runs/i);
  assert.match(migrations[1].sql, /atlas-correction-manifest\/v1\.3/i);
  assert.match(migrations[2].sql, /atlas-correction-manifest\/v1\.3/i);
  assert.match(migrations[3].sql, /atlas-correction-manifest\/v1\.3/i);
  assert.match(migrations[4].sql, /atlas-correction-manifest\/v1\.4/i);
  assert.match(migrations[5].sql, /atlas-correction-manifest\/v1\.4/i);
  for (const migration of migrations) assert.doesNotMatch(migration.sql, /person_politics_v2\s+set|delete\s+from\s+atlas_v2\.person_politics_v2/i);
});

test("correction workflow exposes only reviewed v2 requests/plans and preserves dry-run-before-apply evidence", () => {
  assert.match(workflow, /^\s*-\s*'corrections\/requests\/\*\.json'\s*$/m);
  assert.match(workflow, /^\s*-\s*'corrections\/plans\/\*\.json'\s*$/m);
  assert.doesNotMatch(workflow, /corrections\/intents/);
  assert.doesNotMatch(workflow, /atlas-correction-intent\/v1/);
  assert.doesNotMatch(workflow, /synthesize_intent_manifest|snapshot_intent_target/);
  assert.doesNotMatch(workflow, /atlas-correction-manifest\/v1(?:\.[1-4])?(?:"|'|\s|;)/);
  assert.doesNotMatch(workflow, /ATLAS_CORRECTION_MANIFEST_V1(?:_[1-4])?\b/);
  assert.match(workflow, /ATLAS_CORRECTION_AUDIENCE: atlas-person-db-correction-apply/);
  assert.match(workflow, /atlas-correction-manifest\/v2/);
  assert.match(workflow, /ATLAS_CORRECTION_MANIFEST_V2/);
  assert.doesNotMatch(workflow, /SUPABASE_DB_URL/);
  const dryRunCall = workflow.indexOf('call_correction "$source_path" "$source_path" dry_run');
  const applyCall = workflow.indexOf('call_correction "$source_path" "$source_path" apply');
  const planDryRunCall = workflow.indexOf('call_plan_correction "$source_path" "$source_path" dry_run');
  const planApplyCall = workflow.indexOf('call_plan_correction "$source_path" "$source_path" apply');
  const baselineCall = workflow.indexOf('mode:"full_stage2_baseline"');
  assert.ok(dryRunCall >= 0 && applyCall > dryRunCall && baselineCall > applyCall);
  assert.ok(planDryRunCall >= 0 && planApplyCall > planDryRunCall && baselineCall > planApplyCall);
  assert.match(workflow, /\.dry_run == true and \.committed == false/);
  assert.match(workflow, /\.dry_run == false and \.committed == true/);
  assert.match(workflow, /ATLAS_CORRECTION_BASELINE_A_V2/);
  assert.match(workflow, /\.catalogs\.persons/);
  assert.match(workflow, /\.catalogs\.polities/);
  assert.match(workflow, /\.catalogs\.sources/);
  assert.match(workflow, /baseline_digest/);
});
