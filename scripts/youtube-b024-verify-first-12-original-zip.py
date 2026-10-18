#!/usr/bin/env python3
"""Prove 12 title-triage source rows against the IMMUTABLE original B024 ZIP.

This does not fetch live YouTube metadata, view videos, inspect transcripts,
deduplicate same-Person aliases, screen registered Persons or publish rankings.
"""
import argparse
import gzip
import hashlib
import json
import re
import zipfile
from pathlib import Path

SOURCE_SHA="8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946"
SOURCE_BYTES=85284047
SOURCE_CHANNEL_COUNT=10127
SOURCE_VIDEO_ROWS=2230031
TRIAGE_SCHEMA="atlas-youtube-b024-original-video-title-triage/v1"
REPORT_SCHEMA="atlas-youtube-b024-12-full-original-zip-direct-replay/v1"
VIDEO=re.compile(r"^[A-Za-z0-9_-]{11}$")
CHANNEL=re.compile(r"^UC[A-Za-z0-9_-]{22}$")


def source_rows(triage, *, expected_count=12):
    if (triage.get("schema")!=TRIAGE_SCHEMA or
        triage.get("original_source_zip_sha256")!=SOURCE_SHA or
        triage.get("review_count")!=expected_count or
        triage.get("person_primary_video_content_approvals")!=0 or
        triage.get("rank_publication_authorized") is not False):
        raise ValueError("ORIGINAL_TRIAGE_PROVENANCE_OR_SCOPE_INVALID")
    records=triage.get("records")
    if not isinstance(records,list) or len(records)!=expected_count:
        raise ValueError("ORIGINAL_TRIAGE_SOURCE_POPULATION_INVALID")
    expected={}
    for item in records:
        vid=item.get("video_id") if isinstance(item,dict) else None
        cid=item.get("original_channel_id")
        title=item.get("original_title")
        if (not isinstance(vid,str) or VIDEO.fullmatch(vid) is None or vid in expected or
            not isinstance(cid,str) or CHANNEL.fullmatch(cid) is None or
            not isinstance(title,str) or not title or
            item.get("person_primary_content_verified") is not False or
            item.get("review_evidence")!="ORIGINAL_TITLE_ONLY"):
            raise ValueError("ORIGINAL_TRIAGE_SOURCE_ROW_INVALID_OR_DUPLICATE")
        expected[vid]={"video_id":vid,"original_channel_id":cid,
                       "original_title":title,
                       "original_zip_exact_channel_title_match":True}
    return expected


def scan(archive_path,triage,*,strict=True,verify_digest=True,expected_count=12,
         expected_channels=SOURCE_CHANNEL_COUNT,expected_videos=SOURCE_VIDEO_ROWS):
    """Replay archive in read-only mode and refuse ANY channel/title discrepancy.

    strict=False and verify_digest=False are only for synthetic unit fixtures.
    The ordinary CLI *always* enforces the immutable archive size/SHA and 2.23m census.
    """
    archive_path=Path(archive_path)
    expected=source_rows(triage,expected_count=expected_count)
    if strict and archive_path.stat().st_size!=SOURCE_BYTES:
        raise ValueError("IMMUTABLE_SOURCE_ZIP_BYTE_LENGTH_MISMATCH")
    if verify_digest:
        with archive_path.open("rb") as source_file:
            digest=hashlib.file_digest(source_file,"sha256").hexdigest()
        if digest!=SOURCE_SHA:
            raise ValueError("IMMUTABLE_SOURCE_ZIP_SHA256_MISMATCH")
    channels=set()
    found={}
    videos=0
    with zipfile.ZipFile(archive_path) as zipped:
        names=sorted(x for x in zipped.namelist()
                     if "/videos/" in x and x.endswith(".ndjson.gz"))
        for filename in names:
            cid=Path(filename).name.removesuffix(".ndjson.gz")
            if CHANNEL.fullmatch(cid) is None or cid in channels:
                raise ValueError("ORIGINAL_ZIP_DUPLICATE_OR_INVALID_CHANNEL")
            channels.add(cid)
            with gzip.open(zipped.open(filename),"rt",encoding="utf-8") as stream:
                for line in stream:
                    item=json.loads(line)
                    videos+=1
                    if item.get("channel_id")!=cid:
                        raise ValueError("ORIGINAL_ZIP_VIDEO_CHANNEL_BINDING_INVALID")
                    vid=item.get("video_id")
                    if vid not in expected:
                        continue
                    if vid in found:
                        raise ValueError("ORIGINAL_ZIP_DUPLICATE_REVIEWED_VIDEO_ID")
                    found[vid]={"video_id":vid,
                                "original_channel_id":cid,
                                "original_title":item.get("title") or "",
                                "original_zip_exact_channel_title_match":True}
    if len(channels)!=expected_channels or videos!=expected_videos:
        raise ValueError("ORIGINAL_ZIP_FULL_CORPUS_CENSUS_MISMATCH")
    if set(found)!=set(expected):
        raise ValueError("ORIGINAL_ZIP_REVIEWED_VIDEO_ID_MISSING")
    for vid,want in expected.items():
        got=found[vid]
        if got["original_channel_id"]!=want["original_channel_id"] or got["original_title"]!=want["original_title"]:
            raise ValueError("ORIGINAL_ZIP_REVIEWED_VIDEO_CHANNEL_OR_TITLE_MISMATCH")
    return {
        "schema":REPORT_SCHEMA,
        "original_zip_sha256":SOURCE_SHA if verify_digest else "SYNTHETIC_TEST_ONLY",
        "original_zip_bytes":archive_path.stat().st_size,
        "original_channel_count":len(channels),
        "original_video_rows":videos,
        "reviewed_original_video_ids":len(expected),
        "matched_original_video_id_count":len(found),
        "matched_exact_original_channel_and_title_count":len(expected),
        "mismatches":[],
        "original_video_content_watched_or_timestamped_transcript_verified":0,
        "official_youtube_current_channel_id_verified":0,
        "publication_authorized":False,
        "original_archive_modified":False,
        "records":[found[vid] for vid in sorted(found)]
    }


