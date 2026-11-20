import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const css=fs.readFileSync(new URL("../atlas-person-monumental-register.css",import.meta.url),"utf8");
const acceptance=fs.readFileSync(new URL("../scripts/verify-ui-v10-production-visual.mjs",import.meta.url),"utf8");

test("mobile Activity date content wraps at its parent column instead of extending the document",()=>{
  const origin=css.indexOf(".person-monumental-register .person-table-activities .person-card-activity-period {");
  assert.ok(origin>0);
  assert.match(css.slice(origin,origin+300),/white-space: nowrap/,"Desktop/compact legacy date convention remains documented");
  const start=css.indexOf("/* UI-01 mobile overflow fix:");
  assert.ok(start>origin);
  const end=css.indexOf("@media (max-width: 340px)",start);
  assert.ok(end>start);
  const block=css.slice(start,end);
  assert.match(block,/@media \(max-width: 760px\)/);
  assert.match(block,/\.person-monumental-register \.person-table-activities \.person-card-activity-period\s*\{/);
  assert.match(block,/flex: 0 1 auto/);
  assert.match(block,/min-inline-size: 0/);
  assert.match(block,/max-inline-size: 100%/);
  assert.match(block,/white-space: normal/);
  assert.match(block,/overflow-wrap: anywhere/);
  assert.doesNotMatch(block,/text-overflow:\s*ellipsis|display:\s*none|overflow-x:\s*hidden/,
    "Do not conceal registered BCE/CE dates by clipping or dropping text");
});

test("existing small-mobile two-line Activity date behavior and real Production Chrome assertion remain",()=>{
  assert.match(css,/@media \(max-width: 340px\) \{[\s\S]*\.person-monumental-register \.person-table-activities \.person-card-activity-period \{/);
  assert.match(css,/flex-basis: 100%/);
  assert.match(acceptance,/Person mobile page has horizontal document overflow/);
  assert.match(acceptance,/bodyScrollWidth<=391/);
  assert.match(acceptance,/overflowProbe/);
  assert.doesNotMatch(css,/UI-01 acceptance checkpoint \(2026-11-20\)/,
    "Remove the one-shot probe-only CSS comment in the actual repair");
});
