import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const excelActions = fs.readFileSync(new URL('../atlas-person-excel-actions.js', import.meta.url), 'utf8');
const personMain = fs.readFileSync(new URL('../atlas-person-main.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Person toolbar exposes Excel output and upload as direct visible buttons', () => {
  assert.match(excelActions, /personMainExcelExport/);
  assert.match(excelActions, /personMainExcelImport/);
  assert.match(excelActions, /⇩ 엑셀 출력/);
  assert.match(excelActions, /⇧ 엑셀 업로드/);
  assert.match(excelActions, /actions\.insertBefore\(exportButton, more\)/);
  assert.match(excelActions, /actions\.insertBefore\(importButton, more\)/);
});

test('visible Excel actions reuse the existing authoritative Excel bridge instead of adding a second data path', () => {
  assert.match(excelActions, /exportLegacyExcel/);
  assert.match(excelActions, /importLegacyExcel/);
  assert.doesNotMatch(excelActions, /XLSX|fetch\s*\(|ATLAS_SERVER_WRITE_ADAPTER/);
  assert.match(personMain, /function exportLegacyExcel\(\)/);
  assert.match(personMain, /function importLegacyExcel\(\)/);
  assert.match(app, /function exportExcel\(\)/);
  assert.match(app, /function importExcel\(file\)/);
  assert.match(app, /writeAdapter\.importActivities\(payload\)/);
});

test('visible Excel actions load after Person Main has installed its toolbar API', () => {
  assert.match(html, /atlas-person-excel-actions\.js\?v=20260816-visible-excel-v1/);
  assert.ok(
    html.indexOf('atlas-person-main.js?v=20260815-ui6r4') <
    html.indexOf('atlas-person-excel-actions.js?v=20260816-visible-excel-v1')
  );
});

test('duplicate Excel entries in the More menu are hidden after promotion', () => {
  assert.match(excelActions, /data-person-main-action=\\?"export\\?"/);
  assert.match(excelActions, /data-person-main-action=\\?"import\\?"/);
  assert.match(excelActions, /legacyMenuExport\.hidden = true/);
  assert.match(excelActions, /legacyMenuImport\.hidden = true/);
});
