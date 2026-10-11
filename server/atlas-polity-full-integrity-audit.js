"use strict";

/**
 * Full, no-truncation canonical Production Polity/source/tombstone snapshot.
 * Caller MUST already hold an authenticated REPEATABLE READ READ ONLY transaction.
 * This function has no connections, HTTP, writes or owner-policy decisions.
 */
const TABLE_QUERIES = Object.freeze({
  sources: "select id::text as id, source_key, source_type, title, canonical_url, external_identifier from atlas_v2.sources order by id::text",
  activity_sources: "select person_politics_id::text as activity_id,source_id::text as source_id,source_locator_key from atlas_v2.person_politics_sources order by person_politics_id::text,source_id::text,source_locator_key",
  polity_sources: "select polity_id::text as polity_id,source_id::text as source_id from atlas_v2.polity_sources order by polity_id::text,source_id::text",
  activities: "select to_jsonb(a) as activity from atlas_v2.person_politics_v2 a order by a.id::text",
  runtime_activities: "select to_jsonb(r) as activity from atlas_v2.runtime_person_politics_v1 r order by r.id::text",
  designations: "select to_jsonb(d) as designation from atlas_v2.polity_designations d order by d.id::text",
  designation_sources: "select polity_designation_id::text as designation_id,source_id::text as source_id,source_locator_key from atlas_v2.polity_designation_sources order by polity_designation_id::text,source_id::text,source_locator_key",
  governance_periods: "select to_jsonb(g) as governance_period from atlas_v2.polity_governance_periods g order by g.id::text",
  governance_sources: "select polity_governance_period_id::text as governance_id,source_id::text as source_id,source_locator_key from atlas_v2.polity_governance_period_sources order by polity_governance_period_id::text,source_id::text,source_locator_key",
  identity_relation_types: "select id::text as id,code,is_active from atlas_v2.polity_identity_relation_types order by id::text",
  identity_relations: "select to_jsonb(r) as identity_relation from atlas_v2.polity_identity_relations r order by r.id::text",
  identity_relation_sources: "select polity_identity_relation_id::text as relation_id,source_id::text as source_id,source_locator_key from atlas_v2.polity_identity_relation_sources order by polity_identity_relation_id::text,source_id::text,source_locator_key",
  retirements: "select to_jsonb(r) as retirement from atlas_v2.polity_identity_retirements r order by r.retired_polity_id::text",
  retirement_names: "select retired_polity_id::text as retired_polity_id,locale,name,is_preferred from atlas_v2.polity_identity_retirement_names order by retired_polity_id::text,locale,name",
  polity_place_functions: "select to_jsonb(f) as polity_place_function from atlas_v2.polity_place_functions f order by f.polity_id::text,to_jsonb(f)::text"
});

function requireRows(rows, name) {
  if (!Array.isArray(rows)) throw new Error("POLITY_FULL_INTEGRITY_ROWS_INVALID:" + name);
  return rows;
}
function rejectDuplicateIds(values, label) {
  const ids=new Set();
  for (const id of values) {
    const key=String(id||"").toLowerCase();
    if (!key || ids.has(key)) throw new Error("POLITY_FULL_INTEGRITY_DUPLICATE_ID:" + label + ":" + key);
    ids.add(key);
  }
  return ids;
}
function countDuplicateStrings(rows, key) {
  const tally=new Map();
  for (const row of rows) {
    const value=String(row[key]||"").trim();
    if(value) tally.set(value,(tally.get(value)||0)+1);
  }
  return [...tally.entries()].filter(([,count])=>count>1)
    .map(([value,count])=>({value,count})).sort((a,b)=>a.value.localeCompare(b.value));
}

