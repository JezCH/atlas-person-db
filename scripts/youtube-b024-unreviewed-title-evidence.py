#!/usr/bin/env python3
"""Source-pinned title-topic evidence audit for ALL 245 unreviewed raw YouTube labels.

No registered-Person UUID lexicon. All title cues are REVIEW ONLY; never
publish them as Person-centered video evidence or auto-merge aliases.
"""
import argparse
import collections
import gzip
import hashlib
import json
import re
import unicodedata
import zipfile
from pathlib import Path

SHA = "8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946"
SNAPSHOT = "yt-20261009T111844Z-10127ch-rebuild-v4"
SEED = "b024-245-name-evidence-stratified-v1"
BIO = re.compile(
    r"(?:\b(?:who\s+(?:was|is)|what\s+happened\s+to|(?:the\s+)?"
    r"(?:life|death|biography|autobiography|story|rise and fall|rise|legacy|"
    r"reign|assassination|murder|autopsy|life and times)\s+(?:of|about)|"
    r"(?:the\s+)?(?:untold|true|tragic|incredible)\s+(?:life|story)\s+of|"
    r"(?:biografia|biografía|biographie|biografie|historia|histoire|vita|"
    r"biography|la vida|la vie|a vida|das leben)\s+"
    r"(?:de|of|di|du|del|von|about)|"
    r"(?:extra history|historical profile|person biography)\s*:))\s*$",
    re.I
)
WORK = re.compile(
    r"\b(?:audiobook|audio book|full book|novel|novella|poetry|poem reading|"
    r"poem recitation|book review|album|lyrics|soundtrack|film scene|"
    r"movie clip|tv series|episode scene|drama scene|performance|performed by|"
    r"piano|nocturne|prelude|concerto|symphony|sonata|opera|musical score|"
    r"singing|cover song|classical music|official music video|painting tour|"
    r"art exhibition)\b", re.I
)
JOINT = re.compile(
    r"\b(?:vs\.?|versus|compared (?:to|with)|rivalry of|"
    r"two (?:kings|queens|leaders|scientists))\b", re.I
)
JOINT_NAMES = re.compile(r"\b(?:and|&)\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b")
POST = re.compile(r"^(?:life|biography|history|story|rise|legacy|reign|death|untold|"
                  r"historical|documentary|explained|who|real|truth|facts)\b", re.I)
FOCUSED = frozenset({
    "BIOGRAPHICAL_TITLE_CUE_REVIEW", "POST_NAME_BIOGRAPHY_CUE_REVIEW",
    "NAME_HEADING_TOPIC_CUE_REVIEW", "QUESTION_TOPIC_CUE_REVIEW"
})

def words(value):
    normalized = unicodedata.normalize("NFKD", str(value)).casefold()
    normalized = "".join(c for c in normalized if not unicodedata.combining(c))
    return re.findall(r"[^\W_]+", normalized, re.UNICODE)

def bucket(title, label):
    a, b = words(title), words(label)
    locations = [i for i in range(len(a)-len(b)+1) if a[i:i+len(b)] == b]
    if not locations:
        return "SOURCE_NAME_BOUNDARY_MISMATCH_REVIEW"
    if WORK.search(" ".join(a)):
        return "WORK_OR_PERFORMANCE_REVIEW"
    if JOINT.search(title) or JOINT_NAMES.search(title):
        return "JOINT_PERSON_OR_EVENT_REVIEW"
    for i in locations:
        before, after = " ".join(a[:i]), " ".join(a[i+len(b):])
        if BIO.search(before):
            return "BIOGRAPHICAL_TITLE_CUE_REVIEW"
        if i == 0 or before in ("a", "the"):
            return ("NAME_HEADING_TOPIC_CUE_REVIEW" if POST.search(after)
                    else "NAME_HEADING_UNRESOLVED_REVIEW")
        if after.startswith(("biography", "documentary", "life story", "historical profile")):
            return "POST_NAME_BIOGRAPHY_CUE_REVIEW"
        if (len(before.split()) < 9 and re.search(
                r"\b(?:why|how|when|where|who|what)\b", before)):
            return "QUESTION_TOPIC_CUE_REVIEW"
    return "MENTION_OR_CONTEXT_UNRESOLVED_REVIEW"

