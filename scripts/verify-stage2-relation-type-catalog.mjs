import fs from 'node:fs';
import crypto from 'node:crypto';

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

// This verifier is imported by the composed P5 gate. Positional argv belongs
// to the parent verifier in that mode, so only explicit named flags may
// override the canonical repository paths here.
const catalogPath = arg('--relation-catalog', 'stage2/catalogs/relation-types.v1.json');
const readinessPath = arg('--p5-readiness', 'stage2/integration/p5-preproduction-schema-readiness.v1.json');
const proposalPath = arg('--relation-catalog-sql', 'db/proposals/stage2_relation_type_catalog.rehearsal.sql');

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const readiness = JSON.parse(fs.readFileSync(readinessPath, 'utf8'));
const sql = fs.readFileSync(proposalPath, 'utf8');

if (catalog?.schema !== 'atlas-stage2-relation-type-catalog/v1' || catalog.status !== 'P5_REVIEWED_UUID_CATALOG_NO_PRODUCTION_MUTATION') throw new Error('relation-type catalog schema/status drift');
if (catalog.uuid_derivation?.algorithm !== 'uuid5' || catalog.uuid_derivation?.namespace_uuid !== 'bea62e8a-cf08-58c6-80bf-3dbd09505a87' || catalog.uuid_derivation?.codes_are_identity !== false || catalog.uuid_derivation?.uuids_are_identity !== true) throw new Error('relation-type UUID identity contract drift');
if (catalog.rules?.person_relation_catalog_is_closed_six_for_current_domain_contract !== true || catalog.rules?.generic_person_relation_default_forbidden !== true || catalog.rules?.polity_relation_catalog_is_extensible_by_reviewed_domain_decision !== true || catalog.rules?.runtime_code_lookup_must_not_substitute_for_exact_uuid_binding !== true || catalog.rules?.production_mutation_authorized !== false) throw new Error('relation-type safety rules missing');
if (!/REHEARSAL ONLY/i.test(sql) || !/Do not apply to Production/i.test(sql)) throw new Error('relation-type SQL must remain rehearsal-only');

function uuidBytes(uuid) {
  return Buffer.from(String(uuid).replace(/-/g, ''), 'hex');
}
function uuid5(namespaceUuid, name) {
  const hash = crypto.createHash('sha1').update(Buffer.concat([uuidBytes(namespaceUuid), Buffer.from(name, 'utf8')])).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0,16).toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
}

const expectedPerson = new Map([
  ['rules', ['7ca4de8f-01d4-542c-acc1-a06848c6742c','authority']],
  ['governs', ['67a57b37-1853-5f2a-b7ab-e6b2d32b56b6','authority']],
  ['serves', ['0fc4827f-8543-52f7-9e9a-3173b0c698a7','service']],
  ['active_in', ['f33d2789-2e65-50c1-af3e-91335bcbd3ca','activity']],
  ['opposes', ['5d2d3af6-6e53-5af1-8423-f76c2263afe4','conflict']],
  ['claims_rule', ['fcc652d6-8cf5-5348-9375-60b35f6e0b8c','claim']]
]);
const expectedPolity = new Map([
  ['vassal_of', ['b4982965-848a-5a2b-b690-daba1d092d02','dependency']],
  ['nominally_subordinate_to', ['375da950-65bc-5b81-a338-6c705f515120','dependency']],
  ['dominion_of', ['c56b821b-8b21-580b-b40d-c5c87e5b26d9','dependency']],
  ['constituent_of', ['49d96667-4c87-522e-8321-a76561bd0a22','constituent']],
  ['colonial_dependency_of', ['d9d8b7a5-fbb0-5bdc-ad7f-24a01ac31ca8','dependency']]
]);
const legacyReadinessPolityCodes = new Set(['vassal_of','nominally_subordinate_to','dominion_of']);
const namespace = catalog.uuid_derivation.namespace_uuid;

function verifyRows(rows, expected, prefix) {
  if (!Array.isArray(rows) || rows.length !== expected.size) throw new Error(`${prefix} relation-type cardinality drift`);
  const ids = new Set();
  const codes = new Set();
  for (const row of rows) {
    if (!expected.has(row.code) || codes.has(row.code) || ids.has(row.id)) throw new Error(`${prefix} unexpected/duplicate relation type ${row.code}`);
    codes.add(row.code); ids.add(row.id);
    const [expectedId, expectedCategory] = expected.get(row.code);
    if (row.id !== expectedId || row.category !== expectedCategory || row.is_active !== true) throw new Error(`${prefix} relation-type binding drift ${row.code}`);
    const derived = uuid5(namespace, `${prefix}:${row.code}`);
    if (derived !== row.id) throw new Error(`${prefix} relation-type UUIDv5 drift ${row.code}: ${derived}`);
    for (const token of [`'${row.id}'`,`'${row.code}'`,`'${row.category}'`]) if (!sql.includes(token)) throw new Error(`${prefix} SQL seed missing ${row.code} token ${token}`);
  }
}
verifyRows(catalog.person_polity_relation_types, expectedPerson, 'person_polity_relation_type');
verifyRows(catalog.polity_relation_types, expectedPolity, 'polity_relation_type');

if (Number(catalog.result?.person_polity_relation_type_count) !== 6 || Number(catalog.result?.current_polity_relation_type_count) !== 5 || Number(catalog.result?.exact_uuid_count) !== 11 || catalog.result?.production_mutation_authorized !== false) throw new Error('relation-type catalog summary drift');

// v1 readiness is historical evidence from the original three-relation P5 frontier.
// It remains valid as a subset while the reviewed catalog itself may grow.
if (Number(readiness.prepared_frontier?.person_polity_relation_type_uuid_count) !== 6 || Number(readiness.prepared_frontier?.current_polity_relation_type_uuid_count) !== 3 || readiness.safety?.relation_code_is_identity !== false) throw new Error('P5 readiness relation-type frontier drift');
const component = (readiness.schema_components || []).find((item) => item.id === 'relation_type_catalog');
if (!component || component.contract !== 'stage2/catalogs/relation-types.v1.json' || component.proposal !== 'db/proposals/stage2_relation_type_catalog.rehearsal.sql') throw new Error('P5 readiness relation-type component linkage drift');
const readinessPersonCodes = new Set(readiness.person_relation_types || []);
if (readinessPersonCodes.size !== 6 || [...expectedPerson.keys()].some((code) => !readinessPersonCodes.has(code))) throw new Error('P5 readiness Person relation code domain drift');
const readinessPolityCodes = new Set(readiness.relation_types_required_by_reviewed_assertions || []);
if (readinessPolityCodes.size !== legacyReadinessPolityCodes.size || [...legacyReadinessPolityCodes].some((code) => !readinessPolityCodes.has(code))) throw new Error('P5 historical readiness Polity relation frontier drift');
for (const code of readinessPolityCodes) if (!expectedPolity.has(code)) throw new Error(`P5 readiness references unknown Polity relation code ${code}`);

console.log(JSON.stringify({
  marker:'ATLAS_STAGE2_RELATION_TYPE_CATALOG_OK',
  person_relation_types:6,
  polity_relation_types:5,
  exact_uuid_bindings:11,
  historical_p5_readiness_polity_subset:3,
  deterministic_uuid5:true,
  runtime_code_lookup_as_identity_forbidden:true,
  production_mutation_authorized:false
}, null, 2));
