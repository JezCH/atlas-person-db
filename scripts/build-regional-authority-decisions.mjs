import fs from 'node:fs';
import path from 'node:path';
import {
  personPolityRelationCodes,
  polityRelationCandidateCodes
} from './stage2-domain-contract.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

const ledgerPath = arg('--ledger');
const outPath = arg('--out', 'artifacts/regional-authority-decisions.json');
const summaryPath = arg('--summary', 'artifacts/regional-authority-decisions-summary.json');
if (!ledgerPath) throw new Error('--ledger is required');

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
if (ledger.schema !== 'atlas-polity-semantic-master-ledger/v1') throw new Error(`unexpected ledger schema: ${ledger.schema}`);
if (!Array.isArray(ledger.rows) || ledger.rows.length !== 346) throw new Error(`unexpected ledger baseline: ${ledger.rows?.length}`);
const byId = new Map(ledger.rows.map((row) => [row.activity_id, row]));
if (byId.size !== 346) throw new Error(`duplicate Activity UUIDs: ${byId.size}`);

const personRelations = new Set(personPolityRelationCodes);
const polityRelations = new Set(polityRelationCandidateCodes);
for (const code of ['rules', 'governs', 'serves', 'opposes']) {
  if (!personRelations.has(code)) throw new Error(`Person-Polity contract missing ${code}`);
}
for (const code of ['vassal_of', 'nominally_subordinate_to']) {
  if (!polityRelations.has(code)) throw new Error(`Polity relation contract missing ${code}`);
}

const SOURCES = Object.freeze({
  shijiYingBu: {
    title: 'Records of the Grand Historian — Biography of Qing Bu / Ying Bu',
    author: 'Sima Qian',
    institution: 'Chinese Text Project digital primary-text edition',
    year: null,
    url: 'https://ctext.org/shiji/qing-bu-lie-zhuan',
    source_type: 'primary_history'
  },
  hanFall: {
    title: 'The fall of Han',
    author: 'B. J. Mansvelt Beck',
    institution: 'Cambridge University Press / The Cambridge History of China',
    year: 1986,
    url: 'https://www.cambridge.org/core/books/abs/cambridge-history-of-china/fall-of-han/CFB7AEDDD40ACD9BB0A76CFE4ADA3318',
    source_type: 'scholarly_reference_chapter'
  },
  laterHanAdministration: {
    title: 'An Outline of the Local Administration of the Later Han Empire',
    author: 'Rafe de Crespigny',
    institution: 'Australian National University',
    year: 1980,
    url: 'https://researchportalplus.anu.edu.au/en/publications/an-outline-of-the-local-administration-of-the-later-han-empire/',
    source_type: 'scholarly_monograph'
  },
  houHanLiuYan: {
    title: 'Book of the Later Han — Biography of Liu Yan',
    author: 'Fan Ye et al.',
    institution: 'Chinese Text Project digital primary-text edition',
    year: null,
    url: 'https://ctext.org/text.pl?if=gb&node=76813&show=parallel',
    source_type: 'primary_history'
  },
  shuJianLiuYan: {
    title: 'Shu Jian — Liu Yan sent Zhang Lu to seize Hanzhong, Chuping 2',
    author: 'historical compilation',
    institution: 'Chinese Text Project digital edition',
    year: null,
    url: 'https://ctext.org/wiki.pl?chapter=78297&if=en',
    source_type: 'historical_compilation'
  },
  taoQian: {
    title: 'Tao Qian',
    author: 'primary-history synthesis with citations to Records of the Three Kingdoms',
    institution: 'Chinese Text Project datawiki',
    year: null,
    url: 'https://ctext.org/datawiki.pl?if=en&res=543344',
    source_type: 'primary_history_index_supplement'
  },
  liuYu: {
    title: 'Liu Yu (warlord)',
    author: 'primary-history synthesis with citations to Book of the Later Han',
    institution: 'Chinese Text Project datawiki',
    year: null,
    url: 'https://ctext.org/datawiki.pl?if=en&res=263385',
    source_type: 'primary_history_index_supplement'
  },
  yuanShao: {
    title: 'Yuan Shao',
    author: 'primary-history synthesis with citations to Records of the Three Kingdoms',
    institution: 'Chinese Text Project datawiki',
    year: null,
    url: 'https://ctext.org/datawiki.pl?if=en&res=701353',
    source_type: 'primary_history_index_supplement'
  },
  liuBiao: {
    title: 'Liu Biao',
    author: 'primary-history synthesis with citations to Records of the Three Kingdoms',
    institution: 'Chinese Text Project datawiki',
    year: null,
    url: 'https://ctext.org/datawiki.pl?if=en&res=398266',
    source_type: 'primary_history_index_supplement'
  },
  luBu: {
    title: 'Records of the Three Kingdoms — Biography of Lü Bu',
    author: 'Chen Shou',
    institution: 'Chinese Text Project digital primary-text edition',
    year: null,
    url: 'https://ctext.org/text.pl?if=gb&node=602263',
    source_type: 'primary_history'
  },
  maTeng: {
    title: 'Ma Teng',
    author: 'primary-history synthesis with citations to Records of the Three Kingdoms and Book of the Later Han',
    institution: 'Chinese Text Project datawiki',
    year: null,
    url: 'https://ctext.org/datawiki.pl?if=en&res=555493',
    source_type: 'primary_history_index_supplement'
  },
  yuanHistoryFang: {
    title: 'History of Yuan — Biography of Fang Guozhen',
    author: 'Song Lian et al.',
    institution: 'Chinese Text Project digital primary-text edition',
    year: 1370,
    url: 'https://ctext.org/wiki.pl?chapter=838827&if=gb',
    source_type: 'primary_history'
  },
  yuanHistoryBolad: {
    title: 'History of Yuan — Biography of Bolad Temur',
    author: 'Song Lian et al.',
    institution: 'Chinese Text Project digital primary-text edition',
    year: 1370,
    url: 'https://ctext.org/wiki.pl?chapter=649331&if=gb',
    source_type: 'primary_history'
  }
});

