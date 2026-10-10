#!/usr/bin/env python3
"""Read-only candidate-label QA from original YouTube video/channel IDs.

Do NOT use registered ATLAS Person UUIDs as the extraction lexicon. Do NOT
publish title mention counts as biographies or auto-merge identity aliases.
The reviewed manifest is pinned to ONE exact cumulative source snapshot.
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

def tokens(value):
    return re.findall(r"[^\W_]+", unicodedata.normalize("NFKC", str(value or "")).casefold())

FOCUS_PREFIXES = (
    "life of", "biography of", "story of", "death of", "murder of",
    "assassination of", "legacy of", "who was", "who is",
    "what happened to", "why was", "why did", "how did",
    "the story of", "the life of", "the rise and fall of",
)

def focus_bucket(title, label):
    words = tokens(title)
    name = tokens(label)
    occurrences = [i for i in range(len(words)-len(name)+1)
                   if words[i:i+len(name)] == name] if name else []
    if not occurrences:
        return "source_title_mismatch_review"
    for i in occurrences:
        before = words[:i]
        if i == 0 or (i == 1 and before == ["the"]):
            return "heading_cue_review"
        if any(before[-len(pattern.split()):] == pattern.split()
               for pattern in FOCUS_PREFIXES):
            return "heading_cue_review"
        if i <= 5 and before and before[0] in ("why", "how", "who", "was", "did"):
            return "possible_focus_cue_review"
    return "mention_only"

def build_dispositions(recount, manifest):
    if recount.get("schema") != manifest.get("source_recount_schema"):
        raise ValueError("wrong original-ID recount schema")
    if recount.get("source_snapshot_id") != manifest.get("source_snapshot_id"):
        raise ValueError("source snapshot mismatch (do not replay to Batch025)")
    if (recount.get("source_channels") != manifest.get("source_channels") or
        recount.get("source_videos") != manifest.get("source_videos")):
        raise ValueError("original source totals mismatch")
    rows = recount.get("rows")
    if not isinstance(rows, list) or len(rows) != manifest.get("source_recount_candidate_labels"):
        raise ValueError("candidate population mismatch")
    by_name = {r["candidate"]: r for r in rows}
    if len(by_name) != len(rows):
        raise ValueError("duplicate raw-label candidates")
    decisions = {}
    for reason, labels in manifest["nonperson_exact_by_reason"].items():
        for label in labels:
            if label in decisions: raise ValueError("review decision collision")
            decisions[label] = ("EXACT_NONPERSON_LABEL_REVIEWED", reason)
    for label, reason in manifest["identity_hold_by_reason"].items():
        if label in decisions: raise ValueError("hold/quarantine decision collision")
        decisions[label] = ("HOLD_IDENTITY_OR_CONTEXT", reason)
    if any(label not in by_name for label in decisions):
        raise ValueError("review label missing from current source population")
    return by_name, decisions

def run(recount, manifest, source_zip, verify_sha=True, max_examples=2):
    by_name, decisions = build_dispositions(recount, manifest)
    if verify_sha:
        digest=hashlib.sha256()
        with open(source_zip, "rb") as stream:
            for block in iter(lambda: stream.read(1048576), b""):
                digest.update(block)
        if digest.hexdigest() != manifest.get("source_zip_sha256"):
            raise ValueError("source ZIP SHA256 mismatch")
    video_index = collections.defaultdict(list)
    channel_membership={}
    for label, row in by_name.items():
        channel_membership[label]=set(row["original_channel_ids"])
        for vid in row["original_video_ids"]:
            video_index[vid].append(label)
    title_types = collections.defaultdict(lambda: collections.defaultdict(set))
    examples = collections.defaultdict(lambda: collections.defaultdict(list))
    found_videos = collections.defaultdict(set)
    found_channels = collections.defaultdict(set)
    original_channels=set()
    source_videos=0
    with zipfile.ZipFile(source_zip) as z:
        for path in sorted(p for p in z.namelist() if p.endswith(".ndjson.gz")):
            channel=Path(path).name.removesuffix(".ndjson.gz")
            if channel in original_channels: raise ValueError("duplicate original Channel ID")
            original_channels.add(channel)
            with gzip.open(z.open(path), "rt", encoding="utf-8") as stream:
                for line in stream:
                    row=json.loads(line)
                    source_videos+=1
                    vid=str(row.get("video_id") or "")
                    if vid not in video_index: continue
                    title=str(row.get("title") or "")
                    for label in video_index[vid]:
                        if channel not in channel_membership[label]: continue
                        bucket=focus_bucket(title, label)
                        title_types[label][bucket].add(vid)
                        found_videos[label].add(vid)
                        found_channels[label].add(channel)
                        if len(examples[label][bucket]) < max_examples:
                            examples[label][bucket].append({
                                "channel_id":channel, "video_id":vid,
                                "title":title[:250]
                            })
    if source_videos != recount["source_videos"] or len(original_channels) != recount["source_channels"]:
        raise ValueError("original video/channel population mismatch")

    status_channels=collections.defaultdict(set)
    status_videos=collections.defaultdict(set)
    rows=[]
    for label, original in by_name.items():
        if (len(found_channels[label])!=original["title_mention_distinct_channels"]
            or len(found_videos[label])!=original["title_mention_distinct_videos"]):
            raise ValueError("original Channel/Video ID evidence mismatch: " + label)
        disposition, reason=decisions.get(label,("UNREVIEWED_PERSONHOOD",None))
        status_channels[disposition].update(original["original_channel_ids"])
        status_videos[disposition].update(original["original_video_ids"])
        rows.append({
            "raw_name":label, "disposition":disposition,"reason_code":reason,
            "title_mention_distinct_channels":len(found_channels[label]),
            "title_mention_distinct_videos":len(found_videos[label]),
            "review_cue_video_counts":{k:len(v) for k,v in title_types[label].items()},
            "source_title_examples":dict(examples[label]),
            "source_orthographic_disposition":original["identity_disposition"],
        })
    rows.sort(key=lambda r:(-r["title_mention_distinct_channels"],r["raw_name"]))
    return {
        "schema":"atlas-youtube-b024-candidate-label-quality-review/v1",
        "source_snapshot_id":recount["source_snapshot_id"],
        "source_channel_count":len(original_channels),
        "source_video_count":source_videos,
        "source_disposition":"READ_ONLY_NO_RANK_PUBLICATION",
        "title_cues_are_not_certified_person_focused_videos":True,
        "candidate_label_status_counts":dict(collections.Counter(r["disposition"] for r in rows)),
        "unique_channel_id_union_by_status":{k:len(v) for k,v in status_channels.items()},
        "unique_video_id_union_by_status":{k:len(v) for k,v in status_videos.items()},
        "rows":rows
    }

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--source-zip",required=True)
    p.add_argument("--recount-json",required=True)
    p.add_argument("--review-manifest",required=True)
    p.add_argument("--output",required=True)
    args=p.parse_args()
    recount=json.loads(Path(args.recount_json).read_text(encoding="utf-8"))
    manifest=json.loads(Path(args.review_manifest).read_text(encoding="utf-8"))
    result=run(recount,manifest,args.source_zip)
    Path(args.output).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps({k:v for k,v in result.items() if k!="rows"},ensure_ascii=False))

if __name__=="__main__":
    main()
