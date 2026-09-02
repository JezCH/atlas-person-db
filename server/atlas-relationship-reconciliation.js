"use strict";

const crypto = require("node:crypto");
const { canonicalSemanticParts, readiness, SEMANTIC_KEY_VERSION } = require("./atlas-activity-semantic-key-v2.js");

const ACTIONS = new Set(["KEEP_DISTINCT_ROLES", "KEEP_ONE_RELATIONSHIP"]);
const RECONCILIATION_SEMANTIC_VERSION = "v2-relation-full-temporal";
const id = (value) => value == null ? null : String(value).toLowerCase();

function reconciliationReadiness(row) {
  const status = readiness(row);
  return Object.freeze({ ready:status.ready, semantic_key_version:SEMANTIC_KEY_VERSION, reasons:status.reasons });
}

function contextKey(row) {
  const status = reconciliationReadiness(row);
  if (!status.ready) return `__P9_NOT_READY__|${id(row?.id) || crypto.randomUUID()}`;
  const parts = canonicalSemanticParts(row);
  // canonical parts: version, person, polity, relation, role, period, start, end.
  // Person is intentionally omitted because these groups compare two Person candidates.
  // Role stays separate so KEEP_DISTINCT_ROLES can adjudicate variants explicitly.
  return [parts[2],parts[3],parts[5],parts[6],parts[7]].join("|");
}

function roleKey(row) { return id(row.role_id) || "__NULL_ROLE__"; }

function fingerprintProjection(row) {
  return {
    id:id(row.id), person_id:id(row.person_id), polity_id:id(row.polity_id), relation_type_id:id(row.relation_type_id),
    role_id:id(row.role_id), period_basis_id:id(row.period_basis_id),
    activity_start:Number(row.activity_start), activity_start_month:row.activity_start_month==null?null:Number(row.activity_start_month), activity_start_day:row.activity_start_day==null?null:Number(row.activity_start_day),
    activity_start_granularity:row.activity_start_granularity==null?null:String(row.activity_start_granularity), activity_start_calendar:row.activity_start_calendar==null?null:String(row.activity_start_calendar),
    activity_end:row.activity_end == null ? null : Number(row.activity_end), activity_end_month:row.activity_end_month==null?null:Number(row.activity_end_month), activity_end_day:row.activity_end_day==null?null:Number(row.activity_end_day),
    ...(row.chronology_status === "ongoing" ? { chronology_status:"ongoing" } : {}),
    activity_end_granularity:row.activity_end_granularity==null?null:String(row.activity_end_granularity), activity_end_calendar:row.activity_end_calendar==null?null:String(row.activity_end_calendar)
  };
}

