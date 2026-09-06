"use strict";

const crypto = require("node:crypto");

const COMPILER_VERSION = "runtime-person-politics-v1";
const LOCK_KEY = "atlas-runtime:person-politics-v1:compile";

const AUTHORING_SNAPSHOT_SQL = `
select
  pp.id::text, pp.person_id::text, pp.polity_id::text, pp.relation_type_id::text,
  pp.role_id::text, pp.period_basis_id::text,
  pp.activity_start, pp.activity_start_month, pp.activity_start_day,
  pp.activity_start_granularity, pp.activity_start_certainty, pp.activity_start_calendar,
  pp.activity_end, pp.activity_end_month, pp.activity_end_day,
  pp.activity_end_granularity, pp.activity_end_certainty, pp.activity_end_calendar,
  pp.confidence, pp.chronology_status, pp.legacy_source_key, pp.notes,
  pp.source_locator, pp.content_hash,
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'source_id', s.id::text,
        'source_key', s.source_key,
        'source_type', s.source_type,
        'title', s.title,
        'canonical_url', s.canonical_url,
        'citation_text', s.citation_text,
        'source_locator_key', pps.source_locator_key
      ) order by s.id::text, pps.source_locator_key
    )
      from atlas_v2.person_politics_sources pps
      join atlas_v2.sources s on s.id=pps.source_id
     where pps.person_politics_id=pp.id
  ), '[]'::jsonb) as normalized_sources
from atlas_v2.person_politics_v2 pp
order by pp.id::text`;

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    const result = {};
    for (const key of Object.keys(value).sort()) result[key] = stableValue(value[key]);
    return result;
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function sha256(value) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

function hasKnownBoundary(row, prefix) {
  if (row?.[prefix] == null) return false;
  if (!row?.[`${prefix}_granularity`] || !row?.[`${prefix}_certainty`] || !row?.[`${prefix}_calendar`]) return false;
  return true;
}

function hasLegacyProvenance(row) {
  const key = String(row?.legacy_source_key || "").trim();
  const locator = row?.source_locator;
  return Boolean(key && locator && typeof locator === "object" && !Array.isArray(locator) && Object.keys(locator).length);
}

function normalizedSources(row) {
  return Array.isArray(row?.normalized_sources) ? row.normalized_sources : [];
}

function classifyReadiness(row) {
  if (!row?.relation_type_id) return Object.freeze({ ready:false, code:"RELATION_TYPE_UNRESOLVED" });
  if (!hasKnownBoundary(row, "activity_start")) return Object.freeze({ ready:false, code:"START_BOUNDARY_UNRESOLVED" });

  if (row?.chronology_status === "ongoing") {
    const asOf = row?.source_locator?.ongoing_as_of;
    if (row.activity_end != null || !/^\d{4}-\d{2}-\d{2}$/.test(String(asOf || ""))) {
      return Object.freeze({ ready:false, code:"ONGOING_VERIFICATION_UNRESOLVED" });
    }
  } else if (!hasKnownBoundary(row, "activity_end")) {
    return Object.freeze({ ready:false, code:"END_BOUNDARY_UNRESOLVED" });
  }

  if (!normalizedSources(row).length && !hasLegacyProvenance(row)) {
    return Object.freeze({ ready:false, code:"PROVENANCE_UNRESOLVED" });
  }
  return Object.freeze({ ready:true, code:null });
}

function provenanceSnapshot(row) {
  const sources = normalizedSources(row).map((source) => stableValue(source));
  return Object.freeze({
    basis: sources.length ? "normalized_source_link" : "legacy_import_source_with_locator",
    normalized_sources: Object.freeze(sources),
    legacy_source_key: row?.legacy_source_key == null ? null : String(row.legacy_source_key),
    source_locator: stableValue(row?.source_locator || {})
  });
}

function runtimeRow(row) {
  return Object.freeze({
    id:String(row.id), person_id:String(row.person_id), polity_id:String(row.polity_id),
    relation_type_id:String(row.relation_type_id), role_id:row.role_id == null ? null : String(row.role_id),
    period_basis_id:String(row.period_basis_id),
    activity_start:Number(row.activity_start),
    activity_start_month:row.activity_start_month == null ? null : Number(row.activity_start_month),
    activity_start_day:row.activity_start_day == null ? null : Number(row.activity_start_day),
    activity_start_granularity:String(row.activity_start_granularity),
    activity_start_certainty:String(row.activity_start_certainty),
    activity_start_calendar:String(row.activity_start_calendar),
    activity_end:row.activity_end == null ? null : Number(row.activity_end),
    activity_end_month:row.activity_end_month == null ? null : Number(row.activity_end_month),
    activity_end_day:row.activity_end_day == null ? null : Number(row.activity_end_day),
    activity_end_granularity:row.activity_end_granularity == null ? null : String(row.activity_end_granularity),
    activity_end_certainty:row.activity_end_certainty == null ? null : String(row.activity_end_certainty),
    activity_end_calendar:row.activity_end_calendar == null ? null : String(row.activity_end_calendar),
    confidence:String(row.confidence), chronology_status:String(row.chronology_status),
    notes:row.notes == null ? null : String(row.notes),
    source_locator:stableValue(row.source_locator || {}), content_hash:String(row.content_hash),
    provenance_snapshot:provenanceSnapshot(row)
  });
}

