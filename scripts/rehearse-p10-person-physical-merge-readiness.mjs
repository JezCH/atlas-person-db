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
const completion = require('../server/atlas-person-duplicate-revalidation-readiness.js');
const mergeService = require('../server/atlas-person-merge-service.js');
const mergeInterlock = require('../server/atlas-person-merge-interlock.js');

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL is required');

const GORGO_SURVIVOR = '5136407a-9792-5103-be6f-54c947b255a5';
const GORGO_DUPLICATE = 'a3367f19-e901-5213-aba6-76c4aef1b730';
const GORGO_REQUIREMENT = 'p10:gorgo-of-sparta:gorgo:p4-reviewed-same-person';
const ALPHA_LOW = '10000000-0000-4000-8000-000000000001';
const ALPHA_HIGH = '20000000-0000-4000-8000-000000000002';
const OVERLAP_REQUIREMENT = 'fixture:p10d:gorgo-alpha-overlap';
const MERGE_REQUEST = 'fixture:p10d:gorgo-physical-merge';

const baselineSchema = fs.readFileSync(path.join(root, 'db/schema/atlas_v2.current.sql'), 'utf8');
const requirementMigration = fs.readFileSync(path.join(root, 'migration/phase-10/p10-person-duplicate-revalidation-requirements.sql'), 'utf8');
const warningMessages = [];
const warningListener = (warning) => warningMessages.push(String(warning?.message || warning));
process.on('warning', warningListener);

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query('drop schema if exists atlas_v2 cascade');
  await client.query(baselineSchema);
  await applyAuthoringMigrations(client);
  await applyCorrectionMigrations(client);
  const release = await applyStage2SchemaRelease(client);
  assert.equal(release.applied.length, 6);
  await client.query(requirementMigration);

  const staticState = mergeInterlock.personMergeExecutionState();
  assert.equal(staticState.person_merge_lifecycle_version, 'p10-v2-revalidated');
  assert.equal(staticState.reconciliation_semantic_version, 'v2-relation-full-temporal');
  assert.equal(staticState.allowed, true);

  await client.query(`insert into atlas_v2.persons(id,canonical_key,person_type,historicity) values
    ($1::uuid,'p10d-gorgo-of-sparta','historical','historical'),
    ($2::uuid,'p10d-gorgo','historical','historical'),
    ($3::uuid,'p10d-alpha-low','historical','historical'),
    ($4::uuid,'p10d-alpha-high','historical','historical')`, [GORGO_SURVIVOR, GORGO_DUPLICATE, ALPHA_LOW, ALPHA_HIGH]);
  await client.query(`insert into atlas_v2.person_names(id,person_id,locale,name,name_type,is_preferred) values
    (gen_random_uuid(),$1::uuid,'en','Gorgo of Sparta','preferred',true),
    (gen_random_uuid(),$2::uuid,'en','Gorgo','preferred',true),
    (gen_random_uuid(),$3::uuid,'en','Alpha Duplicate','preferred',true),
    (gen_random_uuid(),$4::uuid,'en','Alpha Duplicate','preferred',true)`, [GORGO_SURVIVOR, GORGO_DUPLICATE, ALPHA_LOW, ALPHA_HIGH]);

  let rebuilt = await duplicateReview.rebuildCandidates({ client });
  assert.equal(rebuilt.detected, 2);
  let queue = await duplicateReview.listCandidates({ client });
  const gorgo = queue.candidates.find((candidate) => candidate.low.id === GORGO_SURVIVOR && candidate.high.id === GORGO_DUPLICATE);
  const alpha = queue.candidates.find((candidate) => candidate.low.id === ALPHA_LOW && candidate.high.id === ALPHA_HIGH);
  assert.ok(gorgo);
  assert.ok(alpha);
  assert.ok(gorgo.evidence.some((item) => item.kind === 'P10_REVALIDATION_REQUIREMENT'));
  assert.ok(!gorgo.evidence.some((item) => item.kind === 'EXACT_NAME'));

  await duplicateReview.reviewCandidate({
    client,
    candidateId: gorgo.id,
    decision: 'MERGE',
    rationale: 'P10-D fixture confirms the durable historical identity decision under current v2 evidence.',
    requestId: 'fixture:p10d:review:gorgo'
  });

  await assert.rejects(
    () => mergeService.executeApprovedPersonMerge({
      client,
      candidateId: gorgo.id,
      survivorPersonId: GORGO_SURVIVOR,
      requestId: 'fixture:p10d:blocked-by-global-readiness'
    }),
    (error) => error?.code === 'P10_PERSON_DUPLICATE_REVALIDATION_INCOMPLETE'
  );
  let count = await client.query(`select count(*)::int as count from atlas_v2.persons where id=any($1::uuid[])`, [[GORGO_SURVIVOR, GORGO_DUPLICATE]]);
  assert.equal(count.rows[0].count, 2);
  count = await client.query(`select count(*)::int as count from atlas_v2.person_merge_audits`);
  assert.equal(count.rows[0].count, 0);

  await duplicateReview.reviewCandidate({
    client,
    candidateId: alpha.id,
    decision: 'KEEP_SEPARATE',
    rationale: 'Independent fixture pair remains separate and closes the global frontier.',
    requestId: 'fixture:p10d:review:alpha'
  });
  let readiness = await completion.inspectPersonDuplicateRevalidationReadiness(client);
  assert.equal(readiness.ready, true, readiness.blockers.join(';'));

  const overlapLow = [ALPHA_LOW, GORGO_DUPLICATE].sort()[0];
  const overlapHigh = [ALPHA_LOW, GORGO_DUPLICATE].sort()[1];
  await client.query(`insert into atlas_v2.person_duplicate_revalidation_requirements(
      requirement_key,person_low_id,person_high_id,requirement_state,requirement_version,prior_outcome,
      source_artifact,source_decision_id,evidence_snapshot
    ) values($1,$2::uuid,$3::uuid,'ACTIVE','p10-revalidation-requirement/v1','KEEP_SEPARATE',
      'fixture:p10d','overlap-rebind-required','{"fixture":true}'::jsonb)`, [OVERLAP_REQUIREMENT, overlapLow, overlapHigh]);
  rebuilt = await duplicateReview.rebuildCandidates({ client });
  assert.equal(rebuilt.detected, 3);
  queue = await duplicateReview.listCandidates({ client });
  const overlap = queue.candidates.find((candidate) => candidate.evidence.some((item) => item.requirement_key === OVERLAP_REQUIREMENT));
  assert.ok(overlap);
  await duplicateReview.reviewCandidate({
    client,
    candidateId: overlap.id,
    decision: 'KEEP_SEPARATE',
    rationale: 'Fixture overlap is terminal so the merge service must enforce explicit requirement rebinding.',
    requestId: 'fixture:p10d:review:overlap'
  });
  readiness = await completion.inspectPersonDuplicateRevalidationReadiness(client);
  assert.equal(readiness.ready, true, readiness.blockers.join(';'));

  await assert.rejects(
    () => mergeService.executeApprovedPersonMerge({
      client,
      candidateId: gorgo.id,
      survivorPersonId: GORGO_SURVIVOR,
      requestId: 'fixture:p10d:blocked-by-overlap'
    }),
    (error) => error?.code === 'P10_OVERLAPPING_REVALIDATION_REQUIREMENT_REQUIRES_REBIND'
  );
  count = await client.query(`select count(*)::int as count from atlas_v2.persons where id=any($1::uuid[])`, [[GORGO_SURVIVOR, GORGO_DUPLICATE]]);
  assert.equal(count.rows[0].count, 2);

  await client.query(`update atlas_v2.person_duplicate_revalidation_requirements
    set requirement_state='RETIRED',updated_at=now() where requirement_key=$1`, [OVERLAP_REQUIREMENT]);
  rebuilt = await duplicateReview.rebuildCandidates({ client });
  assert.equal(rebuilt.detected, 2);
  readiness = await completion.inspectPersonDuplicateRevalidationReadiness(client);
  assert.equal(readiness.ready, true, readiness.blockers.join(';'));
  queue = await duplicateReview.listCandidates({ client });
  const gorgoReady = queue.candidates.find((candidate) => candidate.low.id === GORGO_SURVIVOR && candidate.high.id === GORGO_DUPLICATE);
  assert.equal(gorgoReady.current_decision, 'MERGE');

  const merged = await mergeService.executeApprovedPersonMerge({
    client,
    candidateId: gorgoReady.id,
    survivorPersonId: GORGO_SURVIVOR,
    requestId: MERGE_REQUEST
  });
  assert.equal(merged.replayed, false);
  assert.equal(merged.survivor_person_id, GORGO_SURVIVOR);
  assert.equal(merged.source_person_id, GORGO_DUPLICATE);
  assert.equal(merged.mutation_summary.pre_merge_revalidation_readiness.ready, true);
  assert.deepEqual(merged.mutation_summary.revalidation_requirements_retired, [GORGO_REQUIREMENT]);
  assert.equal(merged.mutation_summary.candidate_frontier_refresh.detected_after_merge, 1);
  assert.equal(merged.mutation_summary.post_merge_revalidation_readiness.ready, true);

  count = await client.query(`select count(*)::int as count from atlas_v2.persons where id=$1`, [GORGO_DUPLICATE]);
  assert.equal(count.rows[0].count, 0);
  const survivorNames = await client.query(`select name from atlas_v2.person_names where person_id=$1 order by name`, [GORGO_SURVIVOR]);
  assert.deepEqual(survivorNames.rows.map((row) => row.name), ['Gorgo', 'Gorgo of Sparta']);
  const requirementState = await client.query(`select requirement_state from atlas_v2.person_duplicate_revalidation_requirements where requirement_key=$1`, [GORGO_REQUIREMENT]);
  assert.equal(requirementState.rows[0].requirement_state, 'RETIRED');
  const mergedCandidate = await client.query(`select candidate_state from atlas_v2.person_duplicate_candidates where id=$1`, [gorgoReady.id]);
  assert.equal(mergedCandidate.rows[0].candidate_state, 'STALE');

  queue = await duplicateReview.listCandidates({ client });
  assert.equal(queue.candidates.length, 1);
  assert.deepEqual([queue.candidates[0].low.id, queue.candidates[0].high.id], [ALPHA_LOW, ALPHA_HIGH]);
  assert.equal(queue.candidates[0].current_decision, 'KEEP_SEPARATE');
  readiness = await completion.inspectPersonDuplicateRevalidationReadiness(client);
  assert.equal(readiness.ready, true, readiness.blockers.join(';'));

  const replayed = await mergeService.executeApprovedPersonMerge({
    client,
    candidateId: gorgoReady.id,
    survivorPersonId: GORGO_SURVIVOR,
    requestId: MERGE_REQUEST
  });
  assert.equal(replayed.replayed, true);
  assert.equal(replayed.merge_audit_id, merged.merge_audit_id);

  const audit = await client.query(`select candidate_id,survivor_person_id,source_person_id,mutation_summary from atlas_v2.person_merge_audits where request_id=$1`, [MERGE_REQUEST]);
  assert.equal(audit.rowCount, 1);
  assert.equal(String(audit.rows[0].candidate_id), gorgoReady.id);
  assert.equal(String(audit.rows[0].survivor_person_id), GORGO_SURVIVOR);
  assert.equal(String(audit.rows[0].source_person_id), GORGO_DUPLICATE);
  assert.equal(audit.rows[0].mutation_summary.post_merge_revalidation_readiness.ready, true);

  await new Promise((resolve) => setImmediate(resolve));
  const concurrentQueryWarnings = warningMessages.filter((message) => /client\.query\(\).*already executing|already executing a query/i.test(message));
  assert.deepEqual(concurrentQueryWarnings, []);

  console.log(JSON.stringify({
    marker: 'ATLAS_P10_PERSON_PHYSICAL_MERGE_READINESS_OK',
    static_lifecycle_ready: staticState.allowed,
    global_unreviewed_candidate_blocks_merge: true,
    overlapping_requirement_blocks_merge: true,
    durable_requirement_only_pair_merges: true,
    exact_requirement_retired_not_deleted: true,
    candidate_frontier_refreshed_in_transaction: true,
    replay_idempotent: true,
    same_client_concurrent_query_warnings: concurrentQueryWarnings.length,
    production_mutation_authorized: false
  }, null, 2));
} catch (error) {
  try { await client.query('rollback'); } catch {}
  throw error;
} finally {
  process.removeListener('warning', warningListener);
  await client.end();
}
