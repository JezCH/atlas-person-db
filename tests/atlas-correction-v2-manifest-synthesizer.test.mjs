import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  FINAL_SCHEMA,
  snapshotDigest: unused,
  sha256,
  synthesizeCorrectionV2Manifest
} = require('../server/atlas-correction-v2-manifest-synthesizer.js');
const { snapshotDigest } = require('../server/atlas-correction-v2-snapshot-service.js');
const plan = JSON.parse(fs.readFileSync(new URL('../stage2/execution/p6-correction-v2-execution-batch1.v1.json', import.meta.url), 'utf8'));

function liveActivity(operation) {
  return {
    id: operation.activity_id,
    person_id: operation.baseline_before.person_id,
    polity_id: operation.baseline_before.polity_id,
    relation_type_id: null,
    role_id: operation.baseline_before.role_id,
    period_basis_id: operation.baseline_before.period_basis_id,
    activity_start: operation.baseline_before.activity_start,
    activity_start_month: null,
    activity_start_day: null,
    activity_start_granularity: null,
    activity_start_certainty: null,
    activity_start_calendar: null,
    activity_end: operation.baseline_before.activity_end,
    activity_end_month: null,
    activity_end_day: null,
    activity_end_granularity: null,
    activity_end_certainty: null,
    activity_end_calendar: null,
    confidence: operation.baseline_before.confidence,
    chronology_status: operation.baseline_before.chronology_status,
    legacy_source_key: operation.baseline_before.legacy_source_key,
    notes: `live notes ${operation.case_id}`,
    source_locator: { kind:'legacy-record', case_id:operation.case_id },
    content_hash: `content-${operation.case_id}`
  };
}

function makeSnapshot({ driftCase = null, childCase = null } = {}) {
  const activities = plan.operations.map((operation) => {
    const row = liveActivity(operation);
    if (operation.case_id === driftCase) row.activity_end += 1;
    return row;
  }).sort((a,b)=>a.id.localeCompare(b.id));
  const normalizedSourceLinks = plan.operations.map((operation, index) => ({
    person_politics_id: operation.activity_id,
    source_id: `00000000-0000-4000-8000-${String(index + 1).padStart(12,'0')}`,
    source_locator_key: `live locator ${operation.case_id}`
  })).sort((a,b)=>a.person_politics_id.localeCompare(b.person_politics_id));
  const chronologyClaims = childCase ? [{
    id:'00000000-0000-4000-8000-000000000091',
    person_politics_id: plan.operations.find((row)=>row.case_id===childCase).activity_id,
    claim_type:'outer_range',start_year:null,end_year:null
  }] : [];
  const core = {
    schema:'atlas-correction-v2-target-snapshot/v1',
    activity_ids: plan.operations.map((row)=>row.activity_id).sort(),
    activities,
    normalized_activity_source_links:normalizedSourceLinks,
    chronology_claims:chronologyClaims,
    relationship_descriptions:[]
  };
  return { ...core, snapshot_digest:snapshotDigest(core), read_only:true, committed:false };
}

test('Batch1 live snapshot synthesizes one final literal Correction v2 manifest', () => {
  const snapshot = makeSnapshot();
  const manifest = synthesizeCorrectionV2Manifest(plan, snapshot);
  assert.equal(manifest.schema, FINAL_SCHEMA);
  assert.equal(manifest.request_id, plan.batch_id);
  assert.equal(manifest.review_status, 'approved');
  assert.equal(manifest.exact_live_snapshot_digest, snapshot.snapshot_digest);
  assert.equal(manifest.operations.length, 15);
  assert.equal(manifest.operations.filter((row)=>row.type==='rewrite_activity').length, 6);
  assert.equal(manifest.operations.filter((row)=>row.type==='split_activity').length, 3);
  assert.equal(manifest.operations.filter((row)=>row.type==='assert_polity_relation').length, 6);
  assert.equal(manifest.production_executable, true);
  assert.match(manifest.manifest_sha256, /^sha256:[0-9a-f]{64}$/);
  assert.equal(manifest.manifest_sha256, sha256({
    schema:manifest.schema,
    request_id:manifest.request_id,
    review_status:manifest.review_status,
    baseline:manifest.baseline,
    exact_live_snapshot_digest:manifest.exact_live_snapshot_digest,
    exact_live_snapshot_activity_ids:manifest.exact_live_snapshot_activity_ids,
    execution_guards:manifest.execution_guards,
    operations:manifest.operations
  }));
});

test('rewrite operations preserve exact live notes, technical provenance and all normalized Source links', () => {
  const snapshot = makeSnapshot();
  const manifest = synthesizeCorrectionV2Manifest(plan, snapshot);
  const op = manifest.operations.find((row)=>row.case_id==='p6b1_tao_qian_relink');
  assert.equal(op.type, 'rewrite_activity');
  assert.equal(op.exact_after.activity.id, op.activity_id);
  assert.equal(op.exact_after.activity.notes, op.exact_before.activity.notes);
  assert.deepEqual(op.exact_after.activity.source_locator, op.exact_before.activity.source_locator);
  assert.equal(op.exact_after.activity.content_hash, op.exact_before.activity.content_hash);
  assert.deepEqual(op.exact_after.normalized_source_links, op.exact_before.normalized_source_links);
  assert.equal(op.same_activity_uuid_preserved, true);
  assert.equal(op.source_links_preserved_by_default, true);
});

