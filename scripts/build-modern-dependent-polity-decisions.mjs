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
const outPath = arg('--out', 'artifacts/modern-dependent-polity-decisions.json');
const summaryPath = arg('--summary', 'artifacts/modern-dependent-polity-decisions-summary.json');
if (!ledgerPath) throw new Error('--ledger is required');

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
if (ledger.schema !== 'atlas-polity-semantic-master-ledger/v1') throw new Error(`unexpected ledger schema: ${ledger.schema}`);
if (!Array.isArray(ledger.rows) || ledger.rows.length !== 346) throw new Error(`unexpected ledger baseline: ${ledger.rows?.length}`);
const byId = new Map(ledger.rows.map((row) => [row.activity_id, row]));
if (byId.size !== 346) throw new Error(`duplicate Activity UUIDs: ${byId.size}`);

const relationCodes = new Set(personPolityRelationCodes);
const polityRelationCodes = new Set(polityRelationCandidateCodes);
for (const code of ['governs', 'active_in', 'opposes']) {
  if (!relationCodes.has(code)) throw new Error(`Stage 2 Person-Polity relation contract missing ${code}`);
}
for (const code of ['dominion_of', 'colonial_dependency_of', 'constituent_of']) {
  if (!polityRelationCodes.has(code)) throw new Error(`Stage 2 Polity relation contract missing ${code}`);
}

const currentPolityNames = new Set(ledger.rows.map((row) => row.polity?.canonical).filter(Boolean));
for (const requiredTarget of ['United Kingdom', 'India', 'Soviet Union', 'Soviet Russia']) {
  if (!currentPolityNames.has(requiredTarget)) throw new Error(`reviewed modern target Polity is not present in current ledger: ${requiredTarget}`);
}

const SOURCES = Object.freeze({
  canada1867: {
    title: 'Constitution Act, 1867',
    author: 'Parliament of the United Kingdom / consolidated by Justice Canada',
    institution: 'Department of Justice Canada',
    year: 1867,
    url: 'https://laws-lois.justice.gc.ca/eng/Const/page-1.html',
    source_type: 'constitutional_law'
  },
  canadaLaurier: {
    title: 'The Political Life of Sir Wilfrid Laurier',
    author: 'Parks Canada',
    institution: 'Government of Canada',
    year: 2024,
    url: 'https://parks.canada.ca/lhn-nhs/on/laurier/culture/natcul7',
    source_type: 'government_public_history'
  },
  canadaWestminster: {
    title: 'Anniversary of the Statute of Westminster',
    author: 'Canadian Heritage',
    institution: 'Government of Canada',
    year: 2024,
    url: 'https://www.canada.ca/en/canadian-heritage/services/important-commemorative-days/anniversary-statute-westminster.html',
    source_type: 'government_public_history'
  },
  indiaIndependenceAct: {
    title: 'Indian Independence Act 1947',
    author: 'Parliament of the United Kingdom',
    institution: 'The National Archives / legislation.gov.uk',
    year: 1947,
    url: 'https://www.legislation.gov.uk/ukpga/Geo6/10-11/30/enacted',
    source_type: 'primary_law'
  },
  gandhiChronology: {
    title: 'Chronology of Mahatma Gandhi',
    author: 'Gandhi Smriti and Darshan Samiti',
    institution: 'Ministry of Culture, Government of India',
    year: 2018,
    url: 'https://www.gandhismriti.gov.in/more/chronology-mahatma-gandhi',
    source_type: 'government_chronology'
  },
  gandhiHeritage: {
    title: 'Mahatma Gandhi Events Chronology',
    author: 'Gandhi Heritage Portal',
    institution: 'Sabarmati Ashram Preservation and Memorial Trust',
    year: null,
    url: 'https://www.gandhiheritageportal.org/eventcontentdetail/OA%3D%3D/NzQxOQ%3D%3D',
    source_type: 'archival_chronology'
  },
  rsfsr1917: {
    title: 'Decree on the Formation of the Workers’ and Peasants’ Government, 26 October (8 November) 1917',
    author: 'Second All-Russian Congress of Soviets / signed by V. I. Lenin',
    institution: 'Russian State Archive of Socio-Political History — Lenin portal',
    year: 1917,
    url: 'https://lenin.rusarchives.ru/dokumenty/dekret-ob-obrazovanii-rabochego-i-krestyanskogo-pravitelstva-prinyatyy-na-vtorom-sezde',
    source_type: 'primary_government_document'
  },
  ussrTreaty: {
    title: 'Treaty on the Formation of the Union of Soviet Socialist Republics, 30 December 1922',
    author: 'First Congress of Soviets of the USSR',
    institution: 'Electronic Library of Historical Documents, Russia',
    year: 1922,
    url: 'https://docs.historyrussia.org/ru/nodes/342350-dogovor-ob-obrazovanii-soyuza-sovetskih-sotsialisticheskih-respublik-30-dekabrya-1922-g',
    source_type: 'primary_treaty'
  },
  ussrConstitution1924: {
    title: 'Constitution (Basic Law) of the USSR, 31 January 1924',
    author: 'Second Congress of Soviets of the USSR',
    institution: 'Electronic Library of Historical Documents, Russia',
    year: 1924,
    url: 'https://docs.historyrussia.org/nodes/342397',
    source_type: 'primary_constitution'
  },
  leninUSSRAppointment: {
    title: 'The first government of the USSR was approved',
    author: 'B. N. Yeltsin Presidential Library',
    institution: 'Presidential Library of the Russian Federation',
    year: 1923,
    url: 'https://www.prlib.ru/history/619364',
    source_type: 'public_history_primary_document_portal'
  },
  leninOffices: {
    title: 'Lenin Vladimir Ilyich',
    author: 'Great Russian Encyclopedia',
    institution: 'Great Russian Encyclopedia',
    year: null,
    url: 'https://bigenc.ru/t/statesmen',
    source_type: 'national_reference_encyclopedia'
  }
});

