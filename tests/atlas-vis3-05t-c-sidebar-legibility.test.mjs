import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('atlas-ui-visual-foundation.css');
const html=read('index.html');
const nav=read('atlas-main-authority-nav.js');
const responsive=read('atlas-responsive-shell.css');
const marker='/* VIS3-05T-C';
const added=css.slice(css.indexOf(marker));
test('VIS3-05T-C edits one existing shell stylesheet with correct cache bust',()=>{
 assert.ok(css.includes(marker));
 assert.match(html,/atlas-ui-visual-foundation\.css\?v=20261010-vis3-05t-c-navlegibility-v1/);
 assert.equal((html.match(/atlas-ui-visual-foundation\.css\?v=/g)||[]).length,1);
 assert.match(added,/\.nav-list \.nav-item small \{/);
 assert.match(added,/\.sidebar-foot \{/);
 assert.match(added,/\.brand span \{/);
 assert.doesNotMatch(added,/^\s*\.mobile-nav|^\s*\.dashboard-|^\s*\.spacetime-|@keyframes|url\(/m);
});
test('long routes get second-row status and preserve exact semantics',()=>{
 for(const domain of ['spacetime','polities','places','events','geometry'])assert.ok(added.includes('[data-atlas-domain="'+domain+'"]'),domain);
 assert.match(added,/grid-template-columns:\s*20px minmax\(0, 1fr\)/);
 assert.match(added,/grid-template-rows:\s*auto auto/);
 assert.match(added,/grid-column:\s*2/);
 assert.match(added,/grid-row:\s*2/);
 assert.match(added,/word-break:\s*keep-all/);
 assert.match(nav,/status\.textContent = meta\.status_label/);
 assert.match(nav,/button\.innerHTML = \`<span>⌗<\/span>\$\{label\}<small>\$\{status\}<\/small>\`/);
 for(const d of ['dashboard','persons','polities','places','events','sources','geometry'])assert.match(html,new RegExp('data-atlas-domain="'+d+'"'));
 assert.doesNotMatch(added,/\[data-atlas-domain="dashboard"\]|\[data-atlas-domain="persons"\]|\[data-atlas-domain="registration"\]|\[data-atlas-domain="sources"\]/);
});
test('collapsed 68px rail and mobile drawer remain owned by responsive source',()=>{
 assert.match(added,/\.workspace-shell:not\(\.sidebar-collapsed\) \.nav-list/);
 assert.match(responsive,/\.workspace-shell\.sidebar-collapsed \.nav-item\{grid-template-columns:1fr/);
 assert.match(responsive,/\.workspace-shell\.sidebar-collapsed \.sidebar-compact-action>small,/);
 assert.match(responsive,/@media\(max-width:1239px\) and \(min-width:761px\)/);
 assert.match(html,/class="mobile-nav"/);
 assert.match(html,/id="mobileMenuButton"/);
});
