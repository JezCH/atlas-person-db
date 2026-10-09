import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {syncPublicUi, syncPublicUiOrnaments} from '../scripts/prepare-vercel-public-ui.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dash=fs.readFileSync(path.join(root,'atlas-dashboard.js'),'utf8');
const css=fs.readFileSync(path.join(root,'atlas-ui-phase3-ornaments.css'),'utf8');
const legacy=fs.readFileSync(path.join(root,'atlas-dashboard-monumental-v11.css'),'utf8');

test('VIS3-05 grand entrance exists in both loading and live paths, six KPI data/actions stay original',()=>{
 assert.equal((dash.match(/<section class="dashboard-control-center atlas-ornament-v3">/g)||[]).length,3);
 assert.equal((dash.match(/class="dashboard-hero card dashboard-frontispiece" data-atlas-o-decor/g)||[]).length,2);
 assert.doesNotMatch(dash,/dashboard-frontispiece-seal/);
 assert.match(dash,/<h3 id="dashboardKpiHeading">핵심 통계<\/h3>/);
 assert.match(dash,/<section class="dashboard-kpi-grid" aria-labelledby="dashboardKpiHeading">/);
 for(const code of ['persons','activities','polities','domain','namuwiki','spatial']) {
  assert.equal((dash.match(new RegExp('kpiCard\\(\\{code:"'+code+'"','g'))||[]).length,1,code);
 }
 assert.match(dash,/id="atlasDashboardRefresh" type="button"/);
 assert.match(dash,/data-dashboard-attention/);
 assert.match(dash,/data-dashboard-quality/);
 assert.match(dash,/dashboard-main-grid/);
 assert.match(dash,/dashboard-lower-grid/);
});
test('one canonical kit owns neutral frontispiece, tallied folio and mobile treatment',()=>{
 const scope=css.slice(css.indexOf('/* VIS3-04/05'));
 assert.ok(scope.length>2800);
 for(const svg of ['atlas-compass-rosette','atlas-corner-filigree'])
  assert.ok(scope.includes('./assets/ui-ornaments/'+svg+'.svg'),svg);
 assert.match(scope,/\.dashboard-control-center\.atlas-ornament-v3 \.dashboard-frontispiece/);
 assert.match(scope,/\.dashboard-control-center\.atlas-ornament-v3 \.dashboard-ledger-heading/);
 assert.match(scope,/@media \(max-width:600px\)/);
 assert.match(scope,/@media \(forced-colors:active\)/);
 assert.doesNotMatch(scope,/\.dashboard-kpi(?:\s|\{|:|\.|>|,)|\.nav-item|\.person-card|\.spacetime-|\.dashboard-domain-swatch|--atlas-person-domain-/);
 assert.doesNotMatch(scope,/fetch\s*\(|addEventListener|@keyframes|animation\s*:/);
 assert.match(css,/data-atlas-ornament="off"/);
 assert.match(css,/pointer-events:none/);
 assert.match(legacy,/\.dashboard-kpi-grid/);
});
test('Vercel publish copies original SVG files into public path without exposing unrelated files',()=>{
 const source=path.join(root,'assets','ui-ornaments');
 const files=fs.readdirSync(source).filter(n=>n.endsWith('.svg')).sort();
 assert.equal(files.length,8);
 const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'atlas-vis3-05-'));
 try {
  const dir=path.join(fixture,'assets','ui-ornaments');
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(fixture,'index.html'),'<html></html>');
  fs.copyFileSync(path.join(source,files[0]),path.join(dir,files[0]));
  fs.writeFileSync(path.join(dir,'skip.txt'),'not public');
  const publicDir=path.join(fixture,'public');
  assert.deepEqual(syncPublicUi({rootDir:fixture,publicDir}),['index.html']);
  assert.deepEqual(syncPublicUiOrnaments({rootDir:fixture,publicDir}),[files[0]]);
  assert.equal(fs.readFileSync(path.join(publicDir,'assets','ui-ornaments',files[0]),'utf8'),fs.readFileSync(path.join(source,files[0]),'utf8'));
  assert.equal(fs.existsSync(path.join(publicDir,'assets','ui-ornaments','skip.txt')),false);
 } finally {fs.rmSync(fixture,{recursive:true,force:true});}
});
test('all canonical CSS SVG URLs resolve into build-published ornament prefix',()=>{
 const refs=[...css.matchAll(/url\(["']?(\.\/assets\/ui-ornaments\/[^"')]+)["']?\)/g)].map(m=>m[1]);
 assert.ok(refs.length>=10,'canonical eight primitives plus two restrained mounts');
 for(const relative of refs) {
  assert.match(relative,/^\.\/assets\/ui-ornaments\/atlas-[a-z0-9-]+\.svg$/);
  assert.ok(fs.statSync(path.join(root,relative)).isFile(),relative);
 }
});
