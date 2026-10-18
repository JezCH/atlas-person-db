#!/usr/bin/env python3
"""One controlled YouTube videos.list(snippet) request for THREE exact B024 IDs.

Default: offline preflight only. --fetch is an explicit, read-only one-batch
official YouTube Data API call. The output is CURRENT snippet metadata, NOT
proof of video subjecthood, historical Person status or a publishable rank.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
REQUEST=ROOT/"audits/youtube-b024-first-12-metadata-review-request.json"
TRIAGE=ROOT/"audits/youtube-b024-first-12-original-title-triage-20261016.json"
SOURCE_REPLAY=ROOT/"audits/youtube-b024-first-12-original-zip-direct-replay-20261018.json"
EXPECTED_IDS=("-13y_Jm-pzI","-1CalygxBrM","-5Lg5mk74NA")
SCHEMA="atlas-youtube-b024-three-exact-original-official-snippets/v1"


def load_script(filename,module_name):
    spec=importlib.util.spec_from_file_location(module_name,ROOT/"scripts"/filename)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def validated_request():
    """Immutable offline origin binding, not an unverified live assertion."""
    original=load_script("youtube-b024-verify-first-12-original-zip.py","yt_source_original12")
    triage=load_json(TRIAGE)
    replay=load_json(SOURCE_REPLAY)
    request=load_json(REQUEST)
    original.validate_committed_report(replay,triage)
    original.validate_three_metadata_source_bindings(replay,request)
    if (tuple(row["video_id"] for row in request["videos"])!=EXPECTED_IDS or
        request["reviewed_candidate_labels"]!=245 or
        request["original_per_video_channel_id_verified"] is not True or
        request["source_name_generation_independent_of_registered_persons"] is not True or
        request["publication_allowed"] is not False):
        raise ValueError("EXACT_THREE_ORIGINAL_ID_SOURCE_REQUEST_CHANGED")
    return request


def assess(request,metadata):
    """Fail closed on unexpected result shape; preserve no-data as PENDING."""
    if (metadata.get("schema")!="atlas-youtube-description-enrichment-result/v1" or
        metadata.get("source_zip_sha256")!=request["source_zip_sha256"] or
        metadata.get("source_snapshot_id")!=request["source_snapshot_id"] or
        metadata.get("request_source_json_sha256")!=request["source_review_json_sha256"] or
        metadata.get("requested_original_video_ids")!=3 or
        metadata.get("fetched_metadata_rows")!=3 or
        metadata.get("not_yet_fetched")!=0 or
        metadata.get("automatic_person_subject_approval") is not False):
        raise ValueError("OFFICIAL_THREE_VIDEO_METADATA_PARITY_MISMATCH")
    expected={r["video_id"]:r for r in request["videos"]}
    actual=metadata.get("records")
    if not isinstance(actual,list) or len(actual)!=3 or {r.get("video_id") for r in actual}!=set(expected):
        raise ValueError("OFFICIAL_THREE_VIDEO_METADATA_VIDEO_IDS_CHANGED")
    kinds={"MATCHED_ARCHIVED_CHANNEL":0,"CHANNEL_MISMATCH_HOLD":0,"NOT_FOUND_OR_UNAVAILABLE_HOLD":0}
    items=[]
    for row in actual:
        source=expected[row["video_id"]]
        desc=row.get("description")
        if desc is not None and not isinstance(desc,str):
            raise ValueError("OFFICIAL_VIDEO_DESCRIPTION_MALFORMED")
        expected_hash=hashlib.sha256((desc or "").encode("utf-8")).hexdigest()
        if (row.get("original_channel_id")!=source["original_channel_id"] or
            row.get("original_title")!=source["original_title"] or
            row.get("person_video_content_verified") is not False or
            row.get("description_sha256")!=expected_hash):
            raise ValueError("OFFICIAL_VIDEO_METADATA_ORIGINAL_SOURCE_OR_DESCRIPTION_TAMPERED")
        live=row.get("live_channel_id")
        expected_status=("NOT_FOUND_OR_UNAVAILABLE" if live is None else
                         "CHANNEL_MISMATCH" if live!=source["original_channel_id"] else
                         "DESCRIPTION_PRESENT" if (desc or "").strip() else
                         "DESCRIPTION_EMPTY")
        if row.get("status")!=expected_status:
            raise ValueError("OFFICIAL_VIDEO_METADATA_STATUS_INCONSISTENT")
        if live is None and any(row.get(k) is not None for k in ("live_title","description","published_at")):
            raise ValueError("OFFICIAL_UNAVAILABLE_VIDEO_HAS_PUBLISHER_DETAILS")
        kind=("NOT_FOUND_OR_UNAVAILABLE_HOLD" if live is None else
              "CHANNEL_MISMATCH_HOLD" if live!=source["original_channel_id"] else
              "MATCHED_ARCHIVED_CHANNEL")
        kinds[kind]+=1
        items.append({
            "video_id":row["video_id"],
            "original_channel_id":source["original_channel_id"],
            "current_channel_id":live,
            "original_title":source["original_title"],
            "current_title":row.get("live_title"),
            "published_at":row.get("published_at"),
            "official_snippet_status":row["status"],
            "review_stage":kind,
            "actual_video_playback_or_transcript_certified":False,
            "person_primary_content_certified":False,
            "eligible_for_rank":False
        })
    result={
        "schema":SCHEMA,
        "source_zip_sha256":request["source_zip_sha256"],
        "source_snapshot_id":request["source_snapshot_id"],
        "official_youtube_videos_list_batches":1,
        "official_requested_original_video_ids":3,
        "official_metadata_rows_processed":3,
        "source_video_channel_id_matches":kinds["MATCHED_ARCHIVED_CHANNEL"],
        "source_video_channel_id_mismatches":kinds["CHANNEL_MISMATCH_HOLD"],
        "source_video_not_found_or_unavailable":kinds["NOT_FOUND_OR_UNAVAILABLE_HOLD"],
        "actual_video_playback_or_timestamped_transcript_reviews":0,
        "person_primary_content_certifications":0,
        "latest_registered_person_screen_complete":False,
        "publication_authorized":False,
        "production_writes":0,
        "records":sorted(items,key=lambda x:x["video_id"])
    }
    if sum(kinds.values())!=3:
        raise ValueError("OFFICIAL_VIDEO_DISPOSITION_LOST_OR_DUPLICATED")
    return result


def execute(*,live_api_call=None,fetch=False):
    """Dependency-injected callable for offline tests. Never call Production."""
    request=validated_request()
    if not fetch:
        return {
            "schema":"atlas-youtube-b024-three-original-snippets-offline-preflight/v1",
            "source_zip_sha256":request["source_zip_sha256"],
            "original_video_ids":[r["video_id"] for r in request["videos"]],
            "original_channel_ids":[r["original_channel_id"] for r in request["videos"]],
            "original_source_replay_verified":True,
            "official_youtube_api_calls":0,
            "current_channel_ids_verified":0,
            "actual_video_playback_or_transcript_certified":0,
            "publication_authorized":False
        },None
    if live_api_call is None:
        key=os.environ.get("YOUTUBE_DATA_API_KEY")
        if not key:
            raise ValueError("YOUTUBE_DATA_API_KEY_MISSING_NO_EXTERNAL_QUERY_PERFORMED")
        enrich=load_script("youtube-source-video-description-enrich.py","yt_official_snippet_collector")
        live_api_call=enrich.youtube_batch_api(key)
    enrich=load_script("youtube-source-video-description-enrich.py","yt_official_snippet_collector")
    calls=0
    def bounded_call(ids):
        nonlocal calls
        calls+=1
        if calls!=1 or tuple(ids)!=EXPECTED_IDS:
            raise ValueError("OFFICIAL_API_BATCH_NOT_EXACT_THREE_VIDEO_IDS")
        return live_api_call(ids)
    metadata=enrich.fetch_descriptions(request,api_call=bounded_call,max_batches=1)
    if calls!=1:
        raise ValueError("OFFICIAL_API_EXACTLY_ONE_BATCH_REQUIRED")
    return assess(request,metadata),metadata


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--fetch",action="store_true",
                   help="Explicitly use YOUTUBE_DATA_API_KEY for exactly one official metadata batch")
    p.add_argument("--output",required=True,help="Source-bound summary JSON")
    p.add_argument("--metadata-output",help="Complete official 3-video snippet metadata JSON, optional")
    args=p.parse_args()
    if args.metadata_output and not args.fetch:
        raise ValueError("METADATA_OUTPUT_REQUIRES_REAL_FETCH")
    summary,metadata=execute(fetch=args.fetch)
    outfile=Path(args.output)
    outfile.parent.mkdir(parents=True,exist_ok=True)
    outfile.write_text(json.dumps(summary,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    if args.metadata_output:
        metadata_path=Path(args.metadata_output)
        metadata_path.parent.mkdir(parents=True,exist_ok=True)
        metadata_path.write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    # Log only bounded, source-proven statuses. No API key or video description logs.
    print(json.dumps({k:v for k,v in summary.items() if k!="records"},ensure_ascii=False))


if __name__=="__main__":
    main()
