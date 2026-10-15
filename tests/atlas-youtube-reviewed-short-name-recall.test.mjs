import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";

const sample=String.raw`
import gzip
import importlib.util
import json
import tempfile
from pathlib import Path

script=Path("scripts/youtube-build-person-signal-snapshot.py")
spec=importlib.util.spec_from_file_location("yt_short_recall",script)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
review={
    "schema":"atlas-youtube-b024-v5-source-identity-alias-review/v1",
    "source_artifact_digest":"sha256:fixture",
    "approved_groups":[
        {"canonical_name":"Pablo Picasso","aliases":["Picasso","Pablo Picasso"]}
    ]
}
patterns=mod.reviewed_one_token_biography_patterns(review,"sha256:fixture")
assert [x[0] for x in mod.source_context_name_candidates("The Life of Picasso",patterns)]==["Picasso"]
assert [x[0] for x in mod.source_context_name_candidates("Who Was Picasso?",patterns)]==["Picasso"]
assert not mod.source_context_name_candidates("The Life of Diana",patterns)
assert not mod.source_context_name_candidates("The Life of Pele",patterns)
assert not mod.source_context_name_candidates("Picasso Museum opening",patterns)
assert not mod.source_context_name_candidates("The Life of Picasso")
bad_sha_blocked=False
try:
    mod.reviewed_one_token_biography_patterns(review,"sha256:different")
except RuntimeError as e:
    bad_sha_blocked="DIGEST_MISMATCH" in str(e)
assert bad_sha_blocked
with tempfile.TemporaryDirectory() as tmp:
    root=Path(tmp)
    directory=root/"original"/"batch008"
    videos_dir=directory/"videos"
    videos_dir.mkdir(parents=True)
    samples={
        "UC1":[("v1","The Life of Picasso"),("v2","Pablo Picasso: Biography"),("v3","The Life of Diana")],
        "UC2":[("v4","Who Was Picasso?"),("v5","Pablo Picasso | Art History")],
        "UC3":[("v6","Biography of Picasso"),("v7","Pablo Picasso - The Artist")],
    }
    manifest=[]
    for channel,items in samples.items():
        manifest.append({"channel_id":channel,"channel_name":channel,"status":"OK","count":len(items)})
        with gzip.open(videos_dir/(channel+".ndjson.gz"),"wt",encoding="utf-8") as fh:
            for vid,title in items:
                fh.write(json.dumps({"video_id":vid,"title":title})+"\n")
    (directory/"manifest.json").write_text(json.dumps(manifest),encoding="utf-8")
    published=mod.build(root,101,"sha256:fixture",reviewed_source_aliases=review)
    rows={r["raw_name"]:r for r in published["signals"]}
    assert "Diana" not in rows
    assert rows["Picasso"]["distinct_channel_count"]==3
    assert rows["Picasso"]["video_count"]==3
    assert rows["Pablo Picasso"]["video_count"]==3
    union=published["snapshot"]["source_state"]["reviewed_source_unions"]
    assert len(union)==1
    assert union[0]["video_count"]==6
    assert union[0]["distinct_channel_count"]==3
    assert published["snapshot"]["source_state"]["quality_counters"]["accepted_reviewed_single_name_video_name_ids"]==3
    print(json.dumps({"picasso_video_ids":rows["Picasso"]["video_count"],"union_video_ids":union[0]["video_count"],"union_channel_ids":union[0]["distinct_channel_count"],"unreviewed_diana": "Diana" in rows,"bad_sha_blocked":bad_sha_blocked}))
`;

test("source-reviewed one-token biography title cues recover otherwise omitted original videos without inferring unreviewed homonyms",()=>{
  const run=spawnSync("python3",["-c",sample],{encoding:"utf8",timeout:30000});
  assert.equal(run.status,0,run.stderr||run.stdout);
  const data=JSON.parse(run.stdout);
  assert.equal(data.picasso_video_ids,3);
  assert.equal(data.union_video_ids,6);
  assert.equal(data.union_channel_ids,3);
  assert.equal(data.unreviewed_diana,false);
  assert.equal(data.bad_sha_blocked,true);
});
