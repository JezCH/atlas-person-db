import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const ownerScript = readFileSync(new URL('../atlas-domain-surface-owner.js', import.meta.url), 'utf8');
const ownerCss = readFileSync(new URL('../atlas-domain-surface-owner.css', import.meta.url), 'utf8');

test('domain surface owner loads after authority navigation', () => {
  const nav = index.indexOf('atlas-main-authority-nav.js');
  const owner = index.indexOf('atlas-domain-surface-owner.js');
  assert.ok(nav >= 0);
  assert.ok(owner > nav);
  assert.match(index, /atlas-domain-surface-owner\.css/);
});

test('all Person-owned top-level surfaces are consolidated under one domain root', () => {
  assert.match(ownerScript, /personDomainRoot/);
  assert.match(ownerScript, /"personMainView"/);
  assert.doesNotMatch(ownerScript, /"nonTimelineSection"/);
  assert.match(ownerScript, /"relationshipAuthoringTools"/);
  assert.match(ownerScript, /root\.hidden\s*=\s*!isPersons/);
  assert.match(ownerCss, /#personDomainRoot\[hidden\]\{display:none!important\}/);
});

test('spacetime uses document vertical scrolling instead of a capped nested viewport', () => {
  assert.match(ownerCss, /#atlasAuthorityShell \.spacetime-scroll\{[^}]*max-height:none!important/);
  assert.match(ownerCss, /overscroll-behavior:auto!important/);
  assert.doesNotMatch(ownerCss, /72vh|75vh/);
  assert.match(ownerScript, /document\.scrollingElement/);
});
