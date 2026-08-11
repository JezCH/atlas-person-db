import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

const ledgerPath = arg('--ledger');
const outPath = arg('--out', 'artifacts/japan-layered-authority-decisions.json');
const summaryPath = arg('--summary', 'artifacts/japan-layered-authority-decisions-summary.json');
if (!ledgerPath) throw new Error('--ledger is required');

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
if (ledger.schema !== 'atlas-polity-semantic-master-ledger/v1') throw new Error(`unexpected ledger schema: ${ledger.schema}`);
if (!Array.isArray(ledger.rows) || ledger.rows.length !== 346) throw new Error(`unexpected ledger baseline: ${ledger.rows?.length}`);
const byId = new Map(ledger.rows.map((row) => [row.activity_id, row]));
if (byId.size !== 346) throw new Error(`duplicate Activity UUIDs: ${byId.size}`);

const SOURCES = Object.freeze({
  kamakuraDyarchy: {
    title: 'The Kamakura bakufu',
    author: 'Jeffrey P. Mass',
    institution: 'Cambridge University Press / The Cambridge History of Japan',
    year: 1990,
    url: 'https://www.cambridge.org/core/books/abs/cambridge-history-of-japan/kamakura-bakufu/BF02043614072DC18DBFF0EC11BCBAE0',
    source_type: 'scholarly_reference_chapter'
  },
  kamakuraDecline: {
    title: 'The decline of the Kamakura bakufu',
    author: 'Ishii Susumu',
    institution: 'Cambridge University Press / The Cambridge History of Japan',
    year: 1990,
    url: 'https://www.cambridge.org/core/books/abs/cambridge-history-of-japan/decline-of-the-kamakura-bakufu/EF1BFC92E54B2CA6DD53CCC63BB3D2E8',
    source_type: 'scholarly_reference_chapter'
  },
  bakuhan: {
    title: 'The bakuhan system',
    author: 'John Whitney Hall',
    institution: 'Cambridge University Press / The Cambridge History of Japan',
    year: 1991,
    url: 'https://www.cambridge.org/core/books/abs/cambridge-history-of-japan/bakuhan-system/D926536D7B00DEFD6413A77CA028711B',
    source_type: 'scholarly_reference_chapter'
  },
  regionalTokugawa: {
    title: 'Regional Authority during the Tokugawa Period',
    author: 'David L. Howell',
    institution: 'Cambridge University Press / The New Cambridge History of Japan',
    year: 2023,
    url: 'https://www.cambridge.org/core/books/abs/new-cambridge-history-of-japan/regional-authority-during-the-tokugawa-period/1D7EDF841214814E9769E4392A31C392',
    source_type: 'scholarly_reference_chapter'
  },
  han: {
    title: 'The han',
    author: 'Harold Bolitho',
    institution: 'Cambridge University Press / The Cambridge History of Japan',
    year: 1991,
    url: 'https://www.cambridge.org/core/services/aop-cambridge-core/content/view/EFA5733E3D52F21A93D047CD6A59DFC3/9781139055086c5_p183-234_CBO.pdf/han.pdf',
    source_type: 'scholarly_reference_chapter'
  },
  unification: {
    title: 'The sixteenth-century unification',
    author: 'Asao Naohiro / Bernard Susser',
    institution: 'Cambridge University Press / The Cambridge History of Japan',
    year: 1991,
    url: 'https://www.cambridge.org/core/books/abs/cambridge-history-of-japan/sixteenthcentury-unification/0C30DC47EA85258875CFB8F4AE5DA821',
    source_type: 'scholarly_reference_chapter'
  },
  sengokuDomains: {
    title: 'Christianity and the daimyo',
    author: 'Jurgis Elisonas',
    institution: 'Cambridge University Press / The Cambridge History of Japan',
    year: 1991,
    url: 'https://www.cambridge.org/core/books/cambridge-history-of-japan/christianity-and-the-daimyo/0F552561428FD4A7A75075EC42C6D5BC',
    source_type: 'scholarly_reference_chapter'
  },
  sengokuLocalAuthority: {
    title: 'Muromachi local government: shugo and kokujin',
    author: 'Imatani Akira / Suzanne Gay',
    institution: 'Cambridge University Press / The Cambridge History of Japan',
    year: 1990,
    url: 'https://www.cambridge.org/core/books/cambridge-history-of-japan/muromachi-local-government-shugo-and-kokujin/2C7AE60F634305049BE5683C5155B229',
    source_type: 'scholarly_reference_chapter'
  },
  hideyoshiState: {
    title: 'Foreign faith and rising state: An examination of state-building dynamics in late 16th-century Japan',
    author: 'Minzhao Wang / Austin Michael Mitchell / Weiwen Yin',
    institution: 'Cambridge University Press / Political Science Research and Methods',
    year: 2025,
    url: 'https://www.cambridge.org/core/journals/political-science-research-and-methods/article/foreign-faith-and-rising-state-an-examination-of-statebuilding-dynamics-in-late-16thcentury-japan/566C0575FE9C7FAE53079ED1BB302C17',
    source_type: 'peer_reviewed_article'
  }
});

