"use strict";

const crypto = require("node:crypto");

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
  if (unexpected.length || missing.length) {
    throw new Error(`person reference schema drift: unexpected=[${unexpected.join(",")}], missing=[${missing.join(",")}]`);
  }
}

async function snapshotPerson(client, personId) {
  const [person, names, sources, descriptions, relationships, relationshipSources] = await Promise.all([
    client.query(`select id,canonical_key,person_type,historicity from atlas_v2.persons where id=$1`, [personId]),
    client.query(`select id,locale,name,name_type,is_preferred from atlas_v2.person_names where person_id=$1 order by locale,is_preferred desc,name,name_type,id`, [personId]),
    client.query(`select source_id from atlas_v2.person_sources where person_id=$1 order by source_id`, [personId]),
    client.query(`select id,locale,content from atlas_v2.person_descriptions where person_id=$1 order by locale,id`, [personId]),
    client.query(`select id,polity_id,role_id,period_basis_id,activity_start,activity_end,confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash from atlas_v2.person_politics_v2 where person_id=$1 order by activity_start,activity_end,polity_id,role_id,id`, [personId]),
    client.query(`
      select pps.person_politics_id,pps.source_id,pps.source_locator_key
        from atlas_v2.person_politics_sources pps
        join atlas_v2.person_politics_v2 pp on pp.id=pps.person_politics_id
       where pp.person_id=$1
       order by pps.person_politics_id,pps.source_id`, [personId])
  ]);
  if (person.rowCount !== 1) throw new Error("merge person not found");
  return {
    person: person.rows[0],
    names: names.rows,
    sources: sources.rows,
    descriptions: descriptions.rows,
    relationships: relationships.rows,
    relationship_sources: relationshipSources.rows
  };
}

async function globalCounts(client) {
  const result = await client.query(`
    select
      (select count(*)::int from atlas_v2.persons) as persons,
      (select count(*)::int from atlas_v2.person_politics_v2) as relationships,
      (select count(*)::int from atlas_v2.chronology_claims) as chronology_claims,
      (select count(*)::int from atlas_v2.person_politics_sources) as relationship_sources,
      (select count(*)::int from atlas_v2.relationship_descriptions) as relationship_descriptions`);
  return result.rows[0];
}

async function semanticRelationshipCollisions(client, sourceId, survivorId) {
  const result = await client.query(`
    select s.id as source_relationship_id,d.id as survivor_relationship_id,
           s.polity_id,s.role_id,s.period_basis_id,s.activity_start,s.activity_end
      from atlas_v2.person_politics_v2 s
      join atlas_v2.person_politics_v2 d
        on d.person_id=$2
       and d.polity_id=s.polity_id
       and d.role_id is not distinct from s.role_id
       and d.period_basis_id=s.period_basis_id
       and d.activity_start=s.activity_start
       and d.activity_end=s.activity_end
     where s.person_id=$1
     order by s.id,d.id
     limit 50`, [sourceId, survivorId]);
  return result.rows;
}

async function moveNames(client, sourceId, survivorId) {
  const promoted = await client.query(`
    with promote as (
      select distinct on (src.locale) dst.id
        from atlas_v2.person_names src
        join atlas_v2.person_names dst
          on dst.person_id=$2
         and dst.locale=src.locale
         and dst.name=src.name
         and dst.name_type=src.name_type
       where src.person_id=$1 and src.is_preferred=true
         and not exists (
           select 1 from atlas_v2.person_names pref
            where pref.person_id=$2 and pref.locale=src.locale and pref.is_preferred=true
         )
       order by src.locale,dst.id
    )
    update atlas_v2.person_names n set is_preferred=true
     where n.id in (select id from promote)
    returning n.id`, [sourceId, survivorId]);

  const demoted = await client.query(`
    update atlas_v2.person_names src set is_preferred=false
     where src.person_id=$1 and src.is_preferred=true
       and exists (
         select 1 from atlas_v2.person_names pref
          where pref.person_id=$2 and pref.locale=src.locale and pref.is_preferred=true
       )
    returning src.id`, [sourceId, survivorId]);

  const deduped = await client.query(`
    delete from atlas_v2.person_names src
    using atlas_v2.person_names dst
     where src.person_id=$1 and dst.person_id=$2
       and dst.locale=src.locale and dst.name=src.name and dst.name_type=src.name_type
    returning src.id`, [sourceId, survivorId]);

  const moved = await client.query(`
    update atlas_v2.person_names set person_id=$2 where person_id=$1 returning id`, [sourceId, survivorId]);
  return { promoted: promoted.rowCount, demoted: demoted.rowCount, deduped: deduped.rowCount, moved: moved.rowCount };
}

