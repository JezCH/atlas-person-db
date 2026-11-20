import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=(name)=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
const css=read("atlas-dashboard.css");
const html=read("atlas-dashboard.js");
const nav=read("atlas-main-authority-nav.js");
const root=read("index.html");
const browser=read("scripts/verify-dashboard-production-acceptance.mjs");

test("VIS-04: both factual mobile Dashboard matrices are natively scrollable rather than unreadable 6–8px grids",()=>{
  const comp=css.slice(css.indexOf("/* VIS-04: six factual completeness columns"),css.indexOf(".dashboard-kpi-action{position:relative}"));
  const heat=css.slice(css.indexOf("/* VIS-04: preserve all reviewed Era × Region values"),css.indexOf("/* Polity concentration */"));
  assert.ok(comp.length>400&&heat.length>400);
  assert.match(comp,/\.dashboard-completeness-wrap\{overflow-x:auto/);
  assert.match(comp,/\.dashboard-completeness\{width:max-content;min-width:760px;table-layout:auto;font-size:12px/);
  assert.match(comp,/\.dashboard-completeness thead th\{font-size:11px/);
  assert.match(comp,/\.dashboard-completeness tbody th small\{font-size:10\.5px/);
  assert.match(heat,/\.dashboard-heatmap-wrap\{overflow-x:auto/);
  assert.match(heat,/\.dashboard-heatmap\{width:max-content;min-width:900px;table-layout:auto;font-size:12px/);
  assert.match(heat,/writing-mode:horizontal-tb/);
  assert.match(heat,/\.dashboard-heatmap tbody td>strong,\.dashboard-heatmap tfoot td>strong\{font-size:12px/);
  assert.doesNotMatch(comp+heat,/overflow-x:hidden|font-size:[6789]px|writing-mode:vertical-rl/);
  assert.match(comp+heat,/overscroll-behavior-x:contain/);
});

test("VIS-04: actual table DOM retains all Activity and completeness data, with keyboard-accessible scroll regions",()=>{
  assert.match(html,/class="dashboard-heatmap-wrap" role="region" aria-label="시대별 권역 활동표, 좌우로 스크롤" tabindex="0"/);
  assert.match(html,/class="dashboard-completeness-wrap" role="region" aria-label="인물과 활동 완성도 표, 좌우로 스크롤" tabindex="0"/);
  assert.match(html,/class="dashboard-completeness-wrap" role="region" aria-label="원본 최신성 표, 좌우로 스크롤" tabindex="0"/);
  assert.match(html,/class="dashboard-heatmap-wrap"[\s\S]*?<table class="dashboard-heatmap">/);
  assert.match(html,/class="dashboard-completeness-wrap"[\s\S]*?<table class="dashboard-completeness">/);
  assert.match(nav,/atlas-dashboard\.css\?v=[^"]+&ui=20261120-readable-matrices-v1/);
  assert.match(nav,/atlas-dashboard\.js\?v=[^"]+&ui=20261120-readable-matrices-v1/);
  assert.match(root,/atlas-main-authority-nav\.js\?v=[^"]+&dashboard=20261120-matrix-scroll-v1/);
});

test("VIS-04: 390px Production Chrome verifies real scroll, text sizes, tap targets and document fit",()=>{
  assert.match(browser,/scroll_probe_x:afterX/);
  assert.match(browser,/keyboard_focusable:el\.tabIndex===0/);
  assert.match(browser,/aria_label:el\.getAttribute\("aria-label"\)/);
  assert.match(browser,/mobileDom\.global_scroll\.overflow_x <= 1/);
  assert.match(browser,/matrix\.scroll_width>matrix\.client_width\+50&&matrix\.scroll_probe_x>0/);
  assert.match(browser,/matrix\.keyboard_focusable&&matrix\.aria_label\?\.includes\("스크롤"\)/);
  assert.match(browser,/mobileDom\.matrix_type\?\.heatmap_header_px>=11/);
  assert.match(browser,/mobileDom\.matrix_type\?\.heatmap_number_px>=12/);
  assert.match(browser,/mobileDom\.matrix_type\?\.completeness_header_px>=11/);
  assert.match(browser,/mobileDom\.matrix_type\?\.completeness_number_px>=12/);
  assert.match(browser,/undersizedTargets\.length === 0/);
});
