"use strict";

const fs=require("node:fs");
const path=require("node:path");

const CONTRACT=Object.freeze(JSON.parse(
  fs.readFileSync(path.resolve(__dirname,"../contracts/p14-territory-geometry-contract.v2.json"),"utf8")
));
const STAGE2=Object.freeze(JSON.parse(
  fs.readFileSync(path.resolve(__dirname,"../contracts/stage2-domain-contract.v1.json"),"utf8")
));

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTROL=new Set(CONTRACT.territory_record.control_types);
const BOUNDARY_CERTAINTY=new Set(CONTRACT.territory_record.boundary_certainty);
const EVIDENCE_CONFIDENCE=new Set(CONTRACT.territory_record.evidence_confidence);
const CHRONOLOGY=new Set(CONTRACT.territory_record.chronology_status);
const KINDS=new Set(CONTRACT.geometry.geometry_kinds);
const GRANULARITIES=new Set(STAGE2.temporal.granularities);
const TEMPORAL_CERTAINTIES=new Set(STAGE2.temporal.certainties);
const CALENDARS=new Set(STAGE2.temporal.calendars);

function text(v){return v==null?"":String(v).normalize("NFC").trim().replace(/\s+/g," ");}
function uuid(v,code){const x=text(v).toLowerCase();if(!UUID_RE.test(x))throw new Error(code);return x;}
function optionalInteger(v,code,min,max){
  if(v==null||v==="") return null;
  const n=Number(v);
  if(!Number.isInteger(n)||n<min||n>max) throw new Error(code);
  return n;
}
function historicalYear(v,code){
  if(v==null||v==="") return null;
  const n=Number(v);
  if(!Number.isInteger(n)||n===0||n<-10000||n>9999) throw new Error(code);
  return n;
}
function empty(v){return v==null||v==="";}

function normalizeBoundary(raw,prefix){
  const year=historicalYear(raw?.[prefix],`P14_TERRITORY_YEAR_INVALID:${prefix}`);
  const suffixes=["month","day","granularity","certainty","calendar"];
  if(year==null){
    if(suffixes.some((suffix)=>!empty(raw?.[`${prefix}_${suffix}`]))) {
      throw new Error(`P14_TERRITORY_UNRESOLVED_BOUNDARY_PARTIAL:${prefix}`);
    }
    return Object.freeze({year:null,month:null,day:null,granularity:null,certainty:null,calendar:null,status:"unknown"});
  }
  const month=optionalInteger(raw?.[`${prefix}_month`],`P14_TERRITORY_MONTH_INVALID:${prefix}`,1,12);
  const day=optionalInteger(raw?.[`${prefix}_day`],`P14_TERRITORY_DAY_INVALID:${prefix}`,1,31);
  const granularity=text(raw?.[`${prefix}_granularity`]);
  const certainty=text(raw?.[`${prefix}_certainty`]);
  const calendar=text(raw?.[`${prefix}_calendar`]);
  if(!GRANULARITIES.has(granularity)) throw new Error(`P14_TERRITORY_GRANULARITY_INVALID:${prefix}`);
  if(!TEMPORAL_CERTAINTIES.has(certainty)) throw new Error(`P14_TERRITORY_TEMPORAL_CERTAINTY_INVALID:${prefix}`);
  if(!CALENDARS.has(calendar)) throw new Error(`P14_TERRITORY_CALENDAR_INVALID:${prefix}`);
  if(granularity==="year"&&(month!==null||day!==null)) throw new Error(`P14_TERRITORY_BOUNDARY_SHAPE_INVALID:${prefix}`);
  if(granularity==="month"&&(month===null||day!==null)) throw new Error(`P14_TERRITORY_BOUNDARY_SHAPE_INVALID:${prefix}`);
  if(granularity==="day"&&(month===null||day===null)) throw new Error(`P14_TERRITORY_BOUNDARY_SHAPE_INVALID:${prefix}`);
  return Object.freeze({year,month,day,granularity,certainty,calendar,status:"known"});
}

function compareKnownBoundaries(start,end){
  if(start.status!=="known"||end.status!=="known") return;
  if(end.year<start.year) throw new Error("P14_TERRITORY_INTERVAL_INVALID");
  if(end.year!==start.year||end.calendar!==start.calendar) return;
  if(start.month!==null&&end.month!==null&&end.month<start.month) throw new Error("P14_TERRITORY_INTERVAL_INVALID");
  if(start.month!==null&&end.month!==null&&start.month===end.month&&start.day!==null&&end.day!==null&&end.day<start.day) {
    throw new Error("P14_TERRITORY_INTERVAL_INVALID");
  }
}

function normalizeSourceRefs(raw,codePrefix){
  if(!Array.isArray(raw)||raw.length===0) throw new Error(`${codePrefix}_SOURCE_REQUIRED`);
  const seen=new Set();
  const refs=raw.map((item,index)=>{
    if(!item||typeof item!=="object"||Array.isArray(item)) throw new Error(`${codePrefix}_SOURCE_INVALID:${index+1}`);
    const source_id=uuid(item.source_id,`${codePrefix}_SOURCE_ID_INVALID:${index+1}`);
    const locator=text(item.locator??item.source_locator_key);
    if(!locator) throw new Error(`${codePrefix}_SOURCE_LOCATOR_REQUIRED:${index+1}`);
    const key=`${source_id}\u0000${locator}`;
    if(seen.has(key)) throw new Error(`${codePrefix}_SOURCE_DUPLICATE`);
    seen.add(key);
    return Object.freeze({source_id,locator});
  });
  refs.sort((a,b)=>a.source_id.localeCompare(b.source_id)||a.locator.localeCompare(b.locator));
  return Object.freeze(refs);
}

