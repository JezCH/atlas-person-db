import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../atlas-ui-phase3-ornaments.css',import.meta.url),'utf8');
const body=html.slice(html.indexOf('<body>'),html.indexOf('<div id="toast"'));
const scope=css.slice(css.indexOf('/* VIS3-04'));
const count=(r)=>(body.match(r)||[]).length;
test('one last-stage canonical kit, existing shell roots and unchanged authority routes',()=>{
 assert.equal((html.match(/atlas-ui-phase3-ornaments\.css\?v=/g)||[]).length,1);
 assert.ok(html.indexOf('atlas-ui-phase3-ornaments.css?v=')>html.indexOf('atlas-vis2-12-interaction-motion.css?v='));
 for(const n of ['workspace-shell','mobile-appbar','mobile-drawer'])
  assert.equal(count(new RegExp('class="'+n+' atlas-ornament-v3"','g')),1);
 for(const d of ['dashboard','persons','polities','places','events','sources','geometry'])
  assert.equal(count(new RegExp('data-atlas-domain="'+d+'"','g')),2,d);
 assert.doesNotMatch(html+css,/atlas-ui-ornament-kit-v3\.css|assets\/ornaments\//);
});
test('title, appbar, version and status remain unobstructed DOM with working navigation',()=>{
 assert.match(html,/id="mobileMenuButton"[^>]*aria-controls="mobileDrawer"/);
 assert.match(html,/id="mobileMenuClose"[^>]*aria-label="닫기"/);
 assert.match(html,/class="topbar"><div><p class="eyebrow">인물 데이터셋/);
 assert.match(html,/class="mobile-appbar-title"><strong>인물<\/strong><small>ATLAS 편집<\/small>/);
 assert.match(html,/id="connectionStatus"/);
 assert.match(html,/class="brand"><div class="brand-mark atlas-o-shell-signet" data-atlas-o-decor/);
 assert.match(html,/class="mobile-brand"><span class="mobile-brand-mark atlas-o-shell-signet" data-atlas-o-decor/);
 assert.doesNotMatch(html,/atlas-o-shell-cartouche|atlas-o-shell-folio|atlas-o-shell-mobile-mast|atlas-o-shell-brand/);
 assert.equal(count(/ATLAS 편집 v0\.5/g),2);
});
test('only brand signet and dashboard corner reuse original safe SVG; accessibility and toggle preserved',()=>{
 assert.ok(scope.length>1000);
 for(const file of ['atlas-compass-rosette.svg','atlas-corner-filigree.svg'])
  assert.ok(scope.includes('assets/ui-ornaments/'+file));
 assert.doesNotMatch(scope,/atlas-cartouche\.svg|atlas-folio-plaque\.svg|atlas-chapter-divider\.svg/);
 assert.match(scope,/opacity:calc\(var\(--atlas-o-ornament-presence\) \* \.44\)/);
 assert.match(css,/data-atlas-ornament="off"/);
 assert.match(css,/pointer-events:none/);
 assert.match(css,/@media \(forced-colors:active\)/);
 assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
});
test('UI8 mobile 58px menu and Person/Spacetime geometry unaffected',()=>{
 const r=fs.readFileSync(new URL('../atlas-ui-mobile-v8.css',import.meta.url),'utf8');
 assert.match(r,/\.mobile-appbar \{\s*height: 58px;/);
 assert.match(scope,/@media \(max-width:600px\)/);
 assert.doesNotMatch(scope,/\.person-card|\.spacetime-camera|\.spacetime-year-axis|--atlas-domain|data-person-id|\.nav-item|\.mobile-menu-button/);
 assert.doesNotMatch(scope,/fetch\(|addEventListener|position:fixed/);
});
