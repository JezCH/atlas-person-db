import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

const relationAuditPath = arg('--relation-audit');
const outPath = arg('--out', 'artifacts/relation-backfill-readiness.json');
const summaryPath = arg('--summary', 'artifacts/relation-backfill-readiness-summary.json');
if (!relationAuditPath) throw new Error('--relation-audit is required');

const audit = JSON.parse(fs.readFileSync(relationAuditPath, 'utf8'));
if (audit.schema !== 'atlas-relation-semantics-audit/v1') {
  throw new Error(`unexpected relation audit schema: ${audit.schema}`);
}
if (!Array.isArray(audit.rows) || audit.rows.length !== 346) {
  throw new Error(`unexpected relation audit baseline: ${audit.rows?.length}`);
}

const reviewRows = audit.rows.filter((row) => row.status === 'REVIEW_REQUIRED');
if (reviewRows.length !== 66) throw new Error(`relation review baseline drift: ${reviewRows.length}`);
const byId = new Map(reviewRows.map((row) => [row.activity_id, row]));
if (byId.size !== 66) throw new Error(`duplicate review-required Activity UUIDs: ${byId.size}`);

const REVIEWED_READY = Object.freeze({
  'fc68a326-f59f-5780-a6f0-c5206d9ceba3': {
    relation_type: 'rules',
    expected_person: 'Muhammad',
    expected_polity: 'Medinan Polity',
    basis: 'Wave 11 explicitly concluded KEEP + RELATION_RULES for the post-Hijra Medinan polity under Muhammad political/judicial authority.'
  },
  'd31a2079-fd3f-5454-8523-3cc252f36213': {
    relation_type: 'serves',
    expected_person: 'Gajah Mada',
    expected_polity: 'Majapahit Empire',
    basis: 'Wave 15C explicitly states Gajah Mada serves as Mahapatih rather than ruling Majapahit as monarch.'
  },
  '9e704010-6deb-5700-bdc1-6db4af397462': {
    relation_type: 'serves',
    expected_person: 'Tun Perak',
    expected_polity: 'Malacca Sultanate',
    basis: 'Wave 15C explicitly states Tun Perak serves as Bendahara.'
  },
  'a093903c-5571-55f5-b84b-5f52f437cc5f': {
    relation_type: 'rules',
    expected_person: 'Satuq Bughra Khan',
    expected_polity: 'Qarakhanid Khanate',
    basis: 'The reviewed Wave 8 carry-forward relation hint is rules for the khan relation and has no later contradictory semantic finding.'
  },
  '584039bb-4f23-552f-a304-99b5faf4d176': {
    relation_type: 'rules',
    expected_person: 'Nurhaci',
    expected_polity: 'Later Jin',
    basis: 'Wave 15D explicitly validates Later Jin as a territorial state/ruler relation for Nurhaci.'
  }
});

