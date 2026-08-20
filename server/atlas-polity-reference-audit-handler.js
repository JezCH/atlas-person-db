"use strict";

const {
  verifyGitHubActionsOidc
} = require("./atlas-audit-github-oidc.js");
const { createPostgresClient } = require("./atlas-postgres-client.js");
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
  const fkResult = await client.query(`
      select src_ns.nspname as source_schema,
             src.relname as source_table,
             src_att.attname as source_column,
             con.conname as constraint_name,
             tgt_att.attname as target_column,
             array_length(con.conkey, 1)::int as source_key_count,
             array_length(con.confkey, 1)::int as target_key_count
        from pg_constraint con
        join pg_class src on src.oid = con.conrelid
        join pg_namespace src_ns on src_ns.oid = src.relnamespace
        join pg_class tgt on tgt.oid = con.confrelid
        join pg_namespace tgt_ns on tgt_ns.oid = tgt.relnamespace
        join lateral unnest(con.conkey) with ordinality src_key(attnum, ord) on true
        join lateral unnest(con.confkey) with ordinality tgt_key(attnum, ord) on tgt_key.ord = src_key.ord
        join pg_attribute src_att on src_att.attrelid = src.oid and src_att.attnum = src_key.attnum
        join pg_attribute tgt_att on tgt_att.attrelid = tgt.oid and tgt_att.attnum = tgt_key.attnum
       where con.contype = 'f'
         and tgt_ns.nspname = $1
         and tgt.relname = $2
       order by src_ns.nspname, src.relname, src_att.attname, con.conname`, [TARGET_SCHEMA, TARGET_TABLE]);

  const semanticResult = await client.query(`
      select c.table_schema as source_schema,
             c.table_name as source_table,
             c.column_name as source_column
        from information_schema.columns c
        join information_schema.tables t
          on t.table_schema = c.table_schema
         and t.table_name = c.table_name
       where c.table_schema = $1
         and c.column_name = 'polity_id'
         and t.table_type = 'BASE TABLE'
       order by c.table_schema, c.table_name, c.column_name`, [TARGET_SCHEMA]);

  const references = new Map();
  for (const row of fkResult.rows) {
    if (Number(row.source_key_count) !== 1 || Number(row.target_key_count) !== 1 || row.target_column !== TARGET_COLUMN) {
      const error = new Error("POLITY_REFERENCE_AUDIT_UNSUPPORTED_FOREIGN_KEY");
      error.reference = row;
      throw error;
    }
    const ref = {
      source_schema: String(row.source_schema),
      source_table: String(row.source_table),
      source_column: String(row.source_column),
      constraint_name: String(row.constraint_name),
      constraint_backed: true
    };
    ref.classification = classifyReference(ref);
    references.set(referenceKey(ref), ref);
  }

  for (const row of semanticResult.rows) {
    const key = `${row.source_schema}.${row.source_table}.${row.source_column}`;
    if (references.has(key)) continue;
    const ref = {
      source_schema: String(row.source_schema),
      source_table: String(row.source_table),
      source_column: String(row.source_column),
      constraint_name: null,
      constraint_backed: false
    };
    ref.classification = classifyReference(ref);
    references.set(key, ref);
  }

  const catalog = [...references.values()].sort((a, b) => referenceKey(a).localeCompare(referenceKey(b)));
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