function summarizeFullPolityIntegrity(raw, polities) {
  if (!raw || !Array.isArray(polities) || polities.length===0) throw new Error("POLITY_FULL_INTEGRITY_PRECONDITION");
  for(const key of Object.keys(TABLE_QUERIES)) requireRows(raw[key],key);
  const polityIds=rejectDuplicateIds(polities.map(p=>p.polity_id),"polities");
  const sourceIds=rejectDuplicateIds(raw.sources.map(s=>s.id),"sources");
  const activityIds=rejectDuplicateIds(raw.activities.map(r=>r.activity?.id),"activities");
  const runtimeIds=rejectDuplicateIds(raw.runtime_activities.map(r=>r.activity?.id),"runtime");
  const designationIds=rejectDuplicateIds(raw.designations.map(r=>r.designation?.id),"designations");
  const governanceIds=rejectDuplicateIds(raw.governance_periods.map(r=>r.governance_period?.id),"governance");
  const relationIds=rejectDuplicateIds(raw.identity_relations.map(r=>r.identity_relation?.id),"identity_relations");
  const retirementIds=rejectDuplicateIds(raw.retirements.map(r=>r.retirement?.retired_polity_id),"retirements");
  const deficits=[];
  function checkLinks(rows,field,set,label) {
    for (const row of rows) if(!set.has(String(row[field]||"").toLowerCase())) {
      deficits.push({table:label,foreign_key:field,value:row[field]??null});
    }
  }
  checkLinks(raw.polity_sources,"polity_id",polityIds,"polity_sources");
  checkLinks(raw.polity_sources,"source_id",sourceIds,"polity_sources");
  checkLinks(raw.activity_sources,"activity_id",activityIds,"person_politics_sources");
  checkLinks(raw.activity_sources,"source_id",sourceIds,"person_politics_sources");
  checkLinks(raw.designation_sources,"designation_id",designationIds,"polity_designation_sources");
  checkLinks(raw.designation_sources,"source_id",sourceIds,"polity_designation_sources");
  checkLinks(raw.governance_sources,"governance_id",governanceIds,"polity_governance_period_sources");
  checkLinks(raw.governance_sources,"source_id",sourceIds,"polity_governance_period_sources");
  checkLinks(raw.identity_relation_sources,"relation_id",relationIds,"polity_identity_relation_sources");
  checkLinks(raw.identity_relation_sources,"source_id",sourceIds,"polity_identity_relation_sources");
  checkLinks(raw.retirement_names,"retired_polity_id",retirementIds,"polity_identity_retirement_names");
  checkLinks(raw.activities.map(x=>x.activity),"polity_id",polityIds,"person_politics_v2");
  checkLinks(raw.runtime_activities.map(x=>x.activity),"polity_id",polityIds,"runtime_person_politics_v1");
  checkLinks(raw.designations.map(x=>x.designation),"polity_id",polityIds,"polity_designations");
  checkLinks(raw.governance_periods.map(x=>x.governance_period),"polity_id",polityIds,"polity_governance_periods");
  checkLinks(raw.identity_relations.map(x=>x.identity_relation),"predecessor_polity_id",polityIds,"polity_identity_relations");
  checkLinks(raw.identity_relations.map(x=>x.identity_relation),"successor_polity_id",polityIds,"polity_identity_relations");
  checkLinks(raw.polity_place_functions.map(x=>x.polity_place_function),"polity_id",polityIds,"polity_place_functions");
  for (const r of raw.retirements) {
    const survivor=r.retirement?.survivor_polity_id;
    if(survivor && !polityIds.has(String(survivor).toLowerCase())) deficits.push({table:"polity_identity_retirements",foreign_key:"survivor_polity_id",value:survivor});
  }
  const tombstoneLiveConflicts=raw.retirements.map(x=>x.retirement).filter(r=>polityIds.has(String(r.retired_polity_id).toLowerCase()))
    .map(r=>({retired_polity_id:r.retired_polity_id,canonical_key:r.canonical_key,survivor_polity_id:r.survivor_polity_id,source_case_id:r.source_case_id}));
  const orphanCandidates=polities.filter(p=>p.external_reference_total===0)
    .map(p=>({
      polity_id:p.polity_id,canonical_key:p.canonical_key,polity_type:p.polity_type,
      preferred_ko:(p.names||[]).find(n=>n.locale==="ko"&&n.is_preferred)?.name||null,
      linked_activity_count:0, // verified by external person_politics_v2 counts
      source_ids:raw.polity_sources.filter(s=>s.polity_id===p.polity_id).map(s=>s.source_id),
      owned_reference_total:p.owned_reference_total,
      zero_external_reference_observed:true,
      safe_to_retire_automatically:false
    })).sort((a,b)=>a.polity_id.localeCompare(b.polity_id));
  const runtimeAbsent=[...activityIds].filter(id=>!runtimeIds.has(id)).sort();
  const runtimeExtra=[...runtimeIds].filter(id=>!activityIds.has(id)).sort();
  const runtimeFieldMismatch=[];
  const byRuntime=new Map(raw.runtime_activities.map(r=>[String(r.activity.id).toLowerCase(),r.activity]));
  const compareFields=["person_id","polity_id","role_id","period_basis_id","activity_start","activity_end",
    "activity_start_month","activity_start_day","activity_end_month","activity_end_day",
    "confidence","chronology_status","content_hash"];
  for(const {activity:a} of raw.activities) {
    const b=byRuntime.get(String(a.id).toLowerCase());
    if(!b)continue;
    const mismatch=compareFields.filter(k=>a[k]!==b[k] && JSON.stringify(a[k]??null)!==JSON.stringify(b[k]??null));
    if(mismatch.length)runtimeFieldMismatch.push({activity_id:a.id,fields:mismatch});
  }
  const canonicalKoPairs=[];
  const nameMap=new Map();
  for (const p of polities) for(const n of p.names||[]) if(n.locale==="ko"&&n.is_preferred){
    const name=String(n.name||"").normalize("NFKC").trim();
    const owners=nameMap.get(name)||[];owners.push(p.polity_id);nameMap.set(name,owners);
  }
  for(const [name,ids] of nameMap)if(new Set(ids).size>1)canonicalKoPairs.push({name,polity_ids:[...new Set(ids)].sort()});
  canonicalKoPairs.sort((a,b)=>a.name.localeCompare(b.name,"ko"));
  const pairDuplicates=countDuplicateStrings(raw.polity_sources.map(x=>({pair:x.polity_id+"|"+x.source_id})),"pair");
  const sourceKeyDuplicates=countDuplicateStrings(raw.sources,"source_key");
  const nonemptyUrlDuplicates=countDuplicateStrings(raw.sources,"canonical_url");
  const counts=Object.fromEntries(Object.keys(TABLE_QUERIES).map(k=>[k,raw[k].length]));
  const note=[
    "All rows in recorded atlas_v2 tables were enumerated in the same REPEATABLE READ READ ONLY transaction.",
    "Source URL/key duplicates are CANDIDATES, not grounds for merging bibliography or identities.",
    "Retirement row having the same UUID as a currently live Polity is a tombstone contradiction; requires explicit user approval before any deletion.",
    "Runtime semantic-field mismatches and Activity UUID set diffs warrant Authoring/Compile review, not automatic recompile.",
    "External orphan is relative to discoverable Polity-UUID reference catalog, NOT authorization to retire; 25 public no-activity Polities must be checked separately.",
    "This does not certify historical correctness, source citation validity, unindexed text references, or Human Authoring input parity."
  ];
  return Object.freeze({
    schema:"atlas-polity-internal-provenance-integrity/v1",
    read_only:true,committed:false,no_truncation:true,counts,
    all_polity_count:polities.length,external_orphan_count:orphanCandidates.length,
    unresolved_foreign_key_refs:deficits,
    runtime_missing_activity_ids:runtimeAbsent,
    runtime_extra_activity_ids:runtimeExtra,
    runtime_semantic_field_mismatches:runtimeFieldMismatch,
    live_retired_polity_uuid_conflicts:tombstoneLiveConflicts,
    direct_polity_source_pair_duplicates:pairDuplicates,
    source_key_duplicates:sourceKeyDuplicates,
    source_url_duplicates:nonemptyUrlDuplicates,
    preferred_korean_name_collisions:canonicalKoPairs,
    orphan_candidates:orphanCandidates,
    limitations:note,
    canonical_source_metadata_content_not_fully_audited:true,
    human_authoring_parity_proven:false
  });
}
async function queryFullPolityIntegrity(client,polities) {
  const raw={};
  for(const [name,sql] of Object.entries(TABLE_QUERIES)) {
    const rows=await client.query(sql);
    raw[name]=requireRows(rows.rows,name);
  }
  return Object.freeze({summary:summarizeFullPolityIntegrity(raw,polities),raw});
}
module.exports=Object.freeze({TABLE_QUERIES,queryFullPolityIntegrity,summarizeFullPolityIntegrity});
