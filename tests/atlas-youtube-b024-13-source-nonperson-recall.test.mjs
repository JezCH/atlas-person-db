import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {spawnSync} from "node:child_process";

const require=createRequire(import.meta.url);
const quality=require("../scripts/youtube-person-signal-quality-rules.v2.json");
const review=require("../audits/youtube-b024-13-critical-nonperson-original-video-review-20261018.json");
const discovery=require("../server/atlas-youtube-unregistered-discovery-read-service.js");
const labels=review.rows.map(x=>x.name);

test("all 13 source-original high-risk nonpersons are consistently excluded BEFORE and AFTER registered-person screening",()=>{
 assert.equal(review.schema,"atlas-youtube-b024-13-exact-nonperson-source-review/v1");
 assert.equal(review.source_original_zip_sha256,"8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946");
 assert.equal(review.source_channels,10127);
 assert.equal(review.source_videos,2230031);
 assert.equal(review.missing_in_source_quality_before_this_review,13);
 assert.equal(quality.version,"reviewed-20261018-v4");
 assert.equal(quality.source_original_video_id_nonperson_13_review,
   "audits/youtube-b024-13-critical-nonperson-original-video-review-20261018.json");
 assert.equal(labels.length,13);
 assert.equal(new Set(labels).size,13);
 assert.equal(new Set(labels.map(discovery.identityKey)).size,13);
 assert.equal(review.rows.reduce((n,r)=>n+r.original_example_video_ids.length,0),65);
 assert.equal(review.source_archive_or_original_video_ids_deleted,false);
 assert.equal(review.historical_person_content_videos_certified,0);
 assert.equal(review.production_publication_approved,false);
 for(const row of review.rows) {
   assert.equal(row.source_name_classification,"EXACT_NON_PERSON_NOT_AN_INDIVIDUAL");
   assert.equal(row.original_example_video_ids.length,5);
   assert.equal(new Set(row.original_example_video_ids).size,5);
   assert.ok(row.previous_title_channels>=0&&row.recount_title_channels>=0);
   assert.ok(row.previous_title_channels!==row.recount_title_channels||
      row.previous_title_videos!==row.recount_title_videos);
   assert.equal(quality.non_person_exact.includes(row.name),true,row.name);
   assert.equal(discovery.reviewedNonPerson(row.name),true,row.name);
 }
 assert.equal(quality.non_person_exact.includes("Pt 2"),true);
 assert.equal(quality.non_person_exact.includes("3I/Atlas"),true);
 for(const name of ["Martin Luther","Martin Luther King Jr","John F Kennedy",
   "Simón Bolívar","Elizabeth I","Salvador Dalí","Abraham Lincoln"]) {
   assert.equal(discovery.reviewedNonPerson(name),false,name);
 }
 const rows=[
   ...review.rows.map((row,i)=>({raw_name:row.name,rank:i+1,
     distinct_channel_count:row.recount_title_channels,video_count:row.recount_title_videos})),
   {raw_name:"Ada Lovelace",rank:14,distinct_channel_count:4,video_count:4}
 ];
 const result=discovery.candidatesFromSource(rows,[]);
 assert.equal(result.nonpersonExcluded,13);
 assert.deepEqual(result.candidates.map(x=>x.raw_name),["Ada Lovelace"]);
 assert.equal(result.candidates[0].rank,1);
});

const python=String.raw`
import gzip
import importlib.util
import json
import tempfile
from pathlib import Path

spec=importlib.util.spec_from_file_location("yt13",
    Path("scripts/youtube-build-person-signal-snapshot.py"))
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
review=json.loads(Path("audits/youtube-b024-13-critical-nonperson-original-video-review-20261018.json").read_text())
names=[x["name"] for x in review["rows"]]
for n in names:
    assert mod.candidate_rejection(n)=="reviewed_non_person",(n,mod.candidate_rejection(n))
    assert not mod.valid_candidate(n),n
for name in ["Martin Luther","Martin Luther King Jr","John F Kennedy",
             "Simón Bolívar","Elizabeth I","Salvador Dalí","Ada Lovelace"]:
    assert mod.candidate_rejection(name)!="reviewed_non_person",name
with tempfile.TemporaryDirectory() as td:
    root=Path(td)
    base=root/"batch008"
    video_dir=base/"videos"
    video_dir.mkdir(parents=True)
    manifest=[]
    for i in range(3):
        cid=f"UC{i}"
        manifest.append({"channel_id":cid,"channel_name":cid,"status":"OK",
                         "count":len(names)+1})
        with gzip.open(video_dir/(cid+".ndjson.gz"),"wt",encoding="utf8") as f:
            for j,n in enumerate(names):
                f.write(json.dumps({"video_id":f"v{i}-{j}",
                  "title":f"{n}: historical documentary"},ensure_ascii=False)+"\n")
            f.write(json.dumps({"video_id":f"v{i}-valid",
                  "title":"Ada Lovelace: Pioneer of Computing"})+"\n")
    (base/"manifest.json").write_text(json.dumps(manifest))
    prior_names=names+["Ada Lovelace"]
    prior={"snapshot":{"threshold_counts":{"3":len(prior_names)}},
       "signals":[{"raw_name":n,"rank":j+1,
                   "distinct_channel_count":3,"video_count":3}
                   for j,n in enumerate(prior_names)]}
    result=mod.build(root,42,"sha256:fixture",previous_snapshot=prior)
    signals=result["signals"]
    assert [x["raw_name"] for x in signals]==["Ada Lovelace"],signals
    assert signals[0]["distinct_channel_count"]==3
    assert signals[0]["video_count"]==3
    assert result["snapshot"]["video_count"]==42
    assert result["snapshot"]["source_state"]["quality_rules_version"]=="reviewed-20261018-v4"
    assert result["snapshot"]["threshold_counts"]["3"]==1
    print(json.dumps({"previous_nonpersons_reviewed":len(names),
      "accepted_historical_name":"Ada Lovelace","raw_original_video_rows_retained":
      result["snapshot"]["video_count"],"production_publication_approved":False}))
`;

test("publisher may remove only reviewed false historical-Person signals from previous snapshots; original videos and real names survive",()=>{
 const result=spawnSync("python3",["-c",python],{encoding:"utf8",timeout:30000});
 assert.equal(result.status,0,result.stderr||result.stdout);
 const stats=JSON.parse(result.stdout);
 assert.equal(stats.previous_nonpersons_reviewed,13);
 assert.equal(stats.raw_original_video_rows_retained,42);
 assert.equal(stats.accepted_historical_name,"Ada Lovelace");
 assert.equal(stats.production_publication_approved,false);
});
