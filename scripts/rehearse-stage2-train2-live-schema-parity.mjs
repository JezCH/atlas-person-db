import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import pg from "pg";

const require = createRequire(import.meta.url);
const {
  V1,
  V1_1,
  V2,
  inspectCorrectionLedgerCompatibility,
  applyCorrectionLedgerV2Compatibility
} = require("../server/atlas-stage2-correction-ledger-compat.js");
const { applyStage2SchemaRelease } = require("../server/atlas-stage2-schema-release.js");
const { inspectP9Cutover, applyP9Cutover } = require("../server/atlas-stage2-p9-db-cutover.js");

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const databaseUrl = String(process.env.DATABASE_URL || "").trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error("DATABASE_URL is required");

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const baseline = read("db/schema/atlas_v2.current.sql");
const correctionV1 = read("db/migrations/20260811_correction_manifest_runs.sql");
const correctionV1_1 = read("db/migrations/20260812_correction_manifest_v1_1.sql");

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query("DROP SCHEMA IF EXISTS atlas_v2 CASCADE");
  await client.query(baseline);

  // Reproduce the live predecessor state that existed in Production: the
  // correction ledger exists and accepts v1/v1.1, but not v2 yet.
  await client.query(correctionV1);
  await client.query(correctionV1_1);

  const p5 = await applyStage2SchemaRelease(client);
  assert.equal(p5.applied.length, 6, "live-parity rehearsal requires all six P5 components");

  const stale = await inspectCorrectionLedgerCompatibility(client);
  assert.equal(stale.table_present, true);
  assert.equal(stale.constraint_present, true);
  assert.equal(stale.predecessor_compatible, true);
  assert.equal(stale.ready, false);
  assert.deepEqual(stale.allowed_manifest_schemas, [V1, V1_1].sort());

  const dry = await applyCorrectionLedgerV2Compatibility(client, { dryRun: true });
  assert.equal(dry.dry_run, true);
  assert.equal(dry.committed, false);
  assert.equal(dry.replay, false);
  assert.equal(dry.after.ready, true, "dry-run must prove the widened constraint before rollback");
  const afterDry = await inspectCorrectionLedgerCompatibility(client);
  assert.equal(afterDry.ready, false, "dry-run must roll the constraint widening back");
  assert.deepEqual(afterDry.allowed_manifest_schemas, [V1, V1_1].sort());

  const applied = await applyCorrectionLedgerV2Compatibility(client);
  assert.equal(applied.dry_run, false);
  assert.equal(applied.committed, true);
  assert.equal(applied.replay, false);
  assert.equal(applied.after.ready, true);
  assert.deepEqual(applied.after.allowed_manifest_schemas, [V1, V1_1, V2].sort());

  // Exercise the exact live failure surface from Train 2: a v2 audit-ledger
  // insert must now satisfy the Production-compatible check constraint.
  await client.query("begin");
  await client.query(
    `insert into atlas_v2.correction_manifest_runs(request_id,manifest_hash,manifest_schema,result_snapshot)
     values($1,$2,$3,$4::jsonb)`,
    ["train2-live-parity-v2", "sha256:fixture", V2, JSON.stringify({ marker: "train2-live-parity" })]
  );
  await client.query("rollback");

  const replay = await applyCorrectionLedgerV2Compatibility(client);
  assert.equal(replay.replay, true, "compatibility apply must be idempotent after the first commit");
  assert.equal(replay.after.ready, true);

  // Continue on the same upgraded database through the P9 transaction path so
  // the rehearsal covers the next Production stage rather than stopping at the
  // error that happened to be observed first.
  const p9Before = await inspectP9Cutover(client);
  assert.equal(p9Before.old_index_present, true);
  assert.equal(p9Before.new_index_present, false);
  assert.equal(p9Before.duplicate_groups, 0);

  const p9Dry = await applyP9Cutover(client, { dryRun: true });
  assert.equal(p9Dry.dry_run, true);
  assert.equal(p9Dry.committed, false);
  assert.equal(p9Dry.after.old_index_present, false);
  assert.equal(p9Dry.after.new_index_present, true);
  const p9AfterDry = await inspectP9Cutover(client);
  assert.equal(p9AfterDry.old_index_present, true, "P9 dry-run must roll index replacement back");
  assert.equal(p9AfterDry.new_index_present, false);

  const p9Applied = await applyP9Cutover(client);
  assert.equal(p9Applied.committed, true);
  assert.equal(p9Applied.after.old_index_present, false);
  assert.equal(p9Applied.after.new_index_present, true);
  assert.equal(p9Applied.after.duplicate_groups, 0);

  const p9Replay = await applyP9Cutover(client);
  assert.equal(p9Replay.replay, true, "P9 apply must remain idempotent");

  console.log(JSON.stringify({
    ok: true,
    marker: "ATLAS_STAGE2_TRAIN2_LIVE_SCHEMA_PARITY_V1",
    stale_correction_schemas: stale.allowed_manifest_schemas,
    correction_v2_ready: applied.after.ready,
    p9_old_index_present: p9Replay.after.old_index_present,
    p9_new_index_present: p9Replay.after.new_index_present,
    p9_duplicate_groups: p9Replay.after.duplicate_groups
  }, null, 2));
} finally {
  try { await client.query("DROP SCHEMA IF EXISTS atlas_v2 CASCADE"); } catch {}
  await client.end();
}
