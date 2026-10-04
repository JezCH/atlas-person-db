import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(path)=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const register=read("atlas-person-monumental-register.css");
const verifier=read("scripts/verify-ui-v10-production-visual.mjs");
const html=read("index.html");

test("P11 restores modest mobile breathing room without returning to cards",()=>{
  const mobile=register.slice(register.indexOf("@media (max-width: 760px)"));
  assert.match(mobile,/padding: 7px 0/);
  assert.match(mobile,/person-register-entry::before[\s\S]*?top: 9px;[\s\S]*?height: 20px/s);
  assert.match(mobile,/person-register-entry\.is-selected::after[\s\S]*?top: 4px;[\s\S]*?bottom: 4px/s);
  assert.doesNotMatch(mobile,/border-radius:\s*(?:[1-9]|\d{2,})px/);
});

test("P11 keeps domain wash subtle and directional rather than filling the whole row",()=>{
  const mobile=register.slice(register.indexOf("@media (max-width: 760px)"));
  assert.match(mobile,/background-image: linear-gradient\([\s\S]*?var\(--person-register-domain-wash\) 0%[\s\S]*?16%[\s\S]*?rgba\(0, 0, 0, 0\) 62%/s);
  assert.match(register,/--person-register-domain-wash: rgba\(212, 175, 55, \.052\)/);
  assert.match(register,/--person-register-domain-wash: rgba\(184, 58, 58, \.042\)/);
  assert.match(register,/--person-register-domain-wash: rgba\(63, 120, 197, \.046\)/);
  assert.match(register,/--person-register-domain-wash: rgba\(46, 139, 87, \.042\)/);
  assert.match(register,/--person-register-domain-wash: rgba\(154, 91, 165, \.042\)/);
  assert.match(register,/--person-register-domain-wash: rgba\(175, 193, 204, \.034\)/);
  assert.match(register,/--person-register-domain-wash: rgba\(217, 107, 30, \.044\)/);
});

test("P11 preserves the P10 center-column scan geometry",()=>{
  const mobileStart=register.indexOf("@media (max-width: 760px)");
  const narrowStart=register.indexOf("@media (max-width: 340px)");
  const mobile=register.slice(mobileStart,narrowStart);
  assert.match(mobile,/grid-template-areas: "identity activities range"/);
  assert.match(mobile,/grid-template-columns: minmax\(82px, \.92fr\) minmax\(0, 1\.35fr\) auto/);
});

test("P11 Production acceptance enforces a breathing-density band and rendered wash",()=>{
  assert.match(verifier,/ordinaryMedianHeight>=30&&mobileMain\.ordinaryMedianHeight<=56/);
  assert.match(verifier,/linear-gradient\/i\.test\(mobileMain\.firstDomainBackgroundImage/);
  assert.match(verifier,/firstDomainBackgroundImage/);
});

test("P11 publishes the breathing-domain-wash Register asset",()=>{
  assert.match(html,/atlas-person-monumental-register\.css\?v=20261004-ui-p11-breathing-wash-v2/);
});
