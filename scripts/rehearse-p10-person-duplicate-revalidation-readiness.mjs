import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import pg from 'pg';

const require = createRequire(import.meta.url);
const { applyAuthoringMigrations } = require('../server/atlas-authoring-migrations.js');
const { applyCorrectionMigrations } = require('../server/atlas-correction-migrations.js');
const { applyStage2SchemaRelease } = require('../server/atlas-stage2-schema-release.js');
const duplicateReview = require('../server/atlas-duplicate-review-service.js');
const duplicateDetector = require('../server/atlas-duplicate-detector.js');
const completion = require('../server/atlas-person-duplicate-revalidation-readiness.js');
const mergeReferences = require('../server/atlas-person-merge-reference-readiness.js');
const mergeInterlock = require('../server/atlas-person-merge-interlock.js');

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL is required');

const GORGO_SURVIVOR = '5136407a-9792-5103-be6f-54c947b255a5';
const GORGO_DUPLICATE = 'a3367f19-e901-5213-aba6-76c4aef1b730';
const REQUIREMENT_KEY = 'p10:gorgo-of-sparta:gorgo:p4-reviewed-same-person';

const baselineSchema = fs.readFileSync(path.join(root, 'db/schema/atlas_v2.current.sql'), 'utf8');
const requirementMigration = fs.readFileSync(path.join(root, 'migration/phase-10/p10-person-duplicate-revalidation-requirements.sql'), 'utf8');
const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query('drop schema if exists atlas_v2 cascade');
  await client.query(baselineSchema);
  await applyAuthoringMigrations(client);
  await applyCorrectionMigrations(client);
  const release = await applyStage2SchemaRelease(client);
  assert.equal(release.applied.length, 6);

  let readiness = await completion.inspectPersonDuplicateRevalidationReadiness(client);
  assert.equal(readiness.ready, false);
  assert.deepEqual(readiness.blockers, ['P10_REVALIDATION_REQUIREMENT_SCHEMA_MISSING']);

  await client.query(requirementMigration);
  const referenceReadiness = await mergeReferences.inspectPersonMergeReferenceReadiness(client);
  assert.equal(referenceReadiness.ready, true, referenceReadiness.blockers.join(';'));
  assert.equal(referenceReadiness.requirement_ledger_present, true);
  assert.deepEqual(referenceReadiness.non_fk_person_uuid_columns, referenceReadiness.expected_non_fk_person_uuid_columns);
  assert.ok(referenceReadiness.non_fk_person_uuid_columns.includes('atlas_v2.person_duplicate_revalidation_requirements.person_low_id'));
  assert.ok(referenceReadiness.non_fk_person_uuid_columns.includes('atlas_v2.person_duplicate_revalidation_requirements.person_high_id'));

  readiness = await completion.inspectPersonDuplicateRevalidationReadiness(client);
  assert.equal(readiness.ready, false);
  assert.ok(readiness.blockers.includes(`REQUIREMENT_PERSON_MISSING:${REQUIREMENT_KEY}:${GORGO_SURVIVOR}`));
  assert.ok(readiness.blockers.includes(`REQUIREMENT_PERSON_MISSING:${REQUIREMENT_KEY}:${GORGO_DUPLICATE}`));
  assert.ok(readiness.blockers.includes(`REQUIREMENT_CANDIDATE_MISSING:${REQUIREMENT_KEY}`));

  await client.query(`insert into atlas_v2.persons(id,canonical_key,person_type,historicity) values
    ($1::uuid,'p10-gorgo-of-sparta-fixture','historical','historical'),
    ($2::uuid,'p10-gorgo-fixture','historical','historical')`, [GORGO_SURVIVOR, GORGO_DUPLICATE]);
  await client.query(`insert into atlas_v2.person_names(id,person_id,locale,name,name_type,is_preferred) values
    (gen_random_uuid(),$1::uuid,'en','Gorgo of Sparta','preferred',true),
    (gen_random_uuid(),$2::uuid,'en','Gorgo','preferred',true)`, [GORGO_SURVIVOR, GORGO_DUPLICATE]);

  const rebuilt = await duplicateReview.rebuildCandidates({ client });
  assert.equal(rebuilt.detector_version, duplicateDetector.DETECTOR_VERSION);
  assert.equal(rebuilt.detector_version, 'p10-v2-person-revalidation/v2');
  assert.equal(rebuilt.requirements_schema_ready, true);
  assert.equal(rebuilt.active_requirements, 1);
  assert.equal(rebuilt.detected, 1);
  assert.equal(rebuilt.revalidation_readiness.ready, false);
  assert.equal(rebuilt.revalidation_readiness.summary.pending_candidates, 1);

  let queue = await duplicateReview.listCandidates({ client });
  assert.equal(queue.candidates.length, 1);
  const candidate = queue.candidates[0];
  assert.deepEqual([candidate.low.id, candidate.high.id], [GORGO_SURVIVOR, GORGO_DUPLICATE]);
  assert.ok(candidate.evidence.some((item) => item.kind === 'P10_REVALIDATION_REQUIREMENT' && item.requirement_key === REQUIREMENT_KEY));
  assert.ok(!candidate.evidence.some((item) => item.kind === 'EXACT_NAME'));

  await duplicateReview.reviewCandidate({
    client,
    candidateId: candidate.id,
    decision: 'MERGE',
    rationale: 'Revalidated P4 reviewed identity evidence under the P10 v2 frontier; physical merge remains disabled.',
    requestId: 'fixture:p10c:gorgo-revalidation:merge'
  });

  readiness = await completion.inspectPersonDuplicateRevalidationReadiness(client);
  assert.equal(readiness.ready, true, readiness.blockers.join(';'));
  assert.deepEqual(readiness.summary, {
    active_requirements: 1,
    active_candidates: 1,
    terminal_candidates: 1,
    pending_candidates: 0
  });

  const beforeFingerprint = candidate.evidence_fingerprint;
  await client.query(`update atlas_v2.person_duplicate_revalidation_requirements
    set evidence_snapshot=evidence_snapshot || '{"rehearsal_revision":1}'::jsonb,updated_at=now()
    where requirement_key=$1`, [REQUIREMENT_KEY]);
  const rebuiltAfterEvidenceChange = await duplicateReview.rebuildCandidates({ client });
  assert.equal(rebuiltAfterEvidenceChange.detected, 1);
  queue = await duplicateReview.listCandidates({ client });
  assert.equal(queue.candidates.length, 1);
  assert.equal(queue.candidates[0].current_decision, 'REVIEW');
  assert.notEqual(queue.candidates[0].evidence_fingerprint, beforeFingerprint);
  readiness = await completion.inspectPersonDuplicateRevalidationReadiness(client);
  assert.equal(readiness.ready, false);
  assert.ok(readiness.blockers.includes(`CANDIDATE_REVIEW_PENDING:${candidate.id}`));

  const mergeState = mergeInterlock.personMergeExecutionState();
  assert.equal(mergeState.person_merge_lifecycle_version, 'pre-p10-blocked');
  assert.equal(mergeState.allowed, false);

  console.log(JSON.stringify({
    marker: 'ATLAS_P10_PERSON_DUPLICATE_REVALIDATION_COMPLETION_OK',
    detector_version: duplicateDetector.DETECTOR_VERSION,
    requirement_version: completion.REVALIDATION_REQUIREMENT_VERSION,
    durable_requirement_key: REQUIREMENT_KEY,
    heuristic_name_overlap_required: false,
    completion_ready_after_terminal_review: true,
    evidence_drift_demotes_to_review: true,
    physical_person_merge_allowed: false,
    production_mutation_authorized: false
  }, null, 2));
} catch (error) {
  try { await client.query('rollback'); } catch {}
  throw error;
} finally {
  await client.end();
}
