import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  AUDIT_OIDC_AUDIENCE,
  AUDIT_WORKFLOW_REF,
  createAuditInventoryHandler,
  normalizeActivityIds,
  normalizeMode,
  queryInventory,
  queryFullStage2Baseline,
  digestBaseline
} = require("../server/atlas-audit-inventory-handler.js");
const authoringOidc = require("../server/atlas-github-oidc.js");
const auditOidc = require("../server/atlas-audit-github-oidc.js");

const ACTIVITY_A = "75a124e8-df55-5247-aa48-dc9d7934c10e";
const ACTIVITY_B = "da809f25-40ff-5c27-b10b-88d4acc4070d";
const PERSON_A = "00000000-0000-4000-8000-000000000001";
const PERSON_UNUSED = "00000000-0000-4000-8000-000000000002";
const POLITY_A = "10000000-0000-4000-8000-000000000001";
const POLITY_UNUSED = "10000000-0000-4000-8000-000000000002";
const ROLE = "30000000-0000-4000-8000-000000000001";
const BASIS = "20000000-0000-4000-8000-000000000001";
const SOURCE = "40000000-0000-4000-8000-000000000001";
const NAME_A = "50000000-0000-4000-8000-000000000001";
const NAME_B = "50000000-0000-4000-8000-000000000002";
const SHA = "a".repeat(40);

function trustPayload({ audience, workflowRef } = {}) {
  return { iss: authoringOidc.ISSUER, aud: audience, repository: authoringOidc.EXPECTED_REPOSITORY,
    repository_id: authoringOidc.EXPECTED_REPOSITORY_ID, ref: authoringOidc.EXPECTED_REF, workflow_ref: workflowRef,
    environment: "production", event_name: "push", sha: SHA };
}

function fakeInventoryClient(ids) {
  const statements = [];
  const rows = ids.map((activityId) => ({
    activity_id: activityId, person_id: PERSON_A, polity_id: POLITY_A, role_id: ROLE, period_basis_id: BASIS,
    activity_start: -203, activity_end: -196, confidence: "well_established", chronology_status: "reviewed", legacy_source_key: `legacy-${activityId}`, notes: null,
    person_canonical_key: "person-a", person_type: "historical", person_historicity: "historical", person_name_en: "Person A", person_name_ko: null,
    polity_canonical_key: "polity-a", polity_type: "state", polity_historicity: "historical", polity_name_en: "Polity A", polity_name_ko: null,
    role_code: "ruler", role_category: "political", role_source_label: "Ruler", period_basis: "reign",
    source_count: 1, chronology_claim_count: 0, description_count: 0
  }));
  const catalogs = {
    persons: [
      { id: PERSON_A, canonical_key: "person-a", person_type: "historical", historicity: "historical", names: [{ id: NAME_A, locale: "en", name: "Person A", name_type: "canonical", is_preferred: true }] },
      { id: PERSON_UNUSED, canonical_key: "person-unused", person_type: "historical", historicity: "historical", names: [] }
    ],
    polities: [
      { id: POLITY_A, canonical_key: "polity-a", polity_type: "state", historicity: "historical", names: [{ id: NAME_B, locale: "en", name: "Polity A", name_type: "canonical", is_preferred: true }] },
      { id: POLITY_UNUSED, canonical_key: "polity-unused", polity_type: "state", historicity: "historical", names: [] }
    ],
    roles: [{ id: ROLE, code: "ruler", category: "political", source_label: "Ruler", is_active: true, names: [] }],
    period_bases: [{ id: BASIS, code: "reign", is_active: true, names: [] }],
    sources: [{ id: SOURCE, source_key: "source-a", source_type: "dataset", title: "Source A", sha256: "abc", bytes: 1 }]
  };
  const counts = { persons: 2, person_names: 1, polities: 2, polity_names: 1, roles: 1, role_names: 0,
    period_bases: 1, period_basis_names: 0, sources: 1, activities: rows.length, activity_source_links: rows.length,
    chronology_claims: 0, relationship_descriptions: 0 };
  return {
    statements, catalogs, counts,
    async query(sql, params = []) {
      statements.push({ sql: String(sql), params });
      const text = String(sql).trim().toLowerCase();
      if (text.startsWith("begin isolation level repeatable read read only")) return { rows: [] };
      if (text.includes("current_setting('transaction_read_only')")) return { rows: [{ read_only: "on" }] };
      if (text.includes("from atlas_v2.person_politics_v2 pp")) {
        if (text.includes("where pp.id = any($1::uuid[])")) {
          const requested = new Set((params[0] || []).map(String));
          return { rows: rows.filter((row) => requested.has(row.activity_id)) };
        }
        return { rows: structuredClone(rows) };
      }
      if (text.includes("from atlas_v2.persons p order by p.id")) return { rows: structuredClone(catalogs.persons) };
      if (text.includes("from atlas_v2.polities p order by p.id")) return { rows: structuredClone(catalogs.polities) };
      if (text.includes("from atlas_v2.roles r order by r.id")) return { rows: structuredClone(catalogs.roles) };
      if (text.includes("from atlas_v2.period_bases p order by p.id")) return { rows: structuredClone(catalogs.period_bases) };
      if (text.includes("from atlas_v2.sources s order by s.id")) return { rows: structuredClone(catalogs.sources) };
      if (text.startsWith("select (select count(*)::int from atlas_v2.persons) as persons")) return { rows: [structuredClone(counts)] };
      if (text === "commit" || text === "rollback") return { rows: [] };
      throw new Error(`unexpected SQL: ${sql}`);
    },
    async end() {}
  };
}

