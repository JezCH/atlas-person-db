"use strict";

const {
  verifyGitHubActionsOidc
} = require("./atlas-audit-github-oidc.js");
const { createPostgresClient } = require("./atlas-postgres-client.js");
const { discoverIdentityReferences } = require("./atlas-destructive-lifecycle-service.js");
const {
  bearerToken,
  requireDeployment
} = require("./atlas-audit-inventory-handler.js");

const MARKER = "ATLAS_POLITY_REFERENCE_AUDIT_V1";
const TARGET_SCHEMA = "atlas_v2";
const TARGET_TABLE = "polities";
const TARGET_COLUMN = "id";
const OWNED_REFERENCE_KEYS = new Set([
  "atlas_v2.polity_names.polity_id",
  "atlas_v2.polity_descriptions.polity_id",
  "atlas_v2.polity_sources.polity_id"
]);

function json(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function quoteIdentifier(value) {
  const text = String(value || "");
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(text)) {
    throw new Error("POLITY_REFERENCE_AUDIT_UNSAFE_IDENTIFIER");
  }
  return `"${text}"`;
}

function referenceKey(ref) {
  return `${ref.source_schema}.${ref.source_table}.${ref.source_column}`;
}

function classifyReference(ref) {
  return OWNED_REFERENCE_KEYS.has(referenceKey(ref)) ? "owned" : "external";
}

async function beginReadOnly(client) {
  await client.query("begin isolation level repeatable read read only");
  const readOnly = await client.query("select current_setting('transaction_read_only') as read_only");
  if (readOnly.rows[0]?.read_only !== "on") throw new Error("POLITY_REFERENCE_AUDIT_TRANSACTION_NOT_READ_ONLY");
}

async function queryPolities(client) {
  const result = await client.query(`
      select p.id, p.canonical_key, p.polity_type, p.historicity,
             coalesce((select jsonb_agg(jsonb_build_object(
               'id', pn.id,
               'locale', pn.locale,
               'name', pn.name,
               'name_type', pn.name_type,
               'is_preferred', pn.is_preferred
             ) order by pn.id)
               from atlas_v2.polity_names pn
              where pn.polity_id = p.id), '[]'::jsonb) as names
        from atlas_v2.polities p
       order by p.id`);
  return result.rows;
}

async function discoverPolityReferences(client) {
  let discovered;
  try { discovered = await discoverIdentityReferences(client, {
    targetTable: TARGET_TABLE,
    targetColumn: TARGET_COLUMN,
    semanticColumnPattern: "^polity_id$"
  }); } catch (error) {
    if (error?.message === "DESTRUCTIVE_LIFECYCLE_UNSUPPORTED_FOREIGN_KEY") throw new Error("POLITY_REFERENCE_AUDIT_UNSUPPORTED_FOREIGN_KEY");
    throw error;
  }
  const catalog = discovered.map((row) => {
    const ref = {
      source_schema: String(row.source_schema),
      source_table: String(row.source_table),
      source_column: String(row.source_column),
      constraint_name: row.constraint_name == null ? null : String(row.constraint_name),
      constraint_backed: Boolean(row.constraint_backed)
    };
    ref.classification = classifyReference(ref);
    return ref;
  });
  if (!catalog.some((ref) => referenceKey(ref) === "atlas_v2.person_politics_v2.polity_id")) {
    throw new Error("POLITY_REFERENCE_AUDIT_ACTIVITY_REFERENCE_MISSING");
  }
  return catalog;
}

async function queryReferenceCounts(client, ref) {
  const schema = quoteIdentifier(ref.source_schema);
  const table = quoteIdentifier(ref.source_table);
  const column = quoteIdentifier(ref.source_column);
  const result = await client.query(`
      select ${column}::text as polity_id,
             count(*)::int as reference_count
        from ${schema}.${table}
       where ${column} is not null
       group by ${column}
       order by ${column}`);
  return result.rows.map((row) => ({
    polity_id: String(row.polity_id).toLowerCase(),
    reference_count: Number(row.reference_count || 0)
  }));
}

function referenceCountRecord(ref, count) {
  return Object.freeze({
    source_schema: ref.source_schema,
    source_table: ref.source_table,
    source_column: ref.source_column,
    constraint_name: ref.constraint_name,
    constraint_backed: ref.constraint_backed,
    count
  });
}

