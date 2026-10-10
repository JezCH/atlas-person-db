#!/usr/bin/env node
/**
 * P2-09: Independent, public-read-only full Production Polity census.
 * Does not infer internal Source, tombstone, relation-table or Authoring parity
 * from the public Polity projection. Counts candidates; never mutates data.
 */
import fs from "node:fs";
import { pathToFileURL } from "node:url";

export const REPORT_SCHEMA = "atlas-polity-public-complete-census/v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredUuid(value, label) {
  const id = String(value ?? "").toLowerCase();
  if (!UUID.test(id)) throw new Error("PUBLIC_CENSUS_INVALID_UUID:" + label);
  return id;
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko"));
}

function normalKo(value) {
  return String(value || "").normalize("NFKC").replace(/\s+/gu, " ").trim();
}

function groupedCollisions(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!row.key) continue;
    const existing = map.get(row.key) || [];
    existing.push(row.polity);
    map.set(row.key, existing);
  }
  return [...map.entries()]
    .filter(([, values]) => new Set(values.map(x => x.id)).size > 1)
    .map(([key, values]) => ({
      key,
      polities: [...new Map(values.map(x => [x.id, x])).values()]
        .sort((a, b) => a.id.localeCompare(b.id))
    }))
    .sort((a, b) => a.key.localeCompare(b.key, "ko"));
}

