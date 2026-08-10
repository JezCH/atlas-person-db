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

await client.connect();
try {
  await client.query('begin transaction isolation level repeatable read read only');

  const [peopleResult, namesResult, activitiesResult, polityNamesResult] = await Promise.all([
    client.query(`select id,canonical_key,person_type,historicity from atlas_v2.persons order by id`),
    client.query(`select person_id,name,locale,is_preferred from atlas_v2.person_names order by person_id,is_preferred desc,locale,name`),
    client.query(`select person_id,polity_id,activity_start,activity_end from atlas_v2.person_politics_v2 order by person_id,activity_start,activity_end,polity_id`),
    client.query(`select polity_id,name,locale,is_preferred from atlas_v2.polity_names where is_preferred=true order by polity_id,locale,name`)
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

  const polityNames = new Map();
  for (const row of polityNamesResult.rows || []) {
    const key = String(row.polity_id);
    const item = polityNames.get(key) || {};
    if (row.locale === 'ko') item.ko = String(row.name);
    if (row.locale === 'en') item.en = String(row.name);
    polityNames.set(key, item);
  }

  const activitiesByPerson = new Map();
  for (const row of activities) {
    const key = String(row.person_id);
    const list = activitiesByPerson.get(key) || [];
    const polity = polityNames.get(String(row.polity_id)) || {};
    list.push({
      polity_id: String(row.polity_id),
      polity_ko: polity.ko || null,
      polity_en: polity.en || null,
      activity_start: Number(row.activity_start),
      activity_end: Number(row.activity_end)
    });
    activitiesByPerson.set(key, list);
  }

  const personMeta = new Map((peopleResult.rows || []).map((row) => [String(row.id), row]));
  const decorate = (personId) => {
    const personNames = namesByPerson.get(personId) || [];
    const meta = personMeta.get(personId) || {};
    return {
      id: personId,
      canonical_key: meta.canonical_key || null,
      person_type: meta.person_type || null,
      historicity: meta.historicity || null,
      display_ko: preferredName(personNames, 'ko'),
      display_en: preferredName(personNames, 'en'),
      names: personNames,
      activities: activitiesByPerson.get(personId) || []
    };
  };

  const candidates = detected.map((candidate) => ({
    confidence: candidate.confidence,
    detector_version: candidate.detector_version,
    evidence_fingerprint: candidate.evidence_fingerprint,
    evidence: candidate.evidence,
    low: decorate(String(candidate.person_low_id)),
    high: decorate(String(candidate.person_high_id))
  }));

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
      confidence_below_075: candidates.filter((item) => item.confidence < 0.75).length
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
