import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dashboard = readFileSync(new URL("../atlas-dashboard.js", import.meta.url), "utf8");
const acceptance = readFileSync(new URL("../scripts/verify-dashboard-production-acceptance.mjs", import.meta.url), "utf8");

test("Production dashboard Runtime acceptance uses the actual Korean metric labels", () => {
  for (const label of ["최신 런타임", "직전 런타임", "런타임 활동 증감", "런타임 제외 증감"]) {
    assert.ok(dashboard.includes(`<small>${label}</small>`), `live Dashboard renderer missing ${label}`);
    assert.ok(acceptance.includes(`cards["${label}"]`), `Production verifier missing ${label}`);
  }
  for (const outdated of ["최신 Runtime", "직전 Runtime", "Runtime Activity 증감", "Runtime 제외 증감"]) {
    assert.ok(!acceptance.includes(`cards["${outdated}"]`), `outdated acceptance lookup: ${outdated}`);
  }
  // Continue checking numerical agreement and ready state, not only label presence.
  assert.match(acceptance, /renderedInteger\(cards\["최신 런타임"\]\?\.value\) === runtimeDelta\.latest\.row_count/);
  assert.match(acceptance, /cards\["최신 런타임"\]\?\.state === "ready"/);
});
