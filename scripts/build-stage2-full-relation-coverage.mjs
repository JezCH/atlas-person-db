import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : fallback; };
const ledgerPath = path.resolve(root, arg('--ledger', 'artifacts/stage2-baseline-a-master-ledger.json'));
const p6Path = path.resolve(root, arg('--p6', 'artifacts/stage2-baseline-a-effective-p5p6-frontier.json'));
const p7Path = path.resolve(root, arg('--p7', 'artifacts/stage2-p7a-reviewed-relation-backfill.json'));
const batch4Path = path.resolve(root, 'stage2/integration/p7-explicit-person-relation-decisions-batch4.v1.json');
const multiphasePath = path.resolve(root, 'stage2/integration/p7-multiphase-person-relation-decisions.v1.json');
const outPath = path.resolve(root, arg('--out', 'artifacts/stage2-full-relation-coverage.json'));

const BASELINE_SHA = 'ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
const BASELINE_DIGEST = 'sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const VALID_RELATIONS = new Set(['rules','governs','serves','active_in','opposes','claims_rule']);
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

// Restored verbatim in substance from PR #107's reviewed 346-row exact-role audit.
// This is a baseline-specific conservative audit authority, NOT a future runtime classifier.
const ROLE_POLICY = new Map();
const assign = (relation, roles) => { for (const role of roles) { if (ROLE_POLICY.has(role)) throw new Error(`FULL_RELATION_DUPLICATE_ROLE_POLICY:${role}`); ROLE_POLICY.set(role, relation); } };
assign('rules', [
  'Emperor','King','Queen','President','Duke','Sultan','King of Kings','King and military commander','Queen and military leader','Queen regnant','Ajaw','Caliph','Emperor and military commander','Holy Roman Emperor','King and emperor','Mansa','Pharaoh','President and liberator','Sapa Inca','Archduchess of Austria and Queen of Hungary and Bohemia','Askia and emperor','Chairman and de facto leader','Chairman and paramount leader','Chanyu','Dictator, consul and general','Doge','Emperor and Khagan','First president','Founder and Ruler','Founder and ruler','Founder, ruler and emperor','Founding emperor','General Secretary and de facto leader','Great King','Head of State and Supreme Commander','Heavenly King','Hegemon-King','Huey Tlatoani','Kandake','Khagan','Khagan and emperor','Khagan and military commander','King of Goguryeo','King of Israel','King of Poland','King, conqueror and lawgiver','Lord Protector','Mai','Manikongo','Monarch','Paramount Leader','Pharaoh and military commander','Premier and President','Provisional President and revolutionary leader','Queen and pharaoh','Ruler and dynastic founder','Shah','Theocratic ruler','Tsar','Tsar and emperor'
]);
assign('governs', ['Prime Minister','Chancellor',"Chairman of the Council of People's Commissars",'Chancellor and de facto ruler','Empress Dowager and Regent','Grand Chancellor and chief minister','Minister President','Member of the Committee of Public Safety and de facto leader','Strategist, chancellor and regent','Shikken','Shogun and military commander','Shogun and retired de facto ruler','Retired shogun and de facto ruler','Military leader and Kampaku']);
assign('serves', ['General','Admiral and diplomat','General and statesman','General and governor of Jing Province','Military leader and national heroine','Military officer and naval commander','Diplomat and human rights leader','Statesman, diplomat, scientist and inventor','Colonial agent, scientist and writer']);
assign('active_in', ['Great Royal Wife','Philosopher, educator and political thinker','Queen and royal adviser','Philosopher and founder of the Academy','Religious leader and philosopher','Religious leader and preacher','Mathematician, philosopher and astronomer','Great Khatun','Artist, engineer and polymath','Mathematician and writer','Queen Consort','Queen consort and political figure','Queen consort and queen mother','Empress and political advisor','Abolitionist, humanitarian and Union scout','Suffragette and social activist']);
assign('opposes', ['Religious leader and rebel commander','Nationalist, writer and reformist','Pirate leader']);

