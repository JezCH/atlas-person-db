import fs from 'node:fs';
import path from 'node:path';
import { stage2DomainContract, personPolityRelationCodes } from './stage2-domain-contract.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

const ledgerPath = arg('--ledger');
const outPath = arg('--out', 'artifacts/relation-semantics-audit.json');
const summaryPath = arg('--summary', 'artifacts/relation-semantics-audit-summary.json');
if (!ledgerPath) throw new Error('--ledger is required');

const TAXONOMY = Object.freeze(Object.fromEntries(
  stage2DomainContract.person_polity_relation_types.map(({ code, meaning, runtime }) => [code, { meaning, runtime }])
));
const VALID_RELATION_TYPES = new Set(personPolityRelationCodes);

// Audit-only exact-role policy for the reviewed 346-row baseline.
// This is deliberately NOT a future production classifier. Unknown or overloaded
// role labels remain REVIEW_REQUIRED instead of being guessed from keywords.
const ROLE_POLICY = new Map();
const assign = (relationType, roles) => {
  if (!VALID_RELATION_TYPES.has(relationType)) throw new Error(`role policy uses relation outside Stage 2 contract: ${relationType}`);
  for (const role of roles) {
    if (ROLE_POLICY.has(role)) throw new Error(`duplicate relation role policy: ${role}`);
    ROLE_POLICY.set(role, relationType);
  }
};

assign('rules', [
  'Emperor', 'King', 'Queen', 'President', 'Duke', 'Sultan', 'King of Kings',
  'King and military commander', 'Queen and military leader', 'Queen regnant', 'Ajaw',
  'Caliph', 'Emperor and military commander', 'Holy Roman Emperor', 'King and emperor',
  'Mansa', 'Pharaoh', 'President and liberator', 'Sapa Inca',
  'Archduchess of Austria and Queen of Hungary and Bohemia', 'Askia and emperor',
  'Chairman and de facto leader', 'Chairman and paramount leader', 'Chanyu',
  'Dictator, consul and general', 'Doge', 'Emperor and Khagan', 'First president',
  'Founder and Ruler', 'Founder and ruler', 'Founder, ruler and emperor', 'Founding emperor',
  'General Secretary and de facto leader', 'Great King', 'Head of State and Supreme Commander',
  'Heavenly King', 'Hegemon-King', 'Huey Tlatoani', 'Kandake', 'Khagan',
  'Khagan and emperor', 'Khagan and military commander', 'King of Goguryeo',
  'King of Israel', 'King of Poland', 'King, conqueror and lawgiver', 'Lord Protector',
  'Mai', 'Manikongo', 'Monarch', 'Paramount Leader', 'Pharaoh and military commander',
  'Premier and President', 'Provisional President and revolutionary leader',
  'Queen and pharaoh', 'Ruler and dynastic founder', 'Shah', 'Theocratic ruler',
  'Tsar', 'Tsar and emperor'
]);

assign('governs', [
  'Prime Minister', 'Chancellor', "Chairman of the Council of People's Commissars",
  'Chancellor and de facto ruler', 'Empress Dowager and Regent',
  'Grand Chancellor and chief minister', 'Minister President',
  'Member of the Committee of Public Safety and de facto leader',
  'Strategist, chancellor and regent', 'Shikken', 'Shogun and military commander',
  'Shogun and retired de facto ruler', 'Retired shogun and de facto ruler',
  'Military leader and Kampaku'
]);

assign('serves', [
  'General', 'Admiral and diplomat', 'General and statesman',
  'General and governor of Jing Province', 'Military leader and national heroine',
  'Military officer and naval commander', 'Diplomat and human rights leader',
  'Statesman, diplomat, scientist and inventor', 'Colonial agent, scientist and writer'
]);

assign('active_in', [
  'Great Royal Wife', 'Philosopher, educator and political thinker', 'Queen and royal adviser',
  'Philosopher and founder of the Academy', 'Religious leader and philosopher',
  'Religious leader and preacher', 'Mathematician, philosopher and astronomer',
  'Great Khatun', 'Artist, engineer and polymath', 'Mathematician and writer',
  'Queen Consort', 'Queen consort and political figure', 'Queen consort and queen mother',
  'Empress and political advisor', 'Abolitionist, humanitarian and Union scout',
  'Suffragette and social activist'
]);

