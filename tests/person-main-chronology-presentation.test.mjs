import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../atlas-person-main.js", import.meta.url), "utf8");

test("Main folds chronology certainty into date labels instead of extra status rows", () => {
  assert.match(source, /boundary\.certainty === "approximate"/);
  assert.match(source, /return `약 \$\{label\}`/);
  assert.match(source, /boundary\.certainty === "uncertain"/);
  assert.match(source, /return `\$\{label\}\?`/);

  assert.doesNotMatch(source, /`chronology: \$\{activity\.chronology_status\}`/);
  assert.doesNotMatch(source, /`confidence: \$\{activity\.confidence\}`/);
  assert.doesNotMatch(source, /boundary\.granularity, boundary\.certainty, boundary\.calendar/);
  assert.match(source, /연대 불확실성은 활동기간 표기에 직접 반영합니다\./);
});
