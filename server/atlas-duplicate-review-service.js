"use strict";

const crypto = require("node:crypto");
const duplicateDetector = require("./atlas-duplicate-detector.js");
const { buildRelationshipReconciliationGroups } = require("./atlas-relationship-reconciliation.js");

const {
  detectPersonDuplicateCandidates,
  DETECTOR_VERSION,
  REVALIDATION_SEMANTIC_VERSION
} = duplicateDetector;
const DECISIONS = new Set(["MERGE", "KEEP_SEPARATE", "REVIEW"]);

function schemaUnavailable(error) {
  return error?.code === "42P01" || /person_duplicate_(?:candidates|reviews)/i.test(String(error?.message || ""));
}

async function loadDetectorInput(client) {
  const names = await client.query(`
    select person_id, name, locale, is_preferred
    from atlas_v2.person_names
    order by person_id, is_preferred desc, locale, name
  `);
  const activities = await client.query(`
    select
      id,
      person_id,
      polity_id,
      relation_type_id,
      role_id,
      period_basis_id,
      activity_start,
      activity_start_month,
      activity_start_day,
      activity_start_granularity,
      activity_start_calendar,
      activity_start_certainty,
      activity_end,
      activity_end_month,
      activity_end_day,
      activity_end_granularity,
      activity_end_calendar,
      activity_end_certainty
    from atlas_v2.person_politics_v2
    order by person_id, activity_start, activity_end, polity_id, relation_type_id, role_id nulls first, period_basis_id, id
  `);
  return { names: names.rows || [], activities: activities.rows || [] };
}

