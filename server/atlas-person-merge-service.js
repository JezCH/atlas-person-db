"use strict";

const crypto = require("node:crypto");
const { detectPersonDuplicateCandidates, stableFingerprint } = require("./atlas-duplicate-detector.js");
const {
  buildRelationshipReconciliationGroups,
  buildReconciliationPlan,
  normalizeResolutions
} = require("./atlas-relationship-reconciliation.js");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EXPECTED_PERSON_FKS = new Set([
  "person_descriptions.person_id",
  "person_names.person_id",
  "person_politics_v2.person_id",
  "person_sources.person_id"
]);

function validUuid(value, label) {
  const normalized = String(value || "").trim();
  if (!UUID_RE.test(normalized)) throw new Error(`${label} must be a valid UUID`);
  return normalized;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalJson(value[key])]));
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(canonicalJson(value));
}

function resolveMergeSides(candidate, survivorPersonId) {
  const survivor = validUuid(survivorPersonId, "survivor_person_id");
  const low = String(candidate?.person_low_id || "");
  const high = String(candidate?.person_high_id || "");
  if (survivor !== low && survivor !== high) throw new Error("survivor_person_id must be one of the approved candidate persons");
  return Object.freeze({ survivor_person_id: survivor, source_person_id: survivor === low ? high : low });
}

async function ensureMergeSchema(client) {
  const object = await client.query(`select to_regclass('atlas_v2.person_merge_audits')::text as merge_audits`);
  if (!object.rows[0]?.merge_audits) throw new Error("PHASE9B_SCHEMA_REQUIRED: person merge audit schema is not applied");
  const fks = await client.query(`
    select c.relname as table_name,a.attname as column_name
      from pg_constraint con
      join pg_class c on c.oid=con.conrelid
      join unnest(con.conkey) with ordinality u(attnum,ord) on true
      join pg_attribute a on a.attrelid=con.conrelid and a.attnum=u.attnum
     where con.contype='f' and con.confrelid='atlas_v2.persons'::regclass
     order by c.relname,a.attname`);
  const actual = new Set(fks.rows.map((row) => `${row.table_name}.${row.column_name}`));
  const unexpected = [...actual].filter((key) => !EXPECTED_PERSON_FKS.has(key));
  const missing = [...EXPECTED_PERSON_FKS].filter((key) => !actual.has(key));
  if (unexpected.length || missing.length) throw new Error(`person reference schema drift: unexpected=[${unexpected.join(",")}], missing=[${missing.join(",")}]`);
}

async function snapshotPerson(client, personId) {
  const [person, names, sources, descriptions, relationships, relationshipSources, chronologyClaims, relationshipDescriptions] = await Promise.all([
    client.query(`select id,canonical_key,person_type,historicity from atlas_v2.persons where id=$1`, [personId]),
    client.query(`select id,locale,name,name_type,is_preferred from atlas_v2.person_names where person_id=$1 order by locale,is_preferred desc,name,name_type,id`, [personId]),
    client.query(`select source_id from atlas_v2.person_sources where person_id=$1 order by source_id`, [personId]),
    client.query(`select id,locale,content from atlas_v2.person_descriptions where person_id=$1 order by locale,id`, [personId]),
    client.query(`select id,polity_id,role_id,period_basis_id,activity_start,activity_end,confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash from atlas_v2.person_politics_v2 where person_id=$1 order by activity_start,activity_end,polity_id,role_id,id`, [personId]),
    client.query(`select pps.person_politics_id,pps.source_id,pps.source_locator_key from atlas_v2.person_politics_sources pps join atlas_v2.person_politics_v2 pp on pp.id=pps.person_politics_id where pp.person_id=$1 order by pps.person_politics_id,pps.source_id`, [personId]),
    client.query(`select cc.id,cc.person_politics_id,cc.claim_type,cc.start_year,cc.end_year from atlas_v2.chronology_claims cc join atlas_v2.person_politics_v2 pp on pp.id=cc.person_politics_id where pp.person_id=$1 order by cc.person_politics_id,cc.id`, [personId]),
    client.query(`select rd.id,rd.person_politics_id,rd.locale,rd.content from atlas_v2.relationship_descriptions rd join atlas_v2.person_politics_v2 pp on pp.id=rd.person_politics_id where pp.person_id=$1 order by rd.person_politics_id,rd.locale,rd.id`, [personId])
  ]);
  if (person.rowCount !== 1) throw new Error("merge person not found");
  return {
    person: person.rows[0],
    names: names.rows,
    sources: sources.rows,
    descriptions: descriptions.rows,
    relationships: relationships.rows,
    relationship_sources: relationshipSources.rows,
    chronology_claims: chronologyClaims.rows,
    relationship_descriptions: relationshipDescriptions.rows
  };
}

