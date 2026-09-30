"use strict";
const fs=require("node:fs");const path=require("node:path");
const CONTRACT=Object.freeze(JSON.parse(fs.readFileSync(path.resolve(__dirname,"../contracts/p14-territory-geometry-contract.v1.json"),"utf8")));
const CONTROL=new Set(CONTRACT.territory_record.control_types),CERTAINTY=new Set(CONTRACT.territory_record.boundary_certainty),CONFIDENCE=new Set(CONTRACT.territory_record.evidence_confidence),KINDS=new Set(CONTRACT.geometry.geometry_kinds);
function text(v){return v==null?"":String(v).trim()}
function year(v,key){if(!Number.isInteger(v)||v===0)throw new Error("P14_TERRITORY_YEAR_INVALID:"+key);return v}
function assertTerritoryRecord(raw){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("P14_TERRITORY_RECORD_INVALID");
 for(const k of CONTRACT.territory_record.required)if(raw[k]==null||(typeof raw[k]==="string"&&!text(raw[k])))throw new Error("P14_TERRITORY_REQUIRED:"+k);
 if(raw.person_id!=null||raw.activity_id!=null)throw new Error("P14_PERSON_ACTIVITY_OWNED_TERRITORY_FORBIDDEN");
 for(const k of CONTRACT.territory_record.rules.display_fields_forbidden)if(raw[k]!=null)throw new Error("P14_DISPLAY_FIELD_IN_TERRITORY_FORBIDDEN:"+k);
 if(!CONTROL.has(text(raw.control_type)))throw new Error("P14_CONTROL_TYPE_INVALID");
 if(!CERTAINTY.has(text(raw.boundary_certainty)))throw new Error("P14_BOUNDARY_CERTAINTY_INVALID");
 if(!CONFIDENCE.has(text(raw.evidence_confidence)))throw new Error("P14_EVIDENCE_CONFIDENCE_INVALID");
 const a=year(raw.valid_start,"valid_start"),b=year(raw.valid_end,"valid_end");if(b<a)throw new Error("P14_TERRITORY_INTERVAL_INVALID");
 if(!Array.isArray(raw.source_refs)||raw.source_refs.length===0||raw.source_refs.some(x=>!text(x)))throw new Error("P14_TERRITORY_SOURCE_REQUIRED");
 return true;
}
function assertGeometry(raw){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("P14_GEOMETRY_INVALID");
 for(const k of CONTRACT.geometry.required)if(raw[k]==null||(typeof raw[k]==="string"&&!text(raw[k])))throw new Error("P14_GEOMETRY_REQUIRED:"+k);
 if(raw.person_id!=null||raw.polity_id!=null||raw.control_type!=null||raw.valid_start!=null||raw.valid_end!=null)throw new Error("P14_GEOMETRY_HISTORICAL_AUTHORITY_FORBIDDEN");
 if(!KINDS.has(text(raw.geometry_kind)))throw new Error("P14_GEOMETRY_KIND_INVALID");
 if(raw.provenance?.invented===true||raw.invented===true)throw new Error("P14_INVENTED_GEOMETRY_FORBIDDEN");
 return true;
}
function assertTerritoryGeometryLink(territory,geometry){assertTerritoryRecord(territory);assertGeometry(geometry);if(text(territory.geometry_id)!==text(geometry.geometry_id))throw new Error("P14_TERRITORY_GEOMETRY_LINK_MISMATCH");return true}
module.exports=Object.freeze({CONTRACT,assertTerritoryRecord,assertGeometry,assertTerritoryGeometryLink});
