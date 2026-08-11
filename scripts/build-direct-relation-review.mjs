import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

const readinessPath = arg('--readiness');
const outPath = arg('--out', 'artifacts/direct-relation-review.json');
const summaryPath = arg('--summary', 'artifacts/direct-relation-review-summary.json');
if (!readinessPath) throw new Error('--readiness is required');

const readiness = JSON.parse(fs.readFileSync(readinessPath, 'utf8'));
if (readiness.schema !== 'atlas-relation-backfill-readiness/v1') {
  throw new Error(`unexpected readiness schema: ${readiness.schema}`);
}
if (!Array.isArray(readiness.rows) || readiness.rows.length !== 66) {
  throw new Error(`unexpected readiness row count: ${readiness.rows?.length}`);
}

const direct = readiness.rows.filter((row) => row.disposition === 'DIRECT_RELATION_REVIEW');
if (direct.length !== 14) throw new Error(`direct Relation queue drift: ${direct.length}`);
const byId = new Map(direct.map((row) => [row.activity_id, row]));
if (byId.size !== 14) throw new Error('duplicate Activity UUID in direct Relation queue');

const RESOLUTIONS = Object.freeze({
  '85896e61-c810-590e-bf3c-9240168d2953': {
    expected_person: 'Pericles', expected_polity: 'Athens', action: 'BACKFILL_RELATION', relation_type: 'governs',
    rationale: 'Pericles exercised decisive political leadership through Athenian democratic institutions and the elected strategos office, but was not a monarch or sovereign ruler of Athens.'
  },
  '580bc3b3-c93d-57ee-8276-aed42a625b10': {
    expected_person: 'Marquess Lie of Han', expected_polity: 'Han', action: 'BACKFILL_RELATION', relation_type: 'rules',
    rationale: 'The reviewed ruler chronology identifies Marquess Lie as monarch of the Han state from 399 to 387 BCE.'
  },
  '2f18a41d-6f4e-541d-b549-32ec505e8c53': {
    expected_person: 'Boudica', expected_polity: 'Iceni', action: 'HISTORICAL_RESEARCH_FIRST', relation_type: null,
    rationale: 'Modern scholarship explicitly treats Boudica’s political authority within the Iceni as ambiguous and cautions that the ancient queen label may carry inaccurate Roman political implications.'
  },
  'eaa40098-26b0-5425-8daf-83f85207da3f': {
    expected_person: 'Dong Zhuo', expected_polity: 'Eastern Han', action: 'BACKFILL_RELATION', relation_type: 'governs',
    rationale: 'Dong Zhuo seized control of the Han court, deposed one emperor and installed Emperor Xian while holding top government power; this is governmental/de facto control, not sovereign identity as Han emperor.'
  },
  'b0e51c35-a02a-568a-969e-4e9207b2c787': {
    expected_person: 'Theodora', expected_polity: 'Byzantine Empire', action: 'BACKFILL_RELATION', relation_type: 'governs',
    rationale: 'Theodora was Augusta and an imperial partner in administration with Justinian, but the sovereign emperor identity remains Justinian; governs preserves substantial governmental authority without inventing sole sovereignty.'
  },
  '226e8667-d437-5ae7-8284-77a365371260': {
    expected_person: 'Eleanor of Aquitaine', expected_polity: 'Duchy of Aquitaine', action: 'STRUCTURAL_CORRECTION_FIRST', relation_type: null,
    rationale: 'The continuous 1137–1204 row crosses materially different authority phases: joint action with Louis VII, later direct ducal authority, confinement, and later regency/governance. One relation value would flatten those phases.'
  },
  '250ee5a9-4227-52c7-915a-233b5bdb3ddf': {
    expected_person: 'Liu Futong', expected_polity: 'Red Turban Song', action: 'BACKFILL_RELATION', relation_type: 'governs',
    rationale: 'Han Lin’er was installed as emperor while Liu Futong served as senior minister/chancellor and later concentrated governmental authority; governs fits de facto government leadership under a nominal emperor.'
  },
  '7e6d042a-78a2-54b0-9d27-efcab3043282': {
    expected_person: 'Owain Glyndwr', expected_polity: 'Principality of Wales', action: 'BACKFILL_RELATION', relation_type: 'rules',
    rationale: 'The current Polity is the claimant Welsh polity itself: Glyndŵr assumed the Prince of Wales title, summoned Welsh parliaments and pursued independent diplomatic/church policy. Claim-vs-effective-control belongs to Territory semantics, not replacement of his leadership relation.'
  },
  '76007cca-bbf3-5e04-87f7-a362cd2f93eb': {
    expected_person: 'Henry the Navigator', expected_polity: 'Kingdom of Portugal', action: 'BACKFILL_RELATION', relation_type: 'serves',
    rationale: 'Henry was a Portuguese prince and office-holder/patron operating within crown structures; he did not rule the Kingdom of Portugal as sovereign or head of government.'
  },
  '627ed16c-1fa9-5047-8e0c-bc3c552fb5c7': {
    expected_person: "Catherine de' Medici", expected_polity: 'Kingdom of France', action: 'STRUCTURAL_CORRECTION_FIRST', relation_type: null,
    rationale: 'The 1547–1589 compound Queen-consort-and-regent row merges non-ruling consort/adviser phases with periods of regency/governmental authority. Scholarship explicitly notes that she never ruled France in her own right.'
  },
  '34ed5d1e-b93b-5955-b5e9-2edbc4ffaf8d': {
    expected_person: 'Nzinga Mbande', expected_polity: 'Kingdom of Ndongo', action: 'STRUCTURAL_CORRECTION_FIRST', relation_type: null,
    rationale: 'Her Ndongo legitimacy was historically complex while her effective bases and Matamba rule changed through the interval. The current Queen-regnant-and-claimant row must separate legitimate rule, claim, and effective-control phases before one relation is backfilled.'
  },
  '48cca2d5-adf6-51e6-9fa3-a1f463f1d2be': {
    expected_person: 'Simon Bolivar', expected_polity: 'Peru', action: 'BACKFILL_RELATION', relation_type: 'governs',
    rationale: 'Peru’s Congress conferred supreme political and military/dictatorial authority on Bolívar. This is top governmental authority in the republic, not sovereign ownership of the polity.'
  },
  '7a89364b-dacf-5798-9a6d-dd312cbbee4d': {
    expected_person: 'Mahatma Gandhi', expected_polity: 'British Raj', action: 'STRUCTURAL_CORRECTION_FIRST', relation_type: null,
    rationale: 'The 1915–1948 British Raj row crosses the independence transition. Before independence Gandhi led resistance to British rule; after 15 August 1947 his peace/communal-unity activity occurred in independent India. One British-Raj relation through 1948 is structurally false.'
  },
  '5be7f060-46d1-58f9-ad7c-3b03458c198a': {
    expected_person: 'Tecumseh', expected_polity: "Tecumseh's Confederacy", action: 'BACKFILL_RELATION', relation_type: 'governs',
    rationale: 'Tecumseh formed and politically led the intertribal confederacy; NPS evidence describes his control of its political aspects and the obedience/respect of followers. Governs fits coalition political leadership better than monarchic rules.'
  }
});

