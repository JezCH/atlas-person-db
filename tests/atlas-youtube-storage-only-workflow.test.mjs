import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../.github/workflows/youtube-preserve-verified-corpus.yml", import.meta.url), "utf8");
const jobs = src.split(/(?=^      - (?:name:|uses:))/m).slice(1);
const storage = "\u0024{{ inputs.phase == 'storage_only' }}";
const catalog = "\u0024{{ inputs.phase == 'catalog_full' }}";

test("Batch017/024 preservation remains manual, storage-only by default, exact artifact-pinned", () => {
  assert.match(src, /^on:\n  workflow_dispatch:\n    inputs:\n      phase:/m);
  assert.match(src, /default: storage_only/);
  assert.match(src, /- storage_only\n\s+- catalog_full/);
  assert.doesNotMatch(src, /\n  push:|\n  pull_request:|\n  schedule:/);
  assert.match(src, /default: '024'/);
  assert.match(src, /SOURCE_ARTIFACT_ID:.*11613130249.*11548326100/);
  assert.match(src, /SOURCE_MEMBER_COUNT:.*10186.*6044/);
  assert.match(src, /SOURCE_MEMBER_BYTES:.*85683343.*57747470/);
  assert.match(src, /SOURCE_VIDEO_ROWS:.*2230031.*1536512/);
  assert.match(src, /SOURCE_SELECTED_CHANNEL_COUNT:.*10890.*6770/);
  assert.match(src, /SOURCE_OK_CHANNEL_COUNT:.*10127.*6011/);
  assert.match(src, /SOURCE_METADATA_COUNT:.*42.*23/);
  assert.match(src, /SOURCE_ARTIFACT_SIZE:.*85284047.*57840666/);
  assert.match(src, /8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946/);
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
  const restore = jobs.find((job) => job.includes("Restore and prove selected private Storage objects independently"));
  assert.ok(restore && restore.includes("if: " + storage));
  assert.match(restore, /--catalog \/tmp\/storage-only-inventory\.json/);
  assert.match(restore, /--restore-dir \/tmp\/storage-only-independent-restore/);
  assert.match(restore, /new_objects==0 and \.existing_objects==\$files/);
  assert.match(restore, /\.snapshot\.video_count==\$videos/);
  assert.match(restore, /\.snapshot\.channel_count==\$okchannels/);
  assert.match(restore, /\(\.channels\|length\)==\$selected/);
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

test("Batch024 is SHA-pinned to its separate immutable namespace, never old Batch017 source keys", () => {
  assert.match(src, /SOURCE_ARTIFACT_RUN_ID:.*37921755392.*37771318676/);
  assert.match(src, /validated-batch024\/sha256\//);
  assert.match(src, /validated-batch017\/sha256\//);
  assert.match(src, /UNAPPROVED_ORIGINAL_SOURCE_ARCHIVE_NAMESPACE/);
  assert.match(src, /SOURCE_ARTIFACT_NAME:.*youtube-cumulative-batch024-validated.*youtube-cumulative-batch017-validated/);
  const gate = jobs.find((j) => j.includes("Do not publish Batch024 through the Batch017 canonical catalog contract"));
  assert.ok(gate && gate.includes("if: " + catalog));
  assert.match(gate, /BATCH024_CANONICAL_CATALOG_NOT_AUTHORIZED/);
  const firstWrite = jobs.findIndex((j) => j.includes("Controlled remote stop after first 1,000 immutable objects"));
  assert.ok(jobs.indexOf(gate) < firstWrite);
  assert.match(src, /SOURCE_NEXT_BATCH:.*batch025.*batch018/);
});

test("Storage-only source proof verifies pinned original file count, bytes, and archive-restored channel/video census", () => {
  const upload = jobs.find((j) => j.includes("Restart and verify every original source object"));
  assert.ok(upload);
  assert.match(upload, /--expected-total-files.*SOURCE_MEMBER_COUNT/);
  assert.match(upload, /--expected-total-bytes.*SOURCE_MEMBER_BYTES/);
  assert.match(upload, /\.metadata_objects==\$metadata/);
  const censusSteps = jobs.filter((j) => j.includes("youtube-build-person-signal-snapshot.py"));
  assert.ok(censusSteps.length >= 2);
  for (const j of censusSteps) {
    assert.match(j, /\.snapshot\.video_count==\$videos/);
    assert.match(j, /\.snapshot\.channel_count==\$okchannels/);
    assert.match(j, /--arg next.*SOURCE_NEXT_BATCH/);
  }
  const rest = jobs.find((j) => j.includes("Restore and prove selected private Storage objects"));
  assert.ok(rest && rest.includes("if: " + storage));
  assert.match(rest, /--catalog \/tmp\/storage-only-inventory\.json/);
  assert.match(rest, /canonical_db_catalog_written:false/);
});
