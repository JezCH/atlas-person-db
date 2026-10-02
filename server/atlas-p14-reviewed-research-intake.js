"use strict";

const fs=require("node:fs");
const path=require("node:path");
const {
  CONTRACT:P14,
  UUID_RE,
  normalizeBoundary,
  normalizeSourceRefs,
  normalizeGeometry
}=require("./atlas-p14-territory-geometry-contract.js");

const CONTRACT=Object.freeze(JSON.parse(
  fs.readFileSync(path.resolve(__dirname,"../contracts/p14-reviewed-research-intake-contract.v1.json"),"utf8")
));

const REVIEW_STATES=new Set(CONTRACT.review_states);
const CONTROL_TYPES=new Set(P14.territory_record.control_types);
const BOUNDARY_CERTAINTIES=new Set(P14.territory_record.boundary_certainty);
const EVIDENCE_CONFIDENCES=new Set(P14.territory_record.evidence_confidence);
const CHRONOLOGY_STATUSES=new Set(P14.territory_record.chronology_status);
const FORBIDDEN_INLINE_GEOMETRY=new Set(CONTRACT.approved_case.forbidden_inline_geometry_fields);
const DISPLAY_FIELDS=new Set(P14.territory_record.rules.display_fields_forbidden);

function text(value){
  return value==null?"":String(value).normalize("NFC").trim().replace(/\s+/g," ");
}
function uuid(value,code){
  const normalized=text(value).toLowerCase();
  if(!UUID_RE.test(normalized)) throw new Error(code);
  return normalized;
}
function nonEmptyStringArray(value,code){
  if(!Array.isArray(value)||value.length===0) throw new Error(code);
  const items=value.map((item,index)=>{
    const normalized=text(item);
    if(!normalized) throw new Error(`${code}:${index+1}`);
    return normalized;
  });
  return Object.freeze([...new Set(items)]);
}
function assertOnlyKeys(raw,allowed,code){
  const extras=Object.keys(raw||{}).filter((key)=>!allowed.has(key)).sort();
  if(extras.length) throw new Error(`${code}:${extras.join(",")}`);
}
const ARTIFACT_KEYS=new Set(["schema","status","reviewed_at","production_mutation_authorized","cases"]);
const APPROVED_CASE_KEYS=new Set(["case_id","review_state","research_question","polity_id","geometry","territory","remaining_blockers"]);
const HOLD_CASE_KEYS=new Set(["case_id","review_state","research_question","polity_id","remaining_blockers","review_reason"]);
const REJECTED_CASE_KEYS=new Set(["case_id","review_state","research_question","review_reason"]);
const CANDIDATE_GEOMETRY_KEYS=new Set(["mode","geometry_kind","geometry_ref","source_refs"]);
const TERRITORY_KEYS=new Set([
  "control_type","boundary_certainty","evidence_confidence",
  "valid_start","valid_start_month","valid_start_day","valid_start_granularity","valid_start_certainty","valid_start_calendar",
  "valid_end","valid_end_month","valid_end_day","valid_end_granularity","valid_end_certainty","valid_end_calendar",
  "chronology_status","ongoing_as_of","source_refs"
]);
function assertNoForbiddenKeys(value,pathName="case"){
  if(value==null||typeof value!=="object") return;
  if(Array.isArray(value)){
    value.forEach((item,index)=>assertNoForbiddenKeys(item,`${pathName}[${index}]`));
    return;
  }
  for(const [key,item] of Object.entries(value)){
    if(FORBIDDEN_INLINE_GEOMETRY.has(key)) throw new Error(`P14_RESEARCH_INLINE_GEOMETRY_FORBIDDEN:${pathName}.${key}`);
    if(key==="person_id"||key==="activity_id") throw new Error(`P14_RESEARCH_PERSON_ACTIVITY_AUTHORITY_FORBIDDEN:${pathName}.${key}`);
    if(DISPLAY_FIELDS.has(key)) throw new Error(`P14_RESEARCH_DISPLAY_AUTHORITY_FORBIDDEN:${pathName}.${key}`);
    assertNoForbiddenKeys(item,`${pathName}.${key}`);
  }
}
function normalizeExistingGeometry(raw){
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new Error("P14_RESEARCH_GEOMETRY_INVALID");
  const keys=Object.keys(raw).sort();
  if(keys.length!==2||keys[0]!=="geometry_id"||keys[1]!=="mode") throw new Error("P14_RESEARCH_EXISTING_GEOMETRY_SHAPE_INVALID");
  return Object.freeze({mode:"existing",geometry_id:uuid(raw.geometry_id,"P14_RESEARCH_GEOMETRY_ID_INVALID")});
}
function normalizeCandidateGeometry(raw){
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new Error("P14_RESEARCH_GEOMETRY_INVALID");
  assertOnlyKeys(raw,CANDIDATE_GEOMETRY_KEYS,"P14_RESEARCH_GEOMETRY_FIELD_FORBIDDEN");
  const geometry=normalizeGeometry({
    geometry_kind:raw.geometry_kind,
    geometry_ref:raw.geometry_ref,
    source_refs:raw.source_refs
  });
  return Object.freeze({
    mode:"candidate",
    geometry_kind:geometry.geometry_kind,
    geometry_ref:geometry.geometry_ref,
    source_refs:geometry.source_refs
  });
}
function normalizeGeometryBinding(raw){
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new Error("P14_RESEARCH_GEOMETRY_INVALID");
  const mode=text(raw.mode);
  if(mode==="existing") return normalizeExistingGeometry(raw);
  if(mode==="candidate") return normalizeCandidateGeometry(raw);
  throw new Error("P14_RESEARCH_GEOMETRY_MODE_INVALID");
}
function normalizeTerritoryCandidate(raw){
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new Error("P14_RESEARCH_TERRITORY_INVALID");
  assertOnlyKeys(raw,TERRITORY_KEYS,"P14_RESEARCH_TERRITORY_FIELD_FORBIDDEN");
  const control_type=text(raw.control_type);
  if(!CONTROL_TYPES.has(control_type)) throw new Error("P14_RESEARCH_CONTROL_TYPE_INVALID");
  const boundary_certainty=text(raw.boundary_certainty);
  if(!BOUNDARY_CERTAINTIES.has(boundary_certainty)) throw new Error("P14_RESEARCH_BOUNDARY_CERTAINTY_INVALID");
  const evidence_confidence=text(raw.evidence_confidence);
  if(!EVIDENCE_CONFIDENCES.has(evidence_confidence)) throw new Error("P14_RESEARCH_EVIDENCE_CONFIDENCE_INVALID");
  const chronology_status=text(raw.chronology_status);
  if(!CHRONOLOGY_STATUSES.has(chronology_status)) throw new Error("P14_RESEARCH_CHRONOLOGY_STATUS_INVALID");

  const start=normalizeBoundary(raw,"valid_start");
  const end=normalizeBoundary(raw,"valid_end");
  let ongoing_as_of=null;
  if(chronology_status==="ongoing"){
    if(end.status!=="unknown") throw new Error("P14_RESEARCH_ONGOING_END_BOUNDARY_MUST_BE_UNRESOLVED");
    ongoing_as_of=text(raw.ongoing_as_of);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(ongoing_as_of)) throw new Error("P14_RESEARCH_ONGOING_AS_OF_REQUIRED");
  }else if(raw.ongoing_as_of!=null&&text(raw.ongoing_as_of)){
    throw new Error("P14_RESEARCH_ONGOING_AS_OF_FORBIDDEN");
  }

  if(start.status==="known"&&end.status==="known"){
    if(end.year<start.year) throw new Error("P14_RESEARCH_TERRITORY_INTERVAL_INVALID");
    if(end.year===start.year&&end.calendar===start.calendar){
      if(start.month!=null&&end.month!=null&&end.month<start.month) throw new Error("P14_RESEARCH_TERRITORY_INTERVAL_INVALID");
      if(start.month!=null&&end.month!=null&&start.month===end.month&&start.day!=null&&end.day!=null&&end.day<start.day) {
        throw new Error("P14_RESEARCH_TERRITORY_INTERVAL_INVALID");
      }
    }
  }

  const source_refs=normalizeSourceRefs(raw.source_refs,"P14_RESEARCH_TERRITORY");
  return Object.freeze({
    control_type,
    boundary_certainty,
    evidence_confidence,
    valid_start:start.year,
    valid_start_month:start.month,
    valid_start_day:start.day,
    valid_start_granularity:start.granularity,
    valid_start_certainty:start.certainty,
    valid_start_calendar:start.calendar,
    valid_end:end.year,
    valid_end_month:end.month,
    valid_end_day:end.day,
    valid_end_granularity:end.granularity,
    valid_end_certainty:end.certainty,
    valid_end_calendar:end.calendar,
    chronology_status,
    ongoing_as_of,
    source_refs
  });
}
function normalizeApprovedCase(raw){
  assertOnlyKeys(raw,APPROVED_CASE_KEYS,"P14_RESEARCH_APPROVED_FIELD_FORBIDDEN");
  if(!Array.isArray(raw.remaining_blockers)) throw new Error("P14_RESEARCH_APPROVED_BLOCKERS_REQUIRED");
  const blockers=raw.remaining_blockers.map(text).filter(Boolean);
  if(blockers.length!==0) throw new Error("P14_RESEARCH_APPROVED_BLOCKERS_MUST_BE_EMPTY");
  const polity_id=uuid(raw.polity_id,"P14_RESEARCH_POLITY_ID_INVALID");
  const geometry=normalizeGeometryBinding(raw.geometry);
  const territory=normalizeTerritoryCandidate(raw.territory);
  return Object.freeze({
    case_id:text(raw.case_id),
    review_state:"APPROVED",
    research_question:text(raw.research_question),
    polity_id,
    geometry,
    territory,
    remaining_blockers:Object.freeze([]),
    review_reason:null,
    ready_for_authoring_handoff:true
  });
}
function normalizeHoldCase(raw){
  assertOnlyKeys(raw,HOLD_CASE_KEYS,"P14_RESEARCH_HOLD_FIELD_FORBIDDEN");
  const blockers=nonEmptyStringArray(raw.remaining_blockers,"P14_RESEARCH_HOLD_BLOCKERS_REQUIRED");
  return Object.freeze({
    case_id:text(raw.case_id),
    review_state:"HOLD",
    research_question:text(raw.research_question),
    polity_id:raw.polity_id==null?null:uuid(raw.polity_id,"P14_RESEARCH_POLITY_ID_INVALID"),
    geometry:null,
    territory:null,
    remaining_blockers:blockers,
    review_reason:text(raw.review_reason)||null,
    ready_for_authoring_handoff:false
  });
}
function normalizeRejectedCase(raw){
  assertOnlyKeys(raw,REJECTED_CASE_KEYS,"P14_RESEARCH_REJECTED_FIELD_FORBIDDEN");
  const review_reason=text(raw.review_reason);
  if(!review_reason) throw new Error("P14_RESEARCH_REJECTED_REASON_REQUIRED");
  return Object.freeze({
    case_id:text(raw.case_id),
    review_state:"REJECTED",
    research_question:text(raw.research_question),
    polity_id:null,
    geometry:null,
    territory:null,
    remaining_blockers:Object.freeze([]),
    review_reason,
    ready_for_authoring_handoff:false
  });
}
function normalizeCase(raw){
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new Error("P14_RESEARCH_CASE_INVALID");
  assertNoForbiddenKeys(raw);
  const case_id=text(raw.case_id);
  if(!case_id) throw new Error("P14_RESEARCH_CASE_ID_REQUIRED");
  const research_question=text(raw.research_question);
  if(!research_question) throw new Error("P14_RESEARCH_QUESTION_REQUIRED");
  const review_state=text(raw.review_state).toUpperCase();
  if(!REVIEW_STATES.has(review_state)) throw new Error("P14_RESEARCH_REVIEW_STATE_INVALID");
  if(review_state==="APPROVED") return normalizeApprovedCase({...raw,case_id,research_question});
  if(review_state==="HOLD") return normalizeHoldCase({...raw,case_id,research_question});
  return normalizeRejectedCase({...raw,case_id,research_question});
}
function normalizeReviewedResearchArtifact(raw){
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new Error("P14_RESEARCH_ARTIFACT_INVALID");
  assertOnlyKeys(raw,ARTIFACT_KEYS,"P14_RESEARCH_ARTIFACT_FIELD_FORBIDDEN");
  if(raw.schema!==CONTRACT.artifact_schema) throw new Error("P14_RESEARCH_SCHEMA_INVALID");
  if(raw.status!=="REVIEWED_NO_PRODUCTION_MUTATION") throw new Error("P14_RESEARCH_STATUS_INVALID");
  if(raw.production_mutation_authorized!==false) throw new Error("P14_RESEARCH_PRODUCTION_MUTATION_FORBIDDEN");
  const reviewed_at=text(raw.reviewed_at);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(reviewed_at)) throw new Error("P14_RESEARCH_REVIEWED_AT_INVALID");
  if(!Array.isArray(raw.cases)||raw.cases.length===0) throw new Error("P14_RESEARCH_CASES_REQUIRED");
  const seen=new Set();
  const cases=raw.cases.map((item)=>{
    const normalized=normalizeCase(item);
    if(seen.has(normalized.case_id)) throw new Error("P14_RESEARCH_CASE_ID_DUPLICATE");
    seen.add(normalized.case_id);
    return normalized;
  });
  return Object.freeze({
    schema:CONTRACT.artifact_schema,
    status:raw.status,
    reviewed_at,
    production_mutation_authorized:false,
    cases:Object.freeze(cases),
    approved_count:cases.filter((item)=>item.review_state==="APPROVED").length,
    hold_count:cases.filter((item)=>item.review_state==="HOLD").length,
    rejected_count:cases.filter((item)=>item.review_state==="REJECTED").length
  });
}
function buildApprovedHandoffs(raw){
  const artifact=normalizeReviewedResearchArtifact(raw);
  return Object.freeze(artifact.cases.filter((item)=>item.ready_for_authoring_handoff).map((item)=>Object.freeze({
    case_id:item.case_id,
    polity_id:item.polity_id,
    geometry:item.geometry,
    territory:item.territory,
    production_mutation_authorized:false,
    canonical_writer:"server/atlas-p14-territory-geometry-service.js"
  })));
}

