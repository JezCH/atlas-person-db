#!/usr/bin/env python3
"""Reprocess the already-collected 2,230,031 B024 source titles. NO NEW CRAWL.

Differentiate exact original Video-ID/Channel-ID "person biography TITLE cue"
from weaker name mentions. This is explicitly NOT watched-video certification.

Source-name vocabulary is ONLY the independently source-extracted 5,965 labels
(recovered from the already executed 5,217 matched + 748 source-only crosswalk);
ATLAS Person registry is NEVER used as a Person discovery name lexicon.
"""
import argparse
import collections
import gzip
import hashlib
import importlib.util
import json
import re
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
ORIGINAL_ZIP_SHA256="8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946"
SOURCE_LABEL_SHA256="b9d9bcdb4fa98e0f917a1dc32106a84fc11b788b86780078e9c207b5c44e550c"
SOURCE_SNAPSHOT="yt-20261009T111844Z-10127ch-rebuild-v4"
SCHEMA="atlas-youtube-b024-existing-originals-biography-title-triage/v1"
SOURCES=[
    "audits/youtube-b024-v5-crosswalk-matched-part1.json",
    "audits/youtube-b024-v5-crosswalk-matched-part2.json",
    "audits/youtube-b024-v5-crosswalk-matched-part3.json",
    "audits/youtube-b024-v5-crosswalk-source-only.json",
]
SPEC=importlib.util.spec_from_file_location("b024_original_title_matcher",
    ROOT/"scripts/youtube-b024-source-wide-video-id-ledger.py")
ORIGINAL=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ORIGINAL)

# Title features must be grammatical, not just "NAME" in a video title.
# Events, songs, film reviews, two people, generic labels and incidental
# mentions are not elevated to high-confidence Person-primary content.
BIO_PREFIXES={
    ("biography","of"),("biography","about"),("the","life","of"),
    ("life","of"),("the","story","of"),("life","and","times","of"),
    ("documentary","about"),("documentary","on"),
    ("biografia","de"),("biografia","di"),("biographie","de"),
    ("biographie","de","la"),("la","vida","de"),("la","vie","de"),
    ("historia","de"),("the","biography","of"),("brief","biography","of"),
    ("a","biography","of"),("who","was"),("who","is"),
    ("das","leben","von"),
}
BIO_SUFFIXES={
    ("biography",),("biographical","documentary"),("documentary",),
    ("life","story"),("the","life","story"),("biografia",),
    ("biographie",),("biografie",),("biography","in","hindi"),
    ("explained",),("life","and","legacy"),("life","and","times"),
    ("brief","biography"),("short","biography"),
}
EVENT_HOLD_PREFIXES={
    ("death","of"),("murder","of"),("assassination","of"),
    ("the","death","of"),("the","murder","of"),("killing","of"),
    ("why","was"),("how","did"),("why","did"),
}

def starts_or_ends_with_phrase(tokens,phrases,*,suffix=False):
    for phrase in phrases:
        n=len(phrase)
        if (tuple(tokens[-n:]) if suffix else tuple(tokens[:n]))==phrase:
            return True
    return False

def title_topic_cue(title,label,all_labels):
    """Returns strongest TITLE-only status, never real video topic verification."""
    if len(all_labels)!=1:
        return "MULTIPLE_NAME_MATCH_HOLD"
    parts=ORIGINAL.words(title)
    name=ORIGINAL.words(label)
    if not parts or not name:
        return "NO_EXACT_TITLE_NAME"
    positions=[i for i in range(len(parts)-len(name)+1)
               if parts[i:i+len(name)]==name]
    if len(positions)!=1:
        return "MULTIPLE_OR_NO_NAME_SPAN_HOLD"
    begin=positions[0]
    before=parts[:begin]
    after=parts[begin+len(name):]
    if starts_or_ends_with_phrase(before,EVENT_HOLD_PREFIXES,suffix=True):
        return "EVENT_OR_DEATH_TOPIC_HOLD"
    if starts_or_ends_with_phrase(before,BIO_PREFIXES,suffix=True):
        return "EXPLICIT_BIOGRAPHY_TITLE_CUE"
    if starts_or_ends_with_phrase(after,BIO_SUFFIXES):
        # The name is the beginning of the title, possibly preceded by
        # honorifics ("Dr.", "King") not reliably resolved here.
        if not before or before in [("the",),("dr",),("doctor",),("sir",)]:
            return "EXPLICIT_BIOGRAPHY_TITLE_CUE"
    return "NAME_MENTION_ONLY"

