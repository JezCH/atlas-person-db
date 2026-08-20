import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  OPERATION_TYPE,
  REVIEW_REASON,
  requireManifest,
  createCorrectionPolityRetireV2Service
} = require("../server/atlas-correction-polity-retire-v2-service.js");
const {
  POLITY_RETIRE_OPERATION_TYPE,
  createCorrectionManifestV2DispatchService
} = require("../server/atlas-correction-manifest-v2-dispatch-service.js");

const POLITY_ID = "46534f7e-9247-5644-b5ad-9525c3d4f5d6";
const POLITY = Object.freeze({
  id: POLITY_ID,
  canonical_key: "Tokugawa Shogunate",
  polity_type: "historical_polity",
  historicity: "historical"
});
const NAMES = Object.freeze([
  Object.freeze({ locale: "en", name: "Tokugawa Shogunate", is_preferred: true }),
  Object.freeze({ locale: "ko", name: "도쿠가와 막부", is_preferred: true })
]);

const FK_ROWS = [
  { source_schema: "atlas_v2", source_table: "person_politics_v2", source_column: "polity_id", constraint_name: "person_politics_v2_polity_id_fkey", target_column: "id", source_key_count: 1, target_key_count: 1 },
  { source_schema: "atlas_v2", source_table: "polity_descriptions", source_column: "polity_id", constraint_name: "polity_descriptions_polity_id_fkey", target_column: "id", source_key_count: 1, target_key_count: 1 },
  { source_schema: "atlas_v2", source_table: "polity_names", source_column: "polity_id", constraint_name: "polity_names_polity_id_fkey", target_column: "id", source_key_count: 1, target_key_count: 1 },
  { source_schema: "atlas_v2", source_table: "polity_sources", source_column: "polity_id", constraint_name: "polity_sources_polity_id_fkey", target_column: "id", source_key_count: 1, target_key_count: 1 }
];
const SEMANTIC_ROWS = FK_ROWS.map(({ source_schema, source_table, source_column }) => ({ source_schema, source_table, source_column }));

function manifest(overrides = {}) {
  const operation = {
    type: OPERATION_TYPE,
    case_id: "polity-retire:tokugawa-shogunate",
    review_reason: REVIEW_REASON,
    expected_polity: { ...POLITY },
    expected_preferred_names: NAMES.map((row) => ({ ...row })),
    expected_owned_reference_total: 3,
    expected_external_reference_total: 0,
    ...(overrides.operation || {})
  };
  return {
    schema: "atlas-correction-manifest/v2",
    review_status: "approved",
    request_id: "polity-retirement:test:v1",
    operations: [operation],
    ...overrides,
    operations: overrides.operations || [operation]
  };
}

function fakeClient({ externalReferences = 0 } = {}) {
  const state = {
    deleted: false,
    ledger: null,
    externalReferences,
    txSnapshot: null
  };
  const statements = [];

  const countsFor = (table) => {
    if (state.deleted) return 0;
    if (table === "person_politics_v2") return state.externalReferences;
    if (table === "polity_names") return 2;
    if (table === "polity_sources") return 1;
    if (table === "polity_descriptions") return 0;
    return 0;
  };

  return {
    state,
    statements,
    async query(sql, params = []) {
      const text = String(sql);
      const lower = text.trim().toLowerCase().replace(/\s+/g, " ");
      statements.push({ sql: text, params });

      if (lower === "begin isolation level serializable") {
        state.txSnapshot = { deleted: state.deleted, ledger: state.ledger };
        return { rows: [] };
      }
      if (lower === "rollback") {
        if (state.txSnapshot) {
          state.deleted = state.txSnapshot.deleted;
          state.ledger = state.txSnapshot.ledger;
        }
        state.txSnapshot = null;
        return { rows: [] };
      }
      if (lower === "commit") {
        state.txSnapshot = null;
        return { rows: [] };
      }
      if (lower.includes("pg_advisory_xact_lock")) return { rows: [] };
      if (lower.includes("to_regclass('atlas_v2.correction_manifest_runs')")) {
        return { rows: [{ correction_manifest_runs: "atlas_v2.correction_manifest_runs" }] };
      }
      if (lower.includes("from atlas_v2.correction_manifest_runs") && lower.includes("where request_id=$1")) {
        return { rows: state.ledger ? [state.ledger] : [] };
      }
      if (lower.startsWith("insert into atlas_v2.correction_manifest_runs")) {
        state.ledger = {
          request_id: params[0],
          manifest_hash: params[1],
          manifest_schema: params[2],
          result_snapshot: JSON.parse(params[3]),
          applied_at: "2026-08-21T00:00:00Z"
        };
        return { rows: [], rowCount: 1 };
      }
      if (lower.startsWith("delete from atlas_v2.polities")) {
        if (state.deleted) return { rows: [], rowCount: 0 };
        state.deleted = true;
        return { rows: [{ ...POLITY }], rowCount: 1 };
      }
      if (lower.includes("from atlas_v2.polities") && lower.includes("where id=$1::uuid")) {
        return { rows: state.deleted ? [] : [{ ...POLITY }] };
      }
      if (lower.includes("from atlas_v2.polity_names") && lower.includes("where polity_id=$1::uuid") && lower.includes("is_preferred=true")) {
        return { rows: state.deleted ? [] : NAMES.map((row) => ({ ...row })) };
      }
      if (lower.includes("from pg_constraint con")) return { rows: structuredClone(FK_ROWS) };
      if (lower.includes("from information_schema.columns c")) return { rows: structuredClone(SEMANTIC_ROWS) };
      if (lower.startsWith("select count(*)::int as reference_count from \"")) {
        const match = text.match(/from\s+"atlas_v2"\."([^"]+)"/i);
        const table = match?.[1] || "";
        return { rows: [{ reference_count: countsFor(table) }] };
      }
      if (lower.startsWith("select (select count(*)::int from atlas_v2.polities) as polities")) {
        return { rows: [{
          polities: state.deleted ? 9 : 10,
          polity_names: state.deleted ? 18 : 20,
          polity_descriptions: 4,
          polity_sources: state.deleted ? 6 : 7
        }] };
      }
      throw new Error(`unexpected SQL: ${text}`);
    }
  };
}

