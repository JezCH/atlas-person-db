"use strict";

const { createPostgresClient } = require("./atlas-postgres-client.js");
const { inspectAuthoringReadiness } = require("./atlas-authoring-readiness.js");
const { verifyGitHubActionsOidc } = require("./atlas-reviewed-person-merge-github-oidc.js");
const { bearerToken, requireRuntime } = require("./atlas-authoring-apply-handler.js");
const { rebuildCandidates, listCandidates, reviewCandidate } = require("./atlas-duplicate-review-service.js");
const { executeApprovedPersonMerge } = require("./atlas-person-merge-service.js");
const { lockPersonDuplicateFrontier } = require("./atlas-person-duplicate-frontier-lock.js");

const MARKER = "ATLAS_REVIEWED_PERSON_MERGE_V1";
const MANIFEST_SCHEMA = "atlas-reviewed-person-merge/v1";
const MANIFEST_PATH_RE = /^corrections\/reviewed-person-merges\/[A-Za-z0-9._-]+\.json$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA_RE = /^[0-9a-f]{40}$/;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  if (req?.body && typeof req.body === "object" && !Buffer.isBuffer(req.body) && !Array.isArray(req.body)) return req.body;
  if (typeof req?.body === "string") {
    try {
      const parsed = JSON.parse(req.body);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {}
  }
  throw new Error("REVIEWED_PERSON_MERGE_BODY_REQUIRED");
}

function requireUuid(value, code) {
  const text = String(value || "").trim().toLowerCase();
  if (!UUID_RE.test(text)) throw new Error(code);
  return text;
}

function requireManifest(manifest, manifestPath) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) throw new Error("REVIEWED_PERSON_MERGE_MANIFEST_REQUIRED");
  if (manifest.schema !== MANIFEST_SCHEMA) throw new Error("REVIEWED_PERSON_MERGE_SCHEMA_MISMATCH");
  if (manifest.review_status !== "approved") throw new Error("REVIEWED_PERSON_MERGE_NOT_APPROVED");
  const requestId = String(manifest.request_id || "").trim();
  if (!requestId) throw new Error("REVIEWED_PERSON_MERGE_REQUEST_ID_REQUIRED");
  const survivorPersonId = requireUuid(manifest.survivor_person_id, "REVIEWED_PERSON_MERGE_SURVIVOR_REQUIRED");
  const sourcePersonId = requireUuid(manifest.source_person_id, "REVIEWED_PERSON_MERGE_SOURCE_REQUIRED");
  if (survivorPersonId === sourcePersonId) throw new Error("REVIEWED_PERSON_MERGE_DISTINCT_PERSONS_REQUIRED");

  const expected = manifest.expected && typeof manifest.expected === "object" ? manifest.expected : {};
  const survivorActivityId = requireUuid(expected.survivor_activity_id, "REVIEWED_PERSON_MERGE_SURVIVOR_ACTIVITY_REQUIRED");
  const sourceActivityCount = Number(expected.source_activity_count_after_correction);
  if (!Number.isInteger(sourceActivityCount) || sourceActivityCount !== 0) throw new Error("REVIEWED_PERSON_MERGE_SOURCE_ACTIVITY_COUNT_REQUIRED");
  const expectedStart = Number(expected.survivor_activity_start);
  const expectedEnd = Number(expected.survivor_activity_end);
  if (!Number.isInteger(expectedStart) || !Number.isInteger(expectedEnd) || expectedEnd < expectedStart) {
    throw new Error("REVIEWED_PERSON_MERGE_SURVIVOR_INTERVAL_REQUIRED");
  }
  const survivorNames = Array.isArray(expected.survivor_names) ? expected.survivor_names.map(String).filter(Boolean) : [];
  const sourceNames = Array.isArray(expected.source_names) ? expected.source_names.map(String).filter(Boolean) : [];
  if (!survivorNames.length || !sourceNames.length) throw new Error("REVIEWED_PERSON_MERGE_EXPECTED_NAMES_REQUIRED");

  const requirementKey = String(manifest.requirement_key || "").trim();
  if (!requirementKey) throw new Error("REVIEWED_PERSON_MERGE_REQUIREMENT_KEY_REQUIRED");
  return Object.freeze({
    manifestPath,
    requestId,
    survivorPersonId,
    sourcePersonId,
    survivorActivityId,
    sourceActivityCount,
    expectedStart,
    expectedEnd,
    survivorNames,
    sourceNames,
    requirementKey,
    evidence: manifest.evidence && typeof manifest.evidence === "object" ? manifest.evidence : {}
  });
}

