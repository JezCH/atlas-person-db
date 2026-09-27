"use strict";

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
}

function boundaryFrom(raw) {
  if (!raw || typeof raw !== "object" || raw.year == null) return null;
  const year=Number(raw.year);
  if (!Number.isInteger(year) || year === 0 || year < -10000 || year > 9999) return null;
  const month=raw.month == null ? null : Number(raw.month);
  const day=raw.day == null ? null : Number(raw.day);
  if (month != null && (!Number.isInteger(month) || month < 1 || month > 12)) return null;
  if (day != null && (!Number.isInteger(day) || day < 1 || day > 31 || month == null)) return null;
  return Object.freeze({
    year,
    month,
    day,
    granularity:raw.granularity == null ? null : normalizeText(raw.granularity),
    certainty:raw.certainty == null ? null : normalizeText(raw.certainty),
    calendar:raw.calendar == null ? null : normalizeText(raw.calendar)
  });
}

function normalizeTemporalContext(raw) {
  const start=boundaryFrom(raw?.start);
  const end=boundaryFrom(raw?.end);
  return Object.freeze({ start, end, complete:Boolean(start && end) });
}

function tuple(year, month, day, { upper=false } = {}) {
  return [Number(year), month == null ? (upper ? 12 : 1) : Number(month), day == null ? (upper ? 31 : 1) : Number(day)];
}

function compareTuple(left,right) {
  for (let i=0;i<3;i+=1) {
    if (left[i] < right[i]) return -1;
    if (left[i] > right[i]) return 1;
  }
  return 0;
}

function designationContainsContext(row, context) {
  if (!context?.complete) return false;
  const start=tuple(context.start.year,context.start.month,context.start.day);
  const end=tuple(context.end.year,context.end.month,context.end.day,{upper:true});
  if (row.valid_from_year != null) {
    const from=tuple(row.valid_from_year,row.valid_from_month,row.valid_from_day);
    if (compareTuple(from,start) > 0) return false;
  }
  if (row.valid_to_year != null) {
    const to=tuple(row.valid_to_year,row.valid_to_month,row.valid_to_day,{upper:true});
    if (compareTuple(to,end) < 0) return false;
  }
  return true;
}

function uniqueIds(rows) {
  return [...new Set(rows.map((row)=>String(row.polity_id || row.id || "").toLowerCase()).filter(Boolean))].sort();
}

async function loadCurrentPolityMatches(client,{ canonicalName, canonicalKey }) {
  const keys=await client.query(`
    select p.id::text as polity_id,p.canonical_key,p.polity_type,p.historicity
      from atlas_v2.polities p
     where p.canonical_key=$1
     order by p.id::text
     limit 2
  `,[canonicalKey]);
  const names=await client.query(`
    select p.id::text as polity_id,p.canonical_key,p.polity_type,p.historicity,
           pn.locale,pn.name,pn.name_type,pn.is_preferred
      from atlas_v2.polity_names pn
      join atlas_v2.polities p on p.id=pn.polity_id
     where pn.locale='en'
       and pn.name=$1
     order by p.id::text,pn.is_preferred desc,pn.locale,pn.id
  `,[canonicalName]);
  const designations=await client.query(`
    select p.id::text as polity_id,p.canonical_key,p.polity_type,p.historicity,
           pd.id::text as designation_id,pd.designation_type,
           pd.valid_from_year,pd.valid_from_month,pd.valid_from_day,
           pd.valid_from_granularity,pd.valid_from_certainty,pd.valid_from_calendar,
           pd.valid_to_year,pd.valid_to_month,pd.valid_to_day,
           pd.valid_to_granularity,pd.valid_to_certainty,pd.valid_to_calendar,
           pdn.locale,pdn.name,pdn.is_preferred
      from atlas_v2.polity_designation_names pdn
      join atlas_v2.polity_designations pd on pd.id=pdn.polity_designation_id
      join atlas_v2.polities p on p.id=pd.polity_id
     where pdn.locale='en'
       and pdn.name=$1
     order by p.id::text,pd.id::text,pdn.is_preferred desc,pdn.locale,pdn.id
  `,[canonicalName]);
  return Object.freeze({
    key:Object.freeze(keys.rows || []),
    names:Object.freeze(names.rows || []),
    designations:Object.freeze(designations.rows || [])
  });
}

