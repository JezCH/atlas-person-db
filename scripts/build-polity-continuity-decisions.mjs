import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

const ledgerPath = arg('--ledger');
const outPath = arg('--out', 'artifacts/polity-continuity-decisions.json');
const summaryPath = arg('--summary', 'artifacts/polity-continuity-decisions-summary.json');
if (!ledgerPath) throw new Error('--ledger is required');

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
if (ledger.schema !== 'atlas-polity-semantic-master-ledger/v1') throw new Error(`unexpected ledger schema: ${ledger.schema}`);
if (!Array.isArray(ledger.rows) || ledger.rows.length !== 346) throw new Error(`unexpected ledger baseline: ${ledger.rows?.length}`);
const byId = new Map(ledger.rows.map((row) => [row.activity_id, row]));
if (byId.size !== 346) throw new Error(`duplicate Activity UUIDs: ${byId.size}`);

const SOURCES = Object.freeze({
  eastRomanContinuity: {
    title: 'Did the Byzantines call themselves Byzantines? Elements of Eastern Roman identity in the imperial discourse of the seventh century',
    author: 'Panagiotis Theodoropoulos',
    institution: 'Cambridge University Press / Byzantine and Modern Greek Studies',
    year: 2021,
    url: 'https://www.cambridge.org/core/journals/byzantine-and-modern-greek-studies/article/did-the-byzantines-call-themselves-byzantines-elements-of-eastern-roman-identity-in-the-imperial-discourse-of-the-seventh-century/65B940757F334DC5D5F0E6B479045BDD',
    source_type: 'peer_reviewed_article'
  },
  laterRoman395: {
    title: 'A History of the Later Roman Empire',
    author: 'J. B. Bury',
    institution: 'Cambridge University Press',
    year: 1889,
    url: 'https://www.cambridge.org/core/books/history-of-the-later-roman-empire/A81C90C305A9174263028FD7E53C533F',
    source_type: 'scholarly_monograph'
  },
  yuan1271: {
    title: 'Chinese society under Mongol rule, 1215–1368',
    author: 'Herbert Franke et al. / The Cambridge History of China',
    institution: 'Cambridge University Press',
    year: 2008,
    url: 'https://www.cambridge.org/core/books/abs/cambridge-history-of-china/chinese-society-under-mongol-rule-12151368/9A6883E723707B5FA65850F9AD9AA402',
    source_type: 'scholarly_reference_chapter'
  },
  northernYuan: {
    title: 'The cosmopolitanism of Karakorum, capital of the Mongol empire in Mongolia',
    author: 'Susanne Reichert',
    institution: 'Cambridge University Press / Modern Asian Studies',
    year: 2025,
    url: 'https://www.cambridge.org/core/journals/modern-asian-studies/article/cosmopolitanism-of-karakorum-capital-of-the-mongol-empire-in-mongolia/E562432CD03349E4D8A761D25592DBD6',
    source_type: 'peer_reviewed_article'
  },
  northernYuanEnd: {
    title: 'With Success Comes Failure',
    author: 'Timothy May',
    institution: 'Cambridge University Press / Arc Humanities Press',
    year: 2019,
    url: 'https://www.cambridge.org/core/books/abs/mongols/with-success-comes-failure/89E4CDA8CB5022E0DC25FF6EB8148D8A',
    source_type: 'scholarly_monograph_chapter'
  },
  peter1721: {
    title: 'Peter I accepted the imperial title. Russia became an empire',
    author: 'B. N. Yeltsin Presidential Library',
    institution: 'Presidential Library of the Russian Federation',
    year: 1721,
    url: 'https://www.prlib.ru/node/619684',
    source_type: 'public_history_primary_source_portal'
  },
  nystad1721: {
    title: 'The Treaty of Nystad was signed',
    author: 'B. N. Yeltsin Presidential Library',
    institution: 'Presidential Library of the Russian Federation',
    year: 1721,
    url: 'https://www.prlib.ru/history/619530',
    source_type: 'public_history_primary_source_portal'
  },
  portugal1815Law: {
    title: 'Carta de Lei de 16 de Dezembro de 1815',
    author: 'Prince Regent D. João',
    institution: 'Câmara dos Deputados, Brazil — Legislação Informatizada',
    year: 1815,
    url: 'https://www2.camara.leg.br/legin/fed/carlei/anterioresa1824/cartadelei-39554-16-dezembro-1815-569929-publicacaooriginal-93095-pe.html',
    source_type: 'primary_law'
  },
  portugal1816Arms: {
    title: 'Carta de Lei de 13 de Maio de 1816',
    author: 'D. João VI',
    institution: 'Câmara dos Deputados, Brazil — Legislação Informatizada',
    year: 1816,
    url: 'https://www2.camara.leg.br/legin/fed/carlei/anterioresa1824/cartadelei-39478-13-maio-1816-569762-publicacaooriginal-92979-pe.html',
    source_type: 'primary_law'
  }
});

