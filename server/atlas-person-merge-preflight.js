"use strict";

const { executeApprovedPersonMerge } = require("./atlas-person-merge-service.js");

async function inspectCandidateRelationshipConflicts({ client, candidateId } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client with query() is required");
  const candidate = String(candidateId || "").trim();
  const pair = await client.query(`
    select person_low_id,person_high_id
      from atlas_v2.person_duplicate_candidates
     where id=$1
  `, [candidate]);
  if (pair.rowCount !== 1) throw new Error("candidate not found");
  const lowId = String(pair.rows[0].person_low_id);
  const highId = String(pair.rows[0].person_high_id);

  const result = await client.query(`
    select
      l.id as low_relationship_id,
      h.id as high_relationship_id,
      l.polity_id,
      l.period_basis_id,
      l.activity_start,
      l.activity_end,
      l.role_id as low_role_id,
      h.role_id as high_role_id,
      case
        when l.role_id is not distinct from h.role_id then 'EXACT_RELATIONSHIP'
        else 'SAME_CONTEXT_ROLE_VARIANT'
      end as conflict_kind
    from atlas_v2.person_politics_v2 l
    join atlas_v2.person_politics_v2 h
      on h.person_id=$2
     and h.polity_id=l.polity_id
     and h.period_basis_id=l.period_basis_id
     and h.activity_start=l.activity_start
     and h.activity_end=l.activity_end
    where l.person_id=$1
    order by l.activity_start,l.activity_end,l.polity_id,l.id,h.id
    limit 100
  `, [lowId, highId]);

  const conflicts = result.rows || [];
  return {
    person_low_id: lowId,
    person_high_id: highId,
    conflicts,
    exact_relationship_conflicts: conflicts.filter((row) => row.conflict_kind === "EXACT_RELATIONSHIP").length,
    same_context_role_variants: conflicts.filter((row) => row.conflict_kind === "SAME_CONTEXT_ROLE_VARIANT").length,
    requires_relationship_reconciliation: conflicts.length > 0
  };
}

async function executePreflightedApprovedPersonMerge(args = {}) {
  const preflight = await inspectCandidateRelationshipConflicts(args);
  if (preflight.requires_relationship_reconciliation) {
    const error = new Error(
      `relationship reconciliation required before person merge (${preflight.conflicts.length} same-context conflict${preflight.conflicts.length === 1 ? "" : "s"})`
    );
    error.code = "RELATIONSHIP_RECONCILIATION_REQUIRED";
    error.collisions = preflight.conflicts;
    throw error;
  }
  return executeApprovedPersonMerge(args);
}

module.exports = Object.freeze({
  inspectCandidateRelationshipConflicts,
  executePreflightedApprovedPersonMerge
});
