import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  DETECTOR_VERSION,
  DETECTOR_SCOPE,
  FROZEN_FROM_COMMIT,
  detectPersonDuplicateCandidates
} = require('./lib/stage2-baseline-a-historical-duplicate-detector.cjs');

function arg(name, fallback = null) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : fallback; }
const intakePath = arg('--intake');
const decisionsPath = arg('--decisions', 'stage2/integration/baseline-a-person-identity-decisions.v1.json');
const outPath = arg('--out', 'artifacts/stage2-baseline-a-person-duplicate-candidates.json');
if (!intakePath) throw new Error('missing --intake');

const intake = JSON.parse(fs.readFileSync(intakePath, 'utf8'));
const decisions = JSON.parse(fs.readFileSync(decisionsPath, 'utf8'));
if (intake?.schema !== 'atlas-stage2-baseline-a-intake/v2') throw new Error('expected validated Baseline A intake v2');
if (intake.row_count !== 338 || (intake.identity_catalogs?.persons || []).length !== 302) throw new Error('Baseline A identity/count drift');
if (intake.authority?.production_mutation_authorized !== false) throw new Error('duplicate rebuild must remain non-mutating');
if (decisions?.schema !== 'atlas-stage2-baseline-a-person-identity-decisions/v1' || decisions.status !== 'P4_PERSON_IDENTITY_DECISIONS_ONLY_NO_PHYSICAL_MERGE') throw new Error('reviewed Person identity decisions missing');
if (decisions.baseline_digest !== intake.baseline_digest) throw new Error('Person identity decision Baseline digest mismatch');
if (decisions.rules?.heuristic_detector_non_candidate_does_not_overrule_reviewed_identity_evidence !== true) throw new Error('detector authority boundary missing');
if (decisions.result?.physical_person_merges_performed !== 0 || decisions.result?.production_mutation_authorized !== false) throw new Error('P4 duplicate handoff must remain non-mutating');
if (DETECTOR_SCOPE !== 'HISTORICAL_BASELINE_A_REPLAY_ONLY') throw new Error('historical detector scope drift');

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

function orderedPairKey(a, b) {
  return [String(a), String(b)].sort().join('|');
}
const detectorPairs = new Set(enriched.map((candidate) => orderedPairKey(candidate.person_low_id, candidate.person_high_id)));
const reviewedIdentityDecisions = (decisions.decisions || []).map((decision) => ({
  id: decision.id,
  activity_id: decision.activity_id,
  current_person_id: decision.current_person_id,
  current_person: decision.current_person,
  identity_decision: decision.decision,
  p10_physical_merge_required: Boolean(decision.p10_physical_merge_required),
  physical_merge_authorized_now: Boolean(decision.physical_merge_authorized_now),
  duplicate_person_id: decision.duplicate_person_id ?? null,
  duplicate_person: decision.duplicate_person ?? null,
  canonical_survivor_person_id: decision.canonical_survivor_person_id ?? null
}));
const p10PhysicalMergeQueue = reviewedIdentityDecisions
  .filter((decision) => decision.p10_physical_merge_required)
  .map((decision) => ({
    decision_id: decision.id,
    survivor_person_id: decision.canonical_survivor_person_id,
    duplicate_person_id: decision.duplicate_person_id,
    duplicate_current_activity_count: activities.filter((row) => row.person_id === decision.duplicate_person_id).length,
    detected_by_historical_baseline_heuristic: detectorPairs.has(orderedPairKey(decision.canonical_survivor_person_id, decision.duplicate_person_id)),
    execution_phase: 'P10_AFTER_SEMANTIC_KEY_V2',
    physical_merge_authorized_now: false
  }));
if (reviewedIdentityDecisions.length !== 2 || p10PhysicalMergeQueue.length !== 1) throw new Error('reviewed Person identity handoff count drift');
if (p10PhysicalMergeQueue[0].duplicate_current_activity_count !== 0) throw new Error('reviewed Gorgo orphan duplicate Activity count drift');

const result = {
  schema: 'atlas-stage2-baseline-a-person-duplicate-candidates/v2',
  status: 'P4_HISTORICAL_OFFLINE_REPLAY_AND_REVIEWED_HANDOFF_NO_PRODUCTION_MUTATION',
  baseline: {
    deployment_sha: intake.deployment_sha,
    baseline_digest: intake.baseline_digest,
    persons: (intake.identity_catalogs.persons || []).length,
    activities: intake.row_count
  },
  detector: {
    version: DETECTOR_VERSION,
    scope: DETECTOR_SCOPE,
    frozen_from_commit: FROZEN_FROM_COMMIT,
    names_examined: names.length,
    candidate_count: enriched.length,
    candidates: enriched
  },
  reviewed_identity: {
    decisions_path: decisionsPath,
    decision_count: reviewedIdentityDecisions.length,
    decisions: reviewedIdentityDecisions,
    p10_physical_merge_queue_count: p10PhysicalMergeQueue.length,
    p10_physical_merge_queue: p10PhysicalMergeQueue
  },
  rules: {
    exact_current_detector_reused: false,
    historical_baseline_detector_frozen: true,
    historical_detector_is_not_p10_authority: true,
    current_p10_detector_must_remain_semantic_v2_fail_closed: true,
    heuristic_detector_is_candidate_generator_not_identity_authority: true,
    reviewed_identity_evidence_may_resolve_detector_non_candidate: true,
    names_are_candidate_evidence_not_identity: true,
    physical_merge_waits_for_p10_semantic_key_v2: true,
    no_physical_person_merge: true,
    production_mutation_authorized: false
  }
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({
  marker: 'ATLAS_BASELINE_A_PERSON_DUPLICATE_REBUILD_OK',
  detector_version: DETECTOR_VERSION,
  detector_scope: DETECTOR_SCOPE,
  detector_frozen_from_commit: FROZEN_FROM_COMMIT,
  persons: result.baseline.persons,
  names_examined: names.length,
  detector_candidate_count: enriched.length,
  reviewed_identity_decisions: reviewedIdentityDecisions.length,
  p10_physical_merge_queue_count: p10PhysicalMergeQueue.length,
  production_mutation_authorized: false
}, null, 2));