function groupFingerprint(rows) {
  const canonical=rows.map(fingerprintProjection).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function buildRelationshipReconciliationGroups({ rows=[], lowPersonId, highPersonId }={}) {
  const low=String(lowPersonId||"").toLowerCase(), high=String(highPersonId||"").toLowerCase(), byContext=new Map();
  for(const row of rows){const personId=id(row.person_id);if(personId!==low&&personId!==high)continue;const key=contextKey(row),list=byContext.get(key)||[];list.push({...row,id:id(row.id),person_id:personId,role_id:id(row.role_id)});byContext.set(key,list);}
  const groups=[];
  for(const [context_key,list] of byContext){
    if(context_key.startsWith("__P9_NOT_READY__|"))continue;
    if(!list.some(r=>r.person_id===low)||!list.some(r=>r.person_id===high))continue;
    const byRole=new Map();for(const row of list){const key=roleKey(row),roleRows=byRole.get(key)||[];roleRows.push(row);byRole.set(key,roleRows);}
    const sorted=[...list].sort((a,b)=>a.id.localeCompare(b.id));
    const exactDuplicateRoleGroups=[...byRole.entries()].filter(([,roleRows])=>roleRows.length>1).map(([role_key,roleRows])=>({role_key,role_id:roleRows[0].role_id,relationships:[...roleRows].sort((a,b)=>a.id.localeCompare(b.id))}));
    groups.push({context_key,group_fingerprint:groupFingerprint(sorted),semantic_version:RECONCILIATION_SEMANTIC_VERSION,semantic_key_version:SEMANTIC_KEY_VERSION,polity_id:id(sorted[0].polity_id),relation_type_id:id(sorted[0].relation_type_id),period_basis_id:id(sorted[0].period_basis_id),activity_start:Number(sorted[0].activity_start),activity_end:sorted[0].activity_end == null ? null : Number(sorted[0].activity_end),has_exact_role_duplicates:exactDuplicateRoleGroups.length>0,has_role_variants:byRole.size>1,exact_duplicate_role_groups:exactDuplicateRoleGroups,relationships:sorted});
  }
  return groups.sort((a,b)=>a.activity_start-b.activity_start||a.activity_end-b.activity_end||a.context_key.localeCompare(b.context_key));
}

function normalizeResolutions(resolutions){
  if(resolutions==null)return[];if(!Array.isArray(resolutions))throw new Error("relationship_resolutions must be an array");
  return resolutions.map(item=>{const group_fingerprint=String(item?.group_fingerprint||"").trim(),action=String(item?.action||"").trim().toUpperCase(),keep_relationship_id=item?.keep_relationship_id==null?null:String(item.keep_relationship_id).trim(),keep_relationship_ids=Array.isArray(item?.keep_relationship_ids)?[...new Set(item.keep_relationship_ids.map(v=>String(v||"").trim()).filter(Boolean))].sort():[];if(!/^[0-9a-f]{64}$/i.test(group_fingerprint))throw new Error("valid relationship group_fingerprint is required");if(!ACTIONS.has(action))throw new Error("relationship resolution action must be KEEP_DISTINCT_ROLES or KEEP_ONE_RELATIONSHIP");if(action==="KEEP_ONE_RELATIONSHIP"&&!keep_relationship_id)throw new Error("keep_relationship_id is required for KEEP_ONE_RELATIONSHIP");if(action==="KEEP_ONE_RELATIONSHIP"&&keep_relationship_ids.length)throw new Error("keep_relationship_ids is only valid for KEEP_DISTINCT_ROLES");return{group_fingerprint,action,keep_relationship_id,keep_relationship_ids};});
}

function buildReconciliationPlan({groups=[],resolutions=[]}={}){
  const normalized=normalizeResolutions(resolutions),resolutionByGroup=new Map();for(const item of normalized){if(resolutionByGroup.has(item.group_fingerprint))throw new Error("duplicate relationship resolution group");resolutionByGroup.set(item.group_fingerprint,item);}if(resolutionByGroup.size!==groups.length)throw new Error("every relationship conflict group requires exactly one resolution");
  const coalesces=[],applied=[];
  for(const group of groups){if(group.semantic_version!==RECONCILIATION_SEMANTIC_VERSION)throw new Error("relationship reconciliation group semantic version is stale");const resolution=resolutionByGroup.get(group.group_fingerprint);if(!resolution)throw new Error("relationship resolution group is stale or missing");const relationshipIds=new Set(group.relationships.map(r=>r.id));
    if(resolution.action==="KEEP_ONE_RELATIONSHIP"){if(!relationshipIds.has(resolution.keep_relationship_id))throw new Error("keep_relationship_id does not belong to its relationship conflict group");for(const row of group.relationships)if(row.id!==resolution.keep_relationship_id)coalesces.push({group_fingerprint:group.group_fingerprint,keep_relationship_id:resolution.keep_relationship_id,drop_relationship_id:row.id});}
    else{const selected=new Set(resolution.keep_relationship_ids),requiredRoleGroups=group.exact_duplicate_role_groups||[];if(selected.size!==requiredRoleGroups.length)throw new Error("KEEP_DISTINCT_ROLES requires exactly one explicit representative for every duplicated role");for(const duplicateRoleGroup of requiredRoleGroups){const ids=new Set(duplicateRoleGroup.relationships.map(r=>r.id)),keepIds=[...selected].filter(selectedId=>ids.has(selectedId));if(keepIds.length!==1)throw new Error("KEEP_DISTINCT_ROLES representative does not match exactly one duplicated role group");const keepId=keepIds[0];for(const row of duplicateRoleGroup.relationships)if(row.id!==keepId)coalesces.push({group_fingerprint:group.group_fingerprint,keep_relationship_id:keepId,drop_relationship_id:row.id});}for(const selectedId of selected)if(!relationshipIds.has(selectedId))throw new Error("KEEP_DISTINCT_ROLES representative does not belong to its relationship conflict group");}
    applied.push({...resolution,context_key:group.context_key,semantic_version:RECONCILIATION_SEMANTIC_VERSION});
  }
  const dropped=new Set();for(const item of coalesces){if(dropped.has(item.drop_relationship_id))throw new Error("relationship reconciliation plan would drop the same relationship twice");dropped.add(item.drop_relationship_id);}return{semantic_version:RECONCILIATION_SEMANTIC_VERSION,resolutions:applied,coalesces};
}

module.exports=Object.freeze({ACTIONS,RECONCILIATION_SEMANTIC_VERSION,contextKey,roleKey,groupFingerprint,reconciliationReadiness,buildRelationshipReconciliationGroups,normalizeResolutions,buildReconciliationPlan});
