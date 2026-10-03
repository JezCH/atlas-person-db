import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const root=path.resolve(new URL("..",import.meta.url).pathname);
const css=fs.readFileSync(path.join(root,"atlas-person-domain-palette.css"),"utf8").toLowerCase();
const owner=fs.readFileSync(path.join(root,"atlas-domain-surface-owner.js"),"utf8");

test("domain palette is loaded with the v2 cache key",()=>{assert.match(owner,/atlas-person-domain-palette\.css\?v=20261004-person-domain-v2/);});
test("science reuses the exact established Academic Blue family",()=>{
  assert.match(css,/--atlas-person-domain-science:\s*#3f78c5/);
  assert.match(css,/--atlas-person-domain-science-tint:\s*rgba\(63, 120, 197, 0\.12\)/);
  assert.match(css,/--atlas-person-domain-science-hover:\s*rgba\(63, 120, 197, 0\.18\)/);
  assert.match(css,/--atlas-person-domain-science-selected:\s*rgba\(63, 120, 197, 0\.22\)/);
  assert.doesNotMatch(css,/atlas-person-domain-knowledge/);
});
