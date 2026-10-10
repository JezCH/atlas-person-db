import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const dash=read('atlas-dashboard-monumental-v11.css'),mobile=read('atlas-ui-mobile-v8.css');
const html=read('index.html'),nav=read('atlas-main-authority-nav.js');
test('T-D improves KPI support copy without truncating data or moving explicit grid geometry',()=>{
 const at=dash.indexOf('/* VIS3-05T-D'); assert.ok(at>0);
 const p=dash.slice(at);
 assert.match(p,/\.dashboard-kpi small/);
 assert.match(p,/\.dashboard-kpi span/);
 assert.match(p,/font-size:\s*10px/);
 assert.match(p,/@media \(max-width: 600px\)/);
 assert.match(p,/\.dashboard-kpi\s*\{\s*gap:\s*4px/);
 assert.doesNotMatch(p,/\.dashboard-kpi strong|\.dashboard-kpi-grid|min-height:|(?:^|\n)\s*(?:padding|width|height|grid-template-columns|grid-template-rows|transform):|line-clamp|text-overflow:|overflow:\s*hidden|!important|@keyframes/);
 assert.match(nav,/atlas-dashboard-monumental-v11\.css\?v=20261010-vis3-05t-d-kpi-type-v1/);
});
test('T-D secondary mobile appbar type 10px, fixed 58px shell',()=>{
 const i=mobile.indexOf('  .mobile-appbar-title small {');assert.ok(i>0);
 const j=mobile.indexOf('  }',i),p=mobile.slice(i,j+3);
 assert.match(p,/color:\s*#a6adb2/);
 assert.match(p,/font-size:\s*10px/);
 assert.match(mobile,/\.mobile-appbar \{\s*height:\s*58px/);
 assert.match(mobile,/\.mobile-menu-button \{\s*width:\s*40px/);
 assert.match(html,/atlas-ui-mobile-v8\.css\?v=20261010-vis3-05t-d-appbar-type-v1/);
 assert.match(html,/class="mobile-appbar-title"><strong>인물<\/strong><small>ATLAS 편집<\/small>/);
});
test('T-D preserves exact KPI semantics and source domain routes',()=>{
 const x=read('atlas-dashboard.js');
 assert.match(x,/dashboard-kpi-action card/);
 assert.match(x,/escapeHtml\(primary\)/);
 assert.match(x,/escapeHtml\(detail\)/);
 for(const key of ['dashboard','persons','polities','places','events','sources','geometry'])assert.match(html,new RegExp('data-atlas-domain="'+key+'"'));
 assert.doesNotMatch(dash.slice(dash.indexOf('/* VIS3-05T-D')), /person-card|spacetime-camera|spacetime-year-axis|--atlas-person-domain/);
});