const MODEL = Object.freeze({
  higher_order_polity: 'Japan',
  bakufu_entity_class: 'GovernanceContext',
  daimyo_domain_entity_class: 'Polity',
  lineage_house_entity_class: 'Lineage/House — not Polity merely by name',
  territory_rule: 'Direct territorial control belongs to domain/territorial Polities; a Person relation to Japan or a bakufu GovernanceContext must not fabricate personal direct-control geometry.',
  runtime_rule: 'National governmental authority and autonomous/local direct-control territory are separate layers.'
});

const DECISIONS = Object.freeze({
  'f5ea0e7c-1886-56f8-b4cc-b1ceba9dd1dd': {
    expected_person: 'Hojo Tokimune', expected_polity: 'Kamakura Shogunate', expected_start: 1268, expected_end: 1284,
    class: 'LAYERED_AUTHORITY_RESOLVED',
    disposition: 'RELINK_ACTIVITY_TO_JAPAN_WITH_KAMAKURA_BAKUFU_GOVERNANCE_CONTEXT',
    proposed_relation_type: 'governs',
    source_keys: ['kamakuraDyarchy', 'kamakuraDecline'],
    basis: 'Kamakura government operated within a dyarchic polity and did not replace the imperial-court framework with unitary territorial sovereignty. Shikken is governmental authority, not a separate country identity.'
  },
  '7c315e1c-90c3-5199-a292-8f68ba69d4b2': {
    expected_person: 'Tokugawa Ieyasu', expected_polity: 'Tokugawa Shogunate', expected_start: 1603, expected_end: 1605,
    class: 'LAYERED_AUTHORITY_RESOLVED',
    disposition: 'RELINK_ACTIVITY_TO_JAPAN_WITH_TOKUGAWA_SHOGUNATE_GOVERNANCE_CONTEXT_KEEP_PHASE',
    proposed_relation_type: 'governs',
    source_keys: ['bakuhan', 'regionalTokugawa', 'han'],
    basis: 'The bakufu is the national military government in a layered bakuhan state; daimyo domains remain territorial units of local government.'
  },
  '79dc9310-cd56-5bed-9a35-fe5361bdf0b6': {
    expected_person: 'Tokugawa Ieyasu', expected_polity: 'Tokugawa Shogunate', expected_start: 1603, expected_end: 1616,
    class: 'LAYERED_AUTHORITY_RESOLVED',
    disposition: 'RETIRE_OVERLAPPING_COMPRESSED_ACTIVITY_AFTER_PHASES_ARE_PRESERVED',
    proposed_relation_type: null,
    source_keys: ['bakuhan', 'regionalTokugawa'],
    basis: 'The reviewed 1603–1605 shogun phase and 1605–1616 retired de facto authority phase already preserve the meaningful chronology; the compressed overlap should not survive as a third semantic Activity.'
  },
  '400c78d5-a7e1-5ddb-83ef-91e0193db0f8': {
    expected_person: 'Tokugawa Ieyasu', expected_polity: 'Tokugawa Shogunate', expected_start: 1605, expected_end: 1616,
    class: 'LAYERED_AUTHORITY_RESOLVED',
    disposition: 'RELINK_ACTIVITY_TO_JAPAN_WITH_TOKUGAWA_SHOGUNATE_GOVERNANCE_CONTEXT_KEEP_PHASE',
    proposed_relation_type: 'governs',
    source_keys: ['bakuhan', 'regionalTokugawa', 'han'],
    basis: 'Retired Ieyasu continued top-level de facto governmental authority; this is a Person–Japan governmental relation phase, not a new Tokugawa-Shogunate country polygon.'
  },
  '2b566bc6-600a-5a75-bf32-60fe3e558bcd': {
    expected_person: 'Oda Nobunaga', expected_polity: 'Oda Clan', expected_start: 1568, expected_end: 1582,
    class: 'SENGOKU_TERRITORIAL_TARGET_RESEARCH_REQUIRED',
    disposition: 'DO_NOT_RELINK_TO_ALL_JAPAN_OR_KEEP_LINEAGE_AS_POLITY',
    proposed_relation_type: null,
    source_keys: ['unification', 'sengokuDomains', 'sengokuLocalAuthority'],
    basis: 'Nobunaga expanded from an autonomous daimyo territorial base toward national military hegemony but died before completing national hegemony. Oda Clan is lineage identity; Japan-wide direct territory would also be false. A source-backed Oda territorial-authority Polity/territory reconstruction is still required.'
  },
  '110c080c-b891-50a7-950c-1c80d3ef75b8': {
    expected_person: 'Uesugi Kenshin', expected_polity: 'Uesugi Clan', expected_start: 1548, expected_end: 1578,
    class: 'SENGOKU_TERRITORIAL_TARGET_RESEARCH_REQUIRED',
    disposition: 'REPLACE_LINEAGE_LABEL_ONLY_AFTER_DAIMYO_TERRITORIAL_POLITY_RESEARCH',
    proposed_relation_type: null,
    source_keys: ['sengokuDomains', 'sengokuLocalAuthority'],
    basis: 'Sengoku daimyo controlled autonomous territories, which can justify Polity objects; the Uesugi lineage name alone is not sufficient to define the exact political-territorial identity or geometry.'
  },
  '61bf1687-9815-5844-9f98-02a558470b51': {
    expected_person: 'Toyotomi Hideyoshi', expected_polity: 'Toyotomi Regime', expected_start: 1582, expected_end: 1598,
    class: 'SENGOKU_UNIFICATION_SPLIT_REQUIRED',
    disposition: 'MOVE_TO_GOVERNANCE_CONTEXT_AND_REBUILD_ACTIVITY_PHASES',
    proposed_relation_type: null,
    source_keys: ['unification', 'hideyoshiState'],
    basis: 'Toyotomi Regime is a governing regime, not a territory-owning Polity identity. Hideyoshi inherited an incomplete unification process and by 1590 had subdued all provinces; a single 1582–1598 pseudo-Polity row collapses materially different authority phases.'
  },
  '7bd5741a-6b37-5b33-9512-40741e01b179': {
    expected_person: 'Toyotomi Hideyoshi', expected_polity: 'Japan', expected_start: 1582, expected_end: 1598,
    class: 'SENGOKU_UNIFICATION_SPLIT_REQUIRED',
    disposition: 'SPLIT_PRE_1590_EXPANDING_AUTHORITY_FROM_POST_1590_JAPAN_GOVERNMENTAL_AUTHORITY',
    proposed_relation_type: 'governs',
    source_keys: ['unification', 'hideyoshiState'],
    basis: 'Japan-wide authority should not be back-projected to 1582. By 1590 Hideyoshi had effectively subdued all provinces, making Japan a defensible higher-order Polity target for the later phase while the earlier territorial authority requires separate reconstruction.'
  }
});

