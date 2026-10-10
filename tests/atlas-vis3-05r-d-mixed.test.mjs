import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root=new URL('../',import.meta.url);
const read=(name)=>fs.readFileSync(new URL(name,root),'utf8');
const css=read('atlas-ui-phase3-ornaments.css');
const html=read('index.html');
const dashboard=read('atlas-dashboard.js');
const owned=css.slice(css.indexOf('/* VIS3-05R-D — restrained mixed'));
const before=css.slice(0,css.indexOf('/* VIS3-05R-D — restrained mixed'));
const count=(s,r)=>(s.match(r)||[]).length;

test('user choice D is integrated through one canonical stylesheet, with cache bust',()=>{
 assert.match(html,/atlas-ui-phase3-ornaments\.css\?v=20261010-vis3-05r-mixed-v1/);
 assert.equal(count(html,/atlas-ui-phase3-ornaments\.css\?v=/g),1);
 assert.match(owned,/D=B\(0\.68\) \+ C\(0\.76\)/);
 assert.match(owned,/opacity:calc\(var\(--atlas-o-ornament-presence\) \* \.68\)/);
 assert.match(owned,/opacity:calc\(var\(--atlas-o-ornament-presence\) \* \.76\)/);
 assert.match(css,/data-atlas-ornament="off"/);
 assert.doesNotMatch(owned,/url\(/);
 assert.match(before,/assets\/ui-ornaments\/atlas-corner-filigree\.svg/);
 assert.match(before,/assets\/ui-ornaments\/atlas-compass-rosette\.svg/);
});
test('short edge engravings stay within hero pseudo-elements; no text overlay or full cartouche',()=>{
 assert.match(owned,/\.dashboard-frontispiece::after \{/);
 assert.match(owned,/left 20px top 7px/);
 assert.match(owned,/right 25px bottom 7px/);
 assert.match(owned,/156px 1px, 116px 1px, 176px 1px, 130px 1px/);
 assert.match(owned,/pointer-events:none/);
 assert.doesNotMatch(owned,/atlas-cartouche|dashboard-frontispiece-seal|border:\s*[2-9]px|\.topbar\b|\.nav-item\b/);
 assert.match(dashboard,/<header class="dashboard-hero card dashboard-frontispiece" data-atlas-o-decor>/);
 assert.match(dashboard,/id="atlasDashboardRefresh" type="button"/);
 assert.doesNotMatch(dashboard,/dashboard-frontispiece-seal/);
});
test('simple hollow ledger title, unchanged semantic heading and six KPI calculations',()=>{
 assert.match(dashboard,/<h3 id="dashboardKpiHeading" data-atlas-o-decor>핵심 통계<\/h3>/);
 assert.match(dashboard,/<section class="dashboard-kpi-grid" aria-labelledby="dashboardKpiHeading">/);
 assert.match(owned,/inset:-4px -40px -4px -7px/);
 assert.doesNotMatch(owned,/min-height:28px|width:132px|padding:2px 14px/);
 assert.match(owned,/width:5px/);
 assert.match(owned,/height:5px/);
 assert.match(owned,/background:none/);
 assert.doesNotMatch(owned,/\.dashboard-kpi(?=\b|[-.])|\.dashboard-panel|\.person-card|\.spacetime-|\.dashboard-domain-swatch/);
 for(const k of ['persons','activities','polities','domain','namuwiki','spatial']){
  assert.equal(count(dashboard,new RegExp('kpiCard\\(\\{code:"'+k+'"','g')),1,k);
 }
 assert.match(dashboard,/root\.querySelector\("#atlasDashboardRefresh"\)\?\.addEventListener\("click"/);
 assert.match(dashboard,/class="dashboard-panel card"/);
});
test('mobile and high-contrast ornament reduction: no hit targets or camera changes',()=>{
 assert.match(owned,/@media \(max-width:900px\)/);
 assert.match(owned,/@media \(max-width:600px\)/);
 assert.match(owned,/\.dashboard-frontispiece::after \{\s*opacity:0;/);
 assert.match(owned,/inset:-3px -27px -3px -6px/);
 assert.match(owned,/::after \{\s*display:none;/);
 assert.match(owned,/@media \(forced-colors:active\)/);
 assert.match(owned,/opacity:0!important/);
 assert.doesNotMatch(owned,/position:fixed|pointer-events:auto|@keyframes|animation:/);
 assert.match(html,/id="mobileMenuButton"/);
 assert.match(html,/data-atlas-domain="geometry"/);
});
