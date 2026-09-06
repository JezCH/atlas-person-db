import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { requirePayload, MARKER } = require("../server/atlas-correction-migrations-handler.js");
const workflow = fs.readFileSync(".github/workflows/atlas-p11-semantic-v2-backfill.yml", "utf8");

const SHA = "88190d82f9e18400936e10060e72db7370fcdad0";

test("explicit correction migration endpoint accepts only an exact deployment SHA", () => {
  assert.deepEqual(requirePayload({ deployment_sha: SHA }), { deploymentSha: SHA });
  assert.equal(MARKER, "ATLAS_CORRECTION_MIGRATIONS_V1");
  assert.throws(() => requirePayload({ deployment_sha: "bad" }), /CORRECTION_MIGRATIONS_SHA_REQUIRED/);
  assert.throws(
    () => requirePayload({ deployment_sha: SHA, plan: {} }),
    /CORRECTION_MIGRATIONS_EXTRA_INPUT_FORBIDDEN/
  );
});

test("P11 applies schema migrations before its first Production audit and dry-run", () => {
  const migrationCall = workflow.indexOf('call_json_with_retry "$MIGRATION_ENDPOINT"');
  const preAuditCall = workflow.indexOf('call_json_with_retry "$AUDIT_ENDPOINT"');
  const dryRunLoop = workflow.indexOf('for mode in dry_run apply');
  assert.ok(migrationCall >= 0, "P11 migration call must exist");
  assert.ok(preAuditCall > migrationCall, "migration must precede the Production audit");
  assert.ok(dryRunLoop > preAuditCall, "dry-run/apply loop must follow the canonical audit");
});
