import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const script=fs.readFileSync(new URL("../atlas-registration-review.js",import.meta.url),"utf8");
const styles=fs.readFileSync(new URL("../atlas-registration-review.css",import.meta.url),"utf8");

test("canonical registered Person and queue stats remain on the review surface",()=>{
  for(const id of ["registrationRegisteredStats","registrationQueueBody","registrationQueueSearch","registrationReviewStatus","registrationReviewRefresh"])
    assert.ok(script.includes(id),id);
  for(const label of ["기등록 인물","역사적 실존","원본 등록 활동","비연대표 인물","현재 미등록 후보","등록대기열"])
    assert.ok(script.includes(label),label);
  assert.match(script,/renderRegistered\(persons,queue\)/);
  assert.match(script,/renderQueue\(queue\)/);
});
test("registration remains safely responsive and accessible",()=>{
  assert.match(script,/window\.addEventListener\("focus",\(\)=>refresh\(\{ forcePersons:true \}\)/);
  assert.match(script,/setInterval\([\s\S]*REFRESH_INTERVAL_MS/);
  assert.match(script,/cache:"no-store"/);
  assert.match(styles,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(styles,/registration-review-queue-table/);
  assert.match(styles,/atlas-focus-ring/);
  assert.match(styles,/@media\(max-width:600px\)/);
});
test("review UI requests only current canonical Person and candidate records",()=>{
  assert.ok(script.includes('const QUEUE_URL="/api/atlas-read?__atlas_read_surface=registration-queue"'));
  assert.match(script,/dataStore\.loadPersons/);
  assert.doesNotMatch(script,/channel_count|video_count|signalRows|livingEvidence|source_original_biography_title_video_ids/);
});