function compileSnapshot(authoringRows) {
  const input = (Array.isArray(authoringRows) ? authoringRows : []).map((row) => stableValue(row));
  const inputFingerprint = sha256(input);
  const ready = [];
  const exclusionSummary = {};
  for (const row of input) {
    const readiness = classifyReadiness(row);
    if (readiness.ready) ready.push(runtimeRow(row));
    else exclusionSummary[readiness.code] = (exclusionSummary[readiness.code] || 0) + 1;
  }
  ready.sort((a,b) => a.id.localeCompare(b.id));
  const outputFingerprint = sha256(ready);
  return Object.freeze({
    compiler_version:COMPILER_VERSION,
    compile_key:`${COMPILER_VERSION}:${inputFingerprint}`,
    input_fingerprint:inputFingerprint,
    output_fingerprint:outputFingerprint,
    input_row_count:input.length,
    output_row_count:ready.length,
    excluded_row_count:input.length-ready.length,
    exclusion_summary:Object.freeze(stableValue(exclusionSummary)),
    rows:Object.freeze(ready)
  });
}

async function ensureCompileRun(client, compiled) {
  const inserted = await client.query(`
    insert into atlas_v2.runtime_compile_runs(
      compile_key,compiler_version,input_fingerprint,output_fingerprint,
      input_row_count,output_row_count,excluded_row_count,exclusion_summary
    ) values($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
    on conflict (compile_key) do nothing`, [
      compiled.compile_key, compiled.compiler_version, compiled.input_fingerprint, compiled.output_fingerprint,
      compiled.input_row_count, compiled.output_row_count, compiled.excluded_row_count,
      JSON.stringify(compiled.exclusion_summary)
    ]);
  if (inserted.rowCount) return false;
  const existing = await client.query(`
    select compiler_version,input_fingerprint,output_fingerprint,input_row_count,output_row_count,excluded_row_count,exclusion_summary
      from atlas_v2.runtime_compile_runs where compile_key=$1`, [compiled.compile_key]);
  const row = existing.rows[0];
  if (!row
    || String(row.compiler_version) !== compiled.compiler_version
    || String(row.input_fingerprint) !== compiled.input_fingerprint
    || String(row.output_fingerprint) !== compiled.output_fingerprint
    || Number(row.input_row_count) !== compiled.input_row_count
    || Number(row.output_row_count) !== compiled.output_row_count
    || Number(row.excluded_row_count) !== compiled.excluded_row_count
    || stableJson(row.exclusion_summary) !== stableJson(compiled.exclusion_summary)) {
    throw new Error("RUNTIME_COMPILE_LEDGER_DRIFT");
  }
  return true;
}

async function insertRuntimeRow(client, compileKey, row) {
  await client.query(`
    insert into atlas_v2.runtime_person_politics_v1(
      id,compile_key,person_id,polity_id,relation_type_id,role_id,period_basis_id,
      activity_start,activity_start_month,activity_start_day,activity_start_granularity,activity_start_certainty,activity_start_calendar,
      activity_end,activity_end_month,activity_end_day,activity_end_granularity,activity_end_certainty,activity_end_calendar,
      confidence,chronology_status,notes,source_locator,content_hash,provenance_snapshot
    ) values(
      $1::uuid,$2,$3::uuid,$4::uuid,$5::uuid,$6::uuid,$7::uuid,
      $8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23::jsonb,$24,$25::jsonb
    )`, [
      row.id,compileKey,row.person_id,row.polity_id,row.relation_type_id,row.role_id,row.period_basis_id,
      row.activity_start,row.activity_start_month,row.activity_start_day,row.activity_start_granularity,row.activity_start_certainty,row.activity_start_calendar,
      row.activity_end,row.activity_end_month,row.activity_end_day,row.activity_end_granularity,row.activity_end_certainty,row.activity_end_calendar,
      row.confidence,row.chronology_status,row.notes,JSON.stringify(row.source_locator),row.content_hash,JSON.stringify(row.provenance_snapshot)
    ]);
}

async function compileRuntimeProjection(client, { dryRun=false } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  await client.query("begin isolation level serializable");
  try {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [LOCK_KEY]);
    const source = await client.query(AUTHORING_SNAPSHOT_SQL);
    const compiled = compileSnapshot(source.rows || []);
    const ledgerReplay = await ensureCompileRun(client, compiled);
    await client.query("delete from atlas_v2.runtime_person_politics_v1");
    for (const row of compiled.rows) await insertRuntimeRow(client, compiled.compile_key, row);
    const verify = await client.query(`
      select count(*)::int as row_count,
             count(distinct compile_key)::int as compile_count,
             min(compile_key) as compile_key
        from atlas_v2.runtime_person_politics_v1`);
    if (Number(verify.rows[0]?.row_count || 0) !== compiled.output_row_count
      || (compiled.output_row_count > 0 && (Number(verify.rows[0]?.compile_count || 0) !== 1 || verify.rows[0]?.compile_key !== compiled.compile_key))) {
      throw new Error("RUNTIME_COMPILE_POSTCONDITION_FAILED");
    }
    if (dryRun) await client.query("rollback"); else await client.query("commit");
    return Object.freeze({
      marker:"ATLAS_RUNTIME_PERSON_POLITICS_COMPILE_V1",
      dry_run:Boolean(dryRun), committed:!dryRun, ledger_replay:ledgerReplay,
      compile_key:compiled.compile_key,
      input_fingerprint:compiled.input_fingerprint,
      output_fingerprint:compiled.output_fingerprint,
      input_row_count:compiled.input_row_count,
      output_row_count:compiled.output_row_count,
      excluded_row_count:compiled.excluded_row_count,
      exclusion_summary:compiled.exclusion_summary
    });
  } catch (error) {
    try { await client.query("rollback"); } catch {}
    throw error;
  }
}

module.exports = Object.freeze({
  COMPILER_VERSION, LOCK_KEY, AUTHORING_SNAPSHOT_SQL,
  stableJson, sha256, hasKnownBoundary, hasLegacyProvenance,
  classifyReadiness, provenanceSnapshot, runtimeRow, compileSnapshot,
  compileRuntimeProjection
});