def source_names(root=ROOT):
    names={}
    meta=None
    for rel in SOURCES:
        src=json.loads((root/rel).read_text(encoding="utf8"))
        if (src.get("source_5965_sha256")!=SOURCE_LABEL_SHA256 or
            src.get("source_snapshot_id")!=SOURCE_SNAPSHOT):
            raise ValueError("B024_TITLE_NAME_SOURCE_PROVENANCE_MISMATCH")
        if meta is None:
            meta=src["production_snapshot_id"]
        elif meta!=src["production_snapshot_id"]:
            raise ValueError("B024_TITLE_NAME_LIVE_SNAPSHOT_CONFLICT")
        is_only=rel.endswith("-source-only.json")
        if (src.get("kind")!=
            ("source_name_not_in_production" if is_only else "exact_name_matched")):
            raise ValueError("B024_TITLE_NAME_PARTITION_INVALID")
        for row in src["rows"]:
            name=row[0] if is_only else row[2]
            if name in names:
                raise ValueError("B024_TITLE_NAME_DUPLICATE")
            names[name]={
                "source_original_title_mention_channels":row[1] if is_only else row[5],
                "source_original_title_mention_videos":row[2] if is_only else row[6],
                "historical_live_discovery_name_exact":not is_only
            }
    if len(names)!=5965:
        raise ValueError("B024_TITLE_NAME_POPULATION_MISMATCH")
    return names

def rejected_label_names(root=ROOT):
    out=set()
    for rel in ("audits/youtube-v5-source-nonperson-exact-labels.json",
                "audits/youtube-v5-expanded-nonperson-reviewed-exact.json"):
        doc=json.loads((root/rel).read_text(encoding="utf8"))
        out.update(ORIGINAL.words(r["name"]) for r in doc["reviewed_labels"])
    rules=json.loads((root/"scripts/youtube-person-signal-quality-rules.v2.json").read_text(encoding="utf8"))
    for k in ("non_person_exact","nonhistorical_person_exact"):
        out.update(ORIGINAL.words(name) for name in rules.get(k,[]))
    return out

