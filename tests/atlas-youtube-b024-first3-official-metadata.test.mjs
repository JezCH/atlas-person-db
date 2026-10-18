import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";

const req=JSON.parse(readFileSync(new URL("../audits/youtube-b024-first-12-metadata-review-request.json",import.meta.url),"utf8"));
const src=JSON.parse(readFileSync(new URL("../audits/youtube-b024-first-12-original-zip-direct-replay-20261018.json",import.meta.url),"utf8"));
const workflow=readFileSync(new URL("../.github/workflows/youtube-b024-first3-official-metadata.yml",import.meta.url),"utf8");

test("exact original 3-video official metadata runner: six offline tests; no rank publish or automatic historical Person credit",()=>{
 assert.deepEqual(req.videos.map(x=>x.video_id),[
  "-13y_Jm-pzI","-1CalygxBrM","-5Lg5mk74NA"
 ]);
 assert.equal(src.matched_exact_original_channel_and_title_count,12);
 assert.equal(src.original_zip_sha256,req.source_zip_sha256);
 assert.equal(req.publication_allowed,false);
 assert.match(workflow,/workflow_dispatch:/);
 assert.match(workflow,/pull_request:/);
 assert.match(workflow,/permissions:\s*\n\s+contents: read/);
 assert.match(workflow,/github\.ref == 'refs\/heads\/main'/);
 assert.match(workflow,/secrets\.YOUTUBE_DATA_API_KEY/);
 assert.match(workflow,/--fetch/);
 assert.match(workflow,/--metadata-output/);
 assert.match(workflow,/retention-days: 14/);
 assert.doesNotMatch(workflow,/atlas-authoring-apply|supabase|oidc|id-token: write|contents: write/i);
 const result=spawnSync("python3",["-m","unittest","discover","-s","tests",
   "-p","test_youtube_b024_first3_official_metadata.py","-v"],{
  encoding:"utf8",timeout:30000
 });
 assert.equal(result.status,0,result.stderr+"\n"+result.stdout);
 assert.match(result.stderr,/Ran 6 tests/);
 assert.match(result.stderr,/OK/);
});
