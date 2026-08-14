import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  readReviewedSourceAuthoringManifest
} = require('../server/atlas-stage2-reviewed-source-authoring.js');

const root = path.resolve(new URL('..', import.meta.url).pathname);
const solomonManifestPath = path.join(
  root,
  'stage2/authoring/p7-solomon-chronology-sources.v1.json'
);

test('Solomon reviewed chronology sources satisfy the executable source-authoring safety contract', () => {
  const { manifest } = readReviewedSourceAuthoringManifest(solomonManifestPath);

  assert.equal(manifest.result.source_count, 2);
  assert.equal(manifest.sources.length, 2);
  assert.equal(manifest.rules.source_locator_required_when_linked_to_activity_fragment, true);
  assert.equal(manifest.rules.traditional_chronology_must_not_be_promoted_to_exact_fact, true);
  assert.equal(manifest.rules.maximal_biblical_territory_must_not_be_inferred, true);
  assert.equal(manifest.rules.production_mutation_authorized, false);
});
