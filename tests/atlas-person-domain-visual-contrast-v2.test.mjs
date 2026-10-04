import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root=path.resolve(new URL("..",import.meta.url).pathname);
const css=fs.readFileSync(path.join(root,"atlas-person-domain-palette.css"),"utf8").toLowerCase();
const owner=fs.readFileSync(path.join(root,"atlas-domain-surface-owner.js"),"utf8");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");

const DARK_CANVAS="#121518";
const ON_DARK=Object.freeze({
  governance:"#e6c65a",
  military:"#e06a6a",
  science:"#78a9e8",
  technology:"#a2adb8",
  commerce:"#5bc68a",
  culture:"#c07ac7",
  religion:"#f0e7d0",
  exploration:"#f29a55"
});

function channel(value){
  const s=value/255;
  return s<=0.04045?s/12.92:((s+0.055)/1.055)**2.4;
}
function luminance(hex){
  const value=hex.replace("#","");
  const r=channel(Number.parseInt(value.slice(0,2),16));
  const g=channel(Number.parseInt(value.slice(2,4),16));
  const b=channel(Number.parseInt(value.slice(4,6),16));
  return 0.2126*r+0.7152*g+0.0722*b;
}
function contrast(a,b){
  const hi=Math.max(luminance(a),luminance(b));
  const lo=Math.min(luminance(a),luminance(b));
  return (hi+0.05)/(lo+0.05);
}

test("domain palette and its loader use the P1 dark-name cache key",()=>{
  assert.match(owner,/atlas-person-domain-palette\.css\?v=20261004-ui-p1-dark-name-v1/);
  assert.match(html,/atlas-domain-surface-owner\.js\?v=20261004-ui-p1-dark-name-v1/);
});

test("science reuses the exact established Academic Blue family",()=>{
  assert.match(css,/--atlas-person-domain-science:\s*#3f78c5/);
  assert.match(css,/--atlas-person-domain-science-tint:\s*rgba\(63, 120, 197, 0\.12\)/);
  assert.match(css,/--atlas-person-domain-science-hover:\s*rgba\(63, 120, 197, 0\.18\)/);
  assert.match(css,/--atlas-person-domain-science-selected:\s*rgba\(63, 120, 197, 0\.22\)/);
  assert.doesNotMatch(css,/atlas-person-domain-knowledge/);
});

test("all eight dark-surface Person-name colors meet WCAG AA against the ATLAS canvas",()=>{
  for(const [domain,hex] of Object.entries(ON_DARK)){
    assert.match(css,new RegExp(`--atlas-person-domain-${domain}-on-dark:\\s*${hex}`));
    assert.ok(
      contrast(hex,DARK_CANVAS)>=4.5,
      `${domain} contrast must be >= 4.5, got ${contrast(hex,DARK_CANVAS).toFixed(2)}`
    );
  }
});

test("NamuWiki link and visited states preserve semantic on-dark foreground in the Monumental Register",()=>{
  assert.match(css,/\.person-monumental-register \.person-card\[data-representative-domain\] \.person-main-name-link:visited/);
  assert.match(css,/color:\s*var\(--person-domain-on-dark\)/);
  assert.match(css,/\.person-monumental-register \.person-card\[data-representative-domain\] \.person-main-name-link:hover/);
  assert.match(css,/outline:\s*1px solid var\(--atlas-honor-metal-strong/);
  assert.doesNotMatch(css,/\.person-card\[data-representative-domain\] \.person-main-name-link\s*\{[^}]*color:\s*#34405f/s);
  assert.doesNotMatch(css,/\.person-card\[data-representative-domain\] \.person-main-name-link:hover\s*\{[^}]*color:\s*#202b40/s);
});
