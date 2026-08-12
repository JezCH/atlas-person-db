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
  queryFullActivityBaseline
} = require("../server/atlas-audit-inventory-handler.js");
const authoringOidc = require("../server/atlas-github-oidc.js");
const auditOidc = require("../server/atlas-audit-github-oidc.js");

const ACTIVITY_A = "75a124e8-df55-5247-aa48-dc9d7934c10e";
const ACTIVITY_B = "da809f25-40ff-5c27-b10b-88d4acc4070d";
const SHA = "a".repeat(40);

function trustPayload({ audience, workflowRef } = {}) {
  return {
    iss: authoringOidc.ISSUER,
    aud: audience,
    repository: authoringOidc.EXPECTED_REPOSITORY,
    repository_id: authoringOidc.EXPECTED_REPOSITORY_ID,
    ref: authoringOidc.EXPECTED_REF,
    workflow_ref: workflowRef,
    environment: "production",
    event_name: "push",
    sha: SHA
  };
}

function fakeInventoryClient(ids) {
  const statements = [];
  const rows = ids.map((id, index) => ({
    activity_id: id,
    person_id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    polity_id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    role_id: null,
    period_basis_id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    activity_start: 1,
    activity_end: 2,
    period_basis: "reign",
    source_count: 1,
    chronology_claim_count: 0,
    description_count: 0
  }));
  return {
    statements,
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
      if (text.startsWith("select (select count(*)::int from atlas_v2.persons) as persons")) {
        return {
          rows: [{
            persons: 2,
            polities: 2,
            roles: 1,
            period_bases: 1,
            activities: rows.length,
            activity_source_links: rows.length,
            chronology_claims: 0,
            relationship_descriptions: 0
          }]
        };
      }
      if (text === "commit" || text === "rollback") return { rows: [] };
      throw new Error(`unexpected SQL: ${sql}`);
    },
    async end() {}
  };
}

function responseRecorder() {
  return {
    statusCode: null,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; },
    end(value) { this.body = JSON.parse(String(value)); }
  };
}

test("audit inventory UUID contract is bounded, exact, and deterministic", () => {
  assert.deepEqual(normalizeActivityIds([ACTIVITY_B, ACTIVITY_A, ACTIVITY_A]), [ACTIVITY_A, ACTIVITY_B]);
  assert.throws(() => normalizeActivityIds([]), /AUDIT_ACTIVITY_IDS_REQUIRED/);
  assert.throws(() => normalizeActivityIds(["not-a-uuid"]), /AUDIT_ACTIVITY_ID_INVALID/);
  assert.throws(() => normalizeActivityIds(Array.from({ length: 101 }, () => ACTIVITY_A)), /AUDIT_ACTIVITY_IDS_LIMIT_EXCEEDED/);
  assert.equal(normalizeMode(undefined), "targeted");
  assert.equal(normalizeMode("full_activity_baseline"), "full_activity_baseline");
  assert.throws(() => normalizeMode("write_baseline"), /AUDIT_MODE_INVALID/);
});

test("audit inventory database primitive starts a READ ONLY transaction and contains no data mutation SQL", async () => {
  const client = fakeInventoryClient([ACTIVITY_A, ACTIVITY_B]);
  const rows = await queryInventory(client, [ACTIVITY_A, ACTIVITY_B]);
  assert.equal(rows.length, 2);
  assert.match(client.statements[0].sql, /repeatable read read only/i);
  for (const { sql } of client.statements) {
    assert.doesNotMatch(sql, /\b(insert|update|delete|alter|drop|create|truncate|grant|revoke)\b/i);
  }
  assert.equal(client.statements.at(-1).sql.trim().toLowerCase(), "commit");
});

test("audit inventory fails closed when any reviewed Activity UUID is missing", async () => {
  const client = fakeInventoryClient([ACTIVITY_A]);
  await assert.rejects(
    () => queryInventory(client, [ACTIVITY_A, ACTIVITY_B]),
    (error) => error?.message === "AUDIT_INVENTORY_TARGET_MISSING" && error?.missing_activity_ids?.[0] === ACTIVITY_B
  );
  assert.equal(client.statements.at(-1).sql.trim().toLowerCase(), "rollback");
});