function responseRecorder() {
  return { statusCode: null, headers: {}, body: null,
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; },
    end(value) { this.body = JSON.parse(String(value)); } };
}

test("audit inventory UUID contract is bounded, exact, and deterministic", () => {
  assert.deepEqual(normalizeActivityIds([ACTIVITY_B, ACTIVITY_A, ACTIVITY_A]), [ACTIVITY_A, ACTIVITY_B]);
  assert.throws(() => normalizeActivityIds([]), /AUDIT_ACTIVITY_IDS_REQUIRED/);
  assert.throws(() => normalizeActivityIds(["not-a-uuid"]), /AUDIT_ACTIVITY_ID_INVALID/);
  assert.throws(() => normalizeActivityIds(Array.from({ length: 101 }, () => ACTIVITY_A)), /AUDIT_ACTIVITY_IDS_LIMIT_EXCEEDED/);
  assert.equal(normalizeMode(undefined), "targeted");
  assert.equal(normalizeMode("full_stage2_baseline"), "full_stage2_baseline");
  assert.throws(() => normalizeMode("full_activity_baseline"), /AUDIT_MODE_INVALID/);
});

test("targeted audit remains repeatable-read READ ONLY and contains no mutation SQL", async () => {
  const client = fakeInventoryClient([ACTIVITY_A, ACTIVITY_B]);
  const rows = await queryInventory(client, [ACTIVITY_A, ACTIVITY_B]);
  assert.equal(rows.length, 2);
  assert.match(client.statements[0].sql, /repeatable read read only/i);
  for (const { sql } of client.statements) assert.doesNotMatch(sql, /\b(insert|update|delete|alter|drop|create|truncate|grant|revoke)\b/i);
  assert.equal(client.statements.at(-1).sql.trim().toLowerCase(), "commit");
});

test("targeted audit fails closed when any reviewed Activity UUID is missing", async () => {
  const client = fakeInventoryClient([ACTIVITY_A]);
  await assert.rejects(() => queryInventory(client, [ACTIVITY_A, ACTIVITY_B]),
    (error) => error?.message === "AUDIT_INVENTORY_TARGET_MISSING" && error?.missing_activity_ids?.[0] === ACTIVITY_B);
  assert.equal(client.statements.at(-1).sql.trim().toLowerCase(), "rollback");
});

test("Baseline A v2 captures complete identity/name/source catalogs in the same read-only transaction", async () => {
  const client = fakeInventoryClient([ACTIVITY_A, ACTIVITY_B]);
  const baseline = await queryFullStage2Baseline(client);
  assert.equal(baseline.rows.length, 2);
  assert.equal(baseline.catalogs.persons.length, 2);
  assert.equal(baseline.catalogs.polities.length, 2);
  assert.equal(baseline.catalogs.sources.length, 1);
  assert.equal(baseline.counts.activities, 2);
  assert.equal(baseline.baseline_digest, digestBaseline(baseline.rows, baseline.counts, baseline.catalogs));
  assert.match(client.statements[0].sql, /repeatable read read only/i);
  for (const { sql } of client.statements) assert.doesNotMatch(sql, /\b(insert|update|delete|alter|drop|create|truncate|grant|revoke)\b/i);
  assert.equal(client.statements.at(-1).sql.trim().toLowerCase(), "commit");
});

test("authoring and audit OIDC trust boundaries remain separate", () => {
  const authoringPayload = trustPayload({ audience: authoringOidc.EXPECTED_AUDIENCE, workflowRef: authoringOidc.EXPECTED_WORKFLOW_REF });
  const auditPayload = trustPayload({ audience: auditOidc.EXPECTED_AUDIENCE, workflowRef: auditOidc.EXPECTED_WORKFLOW_REF });
  assert.equal(auditOidc.EXPECTED_AUDIENCE, AUDIT_OIDC_AUDIENCE);
  assert.equal(auditOidc.EXPECTED_WORKFLOW_REF, AUDIT_WORKFLOW_REF);
  assert.doesNotThrow(() => authoringOidc.verifyTrustClaims(authoringPayload, SHA));
  assert.doesNotThrow(() => auditOidc.verifyTrustClaims(auditPayload, SHA));
  assert.throws(() => authoringOidc.verifyTrustClaims(auditPayload, SHA), /GITHUB_OIDC_AUDIENCE_MISMATCH/);
  assert.throws(() => auditOidc.verifyTrustClaims(authoringPayload, SHA), /GITHUB_OIDC_AUDIENCE_MISMATCH/);
});

test("same exact-SHA audit handler returns Baseline A v2 catalogs without a second deployment", async () => {
  const client = fakeInventoryClient([ACTIVITY_A, ACTIVITY_B]);
  const handler = createAuditInventoryHandler({
    env: { VERCEL_ENV: "production", VERCEL_GIT_REPO_OWNER: "JezCH", VERCEL_GIT_REPO_SLUG: "atlas-person-db",
      VERCEL_GIT_COMMIT_REF: "main", VERCEL_GIT_COMMIT_SHA: SHA, SUPABASE_DB_URL: "postgres://example.invalid/db" },
    async verifyOidc() {}, async createClient() { return client; }
  });
  const res = responseRecorder();
  await handler({ method: "POST", headers: { authorization: "Bearer test-token" }, body: { deployment_sha: SHA, mode: "full_stage2_baseline" } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.mode, "full_stage2_baseline");
  assert.equal(res.body.read_only, true);
  assert.equal(res.body.committed, false);
  assert.equal(res.body.row_count, 2);
  assert.equal(res.body.catalogs.polities.length, 2);
  assert.match(res.body.baseline_digest, /^sha256:[0-9a-f]{64}$/);
});
