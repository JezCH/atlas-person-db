import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {spawnSync} from "node:child_process";

const require=createRequire(import.meta.url);
const discovery=require("../server/atlas-youtube-unregistered-discovery-read-service.js");
const python=String.raw`
import gzip
import importlib.util
import json
import tempfile
from pathlib import Path

path=Path("scripts/youtube-build-person-signal-snapshot.py")
spec=importlib.util.spec_from_file_location("yt_underthreshold_alias",path)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
review={"schema":"atlas-youtube-b024-v5-source-identity-alias-review/v1",
        "source_artifact_digest":"sha256:fixture",
        "approved_groups":[{"canonical_name":"Pablo Picasso",
                            "aliases":["Picasso","Pablo Picasso"]}]}
with tempfile.TemporaryDirectory() as temp:
    root=Path(temp)
    base=root/"data"/"batch008"
    videos=base/"videos"
    videos.mkdir(parents=True)
    # Two aliases have two original channels each, overlapping at UC2.
    # Only their ORIGINAL Channel-ID union reaches three.
    grouped={
        "UC1":[("v1","Picasso: A Life")],
        "UC2":[("v2","Picasso | The Artist"),("v3","Pablo Picasso: A Biography")],
        "UC3":[("v4","Pablo Picasso: The Artist")]
    }
    manifest=[]
    for channel,items in grouped.items():
        manifest.append({"channel_id":channel,"channel_name":channel,
                         "status":"OK","count":len(items)})
        with gzip.open(videos/(channel+".ndjson.gz"),"wt",encoding="utf-8") as stream:
            for vid,title in items:
                stream.write(json.dumps({"video_id":vid,"title":title})+"\n")
    (base/"manifest.json").write_text(json.dumps(manifest),encoding="utf-8")
    payload=mod.build(root,127,"sha256:fixture",reviewed_source_aliases=review)
    union=payload["snapshot"]["source_state"]["reviewed_source_unions"][0]
    assert payload["signals"]==[],payload["signals"]
    assert [a["distinct_channel_count"] for a in union["aliases"]]==[2,2]
    assert [a["video_count"] for a in union["aliases"]]==[2,2]
    assert union["distinct_channel_count"]==3
    assert union["video_count"]==4
    assert payload["snapshot"]["source_state"]["reviewed_subthreshold_alias_nameforms"]==2
    assert payload["snapshot"]["source_state"]["reviewed_alias_union_before_raw_name_threshold"]
    print(json.dumps(union,ensure_ascii=False))
`;

function originalFixture() {
  const r=spawnSync("python3",["-c",python],{encoding:"utf8",timeout:30000});
  assert.equal(r.status,0,r.stderr||r.stdout);
  return JSON.parse(r.stdout);
}

test("two below-threshold aliases form exactly one source-verified 3-channel Person candidate",()=>{
  const reviewed=originalFixture();
  const result=discovery.applyReviewedSourceUnions([],[reviewed]);
  assert.equal(result.applied,1);
  assert.equal(result.rows.length,1);
  assert.equal(result.rows[0].distinct_channel_count,3);
  assert.equal(result.rows[0].video_count,4);
  assert.equal(result.rows[0].rank,0);
  const screened=discovery.candidatesFromSource([],[{
    person_id:"other",alias_name:"Unrelated Historical Person"
  }],{approvedUnions:[reviewed]});
  assert.equal(screened.candidates.length,1);
  assert.equal(screened.candidates[0].rank,1);
  assert.equal(screened.candidates[0].raw_name,"Pablo Picasso");
  assert.equal(screened.candidates[0].source_id_union_verified,true);
  assert.equal(screened.candidates[0].distinct_channel_count,3);
  assert.equal(screened.candidates[0].video_count,4);
  assert.deepEqual(screened.candidates[0].source_labels,["Picasso","Pablo Picasso"]);
  assert.equal(screened.candidates[0].count_lower_bound,false);
  // Before any reviewed union, zero subthreshold raw labels are in the >=3 feed.
  assert.deepEqual(discovery.candidatesFromSource([],[{
    person_id:"other",alias_name:"Unrelated Historical Person"
  }]).candidates,[]);
});

test("registered Person alias exclusion STILL runs after a subthreshold source-ID union",()=>{
  const reviewed=originalFixture();
  const screened=discovery.candidatesFromSource([],[{
    person_id:"registered-picasso",alias_name:"Pablo Picasso"
  }],{approvedUnions:[reviewed]});
  assert.equal(screened.registeredExcluded,1);
  assert.deepEqual(screened.candidates,[]);
});

test("missing qualified label, mismatched source counts, bad union and unreviewed alias fail closed",()=>{
  const reviewed=originalFixture();
  const bogus=structuredClone(reviewed);
  bogus.aliases[0].distinct_channel_count=3;
  assert.throws(()=>discovery.applyReviewedSourceUnions([],[bogus]),/SOURCE_LABEL_MISSING/);
  const impossible=structuredClone(reviewed);
  impossible.distinct_channel_count=5;
  assert.throws(()=>discovery.applyReviewedSourceUnions([],[impossible]),/UNION_COUNT_INVALID/);
  const underMin=structuredClone(reviewed);
  underMin.distinct_channel_count=2;
  assert.throws(()=>discovery.applyReviewedSourceUnions([],[underMin]),/UNION_COUNT_INVALID/);
  const rawMismatch=[{raw_name:"Picasso",rank:1,distinct_channel_count:3,video_count:3}];
  assert.throws(()=>discovery.applyReviewedSourceUnions(rawMismatch,[reviewed]),/SOURCE_COUNT_MISMATCH/);
  assert.throws(()=>discovery.applyReviewedSourceUnions([],[reviewed,reviewed]),/ALIAS_COLLISION/);
});
