import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const personMain = fs.readFileSync(new URL('../atlas-person-main.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Person Main directly owns the visible Excel output and upload buttons', () => {
  assert.match(personMain, /id="personMainExcelExport"/);
  assert.match(personMain, /id="personMainExcelImport"/);
  assert.match(personMain, /⇩ 엑셀 출력/);
  assert.match(personMain, /⇧ 엑셀 업로드/);
  assert.match(personMain, /const excelExport = document\.getElementById\("personMainExcelExport"\)/);
  assert.match(personMain, /const excelImport = document\.getElementById\("personMainExcelImport"\)/);
  assert.match(personMain, /excelExport\?\.addEventListener\("click", exportLegacyExcel\)/);
  assert.match(personMain, /excelImport\?\.addEventListener\("click", importLegacyExcel\)/);
});

test('Person Main Excel actions reuse the existing authoritative Excel bridge instead of adding a second data path', () => {
  assert.match(personMain, /function exportLegacyExcel\(\)/);
  assert.match(personMain, /document\.getElementById\("exportButton"\)/);
  assert.match(personMain, /function importLegacyExcel\(\)/);
  assert.match(personMain, /document\.getElementById\("importInput"\)/);
  assert.doesNotMatch(personMain, /XLSX|writeAdapter\.importActivities/);
  assert.match(app, /function exportExcel\(\)/);
  assert.match(app, /function importExcel\(file\)/);
  assert.match(app, /writeAdapter\.importActivities\(payload\)/);
});

test('the separate Excel toolbar patch runtime is fully retired', () => {
  assert.equal(fs.existsSync(new URL('../atlas-person-excel-actions.js', import.meta.url)), false);
  assert.doesNotMatch(html, /atlas-person-excel-actions\.js/);
  assert.match(html, /atlas-person-main\.js\?v=20260821-person-profile-v1/);
});

test('Person Main More menu no longer carries duplicate Excel commands', () => {
  assert.doesNotMatch(personMain, /data-person-main-action="export"/);
  assert.doesNotMatch(personMain, /data-person-main-action="import"/);
  assert.match(personMain, /data-person-main-action="legacy-tools"/);
  assert.match(personMain, /href="\.\/admin\.html"/);
});
