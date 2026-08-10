import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { Client } from 'pg';

const require = createRequire(import.meta.url);
const { detectPersonDuplicateCandidates, DETECTOR_VERSION } = require('../../../server/atlas-duplicate-detector.js');

const connectionString = String(process.env.SUPABASE_DB_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(connectionString)) throw new Error('SUPABASE_DB_URL is required');
const outputDir = path.resolve(process.env.PHASE9C_OUTPUT_DIR || 'migration/phase-9/tmp/live-candidate-preview');
fs.mkdirSync(outputDir, { recursive: true });
const reportPath = path.join(outputDir, 'report.json');
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

function preferredName(rows, locale) {
  return rows.find((row) => row.locale === locale && row.is_preferred)?.name
    || rows.find((row) => row.is_preferred)?.name
    || rows[0]?.name
    || null;
}

function semanticKey(row) {
  return [
    String(row.polity_id),
    row.role_id == null ? '' : String(row.role_id),
    String(row.period_basis_id),
    Number(row.activity_start),
    Number(row.activity_end)
  ].join('|');
}

function internalDuplicateGroups(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = semanticKey(row);
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([key, list]) => ({ semantic_key: key, relationship_ids: list.map((row) => row.id), rows: list }));
}

await client.connect();
try {
  await client.query('begin transaction isolation level repeatable read read only');

  const [peopleResult, namesResult, activitiesResult, polityNamesResult, roleNamesResult] = await Promise.all([
    client.query(`select id,canonical_key,person_type,historicity from atlas_v2.persons order by id`),
    client.query(`select person_id,name,locale,is_preferred from atlas_v2.person_names order by person_id,is_preferred desc,locale,name`),
    client.query(`
      select id,person_id,polity_id,role_id,period_basis_id,activity_start,activity_end,notes,source_locator
        from atlas_v2.person_politics_v2
       order by person_id,activity_start,activity_end,polity_id,role_id,id
    `),
    client.query(`select polity_id,name,locale,is_preferred from atlas_v2.polity_names where is_preferred=true order by polity_id,locale,name`),
    client.query(`select role_id,name,locale,is_preferred from atlas_v2.role_names where is_preferred=true order by role_id,locale,name`)
  ]);

  const names = namesResult.rows || [];
  const activities = activitiesResult.rows || [];
  const detected = detectPersonDuplicateCandidates({ names, activities });

  const namesByPerson = new Map();
  for (const row of names) {
    const key = String(row.person_id);
    const list = namesByPerson.get(key) || [];
    list.push({ name: String(row.name), locale: String(row.locale), is_preferred: Boolean(row.is_preferred) });
    namesByPerson.set(key, list);
  }

  const localized = (rows, idField) => {
    const map = new Map();
    for (const row of rows || []) {
      const key = String(row[idField]);
      const item = map.get(key) || {};
      if (row.locale === 'ko') item.ko = String(row.name);
      if (row.locale === 'en') item.en = String(row.name);
      map.set(key, item);
    }
    return map;
  };
  const polityNames = localized(polityNamesResult.rows, 'polity_id');
  const roleNames = localized(roleNamesResult.rows, 'role_id');

  const activitiesByPerson = new Map();
  for (const row of activities) {
    const key = String(row.person_id);
    const list = activitiesByPerson.get(key) || [];
    const polity = polityNames.get(String(row.polity_id)) || {};
    const role = row.role_id == null ? {} : (roleNames.get(String(row.role_id)) || {});
    list.push({
      id: String(row.id),
      polity_id: String(row.polity_id),
      polity_ko: polity.ko || null,
      polity_en: polity.en || null,
      role_id: row.role_id == null ? null : String(row.role_id),
      role_ko: role.ko || null,
      role_en: role.en || null,
      period_basis_id: String(row.period_basis_id),
      activity_start: Number(row.activity_start),
      activity_end: Number(row.activity_end),
      notes: row.notes || null,
      source_locator: row.source_locator || null
    });
    activitiesByPerson.set(key, list);
  }

  const personMeta = new Map((peopleResult.rows || []).map((row) => [String(row.id), row]));
  const decorate = (personId) => {
    const personNames = namesByPerson.get(personId) || [];
    const meta = personMeta.get(personId) || {};
    const personActivities = activitiesByPerson.get(personId) || [];
    return {
      id: personId,
      canonical_key: meta.canonical_key || null,
      person_type: meta.person_type || null,
      historicity: meta.historicity || null,
      display_ko: preferredName(personNames, 'ko'),
      display_en: preferredName(personNames, 'en'),
      names: personNames,
      activities: personActivities,
      internal_relationship_duplicates: internalDuplicateGroups(personActivities)
    };
  };

  const candidates = detected.map((candidate) => {
    const low = decorate(String(candidate.person_low_id));
    const high = decorate(String(candidate.person_high_id));
    const highBySemanticKey = new Map();
    for (const row of high.activities) {
      const key = semanticKey(row);
      const list = highBySemanticKey.get(key) || [];
      list.push(row);
      highBySemanticKey.set(key, list);
    }
    const semanticCollisions = [];
    for (const lowRow of low.activities) {
      for (const highRow of highBySemanticKey.get(semanticKey(lowRow)) || []) {
        semanticCollisions.push({
          semantic_key: semanticKey(lowRow),
          low_relationship_id: lowRow.id,
          high_relationship_id: highRow.id,
          low_row: lowRow,
          high_row: highRow
        });
      }
    }
    return {
      confidence: candidate.confidence,
      detector_version: candidate.detector_version,
      evidence_fingerprint: candidate.evidence_fingerprint,
      evidence: candidate.evidence,
      semantic_relationship_collisions: semanticCollisions,
      merge_ready_without_relationship_reconciliation:
        semanticCollisions.length === 0
        && low.person_type === high.person_type
        && low.historicity === high.historicity,
      low,
      high
    };
  });

  const report = {
    marker: 'PHASE9C_LIVE_CANDIDATE_PREVIEW',
    status: 'PASS',
    read_only: true,
    detector_version: DETECTOR_VERSION,
    counts: {
      persons: peopleResult.rowCount,
      person_names: namesResult.rowCount,
      relationships: activitiesResult.rowCount,
      detected_candidates: candidates.length,
      confidence_090_plus: candidates.filter((item) => item.confidence >= 0.9).length,
      confidence_075_08999: candidates.filter((item) => item.confidence >= 0.75 && item.confidence < 0.9).length,
      confidence_below_075: candidates.filter((item) => item.confidence < 0.75).length,
      merge_ready_without_relationship_reconciliation: candidates.filter((item) => item.merge_ready_without_relationship_reconciliation).length,
      candidates_with_relationship_collisions: candidates.filter((item) => item.semantic_relationship_collisions.length > 0).length,
      persons_with_internal_relationship_duplicates: new Set(candidates.flatMap((item) => [item.low, item.high]).filter((person) => person.internal_relationship_duplicates.length > 0).map((person) => person.id)).size
    },
    candidates
  };

  await client.query('commit');
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  try { await client.query('rollback'); } catch {}
  const report = {
    marker: 'PHASE9C_LIVE_CANDIDATE_PREVIEW',
    status: 'FAIL',
    read_only: true,
    error: error?.message || String(error)
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  throw error;
} finally {
  await client.end();
}
