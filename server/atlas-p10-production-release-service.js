"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { rebuildCandidates } = require("./atlas-duplicate-review-service.js");
const { inspectPersonDuplicateRevalidationReadiness } = require("./atlas-person-duplicate-revalidation-readiness.js");
const { inspectPersonMergeReferenceReadiness } = require("./atlas-person-merge-reference-readiness.js");
const { personMergeExecutionState } = require("./atlas-person-merge-interlock.js");

const ROOT = path.resolve(__dirname, "..");
const MIGRATION_PATH = path.join(ROOT, "migration/phase-10/p10-person-duplicate-revalidation-requirements.sql");
const GORGO_REQUIREMENT_KEY = "p10:gorgo-of-sparta:gorgo:p4-reviewed-same-person";

function migrationBody(sql) {
  const source = String(sql || "").trim();
  let body = source.replace(/(^|\n)\s*BEGIN;\s*(?=\n)/i, "$1");
  body = body.replace(/\s*COMMIT;\s*$/i, "");
  if (/\bBEGIN\s*;/i.test(body) || /\bCOMMIT\s*;/i.test(body)) {
    throw new Error("P10_RELEASE_MIGRATION_TRANSACTION_WRAPPER_DRIFT");
  }
  return body.trim();
}

function loadRequirementMigration() {
  return migrationBody(fs.readFileSync(MIGRATION_PATH, "utf8"));
}

async function inspectRequirementLedger(client) {
  const relation = await client.query(`select to_regclass('atlas_v2.person_duplicate_revalidation_requirements')::text as requirement_ledger`);
  const tablePresent = Boolean(relation.rows[0]?.requirement_ledger);
  let seed = null;
  if (tablePresent) {
    const result = await client.query(`
      select requirement_key,person_low_id,person_high_id,requirement_state,requirement_version,
             prior_outcome,source_artifact,source_decision_id,evidence_snapshot
        from atlas_v2.person_duplicate_revalidation_requirements
       where requirement_key=$1`, [GORGO_REQUIREMENT_KEY]);
    if (result.rowCount === 1) seed = result.rows[0];
    else if (result.rowCount > 1) throw new Error("P10_RELEASE_REQUIREMENT_SEED_DUPLICATE");
  }
  return Object.freeze({
    table_present: tablePresent,
    gorgo_requirement_present: Boolean(seed),
    gorgo_requirement_state: seed?.requirement_state == null ? null : String(seed.requirement_state),
    gorgo_requirement: seed ? Object.freeze({
      requirement_key: String(seed.requirement_key),
      person_low_id: String(seed.person_low_id),
      person_high_id: String(seed.person_high_id),
      requirement_state: String(seed.requirement_state),
      requirement_version: String(seed.requirement_version),
      prior_outcome: String(seed.prior_outcome),
      source_artifact: String(seed.source_artifact),
      source_decision_id: String(seed.source_decision_id),
      evidence_snapshot: seed.evidence_snapshot && typeof seed.evidence_snapshot === "object" ? seed.evidence_snapshot : {}
    }) : null
  });
}

function mergeExecutionStateWithReadiness(revalidationReadiness) {
  const lifecycle = personMergeExecutionState();
  return Object.freeze({
    ...lifecycle,
    lifecycle_code_ready: Boolean(lifecycle.allowed),
    revalidation_ready: Boolean(revalidationReadiness?.ready),
    revalidation_blockers: Object.freeze([...(revalidationReadiness?.blockers || [])]),
    allowed: Boolean(lifecycle.allowed && revalidationReadiness?.ready)
  });
}

async function inspectP10ProductionState(client) {
  const ledger = await inspectRequirementLedger(client);
  const referenceReadiness = await inspectPersonMergeReferenceReadiness(client);
  const revalidationReadiness = await inspectPersonDuplicateRevalidationReadiness(client);
  return Object.freeze({
    requirement_ledger: ledger,
    reference_readiness: referenceReadiness,
    revalidation_readiness: revalidationReadiness,
    merge_execution_state: mergeExecutionStateWithReadiness(revalidationReadiness),
    physical_person_merge_executed_by_release: false
  });
}

async function applyRequirementMigration(client, { dryRun = false } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const sql = loadRequirementMigration();
  await client.query("BEGIN");
  try {
    await client.query(sql);
    const during = await inspectP10ProductionState(client);
    if (!during.requirement_ledger.table_present || !during.requirement_ledger.gorgo_requirement_present) {
      throw new Error("P10_RELEASE_REQUIREMENT_MIGRATION_POSTCONDITION_FAILED");
    }
    if (dryRun) {
      await client.query("ROLLBACK");
      return Object.freeze({ committed: false, dry_run: true, during });
    }
    await client.query("COMMIT");
    const after = await inspectP10ProductionState(client);
    return Object.freeze({ committed: true, dry_run: false, after });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    throw error;
  }
}

async function rebuildP10CandidateFrontier(client) {
  const before = await inspectP10ProductionState(client);
  if (!before.requirement_ledger.table_present) throw new Error("P10_RELEASE_REQUIREMENT_SCHEMA_REQUIRED");
  const rebuild = await rebuildCandidates({ client });
  const after = await inspectP10ProductionState(client);
  return Object.freeze({
    rebuild,
    before,
    after,
    physical_person_merge_executed: false,
    review_decision_written: false
  });
}

module.exports = Object.freeze({
  MIGRATION_PATH,
  GORGO_REQUIREMENT_KEY,
  migrationBody,
  loadRequirementMigration,
  inspectRequirementLedger,
  mergeExecutionStateWithReadiness,
  inspectP10ProductionState,
  applyRequirementMigration,
  rebuildP10CandidateFrontier
});
