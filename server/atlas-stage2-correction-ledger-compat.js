"use strict";

const TABLE_REGCLASS = "atlas_v2.correction_manifest_runs";
const CONSTRAINT_NAME = "correction_manifest_runs_manifest_schema_check";
const LOCK_KEY = "atlas-stage2:correction-ledger-v2-compat:v1";
const V1 = "atlas-correction-manifest/v1";
const V1_1 = "atlas-correction-manifest/v1.1";
const V2 = "atlas-correction-manifest/v2";
const FINAL_SCHEMAS = Object.freeze([V1, V1_1, V2]);
const PREDECESSOR_SCHEMA_SETS = Object.freeze([
  Object.freeze([V1]),
  Object.freeze([V1, V1_1]),
  FINAL_SCHEMAS
]);

function sameSet(left, right) {
  if (left.length !== right.length) return false;
  const a = [...left].sort();
  const b = [...right].sort();
  return a.every((value, index) => value === b[index]);
}

function extractManifestSchemas(definition) {
  const matches = String(definition || "").match(/atlas-correction-manifest\/v(?:1(?:\.1)?|2)/g) || [];
  return [...new Set(matches)].sort();
}

function isRecognizedPredecessor(schemas) {
  return PREDECESSOR_SCHEMA_SETS.some((expected) => sameSet(schemas, expected));
}

async function inspectCorrectionLedgerCompatibility(client) {
  const table = await client.query("select to_regclass($1) as relation", [TABLE_REGCLASS]);
  const tablePresent = Boolean(table.rows[0]?.relation);
  if (!tablePresent) {
    return Object.freeze({
      table_present: false,
      constraint_present: false,
      allowed_manifest_schemas: Object.freeze([]),
      predecessor_compatible: false,
      ready: false
    });
  }

  const result = await client.query(`
    select pg_get_constraintdef(c.oid) as definition
    from pg_constraint c
    join pg_class t on t.oid=c.conrelid
    join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='atlas_v2'
      and t.relname='correction_manifest_runs'
      and c.conname=$1
      and c.contype='c'`, [CONSTRAINT_NAME]);

  const definition = result.rows[0]?.definition || null;
  const schemas = extractManifestSchemas(definition);
  const constraintPresent = Boolean(definition);
  const predecessorCompatible = constraintPresent && isRecognizedPredecessor(schemas);
  const ready = predecessorCompatible && sameSet(schemas, FINAL_SCHEMAS);
  return Object.freeze({
    table_present: true,
    constraint_present: constraintPresent,
    allowed_manifest_schemas: Object.freeze(schemas),
    predecessor_compatible: predecessorCompatible,
    ready
  });
}

async function applyCorrectionLedgerV2Compatibility(client, { dryRun = false } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  await client.query("begin isolation level serializable");
  try {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [LOCK_KEY]);
    const before = await inspectCorrectionLedgerCompatibility(client);
    if (!before.table_present) throw new Error("TRAIN2_CORRECTION_LEDGER_TABLE_MISSING");
    if (!before.constraint_present) throw new Error("TRAIN2_CORRECTION_LEDGER_CONSTRAINT_MISSING");
    if (!before.predecessor_compatible) throw new Error("TRAIN2_CORRECTION_LEDGER_CONSTRAINT_DRIFT");

    if (before.ready) {
      if (dryRun) await client.query("rollback"); else await client.query("commit");
      return Object.freeze({
        marker: "ATLAS_STAGE2_CORRECTION_LEDGER_V2_COMPAT_V1",
        dry_run: Boolean(dryRun),
        committed: !dryRun,
        replay: true,
        before,
        after: before
      });
    }

    await client.query(`ALTER TABLE atlas_v2.correction_manifest_runs DROP CONSTRAINT ${CONSTRAINT_NAME}`);
    await client.query(`ALTER TABLE atlas_v2.correction_manifest_runs
      ADD CONSTRAINT ${CONSTRAINT_NAME}
      CHECK (manifest_schema IN ('${V1}','${V1_1}','${V2}'))`);

    const after = await inspectCorrectionLedgerCompatibility(client);
    if (!after.ready) throw new Error("TRAIN2_CORRECTION_LEDGER_V2_COMPAT_POSTCONDITION_FAILED");

    const outcome = Object.freeze({
      marker: "ATLAS_STAGE2_CORRECTION_LEDGER_V2_COMPAT_V1",
      dry_run: Boolean(dryRun),
      committed: !dryRun,
      replay: false,
      before,
      after
    });
    if (dryRun) await client.query("rollback"); else await client.query("commit");
    return outcome;
  } catch (error) {
    try { await client.query("rollback"); } catch {}
    throw error;
  }
}

module.exports = Object.freeze({
  TABLE_REGCLASS,
  CONSTRAINT_NAME,
  LOCK_KEY,
  V1,
  V1_1,
  V2,
  FINAL_SCHEMAS,
  extractManifestSchemas,
  inspectCorrectionLedgerCompatibility,
  applyCorrectionLedgerV2Compatibility
});
