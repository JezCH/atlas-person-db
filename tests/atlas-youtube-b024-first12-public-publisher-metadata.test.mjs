import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";

const audit=JSON.parse(readFileSync(new URL("../audits/youtube-b024-first-12-public-publisher-metadata-20261017.json",import.meta.url),"utf8"));
const request=JSON.parse(readFileSync(new URL("../audits/youtube-b024-first-12-metadata-review-request.json",import.meta.url),"utf8"));
test("indexed public publisher metadata for ONE original Dalí video never becomes channel or content certification",()=>{
 assert.equal(audit.public_youtube_video_page_matching_original_id_found,1);
 assert.equal(audit.official_youtube_data_api_calls,0);
 assert.equal(audit.exact_source_channel_id_verified_in_public_result,0);
 assert.equal(audit.actual_video_playback_reviews,0);
 assert.equal(audit.timestamped_transcript_evidence_reviews,0);
 assert.equal(audit.person_primary_content_confirmed,0);
 assert.equal(audit.publication_allowed,false);
 assert.deepEqual(audit.records.map(x=>x.original_video_id),request.videos.map(x=>x.video_id));
 const python=String.raw`
import importlib.util,copy,json,pathlib
p=pathlib.Path
spec=importlib.util.spec_from_file_location("t",p("scripts/youtube-b024-first-12-topic-triage.py"))
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
doc=json.loads(p("audits/youtube-b024-first-12-public-publisher-metadata-20261017.json").read_text())
req=json.loads(p("audits/youtube-b024-first-12-metadata-review-request.json").read_text())
assert m.validate_public_publisher_metadata(doc,req)=={
"indexed_original_video_matches":1,"original_channels_verified":0,
"content_verified_person_video_ids":0,"production_publication_allowed":False}
def reject(bad,contains):
 try:m.validate_public_publisher_metadata(bad,req)
 except ValueError as e:assert contains in str(e),(contains,str(e))
 else:raise AssertionError("invalid evidence accepted "+contains)
for field,value in [
 ("official_youtube_data_api_calls",1),
 ("exact_source_channel_id_verified_in_public_result",1),
 ("actual_video_playback_reviews",1),
 ("person_primary_content_confirmed",1),
 ("publication_allowed",True)]:
 bad=copy.deepcopy(doc);bad[field]=value
 reject(bad,"PUBLIC_SEARCH_RESULT_CANNOT_AUTHORIZE_PERSON_VIDEO")
for field,value in [
 ("original_video_id","AAAAAAAAAAA"),
 ("original_channel_id","UC"+"A"*22),
 ("original_title","Other figure biography"),
 ("original_name_cues",[]),
 ("source_youtube_channel_id_verified",True),
 ("publication_content_metadata_ready",True),
 ("actual_subject_video_confirmed",True)]:
 bad=copy.deepcopy(doc);bad["records"][2][field]=value
 reject(bad,"PUBLIC_METADATA_" if field!="original_video_id" else "PUBLIC_METADATA_REVIEW_ORIGINAL_IDS_CHANGED")
bad=copy.deepcopy(doc);bad["records"][2]["indexed_publisher_description"]="content watched and verified"
reject(bad,"PUBLIC_PUBLISHER_EVIDENCE_DOES_NOT_MATCH_SOURCE")
bad=copy.deepcopy(doc);bad["records"][0]["evidence_status"]="INDEXED_PUBLIC_YOUTUBE_PUBLISHER_DESCRIPTION"
reject(bad,"PUBLIC_PUBLISHER_EVIDENCE_DOES_NOT_MATCH_SOURCE")
bad=copy.deepcopy(doc);bad["records"][0]["source_youtube_video_id_match"]=True
reject(bad,"PUBLIC_SEARCH_MISS_IS_NOT_VERIFIED_VIDEO")
print("1 indexable publisher description; 2 unresolved exact Video IDs; 0 channel/subject approvals")
`;
 const result=spawnSync("python3",["-c",python],{encoding:"utf8",timeout:30000});
 assert.equal(result.status,0,result.stderr||result.stdout);
});
