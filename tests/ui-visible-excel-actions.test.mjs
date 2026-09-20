import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const personMain = fs.readFileSync(new URL('../atlas-person-main.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Person Main is the single visible Excel export owner', () => {
  assert.match(personMain, /id="personMainExcelExport"/);
  assert.match(personMain, /⇩ 엑셀 출력/);
  assert.match(personMain, /const excelExport = document\.getElementById\("personMainExcelExport"\)/);
  assert.match(personMain, /excelExport\?\.addEventListener\("click", exportCurrentExcel\)/);
  assert.doesNotMatch(personMain, /personMainExcelImport|엑셀 업로드|importLegacyExcel/);
});

test('Excel export reads the current Person snapshot directly and no longer bridges through app.js', () => {
  assert.match(personMain, /function exportCurrentExcel\(\)/);
  assert.match(personMain, /window\.XLSX\.utils\.json_to_sheet\(rows\)/);
  assert.match(personMain, /person\.activity_summaries/);
  assert.doesNotMatch(personMain, /document\.getElementById\("exportButton"\)|exportLegacyExcel/);
  assert.doesNotMatch(html, /\.\/app\.js/);
  assert.equal(fs.existsSync(new URL('../app.js', import.meta.url)), false);
});

test('legacy Excel upload and separate patch runtime are retired', () => {
  assert.equal(fs.existsSync(new URL('../atlas-person-excel-actions.js', import.meta.url)), false);
  assert.doesNotMatch(html, /atlas-person-excel-actions\.js|importInput|exportButton/);
  assert.match(html, /atlas-person-main\.js\?v=20260920-single-person-surface/);
});