const GROUPS = Object.freeze({
  CANADA_LAURIER: {
    model: 'DEPENDENT_SELF_GOVERNING_POLITY_WITH_EXTERNAL_IMPERIAL_DEPENDENCY',
    facts: [
      'The 1867 constitutional act created one Dominion under the name Canada under the Crown of the United Kingdom.',
      'Government of Canada sources describe Laurier-era Canada as a self-governing country within the British Empire while Britain controlled Canada’s external relations.',
      'The Statute of Westminster in 1931 later formally recognized the autonomy/equal legislative status of the self-governing Dominions.'
    ],
    inference: 'Dominion of Canada is a valid territory-owning Polity for Laurier. Dependence belongs in a Polity-to-Polity relation, not by relinking Laurier to the United Kingdom or by making Canadian territory British personal territory.',
    structural_relation: {
      subject: 'Dominion of Canada',
      relation_type: 'dominion_of',
      object: 'United Kingdom',
      reviewed_minimum_interval: { start_year: 1896, end_year: 1911 },
      full_relation_interval_research_before_backfill: true
    },
    source_keys: ['canada1867', 'canadaLaurier', 'canadaWestminster'],
    rows: {
      'e497159b-6eb5-5ca9-85a3-591784d29906': {
        expected_person: 'Wilfrid Laurier', expected_polity: 'Dominion of Canada', expected_start: 1896, expected_end: 1911, expected_role: 'Prime Minister',
        disposition: 'KEEP_ACTIVITY', proposed_relation_type: 'governs'
      }
    }
  },
  GANDHI_BRITISH_RAJ_TO_INDIA: {
    model: 'COLONIAL_DEPENDENCY_PLUS_PERSON_RELATION_PHASES_ACROSS_INDEPENDENCE',
    facts: [
      'Government of India chronology shows Gandhi’s early Indian activity from 1915 included local satyagraha and social/political work; the first all-India satyagraha was conceived in 1919.',
      'The Gandhi Heritage chronology dates the Rowlatt Act satyagraha pledge to 24 February 1919 and national hartal/satyagraha to April 1919.',
      'The Indian Independence Act 1947 created two independent Dominions, India and Pakistan, from 15 August 1947.',
      'Gandhi remained politically and socially active in independent India until his assassination on 30 January 1948.'
    ],
    inference: 'The current 1915–1948 British Raj row is semantically false as one Activity. It crosses both a Person–Polity relation change and the end of the colonial Polity. Split the early active-in period, the source-backed anti-colonial opposition period, and independent-India activity. Do not pretend Gandhi governed either polity.',
    structural_relation: {
      subject: 'British Raj',
      relation_type: 'colonial_dependency_of',
      object: 'United Kingdom',
      reviewed_minimum_interval: { start_year: 1915, end: { year: 1947, month: 8, day: 14 } },
      full_relation_interval_research_before_backfill: true
    },
    replacement_phases: [
      {
        polity: 'British Raj', relation_type: 'active_in',
        start: { year: 1915, granularity: 'year', calendar: 'gregorian' },
        end: { year: 1919, month: 2, day: 23, granularity: 'day', calendar: 'gregorian' },
        role_policy: 'NULL_UNTIL_ACCURATE_ROLE_VOCABULARY_REVIEW',
        basis: 'Gandhi was already conducting local satyagraha and public work, but a blanket 1915 onward anti-colonial opposition relation overstates the early phase.'
      },
      {
        polity: 'British Raj', relation_type: 'opposes',
        start: { year: 1919, month: 2, day: 24, granularity: 'day', calendar: 'gregorian' },
        end: { year: 1947, month: 8, day: 14, granularity: 'day', calendar: 'gregorian' },
        role_policy: 'REUSE_CURRENT_INDEPENDENCE_MOVEMENT_ROLE',
        basis: 'The Rowlatt satyagraha pledge gives a defensible source-backed transition into all-India anti-colonial mass politics; later campaigns repeatedly opposed colonial rule.'
      },
      {
        polity: 'India', relation_type: 'active_in',
        start: { year: 1947, month: 8, day: 15, granularity: 'day', calendar: 'gregorian' },
        end: { year: 1948, month: 1, day: 30, granularity: 'day', calendar: 'gregorian' },
        role_policy: 'NULL_UNTIL_ACCURATE_POST_INDEPENDENCE_ROLE_REVIEW',
        basis: 'After the legal independence boundary Gandhi did not become a state ruler; he remained a non-officeholding political/social actor in India until death.'
      }
    ],
    source_keys: ['indiaIndependenceAct', 'gandhiChronology', 'gandhiHeritage'],
    rows: {
      '7a89364b-dacf-5798-9a6d-dd312cbbee4d': {
        expected_person: 'Mahatma Gandhi', expected_polity: 'British Raj', expected_start: 1915, expected_end: 1948, expected_role: 'Political leader and independence movement leader',
        disposition: 'RETIRE_AND_REPLACE_WITH_THREE_SOURCE_BACKED_PHASES', proposed_relation_type: null
      }
    }
  },
  LENIN_RSFSR_USSR: {
    model: 'CONSTITUENT_REPUBLIC_AND_UNION_POLITY_COEXIST_WITH_SIMULTANEOUS_OFFICES',
    facts: [
      'The Soviet Russian government formed in November 1917 with Lenin as chairman of the Council of People’s Commissars.',
      'The 30 December 1922 union treaty formed the USSR from the RSFSR and other republics rather than dissolving the RSFSR.',
      'The 1924 USSR constitution preserved union-republic state power outside Union competences, territorial consent protections, and a formal right of withdrawal.',
      'Lenin remained chairman of the RSFSR Council of People’s Commissars through 1924 and was separately chosen as chairman of the first USSR Council of People’s Commissars on 6 July 1923.'
    ],
    inference: 'RSFSR/Soviet Russia and USSR are simultaneous Polities after union formation: constituent and union. Lenin can therefore have overlapping Person–Polity Activities. The current RSFSR row ends too early and the current USSR row starts too early.',
    structural_relation: {
      subject: 'Soviet Russia',
      relation_type: 'constituent_of',
      object: 'Soviet Union',
      start: { year: 1922, month: 12, day: 30, granularity: 'day', calendar: 'gregorian' },
      end: null,
      subject_designation_note: 'Use temporal official-name/designation records such as Russian SFSR rather than assuming the stable Polity identity disappeared in 1922.'
    },
    source_keys: ['rsfsr1917', 'ussrTreaty', 'ussrConstitution1924', 'leninUSSRAppointment', 'leninOffices'],
    rows: {
      'df9c8cb3-bbf4-5037-930c-342962a3b7d0': {
        expected_person: 'Vladimir Lenin', expected_polity: 'Soviet Russia', expected_start: 1917, expected_end: 1922, expected_role: "Chairman of the Council of People's Commissars",
        disposition: 'KEEP_AND_EXTEND_RSFSR_OFFICE_TO_1924_01_21',
        proposed_relation_type: 'governs',
        reviewed_start: { year: 1917, month: 11, day: 8, granularity: 'day', calendar: 'gregorian', note: '26 October Old Style / 8 November New Style' },
        reviewed_end: { year: 1924, month: 1, day: 21, granularity: 'day', calendar: 'gregorian' }
      },
      'e05c0337-8048-5695-901f-36c8fe2c6c1c': {
        expected_person: 'Vladimir Lenin', expected_polity: 'Soviet Union', expected_start: 1922, expected_end: 1924, expected_role: "Chairman of the Council of People's Commissars",
        disposition: 'KEEP_BUT_MOVE_START_TO_FORMAL_USSR_APPOINTMENT_1923_07_06',
        proposed_relation_type: 'governs',
        reviewed_start: { year: 1923, month: 7, day: 6, granularity: 'day', calendar: 'gregorian' },
        reviewed_end: { year: 1924, month: 1, day: 21, granularity: 'day', calendar: 'gregorian' },
        office_status_note: 'Formal appointment is historical fact; severe illness prevented effective performance of the USSR chairmanship. Preserve this as evidence/chronology metadata rather than changing semantic identity.'
      }
    }
  }
});