const DECISIONS = Object.freeze({
  'a77a000e-2fec-5983-afb9-5d7dbc829223': {
    expected_person: 'Ying Bu', expected_polity: 'Western Han', expected_start: -202, expected_end: -196, expected_role: 'King',
    class: 'SOURCE_NAMED_DEPENDENT_KINGDOM',
    disposition: 'RELINK_TO_KINGDOM_OF_HUAINAN',
    proposed_person_relation: 'rules',
    target_policy: 'CREATE_OR_REUSE_SOURCE_BACKED_KINGDOM_OF_HUAINAN_POLITY',
    structural_relation: { type: 'vassal_of', object: 'Western Han' },
    source_keys: ['shijiYingBu'],
    basis: 'The Shiji explicitly records Ying Bu being enfeoffed as King of Huainan and describes the kingdom through its capital/territorial commanderies. He did not rule the Western Han empire itself. The current Western Han Activity therefore points at the wrong territory-owning authority.'
  },
  '15777776-b739-5988-9a04-472b2d6629c7': {
    expected_person: 'Liu Yan', expected_polity: 'Eastern Han', expected_start: 188, expected_end: 194, expected_role: 'Warlord',
    class: 'FORMAL_GOVERNOR_TO_DE_FACTO_REGIONAL_AUTHORITY_SPLIT',
    disposition: 'RETIRE_COARSE_ROW_AND_REBUILD_PHASES',
    proposed_person_relation: null,
    target_policy: 'SOURCE_BACKED_YI_REGIONAL_AUTHORITY_POLITY_IDENTITY_RESEARCH_REQUIRED',
    structural_relation: { type: 'nominally_subordinate_to', object: 'Eastern Han', interval_research_required: true },
    source_keys: ['hanFall', 'laterHanAdministration', 'houHanLiuYan', 'shuJianLiuYan'],
    basis: 'Liu Yan entered Yi as a formally appointed provincial governor, but primary tradition records concealed independent designs, severing central communications through Zhang Lu in 191, killing Han envoys and adopting imperial-style carriage equipment. One Eastern Han Warlord row cannot represent both formal office and de facto regional authority.'
  },
  'd22767c7-4e64-5c59-a5d9-60e32d146a4c': {
    expected_person: 'Tao Qian', expected_polity: 'Eastern Han', expected_start: 188, expected_end: 194, expected_role: 'Warlord',
    class: 'HAN_PROVINCIAL_GOVERNMENT_WITH_DE_FACTO_MILITARY_POWER_NO_SEPARATE_POLITY_YET',
    disposition: 'KEEP_EASTERN_HAN_CONTEXT_RECLASSIFY_RELATION_AND_ROLE_AFTER_REVIEW',
    proposed_person_relation: 'serves',
    target_policy: 'DO_NOT_CREATE_XU_PROVINCE_POLITY_FROM_OFFICE_TITLE_ALONE',
    structural_relation: null,
    source_keys: ['hanFall', 'laterHanAdministration', 'taoQian'],
    basis: 'Tao Qian held Han provincial office and maintained a powerful regional administration, but the reviewed evidence does not require a distinct polity identity merely from his governorship. Administrative jurisdiction can be researched separately from Polity identity.'
  },
  'b449d90d-783f-598b-aaeb-67cf37ea549a': {
    expected_person: 'Liu Yu', expected_polity: 'Eastern Han', expected_start: 189, expected_end: 193, expected_role: 'Governor',
    class: 'LOYAL_CENTRAL_POLITY_SERVICE',
    disposition: 'KEEP_EASTERN_HAN_ACTIVITY',
    proposed_person_relation: 'serves',
    target_policy: 'NO_SEPARATE_YOU_PROVINCE_POLITY',
    structural_relation: null,
    source_keys: ['hanFall', 'laterHanAdministration', 'liuYu'],
    basis: 'Liu Yu was a Han provincial governor and explicitly refused schemes to make him emperor. His regional office does not justify turning You Province into his independent Polity.'
  },
  '36a3ade9-b108-5358-8732-be7b3f6637f9': {
    expected_person: 'Yuan Shao', expected_polity: 'Eastern Han', expected_start: 189, expected_end: 202, expected_role: 'Warlord',
    class: 'DE_FACTO_MULTI_PROVINCE_REGIONAL_POLITY_REQUIRED',
    disposition: 'RETIRE_COARSE_EASTERN_HAN_WARLORD_ROW_AFTER_PHASE_REBUILD',
    proposed_person_relation: null,
    target_policy: 'SOURCE_BACKED_YUAN_SHAO_REGIONAL_AUTHORITY_POLITY_IDENTITY_RESEARCH_REQUIRED',
    structural_relation: { type: 'nominally_subordinate_to', object: 'Eastern Han', interval_research_required: true },
    source_keys: ['hanFall', 'yuanShao'],
    basis: 'Yuan Shao seized and expanded territorial power across multiple northern provinces while operating in the collapsing Han legitimacy order. The entire Eastern Han cannot be treated as his territory; a separate regional political authority and its changing territory are required.'
  },
  '42274e4c-af35-503f-a14f-e7460489b252': {
    expected_person: 'Ma Teng', expected_polity: 'Eastern Han', expected_start: 189, expected_end: 212, expected_role: 'Warlord',
    class: 'REBELLION_AUTONOMOUS_WESTERN_AUTHORITY_AND_LATER_HAN_SERVICE_SPLIT',
    disposition: 'RETIRE_COARSE_ROW_AND_REBUILD_MULTIPLE_PHASES',
    proposed_person_relation: null,
    target_policy: 'SOURCE_BACKED_MA_TENG_REGIONAL_AUTHORITY_POLITY_AND_LATER_SERVICE_PHASE_RESEARCH_REQUIRED',
    structural_relation: { type: 'nominally_subordinate_to', object: 'Eastern Han', interval_research_required: true },
    source_keys: ['hanFall', 'maTeng'],
    basis: 'Ma Teng moved between rebellion/autonomous western military power and accepted Han titles, later entering central service before his death. One continuous Eastern Han Warlord row collapses opposing and subordinate/service phases.'
  },
  '583d7e8d-ed63-5a7e-947a-2a3c43f8dfad': {
    expected_person: 'Liu Biao', expected_polity: 'Eastern Han', expected_start: 190, expected_end: 208, expected_role: 'Warlord',
    class: 'HAN_APPOINTED_GOVERNOR_WITH_DURABLE_DE_FACTO_REGIONAL_POLITY',
    disposition: 'REBUILD_PERSON_PHASES_AND_REGIONAL_AUTHORITY_TARGET',
    proposed_person_relation: null,
    target_policy: 'SOURCE_BACKED_JING_REGIONAL_AUTHORITY_POLITY_IDENTITY_RESEARCH_REQUIRED',
    structural_relation: { type: 'nominally_subordinate_to', object: 'Eastern Han', interval_research_required: true },
    source_keys: ['hanFall', 'laterHanAdministration', 'liuBiao'],
    basis: 'Liu Biao received Han appointment yet established durable territorial rule in Jing Province and transferred the regional power base to his son. This is stronger than an ordinary provincial-office case but still retained Han legitimacy, requiring de facto regional Polity plus nominal-subordination modeling rather than Eastern Han direct territory.'
  },
  '5b4fa9a3-ca6f-5e6b-a417-874f31b10650': {
    expected_person: 'Lu Bu', expected_polity: 'Eastern Han', expected_start: 192, expected_end: 198, expected_role: 'Warlord',
    class: 'MOBILE_SERVICE_AND_MULTIPLE_REGIONAL_AUTHORITY_PHASES',
    disposition: 'RETIRE_COARSE_ROW_AND_REBUILD_PHASES',
    proposed_person_relation: null,
    target_policy: 'SOURCE_BACKED_YAN_AND_XU_AUTHORITY_PHASE_RESEARCH_REQUIRED_NO_SINGLE_192_198_POLITY_ASSUMPTION',
    structural_relation: { type: 'nominally_subordinate_to', object: 'Eastern Han', interval_research_required: true },
    source_keys: ['hanFall', 'luBu'],
    basis: 'After 192 Lü Bu moved through service, flight and alliances, later seized territorial power in Yan/Xu contexts and held Han-recognized titles. A single Eastern Han Warlord row is not a coherent territorial authority identity.'
  },
  '8198cad1-dc14-5c1e-9b01-ddbddc447da7': {
    expected_person: 'Fang Guozhen', expected_polity: 'Yuan Dynasty', expected_start: 1348, expected_end: 1367, expected_role: 'Warlord',
    class: 'AUTONOMOUS_REGIONAL_POLITY_WITH_INTERMITTENT_NOMINAL_YUAN_SUBORDINATION',
    disposition: 'RETIRE_COARSE_YUAN_WARLORD_ROW_AND_REBUILD_REGIONAL_AUTHORITY_PHASES',
    proposed_person_relation: null,
    target_policy: 'SOURCE_BACKED_FANG_GUOZHEN_REGIONAL_AUTHORITY_POLITY_IDENTITY_RESEARCH_REQUIRED',
    structural_relation: { type: 'nominally_subordinate_to', object: 'Yuan Dynasty', interval_research_required: true },
    source_keys: ['yuanHistoryFang'],
    basis: 'The Yuan history repeatedly records Fang fighting Yuan forces, accepting or refusing Yuan offices, maintaining his own forces, and failing to obey mobilization orders. This is the clearest late-Yuan case where formal title/nominal submission and de facto autonomous territorial power coexist.'
  },
  '2a9029b6-3485-55a3-924f-6e9bc9adb901': {
    expected_person: 'Bolad Temur', expected_polity: 'Yuan Dynasty', expected_start: 1359, expected_end: 1365, expected_role: 'Warlord',
    class: 'YUAN_MILITARY_FACTION_AND_CENTRAL_GOVERNMENT_PHASES_NO_SEPARATE_POLITY_PROVEN',
    disposition: 'KEEP_YUAN_CONTEXT_BUT_SPLIT_SERVICE_AND_CENTRAL_GOVERNMENT_PHASES',
    proposed_person_relation: null,
    target_policy: 'NO_SEPARATE_BOLAD_TEMUR_POLITY_WITHOUT_ADDITIONAL_TERRITORIAL_EVIDENCE',
    structural_relation: null,
    source_keys: ['yuanHistoryBolad'],
    basis: 'Bolad Temur was a Yuan military commander in factional civil war, disobeyed orders and later seized the capital and entered top central government. The reviewed evidence supports changing Person–Yuan relation phases, not automatically creating a new country around his army.'
  }
});

