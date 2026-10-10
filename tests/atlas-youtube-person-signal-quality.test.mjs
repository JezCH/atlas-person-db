import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";

const python=String.raw`
import gzip
import importlib.util
import json
import sys
import tempfile
from pathlib import Path

path=Path("scripts/youtube-build-person-signal-snapshot.py")
spec=importlib.util.spec_from_file_location("yt_signal_parser",path)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

for title in (
    "Covid-19: The Pandemic","Exclusive: Ancient discoveries",
    "Interview | Important things","The Odyssey: Homer explained",
    "Pearl Harbor | Historic War","Rome: The Eternal City",
    "Sherlock Holmes: Fictional character","Dracula: Vampire legend",
    "King Arthur: Myth and legend",
    "Pompeii: Ancient City","Preview: Coming Soon",
    "Knights Templar: Historical Order","The Holocaust: Documentary",
    "Spider-Man: Fiction","Athena: Goddess",
    "Chapter 3: How it Ends","Day 4: Travels","Ep 2: The Mystery"
):
    candidate=module.title_candidate(title)
    assert candidate and not module.valid_candidate(candidate),(title,candidate)
for title in (
    "Saint Frances of Rome: Biography",
    "Rollo the Viking: Who was he",
    "Napoleon III: History of his reign",
    "Ibn Sina: Philosopher",
    "Prince: The Musician","Paris: The Trojan Prince",
):
    candidate=module.title_candidate(title)
    assert candidate and module.valid_candidate(candidate),(title,candidate)

assert module.normalize_person_candidate("Abraham Lincoln Biography")=="Abraham Lincoln"
assert module.normalize_person_candidate("Albert Einstein |")=="Albert Einstein"
assert module.normalize_person_candidate("Avicenna")=="Ibn Sina"
assert module.normalize_person_candidate("Napoléon Bonaparte")=="Napoleon Bonaparte"
assert module.normalize_person_candidate("Kim Jong Un")=="Kim Jong-un"
assert module.normalize_person_candidate("Abraham Lincoln for Kids")=="Abraham Lincoln"
assert module.normalize_person_candidate("Tamerlane")=="Timur"
assert module.normalize_person_candidate("Queen Elizabeth I")=="Elizabeth I"
assert module.normalize_person_candidate("Napoleon")=="Napoleon"
assert module.normalize_person_candidate("Napoleon III")=="Napoleon III"
assert module.normalize_person_candidate("Caesar")=="Caesar"
assert module.title_candidate("The Rise of Napoleon Bonaparte: History")=="Napoleon Bonaparte"

with tempfile.TemporaryDirectory() as tmp:
    root=Path(tmp)
    directory=root/"prior"/"batch008"
    archive=directory/"videos"
    archive.mkdir(parents=True)
    videos={
        "channel-a":[
            "Avicenna: Physician","Ibn Sina | Philosophy",
            "Napoleon Bonaparte Biography: Emperor",
            "Abraham Lincoln Biography: President",
            "Covid-19: History","Exclusive: History of Kings",
            "Napoleon: Life","Napoleon III: Emperor",
            "Kim Jong Un Biography: Dictator",
        ],
        "channel-b":[
            "Ibn Sina: Scholar",
            "Napoléon Bonaparte | Life",
            "Abraham Lincoln: President",
            "Covid-19 | Pandemic",
            "Napoleon | History",
            "Napoleon III | Empire",
            "Kim Jong-un: Life",
        ],
        "channel-c":[
            "Avicenna: Scientist",
            "Napoleon Bonaparte: Military",
            "Abraham Lincoln Biography: US History",
            "Covid-19: Update",
            "Napoleon: General",
            "Napoleon III: Empire",
            "Kim Jong-un: Leadership",
        ],
    }
    manifest=[]
    for cid,titles in videos.items():
        manifest.append({"channel_id":cid,"channel_name":cid,"status":"OK","count":len(titles)})
        with gzip.open(archive/(cid+".ndjson.gz"),"wt",encoding="utf-8") as f:
            for i,title in enumerate(titles):
                f.write(json.dumps({"video_id":str(i),"title":title},ensure_ascii=False)+"\n")
    (directory/"manifest.json").write_text(json.dumps(manifest),encoding="utf-8")
    result=module.build(root,123,"sha256:fixture")
    signals={row["raw_name"]:row for row in result["signals"]}
    assert "Covid-19" not in signals
    assert "Exclusive" not in signals
    assert "Avicenna" not in signals
    assert "Abraham Lincoln Biography" not in signals
    assert "Napoléon Bonaparte" not in signals
    for name in ("Ibn Sina","Napoleon Bonaparte","Abraham Lincoln","Napoleon","Napoleon III","Kim Jong-un"):
        assert signals[name]["distinct_channel_count"]==3,(name,signals)
    assert signals["Ibn Sina"]["video_count"]==4
    assert result["snapshot"]["channel_count"]==3
    assert result["snapshot"]["video_count"]==sum(len(v) for v in videos.values())
    assert result["snapshot"]["parser_version"]=="yt-title-person-reviewed-v5"
    assert result["snapshot"]["source_state"]["quality_counters"]["reviewed_non_person"]>=3
    assert result["snapshot"]["source_state"]["quality_rules_version"]=="reviewed-20261008-v2"
    assert result["snapshot"]["snapshot_id"].endswith("-rebuild-v5")
    print(json.dumps({"signal_count":len(signals),"Ibn_Sina_channels":signals["Ibn Sina"]["distinct_channel_count"],"Ibn_Sina_videos":signals["Ibn Sina"]["video_count"],"rejected_non_person":result["snapshot"]["source_state"]["quality_counters"]["reviewed_non_person"]}))
`;

test("reviewed title rules preserve Channel ID unions and distinct identities",()=>{
  const result=spawnSync("python3",["-c",python],{encoding:"utf8",timeout:30000});
  assert.equal(result.status,0,result.stderr||result.stdout);
  const report=JSON.parse(result.stdout);
  assert.equal(report.Ibn_Sina_channels,3);
  assert.equal(report.Ibn_Sina_videos,4);
  assert.ok(report.rejected_non_person>=3);
});