const STRUCTURAL_CORRECTION_FIRST = new Set([
  '814f1293-3566-5f7f-a699-acb6249d420e','5ad7ac77-48b4-5ede-afa5-8a1cedc33c16','943ebf94-4a0c-53aa-a535-969e8fb60b2c',
  'c4e44df1-a880-55a5-8607-0c5ebf17cc87','15777776-b739-5988-9a04-472b2d6629c7','d22767c7-4e64-5c59-a5d9-60e32d146a4c',
  'b449d90d-783f-598b-aaeb-67cf37ea549a','36a3ade9-b108-5358-8732-be7b3f6637f9','42274e4c-af35-503f-a14f-e7460489b252',
  '9b371976-8c65-5ec2-85d6-23adc716254d','583d7e8d-ed63-5a7e-947a-2a3c43f8dfad','c5481afc-4cf2-5516-aceb-254c5c95c58b',
  '5b4fa9a3-ca6f-5e6b-a417-874f31b10650','989d2115-e02f-53e6-bc68-90cf557bdd17','4c91cb84-5e53-5bcf-a4d6-d82a8a0c903f',
  'e4988193-016b-5ca2-ba4a-8a85cbecf6e7','1a3440db-c329-58c4-af35-fdcf488fa3fd','e4b374f5-ee25-5c12-80bf-5b7b1d2d149c',
  'b651ff3e-0df1-552a-9134-56ca95e9f3be','39615465-6343-5d4e-8718-9e20f3344119','d250fe38-6fa2-50f2-a902-0f4370022324',
  '3d7aeb05-3aaa-5c24-8e32-e9fbef9115e8','1446e736-96f8-5401-913f-022cb9b4b7c2','cf0e606a-7f93-5154-93b7-0b3b29a4650a',
  '4fe7a2d1-c4de-5451-b660-cf17d5475e4e','7b7dcdaf-9f40-5004-a479-ae457fa21790','592aa8f9-4eb4-527c-a72d-a78ee7769daf',
  '6ec884b8-5b36-573f-afcb-968aef1e2833','e5337054-ff56-58fd-a105-ea6d71d4ef33',
  // These current Yuan rows explicitly require a regional-authority target/hierarchy decision before a final Person relation can bind to the correct Polity.
  '8198cad1-dc14-5c1e-9b01-ddbddc447da7','2a9029b6-3485-55a3-924f-6e9bc9adb901'
]);

const IDENTITY_RECONCILIATION_FIRST = new Set([
  '9db8d593-a73c-5993-bfe6-b2b30ec71167','2f2a2dfe-12b3-52b7-957e-42d6f7b89f2a','789bdf2e-5431-595c-a7a1-7f289b8cd4fd',
  '68b05da1-42cb-5dc7-b584-179aceceebb4','b43cfb03-3d45-5566-a7d8-cabb37c93115','1fc5aa5e-29c1-51c7-8721-80d810f7084e'
]);

const HISTORICAL_RESEARCH_FIRST = new Set([
  '164635b5-0930-5601-94d1-c9dd86bffa4d','4d543d48-a041-5f07-a900-560a50abaeee','c0987b73-203c-5b49-9d84-8d96ce0e44e9',
  '110c080c-b891-50a7-950c-1c80d3ef75b8','2b566bc6-600a-5a75-bf32-60fe3e558bcd','c73146d6-0558-502f-8e81-11343e41f963',
  'b4a6b048-9465-539a-bc4b-ec50a057b594','062c9186-2981-5745-9b60-ae733a2fc86d',
  // Dido's current row is explicitly historicity-gated; do not harden a political relation before the project decides how legendary Persons are represented.
  '76fe49de-1cda-5a22-8629-657c85433b0c',
  // The Shawnee row is retained only with a parallel-confederacy review; relation semantics depend on the final tribal/confederacy authority interpretation.
  '932998e2-839b-5818-99bb-37221498cadd'
]);

const DIRECT_RELATION_REVIEW = new Set([
  '85896e61-c810-590e-bf3c-9240168d2953','580bc3b3-c93d-57ee-8276-aed42a625b10','2f18a41d-6f4e-541d-b549-32ec505e8c53',
  'eaa40098-26b0-5425-8daf-83f85207da3f','b0e51c35-a02a-568a-969e-4e9207b2c787','226e8667-d437-5ae7-8284-77a365371260',
  '250ee5a9-4227-52c7-915a-233b5bdb3ddf','7e6d042a-78a2-54b0-9d27-efcab3043282','76007cca-bbf3-5e04-87f7-a362cd2f93eb',
  '627ed16c-1fa9-5047-8e0c-bc3c552fb5c7','34ed5d1e-b93b-5955-b5e9-2edbc4ffaf8d','48cca2d5-adf6-51e6-9fa3-a1f463f1d2be',
  '7a89364b-dacf-5798-9a6d-dd312cbbee4d','5be7f060-46d1-58f9-ad7c-3b03458c198a'
]);

