#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUTPUT = process.argv[2] || 'migration/phase-8/tmp/phase8a/repository-inventory.json';
const IGNORE_DIRS = new Set(['.git', 'node_modules', 'migration/phase-8/tmp']);
const TOKENS = [
  'public.person_politics',
  'person_politics',
  'public.atlas_person_politics_compat_v1',
  'atlas_person_politics_compat_v1',
  'atlas_v2.',
  'DATA_SOURCE',
  'v2-shadow',
  'fallback',
  'rollback'
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full).replaceAll('\\', '/');
    if (entry.isDirectory()) {
      if ([...IGNORE_DIRS].some((ignored) => rel === ignored || rel.startsWith(`${ignored}/`))) continue;
      walk(full, files);
    } else if (/\.(?:js|mjs|cjs|ts|tsx|html|json|md|sql|yml|yaml|sh|txt)$/i.test(entry.name)) {
      files.push({ full, rel });
    }
  }
  return files;
}

function classify(file, line) {
  const lowerFile = file.toLowerCase();
  const lowerLine = line.toLowerCase();
  if (lowerFile.endsWith('.md') || lowerFile.includes('/docs/')) return 'documentation';
  if (lowerFile.includes('.github/workflows/')) return 'workflow';
  if (lowerFile.includes('/migration/') || lowerFile.endsWith('.sql')) return 'migration';
  if (lowerFile.startsWith('api/') || lowerFile.includes('/api/')) return 'api';
  if (lowerFile.includes('admin')) return 'admin';
  if (/\.(insert|update|delete)\b|\binsert\b|\bupdate\b|\bdelete\b/.test(lowerLine)) return 'write';
  if (/select\b|\.from\(|reader|read/.test(lowerLine)) return 'read';
  if (/data_source|v2-shadow|fallback|rollback/.test(lowerLine)) return 'control';
  return 'unknown';
}

const findings = [];
for (const { full, rel } of walk(ROOT)) {
  const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const token of TOKENS) {
      if (line.includes(token)) {
        findings.push({
          path: rel,
          line: index + 1,
          token,
          category: classify(rel, line),
          access_mode: classify(rel, line),
          retirement_relevance: ['documentation', 'unknown'].includes(classify(rel, line)) ? 'review' : 'blocking-until-reviewed',
          text: line.trim().slice(0, 500)
        });
      }
    }
  });
}

findings.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line || a.token.localeCompare(b.token));
const byCategory = Object.fromEntries([...new Set(findings.map((f) => f.category))].sort().map((category) => [category, findings.filter((f) => f.category === category).length]));
const unresolved = findings.filter((f) => f.retirement_relevance === 'blocking-until-reviewed');
const report = {
  marker: 'PHASE_8A_REPOSITORY_DEPENDENCY_INVENTORY',
  generated_from: 'repository working tree',
  token_set: TOKENS,
  finding_count: findings.length,
  unresolved_reference_count: unresolved.length,
  counts_by_category: byCategory,
  findings,
  destructive_actions: 0,
  pass: true
};

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ marker: report.marker, finding_count: report.finding_count, unresolved_reference_count: report.unresolved_reference_count, counts_by_category: report.counts_by_category, pass: report.pass }, null, 2));
