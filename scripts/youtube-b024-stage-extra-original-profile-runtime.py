#!/usr/bin/env python3
"""Build pinned, additive read-only new profile-title ORIGINAL-ID data for ATLAS.

Consumes EXISTING GitHub Actions artifact #12264217300, downloaded after exact
artifact id/name/digest gate by CI. Never recrawls video titles or contacts YT.
Fail closed on old strong 6,162 Video IDs changed or merged identities.
"""
import argparse
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
EXTRA_SCHEMA="atlas-youtube-b024-additional-explicit-person-profile-title-ids/v1"
OLD_SCHEMA="atlas-youtube-b024-original-video-id-live-discovery-input/v1"
OUTPUT_SCHEMA="atlas-youtube-b024-profile-original-id-additive-runtime/v1"
SRC_SHA="8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946"
ARTIFACT_ID=12264217300
ARTIFACT_DIGEST="sha256:2f74ff923eab322ea0bfa4bc145cda89e5fda41127567e05d3e2349e516e331e"

def stage(extra,old):
    meta=old.get("provenance",{})
    if (old.get("schema")!=OLD_SCHEMA or
        meta.get("source_archive_sha256")!=SRC_SHA or
        meta.get("prior_review_candidate_rows")!=2241 or
        not isinstance(old.get("rows"),list) or len(old["rows"])!=2241 or
        extra.get("schema")!=EXTRA_SCHEMA or
        extra.get("original_archive_sha256")!=SRC_SHA or
        extra.get("archived_channels_scanned")!=10127 or
        extra.get("archived_video_titles_scanned")!=2230031 or
        extra.get("candidate_name_groups")!=2241 or
        extra.get("previous_strict_original_video_ids")!=6162 or
        extra.get("new_distinct_explicit_profile_title_original_video_ids")!=536 or
        extra.get("candidate_groups_with_new_explicit_profile_titles")!=400 or
        extra.get("new_youtube_videos_fetched")!=0 or
        extra.get("actual_video_content_verified")!=0 or
        extra.get("production_rank_changed") is not False or
        len(extra.get("rows",[]))!=2241):
        raise ValueError("B024_EXTRA_ORIGINAL_PROFILE_SOURCE_PROVENANCE_INVALID")
    older={}
    strong_vids=set()
    for row in old["rows"]:
        name,alias,channels,vids,_reviewed=row
        if name in older:
            raise ValueError("B024_OLD_DUPLICATED_IDENTITY")
        older[name]=(set(channels),set(vids))
        if strong_vids.intersection(vids):
            raise ValueError("B024_OLD_DUPLICATED_ORIGINAL_VIDEO_ID")
        strong_vids.update(vids)
    if len(strong_vids)!=6162:
        raise ValueError("B024_OLD_ORIGINAL_STRICT_VIDEO_COUNT_CHANGED")
    seen_names=set()
    seen_new=set()
    results=[]
    for row in extra["rows"]:
        name=row["name"]
        if name in seen_names or name not in older:
            raise ValueError("B024_EXTRA_IDENTITY_CENSUS_MISMATCH")
        seen_names.add(name)
        added_channels=row["extra_original_channel_ids"]
        added_videos=row["extra_original_video_ids"]
        if (len(set(added_channels))!=len(added_channels) or
            len(set(added_videos))!=len(added_videos) or
            len(added_channels)!=row["additional_profile_title_channels"] or
            len(added_videos)!=row["additional_profile_title_videos"] or
            set(added_videos)&strong_vids or
            set(added_videos)&seen_new or
            len(older[name][0]|set(added_channels))!=row["combined_title_evidence_distinct_channels"] or
            len(older[name][1]|set(added_videos))!=row["combined_title_evidence_distinct_videos"]):
            raise ValueError("B024_EXTRA_OLD_STRONG_VIDEO_OR_CHANNEL_ID_PARITY_FAILED")
        seen_new.update(added_videos)
        if added_videos:
            results.append([name,sorted(added_channels),sorted(added_videos)])
    if len(seen_names)!=2241 or len(results)!=400 or len(seen_new)!=536:
        raise ValueError("B024_EXTRA_TOTAL_ORIGINAL_POPULATION_CHANGED")
    results.sort(key=lambda x:x[0])
    return {
        "schema":OUTPUT_SCHEMA,
        "source_archive_sha256":SRC_SHA,
        "derived_profile_artifact_id":ARTIFACT_ID,
        "derived_profile_artifact_zip_sha256":ARTIFACT_DIGEST,
        "source_strict_candidate_group_count":2241,
        "source_strict_biography_title_video_id_count":6162,
        "new_original_profile_title_video_id_count":536,
        "new_profile_title_source_name_group_count":400,
        "combined_unique_profile_plus_biography_title_video_ids":6698,
        "video_media_playback_verified_count":0,
        "current_registered_Person_full_screen_completed":False,
        "production_rank_currently_changed":False,
        "title_evidence_only":True,
        "rows":results
    }

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--reviewed-extra-artifact",required=True)
    p.add_argument("--original-strict-runtime",default=str(ROOT/"audits/youtube-b024-original-id-runtime-source-20261020.json"))
    p.add_argument("--out",required=True)
    a=p.parse_args()
    extra=json.loads(Path(a.reviewed_extra_artifact).read_text(encoding="utf8"))
    old=json.loads(Path(a.original_strict_runtime).read_text(encoding="utf8"))
    result=stage(extra,old)
    target=Path(a.out)
    target.parent.mkdir(parents=True,exist_ok=True)
    data=json.dumps(result,ensure_ascii=False,separators=(",",":"))+"\n"
    target.write_text(data,encoding="utf8")
    print(json.dumps({k:v for k,v in result.items() if k!="rows"},ensure_ascii=False))
    print("FILE_SHA256="+hashlib.sha256(data.encode("utf8")).hexdigest())
if __name__=="__main__":main()
