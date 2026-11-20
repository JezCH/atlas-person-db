import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const script = readFileSync(new URL("../scripts/verify-ui-v10-production-visual.mjs", import.meta.url), "utf8");

test("UI-07 Production smoke calls the verifier own boolean assertion, not Node assert methods", () => {
  assert.match(script, /function assert\(condition,message,details=null\)/);
  assert.match(script, /assert\(selected\[0\]\.id !== selected\[1\]\.id,"Two distinct Persons required"\)/);
  assert.doesNotMatch(script, /\bassert\.(?:notEqual|strictEqual|deepEqual|equal)\(/);
});
