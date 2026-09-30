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
const canonicalReadiness = require('../server/atlas-canonical-data-readiness.js');

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL is required');

const GORGO_SURVIVOR = '5136407a-9792-5103-be6f-54c947b255a5';
const GORGO_DUPLICATE = 'a3367f19-e901-5213-aba6-76c4aef1b730';
const GORGO_REQUIREMENT = 'p10:gorgo-of-sparta:gorgo:p4-reviewed-same-person';
const MERGE_REQUEST = 'fixture:canonical-readiness:gorgo-physical-merge';
const CANDIDATE_REGISTRATION_ID = 'fixture:canonical-readiness:gorgo-registration';

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
    ($1::uuid,'canonical-readiness-gorgo-of-sparta','historical','historical'),
    ($2::uuid,'canonical-readiness-gorgo','historical','historical')`, [GORGO_SURVIVOR, GORGO_DUPLICATE]);
  await client.query(`insert into atlas_v2.person_names(id,person_id,locale,name,name_type,is_preferred) values
    (gen_random_uuid(),$1::uuid,'en','Gorgo of Sparta','preferred',true),
    (gen_random_uuid(),$2::uuid,'en','Gorgo','preferred',true)`, [GORGO_SURVIVOR, GORGO_DUPLICATE]);

  await client.query(`
    insert into atlas_v2.person_candidate_review_revisions(
      candidate_id,revision,review_state,review_checkpoint,reviewed_payload,payload_hash,human_authorized
    ) values($1,1,'APPROVED','fixture:canonical-readiness', $2::jsonb, $3, true)
  `, [CANDIDATE_REGISTRATION_ID, JSON.stringify({ canonical_name_en:'Gorgo' }), 'fixture-gorgo-registration-v1']);
  await client.query(`
    insert into atlas_v2.person_candidate_registration_states(
      candidate_id,review_revision,registration_state,person_id,authoring_request_id,result_snapshot
    ) values($1,1,'REGISTERED',$2::uuid,'fixture:canonical-readiness:gorgo-authoring',$3::jsonb)
  `, [CANDIDATE_REGISTRATION_ID, GORGO_DUPLICATE, JSON.stringify({ person_id:GORGO_DUPLICATE })]);

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
    rationale: 'Canonical readiness fixture closes the reviewed identity decision before physical merge.',
    requestId: 'fixture:canonical-readiness:review:gorgo'
  });

  const revalidationBeforeMerge = await p10Completion.inspectPersonDuplicateRevalidationReadiness(client);
  assert.equal(revalidationBeforeMerge.ready, true, revalidationBeforeMerge.blockers.join(';'));

  const readinessBeforeMerge = await canonicalReadiness.inspectCanonicalDataReadiness(client);
  assert.equal(readinessBeforeMerge.ready, false);
  assert.ok(readinessBeforeMerge.blockers.includes('APPROVED_PERSON_MERGES_PENDING:1'));

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

  const candidateRegistration = await client.query(`
    select person_id::text
      from atlas_v2.person_candidate_registration_states
     where candidate_id=$1
  `, [CANDIDATE_REGISTRATION_ID]);
  assert.equal(candidateRegistration.rows[0]?.person_id, GORGO_SURVIVOR);
  assert.equal(merged.mutation_summary.candidate_registration_states_moved, 1);

  const readinessAfterMerge = await canonicalReadiness.inspectCanonicalDataReadiness(client);
  assert.equal(readinessAfterMerge.ready, true, readinessAfterMerge.blockers.join(';'));
  assert.equal(readinessAfterMerge.canonical_schema.expected_table_count, 41);
  assert.equal(readinessAfterMerge.canonical_schema.present_table_count, 41);
  assert.deepEqual(readinessAfterMerge.canonical_schema.missing_tables, []);
  assert.equal(readinessAfterMerge.duplicate_frontier.approved_merges_pending, 0);
  assert.equal(readinessAfterMerge.duplicate_frontier.unresolved, 0);
  assert.equal(readinessAfterMerge.merge_audit.merged_source_person_still_live, 0);

  console.log(JSON.stringify({
    marker: 'ATLAS_CANONICAL_DATA_READINESS_OK',
    identity_review_ready_before_merge: revalidationBeforeMerge.ready,
    readiness_blocked_until_physical_merge: true,
    readiness_ready_after_physical_merge: readinessAfterMerge.ready,
    canonical_schema_tables_present: readinessAfterMerge.canonical_schema.present_table_count,
    approved_merges_pending: readinessAfterMerge.duplicate_frontier.approved_merges_pending,
    unresolved_duplicate_frontier: readinessAfterMerge.duplicate_frontier.unresolved,
    merged_source_person_still_live: readinessAfterMerge.merge_audit.merged_source_person_still_live,
    candidate_registration_pointer_remapped: candidateRegistration.rows[0]?.person_id === GORGO_SURVIVOR,
    production_mutation_authorized: false
  }, null, 2));
} catch (error) {
  try { await client.query('rollback'); } catch {}
  throw error;
} finally {
  await client.end();
}