async function rebuildCandidates({ client }) {
  const input = await loadDetectorInput(client);
  const detected = detectPersonDuplicateCandidates(input);
  await client.query("BEGIN");
  try {
    await client.query(`
      update atlas_v2.person_duplicate_candidates
      set candidate_state = 'STALE', updated_at = now()
      where candidate_state = 'ACTIVE'
    `);

    for (const candidate of detected) {
      await client.query(`
        insert into atlas_v2.person_duplicate_candidates (
          id, person_low_id, person_high_id, candidate_state, confidence,
          evidence, evidence_fingerprint, detector_version,
          first_detected_at, last_detected_at, updated_at
        ) values ($1,$2,$3,'ACTIVE',$4,$5::jsonb,$6,$7,now(),now(),now())
        on conflict (person_low_id, person_high_id) do update set
          candidate_state = 'ACTIVE',
          confidence = excluded.confidence,
          evidence = excluded.evidence,
          evidence_fingerprint = excluded.evidence_fingerprint,
          detector_version = excluded.detector_version,
          last_detected_at = now(),
          current_decision = case
            when atlas_v2.person_duplicate_candidates.current_decision in ('MERGE','KEEP_SEPARATE')
             and (
               atlas_v2.person_duplicate_candidates.detector_version is distinct from excluded.detector_version
               or atlas_v2.person_duplicate_candidates.decision_evidence_fingerprint is distinct from excluded.evidence_fingerprint
             )
            then 'REVIEW'
            else atlas_v2.person_duplicate_candidates.current_decision
          end,
          updated_at = now()
      `, [
        crypto.randomUUID(),
        candidate.person_low_id,
        candidate.person_high_id,
        candidate.confidence,
        JSON.stringify(candidate.evidence),
        candidate.evidence_fingerprint,
        candidate.detector_version
      ]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
  const queue = await listCandidates({ client });
  return {
    detected: detected.length,
    active: queue.candidates.length,
    summary: queue.summary,
    detector_version: DETECTOR_VERSION,
    reconciliation_semantic_version: REVALIDATION_SEMANTIC_VERSION
  };
}

function preferredName(rows) {
  return rows.find((row) => row.is_preferred && row.locale === "ko")?.name
    || rows.find((row) => row.is_preferred && row.locale === "en")?.name
    || rows.find((row) => row.is_preferred)?.name
    || rows[0]?.name
    || null;
}

async function listCandidates({ client, includeStale = false } = {}) {
  const result = await client.query(`
    select id, person_low_id, person_high_id, candidate_state, current_decision,
           confidence, evidence, evidence_fingerprint, detector_version,
           first_detected_at, last_detected_at, reviewed_at, review_count
    from atlas_v2.person_duplicate_candidates
    ${includeStale ? "" : "where candidate_state = 'ACTIVE'"}
    order by candidate_state, confidence desc, last_detected_at desc, id
  `);
  const rows = result.rows || [];
  const personIds = [...new Set(rows.flatMap((row) => [String(row.person_low_id), String(row.person_high_id)]))];
  const namesByPerson = new Map();
  const activitiesByPerson = new Map();

  if (personIds.length) {
    const names = await client.query(`
      select person_id, name, locale, is_preferred
      from atlas_v2.person_names
      where person_id = any($1::uuid[])
      order by person_id, is_preferred desc, locale, name
    `, [personIds]);
    for (const row of names.rows || []) {
      const key = String(row.person_id);
      const list = namesByPerson.get(key) || [];
      list.push({ name: String(row.name), locale: String(row.locale), is_preferred: Boolean(row.is_preferred) });
      namesByPerson.set(key, list);
    }

    const activities = await client.query(`
      select
        pp.person_id,
        pp.id,
        pp.polity_id,
        pp.relation_type_id,
        pp.role_id,
        pp.period_basis_id,
        pp.activity_start,
        pp.activity_start_month,
        pp.activity_start_day,
        pp.activity_start_granularity,
        pp.activity_start_calendar,
        pp.activity_start_certainty,
        pp.activity_end,
        pp.activity_end_month,
        pp.activity_end_day,
        pp.activity_end_granularity,
        pp.activity_end_calendar,
        pp.activity_end_certainty,
        pp.notes,
        pp.source_locator,
        coalesce(pko.name, pen.name)::text as polity_name,
        r.source_label::text as role_name_en,
        coalesce(rko.name, r.source_label)::text as role_name,
        pb.code::text as period_basis
      from atlas_v2.person_politics_v2 pp
      join atlas_v2.polity_names pen
        on pen.polity_id = pp.polity_id
       and pen.locale = 'en'
       and pen.is_preferred = true
      left join atlas_v2.polity_names pko
        on pko.polity_id = pp.polity_id
       and pko.locale = 'ko'
       and pko.is_preferred = true
      left join atlas_v2.roles r on r.id = pp.role_id
      left join lateral (
        select rn.name
          from atlas_v2.role_names rn
         where rn.role_id = r.id
           and rn.locale = 'ko'
           and rn.is_preferred = true
         order by rn.id
         limit 1
      ) rko on true
      join atlas_v2.period_bases pb on pb.id = pp.period_basis_id
      where pp.person_id = any($1::uuid[])
      order by pp.person_id, pp.activity_start, pp.activity_end, polity_name, pp.id
    `, [personIds]);
    for (const row of activities.rows || []) {
      const key = String(row.person_id);
      const list = activitiesByPerson.get(key) || [];
      list.push({
        id: String(row.id),
        person_id: key,
        polity_id: String(row.polity_id),
        polity_name: String(row.polity_name),
        relation_type_id: row.relation_type_id == null ? null : String(row.relation_type_id),
        role_id: row.role_id == null ? null : String(row.role_id),
        role_name: row.role_name == null ? null : String(row.role_name),
        role_name_en: row.role_name_en == null ? null : String(row.role_name_en),
        period_basis_id: String(row.period_basis_id),
        period_basis: String(row.period_basis),
        activity_start: Number(row.activity_start),
        activity_start_month: row.activity_start_month == null ? null : Number(row.activity_start_month),
        activity_start_day: row.activity_start_day == null ? null : Number(row.activity_start_day),
        activity_start_granularity: row.activity_start_granularity == null ? null : String(row.activity_start_granularity),
        activity_start_calendar: row.activity_start_calendar == null ? null : String(row.activity_start_calendar),
        activity_start_certainty: row.activity_start_certainty == null ? null : String(row.activity_start_certainty),
        activity_end: Number(row.activity_end),
        activity_end_month: row.activity_end_month == null ? null : Number(row.activity_end_month),
        activity_end_day: row.activity_end_day == null ? null : Number(row.activity_end_day),
        activity_end_granularity: row.activity_end_granularity == null ? null : String(row.activity_end_granularity),
        activity_end_calendar: row.activity_end_calendar == null ? null : String(row.activity_end_calendar),
        activity_end_certainty: row.activity_end_certainty == null ? null : String(row.activity_end_certainty),
        notes: row.notes == null ? null : String(row.notes),
        source_locator: row.source_locator && typeof row.source_locator === "object" ? row.source_locator : null
      });
      activitiesByPerson.set(key, list);
    }
  }

  const decorate = (personId) => {
    const names = namesByPerson.get(personId) || [];
    return {
      id: personId,
      display_name: preferredName(names) || personId,
      names,
      activities: activitiesByPerson.get(personId) || []
    };
  };

  const candidates = rows.map((row) => {
    const lowId = String(row.person_low_id);
    const highId = String(row.person_high_id);
    const low = decorate(lowId);
    const high = decorate(highId);
    const relationshipGroups = buildRelationshipReconciliationGroups({
      rows: [...low.activities, ...high.activities],
      lowPersonId: lowId,
      highPersonId: highId
    }).map((group) => ({
      ...group,
      polity_name: group.relationships[0]?.polity_name || group.polity_id,
      period_basis: group.relationships[0]?.period_basis || group.period_basis_id
    }));
    return {
      id: String(row.id),
      candidate_state: String(row.candidate_state),
      current_decision: row.current_decision == null ? null : String(row.current_decision),
      confidence: Number(row.confidence),
      evidence: Array.isArray(row.evidence) ? row.evidence : [],
      evidence_fingerprint: String(row.evidence_fingerprint),
      detector_version: String(row.detector_version),
      first_detected_at: row.first_detected_at,
      last_detected_at: row.last_detected_at,
      reviewed_at: row.reviewed_at,
      review_count: Number(row.review_count),
      relationship_reconciliation: {
        semantic_version: REVALIDATION_SEMANTIC_VERSION,
        required: relationshipGroups.length > 0,
        groups: relationshipGroups
      },
      low,
      high
    };
  });

  const summary = { total: candidates.length, open: 0, merge: 0, keep_separate: 0, review: 0 };
  for (const candidate of candidates) {
    if (candidate.current_decision === "MERGE") summary.merge += 1;
    else if (candidate.current_decision === "KEEP_SEPARATE") summary.keep_separate += 1;
    else if (candidate.current_decision === "REVIEW") summary.review += 1;
    else summary.open += 1;
  }
  return { candidates, summary };
}

async function reviewCandidate({ client, candidateId, decision, rationale = null, requestId, reviewerKind = "admin_session" }) {
  const normalizedDecision = String(decision || "").trim().toUpperCase();
  if (!DECISIONS.has(normalizedDecision)) throw new Error("decision must be MERGE, KEEP_SEPARATE, or REVIEW");
  const normalizedRequestId = String(requestId || "").trim();
  if (!normalizedRequestId) throw new Error("request_id is required");
  const normalizedCandidateId = String(candidateId || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizedCandidateId)) {
    throw new Error("valid candidate_id is required");
  }
  const rationaleText = String(rationale || "").trim() || null;
  if (rationaleText && rationaleText.length > 2000) throw new Error("rationale is too long");

  await client.query("BEGIN");
  try {
    const replay = await client.query(`
      select candidate_id, decision
      from atlas_v2.person_duplicate_reviews
      where request_id = $1
    `, [normalizedRequestId]);
    if (replay.rowCount === 1) {
      await client.query("COMMIT");
      return { replayed: true, candidate_id: String(replay.rows[0].candidate_id), decision: String(replay.rows[0].decision) };
    }

    const locked = await client.query(`
      select id, person_low_id, person_high_id, candidate_state,
             evidence, evidence_fingerprint
      from atlas_v2.person_duplicate_candidates
      where id = $1
      for update
    `, [normalizedCandidateId]);
    if (locked.rowCount !== 1) throw new Error("candidate not found");
    const candidate = locked.rows[0];
    if (candidate.candidate_state !== "ACTIVE") throw new Error("candidate is stale; rebuild before review");

    await client.query(`
      insert into atlas_v2.person_duplicate_reviews (
        id, candidate_id, person_low_id, person_high_id, decision, rationale,
        evidence_snapshot, evidence_fingerprint, reviewer_kind, request_id, reviewed_at
      ) values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,now())
    `, [
      crypto.randomUUID(), normalizedCandidateId, candidate.person_low_id, candidate.person_high_id,
      normalizedDecision, rationaleText, JSON.stringify(candidate.evidence), candidate.evidence_fingerprint,
      reviewerKind === "server_bearer" ? "server_bearer" : "admin_session", normalizedRequestId
    ]);

    await client.query(`
      update atlas_v2.person_duplicate_candidates
      set current_decision = $2,
          decision_evidence_fingerprint = evidence_fingerprint,
          reviewed_at = now(),
          review_count = review_count + 1,
          updated_at = now()
      where id = $1
    `, [normalizedCandidateId, normalizedDecision]);
    await client.query("COMMIT");
    return { replayed: false, candidate_id: normalizedCandidateId, decision: normalizedDecision };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

module.exports = Object.freeze({
  DECISIONS,
  schemaUnavailable,
  loadDetectorInput,
  rebuildCandidates,
  listCandidates,
  reviewCandidate
});
