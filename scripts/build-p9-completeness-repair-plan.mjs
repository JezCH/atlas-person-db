import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const auditPath = arg('--audit');
const outPath = arg('--out', 'artifacts/p9-completeness-repair-plan.json');
if (!auditPath) throw new Error('--audit is required');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const temporalPolicy = readJson(path.join(root, 'stage2/integration/p9-legacy-temporal-metadata-migration.v1.json'));
const fullDisposition = readJson(path.join(root, 'stage2/integration/p7-full-relation-review-dispositions.v1.json'));
const runtimeDisposition = readJson(path.join(root, 'stage2/integration/p7-runtime-readiness-dispositions.v1.json'));

const explicitDecisions = new Map();
for (const name of fs.readdirSync(path.join(root, 'stage2/integration')).filter((n) => /^p7-explicit-person-relation-decisions-batch\d+\.v1\.json$/.test(n)).sort()) {
  const doc = readJson(path.join(root, 'stage2/integration', name));
  for (const d of doc.decisions || []) {
    explicitDecisions.set(String(d.activity_id).toLowerCase(), Object.freeze({ ...d, authority_file: `stage2/integration/${name}` }));
  }
}

// Frozen exact-role policy from the reviewed 346-row relation-semantics audit.
// It is a carry-forward rule for those legacy labels only, not a future classifier.
const ROLE_POLICY = new Map();
const assign = (relation, roles) => roles.forEach((role) => ROLE_POLICY.set(role, relation));
assign('rules', [
  'Emperor','King','Queen','President','Duke','Sultan','King of Kings','King and military commander','Queen and military leader','Queen regnant','Ajaw','Caliph','Emperor and military commander','Holy Roman Emperor','King and emperor','Mansa','Pharaoh','President and liberator','Sapa Inca','Archduchess of Austria and Queen of Hungary and Bohemia','Askia and emperor','Chairman and de facto leader','Chairman and paramount leader','Chanyu','Dictator, consul and general','Doge','Emperor and Khagan','First president','Founder and Ruler','Founder and ruler','Founder, ruler and emperor','Founding emperor','General Secretary and de facto leader','Great King','Head of State and Supreme Commander','Heavenly King','Hegemon-King','Huey Tlatoani','Kandake','Khagan','Khagan and emperor','Khagan and military commander','King of Goguryeo','King of Israel','King of Poland','King, conqueror and lawgiver','Lord Protector','Mai','Manikongo','Monarch','Paramount Leader','Pharaoh and military commander','Premier and President','Provisional President and revolutionary leader','Queen and pharaoh','Ruler and dynastic founder','Shah','Theocratic ruler','Tsar','Tsar and emperor'
]);
assign('governs', [
  'Prime Minister','Chancellor',"Chairman of the Council of People's Commissars",'Chancellor and de facto ruler','Empress Dowager and Regent','Grand Chancellor and chief minister','Minister President','Member of the Committee of Public Safety and de facto leader','Strategist, chancellor and regent','Shikken','Shogun and military commander','Shogun and retired de facto ruler','Retired shogun and de facto ruler','Military leader and Kampaku'
]);
assign('serves', ['General','Admiral and diplomat','General and statesman','General and governor of Jing Province','Military leader and national heroine','Military officer and naval commander','Diplomat and human rights leader','Statesman, diplomat, scientist and inventor','Colonial agent, scientist and writer']);
assign('active_in', ['Great Royal Wife','Philosopher, educator and political thinker','Queen and royal adviser','Philosopher and founder of the Academy','Religious leader and philosopher','Religious leader and preacher','Mathematician, philosopher and astronomer','Great Khatun','Artist, engineer and polymath','Mathematician and writer','Queen Consort','Queen consort and political figure','Queen consort and queen mother','Empress and political advisor','Abolitionist, humanitarian and Union scout','Suffragette and social activist']);
assign('opposes', ['Religious leader and rebel commander','Nationalist, writer and reformist','Pirate leader']);

const runtimeById = new Map((runtimeDisposition.resolutions || []).map((x) => [String(x.activity_id).toLowerCase(), x]));
const structuralById = new Map();
for (const x of fullDisposition.retire_or_migrate_before_relation || []) structuralById.set(String(x.activity_id).toLowerCase(), { ...x, class: 'RETIRE_OR_MIGRATE_FIRST' });
for (const x of fullDisposition.structural_or_multiphase_correction_before_relation || []) structuralById.set(String(x.activity_id).toLowerCase(), { ...x, class: 'STRUCTURAL_OR_MULTIPHASE_FIRST' });
for (const x of fullDisposition.relation_review_resolved || []) explicitDecisions.set(String(x.activity_id).toLowerCase(), { ...x, authority_file: 'stage2/integration/p7-full-relation-review-dispositions.v1.json' });

function missingFields(row) {
  return ['relation_type_id','period_basis_id','activity_start_granularity','activity_start_calendar','activity_end_granularity','activity_end_calendar'].filter((k) => row[k] == null);
}

