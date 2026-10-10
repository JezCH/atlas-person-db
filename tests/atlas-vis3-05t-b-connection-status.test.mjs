import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=n=>fs.readFileSync(new URL('../'+n,import.meta.url),'utf8');
const css=read('atlas-ui-visual-foundation.css');
const html=read('index.html');
const nav=read('atlas-main-authority-nav.js');
test('connection status hidden attribute outranks the ordinary inline-flex display rule',()=>{
 assert.match(read('styles.css'),/\.status\{display:inline-flex/);
 assert.match(css,/#connectionStatus\[hidden\]\s*\{\s*display:\s*none\s*;\s*\}/);
 assert.match(html,/atlas-ui-visual-foundation\.css\?v=20261010-vis3-05t-b-hidden-v1/);
 assert.equal((html.match(/atlas-ui-visual-foundation\.css\?v=/g)||[]).length,1);
 assert.match(html,/id="connectionStatus" class="status status-warn">연결 확인 중/);
 assert.match(nav,/if \(connectionStatus\) connectionStatus\.hidden = false/);
 assert.match(nav,/if \(connectionStatus\) connectionStatus\.hidden = true/);
 assert.match(nav,/if \(domain === "persons"\)/);
 assert.doesNotMatch(css,/\.status\s*\{\s*display:\s*none/);
});
test('status visibility CSS is isolated from database, KPI, domain colors, camera',()=>{
 const fix=css.slice(css.indexOf('/* VIS3-05T-B'),css.indexOf('.status-ok { color: var(--atlas-success)'));
 assert.match(fix,/#connectionStatus\[hidden\]/);
 assert.doesNotMatch(fix,/\.dashboard-|\.person-|\.spacetime-|--atlas-domain|fetch\(|transform:|animation:/);
});
