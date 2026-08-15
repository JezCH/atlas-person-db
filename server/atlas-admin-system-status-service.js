"use strict";

const { inspectAuthoringReadiness } = require("./atlas-authoring-readiness.js");
const { SEMANTIC_KEY_VERSION } = require("./atlas-activity-semantic-key-v2.js");
const { DETECTOR_VERSION, REVALIDATION_SEMANTIC_VERSION } = require("./atlas-duplicate-detector.js");
const { personMergeExecutionState } = require("./atlas-person-merge-interlock.js");

const SYSTEM_STATUS_SCHEMA = "atlas-admin-system-status/v1";

function optionalText(value) {
  const text = String(value || "").trim();
  return text || null;
}

function configured(env, name) {
  return optionalText(env?.[name]) !== null;
}

function runtimeIdentity(env = process.env) {
  const vercel = configured(env, "VERCEL");
  return Object.freeze({
    provider: vercel ? "vercel" : "unknown",
    environment: optionalText(env?.VERCEL_ENV) || optionalText(env?.NODE_ENV),
    deployment_url: optionalText(env?.VERCEL_URL),
    git_commit_sha: optionalText(env?.VERCEL_GIT_COMMIT_SHA),
    git_commit_ref: optionalText(env?.VERCEL_GIT_COMMIT_REF),
    region: optionalText(env?.VERCEL_REGION)
  });
}

function configurationStatus(env = process.env) {
  const dedicatedSessionSecret = configured(env, "ATLAS_SESSION_SECRET");
  const mutationToken = configured(env, "ATLAS_MUTATION_TOKEN");
  return Object.freeze({
    database: Object.freeze({
      configured: configured(env, "SUPABASE_DB_URL"),
      verified_ca_configured: configured(env, "SUPABASE_DB_CA")
    }),
    admin_authentication: Object.freeze({
      password_configured: configured(env, "ATLAS_ADMIN_PASSWORD"),
      dedicated_session_secret_configured: dedicatedSessionSecret,
      mutation_token_configured: mutationToken,
      session_signing_available: dedicatedSessionSecret || mutationToken
    })
  });
}

function safeError(error, fallbackCode) {
  const raw = optionalText(error?.code);
  return Object.freeze({ code: raw || fallbackCode });
}

async function guarded(check, fallbackCode) {
  try {
    return Object.freeze({ available: true, value: await check() });
  } catch (error) {
    return Object.freeze({ available: false, error: safeError(error, fallbackCode) });
  }
}

async function listAtlasTables(client) {
  const result = await client.query(`
    select c.relname::text as table_name
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'atlas_v2'
       and c.relkind in ('r','p')
     order by c.relname
  `);
  return (result.rows || []).map((row) => String(row.table_name));
}