async function requireCanonicalRow(client,sql,params,code){
  const result=await client.query(sql,params);
  if(result.rowCount!==1) throw new Error(code);
}
async function verifyApprovedHandoffsAgainstCanonicalState(client,raw){
  if(!client||typeof client.query!=="function") throw new Error("PostgreSQL client is required");
  const handoffs=buildApprovedHandoffs(raw);
  const checkedSources=new Set();
  const checkedPolities=new Set();
  const checkedGeometries=new Set();

  for(const handoff of handoffs){
    if(!checkedPolities.has(handoff.polity_id)){
      await requireCanonicalRow(
        client,
        "select id::text from atlas_v2.polities where id=$1::uuid",
        [handoff.polity_id],
        "P14_RESEARCH_POLITY_UNRESOLVED"
      );
      checkedPolities.add(handoff.polity_id);
    }

    if(handoff.geometry.mode==="existing"&&!checkedGeometries.has(handoff.geometry.geometry_id)){
      await requireCanonicalRow(
        client,
        "select id::text from atlas_v2.geometries where id=$1::uuid",
        [handoff.geometry.geometry_id],
        "P14_RESEARCH_GEOMETRY_UNRESOLVED"
      );
      checkedGeometries.add(handoff.geometry.geometry_id);
    }

    const sourceRefs=[
      ...(handoff.geometry.mode==="candidate"?handoff.geometry.source_refs:[]),
      ...handoff.territory.source_refs
    ];
    for(const ref of sourceRefs){
      if(checkedSources.has(ref.source_id)) continue;
      await requireCanonicalRow(
        client,
        "select id::text from atlas_v2.sources where id=$1::uuid",
        [ref.source_id],
        "P14_RESEARCH_SOURCE_UNRESOLVED"
      );
      checkedSources.add(ref.source_id);
    }
  }

  return Object.freeze({
    approved_handoffs:handoffs.length,
    canonical_polities_verified:checkedPolities.size,
    canonical_sources_verified:checkedSources.size,
    canonical_existing_geometries_verified:checkedGeometries.size,
    production_mutation_authorized:false
  });
}

module.exports=Object.freeze({
  CONTRACT,
  normalizeGeometryBinding,
  normalizeTerritoryCandidate,
  normalizeReviewedResearchArtifact,
  buildApprovedHandoffs,
  verifyApprovedHandoffsAgainstCanonicalState
});