export function buildStage2FullRelationCoverage({ writeOutput = true } = {}) {
  const ledger = readJson(ledgerPath), p6 = readJson(p6Path), p7 = readJson(p7Path), batch4 = readJson(batch4Path), multiphase = readJson(multiphasePath);
  if (ledger?.schema !== 'atlas-stage2-baseline-a-master-ledger/v2' || ledger?.baseline?.deployment_sha !== BASELINE_SHA || ledger?.baseline?.baseline_digest !== BASELINE_DIGEST) throw new Error('FULL_RELATION_LEDGER_BASELINE_DRIFT');
  if (p6?.baseline?.deployment_sha !== BASELINE_SHA || p6?.baseline?.baseline_digest !== BASELINE_DIGEST) throw new Error('FULL_RELATION_P6_BASELINE_DRIFT');
  if (p7?.baseline?.deployment_sha !== BASELINE_SHA || p7?.baseline?.baseline_digest !== BASELINE_DIGEST) throw new Error('FULL_RELATION_P7_BASELINE_DRIFT');

  const p6Ids = new Set((p6.effective_correction_activities || []).map((row) => String(row.activity_id).toLowerCase()));
  const p7ById = new Map((p7.rows || []).map((row) => [String(row.activity_id).toLowerCase(), row]));
  const specialById = new Map();
  for (const row of batch4.decisions || []) specialById.set(String(row.activity_id).toLowerCase(), { kind:'P7_DIRECT_REVIEW', relation_code:row.relation_code, relation_type_id:row.relation_type_id, authority:row.authority });
  for (const row of multiphase.cases || []) specialById.set(String(row.activity_id).toLowerCase(), { kind:'P7_MULTIPHASE_REVIEW', phases:row.phases, authority:row.authority });
  if (p6Ids.size !== 54 || p7ById.size !== 123 || specialById.size !== 4) throw new Error(`FULL_RELATION_AUTHORITY_COUNT_DRIFT:${p6Ids.size}:${p7ById.size}:${specialById.size}`);
  for (const id of p6Ids) if (p7ById.has(id) || specialById.has(id)) throw new Error(`FULL_RELATION_P6_P7_OVERLAP:${id}`);
  for (const id of p7ById.keys()) if (specialById.has(id)) throw new Error(`FULL_RELATION_P7_SPECIAL_OVERLAP:${id}`);

  const rows = [];
  for (const item of ledger.rows || []) {
    const id = String(item.activity_id).toLowerCase();
    const role = item.activity?.role ?? null;
    const hint = item.audit?.relation_hint ?? null;
    let resolution;
    if (p6Ids.has(id)) {
      resolution = { status:'COVERED_BY_P6_EXECUTION', relation_code:null, authority:'P6_54_TARGET_EXECUTION_PACKAGE', runtime_relation_ready_after_execution:true };
    } else if (p7ById.has(id)) {
      const reviewed = p7ById.get(id);
      if (!VALID_RELATIONS.has(reviewed.reviewed_relation_code)) throw new Error(`FULL_RELATION_P7_CODE_INVALID:${id}`);
      resolution = { status:'REVIEWED_P7_RELATION', relation_code:reviewed.reviewed_relation_code, relation_type_id:reviewed.relation_type_id, authority:reviewed.resolution_mode, runtime_relation_ready_after_execution:true };
    } else if (specialById.has(id)) {
      const reviewed = specialById.get(id);
      if (reviewed.relation_code && !VALID_RELATIONS.has(reviewed.relation_code)) throw new Error(`FULL_RELATION_SPECIAL_CODE_INVALID:${id}`);
      resolution = reviewed.kind === 'P7_MULTIPHASE_REVIEW'
        ? { status:'REVIEWED_P7_MULTIPHASE', relation_code:null, phases:reviewed.phases.map((p)=>({start_year:p.start_year,end_year:p.end_year,relation_code:p.relation_code,relation_type_id:p.relation_type_id})), authority:reviewed.authority, runtime_relation_ready_after_execution:true }
        : { status:'REVIEWED_P7_RELATION', relation_code:reviewed.relation_code, relation_type_id:reviewed.relation_type_id, authority:reviewed.authority, runtime_relation_ready_after_execution:true };
    } else {
      const candidate = role ? ROLE_POLICY.get(role) ?? null : null;
      if (candidate) {
        if (VALID_RELATIONS.has(hint) && hint !== candidate) throw new Error(`FULL_RELATION_UNRESOLVED_POLICY_HINT_CONFLICT:${id}:${hint}:${candidate}`);
        resolution = { status:'REVIEWED_EXACT_ROLE_POLICY_CANDIDATE', relation_code:candidate, relation_type_id:null, authority:'PR107_EXACT_ROLE_POLICY_CURRENT_BASELINE_ONLY', runtime_relation_ready_after_execution:true };
      } else {
        resolution = { status:'EXPLICIT_REVIEW_REQUIRED', relation_code:null, authority:item.audit?.primary_source ?? null, runtime_relation_ready_after_execution:false };
      }
    }
    rows.push({
      activity_id:id,
      person:item.person?.canonical ?? null,
      polity:item.polity?.canonical ?? null,
      start_year:item.activity?.start_year ?? null,
      end_year:item.activity?.end_year ?? null,
      role,
      current_relation_hint:hint,
      audit_decision:item.audit?.decision ?? null,
      dependencies:item.audit?.dependencies ?? [],
      ...resolution
    });
  }
  rows.sort((a,b)=>a.activity_id.localeCompare(b.activity_id));
  const counts = Object.fromEntries([...new Set(rows.map((row)=>row.status))].sort().map((status)=>[status,rows.filter((row)=>row.status===status).length]));
  const review = rows.filter((row)=>row.status==='EXPLICIT_REVIEW_REQUIRED');
  const result = {
    schema:'atlas-stage2-full-relation-coverage/v1',
    as_of:'2026-08-14',
    status:'BRANCH_ONLY_FULL_BASELINE_RELATION_COVERAGE_AUDIT',
    baseline:{deployment_sha:BASELINE_SHA,baseline_digest:BASELINE_DIGEST,activities:338},
    policy_authority:{source_pr:107,source_script:'scripts/build-relation-semantics-audit.mjs',policy_scope:'REVIEWED_BASELINE_EXACT_ROLE_POLICY_NOT_FUTURE_RUNTIME_CLASSIFIER'},
    counts,
    summary:{baseline_activities:rows.length,p6_delegated:p6Ids.size,p7_reviewed:p7ById.size+specialById.size,exact_role_policy_candidates:rows.filter((row)=>row.status==='REVIEWED_EXACT_ROLE_POLICY_CANDIDATE').length,explicit_review_required:review.length,classified_total:rows.length,production_mutation_authorized:false},
    explicit_review_required:review,
    rows,
    rules:{generic_relation_default_forbidden:true,role_substring_inference_forbidden:true,p6_and_p7_reviewed_authority_precedes_exact_role_policy:true,unresolved_rows_must_not_be_runtime_ready:true,production_mutation_authorized:false}
  };
  if (result.summary.baseline_activities !== 338 || result.summary.p6_delegated !== 54 || result.summary.p7_reviewed !== 127 || result.summary.exact_role_policy_candidates !== 134 || result.summary.explicit_review_required !== 23) throw new Error(`FULL_RELATION_COVERAGE_DRIFT:${JSON.stringify(result.summary)}`);
  if (writeOutput) { fs.mkdirSync(path.dirname(outPath),{recursive:true}); fs.writeFileSync(outPath,`${JSON.stringify(result,null,2)}\n`); }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result=buildStage2FullRelationCoverage();
  console.log(JSON.stringify({marker:'ATLAS_STAGE2_FULL_RELATION_COVERAGE_BUILT',...result.summary,production_mutation_authorized:false},null,2));
}
