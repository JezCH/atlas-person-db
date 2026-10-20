#!/usr/bin/env python3
"""Actually recover EXTRA person-profile TITLE cues from EXISTING archived B024.

Inputs: immutable pre-existing original B024 10,127-channel/2,230,031-title
artifact; already screened 2,241 candidate name groups / 6,162 original IDs.
Uses the independent 5,965 source-derived name lexicon (not registered ATLAS
names) to avoid token-overlap pollution. NEVER claims video was watched.

A second, broader grammar is a SEPARATE review-evidence tier. It does not
silently replace strict biography title video or channel counts or publish.
"""
import argparse
import collections
import contextlib
import gzip
import hashlib
import importlib.util
import json
import re
import unicodedata
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SRC_SHA="8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946"
INPUT_SCHEMA="atlas-youtube-b024-original-video-id-live-discovery-input/v1"
OUTPUT_SCHEMA="atlas-youtube-b024-additional-explicit-person-profile-title-ids/v1"
MODULE=ROOT/"scripts/youtube-b024-existing-corpus-biography-title-reprocess.py"
spec=importlib.util.spec_from_file_location("b024_existing_strict_and_independent_name_lexicon",MODULE)
strict=importlib.util.module_from_spec(spec)
spec.loader.exec_module(strict)
matcher=strict.ORIGINAL
NAME_WORD=matcher.words
SEP=r"(?:\s*[:|\u2014\u2013-]\s*|\s+)"
# An exact leading NAME must be followed by an unmistakable human-biography
# cue. This deliberately DOES NOT approve videos titled "X quotes", "X song",
# "X death" or "X and Y"; ambiguous cases remain excluded.
AFTER=(
    "the untold story","untold story","life story","life and legacy",
    "the life","life in pictures","early life","early years",
    "the rise and fall","rise and fall","life explained",
    "10 facts","5 facts","facts about","amazing facts",
    "biography","biographical documentary","full biography",
    "life documentary","historical biography","historical profile",
    "who was","who is","everything you need to know",
    "the story","the legacy","his life","her life",
    "la vida","a vida","la vie","biografia","biographie"
)
BEFORE=(
    "historical profile","a profile of","profile of",
    "facts about","amazing facts about","the untold story of",
    "rise and fall of","the rise and fall of",
    "what you need to know about","all about",
    "life and legacy of","early life of",
    "who was","who is","biography",
    "the story behind","the story of",
    "history of","life story of",
    "historia de","histoire de","vita di"
)
# More general "History of X" sometimes means places, movements or artistic
# works, so it remains a review tier, never a verified Person-focused video.
# Original title controls with obvious multi-figure focus cannot be credited.
JOINT=re.compile(r"\b(?:versus|vs\.?|v\.?|and|et|und|con|feat\.?|featuring)\b",re.I)
NOT_PERSON_CONTENT=re.compile(
    r"\b(?:reaction|trailer|teaser|song|lyrics|cover|guitar solo|concert|"
    r"movie review|book review|video game|gameplay|remix|shorts compilation)\b",re.I
)
PUNCT=re.compile(r"[\W_]+",re.UNICODE)

def norm(value):
    return unicodedata.normalize("NFKC",str(value or "")).casefold().strip()

def exact_name_span(title,label):
    name=norm(label)
    title=norm(title)
    if not title or not name:
        return None
    # NFKC and word boundaries. Preserve Unicode scripts, normalize mixed
    # punctuation only BETWEEN name tokens (never arbitrary substring).
    tokens=[re.escape(v) for v in NAME_WORD(label)]
    if len(tokens)<2:return None
    pattern=r"(?<!\w)"+r"[\W_]+".join(tokens)+r"(?!\w)"
    match=list(re.finditer(pattern,title,re.I))
    return (title,match[0]) if len(match)==1 else None

def additional_explicit_profile_cue(title,label,all_source_hits):
    """A deterministic extra-title review cue, independent of media contents."""
    # Multi names, duplicated name spans and ambiguous short labels are HOLD.
    if len(all_source_hits)!=1 or label not in all_source_hits:
        return None
    span=exact_name_span(title,label)
    if span is None:return None
    full,match=span
    before=full[:match.start()].strip()
    after=full[match.end():].strip()
    if NOT_PERSON_CONTENT.search(full):
        return None
    if JOINT.search(after):
        return None
    # Allow native title punctuation separators or whitespace, but avoid name
    # heading "X Interview" unless the full title has an explicit biography cue.
    stripped_after=after.lstrip(" :|–—-")
    if not before or before in ("dr","dr.","doctor","sir"):
        if any(stripped_after.startswith(p) for p in AFTER):
            return "NAME_HEADING_EXPLICIT_PROFILE_REVIEW"
    stripped_before=before.rstrip(" :|–—-")
    if any(stripped_before.endswith(p) for p in BEFORE):
        # Keep genuine titles like "The Untold Story of X", but no videos
        # whose title continues with work/joint/event after an exact person.
        if not after or after in ("documentary","biography","full documentary"):
            return "PROFILE_OF_PERSON_REVIEW"
    return None