function normalizeGeometry(raw){
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new Error("P14_GEOMETRY_INVALID");
  for(const field of ["person_id","polity_id","activity_id","control_type","valid_start","valid_end","region_code","subregion_code","location_label"]) {
    if(raw[field]!=null) throw new Error(`P14_GEOMETRY_HISTORICAL_AUTHORITY_FORBIDDEN:${field}`);
  }
  if(raw.invented===true||raw.provenance?.invented===true) throw new Error("P14_INVENTED_GEOMETRY_FORBIDDEN");
  const geometry_kind=text(raw.geometry_kind);
  if(!KINDS.has(geometry_kind)) throw new Error("P14_GEOMETRY_KIND_INVALID");
  const geometry_ref=text(raw.geometry_ref);
  if(!geometry_ref) throw new Error("P14_GEOMETRY_REF_REQUIRED");
  const source_refs=normalizeSourceRefs(raw.source_refs,"P14_GEOMETRY");
  const geometry_id=raw.geometry_id==null?null:uuid(raw.geometry_id,"P14_GEOMETRY_ID_INVALID");
  return Object.freeze({geometry_id,geometry_kind,geometry_ref,source_refs});
}

function boundaryToken(boundary){
  if(boundary.status==="unknown") return "<UNKNOWN>";
  return [
    boundary.year,
    boundary.month==null?"_":boundary.month,
    boundary.day==null?"_":boundary.day,
    boundary.granularity,
    boundary.calendar
  ].join(":");
}

function normalizeTerritoryRecord(raw){
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new Error("P14_TERRITORY_RECORD_INVALID");
  if(raw.person_id!=null||raw.activity_id!=null) throw new Error("P14_PERSON_ACTIVITY_OWNED_TERRITORY_FORBIDDEN");
  for(const field of CONTRACT.territory_record.rules.display_fields_forbidden) {
    if(raw[field]!=null) throw new Error(`P14_DISPLAY_FIELD_IN_TERRITORY_FORBIDDEN:${field}`);
  }
  const polity_id=uuid(raw.polity_id,"P14_TERRITORY_POLITY_ID_INVALID");
  const geometry_id=uuid(raw.geometry_id,"P14_TERRITORY_GEOMETRY_ID_INVALID");
  const control_type=text(raw.control_type);
  if(!CONTROL.has(control_type)) throw new Error("P14_CONTROL_TYPE_INVALID");
  const boundary_certainty=text(raw.boundary_certainty);
  if(!BOUNDARY_CERTAINTY.has(boundary_certainty)) throw new Error("P14_BOUNDARY_CERTAINTY_INVALID");
  const evidence_confidence=text(raw.evidence_confidence);
  if(!EVIDENCE_CONFIDENCE.has(evidence_confidence)) throw new Error("P14_EVIDENCE_CONFIDENCE_INVALID");
  const chronology_status=text(raw.chronology_status)||"reviewed";
  if(!CHRONOLOGY.has(chronology_status)) throw new Error("P14_CHRONOLOGY_STATUS_INVALID");
  const start=normalizeBoundary(raw,"valid_start");
  const end=normalizeBoundary(raw,"valid_end");
  let ongoing_as_of=null;
  if(chronology_status==="ongoing"){
    if(end.status!=="unknown") throw new Error("P14_ONGOING_END_BOUNDARY_MUST_BE_UNRESOLVED");
    ongoing_as_of=text(raw.ongoing_as_of);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(ongoing_as_of)) throw new Error("P14_ONGOING_AS_OF_REQUIRED");
  } else if(raw.ongoing_as_of!=null&&text(raw.ongoing_as_of)) {
    throw new Error("P14_ONGOING_AS_OF_FORBIDDEN");
  }
  compareKnownBoundaries(start,end);
  const source_refs=normalizeSourceRefs(raw.source_refs,"P14_TERRITORY");
  const endToken=chronology_status==="ongoing"?"<ONGOING>":boundaryToken(end);
  const semantic_key=[
    "atlas-territory-record/v2",
    polity_id,
    geometry_id,
    control_type,
    boundaryToken(start),
    endToken
  ].join("\u001f");
  return Object.freeze({
    semantic_key,polity_id,geometry_id,control_type,boundary_certainty,evidence_confidence,
    valid_start:start.year,valid_start_month:start.month,valid_start_day:start.day,
    valid_start_granularity:start.granularity,valid_start_certainty:start.certainty,valid_start_calendar:start.calendar,
    valid_end:end.year,valid_end_month:end.month,valid_end_day:end.day,
    valid_end_granularity:end.granularity,valid_end_certainty:end.certainty,valid_end_calendar:end.calendar,
    chronology_status,ongoing_as_of,source_refs
  });
}

function assertTerritoryRecord(raw){normalizeTerritoryRecord(raw);return true;}
function assertGeometry(raw){normalizeGeometry(raw);return true;}
function assertTerritoryGeometryLink(territory,geometry){
  const t=normalizeTerritoryRecord(territory);
  const g=normalizeGeometry(geometry);
  if(!g.geometry_id||t.geometry_id!==g.geometry_id) throw new Error("P14_TERRITORY_GEOMETRY_LINK_MISMATCH");
  return true;
}

module.exports=Object.freeze({
  CONTRACT,STAGE2,UUID_RE,
  normalizeBoundary,normalizeSourceRefs,normalizeGeometry,normalizeTerritoryRecord,
  assertTerritoryRecord,assertGeometry,assertTerritoryGeometryLink
});
