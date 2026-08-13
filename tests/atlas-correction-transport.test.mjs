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

test("correction handler accepts exact Production SHA, bounded sources, explicit mode, and pathless Baseline A v2 capture", () => {
  const manifest = { schema: "atlas-correction-manifest/v1" };
  assert.deepEqual(correctionHandler.requirePayload({ deployment_sha: SHA, manifest_path: "corrections/requests/r0.json", mode: "dry_run", manifest }),
    { deploymentSha: SHA, sourcePath: "corrections/requests/r0.json", mode: "dry_run", manifest, schema: "atlas-correction-manifest/v1", activityIds: null });
  const manifestV11 = { schema: "atlas-correction-manifest/v1.1" };
  assert.equal(correctionHandler.requirePayload({ deployment_sha: SHA, intent_path: "corrections/intents/r1.json", mode: "apply", manifest: manifestV11 }).schema, "atlas-correction-manifest/v1.1");
  assert.deepEqual(correctionHandler.requirePayload({ deployment_sha: SHA, mode: "full_stage2_baseline" }),
    { deploymentSha: SHA, sourcePath: null, mode: "full_stage2_baseline", activityIds: null, manifest: null, schema: null });
  assert.throws(() => correctionHandler.requirePayload({ deployment_sha: SHA, mode: "full_activity_baseline" }), /CORRECTION_MODE_REQUIRED/);
  assert.throws(() => correctionHandler.requirePayload({ deployment_sha: SHA, manifest_path: "authoring/requests/x.json", mode: "apply", manifest }), /CORRECTION_SOURCE_PATH_NOT_ALLOWED/);
  assert.throws(() => correctionHandler.requirePayload({ deployment_sha: SHA, manifest_path: "corrections/requests/x.json", mode: "delete", manifest }), /CORRECTION_MODE_REQUIRED/);
  assert.throws(() => correctionHandler.requirePayload({ deployment_sha: SHA, manifest_path: "corrections/requests/x.json", mode: "apply", manifest: { schema: "atlas-correction-manifest/v2" } }), /UNSUPPORTED_CORRECTION_MANIFEST_SCHEMA/);
  assert.throws(() => correctionHandler.requirePayload({ deployment_sha: SHA, mode: "full_stage2_baseline", activity_ids: [] }), /CORRECTION_BASELINE_INPUTS_FORBIDDEN/);
  assert.equal(correctionHandler.requireDeployment({ VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "main", VERCEL_GIT_COMMIT_SHA: SHA,
    VERCEL_GIT_REPO_OWNER: "JezCH", VERCEL_GIT_REPO_SLUG: "atlas-person-db" }, SHA), SHA);
  assert.throws(() => correctionHandler.requireDeployment({ VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "main", VERCEL_GIT_COMMIT_SHA: "b".repeat(40) }, SHA), /DEPLOYMENT_SHA_MISMATCH/);
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

test("correction migration registry is ordered and bounded to correction-ledger contract changes", () => {
  assert.equal(correctionMigrations.CORRECTION_MIGRATION_PATHS.length, 3);
  assert.deepEqual(correctionMigrations.CORRECTION_MIGRATION_PATHS.map((item) => path.basename(item)), [
    "20260811_correction_manifest_runs.sql",
    "20260812_correction_manifest_v1_1.sql",
    "20260813_correction_manifest_v2.sql"
  ]);
  const migrations = correctionMigrations.readCorrectionMigrations();
  assert.equal(migrations.length, 3);
  assert.match(migrations[0].sql, /create table if not exists atlas_v2\.correction_manifest_runs/i);
  assert.match(migrations[1].sql, /atlas-correction-manifest\/v1\.1/i);
  assert.match(migrations[2].sql, /atlas-correction-manifest\/v2/i);
  for (const migration of migrations) assert.doesNotMatch(migration.sql, /person_politics_v2\s+set|delete\s+from\s+atlas_v2\.person_politics_v2/i);
});

test("workflow runs reviewed corrections, dry-runs before apply, then captures Baseline A v2 identity snapshot", () => {
  assert.match(workflow, /^\s*-\s*'corrections\/requests\/\*\.json'\s*$/m);
  assert.match(workflow, /^\s*-\s*'corrections\/intents\/\*\.json'\s*$/m);
  assert.doesNotMatch(workflow, /^\s*-\s*'(?:server\/atlas-correction[^']*|api\/atlas-correction[^']*|db\/migrations\/2026081[12]_correction[^']*)'\s*$/m);
  assert.match(workflow, /ATLAS_CORRECTION_AUDIENCE: atlas-person-db-correction-apply/);
  assert.match(workflow, /atlas-correction-manifest\/v1\.1/);
  assert.doesNotMatch(workflow, /SUPABASE_DB_URL/);
  const dryRunCall = workflow.indexOf('call_correction "$manifest" "$source_path" dry_run');
  const applyCall = workflow.indexOf('call_correction "$manifest" "$source_path" apply');
  const baselineCall = workflow.indexOf('mode:"full_stage2_baseline"');
  assert.ok(dryRunCall >= 0 && applyCall > dryRunCall && baselineCall > applyCall);
  assert.match(workflow, /\.dry_run == true and \.committed == false/);
  assert.match(workflow, /\.dry_run == false and \.committed == true/);
  assert.match(workflow, /ATLAS_CORRECTION_BASELINE_A_V2/);
  assert.match(workflow, /\.catalogs\.persons/);
  assert.match(workflow, /\.catalogs\.polities/);
  assert.match(workflow, /\.catalogs\.sources/);
  assert.match(workflow, /baseline_digest/);
});