async function globalCounts(client) {
  const result = await client.query(`select
    (select count(*)::int from atlas_v2.persons) as persons,
    (select count(*)::int from atlas_v2.person_politics_v2) as relationships,
    (select count(*)::int from atlas_v2.chronology_claims) as chronology_claims,
    (select count(*)::int from atlas_v2.person_politics_sources) as relationship_sources,
    (select count(*)::int from atlas_v2.relationship_descriptions) as relationship_descriptions`);
  return result.rows[0];
}

async function lockLiveMergeState(client, personIds) {
  const names = await client.query(`
    select person_id,name,locale,is_preferred
      from atlas_v2.person_names
     where person_id=any($1::uuid[])
     order by person_id,is_preferred desc,locale,name
     for update`, [personIds]);
  const relationships = await client.query(`
    select id,person_id,polity_id,role_id,period_basis_id,activity_start,activity_end,
           confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash
      from atlas_v2.person_politics_v2
     where person_id=any($1::uuid[])
     order by person_id,activity_start,activity_end,polity_id,role_id,id
     for update`, [personIds]);
  return { names: names.rows || [], relationships: relationships.rows || [] };
}

function assertLiveCandidateEvidence(candidateRow, liveState) {
  const detected = detectPersonDuplicateCandidates({
    names: liveState.names,
    activities: liveState.relationships.map((row) => ({
      person_id: row.person_id,
      polity_id: row.polity_id,
      activity_start: row.activity_start,
      activity_end: row.activity_end
    }))
  });
  const low = String(candidateRow.person_low_id);
  const high = String(candidateRow.person_high_id);
  const current = detected.find((item) => item.person_low_id === low && item.person_high_id === high);
  if (!current) throw new Error("LIVE_EVIDENCE_CHANGED: approved duplicate pair is no longer detected from live person state");
  const storedEvidenceFingerprint = stableFingerprint(candidateRow.evidence || []);
  if (
    storedEvidenceFingerprint !== candidateRow.evidence_fingerprint ||
    current.evidence_fingerprint !== candidateRow.evidence_fingerprint ||
    current.detector_version !== candidateRow.detector_version ||
    Number(current.confidence) !== Number(candidateRow.confidence)
  ) {
    throw new Error("LIVE_EVIDENCE_CHANGED: approved duplicate evidence no longer matches live person state");
  }
  return current;
}

async function moveNames(client, sourceId, survivorId) {
  const promoted = await client.query(`with promote as (
    select distinct on (src.locale) dst.id from atlas_v2.person_names src join atlas_v2.person_names dst
      on dst.person_id=$2 and dst.locale=src.locale and dst.name=src.name and dst.name_type=src.name_type
    where src.person_id=$1 and src.is_preferred=true and not exists (
      select 1 from atlas_v2.person_names pref where pref.person_id=$2 and pref.locale=src.locale and pref.is_preferred=true)
    order by src.locale,dst.id)
    update atlas_v2.person_names n set is_preferred=true where n.id in (select id from promote) returning n.id`, [sourceId, survivorId]);
  const demoted = await client.query(`update atlas_v2.person_names src set is_preferred=false where src.person_id=$1 and src.is_preferred=true
    and exists (select 1 from atlas_v2.person_names pref where pref.person_id=$2 and pref.locale=src.locale and pref.is_preferred=true) returning src.id`, [sourceId, survivorId]);
  const deduped = await client.query(`delete from atlas_v2.person_names src using atlas_v2.person_names dst
    where src.person_id=$1 and dst.person_id=$2 and dst.locale=src.locale and dst.name=src.name and dst.name_type=src.name_type returning src.id`, [sourceId, survivorId]);
  const moved = await client.query(`update atlas_v2.person_names set person_id=$2 where person_id=$1 returning id`, [sourceId, survivorId]);
  return { promoted: promoted.rowCount, demoted: demoted.rowCount, deduped: deduped.rowCount, moved: moved.rowCount };
}