const expectedIds = new Set(Object.keys(DECISIONS));
if (expectedIds.size !== 8) throw new Error(`Japan authority decision contract must cover 8 rows, got ${expectedIds.size}`);

const rows = [];
for (const [activityId, decision] of Object.entries(DECISIONS)) {
  const current = byId.get(activityId);
  if (!current) throw new Error(`Japan reviewed Activity missing: ${activityId}`);
  const actual = {
    person: current.person?.canonical ?? null,
    polity: current.polity?.canonical ?? null,
    start: current.activity?.start_year ?? null,
    end: current.activity?.end_year ?? null
  };
  if (
    actual.person !== decision.expected_person || actual.polity !== decision.expected_polity ||
    actual.start !== decision.expected_start || actual.end !== decision.expected_end
  ) {
    throw new Error(`Japan authority target drift ${activityId}: ${JSON.stringify(actual)}`);
  }
  rows.push({
    activity_id: activityId,
    person: actual.person,
    current_polity: actual.polity,
    current_start_year: actual.start,
    current_end_year: actual.end,
    role: current.activity?.role ?? null,
    audit_decision: current.audit?.decision ?? null,
    dependencies: current.audit?.dependencies ?? [],
    ...decision
  });
}

const oldJapanLayered = rows.filter((r) => r.dependencies.includes('polity_relation_model'));
if (oldJapanLayered.length !== 4) throw new Error(`expected four old Japan layered-authority relation signals, got ${oldJapanLayered.length}`);
const resolvedLayered = oldJapanLayered.filter((r) => r.class === 'LAYERED_AUTHORITY_RESOLVED');
if (resolvedLayered.length !== 4) throw new Error(`all four old Japan layered-authority rows must be resolved, got ${resolvedLayered.length}`);

const unresolvedTerritorial = rows.filter((r) => r.class !== 'LAYERED_AUTHORITY_RESOLVED');
const summary = {
  schema: 'atlas-japan-layered-authority-decisions-summary/v1',
  baseline_relationships: ledger.rows.length,
  reviewed_japan_rows: rows.length,
  old_polity_relation_model_rows: oldJapanLayered.length,
  resolved_old_polity_relation_model_rows: resolvedLayered.length,
  unresolved_old_polity_relation_model_rows: 0,
  remaining_sengoku_territorial_or_split_research_rows: unresolvedTerritorial.length,
  model: {
    bakufu_is_governance_context: true,
    han_or_daimyo_domain_can_be_polity_when_territorial_authority_is_source_backed: true,
    clan_name_is_not_automatic_polity: true,
    japan_higher_order_polity_does_not_imply_unitary_direct_control: true
  },
  production_mutation_performed: false,
  conclusion: 'JAPAN_LAYERED_AUTHORITY_MODEL_CLOSED_SENGOKU_TERRITORIAL_RESEARCH_REMAINS'
};

const payload = {
  schema: 'atlas-japan-layered-authority-decisions/v1',
  status: 'SOURCE_BACKED_AUDIT_ONLY_NO_PRODUCTION_MUTATION',
  methodology: {
    government_vs_polity_separated: true,
    lineage_vs_territorial_authority_separated: true,
    national_overlordship_vs_local_direct_control_separated: true,
    no_fabricated_sengoku_polity_name: true
  },
  model: MODEL,
  sources: SOURCES,
  summary,
  rows
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
