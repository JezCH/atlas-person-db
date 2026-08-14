import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const out = process.argv[3] ? path.resolve(process.argv[3]) : null;

const normalizePath = (value) => value.replaceAll('\\', '/').replace(/^\.\//, '');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const text = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function walk(dir = root, prefix = '') {
  const rows = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.vercel'].includes(entry.name)) continue;
    const rel = normalizePath(path.join(prefix, entry.name));
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) rows.push(...walk(abs, rel));
    else rows.push(rel);
  }
  return rows;
}

const allFiles = walk();
const jsFiles = new Set(allFiles.filter((p) => /\.(?:js|mjs|cjs)$/.test(p)));
const apiRoutes = [...jsFiles].filter((p) => /^api\/[^/]+\.js$/.test(p)).sort();
const intendedApiRoutes = [
  'api/atlas-audit-inventory.js',
  'api/atlas-authoring-apply.js',
  'api/atlas-authoring.js',
  'api/atlas-correction-apply.js',
  'api/atlas-duplicate-review.js',
  'api/atlas-identity.js',
  'api/atlas-mutate.js',
  'api/atlas-read.js',
  'api/atlas-session.js',
  'api/atlas-stage2-schema-release.js',
  'api/atlas-stage2-train2-release.js'
].filter(exists);
const unexpectedApiRoutes = apiRoutes.filter((p) => !intendedApiRoutes.includes(p));

function resolveLocal(from, spec) {
  if (!spec.startsWith('.')) return null;
  let rel = normalizePath(path.join(path.dirname(from), spec));
  const candidates = [rel, `${rel}.js`, `${rel}.mjs`, `${rel}.cjs`, path.join(rel, 'index.js')].map(normalizePath);
  return candidates.find((candidate) => jsFiles.has(candidate)) || null;
}

function localDependencies(rel) {
  if (!jsFiles.has(rel)) return [];
  const source = text(rel);
  const specs = new Set();
  for (const regex of [
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
    /from\s+['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  ]) {
    let match;
    while ((match = regex.exec(source))) specs.add(match[1]);
  }
  return [...specs].map((spec) => resolveLocal(rel, spec)).filter(Boolean);
}

function closure(entries) {
  const seen = new Set();
  const stack = [...entries];
  while (stack.length) {
    const rel = stack.pop();
    if (!rel || seen.has(rel) || !exists(rel)) continue;
    seen.add(rel);
    if (jsFiles.has(rel)) stack.push(...localDependencies(rel));
  }
  return [...seen].sort();
}

function htmlLocalScripts(rel) {
  if (!exists(rel)) return [];
  const source = text(rel);
  const results = new Set();
  for (const regex of [
    /<script[^>]+src=['"]\.\/([^?'"#]+\.js)/gi,
    /['"]\.\/([^?'"#]+\.js)['"]/g
  ]) {
    let match;
    while ((match = regex.exec(source))) {
      const candidate = normalizePath(match[1]);
      if (exists(candidate)) results.add(candidate);
    }
  }
  return [...results];
}

const browserEntrypoints = [...new Set([...htmlLocalScripts('index.html'), ...htmlLocalScripts('admin.html')])].sort();
const browserReachable = closure(browserEntrypoints);
const intendedServerReachable = closure(intendedApiRoutes);
const allPublicApiReachable = closure(apiRoutes);
const runtimeReachable = [...new Set([...browserReachable, ...allPublicApiReachable])].sort();

const forbidden = [
  ['legacy_public_table', /public\.person_politics\b/],
  ['legacy_rest_table', /rest\/v1\/person_politics\b/],
  ['legacy_browser_table_query', /\.from\(\s*['"]person_politics['"]\s*\)/],
  ['browser_supabase_client', /window\.supabase|SUPABASE_ANON_KEY|\bSUPABASE_URL\b/],
  ['compatibility_view', /atlas_person_politics_compat_v1/],
  ['legacy_fallback', /fallbackToLegacy|fallback to legacy/i],
  ['dual_write_mode', /server-dual-write|createDualWriteTransactionFactory|atlas-postgres-dualwrite-transaction/],
  ['legacy_browser_writer', /ATLAS_WRITE_ADAPTER|ATLAS_WRITE_MODE|ATLAS_V2_SHADOW_COMPILER/],
  ['legacy_reconciliation_runtime', /ATLAS_LEGACY_RECONCILIATION_EXECUTOR|createLegacyReconciliationExecutor/]
];

function scan(paths) {
  const hits = [];
  for (const rel of paths) {
    if (!/\.(?:js|mjs|cjs|html)$/.test(rel) || !exists(rel)) continue;
    const source = text(rel);
    for (const [code, pattern] of forbidden) if (pattern.test(source)) hits.push({ file: rel, code });
  }
  return hits.sort((a, b) => a.file.localeCompare(b.file) || a.code.localeCompare(b.code));
}

const intendedRuntimeHits = scan([...new Set([...browserReachable, ...intendedServerReachable])]);
const publicRuntimeHits = scan(runtimeReachable);
const transitionalCandidates = [
  'api/run-ingest-3-7f4c9a.js','ingest.js','ingest-supplement.js','trigger-ingest-supplement-3.js',
  'atlas-dual-write-coordinator.js','atlas-legacy-reconciliation-executor.js','atlas-production-source.js','atlas-source-control.js',
  'atlas-reconciliation-bootstrap.js','atlas-reconciliation-controller.js','atlas-reconciliation-integration.js','atlas-reconciliation-planner.js',
  'atlas-v2-isolated-executor.js','atlas-v2-postgres-transaction-adapter.js','atlas-v2-shadow-compiler.js','atlas-v2-writer-contract.js',
  'atlas-write-adapter.js','atlas-write-mode.js','server/atlas-postgres-dualwrite-transaction.js','server/atlas-mutation-service.js'
].filter(exists);
const candidateReachability = transitionalCandidates.map((file) => ({
  file,
  browser_reachable: browserReachable.includes(file),
  intended_server_reachable: intendedServerReachable.includes(file),
  public_api_reachable: allPublicApiReachable.includes(file),
  direct_api_route: apiRoutes.includes(file)
}));
const report = {
  marker: 'PHASE8C_C7_RUNTIME_DEPENDENCY_INVENTORY',
  baseline_sha: process.env.C7_BASELINE_SHA || null,
  api_routes: apiRoutes,
  intended_api_routes: intendedApiRoutes,
  unexpected_api_routes: unexpectedApiRoutes,
  browser_entrypoints: browserEntrypoints,
  browser_reachable_count: browserReachable.length,
  intended_server_reachable_count: intendedServerReachable.length,
  public_api_reachable_count: allPublicApiReachable.length,
  intended_runtime_forbidden_hits: intendedRuntimeHits,
  public_runtime_forbidden_hits: publicRuntimeHits,
  transitional_candidates: candidateReachability,
  status: unexpectedApiRoutes.length === 0 && publicRuntimeHits.length === 0 ? 'ZERO_REACHABLE_LEGACY_RUNTIME' : 'RETIREMENT_REQUIRED'
};
if (out) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify(report, null, 2));
if (intendedRuntimeHits.length) {
  console.error('C7 invariant failed: intended production graph still contains legacy dependencies');
  process.exit(2);
}