async function moveSources(client, sourceId, survivorId) {
  const inserted = await client.query(`insert into atlas_v2.person_sources(person_id,source_id)
    select $2,source_id from atlas_v2.person_sources where person_id=$1 on conflict (person_id,source_id) do nothing returning source_id`, [sourceId, survivorId]);
  const removed = await client.query(`delete from atlas_v2.person_sources where person_id=$1 returning source_id`, [sourceId]);
  return { inserted: inserted.rowCount, source_rows_removed: removed.rowCount };
}

async function coalesceRelationship(client, keepId, dropId) {
  const links = await client.query(`
    select person_politics_id,source_id,source_locator_key
      from atlas_v2.person_politics_sources
     where person_politics_id=any($1::uuid[])
     order by source_id,person_politics_id
     for update`, [[keepId, dropId]]);
  const keepBySource = new Map();
  const dropLinks = [];
  for (const row of links.rows || []) {
    const sourceId = String(row.source_id);
    if (String(row.person_politics_id) === keepId) keepBySource.set(sourceId, String(row.source_locator_key));
    else dropLinks.push({ source_id: sourceId, source_locator_key: String(row.source_locator_key) });
  }

  let insertedSourceLinks = 0;
  let collapsedSourceLinks = 0;
  for (const link of dropLinks) {
    const existingLocator = keepBySource.get(link.source_id);
    if (existingLocator != null) {
      if (existingLocator !== link.source_locator_key) {
        const error = new Error("RELATIONSHIP_SOURCE_LOCATOR_CONFLICT: same source has different locator keys across relationships");
        error.code = "RELATIONSHIP_SOURCE_LOCATOR_CONFLICT";
        error.source_id = link.source_id;
        throw error;
      }
      collapsedSourceLinks += 1;
      continue;
    }
    const inserted = await client.query(`
      insert into atlas_v2.person_politics_sources(person_politics_id,source_id,source_locator_key)
      values($1,$2,$3)
      returning source_id`, [keepId, link.source_id, link.source_locator_key]);
    insertedSourceLinks += inserted.rowCount;
    keepBySource.set(link.source_id, link.source_locator_key);
  }

  const chronology = await client.query(`update atlas_v2.chronology_claims set person_politics_id=$1 where person_politics_id=$2 returning id`, [keepId, dropId]);
  const descriptions = await client.query(`update atlas_v2.relationship_descriptions set person_politics_id=$1 where person_politics_id=$2 returning id`, [keepId, dropId]);
  const deleted = await client.query(`delete from atlas_v2.person_politics_v2 where id=$1 returning id`, [dropId]);
  if (deleted.rowCount !== 1) throw new Error("relationship reconciliation drop did not delete exactly one relationship");
  return {
    keep_relationship_id: keepId,
    drop_relationship_id: dropId,
    inserted_source_links: insertedSourceLinks,
    collapsed_source_links: collapsedSourceLinks,
    chronology_claims_moved: chronology.rowCount,
    relationship_descriptions_moved: descriptions.rowCount
  };
}