def candidate_groups(root=ROOT):
    doc=json.loads((root/"audits/youtube-b024-original-id-runtime-source-20261020.json").read_text(encoding="utf8"))
    p=doc.get("provenance",{})
    if (doc.get("schema")!=INPUT_SCHEMA or p.get("source_archive_sha256")!=SRC_SHA or
        p.get("prior_review_candidate_rows")!=2241 or p.get("original_bio_title_video_population")!=10706 or
        len(doc.get("rows",[]))!=2241):
        raise ValueError("B024_PRIOR_REAL_CANDIDATES_PROVENANCE_INVALID")
    forms={}
    old_by_video={}
    old_by_identity={}
    for i,row in enumerate(doc["rows"]):
        name,aliases,channels,videos,reviewed=row
        if len(channels)!=len(set(channels)) or len(videos)!=len(set(videos)):
            raise ValueError("B024_OLD_ORIGINAL_ID_DUPLICATION")
        for alias in aliases:
            if alias in forms and forms[alias]!=name:
                raise ValueError("B024_APPROVED_ALIAS_COLLISION")
            forms[alias]=name
        old_by_identity[name]=(set(channels),set(videos),reviewed)
        for vid in videos:
            if vid in old_by_video:raise ValueError("B024_STRICT_VIDEO_DUPLICATE")
            old_by_video[vid]=(name,set(channels))
    if len(old_by_video)!=6162:raise ValueError("B024_OLD_STRICT_VIDEO_ID_POPULATION_CHANGED")
    lexicon=strict.source_names(root)
    if len(lexicon)!=5965 or not set(forms).issubset(lexicon):
        raise ValueError("B024_INDEPENDENT_5965_SOURCE_NOT_MATCHED")
    return forms,old_by_identity,old_by_video,lexicon

