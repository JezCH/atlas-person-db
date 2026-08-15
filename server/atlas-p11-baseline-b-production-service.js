"use strict";

const {
  BASELINE_B_SCHEMA,
  BASELINE_B_SEMANTIC_VERSION,
  CORE_DATASET_QUERIES,
  digest,
  inspectBaselineBReadiness,
  captureBaselineB
} = require("./atlas-baseline-b.js");

const EXPECTED_DATASET_KEYS = Object.freeze(CORE_DATASET_QUERIES.map((item) => item.key).sort());
const EXPECTED_DATASET_COUNT = EXPECTED_DATASET_KEYS.length;

function exactKeys(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value).sort()
    : [];
}

function sameKeys(actual, expected) {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function assertProductionBaselineBArtifact(baseline) {
  if (!baseline || typeof baseline !== "object" || Array.isArray(baseline)) throw new Error("P11_BASELINE_B_ARTIFACT_REQUIRED");
  if (baseline.schema !== BASELINE_B_SCHEMA) throw new Error("P11_BASELINE_B_SCHEMA_DRIFT");
  if (baseline.semantic_version !== BASELINE_B_SEMANTIC_VERSION) throw new Error("P11_BASELINE_B_SEMANTIC_VERSION_DRIFT");
  if (Number(baseline.dataset_count) !== EXPECTED_DATASET_COUNT) throw new Error("P11_BASELINE_B_DATASET_COUNT_DRIFT");
  if (!sameKeys(exactKeys(baseline.datasets), EXPECTED_DATASET_KEYS)) throw new Error("P11_BASELINE_B_DATASET_KEYS_DRIFT");
  if (!sameKeys(exactKeys(baseline.counts), EXPECTED_DATASET_KEYS)) throw new Error("P11_BASELINE_B_COUNT_KEYS_DRIFT");
  if (!sameKeys(exactKeys(baseline.dataset_digests), EXPECTED_DATASET_KEYS)) throw new Error("P11_BASELINE_B_DIGEST_KEYS_DRIFT");

  for (const key of EXPECTED_DATASET_KEYS) {
    const rows = baseline.datasets[key];
    if (!Array.isArray(rows)) throw new Error(`P11_BASELINE_B_DATASET_NOT_ARRAY:${key}`);
    if (!Number.isInteger(baseline.counts[key]) || baseline.counts[key] !== rows.length) {
      throw new Error(`P11_BASELINE_B_ROW_COUNT_DRIFT:${key}`);
    }
    if (baseline.dataset_digests[key] !== digest(rows)) throw new Error(`P11_BASELINE_B_DATASET_DIGEST_DRIFT:${key}`);
  }

  const expectedBaselineDigest = digest({
    schema: baseline.schema,
    semantic_version: baseline.semantic_version,
    dataset_count: baseline.dataset_count,
    counts: baseline.counts,
    dataset_digests: baseline.dataset_digests
  });
  if (baseline.baseline_digest !== expectedBaselineDigest) throw new Error("P11_BASELINE_B_DIGEST_DRIFT");
  if (baseline.readiness?.ready !== true) throw new Error("P11_BASELINE_B_READINESS_DRIFT");
  if (baseline.authority?.production_mutation_authorized !== false) throw new Error("P11_BASELINE_B_AUTHORITY_DRIFT");
  return baseline;
}

async function inspectProductionBaselineBReadiness(client, {
  inspectReadiness = inspectBaselineBReadiness
} = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    const readiness = await inspectReadiness(client);
    await client.query("COMMIT");
    return Object.freeze({
      read_only: true,
      database_write_committed: false,
      readiness
    });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    throw error;
  }
}

async function captureProductionBaselineB(client, {
  capture = captureBaselineB
} = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const baseline = assertProductionBaselineBArtifact(await capture(client));
  return Object.freeze({
    read_only: true,
    database_write_committed: false,
    baseline
  });
}

module.exports = Object.freeze({
  EXPECTED_DATASET_KEYS,
  EXPECTED_DATASET_COUNT,
  assertProductionBaselineBArtifact,
  inspectProductionBaselineBReadiness,
  captureProductionBaselineB
});