const rows = [];
for (const [activityId, decision] of Object.entries(DECISIONS)) {
  const row = byId.get(activityId);
  if (!row) throw new Error(`regional authority Activity missing: ${activityId}`);
  const actual = {
    person: row.person?.canonical ?? null,
    polity: row.polity?.canonical ?? null,
    start: row.activity?.start_year ?? null,
    end: row.activity?.end_year ?? null,
    role: row.activity?.role ?? null
  };
  if (
    actual.person !== decision.expected_person || actual.polity !== decision.expected_polity ||
    actual.start !== decision.expected_start || actual.end !== decision.expected_end ||
    actual.role !== decision.expected_role
  ) throw new Error(`regional authority target drift ${activityId}: ${JSON.stringify(actual)}`);
  if (!row.audit?.dependencies?.includes('polity_relation_model')) {
    throw new Error(`regional authority row no longer carries polity_relation_model dependency: ${activityId}`);
  }
  if (decision.proposed_person_relation && !personRelations.has(decision.proposed_person_relation)) {
    throw new Error(`regional Activity decision uses Person relation outside contract: ${decision.proposed_person_relation}`);
  }
  if (decision.structural_relation && !polityRelations.has(decision.structural_relation.type)) {
    throw new Error(`regional Activity decision uses Polity relation outside contract: ${decision.structural_relation.type}`);
  }
  rows.push({
    activity_id: activityId,
    person: actual.person,
    current_polity: actual.polity,
    current_start_year: actual.start,
    current_end_year: actual.end,
    current_role: actual.role,
    old_audit_decision: row.audit?.decision ?? null,
    old_dependencies: row.audit?.dependencies ?? [],
    ...decision
  });
}

