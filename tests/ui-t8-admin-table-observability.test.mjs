import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../atlas-admin-observability.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../atlas-admin-table-view.css', import.meta.url), 'utf8');
const workspace = fs.readFileSync(new URL('../atlas-admin-workspace.js', import.meta.url), 'utf8');
const adminHtml = fs.readFileSync(new URL('../admin.html', import.meta.url), 'utf8');

test('UI-T8-A keeps existing protected Admin endpoints and adds no read/write path', () => {
  assert.match(source, /const STATUS_ENDPOINT = "\/api\/atlas-admin-system-status"/);
  assert.match(source, /const INSPECTOR_ENDPOINT = "\/api\/atlas-admin-inspector"/);
  const endpoints = [...source.matchAll(/"(\/api\/[^"?]+)"/g)].map((match) => match[1]);
  assert.deepEqual([...new Set(endpoints)].sort(), ['/api/atlas-admin-inspector', '/api/atlas-admin-system-status']);
  assert.doesNotMatch(source, /method:\s*"POST"|method:\s*"PUT"|method:\s*"DELETE"|ATLAS_SERVER_WRITE_ADAPTER/);
});

test('UI-T8-A renders System Status as a status matrix plus key/value tables', () => {
  assert.match(source, /function renderStatusMatrix\(payload\)/);
  assert.match(source, /<th>Scope<\/th><th>Current state<\/th><th>Detail<\/th>/);
  assert.match(source, /function renderKeyValueTable\(value/);
  assert.match(source, /<table class="obs-table obs-key-value-table">/);
  assert.match(source, /statusSection\("Runtime identity"/);
  assert.match(source, /statusSection\("Configuration presence — values are never exposed"/);
  assert.match(source, /renderTableCounts\(payload\.counts\?\.tables\)/);
  assert.doesNotMatch(source, /obs-summary-grid/);
});

test('UI-T8-A renders Inspector raw object fields as path/value rows instead of a JSON blob', () => {
  assert.match(source, /function ensureInspectorContainer\(\)/);
  assert.match(source, /current\.tagName !== "PRE"/);
  assert.match(source, /function flattenRows\(value, prefix = ""\)/);
  assert.match(source, /Field \/ path/);
  assert.match(source, /Raw value/);
  assert.match(source, /renderInspectorResult\(payload\)/);
  assert.doesNotMatch(source, /JSON\.stringify\(\{ kind: payload\.kind, object: payload\.object \}/);
});

test('UI-T8-A table CSS is loaded through the existing session cache-busting asset loader', () => {
  assert.match(source, /ATLAS_ASSETS\?\.withSession\?\.\("\.\/atlas-admin-table-view\.css"\)/);
  assert.match(source, /data-atlas-admin-table-view/);
  assert.match(css, /\.obs-status-matrix/);
  assert.match(css, /\.obs-key-value-table/);
  assert.match(css, /@media\(max-width:760px\)/);
});

test('UI-T8-A leaves workspace tabs and authoring forms structurally intact', () => {
  assert.match(workspace, /VIEW_ORDER = \["overview", "review", "authoring", "inspector"\]/);
  for (const id of ['createPersonForm', 'createPolityForm', 'createRoleForm', 'jsonInput', 'saveButton']) {
    assert.ok(adminHtml.includes(`id="${id}"`), `missing existing authoring control ${id}`);
  }
  assert.doesNotMatch(source, /createPersonForm|createPolityForm|createRoleForm|jsonInput|saveButton/);
});
