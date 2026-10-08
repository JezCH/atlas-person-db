import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const text=(p)=>fs.readFileSync(path.join(root,p),"utf8");

test("P2-01 France review must not be terminal while known duplicate UUID and regime overlaps remain",()=>{
  const context={window:{}};
  vm.runInNewContext(text("atlas-polity-review-registry.js"),context);
  const reg=context.window.ATLAS_POLITY_REVIEW_REGISTRY;
  assert.equal(reg.schema,"atlas-polity-review-registry/v3");
  const france=reg.historical_family_reviews.find(x=>x.id==="france-regime-family");
  assert.ok(france);
  assert.equal(france.status,"REVIEW_REQUIRED");
  assert.equal(france.terminal_status,null);
  assert.equal(france.suggested_action,"hold");
  assert.match(france.rationale,/P2-01/);
  assert.match(france.rationale,/65/);
  assert.match(france.rationale,/P2-01A/);
  assert.match(france.rationale,/P2-01B/);
  assert.match(france.rationale,/P2-01C/);
  assert.equal(france.left.polity_id,undefined,"do not bind an umbrella family seed to one arbitrary UUID");
  assert.equal(france.right.polity_id,undefined,"do not identify whole regime family with one surviving royal Polity");
  const prior=reg.resolved_history.find(x=>x.id==="france-duplicate-fixed");
  assert.equal(prior.status,"FIXED","old #1357/#1378 closure is preserved as historical proof");
  assert.ok(france.evidence.some(x=>x.includes("#1357")&&x.includes("#1378")));
  const audit=text("docs/POLITY_P2_01_FRANCE_REGIME_FAMILY_AUDIT_20261008.md");
  assert.match(audit,/8 live Polities/);
  assert.match(audit,/65 Authoring/);
  assert.match(audit,/65 Runtime/);
  assert.match(audit,/P2-01A/);
  assert.match(text("docs/ATLAS_CURRENT_WORKSTREAMS.md"),/Immediate bounded next unit: `POLITY-P2-01A`/);
});