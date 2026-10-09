import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const svgs = [
 'atlas-cartouche.svg','atlas-compass-rosette.svg','atlas-corner-filigree.svg',
 'atlas-chapter-divider.svg','atlas-folio-plaque.svg','atlas-astrolabe.svg',
 'atlas-codex-panel.svg','atlas-illuminated-initial.svg'
];
const cssPath=path.join(root,'atlas-ui-phase3-ornaments.css');
const css=fs.readFileSync(cssPath,'utf8');
test('eight distinct SVG primitives exist, are standalone, and contain no script, embedded faces, external resources or historical assertions',()=>{
 assert.equal(new Set(svgs).size,8);
 for (const name of svgs) {
  const svg=fs.readFileSync(path.join(root,'assets/ui-ornaments',name),'utf8');
  assert.match(svg,/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="[0-9 ]+" fill="none" aria-hidden="true">/);
  assert.match(svg,/<desc>[^<]+<\/desc>/);
  assert.match(svg,/<\/svg>\s*$/);
  assert.doesNotMatch(svg,/<(?:script|image|foreignObject|text|animate|animateTransform)\b|onload=|onerror=|(?:https?:)?\/\/[^<]*\.(?:png|jpg|gif)/i);
  assert.ok(svg.length>350, name+' should contain authentic ornamental drawing');
 }
});
test('every referenced asset path resolves and no foreign CSS imports are used',()=>{
 const sharedKit=css.split('/* VIS3-04')[0];
 const originalPaths=[...sharedKit.matchAll(/url\(["']?([^)"']+)["']?\)/g)].map(m=>m[1]);
 assert.equal(originalPaths.length,8,'VIS3-03 keeps its original eight reusable primitives');
 const allPaths=[...css.matchAll(/url\(["']?([^)"']+)["']?\)/g)].map(m=>m[1]);
 assert.ok(allPaths.length>=originalPaths.length,'VIS3-04 can reuse assets without changing primitive count');
 for(const item of allPaths) assert.ok(fs.statSync(path.resolve(root,item)).isFile(),item);
 assert.doesNotMatch(css,/@import\b|@font-face\b|https?:\/\//i);
});
test('CSS only mounts within an explicit namespace, preserves semantic brand tokens and provides opt-out/accessibility',()=>{
 assert.match(css,/\.atlas-ornament-v3\s*\{/);
 assert.match(css,/data-atlas-ornament="off"/);
 assert.match(css,/pointer-events:none/);
 assert.match(css,/user-select:none/);
 assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media \(forced-colors:active\)/);
 assert.match(css,/@media \(max-width:760px\)/);
 assert.match(css,/--atlas-honor-metal-strong/);
 assert.doesNotMatch(css,/^\s*:root\s*\{|(?:--atlas-(?:canvas|honor-metal|text-strong))\s*:/m);
 assert.doesNotMatch(css,/\.person-register-entry|\.spacetime-camera|\.spacetime-year-axis|#spacetime/i);
});
test('demo stays isolated and VIS3-04 mounts one canonical kit only on shell chrome',()=>{
 const demo=fs.readFileSync(path.join(root,'experiments/vis3-03-ornament-gallery.html'),'utf8');
 const prod=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(demo,/atlas-ui-phase3-ornaments\.css/);
 assert.match(demo,/atlas-ornament-v3/);
 assert.match(demo,/data-atlas-o-decor/);
 assert.match(prod,/atlas-ui-phase3-ornaments\.css\?v=20261010-vis3-05-restraint-v1/);
 assert.doesNotMatch(prod,/assets\/ui-ornaments\/.*?\.svg/);
 assert.match(prod,/workspace-shell atlas-ornament-v3/);
 assert.match(prod,/mobile-appbar atlas-ornament-v3/);
 assert.match(prod,/mobile-drawer atlas-ornament-v3/);
});


test('one VIS3-03 authority: legacy duplicate toolkit cannot re-enter main',()=>{
 const retired=[
  'atlas-ui-ornament-kit-v3.css',
  'experiments/vis3-03-ornament-showcase.html',
  'tests/atlas-vis3-03-ornament-kit.test.mjs',
  'assets/ornaments/atlas-v3-astrolabe.svg',
  'assets/ornaments/atlas-v3-cartouche.svg',
  'assets/ornaments/atlas-v3-chapter-flourish.svg',
  'assets/ornaments/atlas-v3-corner.svg',
  'assets/ornaments/atlas-v3-illuminated-initial.svg'
 ];
 for(const item of retired) assert.ok(!fs.existsSync(path.join(root,item)),item+' must stay retired');
 const history=fs.readFileSync(path.join(root,'docs/ui/UI_PHASE_III_VIS3_03_ORNAMENT_KIT_20261009.md'),'utf8');
 assert.match(history,/HISTORICAL \/ SUPERSEDED/);
 assert.ok(fs.existsSync(cssPath),'canonical toolkit remains intact');
});
