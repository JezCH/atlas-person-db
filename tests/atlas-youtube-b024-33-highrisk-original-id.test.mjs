import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";

const manifest=JSON.parse(fs.readFileSync(new URL("../audits/youtube-b024-33-highrisk-original-video-refs.json",import.meta.url),"utf8"));

test("33 critical source-label anomalies retain exact original Video IDs, and fail closed in a real nested-gzip replay",()=>{
 assert.equal(manifest.schema,"atlas-youtube-b024-33-highrisk-original-video-refs/v1");
 assert.equal(manifest.rows.length,33);
 assert.equal(manifest.total_name_form_differences,865);
 assert.equal(manifest.historical_biography_approved,false);
 const samples=manifest.rows.flatMap(r=>r.original_example_video_ids);
 assert.equal(samples.length,165);
 assert.equal(new Set(samples).size,164);
 assert.equal(manifest.rows.filter(r=>r.source_title_label_review==="NON_PERSON_EXACT_LABEL").length,15);
 assert.equal(manifest.rows.filter(r=>r.source_title_label_review==="HISTORICAL_PERSON_NAME_REVIEW").length,16);
 assert.equal(manifest.rows.filter(r=>r.source_title_label_review==="HOLD_IDENTITY_OR_LIVING").length,2);
 assert.equal(manifest.rows.find(r=>r.raw_name==="Martin Luther").original_example_video_ids.includes("-YFLVaoppvo"),true);
 assert.equal(manifest.rows.find(r=>r.raw_name==="Martin Luther King Jr").original_example_video_ids.includes("-YFLVaoppvo"),true);
 const p=spawnSync("python3",["-m","unittest","discover","-s","tests",
    "-p","test_youtube_b024_33_highrisk_original_id_replay.py","-v"],{encoding:"utf8",timeout:30000});
 assert.equal(p.status,0,p.stderr+"\n"+p.stdout);
 assert.match(p.stderr,/Ran 4 tests/);
 assert.match(p.stderr,/OK/);
});