async function executeApprovedPersonMerge({ client, candidateId, survivorPersonId, requestId, relationshipResolutions = [], reviewerKind = "admin_session" } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client with query() is required");
  const candidate = validUuid(candidateId, "candidate_id");
  const survivorInput = validUuid(survivorPersonId, "survivor_person_id");
  const request = String(requestId || "").trim();
  if (!request) throw new Error("request_id is required");
  const normalizedResolutions = normalizeResolutions(relationshipResolutions);
  const reviewer = reviewerKind === "server_bearer" ? "server_bearer" : "admin_session";

  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  try {
    await client.query(`select pg_advisory_xact_lock(hashtext($1))`, [`atlas-phase9b-merge:${request}`]);
    await ensureMergeSchema(client);
    const replay = await client.query(`select id,candidate_id,survivor_person_id,source_person_id,mutation_summary from atlas_v2.person_merge_audits where request_id=$1`, [request]);
    if (replay.rowCount === 1) {
      const previousResolutions = replay.rows[0].mutation_summary?.relationship_reconciliation?.requested_resolutions || [];
      if (
        String(replay.rows[0].candidate_id) !== candidate ||
        String(replay.rows[0].survivor_person_id) !== survivorInput ||
        stableJson(previousResolutions) !== stableJson(normalizedResolutions)
      ) throw new Error("merge request_id collision with different payload");
      await client.query("COMMIT");
      return { replayed: true, merge_audit_id: String(replay.rows[0].id), candidate_id: String(replay.rows[0].candidate_id), survivor_person_id: String(replay.rows[0].survivor_person_id), source_person_id: String(replay.rows[0].source_person_id), mutation_summary: replay.rows[0].mutation_summary };
    }

    await client.query(`select pg_advisory_xact_lock(hashtext($1))`, [`atlas-phase9b-candidate:${candidate}`]);
    const candidateResult = await client.query(`
      select id,person_low_id,person_high_id,candidate_state,current_decision,
             confidence,evidence,evidence_fingerprint,decision_evidence_fingerprint,detector_version
        from atlas_v2.person_duplicate_candidates
       where id=$1 for update`, [candidate]);
    if (candidateResult.rowCount !== 1) throw new Error("candidate not found");
    const candidateRow = candidateResult.rows[0];
    if (candidateRow.candidate_state !== "ACTIVE") throw new Error("candidate is stale; rebuild before merge");
    if (candidateRow.current_decision !== "MERGE") throw new Error("candidate does not have MERGE approval");
    if (candidateRow.decision_evidence_fingerprint !== candidateRow.evidence_fingerprint) throw new Error("candidate evidence changed after MERGE approval");
    const sides = resolveMergeSides(candidateRow, survivorInput);

    const latestReview = await client.query(`select id,decision,evidence_fingerprint,reviewed_at from atlas_v2.person_duplicate_reviews where candidate_id=$1 order by reviewed_at desc,id desc limit 1`, [candidate]);
    if (latestReview.rowCount !== 1 || latestReview.rows[0].decision !== "MERGE") throw new Error("latest candidate review is not MERGE");
    if (latestReview.rows[0].evidence_fingerprint !== candidateRow.evidence_fingerprint) throw new Error("latest MERGE review evidence does not match current candidate evidence");

    const lockedPersons = await client.query(`select id,canonical_key,person_type,historicity from atlas_v2.persons where id=any($1::uuid[]) order by id for update`, [[sides.survivor_person_id, sides.source_person_id]]);
    if (lockedPersons.rowCount !== 2) throw new Error("candidate persons are not both live");
    const byId = new Map(lockedPersons.rows.map((row) => [String(row.id), row]));
    const survivorMeta = byId.get(sides.survivor_person_id);
    const sourceMeta = byId.get(sides.source_person_id);
    if (survivorMeta.person_type !== sourceMeta.person_type || survivorMeta.historicity !== sourceMeta.historicity) throw new Error("person metadata conflict: person_type/historicity must be reconciled before merge");

    const liveState = await lockLiveMergeState(client, [sides.survivor_person_id, sides.source_person_id]);
    assertLiveCandidateEvidence(candidateRow, liveState);
    const groups = buildRelationshipReconciliationGroups({
      rows: liveState.relationships,
      lowPersonId: String(candidateRow.person_low_id),
      highPersonId: String(candidateRow.person_high_id)
    });
    const reconciliationPlan = buildReconciliationPlan({
      groups,
      resolutions: normalizedResolutions
    });

    const beforeCounts = await globalCounts(client);
    const survivorBefore = await snapshotPerson(client, sides.survivor_person_id);
    const sourceBefore = await snapshotPerson(client, sides.source_person_id);

    const reconciliationMutations = [];
    let collapsedSourceLinks = 0;
    for (const item of reconciliationPlan.coalesces) {
      const outcome = await coalesceRelationship(client, item.keep_relationship_id, item.drop_relationship_id);
      collapsedSourceLinks += outcome.collapsed_source_links;
      reconciliationMutations.push({ ...item, ...outcome });
    }

    const names = await moveNames(client, sides.source_person_id, sides.survivor_person_id);
    const sources = await moveSources(client, sides.source_person_id, sides.survivor_person_id);
    const descriptions = await client.query(`update atlas_v2.person_descriptions set person_id=$2 where person_id=$1 returning id`, [sides.source_person_id, sides.survivor_person_id]);
    const relationships = await client.query(`update atlas_v2.person_politics_v2 set person_id=$2 where person_id=$1 returning id`, [sides.source_person_id, sides.survivor_person_id]);
    const staleCandidates = await client.query(`update atlas_v2.person_duplicate_candidates set candidate_state='STALE',updated_at=now() where candidate_state='ACTIVE' and (person_low_id=any($1::uuid[]) or person_high_id=any($1::uuid[])) returning id`, [[sides.source_person_id, sides.survivor_person_id]]);

    const deleted = await client.query(`delete from atlas_v2.persons where id=$1 returning id`, [sides.source_person_id]);
    if (deleted.rowCount !== 1) throw new Error("source person deletion did not affect exactly one row");
    const remainingSourceRefs = await client.query(`select
      (select count(*)::int from atlas_v2.person_names where person_id=$1) as names,
      (select count(*)::int from atlas_v2.person_sources where person_id=$1) as sources,
      (select count(*)::int from atlas_v2.person_descriptions where person_id=$1) as descriptions,
      (select count(*)::int from atlas_v2.person_politics_v2 where person_id=$1) as relationships,
      (select count(*)::int from atlas_v2.persons where id=$1) as person`, [sides.source_person_id]);
    if (Object.values(remainingSourceRefs.rows[0]).some((value) => Number(value) !== 0)) throw new Error("source person references remain after merge");

    const afterCounts = await globalCounts(client);
    if (afterCounts.persons !== beforeCounts.persons - 1) throw new Error("person count did not decrease by exactly one");
    if (afterCounts.relationships !== beforeCounts.relationships - reconciliationPlan.coalesces.length) throw new Error("relationship count changed outside the approved reconciliation plan");
    if (afterCounts.chronology_claims !== beforeCounts.chronology_claims) throw new Error("chronology_claims count changed during person merge");
    if (afterCounts.relationship_descriptions !== beforeCounts.relationship_descriptions) throw new Error("relationship_descriptions count changed during person merge");
    if (afterCounts.relationship_sources !== beforeCounts.relationship_sources - collapsedSourceLinks) throw new Error("relationship_sources count changed outside deterministic source-link collapse");

    const mutationSummary = {
      relationship_reconciliation: {
        requested_resolutions: normalizedResolutions,
        applied_resolutions: reconciliationPlan.resolutions,
        coalesces: reconciliationMutations,
        relationships_removed: reconciliationPlan.coalesces.length,
        duplicate_source_links_collapsed: collapsedSourceLinks
      },
      names,
      sources,
      descriptions_moved: descriptions.rowCount,
      relationships_moved: relationships.rowCount,
      candidates_staled: staleCandidates.rowCount,
      before_counts: beforeCounts,
      after_counts: afterCounts
    };
    const auditId = crypto.randomUUID();
    await client.query(`insert into atlas_v2.person_merge_audits(
      id,request_id,candidate_id,review_id,survivor_person_id,source_person_id,evidence_fingerprint,reviewer_kind,survivor_before,source_before,mutation_summary,merged_at
    ) values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,now())`, [
      auditId,request,candidate,String(latestReview.rows[0].id),sides.survivor_person_id,sides.source_person_id,candidateRow.evidence_fingerprint,reviewer,JSON.stringify(survivorBefore),JSON.stringify(sourceBefore),JSON.stringify(mutationSummary)
    ]);
    await client.query("COMMIT");
    return { replayed: false, merge_audit_id: auditId, candidate_id: candidate, ...sides, mutation_summary: mutationSummary };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

module.exports = Object.freeze({
  EXPECTED_PERSON_FKS,
  canonicalJson,
  stableJson,
  resolveMergeSides,
  ensureMergeSchema,
  lockLiveMergeState,
  assertLiveCandidateEvidence,
  coalesceRelationship,
  executeApprovedPersonMerge
});