const rows = [];
for (const [group, spec] of Object.entries(GROUPS)) {
  if (!polityRelationCodes.has(spec.structural_relation.relation_type)) {
    throw new Error(`modern structural decision uses relation outside contract: ${spec.structural_relation.relation_type}`);
  }
  for (const phase of spec.replacement_phases || []) {
    if (!relationCodes.has(phase.relation_type)) throw new Error(`modern replacement phase uses relation outside contract: ${phase.relation_type}`);
  }
  for (const [activityId, decision] of Object.entries(spec.rows)) {
    const row = byId.get(activityId);
    if (!row) throw new Error(`reviewed modern Activity missing: ${activityId}`);
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
    ) throw new Error(`modern dependent target drift ${activityId}: ${JSON.stringify(actual)}`);
    if (decision.proposed_relation_type && !relationCodes.has(decision.proposed_relation_type)) {
      throw new Error(`modern Activity decision uses relation outside contract: ${decision.proposed_relation_type}`);
    }
    if (!row.audit?.dependencies?.includes('polity_relation_model')) {
      throw new Error(`modern reviewed row no longer carries polity_relation_model dependency: ${activityId}`);
    }
    rows.push({
      activity_id: activityId,
      group,
      person: actual.person,
      current_polity: actual.polity,
      current_start_year: actual.start,
      current_end_year: actual.end,
      current_role: actual.role,
      old_audit_decision: row.audit?.decision ?? null,
      old_dependencies: row.audit?.dependencies ?? [],
      disposition: decision.disposition,
      proposed_relation_type: decision.proposed_relation_type,
      reviewed_start: decision.reviewed_start ?? null,
      reviewed_end: decision.reviewed_end ?? null,
      office_status_note: decision.office_status_note ?? null,
      source_keys: spec.source_keys
    });
  }
}

