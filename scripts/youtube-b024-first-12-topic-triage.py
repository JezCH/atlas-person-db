#!/usr/bin/env python3
"""Audit 12 original YouTube Video IDs; select 3 title-only person-topic metadata rows.

Every ORIGINAL Video-ID/Channel-ID/title/cue remains source-bound. A title
classification does not verify video content or authorize a Person rank.
"""
import argparse
import collections
import copy
import json
import re
from pathlib import Path

SCHEMA="atlas-youtube-b024-original-video-title-triage/v1"
PARENT_SCHEMA="atlas-youtube-description-enrichment-request/v1"
QUEUE_SCHEMA="atlas-youtube-b024-12-review-metadata-priority/v1"
SHA="8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946"
SNAPSHOT="yt-20261009T111844Z-10127ch-rebuild-v4"
REVIEW="2ffae480aa7b77ed6ae3ddf5e88ac9d2a3f1618b41dbf86bcc3ed7070d6b0d1a"
VIDEO=re.compile(r"^[a-zA-Z0-9_-]{11}$")
CHANNEL=re.compile(r"^UC[a-zA-Z0-9_-]{22}$")
STATES={"TITLE_NONPRIMARY_REVIEW":8,"TITLE_MIXED_FOCUS_HOLD":1,
        "TITLE_PERSON_TOPIC_PLAUSIBLE_UNVERIFIED":3}
SOURCE_KEYS=("video_id","original_channel_id","original_title","name_cues")

def source_tuple(row):
    return tuple(json.dumps(row[key],ensure_ascii=False,sort_keys=True)
                 for key in SOURCE_KEYS)

def validate_manifest(audit):
    if (audit.get("schema")!=SCHEMA or audit.get("source_snapshot_id")!=SNAPSHOT or
        audit.get("original_source_zip_sha256")!=SHA or
        audit.get("parent_source_review_json_sha256")!=REVIEW or
        audit.get("original_source_channel_count")!=10127 or
        audit.get("original_source_video_rows")!=2230031 or
        audit.get("parent_original_request_video_ids")!=10126):
        raise ValueError("TRIAGE_SOURCE_FINGERPRINT_MISMATCH")
    if (audit.get("person_primary_video_content_approvals")!=0 or
        audit.get("original_source_records_deleted") is not False or
        audit.get("person_registration_screen_performed") is not False or
        audit.get("rank_publication_authorized") is not False):
        raise ValueError("TITLE_ONLY_REVIEW_CANNOT_APPROVE_CONTENT")
    rows=audit.get("records")
    if not isinstance(rows,list) or len(rows)!=12 or audit.get("review_count")!=12:
        raise ValueError("INVALID_TRIAGE_VIDEO_POPULATION")
    seen=set()
    counts=collections.Counter()
    for row in rows:
        vid=row.get("video_id")
        cid=row.get("original_channel_id")
        if (not isinstance(vid,str) or not VIDEO.fullmatch(vid) or
            not isinstance(cid,str) or not CHANNEL.fullmatch(cid) or vid in seen):
            raise ValueError("INVALID_DUPLICATE_ORIGINAL_VIDEO_CHANNEL_ID")
        seen.add(vid)
        if (not isinstance(row.get("original_title"),str) or
            not row["original_title"].strip() or
            not isinstance(row.get("name_cues"),list) or
            len(row["name_cues"])!=1 or
            not isinstance(row["name_cues"][0].get("raw_name"),str) or
            not isinstance(row["name_cues"][0].get("bucket"),str)):
            raise ValueError("INVALID_ORIGINAL_VIDEO_TITLE_NAME_CUE")
        status=row.get("review_status")
        if (status not in STATES or
            row.get("review_evidence")!="ORIGINAL_TITLE_ONLY" or
            row.get("person_primary_content_verified") is not False or
            not isinstance(row.get("review_note"),str) or len(row["review_note"])<45 or
            not isinstance(row.get("review_reason"),str) or len(row["review_reason"])<10):
            raise ValueError("INVALID_TITLE_ONLY_REVIEW_STATUS")
        counts[status]+=1
    if any(counts[k]!=v for k,v in STATES.items()) or audit.get("review_status_counts")!=STATES:
        raise ValueError("TRIAGE_DISPOSITION_COUNTS_MISMATCH")
    return rows

