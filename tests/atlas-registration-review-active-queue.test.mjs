import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../atlas-registration-review.js", import.meta.url), "utf8");

test("registration review presents only the live pending queue as queue state", () => {
  assert.match(source, /const REFRESH_INTERVAL_MS=10000;/);
  assert.match(source, /"등록대기열"/);
  assert.match(source, /"현재 미등록 후보"/);
  assert.match(source, /renderRegistered\(persons,queue\)/);
  assert.doesNotMatch(source, /id="registrationQueueStats"/);
  assert.doesNotMatch(source, /statCard\(number\(summary\.registered_bound\),"기등록 연결"\)/);
  assert.doesNotMatch(source, /statCard\(number\(summary\.source_admissions\),"누적 후보"\)/);
  assert.doesNotMatch(source, /statCard\(number\(summary\.dangling_person_ids\),"dangling Person ID"\)/);
});

test("registration review refreshes live queue state automatically and on focus", () => {
  assert.match(source, /setInterval\([\s\S]*REFRESH_INTERVAL_MS/);
  assert.match(source, /window\.addEventListener\("focus",\(\)=>refresh\(\{ forcePersons:true \}\)/);
  assert.match(source, /cache:"no-store"/);
});