const GROUPS = Object.freeze({
  ROMAN_EAST_ROMAN_395: {
    atlas_model: 'MAP_OPERATIONAL_TERRITORIAL_SPLIT_WITH_EXPLICIT_ROMAN_CONTINUITY_METADATA',
    historical_facts: [
      'The Roman political tradition and self-identification continued in the eastern empire; Byzantine is a modern/conventional label, not evidence of a newly invented non-Roman state.',
      '395 is nevertheless a defensible ATLAS map boundary because the empire was divided into eastern and western imperial administrations after Theodosius I, allowing separate time-dependent territorial authority to be represented.'
    ],
    model_inference: 'For map ownership, use the existing Byzantine/Eastern Roman Polity as the eastern territorial authority from 395 while preserving a splits-from/division relation and Roman-continuity metadata. This is an operational GIS identity decision, not a claim that Roman identity ended in 395.',
    source_keys: ['eastRomanContinuity', 'laterRoman395'],
    rows: {
      'aa5f6b18-e362-5421-9547-5ed0161d3cb8': {
        expected_person: 'Hypatia', expected_polity: 'Roman Empire', expected_start: 393, expected_end: 395,
        disposition: 'KEEP_PRE_395_REPRESENTATIVE', correction_class: 'KEEP'
      },
      'c778c8f8-9ae5-5d60-b04d-c5e002cf8bfa': {
        expected_person: 'Hypatia', expected_polity: 'Roman Empire', expected_start: 393, expected_end: 415,
        disposition: 'RETIRE_COMPETING_CROSS_BOUNDARY_SPAN', correction_class: 'RETIRE'
      },
      '3f0af453-7e55-5bf0-a8d8-6092788e28a6': {
        expected_person: 'Hypatia', expected_polity: 'Byzantine Empire', expected_start: 395, expected_end: 415,
        disposition: 'KEEP_POST_395_EASTERN_TERRITORIAL_AUTHORITY', correction_class: 'KEEP'
      }
    }
  },
  YUAN_NORTHERN_YUAN: {
    atlas_model: 'STABLE_YUAN_IDENTITY_WITH_NORTHERN_YUAN_HISTORIOGRAPHIC_DESIGNATION_AFTER_1368',
    historical_facts: [
      'Khubilai became Great Khan in 1260 but formally proclaimed the Great Yuan dynastic government in 1271, so Yuan cannot be back-projected without qualification to the whole 1260–1294 row.',
      'In 1368 the Yuan court and emperor withdrew from China into the Mongolian heartland; scholarship describes the resulting regime as Northern Yuan and explicitly notes the historiographic ambiguity of treating 1368 versus 1388 as the end of Yuan.'
    ],
    model_inference: 'For ATLAS identity, 1368 is primarily a major territorial/control transition, not a proven replacement of the ruling court by a new state. Reconcile Northern Yuan into the stable Yuan Polity identity for the reviewed 1368–1375 rows and store Northern Yuan as a historiographic temporal designation. Do not infer the same treatment for all post-1388 Mongol regimes without separate research.',
    source_keys: ['yuan1271', 'northernYuan', 'northernYuanEnd'],
    rows: {
      '418d957a-1658-51a6-8b35-71757f712760': {
        expected_person: 'Kublai Khan', expected_polity: 'Yuan Dynasty', expected_start: 1260, expected_end: 1294,
        disposition: 'SPLIT_AT_YUAN_FOUNDATION_BOUNDARY', correction_class: 'SPLIT_RESEARCH',
        followup: '1271–1294 may remain Yuan; the 1260–1271 Great-Khan authority requires a separately reviewed Polity/relation target rather than Yuan back-projection.'
      },
      '59559235-3a54-5985-b83d-bbc16ac01467': {
        expected_person: 'Emperor Huizong of Yuan', expected_polity: 'Yuan Dynasty', expected_start: 1333, expected_end: 1368,
        disposition: 'KEEP_AS_STABLE_YUAN_REPRESENTATIVE_AND_COALESCE_TO_1370', correction_class: 'UPDATE_AFTER_RELINK'
      },
      '68c203e5-ac61-59ed-853b-365bdf3ed340': {
        expected_person: 'Emperor Huizong of Yuan', expected_polity: 'Northern Yuan', expected_start: 1368, expected_end: 1370,
        disposition: 'RELINK_TO_STABLE_YUAN_THEN_COALESCE_DROP', correction_class: 'RELINK_COALESCE'
      },
      'c5085fdb-379a-5710-bf14-c748b5b822da': {
        expected_person: 'Koke Temur', expected_polity: 'Northern Yuan', expected_start: 1368, expected_end: 1375,
        disposition: 'RELINK_TO_STABLE_YUAN_WITH_NORTHERN_YUAN_DESIGNATION_CONTEXT', correction_class: 'RELINK'
      }
    }
  },
  RUSSIA_1721: {
    atlas_model: 'STABLE_RUSSIA_POLITY_WITH_TSARDOM_AND_EMPIRE_TEMPORAL_DESIGNATIONS',
    historical_facts: [
      'Peter ruled as Tsar before accepting the title Emperor of All Russia in 1721.',
      'Russian public historical sources describe the Russian state as thereafter being called the Russian Empire; there was no secession, union, or replacement ruling house at that boundary.'
    ],
    model_inference: 'Do not create a diachronic successor Polity merely for the 1721 title/state-form change. Reconcile Tsardom of Russia and Russian Empire into one stable Russia identity, keep the Role transition, and represent Tsardom/Russian Empire as temporal state-form or official-name designations. The exact 1721 title transition introduces a sub-year correction requirement.',
    transition: { year: 1721, month: 11, day: 2, granularity: 'day', calendar: 'gregorian', certainty: 'exact' },
    source_keys: ['peter1721', 'nystad1721'],
    rows: {
      '57cdefa5-9a5d-533c-b229-47e398f1d07a': {
        expected_person: 'Peter I', expected_polity: 'Tsardom of Russia', expected_start: 1682, expected_end: 1721,
        disposition: 'KEEP_TSAR_PHASE_RELINK_TO_STABLE_RUSSIA', correction_class: 'RELINK_KEEP_ROLE_PHASE'
      },
      'eda26b64-2f59-5f15-954a-73404ceed064': {
        expected_person: 'Peter I', expected_polity: 'Russian Empire', expected_start: 1682, expected_end: 1725,
        disposition: 'RETIRE_BACKPROJECTED_COMPETING_SPAN', correction_class: 'RETIRE'
      },
      '9ec53325-3a97-58a8-a7e7-81a496a47e57': {
        expected_person: 'Peter I', expected_polity: 'Russian Empire', expected_start: 1721, expected_end: 1725,
        disposition: 'KEEP_EMPEROR_PHASE_RELINK_TO_SAME_STABLE_RUSSIA', correction_class: 'RELINK_KEEP_ROLE_PHASE'
      }
    }
  },
  PORTUGAL_1815_UNION: {
    atlas_model: 'DISTINCT_COMPOSITE_UNITED_KINGDOM_WITH_PORTUGAL_AS_CONSTITUENT',
    historical_facts: [
      'The 16 December 1815 law elevated Brazil to a kingdom and expressly declared Portugal, the Algarves and Brazil to form one single United Kingdom.',
      'The 13 May 1816 law again describes the three kingdoms as constituting one and the same United Kingdom.'
    ],
    model_inference: 'Unlike the 1721 Russian title change, the 1815 act explicitly creates a composite union from multiple kingdoms. Keep the United Kingdom as a distinct composite Polity. Kingdom of Portugal may continue as a constituent Polity via a structural relation, but Maria I’s top-level sovereign Activity after formation belongs to the United Kingdom, not a duplicate full-span Kingdom-of-Portugal row. The exact 16 December 1815 boundary requires sub-year correction.',
    transition: { year: 1815, month: 12, day: 16, granularity: 'day', calendar: 'gregorian', certainty: 'exact' },
    source_keys: ['portugal1815Law', 'portugal1816Arms'],
    rows: {
      'a5be2a19-2c82-519f-9a3c-6dcc5a1bf3b7': {
        expected_person: 'Maria I of Portugal', expected_polity: 'Kingdom of Portugal', expected_start: 1777, expected_end: 1815,
        disposition: 'KEEP_PRE_UNION_SOVEREIGN_PHASE', correction_class: 'KEEP_SUBYEAR_BOUNDARY_REQUIRED'
      },
      'fefe572f-95f7-5913-86ed-304c7c2ca679': {
        expected_person: 'Maria I of Portugal', expected_polity: 'Kingdom of Portugal', expected_start: 1777, expected_end: 1816,
        disposition: 'RETIRE_COMPETING_CROSS_UNION_SPAN', correction_class: 'RETIRE'
      },
      '25fcca0f-9ca3-5bdd-a9c8-e11bf8e22b89': {
        expected_person: 'Maria I of Portugal', expected_polity: 'United Kingdom of Portugal, Brazil and the Algarves', expected_start: 1815, expected_end: 1816,
        disposition: 'KEEP_POST_UNION_COMPOSITE_POLITY_PHASE', correction_class: 'KEEP_SUBYEAR_BOUNDARY_REQUIRED'
      }
    }
  }
});

