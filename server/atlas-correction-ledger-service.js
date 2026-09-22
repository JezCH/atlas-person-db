"use strict";

const crypto = require("node:crypto");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function manifestHash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

async function correctionLedgerExists(client) {
  const result = await client.query(`select to_regclass('atlas_v2.correction_manifest_runs')::text as correction_manifest_runs`);
  return Boolean(result.rows[0]?.correction_manifest_runs);
}

async function readLedger(client, requestId) {
  if (!await correctionLedgerExists(client)) return null;
  const result = await client.query(`
    select request_id,manifest_hash,manifest_schema,result_snapshot,applied_at
      from atlas_v2.correction_manifest_runs
     where request_id=$1
     for update`, [requestId]);
  return result.rows[0] || null;
}

module.exports = Object.freeze({
  stable,
  manifestHash,
  correctionLedgerExists,
  readLedger
});
