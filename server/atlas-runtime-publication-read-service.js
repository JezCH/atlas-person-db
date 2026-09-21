"use strict";

const RUNTIME_PUBLICATION_SCHEMA = "atlas-runtime-publication/v1";
const RUNTIME_ACTIVATION_PROJECTION = "runtime_person_politics_v1";

function normalizeActivationCompile(row) {
  const exclusionSummary = row?.exclusion_summary && typeof row.exclusion_summary === "object" && !Array.isArray(row.exclusion_summary)
    ? Object.fromEntries(Object.entries(row.exclusion_summary).map(([code,count]) => [String(code),Number(count || 0)]))
    : {};
  return Object.freeze({
    compiler_version:String(row?.compiler_version || ""),
    input_row_count:Number(row?.input_row_count || 0),
    output_row_count:Number(row?.output_row_count || 0),
    excluded_row_count:Number(row?.excluded_row_count || 0),
    exclusion_summary:Object.freeze(exclusionSummary),
    compiled_at:row?.compiled_at == null ? null : new Date(row.compiled_at).toISOString()
  });
}

function normalizeActivationRecord(row) {
  if (!row) return null;
  const compile=normalizeActivationCompile(row);
  const activation=Object.freeze({
    id:String(row.id || ""),
    activation_kind:String(row.activation_kind || ""),
    compile_key:String(row.compile_key || ""),
    runtime_sha:row.runtime_sha == null ? null : String(row.runtime_sha),
    authoring_sha:row.authoring_sha == null ? null : String(row.authoring_sha),
    row_count:Number(row.row_count || 0),
    activated_at:row.activated_at == null ? null : new Date(row.activated_at).toISOString(),
    compile
  });
  if (!activation.id || !activation.activation_kind || !activation.compile_key) {
    throw new Error("RUNTIME_ACTIVATION_RECORD_INVALID");
  }
  if (!Number.isInteger(activation.row_count) || activation.row_count < 0) {
    throw new Error("RUNTIME_ACTIVATION_ROW_COUNT_INVALID");
  }
  if (compile.input_row_count !== compile.output_row_count + compile.excluded_row_count) {
    throw new Error("RUNTIME_ACTIVATION_COMPILE_BALANCE_INVALID");
  }
  if (activation.row_count !== compile.output_row_count) {
    throw new Error("RUNTIME_ACTIVATION_COMPILE_OUTPUT_DRIFT");
  }
  return activation;
}

function exclusionDelta(current,previous) {
  if (!current || !previous) return null;
  const codes=new Set([
    ...Object.keys(current.compile.exclusion_summary || {}),
    ...Object.keys(previous.compile.exclusion_summary || {})
  ]);
  return Object.freeze(Object.fromEntries(
    [...codes].sort().map((code)=>[
      code,
      Number(current.compile.exclusion_summary?.[code] || 0)-Number(previous.compile.exclusion_summary?.[code] || 0)
    ])
  ));
}

async function readRuntimeActivationHistory(client,{ currentCompileKey=null, runtimeActivityCount=0 }={}) {
  const coverage=await client.query(`
    select to_regclass('atlas_v2.runtime_projection_activations') is not null as activation_history
  `);
  if (coverage.rows?.[0]?.activation_history !== true) {
    return Object.freeze({
      available:false,
      reason:"RUNTIME_ACTIVATION_LEDGER_NOT_APPLIED",
      projection_name:RUNTIME_ACTIVATION_PROJECTION,
      latest_recorded:null,
      previous_recorded:null,
      latest_matches_projection:null,
      delta_from_previous:null
    });
  }

  const result=await client.query(`
    select
      a.id::text, a.activation_kind, a.compile_key, a.runtime_sha, a.authoring_sha,
      a.row_count, a.activated_at,
      c.compiler_version, c.input_row_count, c.output_row_count, c.excluded_row_count,
      c.exclusion_summary, c.compiled_at
      from atlas_v2.runtime_projection_activations a
      join atlas_v2.runtime_compile_runs c on c.compile_key=a.compile_key
     where a.projection_name=$1
     order by a.id desc
     limit 2
  `,[RUNTIME_ACTIVATION_PROJECTION]);

  const latest=normalizeActivationRecord(result.rows?.[0] || null);
  const previous=normalizeActivationRecord(result.rows?.[1] || null);
  if (!latest) {
    return Object.freeze({
      available:false,
      reason:"RUNTIME_ACTIVATION_HISTORY_EMPTY",
      projection_name:RUNTIME_ACTIVATION_PROJECTION,
      latest_recorded:null,
      previous_recorded:null,
      latest_matches_projection:null,
      delta_from_previous:null
    });
  }

  const latestMatchesProjection = latest.row_count === runtimeActivityCount
    && (runtimeActivityCount === 0 || (currentCompileKey != null && latest.compile_key === currentCompileKey));

  const delta = previous ? Object.freeze({
    runtime_activity_count:latest.row_count-previous.row_count,
    excluded_activity_count:latest.compile.excluded_row_count-previous.compile.excluded_row_count,
    compile_key_changed:latest.compile_key !== previous.compile_key,
    exclusion_summary:exclusionDelta(latest,previous)
  }) : null;

  return Object.freeze({
    available:true,
    reason:null,
    projection_name:RUNTIME_ACTIVATION_PROJECTION,
    latest_recorded:latest,
    previous_recorded:previous,
    latest_matches_projection:latestMatchesProjection,
    delta_from_previous:delta
  });
}