assign('opposes', [
  'Religious leader and rebel commander', 'Nationalist, writer and reformist', 'Pirate leader'
]);

const VALID_HINTS = VALID_RELATION_TYPES;
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
if (ledger.schema !== 'atlas-polity-semantic-master-ledger/v1') {
  throw new Error(`unexpected ledger schema: ${ledger.schema}`);
}
if (!Array.isArray(ledger.rows)) throw new Error('ledger rows missing');

const rows = ledger.rows.map((row) => {
  const role = row.activity?.role ?? null;
  const proposed = role ? ROLE_POLICY.get(role) ?? null : null;
  const hint = row.audit?.relation_hint ?? null;
  const hintConflict = proposed && VALID_HINTS.has(hint) && hint !== proposed;
  return {
    activity_id: row.activity_id,
    person: row.person?.canonical ?? null,
    polity: row.polity?.canonical ?? null,
    start_year: row.activity?.start_year ?? null,
    end_year: row.activity?.end_year ?? null,
    role,
    audit_decision: row.audit?.decision ?? null,
    execution_class: row.audit?.execution_class ?? null,
    existing_relation_hint: hint,
    proposed_relation_type: proposed,
    status: proposed ? 'CANDIDATE' : 'REVIEW_REQUIRED',
    basis: proposed ? 'EXACT_ROLE_POLICY_CURRENT_BASELINE' : 'NO_SAFE_EXACT_ROLE_POLICY',
    relation_hint_conflict: Boolean(hintConflict),
    dependencies: row.audit?.dependencies ?? []
  };
});

const countBy = (items, keyFn) => {
  const out = {};
  for (const item of items) {
    const key = keyFn(item);
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
};

const relationDependency = rows.filter((r) => r.dependencies.includes('relation_type'));
const conflicts = rows.filter((r) => r.relation_hint_conflict);
const reviewRequired = rows.filter((r) => r.status === 'REVIEW_REQUIRED');
const summary = {
  schema: 'atlas-relation-semantics-audit-summary/v1',
  baseline_relationships: rows.length,
  unique_activity_ids: new Set(rows.map((r) => r.activity_id)).size,
  taxonomy: personPolityRelationCodes,
  candidate_rows: rows.filter((r) => r.status === 'CANDIDATE').length,
  review_required_rows: reviewRequired.length,
  candidate_counts: countBy(rows.filter((r) => r.status === 'CANDIDATE'), (r) => r.proposed_relation_type),
  relation_dependency_rows: relationDependency.length,
  relation_dependency_candidate_rows: relationDependency.filter((r) => r.status === 'CANDIDATE').length,
  relation_dependency_review_rows: relationDependency.filter((r) => r.status === 'REVIEW_REQUIRED').length,
  existing_hint_conflicts: conflicts.length,
  conflict_activity_ids: conflicts.map((r) => r.activity_id),
  review_role_counts: countBy(reviewRequired, (r) => r.role ?? '<NULL>')
};

if (summary.baseline_relationships !== 346 || summary.unique_activity_ids !== 346) {
  throw new Error(`relation audit baseline drift: ${summary.baseline_relationships}/${summary.unique_activity_ids}`);
}
if (summary.relation_dependency_rows !== 154) {
  throw new Error(`relation dependency baseline drift: ${summary.relation_dependency_rows}`);
}
if (summary.candidate_rows !== 280 || summary.review_required_rows !== 66) {
  throw new Error(`relation policy coverage drift: candidate=${summary.candidate_rows} review=${summary.review_required_rows}`);
}
if (summary.relation_dependency_candidate_rows !== 129 || summary.relation_dependency_review_rows !== 25) {
  throw new Error(`relation dependency coverage drift: candidate=${summary.relation_dependency_candidate_rows} review=${summary.relation_dependency_review_rows}`);
}
if (summary.existing_hint_conflicts !== 7) {
  throw new Error(`existing relation hint conflict count drift: ${summary.existing_hint_conflicts}`);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify({
  schema: 'atlas-relation-semantics-audit/v1',
  status: 'AUDIT_ONLY_NO_PRODUCTION_MUTATION',
  taxonomy: TAXONOMY,
  policy_scope: 'CURRENT_REVIEWED_346_ROW_BASELINE_ONLY',
  summary,
  rows
}, null, 2)}\n`);
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