async function queryPolityReferenceAudit(client) {
  await beginReadOnly(client);
  try {
    const polities = await queryPolities(client);
    const references = await discoverPolityReferences(client);
    const countsByReference = new Map();

    for (const ref of references) {
      const rows = await queryReferenceCounts(client, ref);
      const byPolity = new Map();
      for (const row of rows) {
        if (byPolity.has(row.polity_id)) throw new Error("POLITY_REFERENCE_AUDIT_DUPLICATE_COUNT_ROW");
        byPolity.set(row.polity_id, row.reference_count);
      }
      countsByReference.set(referenceKey(ref), byPolity);
    }

    const polityIds = new Set(polities.map((row) => String(row.id).toLowerCase()));
    for (const [key, byPolity] of countsByReference.entries()) {
      for (const polityId of byPolity.keys()) {
        if (!polityIds.has(polityId)) {
          const error = new Error("POLITY_REFERENCE_AUDIT_DANGLING_REFERENCE");
          error.reference_key = key;
          error.polity_id = polityId;
          throw error;
        }
      }
    }

    const outputPolities = polities.map((row) => {
      const polityId = String(row.id).toLowerCase();
      const ownedReferences = [];
      const externalReferences = [];
      let ownedTotal = 0;
      let externalTotal = 0;
      for (const ref of references) {
        const count = Number(countsByReference.get(referenceKey(ref))?.get(polityId) || 0);
        const record = referenceCountRecord(ref, count);
        if (ref.classification === "owned") {
          ownedReferences.push(record);
          ownedTotal += count;
        } else {
          externalReferences.push(record);
          externalTotal += count;
        }
      }
      return Object.freeze({
        polity_id: polityId,
        canonical_key: row.canonical_key,
        polity_type: row.polity_type,
        historicity: row.historicity,
        names: Array.isArray(row.names) ? row.names : [],
        owned_reference_total: ownedTotal,
        external_reference_total: externalTotal,
        is_external_orphan: externalTotal === 0,
        owned_references: Object.freeze(ownedReferences),
        external_references: Object.freeze(externalReferences)
      });
    });

    await client.query("commit");
    return Object.freeze({
      complete: true,
      reference_model: "direct_foreign_keys_plus_atlas_v2_polity_id_columns",
      reference_catalog: Object.freeze(references.map((ref) => Object.freeze({ ...ref }))),
      polities: Object.freeze(outputPolities)
    });
  } catch (error) {
    try { await client.query("rollback"); } catch {}
    throw error;
  }
}

function statusForError(code) {
  if (code === "DEPLOYMENT_SHA_MISMATCH") return 409;
  if (code === "GITHUB_OIDC_INVALID" || String(code).startsWith("GITHUB_OIDC_")) return 401;
  if (String(code).startsWith("POLITY_REFERENCE_AUDIT_")) return 409;
  if (String(code).startsWith("AUDIT_INVENTORY_DEPLOYMENT_") || code === "AUDIT_INVENTORY_NOT_PRODUCTION") return 403;
  if (code === "SERVER_CONFIGURATION_ERROR") return 503;
  return 500;
}

function createPolityReferenceAuditHandler({ env = process.env, verifyOidc = verifyGitHubActionsOidc, createClient = createPostgresClient } = {}) {
  return async function handler(req, res) {
    if (req.method !== "POST") return json(res, 405, { ok: false, marker: MARKER, code: "METHOD_NOT_ALLOWED" });
    let client = null;
    try {
      const token = bearerToken(req);
      if (!token) throw new Error("GITHUB_OIDC_INVALID");
      const deployment = requireDeployment(req, env);
      await verifyOidc(token, { expectedSha: deployment.actualSha });
      const connectionString = String(env.SUPABASE_DB_URL || "").trim();
      if (!connectionString) throw new Error("SERVER_CONFIGURATION_ERROR");
      client = await createClient(connectionString, { env });
      const audit = await queryPolityReferenceAudit(client);
      return json(res, 200, {
        ok: true,
        marker: MARKER,
        read_only: true,
        committed: false,
        deployment_sha: deployment.actualSha,
        complete: audit.complete,
        reference_model: audit.reference_model,
        reference_count: audit.reference_catalog.length,
        polity_count: audit.polities.length,
        external_orphan_count: audit.polities.filter((row) => row.is_external_orphan).length,
        reference_catalog: audit.reference_catalog,
        polities: audit.polities
      });
    } catch (error) {
      return json(res, statusForError(error?.message), {
        ok: false,
        marker: MARKER,
        complete: false,
        code: error?.message || "POLITY_REFERENCE_AUDIT_FAILED"
      });
    } finally {
      if (client) { try { await client.end(); } catch {} }
    }
  };
}

module.exports = Object.freeze({
  MARKER,
  OWNED_REFERENCE_KEYS,
  quoteIdentifier,
  referenceKey,
  classifyReference,
  discoverPolityReferences,
  queryReferenceCounts,
  queryPolityReferenceAudit,
  createPolityReferenceAuditHandler,
  statusForError
});