if (rows.length !== 4) throw new Error(`modern dependent decision contract must cover 4 current rows, got ${rows.length}`);

const summary = {
  schema: 'atlas-modern-dependent-polity-decisions-summary/v1',
  baseline_relationships: ledger.rows.length,
  reviewed_current_activity_rows: rows.length,
  reviewed_structural_relation_signal_rows: rows.length,
  resolved_structural_relation_model_rows: rows.length,
  unresolved_structural_relation_model_rows_in_this_cluster: 0,
  structural_relation_types: ['dominion_of', 'colonial_dependency_of', 'constituent_of'],
  gandhi_replacement_phase_count: GROUPS.GANDHI_BRITISH_RAJ_TO_INDIA.replacement_phases.length,
  lenin_simultaneous_constituent_and_union_offices_supported: true,
  newly_identified_exact_temporal_correction_groups: 2,
  exact_temporal_groups: ['GANDHI_BRITISH_RAJ_TO_INDIA', 'LENIN_RSFSR_USSR'],
  new_polity_identity_required: false,
  production_mutation_performed: false,
  conclusion: 'MODERN_DEPENDENT_AND_UNION_POLITY_MODEL_CLOSED_CORRECTIONS_AND_FULL_STRUCTURAL_INTERVAL_BACKFILL_REMAIN'
};

const payload = {
  schema: 'atlas-modern-dependent-polity-decisions/v1',
  status: 'SOURCE_BACKED_AUDIT_ONLY_NO_PRODUCTION_MUTATION',
  methodology: {
    dependent_polity_remains_polity_when_it_has_distinct_territorial_government: true,
    dependency_is_polity_relation_not_person_relink: true,
    union_polity_does_not_delete_constituent_polity: true,
    person_can_hold_simultaneous_activities_in_constituent_and_union_polities: true,
    colonial_independence_boundary_splits_person_activity: true,
    no_blanket_opposes_relation_before_source_backed_opposition_phase: true,
    no_new_polity_created_when_current_stable_target_exists: true
  },
  sources: SOURCES,
  groups: GROUPS,
  summary,
  rows
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
