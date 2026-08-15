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
const { createAuthoringManifestDispatchService } = require('../server/atlas-authoring-manifest-dispatch-service.js');
const { createStage2NativeActivityTx, loadStage2NativeActivity } = require('../server/atlas-stage2-native-activity-service.js');
const duplicateReview = require('../server/atlas-duplicate-review-service.js');
const duplicateDetector = require('../server/atlas-duplicate-detector.js');
const mergeInterlock = require('../server/atlas-person-merge-interlock.js');

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL is required');

const PERIOD_ID = '11111111-1111-4111-8111-111111111111';
const ACTIVE_IN = 'f33d2789-2e65-50c1-af3e-91335bcbd3ca';
const PERSON_B = '22222222-2222-4222-8222-222222222222';
const ROLE_B = '33333333-3333-4333-8333-333333333333';

function firstManifest() {
  return {
    schema: 'atlas-authoring-manifest/v2',
    request_id: 'fixture:p10-duplicate-v2:first-person',
    review_status: 'approved',
    person: {
      canonical_name_en: 'P10 Duplicate Fixture',
      display_name_ko: 'P10 중복 픽스처',
      canonical_key: 'p10-duplicate-fixture-a',
      person_type: 'historical',
      historicity: 'historical',
      allow_display_name_collision: false
    },
    polity_identity: {
      canonical_name_en: 'P10 Fixture Polity',
      display_name_ko: 'P10 픽스처 정치체',
      canonical_key: 'p10-fixture-polity',
      polity_type: 'historical_polity',
      historicity: 'historical',
      allow_display_name_collision: false
    },
    role_identity: {
      code: 'p10_fixture_role_a',
      source_label: 'P10 Fixture Role A',
      display_name_ko: 'P10 픽스처 역할 A',
      category: 'fixture'
    },
    activity: {
      polity_binding: { mode: 'declared' },
      role_binding: { mode: 'declared' },
      relation_type_id: ACTIVE_IN,
      period_basis_id: PERIOD_ID,
      activity_start: 1200,
      activity_start_month: 3,
      activity_start_day: 4,
      activity_start_granularity: 'day',
      activity_start_certainty: 'exact',
      activity_start_calendar: 'gregorian',
      activity_end: 1210,
      activity_end_month: 5,
      activity_end_day: 6,
      activity_end_granularity: 'day',
      activity_end_certainty: 'approximate',
      activity_end_calendar: 'gregorian',
      confidence: 'reviewed_fixture',
      chronology_status: 'reviewed_fixture',
      notes: 'Disposable P10 duplicate revalidation fixture.',
      source_links: []
    }
  };
}

function activityPayload(row, overrides = {}) {
  return {
    person_id: row.person_id,
    polity_id: row.polity_id,
    relation_type_id: row.relation_type_id,
    role_id: row.role_id,
    period_basis_id: row.period_basis_id,
    activity_start: row.activity_start,
    activity_start_month: row.activity_start_month,
    activity_start_day: row.activity_start_day,
    activity_start_granularity: row.activity_start_granularity,
    activity_start_certainty: row.activity_start_certainty,
    activity_start_calendar: row.activity_start_calendar,
    activity_end: row.activity_end,
    activity_end_month: row.activity_end_month,
    activity_end_day: row.activity_end_day,
    activity_end_granularity: row.activity_end_granularity,
    activity_end_certainty: row.activity_end_certainty,
    activity_end_calendar: row.activity_end_calendar,
    confidence: row.confidence,
    chronology_status: row.chronology_status,
    notes: row.notes,
    source_links: row.source_links || [],
    ...overrides
  };
}