test('split operations preserve original UUID on survivor, copy normalized Source links, and use NULL legacy key on new fragments', () => {
  const snapshot = makeSnapshot();
  const manifest = synthesizeCorrectionV2Manifest(plan, snapshot);
  const op = manifest.operations.find((row)=>row.case_id==='p6b1_liu_yan_split');
  assert.equal(op.type, 'split_activity');
  assert.equal(op.survivor_fragment.activity.id, op.activity_id);
  assert.equal(op.survivor_fragment_preserves_original_activity_uuid, true);
  assert.equal(op.new_fragments.length, 1);
  const created = op.new_fragments[0];
  assert.equal(created.activity.id, 'd0c1d80e-0434-4a43-bc9c-861422870c36');
  assert.equal(created.activity.legacy_source_key, null);
  assert.equal(created.activity.notes, op.exact_before.activity.notes);
  assert.deepEqual(created.activity.source_locator, op.exact_before.activity.source_locator);
  assert.equal(created.activity.content_hash, op.exact_before.activity.content_hash);
  assert.equal(created.normalized_source_links.length, 1);
  assert.equal(created.normalized_source_links[0].person_politics_id, created.activity.id);
  assert.equal(created.normalized_source_links[0].source_id, op.exact_before.normalized_source_links[0].source_id);
  assert.equal(created.normalized_source_links[0].source_locator_key, op.exact_before.normalized_source_links[0].source_locator_key);
});

test('manifest synthesis rejects live baseline drift instead of silently rewriting a changed target', () => {
  const snapshot = makeSnapshot({ driftCase:'p6b1_liu_biao_relink' });
  assert.throws(
    () => synthesizeCorrectionV2Manifest(plan, snapshot),
    /CORRECTION_V2_LIVE_BASELINE_DRIFT:p6b1_liu_biao_relink:activity_end/
  );
});

test('manifest synthesis rejects source-link cardinality drift', () => {
  const snapshot = makeSnapshot();
  snapshot.normalized_activity_source_links = snapshot.normalized_activity_source_links.filter((row)=>row.person_politics_id!==plan.operations[0].activity_id);
  snapshot.snapshot_digest = snapshotDigest({
    schema:snapshot.schema,activity_ids:snapshot.activity_ids,activities:snapshot.activities,
    normalized_activity_source_links:snapshot.normalized_activity_source_links,
    chronology_claims:snapshot.chronology_claims,relationship_descriptions:snapshot.relationship_descriptions
  });
  assert.throws(() => synthesizeCorrectionV2Manifest(plan, snapshot), /CORRECTION_V2_LIVE_SOURCE_COUNT_DRIFT/);
});

test('split synthesis fails closed if an unexpected child claim/description appears without a reviewed split-copy policy', () => {
  const snapshot = makeSnapshot({ childCase:'p6b1_gongsun_zan_split' });
  assert.throws(
    () => synthesizeCorrectionV2Manifest(plan, snapshot),
    /CORRECTION_V2_SPLIT_CHILD_POLICY_REQUIRED:p6b1_gongsun_zan_split/
  );
});

test('final manifest guards preserve exact-live and no-fake-provenance invariants', () => {
  const manifest = synthesizeCorrectionV2Manifest(plan, makeSnapshot());
  assert.equal(manifest.execution_guards.serializable_required, true);
  assert.equal(manifest.execution_guards.advisory_lock_required, true);
  assert.equal(manifest.execution_guards.manifest_hash_idempotency_required, true);
  assert.equal(manifest.execution_guards.immutable_audit_required, true);
  assert.equal(manifest.execution_guards.dry_run_before_apply_required, true);
  assert.equal(manifest.execution_guards.partial_commit_forbidden, true);
  assert.equal(manifest.execution_guards.exact_before_state_required, true);
  assert.equal(manifest.execution_guards.no_runtime_name_or_semantic_identity_resolution, true);
  assert.equal(manifest.execution_guards.no_silent_source_loss, true);
  assert.equal(manifest.execution_guards.no_fake_legacy_source_key, true);
  assert.equal(manifest.execution_guards.territory_geometry_mutation_forbidden, true);
  assert.equal(manifest.execution_guards.physical_person_merge_forbidden, true);
});


const { synthesizeUnifiedCorrectionV2Manifest } = require('../server/atlas-correction-v2-unified-plan-synthesizer.js');
const { requireUnifiedV2Manifest } = require('../server/atlas-correction-manifest-v2-unified-service.js');

