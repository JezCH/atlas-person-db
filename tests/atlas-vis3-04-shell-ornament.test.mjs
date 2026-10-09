import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'atlas-ui-phase3-ornaments.css'),'utf8');
const shell=html.slice(html.indexOf('<body>'),html.indexOf('<div id="toast"'));
const count=(re)=>(shell.match(re)||[]).length;

test('one late canonical sheet and three opt-in shell roots',()=>{
 assert.equal((html.match(/atlas-ui-phase3-ornaments\.css\?v=/g)||[]).length,1);
 assert.ok(html.indexOf('atlas-ui-phase3-ornaments.css?v=')>html.indexOf('atlas-vis2-12-interaction-motion.css?v='));
 for(const name of ['workspace-shell','mobile-appbar','mobile-drawer']) {
  assert.equal(count(new RegExp('class="'+name+' atlas-ornament-v3"','g')),1,name);
 }
 assert.doesNotMatch(html+css,/atlas-ui-ornament-kit-v3\.css|assets\/ornaments\//);
});
test('navigation, live heading, version labels and telemetry are intact',()=>{
 assert.match(html,/id="mobileMenuButton"[^>]*aria-controls="mobileDrawer"/);
 assert.match(html,/id="mobileMenuClose"[^>]*aria-label="닫기"/);
 assert.match(html,/class="topbar atlas-o-shell-cartouche" data-atlas-o-decor><div><p class="eyebrow">인물 데이터셋/);
 assert.match(html,/id="connectionStatus"/);
 assert.match(html,/class="mobile-appbar-title atlas-o-shell-mobile-mast" data-atlas-o-decor><strong>인물<\/strong><small>ATLAS 편집<\/small>/);
 assert.match(html,/class="brand atlas-o-shell-brand" data-atlas-o-decor/);
 assert.match(html,/class="mobile-brand atlas-o-shell-brand" data-atlas-o-decor/);
 assert.equal(count(/data-atlas-domain="/g),14);
 for(const d of ['dashboard','persons','polities','places','events','sources','geometry'])
  assert.equal(count(new RegExp('data-atlas-domain="'+d+'"','g')),2,d);
 assert.equal(count(/ATLAS 편집 v0\.5/g),2);
});
test('real reused vector motifs, pseudo-only decoration, opt-out and contrast modes',()=>{
 const scope=css.slice(css.indexOf('/* VIS3-04'));
 for(const f of ['atlas-cartouche','atlas-compass-rosette','atlas-corner-filigree','atlas-chapter-divider','atlas-folio-plaque']) {
  assert.ok(scope.includes('./assets/ui-ornaments/'+f+'.svg'),f);
  assert.ok(fs.existsSync(path.join(root,'assets/ui-ornaments',f+'.svg')));
 }
 for(const name of ['atlas-o-shell-signet','atlas-o-shell-brand','atlas-o-shell-folio','atlas-o-shell-cartouche','atlas-o-shell-mobile-mast']){
  assert.match(shell,new RegExp('class="[^"]*'+name+'[^"]*"[^>]*data-atlas-o-decor'));
  assert.ok(scope.includes('.'+name));
 }
 assert.match(css,/data-atlas-ornament="off"/);
 assert.match(css,/--atlas-o-ornament-presence:0/);
 assert.match(css,/pointer-events:none/);
 assert.match(css,/@media \(forced-colors:active\)/);
 assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
});
test('mobile layout and factual data geometry are outside this visual unit',()=>{
 const responsive=fs.readFileSync(path.join(root,'atlas-ui-mobile-v8.css'),'utf8');
 assert.match(responsive,/\.mobile-appbar \{\s*height: 58px;/);
 assert.match(css,/\.atlas-ornament-v3 \.atlas-o-shell-mobile-mast/);
 assert.match(css,/text-overflow:ellipsis/);
 const scope=css.slice(css.indexOf('/* VIS3-04'));
 assert.doesNotMatch(scope,/\.person-card|\.spacetime-camera|\.spacetime-year-axis|--atlas-domain|data-person-id|\.nav-item|\.mobile-menu-button/);
 assert.doesNotMatch(scope,/fetch\(|addEventListener|position:fixed/);
});
