import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';

const snapshot = fs.readFileSync(new URL('../atlas-polity-review-candidates.js', import.meta.url), 'utf8');
const registrySource = fs.readFileSync(new URL('../atlas-polity-review-registry.js', import.meta.url), 'utf8');
const browser = fs.readFileSync(new URL('../atlas-polity-review-workbench.js', import.meta.url), 'utf8');
const review = fs.readFileSync(new URL('../atlas-polity-review-panel.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../atlas-polity-review-workbench.css', import.meta.url), 'utf8');
const reader = fs.readFileSync(new URL('../atlas-polity-browser-reader.js', import.meta.url), 'utf8');
const nav = fs.readFileSync(new URL('../atlas-main-authority-nav.js', import.meta.url), 'utf8');
const dossier = fs.readFileSync(new URL('../atlas-polity-dossier-view.js', import.meta.url), 'utf8');
const stage2 = JSON.parse(fs.readFileSync(new URL('../stage2/contracts/polity-identity-continuity-current.v1.json', import.meta.url), 'utf8'));

const registryContext = { window:{} };
vm.runInNewContext(registrySource, registryContext);
const registry = registryContext.window.ATLAS_POLITY_REVIEW_REGISTRY;

test('Polities main surface keeps canonical listing first and mounts current review registry below it', () => {
  assert.match(nav, /atlasPolityMount/);
  assert.match(nav, /atlasPolityReviewMount/);
  assert.match(nav, /ATLAS_POLITY_BROWSER_VIEW/);
  assert.match(nav, /ATLAS_POLITY_REVIEW_PANEL/);
  assert.match(nav, /atlas-polity-review-registry\.js/);
  assert.doesNotMatch(nav, /loadScriptOnce\("\.\/atlas-polity-review-candidates\.js/);
  assert.match(nav, /views\?\.browser\?\.mount/);
  assert.match(nav, /views\?\.review\?\.mount/);
});

test('canonical Polity listing stays live while expanded rows render a first-class dossier', () => {
  assert.match(browser, /ATLAS_POLITY_BROWSER_READER/);
  assert.match(browser, /ATLAS_POLITY_DOSSIER_VIEW/);
  assert.match(browser, /READER\.listPolities\(\)/);
  assert.match(browser, /payload\.polities/);
  assert.match(browser, /CANONICAL POLITY BROWSER/);
  assert.match(browser, /PAGE_SIZE = 12/);
  assert.match(browser, /data-polity-load-more/);
  assert.match(browser, /dossierRenderer\.dossierHtml\(polity\)/);
  assert.match(dossier, /정치체 식별 정보/);
  assert.match(dossier, /Activity에서 관측된 시대 명칭/);
  assert.match(reader, /\/api\/atlas-polity-read/);
  assert.match(reader, /cache: "no-store"/);
});

test('current registry restores every required carry-forward audit family without making it an execution queue', () => {
  assert.equal(registry.schema, 'atlas-polity-review-registry/v3');
  assert.equal(registry.generated_at, '2026-10-07');
  assert.equal(registry.authority.issue, 1895);
  assert.equal(registry.execution_frontier.length, 0);
  assert.deepEqual(Array.from(registry.execution_frontier, row => row.id), []);
  const ireland = registry.resolved_history.find(row => row.id === 'ireland-family-correction');
  assert.equal(ireland?.terminal_status, 'FIXED');
  assert.equal(ireland?.locked, true);
  const italy = registry.resolved_history.find(row => row.id === 'kingdom-of-italy-three-way-split');
  assert.equal(italy?.terminal_status, 'FIXED');
  assert.equal(italy?.locked, true);
  const southAfrica = registry.resolved_history.find(row => row.id === 'south-africa-union-state');
  assert.equal(southAfrica?.terminal_status, 'FIXED');
  assert.equal(southAfrica?.locked, true);
  const siamThailand = registry.resolved_history.find(row => row.id === 'siam-thailand');
  assert.equal(siamThailand?.terminal_status, 'FIXED');
  assert.equal(siamThailand?.locked, true);
  const southKasai = registry.resolved_history.find(row => row.id === 'south-kasai-state-form');
  assert.equal(southKasai?.terminal_status, 'FIXED');
  assert.equal(southKasai?.locked, true);
  const bosnia = registry.resolved_history.find(row => row.id === 'bosnia-banate-kingdom');
  assert.equal(bosnia?.terminal_status, 'FIXED');
  assert.equal(bosnia?.locked, true);
  const northumbria = registry.resolved_history.find(row => row.id === 'northumbria-generic-kingdom');
  assert.equal(northumbria?.terminal_status, 'FIXED');
  assert.equal(northumbria?.locked, true);
  const savoy = registry.resolved_history.find(row => row.id === 'savoy-county-duchy');
  assert.equal(savoy?.terminal_status, 'FIXED');
  assert.equal(savoy?.locked, true);
  const bavaria = registry.resolved_history.find(row => row.id === 'bavaria-duchy-electorate');
  assert.equal(bavaria?.terminal_status, 'FIXED');
  assert.equal(bavaria?.locked, true);
  const hanover = registry.resolved_history.find(row => row.id === 'hanover-electorate-kingdom');
  assert.equal(hanover?.terminal_status, 'FIXED');
  assert.equal(hanover?.locked, true);
  const saxony = registry.resolved_history.find(row => row.id === 'saxony-electorate-kingdom');
  assert.equal(saxony?.terminal_status, 'FIXED');
  assert.equal(saxony?.locked, true);
  const lithuania = registry.resolved_history.find(row => row.id === 'lithuania-grand-duchy-kingdom');
  assert.equal(lithuania?.terminal_status, 'FIXED');
  assert.equal(lithuania?.locked, true);
  const portugal = registry.resolved_history.find(row => row.id === 'portugal-county-kingdom');
  assert.equal(portugal?.terminal_status, 'FIXED');
  assert.equal(portugal?.locked, true);
  const apulia = registry.resolved_history.find(row => row.id === 'apulia-county-duchy');
  assert.equal(apulia?.terminal_status, 'FIXED');
  assert.equal(apulia?.locked, true);
  const croatia = registry.resolved_history.find(row => row.id === 'croatia-principality-kingdom');
  assert.equal(croatia?.terminal_status, 'FIXED');
  assert.equal(croatia?.locked, true);
  const albania = registry.resolved_history.find(row => row.id === 'albania-republic-kingdom');
  assert.equal(albania?.terminal_status, 'FIXED');
  assert.equal(albania?.locked, true);
  const iran = registry.resolved_history.find(row => row.id === 'iran-imperial-state');
  assert.equal(iran?.terminal_status, 'FIXED');
  assert.equal(iran?.locked, true);
  const upperVolta = registry.resolved_history.find(row => row.id === 'upper-volta-burkina-faso');
  assert.equal(upperVolta?.terminal_status, 'FIXED');
  assert.equal(upperVolta?.locked, true);
  const congo = registry.resolved_history.find(row => row.id === 'congo-drc-zaire-family');
  assert.equal(congo?.terminal_status, 'FIXED');
  assert.equal(congo?.locked, true);
  assert.equal(registry.carry_forward_same_identity.length, 12);
  assert.equal(registry.historical_family_reviews.length, 16);
  assert.equal(registry.designation_residuals.length, 2);
  assert.equal(registry.naming_residuals.length, 2);
  assert.equal(registry.rupture_probes.length, 16);
  assert.deepEqual(Array.from(registry.terminal_statuses), [
    'FIXED','KEEP_SEPARATE','SUPERSEDED','NOT_PRESENT','HOLD_UNRESOLVED'
  ]);
});

test('rupture registry locks Yuan / Northern Yuan as KEEP_SEPARATE while leaving other probes reviewable', () => {
  const yuan = registry.rupture_probes.find(row => row.id === 'yuan-northern-yuan-rupture');
  assert.ok(yuan);
  assert.equal(yuan.terminal_status, 'KEEP_SEPARATE');
  assert.equal(yuan.reviewed_decision, 'keep_both');
  assert.equal(yuan.locked, true);
  assert.ok(registry.rupture_probes.some(row => !row.terminal_status));
});

test('fresh Production closes the no-write seed subset without resolving still-open historical judgments', () => {
  const byId = new Map([
    ...registry.carry_forward_same_identity,
    ...registry.historical_family_reviews,
    ...registry.rupture_probes
  ].map(row => [row.id, row]));

  assert.equal(byId.get('irish-free-state-ireland').terminal_status, 'SUPERSEDED');
  assert.equal(byId.get('sicily-county-kingdom').terminal_status, 'KEEP_SEPARATE');
  assert.equal(byId.get('sicily-county-kingdom').reviewed_decision, 'keep_both');
  assert.equal(byId.get('sicily-county-kingdom').locked, true);
  assert.equal(byId.get('joseon-korean-empire').terminal_status, 'KEEP_SEPARATE');
  assert.equal(byId.get('russian-sfsr-federation').terminal_status, 'KEEP_SEPARATE');
  assert.equal(byId.get('nicaea-byzantine').terminal_status, 'SUPERSEDED');

  for (const id of [
    'western-eastern-zhou',
    'western-eastern-jin',
    'ming-southern-ming',
    'champa-panduranga',
    'inca-neo-inca',
    'pakistan-1971-rupture',
    'yugoslavia-sfr-fr'
  ]) {
    assert.equal(byId.get(id).terminal_status, 'NOT_PRESENT', id);
    assert.equal(byId.get(id).locked, true, id);
  }

  const unresolved = [
    ...registry.execution_frontier,
    ...registry.carry_forward_same_identity,
    ...registry.historical_family_reviews,
    ...registry.designation_residuals,
    ...registry.naming_residuals,
    ...registry.rupture_probes
  ].filter(row => !row.terminal_status);
  assert.equal(unresolved.length, 35);
  assert.equal(byId.get('northern-southern-song').terminal_status, null);
  assert.equal(byId.get('roman-west-east').terminal_status, null);
  assert.equal(byId.get('byzantine-nicaea-rupture').terminal_status, null);
  assert.equal(byId.get('roc-mainland-taiwan').terminal_status, null);
});

test('old 2026-09-27 candidates and Stage 2 current-named contract are explicitly demoted', () => {
  assert.match(snapshot, /HISTORICAL_SNAPSHOT_ONLY/);
  assert.match(snapshot, /canonical_current: false/);
  assert.match(snapshot, /superseded_by: "atlas-polity-review-registry\.js"/);
  assert.equal(stage2.status, 'HISTORICAL_SUPERSEDED');
  assert.equal(stage2.canonical_current, false);
  const yuan = stage2.families.find(row => row.id === 'yuan_northern_yuan_1368');
  assert.equal(yuan.decision_status, 'SUPERSEDED');
  assert.equal(yuan.superseded_decision.terminal_status, 'KEEP_SEPARATE');
});

test('Polity review UI exposes current audit groups separately from execution priority and history', () => {
  assert.match(review, /ATLAS_POLITY_REVIEW_REGISTRY/);
  assert.match(review, /function executionCases\(\)/);
  assert.match(review, /function currentAuditCases\(\)/);
  assert.match(review, /function currentCases\(\)/);
  assert.match(review, /function historyCases\(\)/);
  assert.match(review, /data-kind-filter="current"/);
  assert.match(review, /data-kind-filter="execution"/);
  assert.match(review, /data-kind-filter="carry_forward_same_identity"/);
  assert.match(review, /data-kind-filter="historical_family_review"/);
  assert.match(review, /data-kind-filter="designation_residual"/);
  assert.match(review, /data-kind-filter="naming_residual"/);
  assert.match(review, /data-kind-filter="rupture_probe"/);
  assert.match(review, /FIXED \/ KEEP_SEPARATE \/ SUPERSEDED \/ NOT_PRESENT \/ HOLD_UNRESOLVED/);
  assert.match(review, /미종결 \$\{current\.length\}/);
  assert.doesNotMatch(review, /atlas-mutate|ATLAS_MUTATION_TOKEN|SUPABASE_DB_URL/);
});

test('review snapshot export is based on all current unresolved registry rows, not only Ireland and Italy', () => {
  assert.match(review, /const cases = currentCases\(\)/);
  assert.match(review, /atlas-polity-review-decisions\/v2/);
  assert.match(review, /terminal_status: row\.terminal_status/);
  assert.match(review, /review_group: row\.review_group/);
});

test('Polity Atlas routes connected Persons through canonical deep links', () => {
  const dossierIndex=nav.indexOf('atlas-polity-dossier-view.js');
  const browserIndex=nav.indexOf('atlas-polity-review-workbench.js');
  assert.ok(dossierIndex >= 0 && browserIndex > dossierIndex);
  assert.match(nav, /ATLAS_POLITY_DOSSIER_VIEW/);
  assert.match(browser, /data-polity-person-id/);
  assert.match(browser, /ATLAS_MAIN_AUTHORITY_NAV\?\.showEntity\?\.\("persons","person",personId\)/);
  assert.match(css, /polity-dossier-overview/);
  assert.match(css, /polity-dossier-designations/);
  assert.match(css, /polity-dossier-person/);
});

test('Polity surface uses the canonical dark monumental token system without legacy bright SaaS colors', () => {
  assert.match(css, /ATLAS Polity surface — V10 dark monumental integration/);
  assert.match(css, /Polity owns its nested card surfaces explicitly/);
  assert.match(css, /\.polity-browser-summary,[\s\S]*\.polity-review-card \{[\s\S]*background: var\(--atlas-surface-1\)/);
  assert.match(css, /var\(--atlas-surface-1\)/);
  assert.match(css, /var\(--atlas-surface-2\)/);
  assert.match(css, /var\(--atlas-surface-3\)/);
  assert.match(css, /var\(--atlas-divider\)/);
  assert.match(css, /var\(--atlas-text\)/);
  assert.match(css, /var\(--atlas-text-strong\)/);
  assert.match(css, /var\(--atlas-honor-metal\)/);
  assert.match(css, /var\(--atlas-success\)/);
  assert.match(css, /var\(--atlas-danger\)/);
  assert.match(css, /var\(--atlas-warning\)/);
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(css, /border-radius:999px/);
  assert.match(nav, /atlas-polity-review-workbench\.css\?v=20261007-polity-m1-focus-v1/);
});

test('POL-C1 gives canonical Polity cards plaque material without changing card geometry', () => {
  const start = css.indexOf('UI POL-C1 — Polity plaque material');
  assert.ok(start >= 0);
  const material = css.slice(start);

  assert.match(material, /\.polity-browser-card\{/);
  assert.match(material, /\.polity-browser-card\[open\]/);
  assert.match(material, /inset 2px 0 0 var\(--atlas-material-rail\)/);
  assert.match(material, /\.polity-dossier-overview>div/);
  assert.match(material, /\.polity-dossier-person>header/);

  assert.doesNotMatch(material, /\n\s*grid-template-columns\s*:/);
  assert.doesNotMatch(material, /\n\s*padding\s*:/);
  assert.doesNotMatch(material, /\n\s*font-size\s*:/);
  assert.doesNotMatch(material, /\n\s*line-height\s*:/);
  assert.doesNotMatch(material, /\n\s*width\s*:/);
  assert.doesNotMatch(material, /\n\s*height\s*:/);
});

test('POL-C2 refines Polity review cards without changing review geometry', () => {
  const start = css.indexOf('UI POL-C2 — Review card material');
  assert.ok(start >= 0);
  const material = css.slice(start);

  assert.match(material, /\.polity-review-filter,/);
  assert.match(material, /\.polity-review-card,/);
  assert.match(material, /\.polity-review-filter\.is-active/);
  assert.match(material, /inset 2px 0 0 var\(--atlas-material-rail\)/);
  assert.match(material, /\.polity-review-evidence/);
  assert.match(material, /\.polity-review-model-note/);

  assert.doesNotMatch(material, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(material, /\n\s*grid-template-columns\s*:/);
  assert.doesNotMatch(material, /\n\s*padding\s*:/);
  assert.doesNotMatch(material, /\n\s*font-size\s*:/);
  assert.doesNotMatch(material, /\n\s*line-height\s*:/);
  assert.doesNotMatch(material, /\n\s*width\s*:/);
  assert.doesNotMatch(material, /\n\s*height\s*:/);
});

test('combined polity browser and review layout remains responsive', () => {
  assert.match(css, /polity-browser-kpis/);
  assert.match(css, /polity-browser-card/);
  assert.match(css, /polity-review-kpis/);
  assert.match(css, /polity-review-pair/);
  assert.match(css, /polity-review-controls/);
  assert.match(css, /atlas-polity-composite-shell/);
  assert.match(css, /@media\(max-width:1100px\)/);
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /@media\(max-width:600px\)/);
});


test('POLITY-M1 restores the shared focus language after late Polity CSS', () => {
  const start = css.indexOf('POLITY-M1 — Late focus ownership');
  assert.ok(start >= 0);
  const focus = css.slice(start, css.indexOf('/* GLOBAL-M3 — Inscription typography.', start));

  for (const selector of [
    '.polity-browser-filters button:focus-visible',
    '.polity-browser-card>summary:focus-visible',
    '.polity-review-filter:focus-visible',
    '.polity-dossier-person>header button:focus-visible'
  ]) {
    assert.ok(focus.includes(selector), `missing focus selector: ${selector}`);
  }

  assert.match(focus, /outline:1px solid var\(--atlas-focus-ring\)/);
  assert.match(focus, /outline-offset:2px/);
  assert.match(focus, /\.polity-browser-controls input:focus,[\s\S]*?\.polity-review-controls textarea:focus\{[^}]*border-color:var\(--atlas-material-hairline-strong\)[^}]*outline:1px solid var\(--atlas-focus-ring\)[^}]*box-shadow:none/);
  assert.doesNotMatch(focus, /rgba\(/);

  assert.match(css, /\.polity-review-filter\.is-active\{[^}]*border-color:rgba\(208,188,145,\.28\)/);
  assert.match(css, /\.polity-review-filter\.is-active\{[\s\S]*?inset 2px 0 0 var\(--atlas-material-rail\)/);
});