def run_archive(archive,*,verified_extracted_artifact=False,expected_channels=10127,expected_videos=2230031,
                source_root=ROOT):
    path=Path(archive)
    if path.is_dir():
        if not verified_extracted_artifact:
            raise ValueError("B024_EXTRACTED_SOURCE_ARTIFACT_PROVENANCE_REQUIRED")
    else:
        with path.open("rb") as fp:
            if hashlib.file_digest(fp,"sha256").hexdigest()!=SRC_SHA:
                raise ValueError("B024_SOURCE_ZIP_SHA_INVALID")
    forms,old_by_identity,old_by_video,lexicon=candidate_groups(source_root)
    tri=matcher.make_index(set(lexicon))
    nonperson=strict.rejected_label_names(source_root)
    extra_videos=collections.defaultdict(set)
    extra_channels=collections.defaultdict(set)
    examples=collections.defaultdict(list)
    by_reason=collections.Counter()
    all_video_ids=set()
    sources=set()
    scanned=0
    old_seen=set()
    with contextlib.ExitStack() as stack:
        if path.is_dir():
            members=sorted(path.rglob("*.ndjson.gz"))
            def open_stream(m):return gzip.open(m,"rt",encoding="utf8")
        else:
            zipped=stack.enter_context(zipfile.ZipFile(path))
            members=sorted(x for x in zipped.namelist() if x.endswith(".ndjson.gz"))
            def open_stream(m):return gzip.open(zipped.open(m),"rt",encoding="utf8")
        for member in members:
            ch=Path(member).name.removesuffix(".ndjson.gz")
            if ch in sources:raise ValueError("B024_DUPLICATE_CHANNEL_FILE")
            sources.add(ch)
            with open_stream(member) as f:
                for line in f:
                    item=json.loads(line)
                    scanned+=1
                    vid=item.get("video_id")
                    if item.get("channel_id")!=ch or not isinstance(vid,str):
                        raise ValueError("B024_ORIGINAL_TITLE_CHANNEL_VIDEO_ID_INVALID")
                    if vid in all_video_ids:
                        raise ValueError("B024_DUPLICATE_ARCHIVED_VIDEO_ID")
                    all_video_ids.add(vid)
                    old=old_by_video.get(vid)
                    if old:
                        if ch not in old[1]:
                            raise ValueError("B024_OLD_BIOGRAPHY_ID_CHANNEL_CHANGED")
                        old_seen.add(vid)
                    title=item.get("title") or ""
                    matched=matcher.title_name_matches(title,tri)
                    if not matched:continue
                    # Resolve a token-matched source label to the previously
                    # APPROVED identity name. Never merge same spelling to two.
                    identity_candidates={forms[n] for n in matched if n in forms}
                    if len(identity_candidates)!=1 or len(matched)!=1:
                        by_reason["OTHER_NAME_OR_MULTI_SUBJECT_HOLD"]+=1
                        continue
                    label=next(iter(matched))
                    identity=next(iter(identity_candidates))
                    if NAME_WORD(label) in nonperson:
                        by_reason["KNOWN_NONPERSON_HOLD"]+=1
                        continue
                    if old and old[0]!=identity:
                        # Previously audited strong Video ID cannot be assigned
                        # to another person merely by a new title grammar.
                        by_reason["PREVIOUS_STRICT_ID_CONFLICT_HOLD"]+=1
                        continue
                    if vid in old_by_video:continue
                    why=additional_explicit_profile_cue(title,label,matched)
                    if not why:continue
                    if vid in extra_videos[identity]:
                        raise ValueError("B024_EXTRA_PERSON_VIDEO_DUPLICATE")
                    extra_videos[identity].add(vid)
                    extra_channels[identity].add(ch)
                    by_reason[why]+=1
                    if len(examples[identity])<3:
                        examples[identity].append({"video_id":vid,"channel_id":ch,
                                                   "original_title":title[:250],"rule":why})
    if len(sources)!=expected_channels or scanned!=expected_videos:
        raise ValueError("B024_FULL_ARCHIVE_10127_2230031_PARITY_FAILED")
    if old_seen!=set(old_by_video):
        raise ValueError("B024_PREVIOUS_6162_STRICT_ORIGINAL_VIDEOS_NOT_IN_ARCHIVE")
    if any(set(vs)&set(old_by_video) for vs in extra_videos.values()):
        raise ValueError("B024_EXTRA_STRICT_VIDEO_ID_COLLISION")
    if sum(map(len,extra_videos.values()))!=len(set().union(*extra_videos.values())):
        raise ValueError("B024_EXTRA_VIDEO_ACROSS_IDENTITIES_COLLISION")
    rows=[]
    for identity,(strong_channels,strong_videos,reviewed) in old_by_identity.items():
        extra=extra_videos[identity]
        ch=extra_channels[identity]
        union_ch=strong_channels|ch
        rows.append({
            "name":identity,"previously_reviewed_historical_identity":reviewed,
            "strict_biography_title_channels":len(strong_channels),
            "strict_biography_title_videos":len(strong_videos),
            "additional_profile_title_channels":len(ch),
            "additional_profile_title_videos":len(extra),
            "combined_title_evidence_distinct_channels":len(union_ch),
            "combined_title_evidence_distinct_videos":len(strong_videos|extra),
            "extra_original_video_ids":sorted(extra),
            "extra_original_channel_ids":sorted(ch),
            "extra_examples":examples[identity],
            "content_playback_verified":False,
            "historical_personhood_currently_verified":False,
            "current_registry_absence_verified":False
        })
    rows.sort(key=lambda x:(-x["combined_title_evidence_distinct_channels"],
                            -x["combined_title_evidence_distinct_videos"],x["name"]))
    for i,r in enumerate(rows,1):r["provisional_profile_title_review_priority"]=i
    return {
        "schema":OUTPUT_SCHEMA,"original_archive_sha256":SRC_SHA,
        "archived_channels_scanned":len(sources),"archived_video_titles_scanned":scanned,
        "independent_source_name_lexicon":len(lexicon),
        "candidate_name_groups":len(rows),"previous_strict_original_video_ids":len(old_seen),
        "new_distinct_explicit_profile_title_original_video_ids":sum(map(len,extra_videos.values())),
        "new_distinct_explicit_profile_title_original_channels":
            len(set().union(*extra_channels.values())),
        "candidate_groups_with_new_explicit_profile_titles":sum(bool(r["additional_profile_title_videos"]) for r in rows),
        "extra_profile_title_rule_counts":dict(by_reason),
        "actual_video_content_verified":0,"all_historical_personhood_verified":False,
        "current_registered_person_coverage_verified":False,
        "production_rank_changed":False,"new_youtube_videos_fetched":0,
        "title_profile_cues_are_NOT_watched_content":True,
        "rows":rows
    }

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--archive",required=True)
    p.add_argument("--verified-extracted-artifact",action="store_true")
    p.add_argument("--output",required=True)
    args=p.parse_args()
    out=run_archive(args.archive,verified_extracted_artifact=args.verified_extracted_artifact)
    dst=Path(args.output);dst.parent.mkdir(parents=True,exist_ok=True)
    dst.write_text(json.dumps(out,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf8")
    print(json.dumps({k:v for k,v in out.items() if k!="rows"},ensure_ascii=False))
    for r in out["rows"][:20]:
        print(json.dumps({k:r[k] for k in ("name","strict_biography_title_channels",
          "additional_profile_title_channels","additional_profile_title_videos",
          "combined_title_evidence_distinct_channels")},ensure_ascii=False))

if __name__=="__main__":main()
