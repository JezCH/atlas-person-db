import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const engine = require('../server/atlas-correction-manifest-v2-service.js');
const { sha256 } = require('../server/atlas-correction-v2-manifest-synthesizer.js');

const provenanceSql = fs.readFileSync(new URL('../db/proposals/stage2_provenance.rehearsal.sql', import.meta.url), 'utf8');
const engineSource = fs.readFileSync(new URL('../server/atlas-correction-manifest-v2-service.js', import.meta.url), 'utf8');
const linkIdentity = JSON.parse(fs.readFileSync(new URL('../stage2/contracts/provenance-link-identity-current.v1.json', import.meta.url), 'utf8'));

const RELATION_ID = '0cd030d8-ff0c-4105-a363-bb016eff554c';
const SUBJECT_ID = '9817bb46-bcc4-4867-a01d-91f7f0eb6de2';
const OBJECT_ID = '3a29a08a-d111-50d5-916f-f5c11b5eabaf';
const TYPE_ID = '375da950-65bc-5b81-a338-6c705f515120';
const SOURCE_ID = '41cb0494-17f0-4196-bdae-4ca0c1eeb4e6';

function manifestWithRelation() {
  const core = {
    schema: engine.MANIFEST_V2,
    request_id: 'test-v2-relation-composite-provenance',
    review_status: 'approved',
    exact_live_snapshot_digest: `sha256:${'a'.repeat(64)}`,
    operations: [{
      type: 'assert_polity_relation',
      decision_id: 'test_relation',
      exact_before: { relation_absent_id: RELATION_ID },
      exact_after: {
        relation: {
          id: RELATION_ID,
          subject_polity_id: SUBJECT_ID,
          object_polity_id: OBJECT_ID,
          relation_type_id: TYPE_ID,
          valid_from_year: 191,
          valid_from_month: null,
          valid_from_day: null,
          valid_from_granularity: 'year',
          valid_from_certainty: 'exact',
          valid_from_calendar: 'unspecified_historical',
          valid_to_year: 194,
          valid_to_month: null,
          valid_to_day: null,
          valid_to_granularity: 'year',
          valid_to_certainty: 'exact',
          valid_to_calendar: 'unspecified_historical',
          confidence: 'unknown',
          notes: 'reviewed test relation'
        },
        source_links: [{
          polity_relation_id: RELATION_ID,
          source_id: SOURCE_ID,
          source_locator_key: 'reviewed locator'
        }]
      }
    }]
  };
  return { ...core, manifest_sha256: sha256(core), production_executable: true };
}

test('Stage 2 provenance links use composite assertion/source/locator identity without synthetic UUID', () => {
  assert.deepEqual(linkIdentity.polity_relation_source_link_identity, ['polity_relation_id', 'source_id', 'source_locator_key']);
  assert.equal(linkIdentity.rules.synthetic_source_link_uuid_forbidden, true);
  const table = provenanceSql.match(/CREATE TABLE atlas_v2\.polity_relation_sources \([\s\S]*?\n\);/i)?.[0];
  assert.ok(table);
  assert.doesNotMatch(table, /\bid\s+uuid\b/i);
  assert.match(table, /PRIMARY KEY \(polity_relation_id, source_id, source_locator_key\)/i);
  assert.doesNotMatch(engineSource, /polity_relation_sources\s*\(\s*id\s*,/i);
  assert.doesNotMatch(engineSource, /select\s+id::text\s*,\s*polity_relation_id::text[\s\S]*?from atlas_v2\.polity_relation_sources/i);
});

test('Correction v2 manifest accepts exact composite polity-relation provenance links', () => {
  const manifest = manifestWithRelation();
  const normalized = engine.requireV2Manifest(manifest);
  assert.equal(normalized.operations.length, 1);
  const link = normalized.operations[0].exact_after.source_links[0];
  assert.deepEqual(link, {
    polity_relation_id: RELATION_ID,
    source_id: SOURCE_ID,
    source_locator_key: 'reviewed locator'
  });
});

test('Correction v2 rejects synthetic UUIDs on provenance join rows', () => {
  const manifest = manifestWithRelation();
  manifest.operations[0].exact_after.source_links[0].id = 'a480d6d1-2ca1-4a02-ac78-28d021372289';
  const { manifest_sha256, production_executable, ...core } = manifest;
  manifest.manifest_sha256 = sha256(core);
  assert.throws(() => engine.requireV2Manifest(manifest), /SYNTHETIC_LINK_UUID_FORBIDDEN/);
});

test('Correction v2 relation count delta tracks composite source links, not invented link entities', () => {
  const normalized = engine.requireV2Manifest(manifestWithRelation());
  assert.deepEqual(engine.expectedCountDeltas(normalized.operations), {
    activities: 0,
    activity_sources: 0,
    chronology_claims: 0,
    relationship_descriptions: 0,
    polity_relations: 1,
    polity_relation_sources: 1
  });
});