def verify_original_parent(audit,parent,*,full=True):
    original=validate_manifest(audit)
    if (parent.get("schema")!=PARENT_SCHEMA or
        parent.get("source_snapshot_id")!=SNAPSHOT or
        parent.get("source_zip_sha256")!=SHA or
        parent.get("source_review_json_sha256")!=REVIEW or
        parent.get("original_per_video_channel_id_verified") is not True or
        parent.get("publication_allowed") is not False):
        raise ValueError("ORIGINAL_REQUEST_PROVENANCE_MISMATCH")
    if full and (parent.get("unique_original_video_ids")!=10126 or
                 parent.get("source_channel_count")!=10127 or
                 parent.get("source_video_count")!=2230031 or
                 parent.get("reviewed_candidate_labels")!=245):
        raise ValueError("ORIGINAL_REQUEST_FULL_POPULATION_MISMATCH")
    videos=parent.get("videos")
    if not isinstance(videos,list) or len(videos)!=parent.get("unique_original_video_ids"):
        raise ValueError("ORIGINAL_REQUEST_SOURCE_ROWS_MISMATCH")
    by_id={}
    for v in videos:
        if v.get("video_id") in by_id:
            raise ValueError("DUPLICATE_ORIGINAL_REQUEST_VIDEO_ID")
        by_id[v["video_id"]]=v
    for row in original:
        if row["video_id"] not in by_id or source_tuple(row)!=source_tuple(by_id[row["video_id"]]):
            raise ValueError("ORIGINAL_VIDEO_CHANNEL_TITLE_NAME_CUE_CHANGED")
    return True

def make_priority_request(audit,*,original_parent=None,full=True):
    rows=validate_manifest(audit)
    if original_parent is not None:verify_original_parent(audit,original_parent,full=full)
    keep=[{k:copy.deepcopy(row[k]) for k in SOURCE_KEYS}
          for row in rows if row["review_status"]=="TITLE_PERSON_TOPIC_PLAUSIBLE_UNVERIFIED"]
    keep.sort(key=lambda r:r["video_id"])
    return {
        "schema":PARENT_SCHEMA,"source_snapshot_id":SNAPSHOT,
        "source_zip_sha256":SHA,"source_review_json_sha256":REVIEW,
        "source_channel_count":10127,"source_video_count":2230031,
        "reviewed_candidate_labels":245,"unique_original_video_ids":len(keep),
        "original_per_video_channel_id_verified":True,
        "source_name_generation_independent_of_registered_persons":True,
        "publication_allowed":False,
        "tranche_schema":QUEUE_SCHEMA,"parent_cumulative_original_video_ids":10126,
        "source_review_manifest":"audits/youtube-b024-first-12-original-title-triage-20261016.json",
        "parent_original_request_replayed_in_this_run":bool(original_parent is not None and full),
        "actual_metadata_fetched":False,"person_centered_content_videos_verified":0,
        "registered_person_screened":False,"videos":keep
    }

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--manifest",default="audits/youtube-b024-first-12-original-title-triage-20261016.json")
    p.add_argument("--parent-request",help="Existing full 10,126-video original source request for optional exact review replay")
    p.add_argument("--output",required=True)
    args=p.parse_args()
    manifest=json.loads(Path(args.manifest).read_text(encoding="utf8"))
    parent=json.loads(Path(args.parent_request).read_text(encoding="utf8")) if args.parent_request else None
    result=make_priority_request(manifest,original_parent=parent)
    Path(args.output).write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print(json.dumps({"original_title_review_rows":12,"nonprimary_title_reviews":8,
        "mixed_focus_title_holds":1,"metadata_priority_original_video_ids":3,
        "metadata_api_batches_at_50":1,"original_parent_replayed":parent is not None,
        "content_verified_videos":0,"rank_publishable":False}))

if __name__=="__main__":main()