async function loadContinuity(client, polityIds) {
  if (!Array.isArray(polityIds) || polityIds.length === 0) return Object.freeze([]);
  const result=await client.query(`
    select pir.id::text,
           pir.predecessor_polity_id::text,
           pir.successor_polity_id::text,
           pirt.code as relation_type,
           pir.transition_year,pir.transition_month,pir.transition_day,
           pir.transition_granularity,pir.transition_certainty,pir.transition_calendar
      from atlas_v2.polity_identity_relations pir
      join atlas_v2.polity_identity_relation_types pirt on pirt.id=pir.relation_type_id
     where pir.predecessor_polity_id=any($1::uuid[])
        or pir.successor_polity_id=any($1::uuid[])
     order by pir.id::text
  `,[polityIds]);
  return Object.freeze((result.rows || []).map((row)=>Object.freeze({
    id:String(row.id).toLowerCase(),
    predecessor_polity_id:String(row.predecessor_polity_id).toLowerCase(),
    successor_polity_id:String(row.successor_polity_id).toLowerCase(),
    relation_type:String(row.relation_type || ""),
    transition:Object.freeze({
      year:row.transition_year == null ? null : Number(row.transition_year),
      month:row.transition_month == null ? null : Number(row.transition_month),
      day:row.transition_day == null ? null : Number(row.transition_day),
      granularity:row.transition_granularity == null ? null : String(row.transition_granularity),
      certainty:row.transition_certainty == null ? null : String(row.transition_certainty),
      calendar:row.transition_calendar == null ? null : String(row.transition_calendar)
    })
  })));
}

async function loadRetiredPolityMatches(client,{ canonicalName, canonicalKey }) {
  const result=await client.query(`
    select
      op->'removed_polity'->>'id' as polity_id,
      op->'removed_polity'->>'canonical_key' as canonical_key,
      op->'removed_polity'->>'polity_type' as polity_type,
      op->'removed_polity'->>'historicity' as historicity,
      coalesce(op->'preferred_names','[]'::jsonb) as preferred_names
    from atlas_v2.correction_manifest_runs cmr
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(cmr.result_snapshot->'operations')='array' then cmr.result_snapshot->'operations'
        else '[]'::jsonb
      end
    ) op
    where cmr.result_snapshot->>'schema'='atlas-correction-polity-retirement/v1'
      and (
        op->'removed_polity'->>'canonical_key'=$1
        or exists (
          select 1
            from jsonb_array_elements(coalesce(op->'preferred_names','[]'::jsonb)) n
           where n->>'locale'='en' and n->>'name'=$2
        )
      )
    order by op->'removed_polity'->>'id'
    limit 20
  `,[canonicalKey,canonicalName]);
  return Object.freeze((result.rows || []).map((row)=>Object.freeze({
    polity_id:String(row.polity_id || "").toLowerCase(),
    canonical_key:String(row.canonical_key || ""),
    polity_type:String(row.polity_type || ""),
    historicity:String(row.historicity || ""),
    preferred_names:Array.isArray(row.preferred_names) ? row.preferred_names : []
  })));
}

function continuityLinksCandidates(continuity,candidateIds) {
  const ids=new Set(candidateIds);
  return continuity.some((row)=>ids.has(row.predecessor_polity_id) && ids.has(row.successor_polity_id));
}

function representativeRow(matches,id) {
  return matches.key.find((row)=>String(row.polity_id).toLowerCase()===id)
    || matches.names.find((row)=>String(row.polity_id).toLowerCase()===id)
    || matches.designations.find((row)=>String(row.polity_id).toLowerCase()===id)
    || null;
}

