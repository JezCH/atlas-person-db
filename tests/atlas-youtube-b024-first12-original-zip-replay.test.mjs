import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";

const report=JSON.parse(readFileSync(new URL("../audits/youtube-b024-first-12-original-zip-direct-replay-20261018.json",import.meta.url),"utf8"));
const triage=JSON.parse(readFileSync(new URL("../audits/youtube-b024-first-12-original-title-triage-20261016.json",import.meta.url),"utf8"));
const three=JSON.parse(readFileSync(new URL("../audits/youtube-b024-first-12-metadata-review-request.json",import.meta.url),"utf8"));

test("actual restored 2.23m-video B024 ZIP replay pins 12 exact Video ID/channel/title tuples, NOT real viewed content",()=>{
 assert.equal(report.original_zip_sha256,"8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946");
 assert.equal(report.original_zip_bytes,85284047);
 assert.equal(report.original_channel_count,10127);
 assert.equal(report.original_video_rows,2230031);
 assert.equal(report.reviewed_original_video_ids,12);
 assert.equal(report.matched_original_video_id_count,12);
 assert.equal(report.matched_exact_original_channel_and_title_count,12);
 assert.deepEqual(report.mismatches,[]);
 assert.deepEqual(report.records.map(x=>x.video_id),
  [...triage.records.map(x=>x.video_id)].sort());
 assert.equal(three.unique_original_video_ids,3);
 assert.equal(report.original_video_content_watched_or_timestamped_transcript_verified,0);
 assert.equal(report.official_youtube_current_channel_id_verified,0);
 assert.equal(report.publication_authorized,false);
 const p=spawnSync("python3",["-m","unittest","discover","-s","tests",
  "-p","test_youtube_b024_first12_original_zip_replay.py","-v"],{encoding:"utf8",timeout:30000});
 assert.equal(p.status,0,p.stderr+"\n"+p.stdout);
 assert.match(p.stderr,/Ran 4 tests/);
 assert.match(p.stderr,/OK/);
});