async function readRuntimePublication(client) {
  const countsResult = await client.query(`
    select
      (select count(*)::int from atlas_v2.person_politics_v2) as authoring_activity_count,
      (select count(*)::int from atlas_v2.runtime_person_politics_v1) as runtime_activity_count,
      (select count(distinct compile_key)::int from atlas_v2.runtime_person_politics_v1) as runtime_compile_key_count,
      (select min(compile_key) from atlas_v2.runtime_person_politics_v1) as current_compile_key
  `);
  const counts = countsResult.rows?.[0] || {};
  const authoringActivityCount = Number(counts.authoring_activity_count || 0);
  const runtimeActivityCount = Number(counts.runtime_activity_count || 0);
  const runtimeCompileKeyCount = Number(counts.runtime_compile_key_count || 0);
  const currentCompileKey = counts.current_compile_key == null ? null : String(counts.current_compile_key);
  if (runtimeActivityCount > 0 && (runtimeCompileKeyCount !== 1 || !currentCompileKey)) {
    throw new Error("RUNTIME_PUBLICATION_PROJECTION_IDENTITY_INVALID");
  }

  let row = null;
  if (currentCompileKey) {
    const compileResult = await client.query(`
      select compiler_version, input_row_count, output_row_count, excluded_row_count,
             exclusion_summary, compiled_at
        from atlas_v2.runtime_compile_runs
       where compile_key=$1
       limit 1
    `, [currentCompileKey]);
    row = compileResult.rows?.[0] || null;
    if (!row) throw new Error("RUNTIME_PUBLICATION_COMPILE_LEDGER_MISSING");
  }

  const currentCompile = row ? Object.freeze({
    compiler_version:String(row.compiler_version || ""),
    input_row_count:Number(row.input_row_count || 0),
    output_row_count:Number(row.output_row_count || 0),
    excluded_row_count:Number(row.excluded_row_count || 0),
    exclusion_summary:Object.freeze(
      row.exclusion_summary && typeof row.exclusion_summary === "object" && !Array.isArray(row.exclusion_summary)
        ? Object.fromEntries(Object.entries(row.exclusion_summary).map(([code,count]) => [String(code),Number(count || 0)]))
        : {}
    ),
    compiled_at:row.compiled_at == null ? null : new Date(row.compiled_at).toISOString()
  }) : null;

  const activationHistory=await readRuntimeActivationHistory(client,{
    currentCompileKey,
    runtimeActivityCount
  });

  return Object.freeze({
    schema:RUNTIME_PUBLICATION_SCHEMA,
    source:"runtime-publication-ledgers",
    current_authoring_activity_count:authoringActivityCount,
    current_runtime_activity_count:runtimeActivityCount,
    active_compile:currentCompile,
    authoring_delta_since_compile:currentCompile == null ? null : authoringActivityCount-currentCompile.input_row_count,
    projection_matches_active_compile:currentCompile == null ? null : runtimeActivityCount === currentCompile.output_row_count,
    activation_history:activationHistory
  });
}

module.exports = Object.freeze({
  RUNTIME_PUBLICATION_SCHEMA,
  RUNTIME_ACTIVATION_PROJECTION,
  normalizeActivationCompile,
  normalizeActivationRecord,
  exclusionDelta,
  readRuntimeActivationHistory,
  readRuntimePublication
});
