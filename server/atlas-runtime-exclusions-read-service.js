"use strict";

const RUNTIME_EXCLUSIONS_SCHEMA = "atlas-runtime-exclusions/v1";

async function readRuntimeExclusions(client) {
  const coverage=await client.query(`
    select to_regclass('atlas_v2.runtime_compile_exclusions') is not null as exclusion_targets
  `);
  if (coverage.rows?.[0]?.exclusion_targets !== true) {
    return Object.freeze({
      schema:RUNTIME_EXCLUSIONS_SCHEMA,
      source:"runtime-compile-exclusion-ledger",
      available:false,
      reason:"RUNTIME_EXCLUSION_TARGET_LEDGER_NOT_APPLIED",
      active_compile_key:null,
      total_count:null,
      reason_summary:null,
      targets:Object.freeze([])
    });
  }

  const identity=await client.query(`
    select count(*)::int as runtime_activity_count,
           count(distinct compile_key)::int as compile_key_count,
           min(compile_key)::text as compile_key
      from atlas_v2.runtime_person_politics_v1
  `);
  const current=identity.rows?.[0] || {};
  const runtimeCount=Number(current.runtime_activity_count || 0);
  const compileCount=Number(current.compile_key_count || 0);
  const compileKey=current.compile_key == null ? null : String(current.compile_key);
  if (runtimeCount === 0 || !compileKey) {
    return Object.freeze({
      schema:RUNTIME_EXCLUSIONS_SCHEMA,
      source:"runtime-compile-exclusion-ledger",
      available:false,
      reason:"RUNTIME_PROJECTION_EMPTY",
      active_compile_key:null,
      total_count:null,
      reason_summary:null,
      targets:Object.freeze([])
    });
  }
  if (compileCount !== 1) throw new Error("RUNTIME_EXCLUSION_PROJECTION_IDENTITY_INVALID");

  const compileResult=await client.query(`
    select excluded_row_count,exclusion_summary,compiled_at
      from atlas_v2.runtime_compile_runs
     where compile_key=$1
     limit 1
  `,[compileKey]);
  const compile=compileResult.rows?.[0];
  if (!compile) throw new Error("RUNTIME_EXCLUSION_COMPILE_LEDGER_MISSING");

  const result=await client.query(`
    select
      e.activity_id::text,
      e.person_id::text,
      e.polity_id::text,
      e.reason_code,
      coalesce(pko.name,pen.name,e.person_id::text) as person_display_name,
      coalesce(poko.name,poen.name,e.polity_id::text) as polity_display_name
      from atlas_v2.runtime_compile_exclusions e
      left join atlas_v2.person_names pko
        on pko.person_id=e.person_id and pko.locale='ko' and pko.is_preferred=true
      left join atlas_v2.person_names pen
        on pen.person_id=e.person_id and pen.locale='en' and pen.is_preferred=true
      left join atlas_v2.polity_names poko
        on poko.polity_id=e.polity_id and poko.locale='ko' and poko.is_preferred=true
      left join atlas_v2.polity_names poen
        on poen.polity_id=e.polity_id and poen.locale='en' and poen.is_preferred=true
     where e.compile_key=$1
     order by e.reason_code,person_display_name,e.activity_id
  `,[compileKey]);

  const targets=Object.freeze((result.rows || []).map((row)=>Object.freeze({
    activity_id:String(row.activity_id),
    person_id:String(row.person_id),
    person_display_name:String(row.person_display_name || row.person_id),
    polity_id:String(row.polity_id),
    polity_display_name:String(row.polity_display_name || row.polity_id),
    reason_code:String(row.reason_code)
  })));
  const reasonSummary=Object.freeze(Object.fromEntries(
    [...new Set(targets.map((row)=>row.reason_code))].sort().map((code)=>[
      code,targets.filter((row)=>row.reason_code===code).length
    ])
  ));
  const expectedSummary=compile.exclusion_summary && typeof compile.exclusion_summary==="object" && !Array.isArray(compile.exclusion_summary)
    ? Object.fromEntries(Object.entries(compile.exclusion_summary).map(([code,count])=>[String(code),Number(count || 0)]))
    : {};
  const expectedCount=Number(compile.excluded_row_count || 0);
  if (targets.length !== expectedCount || JSON.stringify(reasonSummary) !== JSON.stringify(Object.fromEntries(Object.entries(expectedSummary).sort(([a],[b])=>a.localeCompare(b))))) {
    return Object.freeze({
      schema:RUNTIME_EXCLUSIONS_SCHEMA,
      source:"runtime-compile-exclusion-ledger",
      available:false,
      reason:"RUNTIME_EXCLUSION_TARGET_SNAPSHOT_INCOMPLETE",
      active_compile_key:compileKey,
      compiled_at:compile.compiled_at == null ? null : new Date(compile.compiled_at).toISOString(),
      expected_count:expectedCount,
      observed_count:targets.length,
      total_count:null,
      reason_summary:null,
      targets:Object.freeze([])
    });
  }

  return Object.freeze({
    schema:RUNTIME_EXCLUSIONS_SCHEMA,
    source:"runtime-compile-exclusion-ledger",
    available:true,
    reason:null,
    active_compile_key:compileKey,
    compiled_at:compile.compiled_at == null ? null : new Date(compile.compiled_at).toISOString(),
    total_count:targets.length,
    reason_summary:reasonSummary,
    targets
  });
}

module.exports = Object.freeze({
  RUNTIME_EXCLUSIONS_SCHEMA,
  readRuntimeExclusions
});
