import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  quoteIdentifier,
  queryPolityReferenceAudit,
  createPolityReferenceAuditHandler
} = require("../server/atlas-polity-reference-audit-handler.js");

const P1 = "10000000-0000-4000-8000-000000000001";
const P2 = "10000000-0000-4000-8000-000000000002";
const SHA = "a".repeat(40);

const FK_ROWS = [
  { source_schema: "atlas_v2", source_table: "person_politics_v2", source_column: "polity_id", constraint_name: "person_politics_v2_polity_id_fkey", target_column: "id", source_key_count: 1, target_key_count: 1 },
  { source_schema: "atlas_v2", source_table: "polity_descriptions", source_column: "polity_id", constraint_name: "polity_descriptions_polity_id_fkey", target_column: "id", source_key_count: 1, target_key_count: 1 },
  { source_schema: "atlas_v2", source_table: "polity_names", source_column: "polity_id", constraint_name: "polity_names_polity_id_fkey", target_column: "id", source_key_count: 1, target_key_count: 1 },
  { source_schema: "atlas_v2", source_table: "polity_sources", source_column: "polity_id", constraint_name: "polity_sources_polity_id_fkey", target_column: "id", source_key_count: 1, target_key_count: 1 }
];
const SEMANTIC_ROWS = FK_ROWS.map(({ source_schema, source_table, source_column }) => ({ source_schema, source_table, source_column }));

function fakeClient({ counts = {}, fkRows = FK_ROWS, semanticRows = SEMANTIC_ROWS, failOn = null } = {}) {
  const statements = [];
  return {
    statements,
    async query(sql, params = []) {
      const text = String(sql);
      const lower = text.trim().toLowerCase();
      statements.push({ sql: text, params });
      if (failOn && lower.includes(failOn)) throw new Error("DB_FAILURE");
      if (lower.startsWith("begin isolation level repeatable read read only")) return { rows: [] };
      if (lower.includes("current_setting('transaction_read_only')")) return { rows: [{ read_only: "on" }] };
      if (lower.includes("from atlas_v2.polities p") && lower.includes("jsonb_agg")) return { rows: [
        { id: P1, canonical_key: "p1", polity_type: "historical_polity", historicity: "historical", names: [{ locale: "en", name: "P1" }] },
        { id: P2, canonical_key: "p2", polity_type: "historical_polity", historicity: "historical", names: [] }
      ] };
      if (lower.includes("from pg_constraint con")) return { rows: structuredClone(fkRows) };
      if (lower.includes("from information_schema.columns c")) return { rows: structuredClone(semanticRows) };
      if (lower.startsWith("select \"polity_id\"::text as polity_id")) {
        const match = text.match(/from\s+"([^"]+)"\."([^"]+)"/i);
        const key = `${match?.[1]}.${match?.[2]}.polity_id`;
        return { rows: Object.entries(counts[key] || {}).map(([polity_id, reference_count]) => ({ polity_id, reference_count })) };
      }
      if (lower === "commit" || lower === "rollback") return { rows: [] };
      throw new Error(`unexpected SQL: ${text}`);
    },
    async end() {}
  };
}

function responseRecorder() {
  return { statusCode: null, headers: {}, body: null,
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; },
    end(value) { this.body = JSON.parse(String(value)); } };
}

test("identifier quoting is strict and fail-closed", () => {
  assert.equal(quoteIdentifier("person_politics_v2"), '"person_politics_v2"');
  assert.throws(() => quoteIdentifier("bad-name"), /POLITY_REFERENCE_AUDIT_UNSAFE_IDENTIFIER/);
  assert.throws(() => quoteIdentifier('x";delete'), /POLITY_REFERENCE_AUDIT_UNSAFE_IDENTIFIER/);
});

