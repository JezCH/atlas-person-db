"use strict";

const crypto = require("node:crypto");
const { assertPersonMergeReferenceReadiness } = require("./atlas-person-merge-reference-readiness.js");
const { lockPersonDuplicateFrontier } = require("./atlas-person-duplicate-frontier-lock.js");
const { refreshCandidateFrontier } = require("./atlas-duplicate-review-service.js");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function outcomeBase({ requestId, committed, v2, verification = null, validationFailures = [], transactionFailure = null, rollback = false }) {
  return Object.freeze({
    marker: "ATLAS_PERSON_DELETE_SERVICE",
    write_mode: "v2-only",
    request_id: requestId,
    operation: "delete_person",
    committed,
    legacy: { attempted: false, committed: false, record_ids: [] },
    v2: v2 || { committed: false, normalized_relationship_ids: [] },
    verification,
    parity: null,
    rollback,
    validation_failures: validationFailures,
    transaction_failure: transactionFailure
  });
}

function blocked(requestId, code, detail = null) {
  return outcomeBase({
    requestId,
    committed: false,
    validationFailures: [{ code, ...(detail == null ? {} : { detail }) }]
  });
}

async function deleteIds(client, table, column, ids) {
  if (!ids.length) return 0;
  const result = await client.query(`delete from ${table} where ${column}=any($1::uuid[])`, [ids]);
  return result.rowCount;
}

async function collectIds(client, sql, params) {
  const result = await client.query(sql, params);
  return (result.rows || []).map((row) => String(row.id));
}

async function verifyNoLiveReferences(client, personId) {
  const result = await client.query(`
    select
      (select count(*)::int from atlas_v2.persons where id=$1) as persons,
      (select count(*)::int from atlas_v2.person_names where person_id=$1) as names,
      (select count(*)::int from atlas_v2.person_sources where person_id=$1) as person_sources,
      (select count(*)::int from atlas_v2.person_descriptions where person_id=$1) as person_descriptions,
      (select count(*)::int from atlas_v2.person_politics_v2 where person_id=$1) as activities,
      (select count(*)::int from atlas_v2.person_people_affiliations where person_id=$1) as people_affiliations,
      (select count(*)::int from atlas_v2.person_event_participations where person_id=$1) as event_participations,
      (select count(*)::int from atlas_v2.authoring_manifest_runs where person_id=$1) as authoring_person_refs,
      (select count(*)::int from atlas_v2.person_duplicate_candidates where candidate_state='ACTIVE' and (person_low_id=$1 or person_high_id=$1)) as active_duplicate_candidates,
      (select count(*)::int from atlas_v2.person_duplicate_revalidation_requirements where requirement_state='ACTIVE' and (person_low_id=$1 or person_high_id=$1)) as active_revalidation_requirements
  `, [personId]);
  const counts = result.rows[0] || {};
  return {
    counts,
    match: Object.values(counts).every((value) => Number(value || 0) === 0)
  };
}

