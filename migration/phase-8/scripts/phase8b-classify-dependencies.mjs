#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const [repositoryInput, databaseInput, outputDir = 'migration/phase-8/tmp/phase8b'] = process.argv.slice(2);
if (!repositoryInput || !databaseInput) {
  console.error('usage: node phase8b-classify-dependencies.mjs <repository-inventory.json> <database-inventory.json> [output-dir]');
  process.exit(64);
}

const repository = JSON.parse(fs.readFileSync(repositoryInput, 'utf8'));
const database = JSON.parse(fs.readFileSync(databaseInput, 'utf8'));
const findings = Array.isArray(repository.findings) ? repository.findings : [];
const dependencies = Array.isArray(database.dependencies) ? database.dependencies : [];
const privileges = Array.isArray(database.application_privileges) ? database.application_privileges : [];
const policies = Array.isArray(database.policies) ? database.policies : [];
const functions = Array.isArray(database.functions) ? database.functions : [];
const triggers = Array.isArray(database.triggers) ? database.triggers : [];

function runtimeScope(file, category) {
  const lower = String(file || '').toLowerCase();
  if (category === 'documentation') return 'documentation-only';
  if (category === 'workflow') return 'ci';
  if (category === 'migration') return 'migration-only';
  if (category === 'admin' || lower.includes('admin')) return 'admin';
  if (category === 'api' || lower.startsWith('api/') || lower.includes('/api/')) return 'production';
  if (lower.includes('test') || lower.includes('__tests__')) return 'test';
  if (/^(script\.js|app\.js|index\.js|reader\.js|data-source\.js)$/.test(path.basename(lower))) return 'production';
  return 'unknown';
}

function targetContract(token) {
  const value = String(token || '');
  if (value.includes('atlas_person_politics_compat_v1')) return 'compatibility';
  if (value.includes('atlas_v2')) return 'atlas_v2';
  if (value.includes('person_politics')) return 'legacy';
  if (/DATA_SOURCE|v2-shadow|fallback|rollback/.test(value)) return 'control-plane';
  return 'unknown';
}

function retirementBlocker(scope, mode, contract) {
  return ['production', 'admin'].includes(scope) && ['read', 'write', 'control', 'unknown'].includes(mode) && contract !== 'none';
}

const repositoryClassifications = findings.map((finding, index) => {
  const scope = runtimeScope(finding.path, finding.category);
  const contract = targetContract(finding.token);
  const blocker = retirementBlocker(scope, finding.access_mode, contract);
  return {
    dependency_id: `repo-${String(index + 1).padStart(4, '0')}`,
    source_type: 'repository',
    path_or_object: `${finding.path}:${finding.line}`,
    matched_token: finding.token,
    access_mode: finding.access_mode,
    runtime_scope: scope,
    target_contract: contract,
    retirement_blocker: blocker,
    reason: blocker ? 'runtime path references an active contract' : 'non-runtime or non-blocking reference',
    recommended_action: blocker ? 'investigate' : scope === 'documentation-only' ? 'document' : 'retain',
    verification_method: blocker ? 'manual code-path review and protected evidence' : 'repository classification'
  };
});

const databaseClassifications = dependencies.map((dependency, index) => {
  const contract = dependency.referenced_schema === 'atlas_v2'
    ? 'atlas_v2'
    : dependency.referenced_object === 'atlas_person_politics_compat_v1'
      ? 'compatibility'
      : dependency.referenced_object === 'person_politics'
        ? 'legacy'
        : 'unknown';
  return {
    dependency_id: `db-${String(index + 1).padStart(4, '0')}`,
    source_type: 'database',
    path_or_object: `${dependency.dependent_schema}.${dependency.dependent_object}`,
    access_mode: 'read',
    runtime_scope: 'database',
    target_contract: contract,
    retirement_blocker: true,
    reason: `database object depends on ${dependency.referenced_schema}.${dependency.referenced_object}`,
    recommended_action: 'retain',
    verification_method: 'live pg_depend inventory'
  };
});

const writerCandidates = repositoryClassifications.filter((item) =>
  item.target_contract === 'legacy' && ['write', 'unknown'].includes(item.access_mode) && ['production', 'admin', 'unknown'].includes(item.runtime_scope)
);

const security = {
  privileges,
  policies,
  functions,
  triggers,
  legacy_write_privileges: privileges.filter((item) =>
    item.schema === 'public' && item.table === 'person_politics' && ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'].includes(item.privilege)
  )
};

const classifications = [...repositoryClassifications, ...databaseClassifications];
const unresolved = classifications.filter((item) =>
  item.runtime_scope === 'unknown' || item.access_mode === 'unknown' || item.target_contract === 'unknown' || item.recommended_action === 'investigate'
);

const report = {
  marker: 'PHASE_8B_DEPENDENCY_CLASSIFICATION',
  generated_from: {
    repository_input: repositoryInput,
    database_input: databaseInput
  },
  counts: {
    repository_findings: findings.length,
    database_dependencies: dependencies.length,
    classifications: classifications.length,
    retirement_blockers: classifications.filter((item) => item.retirement_blocker).length,
    writer_candidates: writerCandidates.length,
    unresolved: unresolved.length,
    privileges: privileges.length,
    policies: policies.length,
    functions: functions.length,
    triggers: triggers.length
  },
  classifications,
  writer_candidates: writerCandidates,
  security,
  unresolved,
  destructive_actions: 0,
  pass: findings.length > 0 && dependencies.length > 0
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'phase8b-classification.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(outputDir, 'phase8b-writer-candidates.json'), JSON.stringify(writerCandidates, null, 2) + '\n');
fs.writeFileSync(path.join(outputDir, 'phase8b-security-inventory.json'), JSON.stringify(security, null, 2) + '\n');
console.log(JSON.stringify(report.counts, null, 2));
if (!report.pass) process.exit(2);
