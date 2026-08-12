import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { DETECTOR_VERSION, detectPersonDuplicateCandidates } = require('../server/atlas-duplicate-detector.js');

function arg(name, fallback = null) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : fallback; }
const intakePath = arg('--intake');
const outPath = arg('--out', 'artifacts/stage2-baseline-a-person-duplicate-candidates.json');
if (!intakePath) throw new Error('missing --intake');

const intake = JSON.parse(fs.readFileSync(intakePath, 'utf8'));
if (intake?.schema !== 'atlas-stage2-baseline-a-intake/v2') throw new Error('expected validated Baseline A intake v2');
if (intake.row_count !== 338 || (intake.identity_catalogs?.persons || []).length !== 302) throw new Error('Baseline A identity/count drift');
if (intake.authority?.production_mutation_authorized !== false) throw new Error('duplicate rebuild must remain non-mutating');

const names = [];
for (const person of intake.identity_catalogs.persons || []) {
  for (const name of person.names || []) {
    names.push({
      person_id: person.id,
      name: name.name,
      locale: name.locale,
      is_preferred: Boolean(name.is_preferred)
    });
  }
}
const activities = (intake.activity_rows || []).map((row) => ({
  person_id: row.person_id,
  polity_id: row.polity_id,
  activity_start: row.activity_start,
  activity_end: row.activity_end
}));
const candidates = detectPersonDuplicateCandidates({ names, activities });
const people = new Map((intake.identity_catalogs.persons || []).map((p) => [p.id, p]));
const enriched = candidates.map((candidate) => ({
  ...candidate,
  person_low: { id: candidate.person_low_id, canonical_key: people.get(candidate.person_low_id)?.canonical_key ?? null },
  person_high: { id: candidate.person_high_id, canonical_key: people.get(candidate.person_high_id)?.canonical_key ?? null }
}));

const result = {
  schema: 'atlas-stage2-baseline-a-person-duplicate-candidates/v1',
  status: 'P4_OFFLINE_REBUILD_NO_PRODUCTION_MUTATION',
  baseline: {
    deployment_sha: intake.deployment_sha,
    baseline_digest: intake.baseline_digest,
    persons: (intake.identity_catalogs.persons || []).length,
    activities: intake.row_count
  },
  detector_version: DETECTOR_VERSION,
  names_examined: names.length,
  candidate_count: enriched.length,
  candidates: enriched,
  rules: {
    exact_current_detector_reused: true,
    names_are_candidate_evidence_not_identity: true,
    no_physical_person_merge: true,
    production_mutation_authorized: false
  }
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ marker: 'ATLAS_BASELINE_A_PERSON_DUPLICATE_REBUILD_OK', detector_version: DETECTOR_VERSION, persons: result.baseline.persons, names_examined: names.length, candidate_count: enriched.length, production_mutation_authorized: false }, null, 2));
