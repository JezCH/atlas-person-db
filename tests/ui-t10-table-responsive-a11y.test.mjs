import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../atlas-ui-t10.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const tableCss = fs.readFileSync(new URL('../atlas-person-table-view.css', import.meta.url), 'utf8');
const nonTimelineCss = fs.readFileSync(new URL('../non-timeline-list.css', import.meta.url), 'utf8');
const responsiveCss = fs.readFileSync(new URL('../atlas-responsive-shell.css', import.meta.url), 'utf8');

test('UI-T10 loads the final responsive table hardening after earlier table styles', () => {
  assert.match(html, /atlas-ui-t10\.css\?v=20260816-ui-t10/);
  assert.ok(html.indexOf('atlas-person-table-view.css') < html.indexOf('atlas-ui-t10.css'));
  assert.ok(html.indexOf('non-timeline-list.css') < html.indexOf('atlas-ui-t10.css'));
  assert.ok(html.indexOf('atlas-responsive-shell.css') < html.indexOf('atlas-ui-t10.css'));
});

test('UI-T10 keeps authoritative Person and curated non-timeline surfaces as tables on mobile', () => {
  assert.match(tableCss, /@media\(max-width:760px\)/);
  assert.match(tableCss, /min-width:724px/);
  assert.match(nonTimelineCss, /\.non-timeline-table\{display:table;width:100%;min-width:820px\}/);
  assert.match(nonTimelineCss, /\.non-timeline-table thead\{display:table-header-group\}/);
});

test('UI-T10 restores the legacy relationship authoring surface to a real table on mobile', () => {
  assert.match(css, /\.relationship-authoring-body \.table-scroll table\{display:table/);
  assert.match(css, /\.relationship-authoring-body \.table-scroll thead\{display:table-header-group\}/);
  assert.match(css, /\.relationship-authoring-body \.table-scroll tbody\{display:table-row-group\}/);
  assert.match(css, /\.relationship-authoring-body \.table-scroll tr\{display:table-row/);
  assert.match(css, /\.relationship-authoring-body \.table-scroll th,\.relationship-authoring-body \.table-scroll td\{display:table-cell/);
  assert.match(css, /td::before\{content:none!important;display:none!important\}/);
});

test('UI-T10 provides at least 44px primary touch targets and keyboard focus cues', () => {
  assert.match(css, /person-card-grid\.person-table-grid>\.person-card\{min-height:44px\}/);
  assert.match(css, /\.person-main-actions \.btn\{min-height:44px\}/);
  assert.match(css, /\.person-main-more-menu button,\.person-main-more-menu a\{min-height:44px\}/);
  assert.match(css, /\.person-activity-actions \.mini-btn\{min-width:52px;min-height:44px\}/);
  assert.match(css, /\.non-timeline-data-row>td\{height:44px\}/);
  assert.match(css, /:focus-visible/);
  assert.match(responsiveCss, /\.person-detail-overlay-close\{[^}]*width:44px;height:44px/);
});

test('UI-T10 fixes the narrow group-count layout without returning to card-mode content', () => {
  assert.match(css, /@media\(max-width:520px\)/);
  assert.match(css, /\.person-group-head\{display:flex;align-items:flex-start;gap:8px\}/);
  assert.match(css, /\.person-group-head>strong\{align-self:flex-start;justify-self:auto/);
  assert.doesNotMatch(css, /\.person-group-head\{display:grid/);
});

test('UI-T10 respects reduced-motion preferences', () => {
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /transition:none!important/);
  assert.match(css, /scroll-behavior:auto/);
});
