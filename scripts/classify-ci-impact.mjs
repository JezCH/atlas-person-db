import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

// This classifier describes durable dependency surfaces, not project phases,
// issue numbers, PRs, migrations-in-progress, or one-off historical checkpoints.
// Unknown paths fail closed to the full integrity lane.

const GOVERNANCE_PREFIXES = Object.freeze([
  'docs/',
  'requirements/'
]);

const REGISTRATION_EXACT = new Set([
  'non-timeline-persons.json'
]);

const UI_EXACT = new Set([
  'app.js',
  'admin.js',
  'asset-loader.js',
  'mobile-ui.js',
  'detail-panel-collapse.js',
  'table-sort-controls.js',
  'compact-era-format.js',
  'era-format.js',
  'status-summary.js',
  'atlas-domain-surface-owner.js',
  'atlas-main-authority-nav.js',
  'atlas-person-browser-reader.js',
  'atlas-person-domain-ui.js',
  'atlas-person-era-model.js',
  'atlas-person-era-navigation.js',
  'atlas-person-external-references.js',
  'atlas-person-header-sorting.js',
  'atlas-person-main.js',
  'atlas-person-profile-editor.js',
  'atlas-person-table-view.js',
  'atlas-responsive-shell.js'
]);

function normalizePath(value) {
  return String(value || '').trim().replaceAll('\\', '/').replace(/^\.\//, '');
}

function normalizePaths(paths) {
  return [...new Set((Array.isArray(paths) ? paths : []).map(normalizePath).filter(Boolean))];
}

export function classifyPath(value) {
  const file = normalizePath(value);
  if (!file) return 'full';

  if (
    REGISTRATION_EXACT.has(file) ||
    (/^authoring\/requests\/[A-Za-z0-9._-]+\.json$/).test(file)
  ) {
    return 'registration';
  }

  if (
    file.endsWith('.md') ||
    GOVERNANCE_PREFIXES.some((prefix) => file.startsWith(prefix))
  ) {
    return 'governance';
  }

  if (
    file.endsWith('.css') ||
    file.endsWith('.html') ||
    file.startsWith('public/') ||
    UI_EXACT.has(file) ||
    /^atlas-admin-.*\.js$/.test(file) ||
    /^atlas-ui-.*\.js$/.test(file) ||
    /^atlas-person-spacetime-.*\.js$/.test(file)
  ) {
    return 'ui';
  }

  return 'full';
}

export function classifyImpacts(paths) {
  const normalized = normalizePaths(paths);
  if (normalized.length === 0) {
    return Object.freeze({ registration: false, governance: false, ui: false, full: true });
  }

  const kinds = new Set(normalized.map(classifyPath));
  const full = kinds.has('full');

  // Full integrity already contains the generic governance/UI coverage. Keep the
  // registration validator independent because it validates changed manifests,
  // which is a data-specific obligation rather than a generic code test.
  return Object.freeze({
    registration: kinds.has('registration'),
    governance: !full && kinds.has('governance'),
    ui: !full && kinds.has('ui'),
    full
  });
}

export function formatGithubOutputs(impact) {
  const lanes = ['registration', 'governance', 'ui', 'full'];
  return lanes.map((lane) => `${lane}=${impact[lane] ? 'true' : 'false'}`).join('\n');
}

function main() {
  const paths = fs.readFileSync(0, 'utf8').split(/\r?\n/).filter(Boolean);
  const impact = classifyImpacts(paths);
  process.stdout.write(`${formatGithubOutputs(impact)}\n`);
  const selected = Object.entries(impact).filter(([, enabled]) => enabled).map(([lane]) => lane);
  console.error(`[atlas-ci-impact] ${paths.length} changed path(s) -> ${selected.join('+')}`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath && import.meta.url === invokedPath) main();
