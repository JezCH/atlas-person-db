import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const dash=fs.readFileSync(new URL('../atlas-dashboard.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../atlas-ui-phase3-ornaments.css',import.meta.url),'utf8');
const active=css.slice(css.indexOf('/* VIS3-04/05'));
test('screenshot feedback blocks reappearance of overlays on words and KPI title',()=>{
 assert.match(html,/<header class="topbar"><div><p class="eyebrow">/);
 assert.doesNotMatch(html,/atlas-o-shell-cartouche|atlas-o-shell-folio|atlas-o-shell-mobile-mast/);
 assert.match(dash,/<section class="dashboard-kpi-grid" aria-labelledby="dashboardKpiHeading">/);
 assert.doesNotMatch(dash,/dashboard-frontispiece-seal|class="dashboard-ledger-heading" data-atlas-o-decor/);
 assert.doesNotMatch(active,/atlas-cartouche\.svg|atlas-chapter-divider\.svg|atlas-folio-plaque\.svg/);
});
test('only two individual decorative asset references active across shell and Dashboard',()=>{
 const refs=[...active.matchAll(/url\(["']?\.\/assets\/ui-ornaments\/(atlas-[a-z-]+\.svg)/g)].map(m=>m[1]).sort();
 assert.deepEqual(refs,['atlas-compass-rosette.svg','atlas-corner-filigree.svg']);
 assert.doesNotMatch(active,/\.dashboard-kpi\s*[:.{,]|\.dashboard-kpi-action|\.person-card|\.spacetime-camera/);
 assert.match(active,/opacity:calc\(var\(--atlas-o-ornament-presence\) \* \.44\)/);
 assert.match(active,/\.dashboard-ledger-heading h3/);
});