test("full Activity baseline is captured in one repeatable-read read-only transaction", async () => {
  const client = fakeInventoryClient([ACTIVITY_A, ACTIVITY_B]);
  const baseline = await queryFullActivityBaseline(client);
  assert.equal(baseline.rows.length, 2);
  assert.equal(baseline.counts.activities, 2);
  assert.match(baseline.baseline_digest, /^sha256:[0-9a-f]{64}$/);
  assert.match(client.statements[0].sql, /repeatable read read only/i);
  for (const { sql } of client.statements) {
    assert.doesNotMatch(sql, /\b(insert|update|delete|alter|drop|create|truncate|grant|revoke)\b/i);
  }
  assert.equal(client.statements.at(-1).sql.trim().toLowerCase(), "commit");
});

test("authoring and audit OIDC trust boundaries are separate and mutually reject each other", () => {
  const authoringPayload = trustPayload({
    audience: authoringOidc.EXPECTED_AUDIENCE,
    workflowRef: authoringOidc.EXPECTED_WORKFLOW_REF
  });
  const auditPayload = trustPayload({
    audience: auditOidc.EXPECTED_AUDIENCE,
    workflowRef: auditOidc.EXPECTED_WORKFLOW_REF
  });

  assert.equal(auditOidc.EXPECTED_AUDIENCE, AUDIT_OIDC_AUDIENCE);
  assert.equal(auditOidc.EXPECTED_WORKFLOW_REF, AUDIT_WORKFLOW_REF);
  assert.doesNotThrow(() => authoringOidc.verifyTrustClaims(authoringPayload, SHA));
  assert.doesNotThrow(() => auditOidc.verifyTrustClaims(auditPayload, SHA));
  assert.throws(() => authoringOidc.verifyTrustClaims(auditPayload, SHA), /GITHUB_OIDC_AUDIENCE_MISMATCH/);
  assert.throws(() => auditOidc.verifyTrustClaims(authoringPayload, SHA), /GITHUB_OIDC_AUDIENCE_MISMATCH/);
});

test("audit handler pins exact Production SHA before its isolated audit OIDC verifier and DB access", async () => {
  const calls = [];
  const client = fakeInventoryClient([ACTIVITY_A]);
  const handler = createAuditInventoryHandler({
    env: {
      VERCEL_ENV: "production",
      VERCEL_GIT_REPO_OWNER: "JezCH",
      VERCEL_GIT_REPO_SLUG: "atlas-person-db",
      VERCEL_GIT_COMMIT_REF: "main",
      VERCEL_GIT_COMMIT_SHA: SHA,
      SUPABASE_DB_URL: "postgres://example.invalid/db"
    },
    async verifyOidc(token, options) {
      calls.push({ token, options });
      assert.equal(options.expectedSha, SHA);
      assert.deepEqual(Object.keys(options), ["expectedSha"]);
    },
    async createClient(connectionString) {
      calls.push({ connectionString });
      return client;
    }
  });

  const req = {
    method: "POST",
    headers: { authorization: "Bearer test-token" },
    body: { deployment_sha: SHA, activity_ids: [ACTIVITY_A] }
  };
  const res = responseRecorder();
  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.mode, "targeted");
  assert.equal(res.body.read_only, true);
  assert.equal(res.body.committed, false);
  assert.equal(res.body.row_count, 1);
  assert.equal(calls[0].token, "test-token");
  assert.equal(calls[1].connectionString, "postgres://example.invalid/db");
});

test("same exact-SHA audit handler can capture Baseline A without a second Vercel deployment", async () => {
  const client = fakeInventoryClient([ACTIVITY_A, ACTIVITY_B]);
  const handler = createAuditInventoryHandler({
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
  await handler({
    method: "POST",
    headers: { authorization: "Bearer test-token" },
    body: { deployment_sha: SHA, mode: "full_activity_baseline" }
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.mode, "full_activity_baseline");
  assert.equal(res.body.read_only, true);
  assert.equal(res.body.committed, false);
  assert.equal(res.body.row_count, 2);
  assert.equal(res.body.counts.activities, 2);
  assert.match(res.body.baseline_digest, /^sha256:[0-9a-f]{64}$/);
});