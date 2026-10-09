import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
const text = path => readFileSync(new URL("../" + path, import.meta.url),"utf8");
const dir="assets/ornaments/v3/";
const names=["cartouche","corner","chapter-rule","folio-plaque","rosette","portrait-frame","illuminated-foliage","astrolabe"];
test("VIS3-03 eight self-contained original ornament SVGs",()=>{
 for(const name of names){
  const svg=text(dir+name+".svg");
  assert.match(svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg,/viewBox="0 0 \d+ \d+"/);
  assert.match(svg,/aria-hidden="true"/);
  assert.match(svg,/focusable="false"/);
  assert.match(svg,/<title>/);
  assert.match(svg,/<\/svg>$/);
  assert.doesNotMatch(svg,/<script|<foreignObject|onload=|onclick=|<image|<text|xlink:href=/i);
  assert.ok(Buffer.byteLength(svg)<22000,name);
 }
});
test("VIS3-03 CSS only targets opt-in scope and references exactly eight local assets",()=>{
 const css=text("atlas-ui-ornaments-v3.css");
 for(const name of names)assert.ok(css.includes(dir+name+".svg"),name);
 assert.match(css,/\.atlas-v3--cartouche/);
 assert.match(css,/\.atlas-v3--astrolabe/);
 assert.match(css,/\.atlas-v3--portrait-niche/);
 assert.match(css,/\.atlas-v3--codex-panel/);
 assert.match(css,/pointer-events:none/);
 assert.match(css,/prefers-reduced-motion/);
 assert.doesNotMatch(css,/(^|\n)\s*(?:html|body|:root|\.person-register-entry|\.dashboard-kpi|\.person-spacetime-mount)[^{]*\{/m);
 assert.equal(new Set([...css.matchAll(/url\("([^"]+)"\)/g)].map(m=>m[1])).size,names.length);
 assert.ok(Buffer.byteLength(css)<15000);
});
test("VIS3-03 isolated preview is not loaded into active app",()=>{
 assert.doesNotMatch(text("index.html"),/atlas-ui-ornaments-v3\.css|assets\/ornaments\/v3/);
 const html=text("docs/ui/preview/VIS3_03_ORNAMENT_LIBRARY.html");
 assert.match(html,/\.\.\/\.\.\/\.\.\/atlas-ui-ornaments-v3\.css/);
 assert.match(html,/noindex,nofollow/);
 assert.match(html,/atlas-v3--astrolabe/);
 assert.match(html,/atlas-v3--portrait-niche/);
 assert.match(html,/실제 역사 데이터/);
});
test("VIS3-03 leaves non-factual decoration inert",()=>{
 const all=names.map(n=>text(dir+n+".svg")).join("");
 assert.doesNotMatch(all,/<image|href=|<script|<text|official seal|royal coat of arms/i);
 const css=text("atlas-ui-ornaments-v3.css");
 assert.doesNotMatch(css,/@keyframes|url\((['"]?)https?:\/\//);
});