if (rows.length !== 10) throw new Error(`remaining regional authority contract must cover 10 rows, got ${rows.length}`);

const sourceNamedDependentKingdom = rows.filter((r) => r.class === 'SOURCE_NAMED_DEPENDENT_KINGDOM');
const centralOnly = rows.filter((r) => [
  'LOYAL_CENTRAL_POLITY_SERVICE',
  'HAN_PROVINCIAL_GOVERNMENT_WITH_DE_FACTO_MILITARY_POWER_NO_SEPARATE_POLITY_YET',
  'YUAN_MILITARY_FACTION_AND_CENTRAL_GOVERNMENT_PHASES_NO_SEPARATE_POLITY_PROVEN'
].includes(r.class));
const targetResearch = rows.filter((r) => String(r.target_policy).includes('RESEARCH_REQUIRED'));
const nominalSubordinationCandidates = rows.filter((r) => r.structural_relation?.type === 'nominally_subordinate_to');

const summary = {
  schema: 'atlas-regional-authority-decisions-summary/v1',
  baseline_relationships: ledger.rows.length,
  reviewed_remaining_structural_signal_rows: rows.length,
  historical_model_classified_rows: rows.length,
  unresolved_structural_relation_model_classification_rows: 0,
  source_named_dependent_kingdom_rows: sourceNamedDependentKingdom.length,
  central_polity_no_new_regional_polity_rows: centralOnly.length,
  regional_authority_target_or_phase_research_rows: targetResearch.length,
  nominal_subordination_candidate_rows: nominalSubordinationCandidates.length,
  new_polity_relation_code_justified: 'nominally_subordinate_to',
  new_polity_relation_code_count: 1,
  fabricated_regional_polity_names_created: false,
  production_mutation_performed: false,
  conclusion: 'ALL_REMAINING_STRUCTURAL_SIGNAL_MODELS_CLASSIFIED_EXACT_REGIONAL_AUTHORITY_TARGETS_AND_PHASES_STAY_RESEARCH_GATED'
};

