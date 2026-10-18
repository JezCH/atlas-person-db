import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../.github/workflows/youtube-preserve-verified-corpus.yml", import.meta.url), "utf8");
const jobs = src.split(/(?=^      - (?:name:|uses:))/m).slice(1);
const storage = "\u0024{{ inputs.phase == 'storage_only' }}";
const catalog = "\u0024{{ inputs.phase == 'catalog_full' }}";

test("Batch017 source preservation is manual, defaults to storage-only and pins exact corpus", () => {
  assert.match(src, /^on:\n  workflow_dispatch:\n    inputs:\n      phase:/m);
  assert.match(src, /default: storage_only/);
  assert.match(src, /- storage_only\n\s+- catalog_full/);
  assert.doesNotMatch(src, /\n  push:|\n  pull_request:|\n  schedule:/);
  assert.match(src, /SOURCE_ARTIFACT_ID: '11548326100'/);
  assert.match(src, /SOURCE_MEMBER_COUNT: '6044'/);
  assert.match(src, /SOURCE_MEMBER_BYTES: '57747470'/);
  assert.match(src, /b40f8efdccfacce194afb44cc7cca3e93a4ab12a2153c5a19b70ceb3f56b0b1f/);
});

test("all Production runtime and catalog contact is exclusively catalog_full gated", () => {
  const prodSteps = jobs.filter((job) =>
    job.includes("RUNTIME_IDENTITY_ENDPOINT") || job.includes("CATALOG_ENDPOINT") ||
    /^      - name: (?:Prove canonical DB catalog|Read complete catalog back|Delete local corpus and restore|Rebuild authoritative census|Publish sanitized durable-recovery|Upload durable-recovery evidence)/m.test(job));
  assert.ok(prodSteps.length >= 9);
  for (const step of prodSteps) {
    assert.ok(step.includes("if: " + catalog), step.split("\n")[0]);
  }
  assert.doesNotMatch(src, /seq 1 90/);
  assert.match(src, /DEPLOYMENT_DISABLED_OR_PAYMENT_REQUIRED/);
  const preflight = jobs.find((step) => step.includes("Gate catalog_full on exact deployed main BEFORE Storage writes"));
  const firstWrite = jobs.findIndex((step) => step.includes("Controlled remote stop after first 1,000 immutable objects"));
  assert.ok(jobs.indexOf(preflight) < firstWrite, "Provider readiness gate must precede remote writes in catalog_full");
});

test("storage-only restores from exact immutable private objects, never claims DB catalog", () => {
  const restore = jobs.find((job) => job.includes("Restore and prove all 6,044 private Storage objects independently"));
  assert.ok(restore && restore.includes("if: " + storage));
  assert.match(restore, /--catalog \/tmp\/storage-only-inventory\.json/);
  assert.match(restore, /--restore-dir \/tmp\/storage-only-independent-restore/);
  assert.match(restore, /new_objects==0 and \.existing_objects==\$files/);
  assert.match(restore, /\.snapshot\.video_count==1536512/);
  assert.match(restore, /canonical_db_catalog_written:false/);
  assert.match(restore, /canonical_db_catalog_verified:false/);
  assert.match(restore, /full_g04_durable_migration_accepted:false/);
  assert.doesNotMatch(restore, /RUNTIME_IDENTITY_ENDPOINT|CATALOG_ENDPOINT|curl|POST \/api/);
  const upload = jobs.find((step) => step.includes("name: youtube-source-private-storage-only-proof"));
  assert.ok(upload?.includes("if: " + storage), "offline receipt upload must belong only to storage_only");
});

test("catalog_full retains exact-main authorization and idempotent canonical DB verification", () => {
  const named = [
    "Publish exact 6,044 verified artifact members to canonical DB catalog",
    "Prove canonical DB catalog replay is idempotent",
    "Read complete catalog back from Production without local manifest input",
    "Delete local corpus and restore all 6,044 members from DB catalog plus private Storage only",
  ];
  for (const name of named) {
    const step = jobs.find((job) => job.includes("- name: " + name));
    assert.ok(step?.includes("if: " + catalog), name);
  }
  assert.match(src, /SOURCE_CATALOG_MAIN_SHA_UNDEPLOYED/);
  assert.match(src, /SOURCE_CATALOG_MAIN_SHA_CHANGED/);
  assert.match(src, /verified_count==\$expected/);
  assert.match(src, /\.outcome\.idempotent==true/);
});
