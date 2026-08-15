import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const shellSource = fs.readFileSync(new URL('../atlas-responsive-shell.js', import.meta.url), 'utf8');
const shellCss = fs.readFileSync(new URL('../atlas-responsive-shell.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('UI8 removes fixed desktop width pressure and provides a collapsible sidebar rail', () => {
  assert.match(shellCss, /body\{min-width:0!important\}/);
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
  assert.match(shellCss, /grid-template-columns:68px minmax\(0,1fr\)!important/);
  assert.match(shellCss, /\.sidebar\{width:230px;z-index:61/);
  assert.match(shellCss, /\.workspace-shell\.sidebar-collapsed \.sidebar\{width:68px;box-shadow:none\}/);
});

test('UI-T4 makes Person detail zero-width until selection and opens it as a modal drawer', () => {
  assert.match(shellCss, /\.person-main-layout\{display:block!important\}/);
  assert.match(shellCss, /\.person-main-detail\[hidden\],#personMainDetailBackdrop\[hidden\]\{display:none!important\}/);
  assert.match(shellCss, /\.person-main-detail\{position:fixed!important/);
  assert.match(shellSource, /detailPanel\.hidden = true/);
  assert.match(shellSource, /\[data-person-id\]/);
  assert.match(shellSource, /person-detail-overlay-close/);
  assert.match(shellSource, /detailPanel\.setAttribute\("role", "dialog"\)/);
  assert.match(shellSource, /detailPanel\.setAttribute\("aria-modal", "true"\)/);
  assert.match(shellSource, /event\.key === "Escape"/);
  assert.match(shellSource, /backdrop\.addEventListener\("click"/);
});

test('UI-T4 moves focus into the drawer, traps Tab, survives detail rerender and restores row focus', () => {
  assert.match(shellSource, /function detailFocusableElements\(\)/);
  assert.match(shellSource, /function focusDetail\(\)/);
  assert.match(shellSource, /window\.requestAnimationFrame/);
  assert.match(shellSource, /function trapDetailFocus\(event\)/);
  assert.match(shellSource, /event\.key !== "Tab"/);
  assert.match(shellSource, /event\.shiftKey && active === first/);
  assert.match(shellSource, /!event\.shiftKey && active === last/);
  assert.match(shellSource, /if \(!detailPanel\.contains\(document\.activeElement\)\) focusDetail\(\)/);
  assert.match(shellSource, /function restoreTriggerFocus\(\)/);
  assert.match(shellSource, /lastTrigger\.focus\(\{ preventScroll: true \}\)/);
});

test('UI-T4 locks background scrolling and provides safe mobile drawer edges and touch target', () => {
  assert.match(shellCss, /body\.person-detail-overlay-open\{overflow:hidden\}/);
  assert.match(shellCss, /overscroll-behavior:contain/);
  assert.match(shellCss, /\.person-detail-overlay-close\{[^}]*width:44px;height:44px/);
  assert.match(shellCss, /env\(safe-area-inset-top\)/);
  assert.match(shellCss, /env\(safe-area-inset-right\)/);
  assert.match(shellCss, /env\(safe-area-inset-bottom\)/);
  assert.match(shellCss, /env\(safe-area-inset-left\)/);
});

test('UI8 remains presentation-only and does not create another data read or write path', () => {
  assert.doesNotMatch(shellSource, /fetch\s*\(|listPersons|readPerson|ATLAS_SERVER_WRITE_ADAPTER|\.submit\s*\(/);
});

test('UI-T4 shell assets load after Person Main so the generated detail panel exists', () => {
  assert.match(html, /atlas-responsive-shell\.css\?v=20260816-ui-t4/);
  const mainScript = html.indexOf('atlas-person-main.js?v=20260816-ui-t01');
  const shellScript = html.indexOf('atlas-responsive-shell.js?v=20260816-ui-t4');
  const navScript = html.indexOf('atlas-main-authority-nav.js?v=20260815-ui5');
  assert.ok(mainScript >= 0 && shellScript > mainScript && navScript > shellScript);
});