function reviewedCitationSwap() {
  const corrected = structuredClone(plan);
  const live = makeSnapshot();
  const original = corrected.operations.find(row => row.type === "rewrite_activity");
  const prior = live.normalized_activity_source_links.find(row => row.person_politics_id === original.activity_id);
  const replacementId = "73172a19-63e1-4adf-a5ae-17bf0bc2c001";
  original.after.replace_source_links = [{
    source_id: prior.source_id, source_locator_key: prior.source_locator_key,
    replacement_source_id: replacementId, replacement_source_locator_key: "reviewed:bahamas-governor-1940-1945"
  }];
  corrected.stage2_assertions = [{
    type: "assert_source", decision_id: "approved:distinct-activity-source",
    exact_before: { source_absent_id: replacementId },
    exact_after: { source: {
      id: replacementId, source_key: "human-authoring:reviewed:bahamas-governor-1940-1945",
      title: "Royal Family — distinct Bahamas appointment",
      source_type: "web_bibliographic_reference",
      canonical_url: "https://www.royal.uk/edward-viii",
      citation_text: "The 1940–1945 colonial governorship followed the distinct 1936 abdication.",
      sha256: null, bytes: null
    }}
  }];
  return { corrected, live, original, prior, replacementId };
}

test('reviewed same-URL Source replacement emits a newly asserted Source then exact Activity link swap', () => {
  const { corrected,live,original,prior,replacementId } = reviewedCitationSwap();
  const synthesized = synthesizeUnifiedCorrectionV2Manifest(corrected,live);
  assert.equal(synthesized.operations[0].type,"assert_source");
  assert.equal(synthesized.operations[0].exact_after.source.id,replacementId);
  const rewrite = synthesized.operations.find(row => row.case_id === original.case_id);
  assert.equal(rewrite.type,"rewrite_activity");
  assert.equal(rewrite.exact_before.activity.id,rewrite.exact_after.activity.id);
  assert.deepEqual(rewrite.exact_before.activity,rewrite.exact_after.activity);
  assert.ok(rewrite.exact_before.normalized_source_links.some(row => row.source_id === prior.source_id));
  assert.ok(!rewrite.exact_after.normalized_source_links.some(row => row.source_id === prior.source_id));
  assert.ok(rewrite.exact_after.normalized_source_links.some(row =>
    row.source_id === replacementId && row.source_locator_key === "reviewed:bahamas-governor-1940-1945"));
  assert.equal(rewrite.exact_before.normalized_source_links.length,rewrite.exact_after.normalized_source_links.length);
  const normalized = requireUnifiedV2Manifest(synthesized);
  assert.equal(normalized.operations[0].type,"assert_source");
  assert.equal(normalized.operations.find(row => row.case_id === original.case_id).exact_after.normalized_source_links.length,1);
  assert.equal(synthesized.manifest_sha256,sha256((({manifest_sha256,production_executable,...core})=>core)(synthesized)));
});

test('reviewed Source replacement fails closed on missing new Source assertion or stale exact old link', () => {
  const {corrected,live,original} = reviewedCitationSwap();
  corrected.stage2_assertions = [];
  assert.throws(() => synthesizeUnifiedCorrectionV2Manifest(corrected,live),/REPLACEMENT_SOURCE_ASSERTION_REQUIRED/);
  const fresh=reviewedCitationSwap();
  fresh.original.after.replace_source_links[0].source_locator_key="stale-locator";
  assert.throws(() => synthesizeUnifiedCorrectionV2Manifest(fresh.corrected,fresh.live),/REPLACEMENT_EXACT_LINK_DRIFT/);
});

test('reviewed Source replacement rejects silent removal, link ID reuse and mixed additions', () => {
  const transforms = [
    row => { row.source_id="99999999-9999-4999-8999-999999999999"; },
    row => { row.replacement_source_id=row.source_id; },
    row => { row.source_locator_key=""; },
    row => { row.replacement_source_locator_key=""; },
    row => { row.unreviewed="unexpected"; }
  ];
  for (const transform of transforms) {
    const {corrected,live,original} = reviewedCitationSwap();
    transform(original.after.replace_source_links[0]);
    assert.throws(()=>synthesizeUnifiedCorrectionV2Manifest(corrected,live),/REPLACEMENT_/);
  }
  const multiple=reviewedCitationSwap();
  multiple.original.after.replace_source_links.push({...multiple.original.after.replace_source_links[0]});
  assert.throws(()=>synthesizeUnifiedCorrectionV2Manifest(multiple.corrected,multiple.live),/REPLACEMENT_EXACT_LINK_DRIFT/);
  const mixed=reviewedCitationSwap();
  mixed.original.after.add_source_links=[{source_id:"99999999-9999-4999-8999-999999999999",source_locator_key:"reviewed"}];
  assert.throws(()=>synthesizeUnifiedCorrectionV2Manifest(mixed.corrected,mixed.live),/MIXED_SOURCE_LINK_MUTATION_FORBIDDEN/);
});
