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
const { applyP9Cutover } = require('../server/atlas-stage2-p9-db-cutover.js');
const duplicateReview = require('../server/atlas-duplicate-review-service.js');
const p10Completion = require('../server/atlas-person-duplicate-revalidation-readiness.js');
const mergeService = require('../server/atlas-person-merge-service.js');
const baselineB = require('../server/atlas-baseline-b.js');

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL is required');

const GORGO_SURVIVOR = '5136407a-9792-5103-be6f-54c947b255a5';
const GORGO_DUPLICATE = 'a3367f19-e901-5213-aba6-76c4aef1b730';
const GORGO_REQUIREMENT = 'p10:gorgo-of-sparta:gorgo:p4-reviewed-same-person';
const MERGE_REQUEST = 'fixture:p11:gorgo-physical-merge';

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
  await applyP9Cutover(client);
  await client.query(requirementMigration);

  await client.query(`insert into atlas_v2.persons(id,canonical_key,person_type,historicity) values
    ($1::uuid,'p11-gorgo-of-sparta','historical','historical'),
    ($2::uuid,'p11-gorgo','historical','historical')`, [GORGO_SURVIVOR, GORGO_DUPLICATE]);
  await client.query(`insert into atlas_v2.person_names(id,person_id,locale,name,name_type,is_preferred) values
    (gen_random_uuid(),$1::uuid,'en','Gorgo of Sparta','preferred',true),
    (gen_random_uuid(),$2::uuid,'en','Gorgo','preferred',true)`, [GORGO_SURVIVOR, GORGO_DUPLICATE]);

  const rebuilt = await duplicateReview.rebuildCandidates({ client });
  assert.equal(rebuilt.detected, 1);
  const queue = await duplicateReview.listCandidates({ client });
  assert.equal(queue.candidates.length, 1);
  const gorgo = queue.candidates[0];
  assert.deepEqual([gorgo.low.id, gorgo.high.id], [GORGO_SURVIVOR, GORGO_DUPLICATE]);
  assert.ok(gorgo.evidence.some((item) => item.requirement_key === GORGO_REQUIREMENT));

  await duplicateReview.reviewCandidate({
    client,
    candidateId: gorgo.id,
    decision: 'MERGE',
    rationale: 'P11 fixture closes the durable P10 identity decision before Baseline B capture.',
    requestId: 'fixture:p11:review:gorgo'
  });

  const p10BeforeMerge = await p10Completion.inspectPersonDuplicateRevalidationReadiness(client);
  assert.equal(p10BeforeMerge.ready, true, p10BeforeMerge.blockers.join(';'));

  const p11BeforeMerge = await baselineB.inspectBaselineBReadiness(client);
  assert.equal(p11BeforeMerge.ready, false);
  assert.ok(p11BeforeMerge.blockers.includes('APPROVED_PERSON_MERGES_PENDING:1'));

  const merged = await mergeService.executeApprovedPersonMerge({
    client,
    candidateId: gorgo.id,
    survivorPersonId: GORGO_SURVIVOR,
    requestId: MERGE_REQUEST
  });
  assert.equal(merged.replayed, false);
  assert.equal(merged.source_person_id, GORGO_DUPLICATE);
  assert.deepEqual(merged.mutation_summary.revalidation_requirements_retired, [GORGO_REQUIREMENT]);
  assert.equal(merged.mutation_summary.post_merge_revalidation_readiness.ready, true);

  const p11AfterMerge = await baselineB.inspectBaselineBReadiness(client);
  assert.equal(p11AfterMerge.ready, true, p11AfterMerge.blockers.join(';'));
  assert.equal(p11AfterMerge.duplicate_frontier.approved_merges_pending, 0);
  assert.equal(p11AfterMerge.duplicate_frontier.unresolved, 0);
  assert.equal(p11AfterMerge.merge_audit.merged_source_person_still_live, 0);

  const capture = await baselineB.captureBaselineB(client);
  assert.equal(capture.schema, baselineB.BASELINE_B_SCHEMA);
  assert.equal(capture.semantic_version, baselineB.BASELINE_B_SEMANTIC_VERSION);
  assert.equal(capture.authority.production_mutation_authorized, false);
  assert.equal(capture.counts.persons, 1);
  assert.equal(capture.counts.person_names, 2);
  assert.equal(capture.counts.activities, 0);
  assert.match(capture.baseline_digest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(capture.readiness.ready, true);

  const serialized = JSON.parse(JSON.stringify(capture));
  const rebuiltDocument = baselineB.buildBaselineBDocument({
    datasets: serialized.datasets,
    readiness: serialized.readiness
  });
  assert.equal(rebuiltDocument.baseline_digest, capture.baseline_digest);
  assert.deepEqual(rebuiltDocument.dataset_digests, capture.dataset_digests);

  console.log(JSON.stringify({
    marker: 'ATLAS_P11_BASELINE_B_READINESS_OK',
    p10_review_ready_before_merge: p10BeforeMerge.ready,
    p11_blocked_until_physical_merge: true,
    p11_ready_after_physical_merge: p11AfterMerge.ready,
    baseline_b_digest: capture.baseline_digest,
    captured_dataset_count: Object.keys(capture.datasets).length,
    serialized_round_trip_stable: true,
    production_mutation_authorized: false
  }, null, 2));
} catch (error) {
  try { await client.query('rollback'); } catch {}
  throw error;
} finally {
  await client.end();
}