const expectedContinuityIds = new Set(Object.values(GROUPS).flatMap((g) => Object.keys(g.rows)));
if (expectedContinuityIds.size !== 13) throw new Error(`continuity decision contract must cover 13 Activity UUIDs, got ${expectedContinuityIds.size}`);

const oldContinuityRows = ledger.rows.filter((r) => r.audit?.dependencies?.includes('polity_identity_model'))
  .filter((r) => [
    'aa5f6b18-e362-5421-9547-5ed0161d3cb8','c778c8f8-9ae5-5d60-b04d-c5e002cf8bfa','3f0af453-7e55-5bf0-a8d8-6092788e28a6',
    '418d957a-1658-51a6-8b35-71757f712760','59559235-3a54-5985-b83d-bbc16ac01467','68c203e5-ac61-59ed-853b-365bdf3ed340','c5085fdb-379a-5710-bf14-c748b5b822da',
    '57cdefa5-9a5d-533c-b229-47e398f1d07a','eda26b64-2f59-5f15-954a-73404ceed064','9ec53325-3a97-58a8-a7e7-81a496a47e57',
    'a5be2a19-2c82-519f-9a3c-6dcc5a1bf3b7','fefe572f-95f7-5913-86ed-304c7c2ca679','25fcca0f-9ca3-5bdd-a9c8-e11bf8e22b89'
  ].includes(r.activity_id));
