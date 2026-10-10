import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=x=>fs.readFileSync(new URL('../'+x,import.meta.url),'utf8');
const kpi=read('atlas-dashboard-monumental-v11.css');
const mobile=read('atlas-ui-mobile-v8.css');
const index=read('index.html');
const nav=read('atlas-main-authority-nav.js');
const renderer=read('atlas-dashboard.js');
const k=kpi.slice(kpi.indexOf('/* VIS3-05T-D'));
const m=mobile.slice(mobile.indexOf('/* VIS3-05T-D'));
test('T-D KPI and mobile appbar use canonical CSS authorities and cache versions',()=>{
 assert.match(nav,/atlas-dashboard-monumental-v11\.css\?v=20261010-vis3-05t-d-kpi-caption-v1/);
 assert.match(index,/atlas-ui-mobile-v8\.css\?v=20261010-vis3-05t-d-appbar-microtype-v1/);
 assert.match(k,/\.dashboard-control-center \.dashboard-kpi > small \{/);
 assert.match(k,/\.dashboard-control-center \.dashboard-kpi > span \{/);
 assert.match(k,/@media \(max-width:600px\)/);
 assert.match(m,/@media \(max-width:760px\)/);
 assert.match(m,/\.mobile-appbar-title small/);
 assert.match(k,/font-size: 10px/);
 assert.match(m,/font-size: 10px/);
 assert.doesNotMatch(k,/\.dashboard-kpi strong|\.dashboard-hero|\.dashboard-ledger-heading|grid-template-columns|border-|box-shadow/);
 assert.doesNotMatch(m,/\.mobile-menu-button|\.mobile-appbar\s*\{|\.mobile-appbar-title strong|\.person-/);
});
test('T-D does not change KPI DOM values, data routes, domain colors or timespace',()=>{
 assert.match(renderer,/<small>\$\{escapeHtml\(label\)\}<\/small><strong>\$\{escapeHtml\(primary\)\}<\/strong><span>\$\{escapeHtml\(detail\)\}<\/span>/);
 for(const code of ['persons','activities','polities','domain','namuwiki','spatial'])
   assert.match(renderer,new RegExp('kpiCard\\(\\{code:"'+code+'"'));
 assert.doesNotMatch(k,/\.spacetime-|--atlas-person-domain|\.person-card/);
 assert.doesNotMatch(m,/\.spacetime-|--atlas-person-domain/);
});