export function analyzePublicPolityCensus(body, { deployedSha = null } = {}) {
  if (body?.ok !== true || body?.schema !== "atlas-polity-read/v1" ||
      body?.mode !== "list" || !Array.isArray(body.polities) || !body.summary ||
      typeof body.summary !== "object") {
    throw new Error("PUBLIC_CENSUS_UNTRUSTED_PUBLIC_LIST_RESPONSE");
  }
  if (deployedSha != null && !/^[a-f0-9]{40}$/.test(deployedSha)) {
    throw new Error("PUBLIC_CENSUS_DEPLOYMENT_SHA_REQUIRED");
  }

  const seenPolities = new Set();
  const activityOwners = new Map();
  const polities = [];
  const preferredKorean = [];
  const preferredEnglish = [];
  const orphanRows = [];
  const temporalCandidates = [];
  const unresolvedCandidates = [];
  const missingNameCandidates = [];
  const activityDuplicateCandidates = [];
  let activitiesSeen = 0, linkedPolities = 0, unresolvedObserved = 0;
  const uniquePersons = new Set();

  for (const [index, p] of body.polities.entries()) {
    const id = requiredUuid(p?.id, "polity:" + index);
    if (seenPolities.has(id)) throw new Error("PUBLIC_CENSUS_DUPLICATE_POLITY_UUID:" + id);
    seenPolities.add(id);
    if (!Array.isArray(p.activities) || !Array.isArray(p.names)) {
      throw new Error("PUBLIC_CENSUS_POLITY_PROJECTION_INCOMPLETE:" + id);
    }
    if (p.activity_count !== p.activities.length) {
      throw new Error("PUBLIC_CENSUS_POLITY_ACTIVITY_COUNT_DRIFT:" + id);
    }
    const info = {
      id,
      canonical_key: p.canonical_key ?? null,
      polity_type: p.polity_type ?? null,
      canonical_name_en: p.canonical_name_en ?? null,
      preferred_name_ko: p.preferred_name_ko ?? null,
      activity_count: p.activities.length
    };
    polities.push(info);
    if (p.activities.length) linkedPolities++;
    else orphanRows.push(info);
    const ko = normalKo(p.preferred_name_ko);
    const en = String(p.canonical_name_en || "").trim().toLowerCase();
    if (ko) preferredKorean.push({ key:ko, polity:info });
    if (en) preferredEnglish.push({ key:en, polity:info });
    if (!ko || !en) missingNameCandidates.push({ id, missing_ko:!ko, missing_en:!en });

    for (const raw of p.activities) {
      const activity = requiredUuid(raw?.id, "activity:" + id);
      const personId = requiredUuid(raw?.person_id, "person:" + activity);
      uniquePersons.add(personId);
      activitiesSeen++;
      const firstOwner = activityOwners.get(activity);
      if (firstOwner) {
        activityDuplicateCandidates.push({ activity_id:activity, first_polity_id:firstOwner, additional_polity_id:id });
      } else activityOwners.set(activity, id);

      const start = raw.activity_start;
      const end = raw.activity_end;
      const status = String(raw.chronology_status || "");
      if ((start != null && (!Number.isInteger(start) || start === 0)) ||
          (end != null && (!Number.isInteger(end) || end === 0)) ||
          (start != null && end != null && end < start)) {
        temporalCandidates.push({ polity_id:id, activity_id:activity, start, end, chronology_status:status,
          reason:"INVALID_BOUNDARY_OR_REVERSED_YEAR" });
      }
      if (start == null || (end == null && status !== "ongoing")) {
        unresolvedObserved++;
        unresolvedCandidates.push({ polity_id:id, activity_id:activity, start, end, chronology_status:status,
          reason:start == null ? "START_UNRESOLVED" : "END_UNRESOLVED_NOT_ONGOING" });
      }
    }
  }

  if (body.summary.total_polities !== polities.length ||
      body.summary.activity_count !== activitiesSeen ||
      body.summary.linked_polities !== linkedPolities ||
      body.summary.orphan_polities !== orphanRows.length ||
      body.summary.unique_linked_persons !== uniquePersons.size ||
      body.summary.unresolved_activity_count !== unresolvedObserved) {
    throw new Error("PUBLIC_CENSUS_LIST_SUMMARY_DRIFT");
  }

  const collisionsKo = groupedCollisions(preferredKorean);
  const collisionsEn = groupedCollisions(preferredEnglish);
  return {
    schema: REPORT_SCHEMA,
    source:"Production public /api/atlas-read?__atlas_read_surface=polity list",
    read_only:true,
    committed:false,
    analysis_complete:true,
    deployment_sha:deployedSha,
    coverage:{
      polities:polities.length,
      linked_polities:linkedPolities,
      orphan_polities:orphanRows.length,
      activity_occurrences:activitiesSeen,
      unique_activity_uuids:activityOwners.size,
      unique_person_uuids:uniquePersons.size,
      normalized_source_rows_scanned:0,
      internal_polity_source_joins_scanned:0,
      identity_relation_rows_scanned:0,
      retirement_tombstone_rows_scanned:0,
      authoring_runtime_equivalence_proven:false
    },
    candidate_counts:{
      exact_preferred_ko_collisions:collisionsKo.length,
      exact_preferred_en_collisions:collisionsEn.length,
      malformed_activity_temporal_boundaries:temporalCandidates.length,
      unresolved_activity_boundaries:unresolvedCandidates.length,
      duplicate_activity_owners:activityDuplicateCandidates.length,
      missing_preferred_ko_or_en:missingNameCandidates.length
    },
    candidates:{
      preferred_ko_collisions:collisionsKo,
      preferred_en_collisions:collisionsEn,
      malformed_activity_temporal_boundaries:temporalCandidates,
      unresolved_activity_boundaries:unresolvedCandidates,
      duplicate_activity_owners:activityDuplicateCandidates,
      missing_preferred_ko_or_en:missingNameCandidates,
      orphan_polities:orphanRows
    },
    source_boundary:{
      interpreted_as_candidates_only:true,
      namesake_collision_is_not_same_identity:true,
      orphan_is_not_retirement_authorization:true,
      incomplete_public_source_or_relation_or_tombstone_census:true,
      exact_legacy_source_and_authoring_db_audit_remains_required:true
    }
  };
}

const scriptPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (scriptPath === import.meta.url) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error("USAGE: node scripts/audit-polity-public-production-census.mjs INPUT_JSON OUTPUT_JSON");
  const body = JSON.parse(fs.readFileSync(input,"utf8"));
  const deployedSha = String(process.env.ATLAS_PRODUCTION_DEPLOYMENT_SHA || "");
  const report = analyzePublicPolityCensus(body,{deployedSha});
  fs.writeFileSync(output,JSON.stringify(report,null,2)+"\n");
  process.stdout.write(JSON.stringify({schema:report.schema,coverage:report.coverage,candidate_counts:report.candidate_counts})+"\n");
}