if (oldContinuityRows.length !== 13) throw new Error(`reviewed continuity baseline drift: ${oldContinuityRows.length}`);

const rows = [];
for (const [groupCode, group] of Object.entries(GROUPS)) {
  for (const [activityId, decision] of Object.entries(group.rows)) {
    const current = byId.get(activityId);
    if (!current) throw new Error(`reviewed continuity Activity missing: ${activityId}`);
    const actual = {
      person: current.person?.canonical ?? null,
      polity: current.polity?.canonical ?? null,
      start: current.activity?.start_year ?? null,
      end: current.activity?.end_year ?? null
    };
    if (
      actual.person !== decision.expected_person ||
      actual.polity !== decision.expected_polity ||
      actual.start !== decision.expected_start ||
      actual.end !== decision.expected_end
    ) {
      throw new Error(`continuity target drift ${activityId}: ${JSON.stringify(actual)}`);
    }
    rows.push({
      activity_id: activityId,
      person: actual.person,
      current_polity: actual.polity,
      current_start_year: actual.start,
      current_end_year: actual.end,
      role: current.activity?.role ?? null,
      group: groupCode,
      atlas_model: group.atlas_model,
      disposition: decision.disposition,
      correction_class: decision.correction_class,
      followup: decision.followup ?? null,
      source_keys: group.source_keys
    });
  }
}

const countBy = (key) => Object.fromEntries([...rows.reduce((map, row) => {
  const value = row[key];
  map.set(value, (map.get(value) ?? 0) + 1);
  return map;
}, new Map()).entries()].sort(([a], [b]) => String(a).localeCompare(String(b))));

const summary = {
  schema: 'atlas-polity-continuity-decisions-summary/v1',
  baseline_relationships: ledger.rows.length,
  reviewed_continuity_rows: rows.length,
  reviewed_continuity_groups: Object.keys(GROUPS).length,
  unresolved_continuity_model_rows: 0,
  correction_class_counts: countBy('correction_class'),
  newly_identified_exact_transition_cases: 2,
  exact_transition_groups: ['RUSSIA_1721', 'PORTUGAL_1815_UNION'],
  kublai_pre_yuan_target_still_requires_structural_historical_research: true,
  production_mutation_performed: false,
  conclusion: 'CONTINUITY_MODEL_DECISIONS_CLOSED_CORRECTIONS_REMAIN_NON_PRODUCTION'
};

if (summary.reviewed_continuity_rows !== 13 || summary.reviewed_continuity_groups !== 4) {
  throw new Error(`continuity coverage drift: ${summary.reviewed_continuity_rows}/${summary.reviewed_continuity_groups}`);
}

const payload = {
  schema: 'atlas-polity-continuity-decisions/v1',
  status: 'SOURCE_BACKED_AUDIT_ONLY_NO_PRODUCTION_MUTATION',
  methodology: {
    fact_vs_model_inference_separated: true,
    no_lexical_auto_split: true,
    territory_change_does_not_automatically_create_new_polity_uuid: true,
    state_form_change_does_not_automatically_create_new_polity_uuid: true,
    composite_union_may_create_distinct_polity_when_primary_law_establishes_one: true,
    uncertainty_preserved: true
  },
  summary,
  sources: SOURCES,
  groups: GROUPS,
  rows
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
