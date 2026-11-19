import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { snapshotDigest } = require('../server/atlas-correction-v2-snapshot-service.js');
const { synthesizeUnifiedCorrectionV2Manifest } = require('../server/atlas-correction-v2-unified-plan-synthesizer.js');
const { requireUnifiedV2Manifest } = require('../server/atlas-correction-manifest-v2-unified-service.js');
const plan = JSON.parse(fs.readFileSync(new URL('../corrections/plans/royal-office-source-claim-repair-20261119.v1.json', import.meta.url), 'utf8'));

function verifiedAuthoringShapeSnapshot() {
  // Static Authoring result fixture, NOT an authenticated present-day DB read.
  // Real execution MUST regenerate exact current rows in protected Correction.
  const activities = plan.operations.map(({ activity_id:id, baseline_before: b, after:a }) => ({
    id, person_id:b.person_id, polity_id:b.polity_id, relation_type_id:a.relation_type_id,
    role_id:b.role_id, period_basis_id:b.period_basis_id,
    activity_start:b.activity_start, activity_start_month:null, activity_start_day:null,
    activity_start_granularity:'year', activity_start_certainty:'exact', activity_start_calendar:'gregorian',
    activity_end:b.activity_end, activity_end_month:null, activity_end_day:null,
    activity_end_granularity:'year', activity_end_certainty:'exact', activity_end_calendar:'gregorian',
    confidence:b.confidence, chronology_status:b.chronology_status,
    legacy_source_key:b.legacy_source_key, notes:'exact live notes must be preserved',
    source_locator:{kind:'stage2_native_authoring',request_id:'verified-immutable-origin'},
    content_hash:'exact-unmodified-origin-hash'
  }));
  const normalized_activity_source_links = plan.operations.map(row => {
    const source = row.after.replace_source_links[0];
    return { person_politics_id:row.activity_id, source_id:source.source_id,
      source_locator_key:source.source_locator_key };
  });
  const core = {
    schema:'atlas-correction-v2-target-snapshot/v1',
    activity_ids:activities.map(x=>x.id).sort(),
    activities:activities.sort((a,b)=>a.id.localeCompare(b.id)),
    normalized_activity_source_links:normalized_activity_source_links.sort((a,b)=>a.person_politics_id.localeCompare(b.person_politics_id)),
    chronology_claims:[],relationship_descriptions:[]
  };
  return { ...core, snapshot_digest:snapshotDigest(core),read_only:true,committed:false };
}

test('royal-office repair is precisely four approved Activity claims with four independently asserted Sources', () => {
  assert.equal(plan.schema,'atlas-stage2-correction-v2-execution-plan/v1');
  assert.equal(plan.execution_rules.production_executable,false);
  assert.equal(plan.execution_rules.production_mutation_authorized,false);
  assert.match(plan.status,/PENDING_FRESH_PROTECTED_CORRECTION_PREFLIGHT/);
  assert.equal(plan.operations.length,4);
  assert.equal(plan.stage2_assertions.length,4);
  const ids = new Set(), keys = new Set();
  for (const operation of plan.operations) {
    assert.equal(operation.type,'rewrite_activity');
    assert.ok(!ids.has(operation.activity_id));
    ids.add(operation.activity_id);
    assert.equal(operation.baseline_before.source_count,1);
    assert.equal(operation.after.replace_source_links.length,1);
    assert.equal(operation.after.add_source_links,undefined);
    const link=operation.after.replace_source_links[0];
    const asserted=plan.stage2_assertions.find(x=>x.exact_after.source.id===link.replacement_source_id);
    assert.ok(asserted);
    assert.equal(asserted.exact_before.source_absent_id,link.replacement_source_id);
    assert.equal(link.source_locator_key,link.replacement_source_locator_key);
    assert.equal(asserted.exact_after.source.canonical_url,link.source_locator_key);
    assert.ok(asserted.exact_after.source.citation_text.length>30);
    assert.ok(!keys.has(asserted.exact_after.source.source_key));
    keys.add(asserted.exact_after.source.source_key);
  }
  assert.ok(ids.has('7a9a8829-fa1d-42fb-9952-dcce2f6ab36e')); // Bahamas 1940–45
  assert.ok(!ids.has('3c23d763-aecf-47b6-8eb5-d1af37e0b653')); // India Emperor correctly linked
});

test('protected correction synthesizer can build the 4+4 exact transactional plan without mutating other Activities', () => {
  const manifest=synthesizeUnifiedCorrectionV2Manifest(plan,verifiedAuthoringShapeSnapshot());
  const normalized=requireUnifiedV2Manifest(manifest);
  assert.equal(normalized.operations.length,8);
  assert.deepEqual(normalized.operations.map(x=>x.type),[
    'assert_source','assert_source','assert_source','assert_source',
    'rewrite_activity','rewrite_activity','rewrite_activity','rewrite_activity'
  ]);
  for(const operation of normalized.operations.filter(x=>x.type==='rewrite_activity')){
    assert.deepEqual(operation.exact_before.activity,operation.exact_after.activity);
    assert.equal(operation.exact_before.normalized_source_links.length,1);
    assert.equal(operation.exact_after.normalized_source_links.length,1);
    assert.notEqual(operation.exact_before.normalized_source_links[0].source_id,operation.exact_after.normalized_source_links[0].source_id);
  }
  assert.equal(manifest.production_executable,true); // protected synthesizer ONLY, not draft or approved production release
  assert.equal(manifest.review_status,'approved');
});

test('draft refuses a changed existing Source locator or an unasserted new source', () => {
  const snap=verifiedAuthoringShapeSnapshot();
  snap.normalized_activity_source_links[0].source_locator_key='different-live-locator';
  snap.snapshot_digest=snapshotDigest({
    schema:snap.schema,activity_ids:snap.activity_ids,activities:snap.activities,
    normalized_activity_source_links:snap.normalized_activity_source_links,
    chronology_claims:snap.chronology_claims,relationship_descriptions:snap.relationship_descriptions
  });
  assert.throws(()=>synthesizeUnifiedCorrectionV2Manifest(plan,snap),/REPLACEMENT_EXACT_LINK_DRIFT/);
  const tampered=structuredClone(plan);
  tampered.stage2_assertions.pop();
  assert.throws(()=>synthesizeUnifiedCorrectionV2Manifest(tampered,verifiedAuthoringShapeSnapshot()),/REPLACEMENT_SOURCE_ASSERTION_REQUIRED/);
});