async function moveSources(client, sourceId, survivorId) {
  const inserted = await client.query(`
    insert into atlas_v2.person_sources(person_id,source_id)
    select $2,source_id from atlas_v2.person_sources where person_id=$1
    on conflict (person_id,source_id) do nothing
    returning source_id`, [sourceId, survivorId]);
  const removed = await client.query(`delete from atlas_v2.person_sources where person_id=$1 returning source_id`, [sourceId]);
  return { inserted: inserted.rowCount, source_rows_removed: removed.rowCount };
}

async function executeApprovedPersonMerge({ client, candidateId, survivorPersonId, requestId, reviewerKind = "admin_session" } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client with query() is required");
  const candidate = validUuid(candidateId, "candidate_id");
  const survivorInput = validUuid(survivorPersonId, "survivor_person_id");
  const request = String(requestId || "").trim();
  if (!request) throw new Error("request_id is required");
  const reviewer = reviewerKind === "server_bearer" ? "server_bearer" : "admin_session";

  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  try {
    await client.query(`select pg_advisory_xact_lock(hashtext($1))`, [`atlas-phase9b-merge:${request}`]);
    await ensureMergeSchema(client);

    const replay = await client.query(`
      select id,candidate_id,survivor_person_id,source_person_id,mutation_summary
        from atlas_v2.person_merge_audits where request_id=$1`, [request]);
    if (replay.rowCount === 1) {
      await client.query("COMMIT");
      return { replayed: true, merge_audit_id: String(replay.rows[0].id), candidate_id: String(replay.rows[0].candidate_id), survivor_person_id: String(replay.rows[0].survivor_person_id), source_person_id: String(replay.rows[0].source_person_id), mutation_summary: replay.rows[0].mutation_summary };
    }

    await client.query(`select pg_advisory_xact_lock(hashtext($1))`, [`atlas-phase9b-candidate:${candidate}`]);
    const candidateResult = await client.query(`
      select id,person_low_id,person_high_id,candidate_state,current_decision,
             evidence_fingerprint,decision_evidence_fingerprint
        from atlas_v2.person_duplicate_candidates
       where id=$1 for update`, [candidate]);
    if (candidateResult.rowCount !== 1) throw new Error("candidate not found");
    const candidateRow = candidateResult.rows[0];
    if (candidateRow.candidate_state !== "ACTIVE") throw new Error("candidate is stale; rebuild before merge");
    if (candidateRow.current_decision !== "MERGE") throw new Error("candidate does not have MERGE approval");
    if (candidateRow.decision_evidence_fingerprint !== candidateRow.evidence_fingerprint) throw new Error("candidate evidence changed after MERGE approval");

    const sides = resolveMergeSides(candidateRow, survivorInput);
    const latestReview = await client.query(`
      select id,decision,evidence_fingerprint,reviewed_at
        from atlas_v2.person_duplicate_reviews
       where candidate_id=$1
       order by reviewed_at desc,id desc
       limit 1`, [candidate]);
    if (latestReview.rowCount !== 1 || latestReview.rows[0].decision !== "MERGE") throw new Error("latest candidate review is not MERGE");
    if (latestReview.rows[0].evidence_fingerprint !== candidateRow.evidence_fingerprint) throw new Error("latest MERGE review evidence does not match current candidate evidence");

    const lockedPersons = await client.query(`
      select id,canonical_key,person_type,historicity
        from atlas_v2.persons
       where id=any($1::uuid[])
       order by id
       for update`, [[sides.survivor_person_id, sides.source_person_id]]);
    if (lockedPersons.rowCount !== 2) throw new Error("candidate persons are not both live");
    const byId = new Map(lockedPersons.rows.map((row) => [String(row.id), row]));
    const survivorMeta = byId.get(sides.survivor_person_id);
    const sourceMeta = byId.get(sides.source_person_id);
    if (survivorMeta.person_type !== sourceMeta.person_type || survivorMeta.historicity !== sourceMeta.historicity) {
      throw new Error("person metadata conflict: person_type/historicity must be reconciled before merge");
    }

    const collisions = await semanticRelationshipCollisions(client, sides.source_person_id, sides.survivor_person_id);
    if (collisions.length) {
      const error = new Error(`relationship semantic collision requires manual review (${collisions.length} collision${collisions.length === 1 ? "" : "s"})`);
      error.code = "RELATIONSHIP_COLLISION";
      error.collisions = collisions;
      throw error;
    }

    const beforeCounts = await globalCounts(client);
    const survivorBefore = await snapshotPerson(client, sides.survivor_person_id);
    const sourceBefore = await snapshotPerson(client, sides.source_person_id);

    const names = await moveNames(client, sides.source_person_id, sides.survivor_person_id);
    const sources = await moveSources(client, sides.source_person_id, sides.survivor_person_id);
    const descriptions = await client.query(`update atlas_v2.person_descriptions set person_id=$2 where person_id=$1 returning id`, [sides.source_person_id, sides.survivor_person_id]);
    const relationships = await client.query(`update atlas_v2.person_politics_v2 set person_id=$2 where person_id=$1 returning id`, [sides.source_person_id, sides.survivor_person_id]);
    const staleCandidates = await client.query(`
      update atlas_v2.person_duplicate_candidates
         set candidate_state='STALE',updated_at=now()
       where candidate_state='ACTIVE'
         and (person_low_id=any($1::uuid[]) or person_high_id=any($1::uuid[]))
      returning id`, [[sides.source_person_id, sides.survivor_person_id]]);

    const deleted = await client.query(`delete from atlas_v2.persons where id=$1 returning id`, [sides.source_person_id]);
    if (deleted.rowCount !== 1) throw new Error("source person deletion did not affect exactly one row");

    const remainingSourceRefs = await client.query(`
      select
        (select count(*)::int from atlas_v2.person_names where person_id=$1) as names,
        (select count(*)::int from atlas_v2.person_sources where person_id=$1) as sources,
        (select count(*)::int from atlas_v2.person_descriptions where person_id=$1) as descriptions,
        (select count(*)::int from atlas_v2.person_politics_v2 where person_id=$1) as relationships,
        (select count(*)::int from atlas_v2.persons where id=$1) as person`, [sides.source_person_id]);
    if (Object.values(remainingSourceRefs.rows[0]).some((value) => Number(value) !== 0)) throw new Error("source person references remain after merge");

    const afterCounts = await globalCounts(client);
    if (afterCounts.persons !== beforeCounts.persons - 1) throw new Error("person count did not decrease by exactly one");
    for (const key of ["relationships","chronology_claims","relationship_sources","relationship_descriptions"]) {
      if (afterCounts[key] !== beforeCounts[key]) throw new Error(`${key} count changed during person merge`);
    }

    const mutationSummary = {
      names,
      sources,
      descriptions_moved: descriptions.rowCount,
      relationships_moved: relationships.rowCount,
      candidates_staled: staleCandidates.rowCount,
      before_counts: beforeCounts,
      after_counts: afterCounts
    };
    const auditId = crypto.randomUUID();
    await client.query(`
      insert into atlas_v2.person_merge_audits(
        id,request_id,candidate_id,review_id,survivor_person_id,source_person_id,
        evidence_fingerprint,reviewer_kind,survivor_before,source_before,mutation_summary,merged_at
      ) values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,now())`, [
      auditId,request,candidate,String(latestReview.rows[0].id),sides.survivor_person_id,sides.source_person_id,
      candidateRow.evidence_fingerprint,reviewer,JSON.stringify(survivorBefore),JSON.stringify(sourceBefore),JSON.stringify(mutationSummary)
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
  resolveMergeSides,
  ensureMergeSchema,
  semanticRelationshipCollisions,
  executeApprovedPersonMerge
});
