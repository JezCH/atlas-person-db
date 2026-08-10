"use strict";

const crypto = require("node:crypto");

const ACTIONS = new Set(["KEEP_DISTINCT_ROLES", "KEEP_ONE_RELATIONSHIP"]);

function id(value) {
  return value == null ? null : String(value);
}

function contextKey(row) {
  return [
    id(row.polity_id),
    id(row.period_basis_id),
    Number(row.activity_start),
    Number(row.activity_end)
  ].join("|");
}

function roleKey(row) {
  return id(row.role_id) || "__NULL_ROLE__";
}

function groupFingerprint(rows) {
  const canonical = rows
    .map((row) => ({
      id: id(row.id),
      person_id: id(row.person_id),
      polity_id: id(row.polity_id),
      role_id: id(row.role_id),
      period_basis_id: id(row.period_basis_id),
      activity_start: Number(row.activity_start),
      activity_end: Number(row.activity_end)
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function buildRelationshipReconciliationGroups({ rows = [], lowPersonId, highPersonId } = {}) {
  const low = String(lowPersonId || "");
  const high = String(highPersonId || "");
  const byContext = new Map();
  for (const row of rows) {
    const personId = id(row.person_id);
    if (personId !== low && personId !== high) continue;
    const key = contextKey(row);
    const list = byContext.get(key) || [];
    list.push({ ...row, id: id(row.id), person_id: personId, role_id: id(row.role_id) });
    byContext.set(key, list);
  }

  const groups = [];
  for (const [context_key, list] of byContext) {
    const hasLow = list.some((row) => row.person_id === low);
    const hasHigh = list.some((row) => row.person_id === high);
    if (!hasLow || !hasHigh) continue;
    const roleCounts = new Map();
    for (const row of list) roleCounts.set(roleKey(row), (roleCounts.get(roleKey(row)) || 0) + 1);
    const distinctRoles = new Set(list.map(roleKey));
    const sorted = [...list].sort((a, b) => a.id.localeCompare(b.id));
    groups.push({
      context_key,
      group_fingerprint: groupFingerprint(sorted),
      polity_id: id(sorted[0].polity_id),
      period_basis_id: id(sorted[0].period_basis_id),
      activity_start: Number(sorted[0].activity_start),
      activity_end: Number(sorted[0].activity_end),
      has_exact_role_duplicates: [...roleCounts.values()].some((count) => count > 1),
      has_role_variants: distinctRoles.size > 1,
      relationships: sorted
    });
  }
  return groups.sort((a, b) => a.activity_start - b.activity_start || a.activity_end - b.activity_end || a.context_key.localeCompare(b.context_key));
}

function normalizeResolutions(resolutions) {
  if (resolutions == null) return [];
  if (!Array.isArray(resolutions)) throw new Error("relationship_resolutions must be an array");
  return resolutions.map((item) => {
    const group_fingerprint = String(item?.group_fingerprint || "").trim();
    const action = String(item?.action || "").trim().toUpperCase();
    const keep_relationship_id = item?.keep_relationship_id == null ? null : String(item.keep_relationship_id).trim();
    if (!/^[0-9a-f]{64}$/i.test(group_fingerprint)) throw new Error("valid relationship group_fingerprint is required");
    if (!ACTIONS.has(action)) throw new Error("relationship resolution action must be KEEP_DISTINCT_ROLES or KEEP_ONE_RELATIONSHIP");
    if (action === "KEEP_ONE_RELATIONSHIP" && !keep_relationship_id) throw new Error("keep_relationship_id is required for KEEP_ONE_RELATIONSHIP");
    return { group_fingerprint, action, keep_relationship_id };
  });
}

function choosePreferredRelationship(rows, survivorPersonId) {
  const survivor = String(survivorPersonId);
  return [...rows].sort((a, b) => {
    const aSurvivor = a.person_id === survivor ? 0 : 1;
    const bSurvivor = b.person_id === survivor ? 0 : 1;
    return aSurvivor - bSurvivor || a.id.localeCompare(b.id);
  })[0];
}

function buildReconciliationPlan({ groups = [], resolutions = [], survivorPersonId } = {}) {
  const normalized = normalizeResolutions(resolutions);
  const resolutionByGroup = new Map();
  for (const item of normalized) {
    if (resolutionByGroup.has(item.group_fingerprint)) throw new Error("duplicate relationship resolution group");
    resolutionByGroup.set(item.group_fingerprint, item);
  }
  if (resolutionByGroup.size !== groups.length) throw new Error("every relationship conflict group requires exactly one resolution");

  const coalesces = [];
  const applied = [];
  for (const group of groups) {
    const resolution = resolutionByGroup.get(group.group_fingerprint);
    if (!resolution) throw new Error("relationship resolution group is stale or missing");
    const relationshipIds = new Set(group.relationships.map((row) => row.id));

    if (resolution.action === "KEEP_ONE_RELATIONSHIP") {
      if (!relationshipIds.has(resolution.keep_relationship_id)) throw new Error("keep_relationship_id does not belong to its relationship conflict group");
      for (const row of group.relationships) {
        if (row.id !== resolution.keep_relationship_id) {
          coalesces.push({ group_fingerprint: group.group_fingerprint, keep_relationship_id: resolution.keep_relationship_id, drop_relationship_id: row.id });
        }
      }
    } else {
      const byRole = new Map();
      for (const row of group.relationships) {
        const key = roleKey(row);
        const list = byRole.get(key) || [];
        list.push(row);
        byRole.set(key, list);
      }
      for (const rows of byRole.values()) {
        if (rows.length < 2) continue;
        const keep = choosePreferredRelationship(rows, survivorPersonId);
        for (const row of rows) {
          if (row.id !== keep.id) {
            coalesces.push({ group_fingerprint: group.group_fingerprint, keep_relationship_id: keep.id, drop_relationship_id: row.id });
          }
        }
      }
    }
    applied.push({ ...resolution, context_key: group.context_key });
  }

  const dropped = new Set();
  for (const item of coalesces) {
    if (dropped.has(item.drop_relationship_id)) throw new Error("relationship reconciliation plan would drop the same relationship twice");
    dropped.add(item.drop_relationship_id);
  }
  return { resolutions: applied, coalesces };
}

module.exports = Object.freeze({
  ACTIONS,
  contextKey,
  groupFingerprint,
  buildRelationshipReconciliationGroups,
  normalizeResolutions,
  buildReconciliationPlan
});