test("retirement manifest requires a zero external-reference expectation", () => {
  assert.throws(
    () => requireManifest(manifest({ operation: { expected_external_reference_total: 1 } })),
    /CORRECTION_POLITY_RETIRE_EXPECTED_EXTERNAL_REFERENCE_TOTAL_MUST_BE_ZERO/
  );
});

test("dry-run deletes only inside the serializable transaction and rolls back", async () => {
  const client = fakeClient();
  const service = createCorrectionPolityRetireV2Service({ client });
  const outcome = await service.execute(manifest(), { dryRun: true });

  assert.equal(outcome.marker, "ATLAS_CORRECTION_MANIFEST_V2");
  assert.equal(outcome.dry_run, true);
  assert.equal(outcome.committed, false);
  assert.equal(outcome.replay, false);
  assert.equal(outcome.result.polities_removed, 1);
  assert.deepEqual(outcome.result.owned_rows_removed, { polity_names: 2, polity_descriptions: 0, polity_sources: 1 });
  assert.equal(client.state.deleted, false);
  assert.equal(client.state.ledger, null);
  assert.equal(client.statements.some(({ sql }) => /^\s*delete from atlas_v2\.polities/i.test(sql)), true);
  assert.equal(client.statements.at(-1).sql.trim().toLowerCase(), "rollback");
});

test("any live external reference blocks retirement and rolls back before delete", async () => {
  const client = fakeClient({ externalReferences: 1 });
  const service = createCorrectionPolityRetireV2Service({ client });
  await assert.rejects(
    () => service.execute(manifest(), { dryRun: false }),
    /CORRECTION_POLITY_RETIRE_EXTERNAL_REFERENCES_PRESENT/
  );
  assert.equal(client.state.deleted, false);
  assert.equal(client.statements.some(({ sql }) => /^\s*delete from atlas_v2\.polities/i.test(sql)), false);
  assert.equal(client.statements.at(-1).sql.trim().toLowerCase(), "rollback");
});

test("apply writes one correction ledger and replay requires the polity to remain absent", async () => {
  const client = fakeClient();
  const service = createCorrectionPolityRetireV2Service({ client });
  const first = await service.execute(manifest(), { dryRun: false });
  assert.equal(first.committed, true);
  assert.equal(first.replay, false);
  assert.equal(client.state.deleted, true);
  assert.equal(client.state.ledger.manifest_schema, "atlas-correction-manifest/v2");

  const second = await service.execute(manifest(), { dryRun: false });
  assert.equal(second.committed, true);
  assert.equal(second.replay, true);
  assert.equal(client.state.deleted, true);
});

test("v2 dispatch isolates Polity retirement from every other correction family", async () => {
  assert.equal(POLITY_RETIRE_OPERATION_TYPE, OPERATION_TYPE);
  const client = fakeClient();
  const dispatch = createCorrectionManifestV2DispatchService({ client });
  assert.throws(
    () => dispatch.execute(manifest({ operations: [manifest().operations[0], { type: "rewrite_activity" }] }), { dryRun: true }),
    /CORRECTION_V2_POLITY_RETIRE_MIXED_OPERATION_FAMILY_FORBIDDEN/
  );
  const outcome = await dispatch.execute(manifest(), { dryRun: true });
  assert.equal(outcome.dry_run, true);
  assert.equal(client.state.deleted, false);
});