test("owned-only references do not block external orphan classification", async () => {
  const client = fakeClient({ counts: {
    "atlas_v2.polity_names.polity_id": { [P1]: 2 },
    "atlas_v2.polity_sources.polity_id": { [P1]: 1 }
  } });
  const audit = await queryPolityReferenceAudit(client);
  const p1 = audit.polities.find((row) => row.polity_id === P1);
  assert.equal(audit.complete, true);
  assert.equal(p1.owned_reference_total, 3);
  assert.equal(p1.external_reference_total, 0);
  assert.equal(p1.is_external_orphan, true);
  for (const { sql } of client.statements) assert.doesNotMatch(sql, /\b(insert|update|delete|alter|drop|create|truncate|grant|revoke)\b/i);
});

test("external Activity reference blocks orphan classification", async () => {
  const client = fakeClient({ counts: { "atlas_v2.person_politics_v2.polity_id": { [P1]: 4 } } });
  const audit = await queryPolityReferenceAudit(client);
  const p1 = audit.polities.find((row) => row.polity_id === P1);
  assert.equal(p1.external_reference_total, 4);
  assert.equal(p1.is_external_orphan, false);
});

test("semantic polity_id column without FK is discovered and defaults to external", async () => {
  const client = fakeClient({
    semanticRows: [...SEMANTIC_ROWS, { source_schema: "atlas_v2", source_table: "future_links", source_column: "polity_id" }],
    counts: { "atlas_v2.future_links.polity_id": { [P2]: 1 } }
  });
  const audit = await queryPolityReferenceAudit(client);
  const ref = audit.reference_catalog.find((row) => row.source_table === "future_links");
  const p2 = audit.polities.find((row) => row.polity_id === P2);
  assert.equal(ref.constraint_backed, false);
  assert.equal(ref.classification, "external");
  assert.equal(p2.external_reference_total, 1);
  assert.equal(p2.is_external_orphan, false);
});

test("unsupported composite FK fails closed and rolls back", async () => {
  const composite = FK_ROWS.map((row) => row.source_table === "person_politics_v2" ? { ...row, source_key_count: 2, target_key_count: 2 } : row);
  const client = fakeClient({ fkRows: composite });
  await assert.rejects(() => queryPolityReferenceAudit(client), /POLITY_REFERENCE_AUDIT_UNSUPPORTED_FOREIGN_KEY/);
  assert.equal(client.statements.at(-1).sql.trim().toLowerCase(), "rollback");
});

test("missing authoritative Activity polity reference fails closed", async () => {
  const client = fakeClient({
    fkRows: FK_ROWS.filter((row) => row.source_table !== "person_politics_v2"),
    semanticRows: SEMANTIC_ROWS.filter((row) => row.source_table !== "person_politics_v2")
  });
  await assert.rejects(() => queryPolityReferenceAudit(client), /POLITY_REFERENCE_AUDIT_ACTIVITY_REFERENCE_MISSING/);
});

test("database counting failure fails closed and rolls back", async () => {
  const client = fakeClient({ failOn: 'select "polity_id"::text as polity_id' });
  await assert.rejects(() => queryPolityReferenceAudit(client), /DB_FAILURE/);
  assert.equal(client.statements.at(-1).sql.trim().toLowerCase(), "rollback");
});

test("handler exposes only a complete read-only result", async () => {
  const client = fakeClient({ counts: { "atlas_v2.person_politics_v2.polity_id": { [P1]: 1 } } });
  const handler = createPolityReferenceAuditHandler({
    env: {
      VERCEL_ENV: "production",
      VERCEL_GIT_REPO_OWNER: "JezCH",
      VERCEL_GIT_REPO_SLUG: "atlas-person-db",
      VERCEL_GIT_COMMIT_REF: "main",
      VERCEL_GIT_COMMIT_SHA: SHA,
      SUPABASE_DB_URL: "postgres://example.invalid/db"
    },
    async verifyOidc() {},
    async createClient() { return client; }
  });
  const res = responseRecorder();
  await handler({ method: "POST", headers: { authorization: "Bearer test" }, body: { deployment_sha: SHA } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.complete, true);
  assert.equal(res.body.read_only, true);
  assert.equal(res.body.committed, false);
  assert.equal(res.body.polity_count, 2);
  assert.equal(res.body.external_orphan_count, 1);
});
