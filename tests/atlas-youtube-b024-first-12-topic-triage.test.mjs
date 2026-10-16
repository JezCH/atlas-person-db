import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";

const audit=JSON.parse(readFileSync(new URL("../audits/youtube-b024-first-12-original-title-triage-20261016.json",import.meta.url),"utf8"));
const queue=JSON.parse(readFileSync(new URL("../audits/youtube-b024-first-12-metadata-review-request.json",import.meta.url),"utf8"));
test("source-original 12-video reviewed titles produce only 3 UNVERIFIED metadata priorities",()=>{
  assert.equal(audit.review_count,12);
  assert.equal(audit.person_primary_video_content_approvals,0);
  assert.equal(audit.existing_107_sample_overlap,0);
  assert.equal(new Set(audit.records.map(v=>v.video_id)).size,12);
  assert.equal(audit.review_status_counts.TITLE_NONPRIMARY_REVIEW,8);
  assert.equal(audit.review_status_counts.TITLE_MIXED_FOCUS_HOLD,1);
  assert.equal(audit.review_status_counts.TITLE_PERSON_TOPIC_PLAUSIBLE_UNVERIFIED,3);
  assert.deepEqual(queue.videos.map(v=>v.video_id),["-13y_Jm-pzI","-1CalygxBrM","-5Lg5mk74NA"]);
  assert.equal(queue.actual_metadata_fetched,false);
  assert.equal(queue.person_centered_content_videos_verified,0);
  assert.equal(queue.publication_allowed,false);
  const python=String.raw`
import copy
import importlib.util
import json
from pathlib import Path
spec=importlib.util.spec_from_file_location("yt12",Path("scripts/youtube-b024-first-12-topic-triage.py"))
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
a=json.loads(Path("audits/youtube-b024-first-12-original-title-triage-20261016.json").read_text())
expected=json.loads(Path("audits/youtube-b024-first-12-metadata-review-request.json").read_text())
assert mod.make_priority_request(a)==expected
parent={"schema":mod.PARENT_SCHEMA,"source_snapshot_id":mod.SNAPSHOT,
        "source_zip_sha256":mod.SHA,"source_review_json_sha256":mod.REVIEW,
        "original_per_video_channel_id_verified":True,"publication_allowed":False,
        "unique_original_video_ids":12,"videos":[{k:copy.deepcopy(x[k]) for k in mod.SOURCE_KEYS} for x in a["records"]]}
assert mod.verify_original_parent(a,parent,full=False)
def reject(fn,expect):
    try:fn()
    except ValueError as e:assert expect in str(e),(expect,str(e))
    else:raise AssertionError("invalid data accepted: "+expect)
for field in ("video_id","original_channel_id","original_title","name_cues"):
    altered=copy.deepcopy(parent)
    if field=="name_cues":altered["videos"][0][field][0]["bucket"]="FAKE"
    else:altered["videos"][0][field]+="X"
    reject(lambda:mod.verify_original_parent(a,altered,full=False),"ORIGINAL_VIDEO_CHANNEL_TITLE_NAME_CUE_CHANGED")
duplicate=copy.deepcopy(parent)
duplicate["videos"].append(copy.deepcopy(duplicate["videos"][0]))
duplicate["unique_original_video_ids"]=13
reject(lambda:mod.verify_original_parent(a,duplicate,full=False),"DUPLICATE_ORIGINAL_REQUEST_VIDEO_ID")
new=copy.deepcopy(a)
new["records"][0]["person_primary_content_verified"]=True
reject(lambda:mod.validate_manifest(new),"INVALID_TITLE_ONLY_REVIEW_STATUS")
new=copy.deepcopy(a)
new["records"][0]["review_status"]="PERSON_PRIMARY_CONTENT_CONFIRMED"
reject(lambda:mod.validate_manifest(new),"INVALID_TITLE_ONLY_REVIEW_STATUS")
new=copy.deepcopy(a)
new["original_source_zip_sha256"]="tampered"
reject(lambda:mod.validate_manifest(new),"TRIAGE_SOURCE_FINGERPRINT_MISMATCH")
reject(lambda:mod.verify_original_parent(a,parent,full=True),"ORIGINAL_REQUEST_FULL_POPULATION_MISMATCH")
print("source-bound 12 original Video IDs; 8 negative title reviews, 1 hold, 3 metadata priorities, 0 content approvals")
`;
  const result=spawnSync("python3",["-c",python],{encoding:"utf8",timeout:30000});
  assert.equal(result.status,0,result.stderr||result.stdout);
});