const groups = [
  ['REVIEWED_RELATION_READY', new Set(Object.keys(REVIEWED_READY))],
  ['STRUCTURAL_CORRECTION_FIRST', STRUCTURAL_CORRECTION_FIRST],
  ['IDENTITY_RECONCILIATION_FIRST', IDENTITY_RECONCILIATION_FIRST],
  ['HISTORICAL_RESEARCH_FIRST', HISTORICAL_RESEARCH_FIRST],
  ['DIRECT_RELATION_REVIEW', DIRECT_RELATION_REVIEW]
];

const seen = new Map();
for (const [group, ids] of groups) {
  for (const id of ids) {
    if (!byId.has(id)) throw new Error(`${group} references non-review Activity ${id}`);
    if (seen.has(id)) throw new Error(`Activity ${id} appears in both ${seen.get(id)} and ${group}`);
    seen.set(id, group);
  }
}
if (seen.size !== 66) {
  const missing = [...byId.keys()].filter((id) => !seen.has(id));
  throw new Error(`relation backfill classification incomplete: ${seen.size}/66; missing=${JSON.stringify(missing)}`);
}

const rows = reviewRows.map((row) => {
  const disposition = seen.get(row.activity_id);
  const ready = REVIEWED_READY[row.activity_id] ?? null;
  if (ready) {
    if (row.person !== ready.expected_person || row.polity !== ready.expected_polity) {
      throw new Error(`reviewed relation target drift for ${row.activity_id}: ${row.person} / ${row.polity}`);
    }
  }
  return {
    activity_id: row.activity_id,
    person: row.person,
    polity: row.polity,
    start_year: row.start_year,
    end_year: row.end_year,
    role: row.role,
    audit_decision: row.audit_decision,
    disposition,
    reviewed_relation_type: ready?.relation_type ?? null,
    reviewed_basis: ready?.basis ?? null
  };
});

const count = (name) => rows.filter((row) => row.disposition === name).length;
const summary = {
  schema: 'atlas-relation-backfill-readiness-summary/v1',
  baseline_relationships: audit.rows.length,
  original_conservative_candidates: audit.summary?.candidate_rows ?? null,
  original_review_required: reviewRows.length,
  reviewed_relation_ready: count('REVIEWED_RELATION_READY'),
  structural_correction_first: count('STRUCTURAL_CORRECTION_FIRST'),
  identity_reconciliation_first: count('IDENTITY_RECONCILIATION_FIRST'),
  historical_research_first: count('HISTORICAL_RESEARCH_FIRST'),
  direct_relation_review: count('DIRECT_RELATION_REVIEW'),
  current_rows_not_to_force_backfill: count('STRUCTURAL_CORRECTION_FIRST') + count('IDENTITY_RECONCILIATION_FIRST') + count('HISTORICAL_RESEARCH_FIRST'),
  conclusion: 'ADDITIVE_NULLABLE_RELATION_COLUMN_THEN_CORRECT_RETIRE_REVIEW_BACKFILL_THEN_ENFORCE'
};

const expected = {
  reviewed_relation_ready: 5,
  structural_correction_first: 31,
  identity_reconciliation_first: 6,
  historical_research_first: 10,
  direct_relation_review: 14,
  current_rows_not_to_force_backfill: 47
};
for (const [key, value] of Object.entries(expected)) {
  if (summary[key] !== value) throw new Error(`${key} drift: expected ${value}, got ${summary[key]}`);
}

const payload = {
  schema: 'atlas-relation-backfill-readiness/v1',
  status: 'AUDIT_ONLY_NO_PRODUCTION_MUTATION',
  migration_rule: {
    additive_relation_type_fk_first: true,
    nullable_during_transition: true,
    guessed_default_for_existing_rows: false,
    enforce_not_null_only_after_structural_corrections_identity_reconciliation_research_and_review: true
  },
  reviewed_ready_overrides: REVIEWED_READY,
  summary,
  rows
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
