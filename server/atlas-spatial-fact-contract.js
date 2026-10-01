"use strict";

const fs = require("node:fs");
const path = require("node:path");

const CONTRACT_PATH=path.resolve(__dirname,"../contracts/spatial-fact-contract.v1.json");
const CONTRACT=Object.freeze(JSON.parse(fs.readFileSync(CONTRACT_PATH,"utf8")));
const TERMINAL_STATES=new Set(CONTRACT.registration_handshake.required_terminal_states);

function text(v){return v==null?"":String(v).trim();}
function normalizeSpatialRegistrationHandshake(raw,{polityDisposition="reused"}={}){
  if(polityDisposition!=="created") return Object.freeze({required:false,state:"existing_polity"});
  if(!raw || typeof raw!=="object" || Array.isArray(raw)) throw new Error("HUMAN_AUTHORING_SPATIAL_DISPOSITION_REQUIRED");
  const state=text(raw.state);
  if(!TERMINAL_STATES.has(state)) throw new Error("HUMAN_AUTHORING_SPATIAL_DISPOSITION_INVALID");
  const evidence=text(raw.evidence);
  if(!evidence) throw new Error("HUMAN_AUTHORING_SPATIAL_DISPOSITION_EVIDENCE_REQUIRED");
  return Object.freeze({required:true,state,evidence});
}

function assertPolityPlaceFunction(raw){
  if(!raw || typeof raw!=="object" || Array.isArray(raw)) throw new Error("SPATIAL_POLITY_PLACE_FUNCTION_INVALID");
  for(const key of CONTRACT.historical_fact.required) if(raw[key]==null || (typeof raw[key]==="string"&&!text(raw[key]))) throw new Error(`SPATIAL_POLITY_PLACE_FUNCTION_REQUIRED:${key}`);
  if(!CONTRACT.historical_fact.function_types.includes(text(raw.function_type))) throw new Error("SPATIAL_POLITY_PLACE_FUNCTION_TYPE_INVALID");
  if(raw.region_code!=null || raw.subregion_code!=null || raw.location_label!=null) throw new Error("SPATIAL_POLITY_PLACE_FUNCTION_DISPLAY_FIELD_FORBIDDEN");
  if(!Array.isArray(raw.source_refs)||raw.source_refs.length===0) throw new Error("SPATIAL_POLITY_PLACE_FUNCTION_SOURCE_REQUIRED");
  return true;
}

module.exports=Object.freeze({CONTRACT,TERMINAL_STATES,normalizeSpatialRegistrationHandshake,assertPolityPlaceFunction});
