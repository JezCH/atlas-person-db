#!/usr/bin/env python3
"""Validate genuinely retrieved public publisher descriptions against ORIGINAL B024 video IDs.

A public search-indexed publisher description is metadata review evidence,
NOT a videos.list API result, transcript, viewed content or Person-centred channel.
This sidecar never writes a Production snapshot or modifies the original corpus.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

REQUEST_SCHEMA = "atlas-youtube-description-enrichment-request/v1"
REVIEW_SCHEMA = "atlas-youtube-b024-public-publisher-description-review/v1"
RESULT_SCHEMA = "atlas-youtube-b024-verified-public-publisher-descriptions/v1"
VIDEO_ID_PATTERN = re.compile(r"[A-Za-z0-9_-]{11}\Z")
CHANNEL_ID_PATTERN = re.compile(r"UC[A-Za-z0-9_-]{22}\Z")


def reconcile(request, manifest, *, request_sha256):
    if request.get("schema") != REQUEST_SCHEMA or not request.get("original_per_video_channel_id_verified"):
        raise ValueError("PUBLIC_METADATA_UNVERIFIED_ORIGINAL_REQUEST")
    if (request.get("publication_allowed") is not False or
            manifest.get("schema") != REVIEW_SCHEMA or
            manifest.get("publication_allowed") is not False):
        raise ValueError("PUBLIC_METADATA_PUBLICATION_MUST_REMAIN_DISABLED")
    if (request_sha256 != manifest.get("parent_90_request_sha256") or
            request.get("source_zip_sha256") != manifest.get("original_source_zip_sha256") or
            request.get("source_snapshot_id") != manifest.get("source_snapshot_id") or
            request.get("unique_original_video_ids") != manifest.get("source_video_review_population")):
        raise ValueError("PUBLIC_METADATA_SOURCE_PROVENANCE_MISMATCH")
    if (manifest.get("actual_official_youtube_data_api_calls") != 0 or
            manifest.get("actual_video_playback_or_timestamped_transcript_checked") is not False):
        raise ValueError("PUBLIC_METADATA_UNSUPPORTED_CLAIM")
    original = {}
    for row in request["videos"]:
        video_id = row.get("video_id")
        channel_id = row.get("original_channel_id")
        if (not isinstance(video_id, str) or not VIDEO_ID_PATTERN.fullmatch(video_id) or
                not isinstance(channel_id, str) or not CHANNEL_ID_PATTERN.fullmatch(channel_id) or
                video_id in original):
            raise ValueError("PUBLIC_METADATA_ORIGINAL_ID_DUPLICATE_OR_INVALID")
        original[video_id] = row
    if len(original) != request["unique_original_video_ids"]:
        raise ValueError("PUBLIC_METADATA_ORIGINAL_VIDEO_POPULATION_MISMATCH")
    reviewed = []
    seen = set()
    for entry in manifest["evidence"]:
        vid = entry.get("video_id")
        if vid in seen or vid not in original:
            raise ValueError("PUBLIC_METADATA_UNSOURCED_OR_DUPLICATE_VIDEO_ID")
        seen.add(vid)
        src = original[vid]
        if (entry.get("expected_original_channel_id") != src.get("original_channel_id") or
                entry.get("expected_original_title") != src.get("original_title") or
                entry.get("identity_for_review") != src.get("review_identity_for_queue_only") or
                entry.get("original_youtube_url") != "https://www.youtube.com/watch?v=" + vid):
            raise ValueError("PUBLIC_METADATA_ORIGINAL_CHANNEL_TITLE_PERSON_MISMATCH")
        if (entry.get("person_centered_actual_video_verified") is not False or
                entry.get("evidence_level") != "PUBLIC_PUBLISHER_DESCRIPTION_AND_EXTERNAL_CHANNEL_ID_CROSS_CHECK"):
            raise ValueError("PUBLIC_METADATA_MUST_NOT_CREDIT_UNVIEWED_CONTENT")
        if (entry.get("original_name_cue_raw_name"),
            entry.get("original_name_cue_bucket")) not in {
                (cue.get("raw_name"), cue.get("bucket"))
                for cue in src.get("name_cues", [])
            }:
            raise ValueError("PUBLIC_METADATA_SOURCE_NAME_CUES_MISMATCH")
        for field in ("publisher_display", "publisher_description_summary",
                      "corroborating_publisher_page", "independent_channel_id_source_url"):
            value = entry.get(field)
            if not isinstance(value, str) or not value.strip():
                raise ValueError("PUBLIC_METADATA_REQUIRED_PROVENANCE_MISSING")
        for field in ("corroborating_publisher_page", "independent_channel_id_source_url"):
            if not entry[field].startswith("https://"):
                raise ValueError("PUBLIC_METADATA_HTTPS_EVIDENCE_REQUIRED")
        reviewed.append({
            "video_id": vid,
            "original_channel_id": src["original_channel_id"],
            "original_title": src["original_title"],
            "identity_for_review": src["review_identity_for_queue_only"],
            "publisher_name": entry["publisher_display"],
            "video_source_url": entry["original_youtube_url"],
            "publisher_description_paraphrase": entry["publisher_description_summary"],
            "independent_channel_id_source_url": entry["independent_channel_id_source_url"],
            "corroborating_publisher_page": entry["corroborating_publisher_page"],
            "metadata_method": "HUMAN_REVIEWED_PUBLIC_PUBLISHER_DESCRIPTION",
            "official_youtube_data_api_snippet_not_fetched": True,
            "verified_timestamped_video_content": False,
            "person_content_video_approved": False
        })
    if len(reviewed) != manifest.get("public_publisher_descriptions_reviewed"):
        raise ValueError("PUBLIC_METADATA_REVIEWED_VIDEO_COUNT_MISMATCH")
    distinct = {x["original_channel_id"] for x in reviewed}
    if len(distinct) != manifest.get("unique_original_channel_ids"):
        raise ValueError("PUBLIC_METADATA_CHANNEL_UNION_COUNT_MISMATCH")
    reviewed.sort(key=lambda x: x["video_id"])
    return {
        "schema": RESULT_SCHEMA,
        "source_snapshot_id": request["source_snapshot_id"],
        "source_zip_sha256": request["source_zip_sha256"],
        "verified_original_request_sha256": request_sha256,
        "original_review_queue_videos": len(original),
        "actual_public_publisher_description_video_ids": len(reviewed),
        "actual_public_publisher_description_distinct_channel_ids": len(distinct),
        "public_descriptions_not_found_in_review": len(original) - len(reviewed),
        "youtube_data_api_descriptions_fetched": 0,
        "reviewed_content_verified_videos": 0,
        "registered_person_exclusion_completed": False,
        "production_publication_allowed": False,
        "method": "PUBLIC_PUBLISHER_DESCRIPTION_WITH_INDEPENDENT_CHANNEL_ID_CROSS_CHECK",
        "records": reviewed
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--request", required=True)
    parser.add_argument("--publisher-review", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    content = Path(args.request).read_bytes()
    request = json.loads(content)
    manifest = json.loads(Path(args.publisher_review).read_text(encoding="utf-8"))
    result = reconcile(request, manifest, request_sha256=hashlib.sha256(content).hexdigest())
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k:v for k,v in result.items() if k!="records"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