function createPersonDeleteService({ client } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client with query() is required");

  async function mutate(request = {}) {
    const requestId = String(request.request_id || crypto.randomUUID());
    if (String(request.operation || "") !== "delete_person") return blocked(requestId, "PERSON_DELETE_OPERATION_REQUIRED");

    const personId = String(request.payload?.person_id || "").trim();
    const confirmationName = String(request.payload?.confirmation_name || "").trim();
    if (!UUID_RE.test(personId)) return blocked(requestId, "PERSON_ID_REQUIRED");
    if (!confirmationName) return blocked(requestId, "PERSON_DELETE_CONFIRMATION_NAME_REQUIRED");

    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    try {
      await assertPersonMergeReferenceReadiness(client);
      await lockPersonDuplicateFrontier(client);

      const person = await client.query(`
        select id,canonical_key,person_type,historicity
          from atlas_v2.persons
         where id=$1
         for update`, [personId]);
      if (person.rowCount !== 1) {
        await client.query("ROLLBACK");
        return blocked(requestId, "PERSON_DELETE_TARGET_NOT_FOUND");
      }

      const names = await client.query(`
        select id,name,locale,is_preferred
          from atlas_v2.person_names
         where person_id=$1
         order by is_preferred desc,locale,name,id
         for update`, [personId]);
      const nameRows = names.rows || [];
      const confirmationMatches = nameRows.some((row) => String(row.name).trim() === confirmationName);
      if (!confirmationMatches) {
        await client.query("ROLLBACK");
        return blocked(requestId, "PERSON_DELETE_CONFIRMATION_MISMATCH", confirmationName);
      }

      const relationshipIds = await collectIds(client,
        `select id from atlas_v2.person_politics_v2 where person_id=$1 order by id for update`, [personId]);
      const affiliationIds = await collectIds(client,
        `select id from atlas_v2.person_people_affiliations where person_id=$1 order by id for update`, [personId]);
      const participationIds = await collectIds(client,
        `select id from atlas_v2.person_event_participations where person_id=$1 order by id for update`, [personId]);

      const deleted = {
        relationship_sources: await deleteIds(client, "atlas_v2.person_politics_sources", "person_politics_id", relationshipIds),
        chronology_claims: await deleteIds(client, "atlas_v2.chronology_claims", "person_politics_id", relationshipIds),
        relationship_descriptions: await deleteIds(client, "atlas_v2.relationship_descriptions", "person_politics_id", relationshipIds),
        people_affiliation_sources: await deleteIds(client, "atlas_v2.person_people_affiliation_sources", "person_people_affiliation_id", affiliationIds),
        event_participation_sources: await deleteIds(client, "atlas_v2.person_event_participation_sources", "person_event_participation_id", participationIds)
      };

      if (relationshipIds.length) {
        const ledger = await client.query(`update atlas_v2.authoring_manifest_runs set relationship_id=null where relationship_id=any($1::uuid[]) returning request_id`, [relationshipIds]);
        deleted.authoring_relationship_refs_cleared = ledger.rowCount;
      } else {
        deleted.authoring_relationship_refs_cleared = 0;
      }

      deleted.activities = (await client.query(`delete from atlas_v2.person_politics_v2 where person_id=$1 returning id`, [personId])).rowCount;
      deleted.people_affiliations = (await client.query(`delete from atlas_v2.person_people_affiliations where person_id=$1 returning id`, [personId])).rowCount;
      deleted.event_participations = (await client.query(`delete from atlas_v2.person_event_participations where person_id=$1 returning id`, [personId])).rowCount;
      deleted.person_sources = (await client.query(`delete from atlas_v2.person_sources where person_id=$1 returning source_id`, [personId])).rowCount;
      deleted.person_descriptions = (await client.query(`delete from atlas_v2.person_descriptions where person_id=$1 returning id`, [personId])).rowCount;
      deleted.person_names = (await client.query(`delete from atlas_v2.person_names where person_id=$1 returning id`, [personId])).rowCount;
      deleted.authoring_person_refs_cleared = (await client.query(`update atlas_v2.authoring_manifest_runs set person_id=null where person_id=$1 returning request_id`, [personId])).rowCount;
      deleted.revalidation_requirements_retired = (await client.query(`
        update atlas_v2.person_duplicate_revalidation_requirements
           set requirement_state='RETIRED',updated_at=now()
         where requirement_state='ACTIVE' and (person_low_id=$1 or person_high_id=$1)
         returning requirement_key`, [personId])).rowCount;

      const personDelete = await client.query(`delete from atlas_v2.persons where id=$1 returning id`, [personId]);
      if (personDelete.rowCount !== 1) throw new Error("Person delete did not affect exactly one row");
      deleted.persons = personDelete.rowCount;

      const frontier = await refreshCandidateFrontier(client);
      const verification = await verifyNoLiveReferences(client, personId);
      if (!verification.match) {
        const error = new Error(`PERSON_DELETE_VERIFICATION_FAILED:${JSON.stringify(verification.counts)}`);
        error.code = "PERSON_DELETE_VERIFICATION_FAILED";
        throw error;
      }

      await client.query("COMMIT");
      return outcomeBase({
        requestId,
        committed: true,
        v2: {
          committed: true,
          normalized_relationship_ids: relationshipIds,
          deleted_person_id: personId,
          deleted_counts: deleted,
          duplicate_frontier: {
            detected: frontier.detected.length,
            staled: frontier.staled,
            active_requirements: frontier.active_requirements
          }
        },
        verification: { checked: true, match: true, remaining_live_references: verification.counts }
      });
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      return outcomeBase({
        requestId,
        committed: false,
        rollback: true,
        transactionFailure: error?.message || String(error)
      });
    }
  }

  return Object.freeze({ mutate });
}

module.exports = Object.freeze({ createPersonDeleteService, verifyNoLiveReferences });