function temporalResolution(row, runtime) {
  if (!['activity_start_granularity','activity_start_calendar','activity_end_granularity','activity_end_calendar'].some((k) => row[k] == null)) {
    return { class: 'ALREADY_COMPLETE', ready: true };
  }
  const status = String(row.chronology_status || '');
  const mapping = temporalPolicy.chronology_status_mapping?.[status];
  if (!mapping) return { class: 'CHRONOLOGY_STATUS_UNMAPPED', ready: false, chronology_status: status || null };
  const reviewedCalendar = runtime?.runtime_override?.calendar || null;
  return {
    class: reviewedCalendar ? 'REVIEWED_OVERRIDE_PLUS_LEGACY_METADATA' : 'LEGACY_YEAR_ONLY_METADATA',
    ready: true,
    preserve_start_year: row.activity_start,
    preserve_end_year: row.activity_end,
    activity_start_month: null,
    activity_start_day: null,
    activity_start_granularity: 'year',
    activity_start_certainty: mapping.activity_start_certainty,
    activity_start_calendar: reviewedCalendar || temporalPolicy.boundary_materialization.activity_start_calendar,
    activity_end_month: null,
    activity_end_day: null,
    activity_end_granularity: 'year',
    activity_end_certainty: mapping.activity_end_certainty,
    activity_end_calendar: reviewedCalendar || temporalPolicy.boundary_materialization.activity_end_calendar,
    authority: 'stage2/integration/p9-legacy-temporal-metadata-migration.v1.json'
  };
}

function relationResolution(detail, incomplete, runtime, structural) {
  if (incomplete.relation_type_id != null) return { class: 'ALREADY_PRESENT', ready: true, relation_type_id: incomplete.relation_type_id };
  if (runtime?.runtime_action === 'exclude_activity') {
    return { class: 'RUNTIME_EXCLUDE_STRUCTURAL_FIRST', ready: false, reviewed_decision: runtime.reviewed_decision, authority: 'stage2/integration/p7-runtime-readiness-dispositions.v1.json' };
  }
  if (runtime?.runtime_action === 'publish_activity') {
    return { class: 'REVIEWED_RUNTIME_OVERRIDE', ready: true, relation_type_id: runtime.runtime_override?.relation_type_id || null, reviewed_decision: runtime.reviewed_decision, authority: 'stage2/integration/p7-runtime-readiness-dispositions.v1.json' };
  }
  if (structural) return { class: structural.class, ready: false, reviewed_decision: structural.decision, reason: structural.reason, authority: 'stage2/integration/p7-full-relation-review-dispositions.v1.json' };
  const explicit = explicitDecisions.get(String(incomplete.activity_id).toLowerCase());
  if (explicit) return { class: 'REVIEWED_RELATION', ready: true, relation_code: explicit.relation_code, relation_type_id: explicit.relation_type_id || null, authority: explicit.authority_file };
  const role = detail?.role_source_label || null;
  const candidate = role ? ROLE_POLICY.get(role) || null : null;
  if (candidate) return { class: 'CONSERVATIVE_EXACT_ROLE_CARRY_FORWARD', ready: true, relation_code: candidate, role, authority: 'historical relation-semantics audit exact-role policy (PR #107 / run 31511164659)' };
  return { class: 'UNRESOLVED_RELATION', ready: false, role, authority: null };
}

const audit = readJson(auditPath);
if (audit.marker !== 'ATLAS_AUDIT_INVENTORY_V1' || audit.mode !== 'full_stage2_baseline' || audit.read_only !== true || audit.committed !== false) throw new Error('invalid full read-only audit artifact');
const incomplete = audit.semantic_v2_breakdown?.incomplete_rows || [];
const detailById = new Map((audit.rows || []).map((r) => [String(r.activity_id).toLowerCase(), r]));

const rows = incomplete.map((row) => {
  const id = String(row.activity_id).toLowerCase();
  const detail = detailById.get(id) || {};
  const runtime = runtimeById.get(id) || null;
  const structural = structuralById.get(id) || null;
  const relation = relationResolution(detail, row, runtime, structural);
  const temporal = temporalResolution(detail, runtime);
  const executable = relation.ready && temporal.ready;
  return {
    activity_id: id,
    person: detail.person_name_en || detail.person_canonical_key || null,
    polity: detail.polity_name_en || detail.polity_canonical_key || null,
    activity_start: detail.activity_start ?? row.activity_start ?? null,
    activity_end: detail.activity_end ?? row.activity_end ?? null,
    role_source_label: detail.role_source_label || null,
    chronology_status: detail.chronology_status || null,
    missing_fields: missingFields(row),
    disposition: executable ? 'SEMANTIC_BACKFILL_READY' : 'PRECONDITION_REQUIRED',
    relation,
    temporal
  };
}).sort((a, b) => a.activity_id.localeCompare(b.activity_id));

const countBy = (fn) => Object.fromEntries([...rows.reduce((m, r) => m.set(fn(r), (m.get(fn(r)) || 0) + 1), new Map())].sort(([a],[b]) => String(a).localeCompare(String(b))));
const summary = {
  production_sha: audit.deployment_sha,
  activity_count: Number(audit.counts?.activities || audit.row_count || 0),
  semantic_v2_incomplete: rows.length,
  semantic_backfill_ready: rows.filter((r) => r.disposition === 'SEMANTIC_BACKFILL_READY').length,
  precondition_required: rows.filter((r) => r.disposition === 'PRECONDITION_REQUIRED').length,
  relation_classes: countBy((r) => r.relation.class),
  temporal_classes: countBy((r) => r.temporal.class),
  unresolved_relation_activity_ids: rows.filter((r) => r.relation.class === 'UNRESOLVED_RELATION').map((r) => r.activity_id),
  temporal_unmapped_activity_ids: rows.filter((r) => !r.temporal.ready).map((r) => r.activity_id)
};
const plan = {
  schema: 'atlas-stage2-p9-completeness-repair-plan/v1',
  status: 'READ_ONLY_PLANNER_NO_PRODUCTION_MUTATION',
  rules: {
    p7_runtime_disposition_overrides_general_relation_policy: true,
    p7_structural_disposition_precedes_relation_backfill: true,
    reviewed_explicit_relation_precedes_exact_role_carry_forward: true,
    generic_relation_default_forbidden: true,
    temporal_migration_must_preserve_legacy_years: true,
    production_mutation_authorized: false
  },
  summary,
  rows
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(plan, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