function quoteIdentifier(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

async function exactTableCounts(client, tableNames) {
  const counts = {};
  for (const tableName of tableNames || []) {
    const result = await client.query(`select count(*)::bigint as count from atlas_v2.${quoteIdentifier(tableName)}`);
    const raw = result.rows?.[0]?.count;
    const count = Number(raw);
    counts[tableName] = Number.isSafeInteger(count) ? count : String(raw ?? "0");
  }
  return Object.freeze(counts);
}

async function databaseIdentity(client) {
  const result = await client.query(`
    select
      current_setting('server_version')::text as server_version,
      exists(select 1 from pg_namespace where nspname='atlas_v2') as atlas_v2_schema_present
  `);
  const row = result.rows?.[0] || {};
  return Object.freeze({
    reachable: true,
    server_version: row.server_version == null ? null : String(row.server_version),
    atlas_v2_schema_present: row.atlas_v2_schema_present === true
  });
}

async function migrationIdentity(client, tables) {
  if (!tables.includes("migration_metadata")) return null;
  const result = await client.query(`
    select phase, phase4_closing_sha, phase4_artifact_digest,
           schema_bundle_sha256, data_bundle_sha256, expected_counts, applied_at
      from atlas_v2.migration_metadata
     order by applied_at desc
     limit 1
  `);
  if (!result.rowCount) return null;
  const row = result.rows[0];
  return Object.freeze({
    phase: row.phase == null ? null : Number(row.phase),
    phase4_closing_sha: row.phase4_closing_sha == null ? null : String(row.phase4_closing_sha),
    phase4_artifact_digest: row.phase4_artifact_digest == null ? null : String(row.phase4_artifact_digest),
    schema_bundle_sha256: row.schema_bundle_sha256 == null ? null : String(row.schema_bundle_sha256),
    data_bundle_sha256: row.data_bundle_sha256 == null ? null : String(row.data_bundle_sha256),
    expected_counts: row.expected_counts && typeof row.expected_counts === "object" ? row.expected_counts : null,
    applied_at: row.applied_at ?? null
  });
}

function emptyDuplicateSummary() {
  return {
    active: 0,
    stale: 0,
    open: 0,
    merge: 0,
    keep_separate: 0,
    review: 0
  };
}

async function duplicateLifecycle(client, tables) {
  if (!tables.includes("person_duplicate_candidates")) {
    return Object.freeze({ available: false, reason: "CANDIDATE_TABLE_NOT_PRESENT" });
  }

  const candidateResult = await client.query(`
    select
      count(*) filter (where candidate_state='ACTIVE')::int as active,
      count(*) filter (where candidate_state='STALE')::int as stale,
      count(*) filter (where candidate_state='ACTIVE' and current_decision is null)::int as open,
      count(*) filter (where candidate_state='ACTIVE' and current_decision='MERGE')::int as merge,
      count(*) filter (where candidate_state='ACTIVE' and current_decision='KEEP_SEPARATE')::int as keep_separate,
      count(*) filter (where candidate_state='ACTIVE' and current_decision='REVIEW')::int as review,
      array_remove(array_agg(distinct detector_version order by detector_version), null) as detector_versions,
      max(updated_at) as last_candidate_update_at
    from atlas_v2.person_duplicate_candidates
  `);
  const row = candidateResult.rows?.[0] || {};
  const summary = emptyDuplicateSummary();
  for (const key of Object.keys(summary)) summary[key] = Number(row[key] || 0);

  let reviews = null;
  if (tables.includes("person_duplicate_reviews")) {
    const result = await client.query(`select count(*)::int as total, max(reviewed_at) as latest_reviewed_at from atlas_v2.person_duplicate_reviews`);
    reviews = Object.freeze({
      total: Number(result.rows?.[0]?.total || 0),
      latest_reviewed_at: result.rows?.[0]?.latest_reviewed_at ?? null
    });
  }

  let mergeAudits = null;
  if (tables.includes("person_merge_audits")) {
    const result = await client.query(`select count(*)::int as total, max(merged_at) as latest_merged_at from atlas_v2.person_merge_audits`);
    mergeAudits = Object.freeze({
      total: Number(result.rows?.[0]?.total || 0),
      latest_merged_at: result.rows?.[0]?.latest_merged_at ?? null
    });
  }

  let requirements = null;
  if (tables.includes("person_duplicate_revalidation_requirements")) {
    const result = await client.query(`
      select
        count(*) filter (where requirement_state='ACTIVE')::int as active,
        count(*) filter (where requirement_state='RETIRED')::int as retired,
        array_remove(array_agg(distinct requirement_version order by requirement_version), null) as requirement_versions
      from atlas_v2.person_duplicate_revalidation_requirements
    `);
    requirements = Object.freeze({
      active: Number(result.rows?.[0]?.active || 0),
      retired: Number(result.rows?.[0]?.retired || 0),
      requirement_versions: Array.isArray(result.rows?.[0]?.requirement_versions)
        ? result.rows[0].requirement_versions.map(String)
        : []
    });
  }

  return Object.freeze({
    available: true,
    summary: Object.freeze(summary),
    detector_versions_observed: Array.isArray(row.detector_versions) ? row.detector_versions.map(String) : [],
    last_candidate_update_at: row.last_candidate_update_at ?? null,
    reviews,
    merge_audits: mergeAudits,
    revalidation_requirements: requirements
  });
}

function optionalReadinessModule() {
  try {
    return require("./atlas-person-duplicate-revalidation-readiness.js");
  } catch (error) {
    if (error?.code === "MODULE_NOT_FOUND" && /atlas-person-duplicate-revalidation-readiness/.test(String(error?.message || ""))) return null;
    throw error;
  }
}

async function inspectAdminSystemStatus({ client, env = process.env } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");

  const db = await databaseIdentity(client);
  const tables = db.atlas_v2_schema_present ? await listAtlasTables(client) : [];
  const tableCounts = db.atlas_v2_schema_present ? await exactTableCounts(client, tables) : Object.freeze({});
  const migration = db.atlas_v2_schema_present ? await guarded(() => migrationIdentity(client, tables), "MIGRATION_IDENTITY_CHECK_FAILED") : Object.freeze({ available: false, error: { code: "ATLAS_V2_SCHEMA_MISSING" } });
  const authoring = db.atlas_v2_schema_present ? await guarded(() => inspectAuthoringReadiness(client), "AUTHORING_READINESS_CHECK_FAILED") : Object.freeze({ available: false, error: { code: "ATLAS_V2_SCHEMA_MISSING" } });
  const duplicates = db.atlas_v2_schema_present ? await guarded(() => duplicateLifecycle(client, tables), "DUPLICATE_STATUS_CHECK_FAILED") : Object.freeze({ available: false, error: { code: "ATLAS_V2_SCHEMA_MISSING" } });

  const p10Module = optionalReadinessModule();
  const p10Revalidation = !p10Module?.inspectPersonDuplicateRevalidationReadiness
    ? Object.freeze({ available: false, reason: "P10_REVALIDATION_READINESS_MODULE_NOT_PRESENT" })
    : await guarded(() => p10Module.inspectPersonDuplicateRevalidationReadiness(client), "P10_REVALIDATION_READINESS_CHECK_FAILED");

  return Object.freeze({
    schema: SYSTEM_STATUS_SCHEMA,
    runtime: runtimeIdentity(env),
    configuration: configurationStatus(env),
    database: db,
    migration,
    semantics: Object.freeze({
      activity_semantic_key_version: SEMANTIC_KEY_VERSION,
      duplicate_detector_version: DETECTOR_VERSION,
      duplicate_revalidation_semantic_version: REVALIDATION_SEMANTIC_VERSION,
      person_merge: personMergeExecutionState()
    }),
    counts: Object.freeze({
      atlas_v2_table_count: tables.length,
      tables: tableCounts
    }),
    readiness: Object.freeze({
      authoring,
      p10_duplicate_revalidation: p10Revalidation
    }),
    duplicate_lifecycle: duplicates,
    verification: Object.freeze({
      github_actions_status_embedded: false,
      reason: "GITHUB_ACTIONS_IS_EXTERNAL_TO_RUNTIME"
    })
  });
}

module.exports = Object.freeze({
  SYSTEM_STATUS_SCHEMA,
  optionalText,
  configured,
  runtimeIdentity,
  configurationStatus,
  safeError,
  guarded,
  listAtlasTables,
  quoteIdentifier,
  exactTableCounts,
  databaseIdentity,
  migrationIdentity,
  duplicateLifecycle,
  optionalReadinessModule,
  inspectAdminSystemStatus
});
