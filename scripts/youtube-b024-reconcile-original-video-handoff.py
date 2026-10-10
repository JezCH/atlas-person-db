#!/usr/bin/env python3
"""Bridge the verified original 10,126-video B024 handoff to the
current official metadata collector. Do not silently trust schema rename.

Re-read original 10,127 channel files / 2,230,031 videos through the existing
source-pinned prepare() implementation, then compare EACH handoff
video/channel/title and (raw-name, cue-bucket) pair against rebuilt source.
This does not retrieve descriptions or approve Person credit.
"""
import argparse
import importlib.util
import json
from pathlib import Path

COLLECTOR_PATH=Path(__file__).with_name("youtube-source-video-description-enrich.py")
spec=importlib.util.spec_from_file_location("youtube_source_description_collector",COLLECTOR_PATH)
collector=importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)

LEGACY_SCHEMA="atlas-youtube-video-description-request/v1"
EXPECTED_BINDING="VERIFIED_BY_ORIGINAL_VIDEO_ID_CHANNEL_ID_TITLE_RECORDS"


def reconcile(legacy,source_evidence,source_zip,*,evidence_sha256,legacy_sha256):
    if (legacy.get("schema")!=LEGACY_SCHEMA or
        legacy.get("source_channel_binding")!=EXPECTED_BINDING or
        legacy.get("publisher_allowed") is not False):
        raise ValueError("LEGACY_HANDOFF_PROVENANCE_OR_SCHEMA_INVALID")
    if legacy.get("source_review_evidence_sha256")!=evidence_sha256:
        raise ValueError("HANDOFF_REVIEW_FILE_DIGEST_MISMATCH")
    if (legacy.get("source_archive_sha256")!=collector.SOURCE_ZIP_SHA or
        legacy.get("original_channel_count")!=source_evidence.get("source_channels") or
        legacy.get("original_video_count")!=source_evidence.get("source_videos") or
        legacy.get("candidate_labels")!=245 or
        legacy.get("source_snapshot_id")!=source_evidence.get("source_snapshot_id")):
        raise ValueError("HANDOFF_IMMUTABLE_SOURCE_POPULATION_MISMATCH")
    if legacy.get("requested_unique_video_ids")!=len(legacy.get("videos",[])):
        raise ValueError("HANDOFF_VIDEO_ID_POPULATION_MISMATCH")
    canonical=collector.prepare(source_evidence,source_digest=evidence_sha256,
                                source_zip=source_zip,verify_source_sha=True)
    current={r["video_id"]:r for r in canonical["videos"]}
    old={r["video_id"]:r for r in legacy["videos"]}
    if len(current)!=len(old) or len(old)!=len(legacy["videos"]) or set(current)!=set(old):
        raise ValueError("HANDOFF_ORIGINAL_VIDEO_IDS_DIFFER_FROM_SOURCE")
    for video_id,row in old.items():
        expected=current[video_id]
        if (row.get("original_channel_id")!=expected["original_channel_id"] or
            row.get("original_title")!=expected["original_title"]):
            raise ValueError("HANDOFF_ORIGINAL_CHANNEL_OR_TITLE_MISMATCH: "+video_id)
        old_cues=[(x["raw_name"],x["title_cue_bucket"]) for x in row.get("raw_name_evidence",[])]
        current_cues=[(x["raw_name"],x["bucket"]) for x in expected["name_cues"]]
        if len(old_cues)!=len(set(old_cues)) or sorted(old_cues)!=sorted(current_cues):
            raise ValueError("HANDOFF_NAME_AND_TITLE_CUE_SOURCE_MISMATCH: "+video_id)
    canonical["legacy_handoff_sha256"]=legacy_sha256
    canonical["legacy_schema_reconciled"]=LEGACY_SCHEMA
    canonical["legacy_per_video_source_id_and_cues_equal"]=True
    return canonical


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    for option in ("legacy-request","source-evidence","source-zip","output"):
        ap.add_argument("--"+option,required=True)
    args=ap.parse_args()
    legacy_path=Path(args.legacy_request)
    source_path=Path(args.source_evidence)
    def load(path):
        return json.loads(path.read_text(encoding="utf-8"))
    result=reconcile(load(legacy_path),load(source_path),args.source_zip,
                     evidence_sha256=collector.sha256(source_path),
                     legacy_sha256=collector.sha256(legacy_path))
    collector.write(args.output,result)
    print(json.dumps({
        "schema":result["schema"],
        "original_channels":result["source_channel_count"],
        "original_videos":result["source_video_count"],
        "reconciled_video_ids":result["unique_original_video_ids"],
        "legacy_schema_reconciled":result["legacy_schema_reconciled"],
        "per_video_channel_title_name_cues_verified":result["legacy_per_video_source_id_and_cues_equal"],
        "person_content_approved":False,
        "external_description_metadata_fetched":False,
        "output":args.output
    },ensure_ascii=False))


if __name__=="__main__":
    main()
