import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {spawnSync} from "node:child_process";
import fs from "node:fs";

const require=createRequire(import.meta.url);
const quality=require("../scripts/youtube-person-signal-quality-rules.v2.json");
const review=require("../audits/youtube-v5-high-risk-nonperson-five-20261016.json");
const d=require("../server/atlas-youtube-unregistered-discovery-read-service.js");
const names=review.labels.map(row=>row.raw_name);

test("five evidenced false Person labels are source-reviewed without changing original video evidence",()=>{
  assert.equal(review.schema,"atlas-youtube-high-risk-exact-nonperson-correction/v1");
  assert.equal(review.original_source_video_rows,2230031);
  assert.equal(review.original_source_channel_count,10127);
  assert.equal(review.labels.length,5);
  assert.equal(new Set(names.map(d.identityKey)).size,5);
  assert.equal(quality.version,"reviewed-20261016-v3");
  assert.deepEqual(review.labels.map(x=>x.current_8616_rank),[368,1332,1920,3502,7399]);
  assert.equal(review.publication_approved,false);
  assert.equal(review.original_video_and_channel_ids_deleted,false);
  const rows=[...names.map((raw_name,i)=>({raw_name,rank:i+1,
    distinct_channel_count:review.labels[i].prior_v5_title_channels,
    video_count:review.labels[i].prior_v5_title_videos})),
    {raw_name:"Genuine Historical Candidate",rank:6,distinct_channel_count:4,video_count:4}
  ];
  const result=d.candidatesFromSource(rows,[{person_id:"other",alias_name:"Different Registered Name"}]);
  assert.equal(result.nonpersonExcluded,5);
  assert.equal(result.candidates.length,1);
  assert.equal(result.candidates[0].raw_name,"Genuine Historical Candidate");
  assert.equal(result.candidates[0].rank,1);
  for(const name of names) {
    assert.equal(quality.non_person_exact.includes(name),true,name);
    assert.equal(d.reviewedNonPerson(name),true,name);
  }
  assert.equal(d.reviewedNonPerson("Alexander the Great"),false);
  assert.equal(d.reviewedNonPerson("Abraham Lincoln"),false);
  assert.equal(d.reviewedNonPerson("Pablo Picasso"),false);
});

const python=String.raw`
import gzip
import importlib.util
import json
import tempfile
from pathlib import Path

spec=importlib.util.spec_from_file_location("atlas_exact_review",
    Path("scripts/youtube-build-person-signal-snapshot.py"))
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

labels=["3I/Atlas","Middle East","My life","Golden Age","Pt 2"]
with tempfile.TemporaryDirectory() as tmp:
    root=Path(tmp)
    batch=root/"prior"/"batch008"
    archives=batch/"videos"
    archives.mkdir(parents=True)
    manifest=[]
    for i in range(3):
        cid=f"UC{i}"
        manifest.append({"channel_id":cid,"channel_name":cid,"status":"OK","count":6})
        with gzip.open(archives/(cid+".ndjson.gz"),"wt",encoding="utf8") as stream:
            for j,name in enumerate(labels):
                stream.write(json.dumps({"video_id":f"v{i}-{j}",
                    "title":f"{name}: historical documentary"})+"\n")
            stream.write(json.dumps({"video_id":f"v{i}-valid",
                "title":"Ada Lovelace: Pioneer of Computing"})+"\n")
    (batch/"manifest.json").write_text(json.dumps(manifest))
    previous={"snapshot":{"threshold_counts":{"3":6}},"signals":[
        {"raw_name":name,"rank":j+1,"distinct_channel_count":3,"video_count":3}
        for j,name in enumerate(labels+["Ada Lovelace"])]}
    report=module.build(root,123,"sha256:fixture",previous_snapshot=previous)
    signals={row["raw_name"]:row for row in report["signals"]}
    assert list(signals)==["Ada Lovelace"],signals
    assert signals["Ada Lovelace"]["distinct_channel_count"]==3
    assert signals["Ada Lovelace"]["video_count"]==3
    assert report["snapshot"]["video_count"]==18
    assert report["snapshot"]["threshold_counts"]["3"]==1
    assert report["snapshot"]["source_state"]["quality_rules_version"]=="reviewed-20261016-v3"
    assert report["snapshot"]["source_state"]["quality_counters"]["reviewed_non_person"]>=15
    print(json.dumps({"remaining":list(signals),"nonperson_rejections":
        report["snapshot"]["source_state"]["quality_counters"]["reviewed_non_person"]}))
`;
test("source publisher excludes five prior false Person signals while retaining all original videos and valid Persons",()=>{
  const result=spawnSync("python3",["-c",python],{encoding:"utf8",timeout:30000});
  assert.equal(result.status,0,result.stderr||result.stdout);
  const report=JSON.parse(result.stdout);
  assert.deepEqual(report.remaining,["Ada Lovelace"]);
  assert.ok(report.nonperson_rejections>=15);
});
