"use strict";

const P9_SEMANTIC_VERSION = "atlas-activity-semantic-key/v2";
const P9_MUTATION_BLOCK_CODE = "P9_LEGACY_ACTIVITY_MUTATION_RETIRED_USE_AUTHORING_MANIFEST_V2";
const RETIRED_ACTIVITY_WRITE_OPERATIONS = new Set(["create","update","import","reconcile"]);

function base(operation,payload){
  return {
    available:true,
    operation,
    commit:false,
    writes_performed:0,
    target_schema:"atlas_v2",
    commands:[],
    blockers:[],
    warnings:[],
    normalized_payload:payload ?? null
  };
}

function blocked(operation,payload){
  const out=base(operation,payload);
  out.blockers.push({code:P9_MUTATION_BLOCK_CODE,semantic_version:P9_SEMANTIC_VERSION});
  return Object.freeze(out);
}

function plan(operation,payload){
  const op=String(operation||"").trim().toLowerCase();
  if(RETIRED_ACTIVITY_WRITE_OPERATIONS.has(op)) return blocked(op,payload);
  const out=base(op,payload);
  if(op==="delete"){
    const id=payload?.id ?? null;
    if(id==null || id===""){
      out.blockers.push({code:"RELATIONSHIP_ID_REQUIRED",field:"id"});
      return Object.freeze(out);
    }
    out.normalized_payload={id};
    out.commands.push({
      type:"DELETE_PERSON_POLITICS_V2_BY_ID",
      table:"atlas_v2.person_politics_v2",
      relationship_id:id
    });
    return Object.freeze(out);
  }
  out.blockers.push({code:"UNSUPPORTED_OPERATION",operation:op});
  return Object.freeze(out);
}

module.exports=Object.freeze({
  plan,
  P9_SEMANTIC_VERSION,
  P9_MUTATION_BLOCK_CODE,
  RETIRED_ACTIVITY_WRITE_OPERATIONS
});
