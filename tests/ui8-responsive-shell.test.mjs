import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const shellSource = fs.readFileSync(new URL('../atlas-responsive-shell.js', import.meta.url), 'utf8');
const shellCss = fs.readFileSync(new URL('../atlas-responsive-shell.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('UI8 removes fixed desktop width pressure and provides a collapsible sidebar rail', () => {
  assert.match(shellCss, /body\{min-width:0\}/);
  assert.match(shellCss, /\.workspace-shell\.sidebar-collapsed\{grid-template-columns:68px minmax\(0,1fr\)\}/);
  assert.match(shellSource, /sidebar-collapse-toggle/);
  assert.match(shellSource, /atlas\.sidebar\.collapsed/);
  assert.match(shellSource, /max-width: 1239px/);
});

test('UI8 normalizes every sidebar action so collapsed labels cannot wrap vertically', () => {
  assert.match(shellSource, /sidebar-compact-action/);
  assert.match(shellSource, /sidebar\.querySelectorAll\("button,a"\)/);
  assert.match(shellSource, /MutationObserver\(decorateSidebarActions\)/);
  assert.match(shellCss, /sidebar-compact-action\{font-size:0!important/);
  assert.match(shellCss, /span:not\(:first-child\)\{display:none!important\}/);
});

test('UI8 compact desktop expansion overlays instead of stealing table width', () => {
  assert.match(shellCss, /@media\(max-width:1239px\) and \(min-width:761px\)/);
  assert.match(shellCss, /grid-template-columns:68px minmax\(0,1fr\)/);
  assert.doesNotMatch(shellCss, /grid-template-columns:68px minmax\(0,1fr\)!important/);
  assert.match(shellCss, /\.sidebar\{width:230px;z-index:61/);
  assert.match(shellCss, /\.workspace-shell\.sidebar-collapsed \.sidebar\{width:68px;box-shadow:none\}/);
});

test('UI8 makes Person detail zero-width until selection and opens it as an overlay drawer', () => {
  assert.match(shellCss, /\.person-main-layout\{display:block\}/);
  assert.match(shellCss, /\.person-main-detail\[hidden\],#personMainDetailBackdrop\[hidden\]\{display:none\}/);
  assert.match(shellCss, /\.person-main-detail\{position:fixed;top:18px/);
  assert.match(shellSource, /detailPanel\.hidden = true/);
  assert.match(shellSource, /\[data-person-id\]/);
  assert.match(shellSource, /person-detail-overlay-close/);
  assert.match(shellSource, /event\.key === "Escape"/);
  assert.match(shellSource, /backdrop\.addEventListener\("click"/);
});

test('responsive shell relies on final asset order instead of redundant force overrides', () => {
  assert.doesNotMatch(shellCss, /body\{min-width:0!important\}/);
  assert.doesNotMatch(shellCss, /\.person-main-layout\{display:block!important\}/);
  assert.doesNotMatch(shellCss, /\.person-main-detail\{position:fixed!important/);
  assert.doesNotMatch(shellCss, /max-height:none!important/);
  assert.doesNotMatch(shellCss, /\.sidebar-collapse-toggle\{display:none!important\}/);
});

test('UI8 remains presentation-only and does not create another data read or write path', () => {
  assert.doesNotMatch(shellSource, /fetch\s*\(|listPersons|readPerson|ATLAS_SERVER_WRITE_ADAPTER|\.submit\s*\(/);
});

test('UI8 shell assets load after Person Main so the generated detail panel exists', () => {
  assert.match(html, /atlas-responsive-shell\.css\?v=20260817-r1-css-owner-v1/);
  const mainScript = html.indexOf('atlas-person-main.js?v=20260817-toolbar-owner-r1');
  const shellScript = html.indexOf('atlas-responsive-shell.js?v=20260815-ui8-shell-r2');
  const navScript = html.indexOf('atlas-main-authority-nav.js?v=20260815-ui5');
  assert.ok(mainScript >= 0 && shellScript > mainScript && navScript > shellScript);
});