def validate_committed_report(report,triage):
    """CI audit of earlier REAL replay without claiming CI downloaded the ZIP."""
    expected=source_rows(triage)
    if (report.get("schema")!=REPORT_SCHEMA or
        report.get("original_zip_sha256")!=SOURCE_SHA or
        report.get("original_zip_bytes")!=SOURCE_BYTES or
        report.get("original_channel_count")!=SOURCE_CHANNEL_COUNT or
        report.get("original_video_rows")!=SOURCE_VIDEO_ROWS or
        report.get("reviewed_original_video_ids")!=12 or
        report.get("matched_original_video_id_count")!=12 or
        report.get("matched_exact_original_channel_and_title_count")!=12 or
        report.get("mismatches")!=[] or
        report.get("original_video_content_watched_or_timestamped_transcript_verified")!=0 or
        report.get("official_youtube_current_channel_id_verified")!=0 or
        report.get("publication_authorized") is not False or
        report.get("original_archive_modified") is not False or
        report.get("records")!=[expected[vid] for vid in sorted(expected)]):
        raise ValueError("ARCHIVED_ORIGINAL_SOURCE_REPLAY_REPORT_PARITY_MISMATCH")
    return True


def validate_three_metadata_source_bindings(report,three_video_request):
    if not isinstance(three_video_request,dict) or (
        three_video_request.get("schema")!="atlas-youtube-description-enrichment-request/v1" or
        three_video_request.get("source_zip_sha256")!=SOURCE_SHA or
        three_video_request.get("unique_original_video_ids")!=3 or
        three_video_request.get("actual_metadata_fetched") is not False or
        three_video_request.get("person_centered_content_videos_verified")!=0 or
        three_video_request.get("publication_allowed") is not False):
        raise ValueError("THREE_VIDEO_METADATA_REQUEST_SCOPE_INVALID")
    real={r["video_id"]:r for r in report["records"]}
    videos=three_video_request.get("videos")
    if not isinstance(videos,list) or len(videos)!=3 or len({x.get("video_id") for x in videos})!=3:
        raise ValueError("THREE_VIDEO_METADATA_REQUEST_IDS_INVALID")
    for row in videos:
        source=real.get(row["video_id"])
        if source is None or any(row.get(key)!=source[key] for key in
                               ("video_id","original_channel_id","original_title")):
            raise ValueError("THREE_VIDEO_METADATA_REQUEST_ARCHIVED_BINDING_CHANGED")
    return True


def main():
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--archive",required=True)
    cli.add_argument("--manifest",default="audits/youtube-b024-first-12-original-title-triage-20261016.json")
    cli.add_argument("--three-video-request",default="audits/youtube-b024-first-12-metadata-review-request.json")
    cli.add_argument("--expected-report",default="audits/youtube-b024-first-12-original-zip-direct-replay-20261018.json")
    cli.add_argument("--output",required=True)
    args=cli.parse_args()
    manifest=json.loads(Path(args.manifest).read_text(encoding="utf8"))
    request=json.loads(Path(args.three_video_request).read_text(encoding="utf8"))
    expected_report=json.loads(Path(args.expected_report).read_text(encoding="utf8"))
    report=scan(args.archive,manifest)
    validate_committed_report(expected_report,manifest)
    if report!=expected_report:
        raise ValueError("REPLAY_DIFFERENT_FROM_RECORDED_ACTUAL_ORIGINAL_SOURCE")
    validate_three_metadata_source_bindings(report,request)
    output=Path(args.output)
    output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print(json.dumps({"original_zip_verified":True,"channels":report["original_channel_count"],
        "original_videos":report["original_video_rows"],
        "exact_source_video_channel_title_matches":12,
        "official_current_youtube_channels_verified":0,
        "actual_video_content_confirmed":0,"publishable":False}))


if __name__=="__main__":
    main()
