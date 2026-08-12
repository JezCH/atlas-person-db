import fs from 'node:fs';

const intakePath = process.argv[2] || 'artifacts/stage2-baseline-a-intake.json';
const bindingPath = process.argv[3] || 'stage2/integration/baseline-a-live-polity-bindings.v1.json';
const intake = JSON.parse(fs.readFileSync(intakePath, 'utf8'));
const bindings = JSON.parse(fs.readFileSync(bindingPath, 'utf8'));

function fail(message) { throw new Error(`STAGE2_BASELINE_A_LIVE_BINDING_INVALID: ${message}`); }
if (intake?.schema !== 'atlas-stage2-baseline-a-intake/v2') fail('invalid Baseline A intake schema');
if (bindings?.schema !== 'atlas-stage2-baseline-a-live-polity-bindings/v1') fail('invalid binding schema');
if (bindings.status !== 'P3_REVIEWED_BINDING_NO_PRODUCTION_MUTATION') fail('unexpected binding status');
if (bindings.rules?.production_mutation_authorized !== false || bindings.result?.production_mutation_authorized !== false) fail('Production mutation must remain false');
if (bindings.rules?.name_only_binding_forbidden !== true || bindings.rules?.binding_requires_uuid_plus_exact_baseline_catalog_identity !== true) fail('exact binding invariants missing');
if (bindings.baseline?.deployment_sha !== intake.deployment_sha) fail('deployment SHA drift');
if (bindings.baseline?.baseline_digest !== intake.baseline_digest) fail('Baseline digest drift');
if (bindings.baseline?.activity_count !== intake.row_count || intake.row_count !== 338) fail('Baseline Activity count drift');

const polities = new Map((intake.identity_catalogs?.polities || []).map((p) => [p.id, p]));
const activityCounts = new Map();
for (const row of intake.activity_rows || []) activityCounts.set(row.polity_id, (activityCounts.get(row.polity_id) || 0) + 1);

function assertPolity(binding, label) {
  if (!binding?.polity_uuid) fail(`${label} missing Polity UUID`);
  const polity = polities.get(binding.polity_uuid);
  if (!polity) fail(`${label} UUID ${binding.polity_uuid} absent from Baseline A`);
  if (polity.canonical_key !== binding.canonical_key) fail(`${label} canonical key mismatch for ${binding.polity_uuid}`);
  const preferredEn = (polity.names || []).find((n) => n.locale === 'en' && n.is_preferred === true)?.name || null;
  if (preferredEn !== binding.canonical_key) fail(`${label} preferred EN name does not match reviewed canonical key`);
  return polity;
}

const continuity = bindings.continuity_families || [];
if (continuity.length !== 4) fail(`expected 4 continuity families, got ${continuity.length}`);
for (const family of continuity) {
  if (!family.source_contract) fail(`${family.id} missing source contract`);
  const members = family.members || [];
  if (members.length < 2) fail(`${family.id} requires at least two reviewed current members`);
  for (const member of members) {
    assertPolity(member, `${family.id}/${member.role}`);
    const actualCount = activityCounts.get(member.polity_uuid) || 0;
    if (actualCount !== member.baseline_activity_references) fail(`${family.id}/${member.role} Activity reference count drift: expected ${member.baseline_activity_references}, got ${actualCount}`);
  }
  if (family.reviewed_model.includes('stable_polity_')) {
    const sorted = [...members].sort((a, b) => b.baseline_activity_references - a.baseline_activity_references || a.polity_uuid.localeCompare(b.polity_uuid));
    if (family.canonical_survivor_uuid !== sorted[0].polity_uuid) fail(`${family.id} survivor violates deterministic reference-count policy`);
  } else if (family.canonical_survivor_uuid !== null) {
    fail(`${family.id} must not collapse reviewed distinct Polities`);
  }
}

const expectedContinuity = new Set(['roman_eastern_roman_395','yuan_northern_yuan_1368','russia_1721_empire','portugal_united_kingdom_1815']);
for (const id of expectedContinuity) if (!continuity.some((x) => x.id === id)) fail(`missing continuity family ${id}`);

const relations = bindings.structural_relations || [];
if (relations.length !== 4) fail(`expected 4 structural relation families, got ${relations.length}`);
const expectedRelations = new Set(['canada_dominion_of_uk','british_raj_colonial_dependency_of_uk','rsfsr_constituent_of_ussr','huainan_vassal_of_western_han']);
for (const relation of relations) {
  if (!expectedRelations.has(relation.id)) fail(`unexpected structural relation ${relation.id}`);
  assertPolity(relation.object, `${relation.id}/object`);
  if (relation.subject?.polity_uuid) {
    assertPolity(relation.subject, `${relation.id}/subject`);
  } else {
    if (relation.id !== 'huainan_vassal_of_western_han') fail(`${relation.id} unexpectedly lacks subject UUID`);
    if (relation.subject?.verified_absent_from_baseline_a !== true) fail('Huainan missing-subject state must be explicit');
    const accidentalHuainan = [...polities.values()].some((p) => p.canonical_key === 'Huainan' || p.canonical_key === 'Kingdom of Huainan');
    if (accidentalHuainan) fail('Huainan marked absent but a matching Baseline A canonical Polity exists');
  }
  if (!Array.isArray(relation.normalized_source_uuids) || relation.normalized_source_uuids.length !== 0) fail(`${relation.id} must not fabricate normalized Source UUIDs before source authoring`);
}
for (const id of expectedRelations) if (!relations.some((x) => x.id === id)) fail(`missing structural relation ${id}`);

if (bindings.source_normalization?.baseline_a_source_count !== (intake.identity_catalogs?.sources || []).length) fail('Baseline A Source count drift');
if (bindings.source_normalization?.reviewed_structural_relation_web_sources_already_normalized !== false) fail('web research sources must remain explicitly pending normalization');

const serialized = JSON.stringify(bindings);
if (/activity_uuid|activity_id/i.test(serialized)) fail('live Polity binding artifact must not contain Activity UUID write targets');

console.log(JSON.stringify({
  marker: 'ATLAS_STAGE2_BASELINE_A_LIVE_BINDINGS_OK',
  baseline_digest: intake.baseline_digest,
  continuity_families: continuity.length,
  stable_survivors: continuity.filter((x) => x.canonical_survivor_uuid).map((x) => ({ id: x.id, survivor: x.canonical_survivor_uuid })),
  structural_relations: relations.length,
  bound_relation_subjects: relations.filter((x) => x.subject?.polity_uuid).length,
  missing_reviewed_subjects: relations.filter((x) => !x.subject?.polity_uuid).map((x) => x.id),
  production_mutation_authorized: false
}, null, 2));
