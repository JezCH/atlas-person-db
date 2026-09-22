import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';

const personMain = fs.readFileSync(new URL('../atlas-person-main.js', import.meta.url), 'utf8');
const excelModule = fs.readFileSync(new URL('../atlas-person-excel-export.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Person Main remains the single visible Excel export owner', () => {
  assert.match(personMain, /id="personMainExcelExport"/);
  assert.match(personMain, /⇩ 엑셀 출력/);
  assert.match(personMain, /const excelExport = document\.getElementById\("personMainExcelExport"\)/);
  assert.match(personMain, /excelExport\?\.addEventListener\("click", exportCurrentExcel\)/);
  assert.match(personMain, /exportCurrentExcel/);
  assert.doesNotMatch(personMain, /personMainExcelImport|엑셀 업로드|importLegacyExcel/);
});

test('Person Excel feature module is absent from initial HTML and loaded only on demand', () => {
  assert.doesNotMatch(html, /atlas-person-excel-export\.js/);
  assert.match(personMain, /const PERSON_EXCEL_EXPORT_SCRIPT_URL = "\.\/atlas-person-excel-export\.js\?v=20260922-feature-split-v1"/);
  assert.match(personMain, /function ensurePersonExcelExportModule\(\)/);
  assert.match(personMain, /if \(personExcelExportModulePromise\) return personExcelExportModulePromise/);
  assert.match(personMain, /script\.dataset\.atlasPersonExcelExport = "true"/);
  assert.match(personMain, /personExcelExportModulePromise = null/);
  assert.match(personMain, /script\?\.remove\?\.\(\)/);
  assert.match(personMain, /if \(created\) document\.head\.append\(script\)/);

  const loaderStart=personMain.indexOf('function ensurePersonExcelExportModule()');
  const loaderEnd=personMain.indexOf('async function exportCurrentExcel()',loaderStart);
  const loader=personMain.slice(loaderStart,loaderEnd);
  assert.ok(loader.indexOf('script.addEventListener("load"') < loader.indexOf('document.head.append(script)'));
});

test('Person Main delegates workbook creation to the extracted module without duplicating Excel implementation', () => {
  const exportStart=personMain.indexOf('async function exportCurrentExcel()');
  const exportEnd=personMain.indexOf('function installShell()',exportStart);
  const exportBlock=personMain.slice(exportStart,exportEnd);
  assert.match(exportBlock, /const exporter = await ensurePersonExcelExportModule\(\)/);
  assert.match(exportBlock, /await exporter\.exportPersons\(\{ persons, boundaryLabel \}\)/);
  assert.match(exportBlock, /if \(excelExportInFlight\) return/);
  assert.match(exportBlock, /exportButton\.disabled = true/);
  assert.match(exportBlock, /exportButton\.disabled = false/);
  assert.doesNotMatch(personMain, /xlsx\.utils\.json_to_sheet|XLSX_SCRIPT_URL|function ensureXlsx\(/);
  assert.doesNotMatch(html, /xlsx(?:\.full)?\.min\.js|cdn\.jsdelivr\.net\/npm\/xlsx/i);
});

test('extracted Excel module preserves current Person snapshot row mapping and canonical boundary formatter injection', () => {
  const context={window:{},document:{}};
  vm.runInNewContext(excelModule,context,{filename:'atlas-person-excel-export.js'});
  const api=context.window.ATLAS_PERSON_EXCEL_EXPORT;
  assert.equal(typeof api?.buildRows,'function');

  const rows=api.buildRows([
    {
      display_name:'인물 A',
      canonical_name_en:'Person A',
      activity_summaries:[]
    },
    {
      display_name:'인물 B',
      canonical_name_en:'Person B',
      activity_summaries:[{
        polity:{display_name:'정치체 B',canonical_name_en:'Polity B'},
        relation:{code:'ruled'},
        role:{display_name:'왕'},
        start:{year:100},
        end:{year:120},
        period_basis:{display_name:'재위'}
      }]
    }
  ],(boundary)=>`Y:${boundary?.year ?? ''}`);

  assert.equal(rows.length,2);
  assert.deepEqual(JSON.parse(JSON.stringify(rows)),[
    {
      '인물':'인물 A',
      '영문명':'Person A',
      '정치체':'',
      '관계':'',
      '역할':'',
      '시작':'',
      '종료':'',
      '기간 기준':''
    },
    {
      '인물':'인물 B',
      '영문명':'Person B',
      '정치체':'정치체 B',
      '관계':'ruled',
      '역할':'왕',
      '시작':'Y:100',
      '종료':'Y:120',
      '기간 기준':'재위'
    }
  ]);
});

test('XLSX remains lazy-loaded once inside the feature module and retryable after failure', () => {
  assert.match(excelModule, /const XLSX_SCRIPT_URL = "https:\/\/cdn\.jsdelivr\.net\/npm\/xlsx@0\.18\.5\/dist\/xlsx\.full\.min\.js"/);
  assert.match(excelModule, /function ensureXlsx\(\)/);
  assert.match(excelModule, /if \(xlsxLoadPromise\) return xlsxLoadPromise/);
  assert.match(excelModule, /script\.dataset\.atlasXlsx = "true"/);
  assert.match(excelModule, /xlsxLoadPromise = null/);
  assert.match(excelModule, /script\?\.remove\?\.\(\)/);
  assert.match(excelModule, /xlsx\.utils\.json_to_sheet\(rows\)/);
  assert.match(excelModule, /xlsx\.utils\.book_append_sheet\(wb, ws, "Persons"\)/);
  assert.match(excelModule, /xlsx\.writeFile\(wb,/);
});

test('legacy Excel upload and app.js bridge remain retired while export compatibility stays public', () => {
  assert.doesNotMatch(html, /importInput|exportButton|\.\/app\.js/);
  assert.equal(fs.existsSync(new URL('../app.js', import.meta.url)), false);
  assert.match(html, /atlas-person-main\\.js\\?v=20260922-excel-feature-split-v1/);
  assert.match(personMain, /window\.ATLAS_PERSON_MAIN = Object\.freeze\([\s\S]*exportCurrentExcel/);
});