def audit(source, review, recount, *, expected_channels=10127,
          expected_videos=2230031, expected_labels=245, sha=SHA,
          snapshot=SNAPSHOT, sample_per_bucket=3):
    if review.get("schema") != "youtube-b024-source-label-and-title-focus-review/v1":
        raise ValueError("REVIEW_SCHEMA_MISMATCH")
    if recount.get("schema") != "youtube-new-label-fulltitle-original-id-recall/v1":
        raise ValueError("RECOUNT_SCHEMA_MISMATCH")
    if review.get("source_snapshot_id") != snapshot or recount.get("source_snapshot_id") != snapshot:
        raise ValueError("SOURCE_SNAPSHOT_MISMATCH")
    if (review.get("source_channels"), review.get("source_videos")) != (expected_channels,expected_videos):
        raise ValueError("REVIEW_POPULATION_MISMATCH")
    if (recount.get("source_channels"), recount.get("source_videos")) != (expected_channels,expected_videos):
        raise ValueError("RECOUNT_POPULATION_MISMATCH")
    with Path(source).open("rb") as stream:
        if hashlib.file_digest(stream,"sha256").hexdigest() != sha:
            raise ValueError("SOURCE_SHA256_MISMATCH")
    names = {r["raw_name"] for r in review["rows"]
             if r["disposition"] == "UNREVIEWED_PERSONHOOD"}
    if len(names) != expected_labels:
        raise ValueError("UNREVIEWED_NAME_LABEL_COUNT_MISMATCH")
    source_rows = {r["candidate"]: r for r in recount["rows"] if r["candidate"] in names}
    if set(source_rows) != names:
        raise ValueError("MISSING_ORIGINAL_NAME_EVIDENCE")
    reverse = collections.defaultdict(set)
    per_name_channels = {}
    for name, row in source_rows.items():
        per_name_channels[name] = set(row["original_channel_ids"])
        for video_id in row["original_video_ids"]:
            reverse[video_id].add(name)
    bins = collections.defaultdict(
        lambda: collections.defaultdict(
            lambda: {"channel_ids":set(), "video_ids":set(), "samples":[]}))
    channels, video_rows = set(), 0
    with zipfile.ZipFile(source) as archive:
        for path in sorted(p for p in archive.namelist() if p.endswith(".ndjson.gz")):
            channel_id = Path(path).name.removesuffix(".ndjson.gz")
            if not channel_id or channel_id in channels:
                raise ValueError("ORIGINAL_CHANNEL_ID_DUPLICATE")
            channels.add(channel_id)
            with gzip.open(archive.open(path), "rt", encoding="utf-8") as stream:
                for line in stream:
                    video_rows += 1
                    src = json.loads(line)
                    vid = str(src.get("video_id") or "")
                    for name in reverse.get(vid, ()):
                        if channel_id not in per_name_channels[name]:
                            continue
                        title = str(src.get("title") or "")
                        kind = bucket(title, name)
                        if kind == "SOURCE_NAME_BOUNDARY_MISMATCH_REVIEW":
                            raise ValueError("SOURCE_NAME_TOKENS_MISMATCH: " + name)
                        node = bins[name][kind]
                        node["channel_ids"].add(channel_id)
                        node["video_ids"].add(vid)
                        h = hashlib.sha256(f"{SEED}|{name}|{kind}|{vid}".encode()).hexdigest()
                        node["samples"].append((h, {"channel_id":channel_id,
                            "video_id":vid, "title":title[:300]}))
                        node["samples"].sort(key=lambda e:e[0])
                        del node["samples"][sample_per_bucket:]
    if (len(channels),video_rows) != (expected_channels,expected_videos):
        raise ValueError("SOURCE_POPULATION_MISMATCH")
    rows = []
    for name, original in source_rows.items():
        buckets = bins[name]
        ch = set().union(*(v["channel_ids"] for v in buckets.values()))
        ids = set().union(*(v["video_ids"] for v in buckets.values()))
        if ch != set(original["original_channel_ids"]) or ids != set(original["original_video_ids"]):
            raise ValueError("ORIGINAL_ID_PARITY_MISMATCH: " + name)
        focus = [v for k,v in buckets.items() if k in FOCUSED]
        focus_ch = set().union(*(v["channel_ids"] for v in focus))
        focus_ids = set().union(*(v["video_ids"] for v in focus))
        rows.append({
            "raw_name":name, "unreviewed_personhood":True,
            "title_mention_original_channels":len(ch),
            "title_mention_original_videos":len(ids),
            "title_topic_cue_channels_REVIEW_ONLY":len(focus_ch),
            "title_topic_cue_videos_REVIEW_ONLY":len(focus_ids),
            "identity_fold_status":original["identity_disposition"],
            "buckets":{k:{"original_channel_ids":sorted(v["channel_ids"]),
                "original_video_ids":sorted(v["video_ids"]),
                "examples":[example for _,example in v["samples"]]}
                for k,v in sorted(buckets.items())}
        })
    rows.sort(key=lambda r:(-r["title_topic_cue_channels_REVIEW_ONLY"],
                            -r["title_mention_original_channels"],r["raw_name"]))
    return {"schema":"youtube-b024-245-unreviewed-title-evidence/v1",
        "source_sha256":sha,"source_snapshot_id":snapshot,
        "original_channels":len(channels),"original_videos":video_rows,
        "unreviewed_raw_name_labels":len(rows),
        "no_registered_person_uuid_lexicon":True,
        "published_rank_eligible":False,
        "title_cue_is_not_video_ground_truth":True,
        "rows":rows}

def main():
    p = argparse.ArgumentParser(description=__doc__)
    for arg in ("source-zip","review-json","recount-json","output"):
        p.add_argument("--"+arg,required=True)
    a = p.parse_args()
    read=lambda path:json.loads(Path(path).read_text(encoding="utf-8"))
    data=audit(a.source_zip,read(a.review_json),read(a.recount_json))
    Path(a.output).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps({k:v for k,v in data.items() if k!="rows"},ensure_ascii=False))
    for r in data["rows"][:30]:
        print(f"{r['title_topic_cue_channels_REVIEW_ONLY']:4} | "
              f"{r['title_mention_original_channels']:4} | {r['raw_name']}")

if __name__=="__main__":
    main()