if (Object.keys(RESOLUTIONS).length !== 14) throw new Error('direct review resolution count must remain 14');

const reviewedRows = [];
for (const [id, resolution] of Object.entries(RESOLUTIONS)) {
  const row = byId.get(id);
  if (!row) throw new Error(`reviewed direct Activity missing from queue: ${id}`);
  if (row.person !== resolution.expected_person || row.polity !== resolution.expected_polity) {
    throw new Error(`binding drift for ${id}: ${row.person} / ${row.polity}`);
  }
  reviewedRows.push({
    ...row,
    reviewed_action: resolution.action,
    reviewed_relation_type: resolution.relation_type,
    reviewed_rationale: resolution.rationale
  });
}

const relationReady = reviewedRows.filter((r) => r.reviewed_action === 'BACKFILL_RELATION');
const structural = reviewedRows.filter((r) => r.reviewed_action === 'STRUCTURAL_CORRECTION_FIRST');
const research = reviewedRows.filter((r) => r.reviewed_action === 'HISTORICAL_RESEARCH_FIRST');
if (relationReady.length !== 9 || structural.length !== 4 || research.length !== 1) {
  throw new Error(`direct review outcome drift: ${relationReady.length}/${structural.length}/${research.length}`);
}

const baseSummary = readiness.summary ?? {};
const finalDispositionCounts = {
  reviewed_relation_ready: Number(baseSummary.reviewed_relation_ready ?? 0) + relationReady.length,
  structural_correction_first: Number(baseSummary.structural_correction_first ?? 0) + structural.length,
  identity_reconciliation_first: Number(baseSummary.identity_reconciliation_first ?? 0),
  historical_research_first: Number(baseSummary.historical_research_first ?? 0) + research.length,
  direct_relation_review: 0
};
const total = Object.values(finalDispositionCounts).reduce((sum, value) => sum + value, 0);
if (JSON.stringify(finalDispositionCounts) !== JSON.stringify({
  reviewed_relation_ready: 14,
  structural_correction_first: 35,
  identity_reconciliation_first: 6,
  historical_research_first: 11,
  direct_relation_review: 0
})) throw new Error(`final disposition drift: ${JSON.stringify(finalDispositionCounts)}`);
if (total !== 66) throw new Error(`final disposition total drift: ${total}`);

const summary = {
  schema: 'atlas-direct-relation-review-summary/v1',
  reviewed_queue_rows: direct.length,
  newly_relation_ready: relationReady.length,
  moved_to_structural_correction: structural.length,
  moved_to_historical_research: research.length,
  unresolved_direct_relation_queue: 0,
  final_66_disposition_counts: finalDispositionCounts,
  conclusion: 'DIRECT_RELATION_QUEUE_CLOSED_WITHOUT_NEW_RELATION_ENUM'
};

const payload = {
  schema: 'atlas-direct-relation-review/v1',
  status: 'AUDIT_ONLY_NO_PRODUCTION_MUTATION',
  summary,
  rows: reviewedRows
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