function requirePayload(body) {
  const deploymentSha = String(body?.deployment_sha || "").trim().toLowerCase();
  const workflowSha = String(body?.workflow_sha || "").trim().toLowerCase();
  if (!SHA_RE.test(deploymentSha)) throw new Error("REVIEWED_PERSON_MERGE_DEPLOYMENT_SHA_REQUIRED");
  if (!SHA_RE.test(workflowSha)) throw new Error("REVIEWED_PERSON_MERGE_WORKFLOW_SHA_REQUIRED");
  const manifestPath = String(body?.manifest_path || "").trim();
  if (!MANIFEST_PATH_RE.test(manifestPath)) throw new Error("REVIEWED_PERSON_MERGE_MANIFEST_PATH_NOT_ALLOWED");
  return Object.freeze({
    deploymentSha,
    workflowSha,
    manifest: requireManifest(body?.manifest, manifestPath)
  });
}

function pairIds(sourcePersonId, survivorPersonId) {
  return [sourcePersonId, survivorPersonId].sort();
}

async function assertReviewedLiveState(client, manifest) {
  const people = await client.query(`
    select p.id,p.person_type,p.historicity,pn.name
      from atlas_v2.persons p
      join atlas_v2.person_names pn on pn.person_id=p.id
     where p.id=any($1::uuid[])
     order by p.id,pn.locale,pn.name
  `, [[manifest.sourcePersonId, manifest.survivorPersonId]]);
  const byPerson = new Map();
  for (const row of people.rows || []) {
    const key = String(row.id);
    const current = byPerson.get(key) || { id:key,person_type:String(row.person_type),historicity:String(row.historicity),names:[] };
    current.names.push(String(row.name));
    byPerson.set(key, current);
  }
  const source = byPerson.get(manifest.sourcePersonId);
  const survivor = byPerson.get(manifest.survivorPersonId);
  if (!source || !survivor) throw new Error("REVIEWED_PERSON_MERGE_PERSON_NOT_FOUND");
  if (source.person_type !== survivor.person_type || source.historicity !== survivor.historicity) {
    throw new Error("REVIEWED_PERSON_MERGE_PERSON_METADATA_CONFLICT");
  }
  for (const name of manifest.sourceNames) if (!source.names.includes(name)) throw new Error("REVIEWED_PERSON_MERGE_SOURCE_NAME_DRIFT");
  for (const name of manifest.survivorNames) if (!survivor.names.includes(name)) throw new Error("REVIEWED_PERSON_MERGE_SURVIVOR_NAME_DRIFT");

  const sourceActivities = await client.query(`
    select id from atlas_v2.person_politics_v2 where person_id=$1 order by id
  `, [manifest.sourcePersonId]);
  if (sourceActivities.rowCount !== manifest.sourceActivityCount) throw new Error("REVIEWED_PERSON_MERGE_SOURCE_ACTIVITY_NOT_CORRECTED");

  const survivorActivity = await client.query(`
    select id,person_id,activity_start,activity_end
      from atlas_v2.person_politics_v2
     where id=$1
  `, [manifest.survivorActivityId]);
  if (survivorActivity.rowCount !== 1) throw new Error("REVIEWED_PERSON_MERGE_SURVIVOR_ACTIVITY_NOT_FOUND");
  const activity = survivorActivity.rows[0];
  if (String(activity.person_id) !== manifest.survivorPersonId
      || Number(activity.activity_start) !== manifest.expectedStart
      || Number(activity.activity_end) !== manifest.expectedEnd) {
    throw new Error("REVIEWED_PERSON_MERGE_SURVIVOR_ACTIVITY_DRIFT");
  }

  const reference = await client.query(`
    select status,document_title,url
      from atlas_v2.person_external_references
     where person_id=$1 and provider='namuwiki'
  `, [manifest.survivorPersonId]);
  if (reference.rowCount !== 1 || reference.rows[0].status !== "linked" || !reference.rows[0].url) {
    throw new Error("REVIEWED_PERSON_MERGE_SURVIVOR_REFERENCE_REQUIRED");
  }
  return Object.freeze({ source, survivor, survivor_reference:reference.rows[0] });
}