if (summary.source_named_dependent_kingdom_rows !== 1) throw new Error(`expected one source-named dependent kingdom row, got ${summary.source_named_dependent_kingdom_rows}`);
if (summary.central_polity_no_new_regional_polity_rows !== 3) throw new Error(`expected three central-context rows, got ${summary.central_polity_no_new_regional_polity_rows}`);
if (summary.regional_authority_target_or_phase_research_rows !== 6) throw new Error(`expected six regional target/phase research rows, got ${summary.regional_authority_target_or_phase_research_rows}`);
if (summary.nominal_subordination_candidate_rows !== 6) throw new Error(`expected six nominal-subordination candidate rows, got ${summary.nominal_subordination_candidate_rows}`);

const payload = {
  schema: 'atlas-regional-authority-decisions/v1',
  status: 'SOURCE_BACKED_MODEL_CLASSIFICATION_ONLY_NO_PRODUCTION_MUTATION',
  methodology: {
    official_title_does_not_equal_direct_control_of_parent_polity: true,
    province_name_does_not_automatically_become_polity: true,
    de_facto_regional_authority_can_be_polity_when_source_backed: true,
    nominal_subordination_is_distinct_from_vassalage_and_formal_constituency: true,
    mobile_warlord_following_not_forced_into_one_polity: true,
    source_named_vassal_kingdom_preferred_over_parent_empire_relink: true,
    no_fabricated_regional_polity_names: true
  },
  new_relation_semantics: {
    code: 'nominally_subordinate_to',
    meaning: 'A de facto territorial political authority retains or accepts a formal/nominal superior political relationship to another Polity while exercising substantial autonomous power; this does not imply ordinary constitutional constituency, feudal vassalage, or effective direct control by the superior.',
    runtime: 'Render the subject Polity from its own Territory records. The object Polity must not inherit direct-control geometry over the subject merely from this relation; any superior claimed/nominal sovereignty requires separate map policy.'
  },
  sources: SOURCES,
  summary,
  rows
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
