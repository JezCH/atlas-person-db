import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

export function buildReviewedIdentitySourceAuthoring() {
  const allocation = readJson('stage2/execution/p6-execution-identity-allocations.v1.json');
  const amendment = readJson('stage2/integration/baseline-a-politic-resolution-amendments.v1.json');
  const batches = [
    readJson('stage2/authoring/p5-polity-authoring-batch1-late-han.v1.json'),
    readJson('stage2/authoring/p5-polity-authoring-batch2-reviewed-polities.v1.json'),
    readJson('stage2/authoring/p5-polity-authoring-batch3-community-boundaries.v1.json')
  ];
  const sourcePackage = readJson('stage2/authoring/p5-polity-relation-sources.v1.json');
  const superseded = new Set(amendment.superseded_new_polity_identity_classes || []);
  const active = [
    ...batches.flatMap((batch) => batch.targets || []).filter((target) => !superseded.has(target.identity_class)),
    ...(amendment.replacement_new_polity_targets || [])
  ];
  const targetByClass = new Map(active.map((target) => [target.identity_class, target]));
  const allocationByClass = new Map((allocation.polities || []).map((row) => [row.identity_class, row]));
  const sourceByKey = new Map((sourcePackage.sources || []).map((row) => [row.candidate_key, row]));
  const sourceAllocationByKey = new Map((allocation.sources || []).map((row) => [row.candidate_key, row]));

  if (targetByClass.size !== 17 || allocationByClass.size !== 17) throw new Error('P5_EFFECTIVE_POLITY_TARGET_COUNT_DRIFT');
  if (sourceByKey.size !== 9 || sourceAllocationByKey.size !== 9) throw new Error('P5_SOURCE_TARGET_COUNT_DRIFT');

  const polities = [...targetByClass.keys()].sort().map((identityClass) => {
    const target = targetByClass.get(identityClass);
    const assigned = allocationByClass.get(identityClass);
    if (!assigned) throw new Error(`P5_POLITY_UUID_MISSING:${identityClass}`);
    for (const [field, expected] of [
      ['label', target.proposed_catalog_label],
      ['locale', target.locale],
      ['semantic_name_kind', target.semantic_name_kind],
      ['historical_name_claim', target.historical_name_claim]
    ]) {
      if (assigned[field] !== expected) throw new Error(`P5_POLITY_ALLOCATION_METADATA_DRIFT:${identityClass}:${field}`);
    }
    return {
      identity_class: identityClass,
      polity: {
        id: assigned.polity_uuid,
        canonical_key: assigned.canonical_key,
        polity_type: target.polity_type,
        historicity: target.historicity
      },
      preferred_name: {
        id: assigned.preferred_name_uuid,
        polity_id: assigned.polity_uuid,
        locale: target.locale,
        name: target.proposed_catalog_label,
        name_type: 'canonical',
        is_preferred: true,
        semantic_name_kind: target.semantic_name_kind
      },
      historical_name_claim: target.historical_name_claim
    };
  });

  const sources = [...sourceByKey.keys()].sort().map((candidateKey) => {
    const source = sourceByKey.get(candidateKey);
    const assigned = sourceAllocationByKey.get(candidateKey);
    if (!assigned) throw new Error(`P5_SOURCE_UUID_MISSING:${candidateKey}`);
    return {
      candidate_key: candidateKey,
      row: {
        id: assigned.source_uuid,
        source_key: candidateKey,
        source_type: source.source_type,
        title: source.title,
        sha256: null,
        bytes: null,
        canonical_url: source.canonical_url,
        citation_text: source.citation_text
      }
    };
  });

  return {
    schema: 'atlas-stage2-p5-reviewed-identity-source-authoring/v1',
    as_of: '2026-08-13',
    status: 'REVIEWED_EXACT_ROWS_BRANCH_ONLY_NO_PRODUCTION_MUTATION',
    baseline: allocation.baseline,
    allocation: 'stage2/execution/p6-execution-identity-allocations.v1.json',
    rules: {
      literal_uuid_insert_only: true,
      name_or_url_identity_resolution_forbidden: true,
      existing_uuid_requires_exact_row_replay: true,
      canonical_key_or_source_key_collision_with_other_uuid_fails: true,
      preferred_name_collision_fails: true,
      source_candidate_key_is_stored_as_source_key_metadata_not_identity: true,
      bibliographic_source_sha256_and_bytes_must_be_null: true,
      activity_mutation_forbidden: true,
      territory_geometry_mutation_forbidden: true,
      production_mutation_authorized: false
    },
    polities,
    sources,
    result: {
      new_polity_rows: polities.length,
      new_polity_name_rows: polities.length,
      new_source_rows: sources.length,
      activity_rows_mutated: 0,
      production_mutation_authorized: false
    }
  };
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const built = buildReviewedIdentitySourceAuthoring();
  const text = `${JSON.stringify(built, null, 2)}\n`;
  const writeIndex = process.argv.indexOf('--write');
  if (writeIndex >= 0) {
    const output = process.argv[writeIndex + 1] || 'stage2/execution/p5-reviewed-identity-source-authoring.v1.json';
    fs.writeFileSync(path.join(root, output), text);
  } else {
    process.stdout.write(text);
  }
}