const baselineSchema = fs.readFileSync(path.join(root, 'db/schema/atlas_v2.current.sql'), 'utf8');
const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query('DROP SCHEMA IF EXISTS atlas_v2 CASCADE');
  await client.query(baselineSchema);
  await applyAuthoringMigrations(client);
  await applyCorrectionMigrations(client);
  const schemaRelease = await applyStage2SchemaRelease(client);
  assert.equal(schemaRelease.applied.length, 6);

  await client.query(`insert into atlas_v2.period_bases(id,code,is_active) values($1::uuid,'p10_fixture_period',true)`, [PERIOD_ID]);
  await client.query(`insert into atlas_v2.period_basis_names(id,period_basis_id,locale,name,is_preferred) values(gen_random_uuid(),$1::uuid,'en','P10 fixture period',true)`, [PERIOD_ID]);

  const dispatcher = createAuthoringManifestDispatchService({ client });
  const first = await dispatcher.apply(firstManifest());
  assert.equal(first.result.semantic_version, 'v2-relation-full-temporal');
  const firstActivity = await loadStage2NativeActivity(client, first.relationship_id);
  assert.ok(firstActivity);

  await client.query(`insert into atlas_v2.persons(id,canonical_key,person_type,historicity) values($1::uuid,'p10-duplicate-fixture-b','historical','historical')`, [PERSON_B]);
  await client.query(`insert into atlas_v2.person_names(id,person_id,locale,name,name_type,is_preferred) values
    (gen_random_uuid(),$1::uuid,'en','P10 Duplicate Fixture','preferred',true),
    (gen_random_uuid(),$1::uuid,'ko','P10 중복 픽스처 B','preferred',true)`, [PERSON_B]);

  await client.query('begin isolation level serializable');
  const secondCreated = await createStage2NativeActivityTx(client).create(
    activityPayload(firstActivity, { person_id: PERSON_B }),
    { requestId: 'fixture:p10-duplicate-v2:second-activity' }
  );
  await client.query('commit');

  const firstRebuild = await duplicateReview.rebuildCandidates({ client });
  assert.equal(firstRebuild.detector_version, duplicateDetector.DETECTOR_VERSION);
  assert.equal(firstRebuild.reconciliation_semantic_version, duplicateDetector.REVALIDATION_SEMANTIC_VERSION);
  assert.equal(firstRebuild.detected, 1);

  let queue = await duplicateReview.listCandidates({ client });
  assert.equal(queue.candidates.length, 1);
  const candidate = queue.candidates[0];
  assert.equal(candidate.detector_version, duplicateDetector.DETECTOR_VERSION);
  assert.ok(candidate.evidence.some((item) => item.kind === 'P10_SEMANTIC_PROFILE'));
  assert.ok(candidate.evidence.some((item) => item.kind === 'P10_EXACT_ACTIVITY_SEMANTIC_CONTEXT'));
  const exactFingerprint = candidate.evidence_fingerprint;

  const review = await duplicateReview.reviewCandidate({
    client,
    candidateId: candidate.id,
    decision: 'MERGE',
    rationale: 'Disposable rehearsal decision; physical merge remains blocked.',
    requestId: 'fixture:p10-duplicate-v2:review-1'
  });
  assert.equal(review.decision, 'MERGE');
  queue = await duplicateReview.listCandidates({ client });
  assert.equal(queue.candidates[0].current_decision, 'MERGE');

  await client.query(`insert into atlas_v2.roles(id,code,category,source_label,is_active) values($1::uuid,'p10_fixture_role_b','fixture','P10 Fixture Role B',true)`, [ROLE_B]);
  const secondActivity = await loadStage2NativeActivity(client, secondCreated.id);
  await client.query('begin isolation level serializable');
  await createStage2NativeActivityTx(client).update(
    secondCreated.id,
    activityPayload(secondActivity, { role_id: ROLE_B }),
    { requestId: 'fixture:p10-duplicate-v2:role-change' }
  );
  await client.query('commit');

  const secondRebuild = await duplicateReview.rebuildCandidates({ client });
  assert.equal(secondRebuild.detected, 1);
  queue = await duplicateReview.listCandidates({ client });
  assert.equal(queue.candidates.length, 1);
  const revalidated = queue.candidates[0];
  assert.equal(revalidated.current_decision, 'REVIEW');
  assert.notEqual(revalidated.evidence_fingerprint, exactFingerprint);
  assert.ok(!revalidated.evidence.some((item) => item.kind === 'P10_EXACT_ACTIVITY_SEMANTIC_CONTEXT'));
  assert.ok(revalidated.evidence.some((item) => item.kind === 'P10_ROLE_VARIANT_ACTIVITY_CONTEXT'));

  const mergeState = mergeInterlock.personMergeExecutionState();
  assert.equal(mergeState.reconciliation_semantic_version, duplicateDetector.REVALIDATION_SEMANTIC_VERSION);
  assert.equal(mergeState.person_merge_lifecycle_version, 'pre-p10-blocked');
  assert.equal(mergeState.required_person_merge_lifecycle_version, 'p10-v2-revalidated');
  assert.equal(mergeState.allowed, false, 'P10-A must not unlock physical Person merge');

  console.log(JSON.stringify({
    marker: 'ATLAS_P10_PERSON_DUPLICATE_V2_REVALIDATION_OK',
    detector_version: duplicateDetector.DETECTOR_VERSION,
    reconciliation_semantic_version: duplicateDetector.REVALIDATION_SEMANTIC_VERSION,
    fresh_postgresql: true,
    exact_semantic_context_detected: true,
    reviewed_merge_reverted_on_semantic_change: true,
    role_variant_context_detected: true,
    evidence_fingerprint_changed: true,
    physical_person_merge_allowed: false,
    production_mutation_authorized: false
  }, null, 2));
} catch (error) {
  try { await client.query('rollback'); } catch {}
  throw error;
} finally {
  await client.end();
}
