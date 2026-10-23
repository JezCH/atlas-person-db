import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const MAX_QUERY = 120;
const SOURCE_SCOPES = ['scripts', 'server', 'api', 'tests', 'db', 'config', 'atlas-*.js'];
const CODE_EXT = /\.(?:m?js|cjs|ts|tsx|sql)$/i;
const SKILL_TAGS = {
  'atlas-code-intelligence': /./,
  'atlas-polity-identity': /polity|political|retire|tombstone|identity|uuid|정치체|퇴역|동일성/i,
  'atlas-experience-reuse': /fix|regress|bug|error|failure|defect|test|root|year|수정|오류|재발/i,
};
function readText(file, maxBytes = 196608) {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > maxBytes) return null;
    return fs.readFileSync(file, 'utf8');
  } catch { return null; }
}
function git(root, args) {
  const result = spawnSync('git', ['-C', root, ...args], {
    encoding: 'utf8', maxBuffer: 1024 * 1024, timeout: 12000,
  });
  if (result.error || (result.status !== 0 && result.status !== 1)) {
    throw new Error('ATLAS_CONTEXT_GIT_FAILED: ' + (result.error?.message || result.stderr.trim()));
  }
  return result.stdout.trim();
}
function validRepositoryPath(root, name) {
  if (!name || path.isAbsolute(name) || name.split('/').includes('..')) return false;
  const full = path.resolve(root, name);
  if (!full.startsWith(path.resolve(root) + path.sep)) return false;
  try { return fs.realpathSync(full) === full && fs.statSync(full).isFile(); }
  catch { return false; }
}
function declarations(text) {
  const out = [];
  const lines = text.split('\n');
  const decl = /^\s*(?:(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([\w$]+)|(?:export\s+)?class\s+([\w$]+)|(?:export\s+)?(?:const|let)\s+([\w$]+)\s*=)/;
  lines.forEach((line, index) => {
    const hit = decl.exec(line);
    if (hit && out.length < 28) out.push({ name: hit[1] || hit[2] || hit[3], line: index + 1 });
  });
  return out;
}
function imports(text) {
  const result = new Set();
  const regex = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)['"](\.{1,2}\/[^'"\s)]+)['"]/g;
  for (const match of text.matchAll(regex)) {
    result.add(match[1]);
    if (result.size >= 18) break;
  }
  return [...result];
}
function excerpts(text, query) {
  const lines = text.split('\n');
  const needle = query.toLocaleLowerCase('en');
  const hits = [];
  for (let i = 0; i < lines.length && hits.length < 3; i++) {
    if (lines[i].toLocaleLowerCase('en').includes(needle)) {
      hits.push({ line: i + 1, text: lines[i].trim().slice(0, 200) });
    }
  }
  return hits;
}
function getLessons(root, query) {
  const data = readText(path.join(root, 'agent-memory/lessons.v1.json'), 65536);
  if (!data) return [];
  const parsed = JSON.parse(data);
  if (parsed.version !== 1 || !Array.isArray(parsed.lessons)) throw new Error('ATLAS_CONTEXT_MEMORY_SCHEMA');
  const terms = query.toLowerCase().split(/[^\p{L}\p{N}_-]+/u).filter(x => x.length >= 3);
  return parsed.lessons.filter(x => x.status === 'verified' &&
    Array.isArray(x.keywords) && x.keywords.some(k => terms.some(t => k.toLowerCase().includes(t) || t.includes(k.toLowerCase()))))
    .slice(0, 3).map(({id, lesson, evidence, scope}) => ({id, lesson, evidence, scope}));
}
export function buildContext({ root = process.cwd(), query, limit = 8 } = {}) {
  if (typeof query !== 'string' || !query.trim() || query.length > MAX_QUERY || /[\u0000-\u001f]/.test(query)) {
    throw new Error('ATLAS_CONTEXT_QUERY_REQUIRED_OR_INVALID');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 12) throw new Error('ATLAS_CONTEXT_LIMIT');
  const base = fs.realpathSync(root);
  git(base, ['rev-parse', '--show-toplevel']);
  const head = git(base, ['rev-parse', 'HEAD']);
  const names = git(base, ['grep', '-l', '-i', '-F', '-e', query, '--', ...SOURCE_SCOPES]);
  const candidates = names ? names.split('\n').filter(n => CODE_EXT.test(n) && validRepositoryPath(base, n)) : [];
  candidates.sort((a, b) => {
    const rank = n => n.startsWith('scripts/') || n.startsWith('server/') || n.startsWith('api/') ? 0 : n.startsWith('tests/') ? 1 : 2;
    return rank(a) - rank(b) || a.localeCompare(b);
  });
  const files = candidates.slice(0, limit).flatMap(name => {
    const text = readText(path.join(base, name));
    if (text === null) return [];
    return [{path: name, matches: excerpts(text, query), symbols: declarations(text), relative_imports: imports(text)}];
  });
  const skills = Object.entries(SKILL_TAGS).filter(([name, expression]) =>
    expression.test(query) && fs.existsSync(path.join(base, 'skills', name, 'SKILL.md')))
    .map(([name]) => 'skills/' + name + '/SKILL.md');
  return { version: 1, query, head_sha: head, matching_files: candidates.length,
    truncated: candidates.length > files.length, files, skills, lessons: getLessons(base, query),
    note: 'Read-only lexical search and approximate declarations/imports; not a full AST or semantic dependency proof. Read cited source before editing.' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const argv = process.argv.slice(2);
    if (argv.length !== 2 || argv[0] !== '--query') throw Error('usage: node scripts/atlas-agent-context.mjs --query "exact symbol or phrase"');
    console.log(JSON.stringify(buildContext({query: argv[1]}), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