async function resolvePolityIdentity(client, raw, { temporalContext=null } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const canonicalName=normalizeText(raw?.canonical_name_en);
  if (!canonicalName) throw new Error("POLITY_IDENTITY_NAME_REQUIRED");
  const explicitCanonicalKey=normalizeText(raw?.canonical_key);
  const canonicalKey=explicitCanonicalKey || canonicalName;
  const context=normalizeTemporalContext(temporalContext);
  const matches=await loadCurrentPolityMatches(client,{ canonicalName, canonicalKey });

  const keyIds=uniqueIds(matches.key);
  const nameIds=uniqueIds(matches.names);
  const designationIds=uniqueIds(matches.designations);
  if (keyIds.length > 1) throw new Error("POLITY_CANONICAL_KEY_AMBIGUOUS");
  if (explicitCanonicalKey && explicitCanonicalKey !== canonicalName && keyIds.length === 1) {
    const keyId=keyIds[0];
    if (![...nameIds,...designationIds].includes(keyId)) {
      throw new Error("POLITY_CANONICAL_KEY_CONFLICT");
    }
  }
  const stableIds=[...new Set([...keyIds,...nameIds])].sort();
  const allIds=[...new Set([...stableIds,...designationIds])].sort();

  if (allIds.length === 0) {
    const retired=await loadRetiredPolityMatches(client,{ canonicalName, canonicalKey });
    if (retired.length) {
      const error=new Error("POLITY_RETIRED_IDENTITY_REVIEW_REQUIRED");
      error.retired_polity_ids=Object.freeze(retired.map((row)=>row.polity_id));
      throw error;
    }
    return Object.freeze({
      status:"unresolved",
      create_allowed:true,
      canonical_name_en:canonicalName,
      canonical_key:canonicalKey,
      temporal_context:context
    });
  }

  let candidateIds=allIds;
  let matchedBy=nameIds.length ? "stable_name" : "canonical_key";
  if (stableIds.length === 0) {
    matchedBy="temporal_designation";
    if (!context.complete) throw new Error("POLITY_DESIGNATION_DATE_CONTEXT_REQUIRED");
    const containing=matches.designations.filter((row)=>designationContainsContext(row,context));
    candidateIds=uniqueIds(containing);
    if (candidateIds.length === 0) throw new Error("POLITY_DESIGNATION_DATE_MISMATCH_REVIEW_REQUIRED");
  }

  const continuity=await loadContinuity(client,allIds);
  if (candidateIds.length !== 1) {
    throw new Error(continuityLinksCandidates(continuity,candidateIds)
      ? "POLITY_IDENTITY_CONTINUITY_REVIEW_REQUIRED"
      : "POLITY_IDENTITY_AMBIGUOUS");
  }

  const id=candidateIds[0];
  const row=representativeRow(matches,id);
  if (!row) throw new Error("POLITY_IDENTITY_RESOLUTION_INVARIANT_FAILED");

  const requestedType=normalizeText(raw?.polity_type) || "historical_polity";
  const requestedHistoricity=normalizeText(raw?.historicity) || "historical";
  if (String(row.polity_type) !== requestedType || String(row.historicity) !== requestedHistoricity) {
    throw new Error("POLITY_IDENTITY_METADATA_CONFLICT");
  }

  const matchKinds=[];
  if (matches.key.some((item)=>String(item.polity_id).toLowerCase()===id)) matchKinds.push("canonical_key");
  if (matches.names.some((item)=>String(item.polity_id).toLowerCase()===id && item.is_preferred===true)) matchKinds.push("preferred_name");
  if (matches.names.some((item)=>String(item.polity_id).toLowerCase()===id && item.is_preferred!==true)) matchKinds.push("alias");
  if (matches.designations.some((item)=>String(item.polity_id).toLowerCase()===id)) matchKinds.push("temporal_designation");

  return Object.freeze({
    status:"resolved",
    create_allowed:false,
    id,
    canonical_key:String(row.canonical_key),
    polity_type:String(row.polity_type),
    historicity:String(row.historicity),
    matched_by:matchedBy,
    match_kinds:Object.freeze(matchKinds),
    temporal_context:context,
    continuity
  });
}

function temporalContextFromHumanActivity(activity) {
  return Object.freeze({
    start:activity?.start || null,
    end:activity?.end || null
  });
}

function temporalContextFromNativeActivity(activity) {
  if (!activity || typeof activity !== "object") return Object.freeze({ start:null,end:null });
  return Object.freeze({
    start:Object.freeze({
      year:activity.activity_start ?? null,
      month:activity.activity_start_month ?? null,
      day:activity.activity_start_day ?? null,
      granularity:activity.activity_start_granularity ?? null,
      certainty:activity.activity_start_certainty ?? null,
      calendar:activity.activity_start_calendar ?? null
    }),
    end:Object.freeze({
      year:activity.activity_end ?? null,
      month:activity.activity_end_month ?? null,
      day:activity.activity_end_day ?? null,
      granularity:activity.activity_end_granularity ?? null,
      certainty:activity.activity_end_certainty ?? null,
      calendar:activity.activity_end_calendar ?? null
    })
  });
}

module.exports=Object.freeze({
  normalizeTemporalContext,
  designationContainsContext,
  loadCurrentPolityMatches,
  loadContinuity,
  loadRetiredPolityMatches,
  resolvePolityIdentity,
  temporalContextFromHumanActivity,
  temporalContextFromNativeActivity
});