async function ensureReviewedRequirement(client, manifest) {
  const [low, high] = pairIds(manifest.sourcePersonId, manifest.survivorPersonId);
  await client.query("BEGIN");
  try {
    await lockPersonDuplicateFrontier(client);
    const existing = await client.query(`
      select requirement_key,person_low_id,person_high_id,requirement_state,requirement_version,prior_outcome,source_artifact,source_decision_id
        from atlas_v2.person_duplicate_revalidation_requirements
       where person_low_id=$1 and person_high_id=$2
       for update
    `, [low, high]);
    if (existing.rowCount === 0) {
      await client.query(`
        insert into atlas_v2.person_duplicate_revalidation_requirements(
          requirement_key,person_low_id,person_high_id,requirement_state,requirement_version,
          prior_outcome,source_artifact,source_decision_id,evidence_snapshot,created_at,updated_at
        ) values($1,$2,$3,'ACTIVE','p10-revalidation-requirement/v1','MERGE',$4,$5,$6::jsonb,now(),now())
      `, [
        manifest.requirementKey,
        low,
        high,
        manifest.manifestPath,
        manifest.requestId,
        JSON.stringify({
          reviewed_same_person:true,
          survivor_person_id:manifest.survivorPersonId,
          source_person_id:manifest.sourcePersonId,
          expected_source_activity_count:manifest.sourceActivityCount,
          expected_survivor_activity_id:manifest.survivorActivityId,
          evidence:manifest.evidence
        })
      ]);
    } else {
      const row = existing.rows[0];
      if (String(row.requirement_key) !== manifest.requirementKey
          || String(row.person_low_id) !== low
          || String(row.person_high_id) !== high
          || row.requirement_state !== "ACTIVE"
          || row.requirement_version !== "p10-revalidation-requirement/v1"
          || row.prior_outcome !== "MERGE"
          || row.source_artifact !== manifest.manifestPath
          || row.source_decision_id !== manifest.requestId) {
        throw new Error("REVIEWED_PERSON_MERGE_REQUIREMENT_COLLISION");
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

function statusForError(code) {
  const text = String(code || "");
  if (/OIDC/.test(text)) return 403;
  if (/NOT_PRODUCTION|NOT_MAIN|REPOSITORY|SUPABASE|NOT_READY/.test(text)) return 503;
  if (/DRIFT|CONFLICT|COLLISION|REVALIDATION|CANDIDATE|MERGE|ACTIVITY_NOT_CORRECTED|REFERENCE_REQUIRED/.test(text)) return 409;
  if (/REQUIRED|INVALID|MISMATCH|NOT_ALLOWED|NOT_APPROVED|NOT_FOUND|DISTINCT/.test(text)) return 400;
  return 500;
}

function createReviewedPersonMergeHandler({
  env = process.env,
  verifyOidc = verifyGitHubActionsOidc,
  createClient = createPostgresClient,
  inspectReadiness = inspectAuthoringReadiness
} = {}) {
  return async function handler(req, res) {
    if (req?.method !== "POST") return json(res, 405, { ok:false,marker:MARKER,code:"METHOD_NOT_ALLOWED" });

    let payload;
    try {
      payload = requirePayload(parseBody(req));
      requireRuntime(env, payload.deploymentSha);
    } catch (error) {
      const code = String(error?.message || "REVIEWED_PERSON_MERGE_INVALID_REQUEST");
      return json(res, statusForError(code), { ok:false,marker:MARKER,code });
    }

    const token = bearerToken(req);
    if (!token) return json(res, 401, { ok:false,marker:MARKER,code:"REVIEWED_PERSON_MERGE_OIDC_TOKEN_REQUIRED" });
    try {
      await verifyOidc(token, { expectedSha:payload.workflowSha });
    } catch (error) {
      return json(res, 403, { ok:false,marker:MARKER,code:String(error?.message || "REVIEWED_PERSON_MERGE_OIDC_REJECTED") });
    }

    const databaseUrl = String(env?.SUPABASE_DB_URL || "").trim();
    if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) return json(res, 503, { ok:false,marker:MARKER,code:"SUPABASE_DB_URL_REQUIRED" });

    let client;
    try {
      client = await createClient(databaseUrl, { env });
      const readiness = await inspectReadiness(client);
      if (!readiness.ready || !readiness.person_merge_contract_ready) throw new Error("REVIEWED_PERSON_MERGE_PRODUCTION_NOT_READY");

      const before = await assertReviewedLiveState(client, payload.manifest);
      await ensureReviewedRequirement(client, payload.manifest);

      await rebuildCandidates({ client });
      const queue = await listCandidates({ client });
      const [low, high] = pairIds(payload.manifest.sourcePersonId, payload.manifest.survivorPersonId);
      const candidate = queue.candidates.find((item) => item.low.id === low && item.high.id === high);
      if (!candidate) throw new Error("REVIEWED_PERSON_MERGE_CANDIDATE_NOT_FOUND");

      await reviewCandidate({
        client,
        candidateId:candidate.id,
        decision:"MERGE",
        rationale:`Approved reviewed identity correction: ${payload.manifest.requestId}`,
        requestId:`${payload.manifest.requestId}:review`,
        reviewerKind:"server_bearer"
      });

      const merge = await executeApprovedPersonMerge({
        client,
        candidateId:candidate.id,
        survivorPersonId:payload.manifest.survivorPersonId,
        requestId:`${payload.manifest.requestId}:merge`,
        relationshipResolutions:[],
        reviewerKind:"server_bearer"
      });

      const sourceAfter = await client.query(`select count(*)::int as count from atlas_v2.persons where id=$1`, [payload.manifest.sourcePersonId]);
      const survivorAfter = await client.query(`
        select p.id,pn.locale,pn.name,pn.is_preferred
          from atlas_v2.persons p
          join atlas_v2.person_names pn on pn.person_id=p.id
         where p.id=$1
         order by pn.locale,pn.is_preferred desc,pn.name
      `, [payload.manifest.survivorPersonId]);
      const activitiesAfter = await client.query(`
        select id,activity_start,activity_end
          from atlas_v2.person_politics_v2
         where person_id=$1
         order by activity_start,activity_end,id
      `, [payload.manifest.survivorPersonId]);
      const referenceAfter = await client.query(`
        select status,document_title,url
          from atlas_v2.person_external_references
         where person_id=$1 and provider='namuwiki'
      `, [payload.manifest.survivorPersonId]);

      if (Number(sourceAfter.rows[0]?.count || 0) !== 0) throw new Error("REVIEWED_PERSON_MERGE_SOURCE_STILL_PRESENT");
      const afterNames = survivorAfter.rows.map((row) => String(row.name));
      for (const name of [...payload.manifest.survivorNames, ...payload.manifest.sourceNames]) {
        if (!afterNames.includes(name)) throw new Error("REVIEWED_PERSON_MERGE_ALIAS_VERIFICATION_FAILED");
      }
      if (activitiesAfter.rowCount !== 1 || String(activitiesAfter.rows[0].id) !== payload.manifest.survivorActivityId) {
        throw new Error("REVIEWED_PERSON_MERGE_ACTIVITY_VERIFICATION_FAILED");
      }
      if (referenceAfter.rowCount !== 1
          || referenceAfter.rows[0].status !== "linked"
          || referenceAfter.rows[0].url !== before.survivor_reference.url) {
        throw new Error("REVIEWED_PERSON_MERGE_REFERENCE_VERIFICATION_FAILED");
      }

      return json(res, 200, {
        ok:true,
        marker:MARKER,
        deployment_sha:payload.deploymentSha,
        workflow_sha:payload.workflowSha,
        manifest_path:payload.manifest.manifestPath,
        request_id:payload.manifest.requestId,
        survivor_person_id:payload.manifest.survivorPersonId,
        source_person_id:payload.manifest.sourcePersonId,
        candidate_id:candidate.id,
        merge_audit_id:merge.merge_audit_id,
        replay:Boolean(merge.replayed),
        source_person_present:false,
        survivor_names:survivorAfter.rows,
        survivor_activities:activitiesAfter.rows,
        namuwiki:referenceAfter.rows[0]
      });
    } catch (error) {
      const code = String(error?.code || error?.message || "REVIEWED_PERSON_MERGE_FAILED");
      const details = code === "P10_PERSON_MERGE_REFERENCE_SURFACE_DRIFT" && Array.isArray(error?.readiness?.blockers)
        ? { blockers:error.readiness.blockers.map(String) }
        : null;
      return json(res, statusForError(code), {
        ok:false,
        marker:MARKER,
        code,
        ...(details ? { details } : {})
      });
    } finally {
      if (client && typeof client.end === "function") {
        try { await client.end(); } catch {}
      }
    }
  };
}

module.exports = Object.freeze({
  MARKER,
  MANIFEST_SCHEMA,
  MANIFEST_PATH_RE,
  requireManifest,
  requirePayload,
  pairIds,
  assertReviewedLiveState,
  ensureReviewedRequirement,
  statusForError,
  createReviewedPersonMergeHandler
});