def run(archive,names,nonpeople,*,expected_channels=10127,expected_videos=2230031,
        verify_archive=True,max_samples=3):
    archive_path=Path(archive)
    if verify_archive:
        if archive_path.is_dir():
            raise ValueError("B024_DIRECTORY_REQUIRES_VERIFIED_ARTIFACT_PROVENANCE")
        with archive_path.open("rb") as f:
            if hashlib.file_digest(f,"sha256").hexdigest()!=ORIGINAL_ZIP_SHA256:
                raise ValueError("B024_ORIGINAL_ARCHIVE_SHA_MISMATCH")
    lexicon={n for n in names if 2<=len(ORIGINAL.words(n))<=16}
    trie=ORIGINAL.make_index(lexicon)
    words_by_name={n:ORIGINAL.words(n) for n in lexicon}
    counts=collections.Counter()
    channel_sets=collections.defaultdict(set)
    video_sets=collections.defaultdict(set)
    samples=collections.defaultdict(list)
    hold_counts=collections.Counter()
    source_channels=set()
    total_videos=0
    counted_original_video_ids=set()
    matched_any_videos=0
    import contextlib
    with contextlib.ExitStack() as resources:
        if archive_path.is_dir():
            members=sorted(archive_path.rglob("*.ndjson.gz"))
            def open_member(member):
                return gzip.open(member,"rt",encoding="utf8")
        else:
            source=resources.enter_context(zipfile.ZipFile(archive_path))
            members=sorted(p for p in source.namelist() if p.endswith(".ndjson.gz"))
            def open_member(member):
                return gzip.open(source.open(member),"rt",encoding="utf8")
        for member in members:
            channel_id=Path(member).name.removesuffix(".ndjson.gz")
            if channel_id in source_channels:
                raise ValueError("B024_DUPLICATE_ORIGINAL_CHANNEL_FILE")
            source_channels.add(channel_id)
            with open_member(member) as stream:
                for line in stream:
                    item=json.loads(line)
                    total_videos+=1
                    vid=item.get("video_id")
                    if item.get("channel_id")!=channel_id or not isinstance(vid,str):
                        raise ValueError("B024_ARCHIVED_VIDEO_CHANNEL_ID_MISMATCH")
                    title=item.get("title") or ""
                    names_hit=ORIGINAL.title_name_matches(title,trie)
                    if not names_hit:
                        continue
                    matched_any_videos+=1
                    # Only strong cues count; nonpeople are never credited.
                    for name in names_hit:
                        cue=title_topic_cue(title,name,names_hit)
                        if cue!="EXPLICIT_BIOGRAPHY_TITLE_CUE":
                            hold_counts[cue]+=1
                            continue
                        if words_by_name[name] in nonpeople:
                            hold_counts["KNOWN_NONPERSON_LABEL_HOLD"]+=1
                            continue
                        if vid in video_sets[name]:
                            raise ValueError("B024_DUPLICATE_ORIGINAL_VIDEO_ID_PER_NAME")
                        if vid in counted_original_video_ids:
                            # One ORIGINAL video cannot credit multiple identities.
                            raise ValueError("B024_ONE_VIDEO_MULTIPLE_STRONG_SUBJECTS")
                        counted_original_video_ids.add(vid)
                        channel_sets[name].add(channel_id)
                        video_sets[name].add(vid)
                        counts[name]+=1
                        if len(samples[name])<max_samples:
                            samples[name].append({"video_id":vid,
                                                  "original_channel_id":channel_id,
                                                  "original_title":title[:250]})
    if len(source_channels)!=expected_channels or total_videos!=expected_videos:
        raise ValueError(f"B024_FULL_ARCHIVE_PARITY_FAILED: {len(source_channels)}/{total_videos}")
    rows=[]
    for name in sorted(video_sets):
        meta=names[name]
        # Token rules differ from the independently reviewed 245-name sets.
        # Do not assert equivalence with historic source-title aggregations.
        rows.append({
            "raw_name":name,
            "historical_live_discovery_name_exact":meta["historical_live_discovery_name_exact"],
            "source_title_mention_original_channels_prior_grammar":meta["source_original_title_mention_channels"],
            "source_title_mention_original_videos_prior_grammar":meta["source_original_title_mention_videos"],
            "strong_biography_title_original_channel_count":len(channel_sets[name]),
            "strong_biography_title_original_video_count":len(video_sets[name]),
            "strong_biography_original_video_ids":sorted(video_sets[name]),
            "strong_biography_original_channel_ids":sorted(channel_sets[name]),
            "source_title_samples":samples[name],
            "historic_person_identity_verified":False,
            "original_video_actual_content_watched_verified":False,
            "current_registered_person_exclusion_pending":True,
            "production_rank_publishable":False,
        })
    rows.sort(key=lambda x:(-x["strong_biography_title_original_channel_count"],
                            -x["strong_biography_title_original_video_count"],x["raw_name"]))
    return {
        "schema":SCHEMA,"source_snapshot_id":SOURCE_SNAPSHOT,
        "original_zip_sha256":ORIGINAL_ZIP_SHA256,
        "independent_source_name_label_count":len(names),
        "original_channel_files_scanned":len(source_channels),
        "original_video_title_rows_scanned":total_videos,
        "any_source_name_matched_title_video_rows":matched_any_videos,
        "explicit_biography_title_video_ids":len(counted_original_video_ids),
        "distinct_name_labels_with_explicit_biography_title_cues":len(rows),
        "title_hold_counters":dict(hold_counts),
        "video_content_verified_count":0,
        "historical_persons_confirmed_unregistered":0,
        "video_media_retrieval_attempted":False,
        "new_youtube_crawling_attempted":False,
        "production_writes":0,
        "rank_publication_allowed":False,
        "registered_person_exclusion_must_be_last":True,
        "title_biography_cues_not_watched_content":True,
        "rows":rows
    }

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--archive",required=True)
    p.add_argument("--output",required=True)
    p.add_argument("--verified-extracted-artifact",action="store_true",
                   help="Only GitHub Actions after verifying archive id/name/SHA256 and download-artifact digest")
    args=p.parse_args()
    if Path(args.archive).is_dir() and not args.verified_extracted_artifact:
        p.error("B024_DIRECTORY_REQUIRES_VERIFIED_ARTIFACT_PROVENANCE")
    result=run(args.archive,source_names(),rejected_label_names(),
               verify_archive=not args.verified_extracted_artifact)
    path=Path(args.output)
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(result,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf8")
    print(json.dumps({k:v for k,v in result.items() if k!="rows"},ensure_ascii=False))
    for row in result["rows"][:15]:
        print(json.dumps({"raw_name":row["raw_name"],
                          "strong_biography_channels":row["strong_biography_title_original_channel_count"],
                          "strong_biography_videos":row["strong_biography_title_original_video_count"],
                          "sample_video_id":row["source_title_samples"][0]["video_id"]},ensure_ascii=False))

if __name__=="__main__":
    main()
